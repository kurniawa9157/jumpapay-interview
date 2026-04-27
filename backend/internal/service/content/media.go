package content

import (
	"context"
	"fmt"
	"image"
	"io"
	"log"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/disintegration/imaging"
	"github.com/google/uuid"

	"github.com/kurniawa9157/template-base/internal/domain"
	"github.com/kurniawa9157/template-base/internal/repository/postgres"
)

// MediaService — handle upload + simpan ke disk + register ke DB.
type MediaService struct {
	repo        *postgres.MediaRepo
	uploadDir   string
	maxSizeMB   int64
	allowedExts map[string]struct{}
}

// allowed mime/extensions — restrict ke image + pdf untuk safety.
var defaultAllowedExts = map[string]struct{}{
	".jpg": {}, ".jpeg": {}, ".png": {}, ".gif": {}, ".webp": {},
	".svg": {}, ".pdf": {},
}

// thumbSizes — variant width yang di-generate untuk image jpg/png/gif.
// 0 = same height (keep aspect ratio). Skip resize kalau image lebih kecil
// dari target (no upscale, hindari blur).
var thumbSizes = []struct {
	name  string // subdir di uploadDir
	width int
}{
	{"thumb", 300},
	{"medium", 800},
	{"large", 1600},
}

// thumbnailableMimes — MIME yang bisa kita resize (decode + encode).
// SVG vector tidak perlu thumbnail. WEBP decode butuh CGO/extra lib, skip.
// PDF/doc skip — bukan image.
var thumbnailableMimes = map[string]bool{
	"image/jpeg": true,
	"image/jpg":  true,
	"image/png":  true,
	"image/gif":  true,
}

func NewMediaService(repo *postgres.MediaRepo, uploadDir string, maxSizeMB int) *MediaService {
	if maxSizeMB <= 0 {
		maxSizeMB = 5
	}
	return &MediaService{
		repo:        repo,
		uploadDir:   uploadDir,
		maxSizeMB:   int64(maxSizeMB),
		allowedExts: defaultAllowedExts,
	}
}

// Upload — save multipart file ke disk + (opsional) generate thumbnail
// kalau image, lalu insert row ke DB. Return DTO dengan URLs.
func (s *MediaService) Upload(ctx context.Context, fh *multipart.FileHeader, uploaderID *int64) (*domain.MediaFile, error) {
	if fh.Size > s.maxSizeMB*1024*1024 {
		return nil, fmt.Errorf("file melebihi batas %d MB", s.maxSizeMB)
	}
	ext := strings.ToLower(filepath.Ext(fh.Filename))
	if _, ok := s.allowedExts[ext]; !ok {
		return nil, fmt.Errorf("tipe file %s tidak diperbolehkan", ext)
	}

	if err := os.MkdirAll(s.uploadDir, 0o755); err != nil {
		return nil, fmt.Errorf("create upload dir: %w", err)
	}

	saneName := sanitizeFilename(fh.Filename)
	filename := uuid.NewString() + "_" + saneName
	dst := filepath.Join(s.uploadDir, filename)

	src, err := fh.Open()
	if err != nil {
		return nil, err
	}
	defer src.Close()

	out, err := os.Create(dst)
	if err != nil {
		return nil, err
	}
	if _, err := io.Copy(out, src); err != nil {
		out.Close()
		return nil, err
	}
	out.Close()

	// Generate thumbnails kalau image type yang kita support. Best-effort:
	// kalau gagal (mis. file korup), log + lanjut tanpa thumbnail (set
	// has_thumbnails=false).
	mime := fh.Header.Get("Content-Type")
	hasThumbnails := false
	if thumbnailableMimes[strings.ToLower(mime)] {
		if err := s.generateThumbnails(dst, filename); err != nil {
			log.Printf("[media] thumbnail generation failed for %s: %v", filename, err)
		} else {
			hasThumbnails = true
		}
	}

	id, err := s.repo.Create(ctx, postgres.CreateMediaInput{
		Filename:      filename,
		OriginalName:  &fh.Filename,
		MimeType:      mime,
		SizeBytes:     fh.Size,
		UploadedByID:  uploaderID,
		HasThumbnails: hasThumbnails,
	})
	if err != nil {
		// rollback file kalau DB error.
		_ = os.Remove(dst)
		s.removeThumbnails(filename)
		return nil, err
	}

	m, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	s.fillURLs(m)
	return m, nil
}

func (s *MediaService) List(ctx context.Context, limit, page int) ([]domain.MediaFile, int, error) {
	items, total, err := s.repo.List(ctx, limit, page)
	if err != nil {
		return nil, 0, err
	}
	for i := range items {
		s.fillURLs(&items[i])
	}
	return items, total, nil
}

func (s *MediaService) Delete(ctx context.Context, id int64) error {
	m, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	// hapus file + thumbnail dari disk dulu (best-effort), lalu row.
	_ = os.Remove(filepath.Join(s.uploadDir, m.Filename))
	if m.HasThumbnails {
		s.removeThumbnails(m.Filename)
	}
	return s.repo.Delete(ctx, id)
}

// generateThumbnails — decode image lalu resize ke 3 variant. Tidak upscale
// (kalau image lebih kecil dari target width, simpan as-is).
func (s *MediaService) generateThumbnails(srcPath, filename string) error {
	img, err := imaging.Open(srcPath, imaging.AutoOrientation(true))
	if err != nil {
		return fmt.Errorf("decode: %w", err)
	}
	srcWidth := img.Bounds().Dx()
	for _, sz := range thumbSizes {
		var resized image.Image
		if srcWidth <= sz.width {
			resized = img // no upscale
		} else {
			resized = imaging.Resize(img, sz.width, 0, imaging.Lanczos)
		}
		dirPath := filepath.Join(s.uploadDir, sz.name)
		if err := os.MkdirAll(dirPath, 0o755); err != nil {
			return fmt.Errorf("mkdir %s: %w", sz.name, err)
		}
		dstPath := filepath.Join(dirPath, filename)
		if err := imaging.Save(resized, dstPath, imaging.JPEGQuality(85)); err != nil {
			return fmt.Errorf("save %s: %w", sz.name, err)
		}
	}
	return nil
}

// removeThumbnails — best-effort hapus 3 variant. Ignore error per file.
func (s *MediaService) removeThumbnails(filename string) {
	for _, sz := range thumbSizes {
		_ = os.Remove(filepath.Join(s.uploadDir, sz.name, filename))
	}
}

// fillURLs — populate URL + URLThumb/Medium/Large di DTO. Kalau tidak punya
// thumbnails (non-image atau image lama sebelum feature), semua variant
// fallback ke URL original — frontend bisa tetap pakai responsive img
// dengan srcset tanpa branching khusus.
func (s *MediaService) fillURLs(m *domain.MediaFile) {
	m.URL = "/uploads/" + m.Filename
	if m.HasThumbnails {
		m.URLThumb = "/uploads/thumb/" + m.Filename
		m.URLMedium = "/uploads/medium/" + m.Filename
		m.URLLarge = "/uploads/large/" + m.Filename
	} else {
		m.URLThumb = m.URL
		m.URLMedium = m.URL
		m.URLLarge = m.URL
	}
}

// sanitizeFilename — ganti karakter berbahaya, batasi panjang.
func sanitizeFilename(s string) string {
	s = strings.ReplaceAll(s, " ", "_")
	s = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '.' || r == '_' || r == '-' {
			return r
		}
		return '_'
	}, s)
	if len(s) > 100 {
		s = s[len(s)-100:]
	}
	return s
}

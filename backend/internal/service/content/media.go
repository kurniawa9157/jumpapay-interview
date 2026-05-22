package content

import (
	"bytes"
	"context"
	"fmt"
	"image"
	"io"
	"log"
	"mime/multipart"
	"path/filepath"
	"strings"

	"github.com/disintegration/imaging"
	"github.com/google/uuid"

	"github.com/kurniawa9157/template-base/internal/domain"
	"github.com/kurniawa9157/template-base/internal/platform/storage"
	"github.com/kurniawa9157/template-base/internal/repository/postgres"
)

// MediaService — handle upload + simpan ke storage backend (local atau S3)
// + register ke DB. Storage di-inject lewat constructor supaya gampang
// switch antara filesystem & cloud.
type MediaService struct {
	repo        *postgres.MediaRepo
	storage     storage.Storage
	maxSizeMB   int64
	allowedExts map[string]struct{}
}

// allowed mime/extensions — restrict ke image + pdf untuk safety.
var defaultAllowedExts = map[string]struct{}{
	".jpg": {}, ".jpeg": {}, ".png": {}, ".gif": {}, ".webp": {},
	".svg": {}, ".pdf": {},
}

// thumbSizes — variant width yang di-generate untuk image jpg/png/gif.
var thumbSizes = []struct {
	prefix string // key prefix relative ke "uploads/" (mis. "thumb")
	width  int
}{
	{"thumb", 300},
	{"medium", 800},
	{"large", 1600},
}

// thumbnailableMimes — MIME yang bisa kita resize.
var thumbnailableMimes = map[string]bool{
	"image/jpeg": true,
	"image/jpg":  true,
	"image/png":  true,
	"image/gif":  true,
}

func NewMediaService(repo *postgres.MediaRepo, st storage.Storage, maxSizeMB int) *MediaService {
	if maxSizeMB <= 0 {
		maxSizeMB = 5
	}
	return &MediaService{
		repo:        repo,
		storage:     st,
		maxSizeMB:   int64(maxSizeMB),
		allowedExts: defaultAllowedExts,
	}
}

// Upload — save multipart file ke storage backend + (opsional) generate
// thumbnail kalau image, lalu insert row ke DB.
func (s *MediaService) Upload(ctx context.Context, fh *multipart.FileHeader, uploaderID *int64) (*domain.MediaFile, error) {
	if fh.Size > s.maxSizeMB*1024*1024 {
		return nil, fmt.Errorf("file melebihi batas %d MB", s.maxSizeMB)
	}
	ext := strings.ToLower(filepath.Ext(fh.Filename))
	if _, ok := s.allowedExts[ext]; !ok {
		return nil, fmt.Errorf("tipe file %s tidak diperbolehkan", ext)
	}

	saneName := sanitizeFilename(fh.Filename)
	filename := uuid.NewString() + "_" + saneName
	mime := fh.Header.Get("Content-Type")

	// Read full body ke memory (max 5MB default — aman). Buffer dipakai
	// untuk: (a) upload original, (b) decode jadi image untuk thumbnail.
	src, err := fh.Open()
	if err != nil {
		return nil, err
	}
	defer src.Close()
	rawBytes, err := io.ReadAll(src)
	if err != nil {
		return nil, fmt.Errorf("read upload: %w", err)
	}

	// Save original ke storage.
	originalKey := filename
	if err := s.storage.Save(ctx, originalKey, bytes.NewReader(rawBytes), mime); err != nil {
		return nil, err
	}

	// Generate thumbnails kalau image type. Best-effort.
	hasThumbnails := false
	if thumbnailableMimes[strings.ToLower(mime)] {
		if err := s.uploadThumbnails(ctx, rawBytes, filename); err != nil {
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
		// rollback files kalau DB error.
		_ = s.storage.Delete(ctx, originalKey)
		s.removeThumbnails(ctx, filename)
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
	// hapus file + thumbnail (best-effort), lalu row DB.
	_ = s.storage.Delete(ctx, m.Filename)
	if m.HasThumbnails {
		s.removeThumbnails(ctx, m.Filename)
	}
	return s.repo.Delete(ctx, id)
}

// uploadThumbnails — decode image dari raw bytes, resize ke 3 variant,
// upload masing-masing ke storage. Tidak upscale.
func (s *MediaService) uploadThumbnails(ctx context.Context, raw []byte, filename string) error {
	img, err := imaging.Decode(bytes.NewReader(raw), imaging.AutoOrientation(true))
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
		// Encode ke JPEG buffer.
		var buf bytes.Buffer
		if err := imaging.Encode(&buf, resized, imaging.JPEG, imaging.JPEGQuality(85)); err != nil {
			return fmt.Errorf("encode %s: %w", sz.prefix, err)
		}
		key := sz.prefix + "/" + filename
		if err := s.storage.Save(ctx, key, &buf, "image/jpeg"); err != nil {
			return fmt.Errorf("save %s: %w", sz.prefix, err)
		}
	}
	return nil
}

// removeThumbnails — best-effort hapus 3 variant. Ignore per-file error.
func (s *MediaService) removeThumbnails(ctx context.Context, filename string) {
	for _, sz := range thumbSizes {
		_ = s.storage.Delete(ctx, sz.prefix+"/"+filename)
	}
}

// fillURLs — populate URL + URLThumb/Medium/Large via storage.URL().
// Untuk LocalStorage akan return "/uploads/...", untuk S3Storage absolute
// "https://...". Frontend tidak perlu peduli backend mana.
func (s *MediaService) fillURLs(m *domain.MediaFile) {
	m.URL = s.storage.URL(m.Filename)
	if m.HasThumbnails {
		m.URLThumb = s.storage.URL("thumb/" + m.Filename)
		m.URLMedium = s.storage.URL("medium/" + m.Filename)
		m.URLLarge = s.storage.URL("large/" + m.Filename)
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

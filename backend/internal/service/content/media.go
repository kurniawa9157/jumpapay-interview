package content

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

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
	".jpg":  {}, ".jpeg": {}, ".png": {}, ".gif": {}, ".webp": {},
	".svg":  {}, ".pdf":  {},
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

// Upload — save multipart file ke disk + insert row ke DB. Return DTO dengan URL.
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

	// uuid prefix biar filename unik + sanitize.
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
	defer out.Close()

	if _, err := io.Copy(out, src); err != nil {
		return nil, err
	}

	id, err := s.repo.Create(ctx, postgres.CreateMediaInput{
		Filename:     filename,
		OriginalName: &fh.Filename,
		MimeType:     fh.Header.Get("Content-Type"),
		SizeBytes:    fh.Size,
		UploadedByID: uploaderID,
	})
	if err != nil {
		// rollback file kalau DB error.
		_ = os.Remove(dst)
		return nil, err
	}

	m, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	m.URL = "/uploads/" + m.Filename
	return m, nil
}

func (s *MediaService) List(ctx context.Context, limit, page int) ([]domain.MediaFile, int, error) {
	items, total, err := s.repo.List(ctx, limit, page)
	if err != nil {
		return nil, 0, err
	}
	for i := range items {
		items[i].URL = "/uploads/" + items[i].Filename
	}
	return items, total, nil
}

func (s *MediaService) Delete(ctx context.Context, id int64) error {
	m, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	// hapus file dari disk dulu (best-effort), lalu row.
	_ = os.Remove(filepath.Join(s.uploadDir, m.Filename))
	return s.repo.Delete(ctx, id)
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

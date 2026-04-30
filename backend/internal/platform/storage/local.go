package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// LocalStorage — implementasi Storage pakai filesystem lokal. Key
// dipetakan ke `<rootDir>/<key>`. URL output relative `/uploads/<key
// without uploads/ prefix>` supaya cocok dengan gin.Static yang serve
// "/uploads" → rootDir.
type LocalStorage struct {
	// rootDir adalah path absolute / relative ke working directory backend.
	// Mis. "./uploads" → file disimpan di "<cwd>/uploads/<key>".
	rootDir string
	// urlPrefix dipasang di depan key untuk public URL. Default "/uploads".
	// Catatan: kalau key sudah include "uploads/" prefix (mis. dipanggil
	// dari MediaService dengan key="uploads/foo.jpg"), kita strip dulu
	// supaya tidak double "/uploads/uploads/...".
	urlPrefix string
}

// NewLocalStorage membuat LocalStorage. rootDir akan di-mkdir saat Save
// pertama kalau belum ada.
func NewLocalStorage(rootDir string) *LocalStorage {
	return &LocalStorage{rootDir: rootDir, urlPrefix: "/uploads"}
}

func (s *LocalStorage) Save(ctx context.Context, key string, body io.Reader, _ string) error {
	dst := filepath.Join(s.rootDir, key)
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return fmt.Errorf("mkdir: %w", err)
	}
	out, err := os.Create(dst)
	if err != nil {
		return fmt.Errorf("create: %w", err)
	}
	defer out.Close()
	if _, err := io.Copy(out, body); err != nil {
		return fmt.Errorf("write: %w", err)
	}
	return nil
}

func (s *LocalStorage) Delete(_ context.Context, key string) error {
	dst := filepath.Join(s.rootDir, key)
	if err := os.Remove(dst); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

func (s *LocalStorage) URL(key string) string {
	// Strip leading "uploads/" supaya tidak duplicate dengan urlPrefix.
	rel := strings.TrimPrefix(key, "uploads/")
	rel = strings.TrimPrefix(rel, "/")
	return s.urlPrefix + "/" + rel
}

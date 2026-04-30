// Package storage menyediakan abstraksi untuk Media Library backend.
// Saat ini ada 2 implementasi: LocalStorage (filesystem) dan S3Storage
// (S3-compatible: AWS S3, MinIO, R2, dll). Pilihan via env MEDIA_STORAGE.
//
// Interface dirancang minimal — Save / Delete / URL — supaya gampang
// tambah implementasi lain (mis. GCS, Azure Blob) tanpa rombak service.
package storage

import (
	"context"
	"io"
)

// Storage — abstraction untuk simpan + delete + URL public file.
// Key adalah path relatif (mis. "uploads/foo.jpg", "uploads/thumb/foo.jpg").
type Storage interface {
	// Save menyimpan body dengan key. mimeType opsional (kosong = auto-
	// detect / default octet-stream). Implementasi harus idempotent: kalau
	// key sudah ada, replace.
	Save(ctx context.Context, key string, body io.Reader, mimeType string) error

	// Delete menghapus file by key. Tidak error kalau key tidak ada (best-
	// effort, idempotent).
	Delete(ctx context.Context, key string) error

	// URL mengembalikan public URL untuk akses file. Untuk LocalStorage
	// return relative path "/uploads/<key-rest>" yang di-serve oleh
	// gin.Static. Untuk S3Storage return absolute URL berdasarkan
	// AWS_URL config.
	URL(key string) string
}

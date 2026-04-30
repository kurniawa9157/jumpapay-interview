package storage

import (
	"context"
	"fmt"
	"io"
	"strings"

	awsv2 "github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// S3Storage — implementasi Storage pakai S3-compatible service (AWS S3,
// MinIO, Cloudflare R2, dll). Konfigurasi via S3Config — endpoint custom,
// path-style untuk MinIO, public URL prefix terpisah dari endpoint.
//
// ASUMSI: bucket di-set public-read (kalau pakai MinIO via mc:
//   mc anonymous set download <alias>/<bucket>
// Atau via web console). Kalau bucket private, perlu pakai presigned URL
// — implementasi belum support, tambah di future kalau diperlukan.
type S3Storage struct {
	client    *s3.Client
	bucket    string
	publicURL string // prefix lengkap, mis. "https://storage.cube-x.dev/template-asset"
}

type S3Config struct {
	AccessKeyID     string
	SecretAccessKey string
	Region          string
	Bucket          string
	Endpoint        string // custom MinIO endpoint, mis. "https://storage.cube-x.dev"
	PublicURL       string // prefix URL public-facing, mis. "https://storage.cube-x.dev/template-asset"
	UsePathStyle    bool   // MinIO requires true
}

// NewS3Storage membuat S3 client dengan static credentials + custom
// endpoint. Ga pakai aws config.LoadDefaultConfig supaya tidak baca
// ~/.aws — kita explicit dari env.
func NewS3Storage(cfg S3Config) (*S3Storage, error) {
	if cfg.Bucket == "" {
		return nil, fmt.Errorf("AWS_BUCKET wajib di-set untuk MEDIA_STORAGE=s3")
	}
	if cfg.AccessKeyID == "" || cfg.SecretAccessKey == "" {
		return nil, fmt.Errorf("AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY wajib di-set")
	}
	creds := credentials.NewStaticCredentialsProvider(cfg.AccessKeyID, cfg.SecretAccessKey, "")
	awsCfg := awsv2.Config{
		Region:      cfg.Region,
		Credentials: creds,
	}
	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		if cfg.Endpoint != "" {
			o.BaseEndpoint = awsv2.String(cfg.Endpoint)
		}
		o.UsePathStyle = cfg.UsePathStyle
	})

	publicURL := cfg.PublicURL
	if publicURL == "" {
		// Fallback: gunakan endpoint + bucket sebagai public URL.
		publicURL = strings.TrimRight(cfg.Endpoint, "/") + "/" + cfg.Bucket
	}
	publicURL = strings.TrimRight(publicURL, "/")

	return &S3Storage{
		client:    client,
		bucket:    cfg.Bucket,
		publicURL: publicURL,
	}, nil
}

func (s *S3Storage) Save(ctx context.Context, key string, body io.Reader, mimeType string) error {
	// PutObject butuh io.ReadSeeker untuk multipart, tapi simple PutObject
	// dengan io.Reader work. SDK akan buffer otomatis kalau perlu.
	input := &s3.PutObjectInput{
		Bucket: awsv2.String(s.bucket),
		Key:    awsv2.String(key),
		Body:   body,
	}
	if mimeType != "" {
		input.ContentType = awsv2.String(mimeType)
	}
	if _, err := s.client.PutObject(ctx, input); err != nil {
		return fmt.Errorf("s3 put %s: %w", key, err)
	}
	return nil
}

func (s *S3Storage) Delete(ctx context.Context, key string) error {
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: awsv2.String(s.bucket),
		Key:    awsv2.String(key),
	})
	if err != nil {
		return fmt.Errorf("s3 delete %s: %w", key, err)
	}
	return nil
}

func (s *S3Storage) URL(key string) string {
	return s.publicURL + "/" + strings.TrimPrefix(key, "/")
}

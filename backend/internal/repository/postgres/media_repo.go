package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kurniawa9157/template-base/internal/domain"
)

type MediaRepo struct{ db *pgxpool.Pool }

func NewMediaRepo(db *pgxpool.Pool) *MediaRepo { return &MediaRepo{db: db} }

const mediaCols = `id, filename, original_name, mime_type, size_bytes, uploaded_by_id, has_thumbnails, created_at`

func (r *MediaRepo) scan(row pgx.Row) (*domain.MediaFile, error) {
	m := &domain.MediaFile{}
	err := row.Scan(&m.ID, &m.Filename, &m.OriginalName, &m.MimeType, &m.SizeBytes, &m.UploadedByID, &m.HasThumbnails, &m.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	return m, err
}

func (r *MediaRepo) GetByID(ctx context.Context, id int64) (*domain.MediaFile, error) {
	return r.scan(r.db.QueryRow(ctx, `SELECT `+mediaCols+` FROM tt_media_files WHERE id = $1`, id))
}

func (r *MediaRepo) List(ctx context.Context, limit, page int) ([]domain.MediaFile, int, error) {
	if limit <= 0 {
		limit = 50
	}
	if page <= 0 {
		page = 1
	}
	var total int
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM tt_media_files`).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := r.db.Query(ctx,
		`SELECT `+mediaCols+` FROM tt_media_files ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
		limit, (page-1)*limit)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []domain.MediaFile
	for rows.Next() {
		m := domain.MediaFile{}
		if err := rows.Scan(&m.ID, &m.Filename, &m.OriginalName, &m.MimeType, &m.SizeBytes, &m.UploadedByID, &m.HasThumbnails, &m.CreatedAt); err != nil {
			return nil, 0, err
		}
		out = append(out, m)
	}
	return out, total, rows.Err()
}

type CreateMediaInput struct {
	Filename      string
	OriginalName  *string
	MimeType      string
	SizeBytes     int64
	UploadedByID  *int64
	HasThumbnails bool
}

func (r *MediaRepo) Create(ctx context.Context, in CreateMediaInput) (int64, error) {
	var id int64
	err := r.db.QueryRow(ctx, `
		INSERT INTO tt_media_files (filename, original_name, mime_type, size_bytes, uploaded_by_id, has_thumbnails)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`, in.Filename, in.OriginalName, in.MimeType, in.SizeBytes, in.UploadedByID, in.HasThumbnails).Scan(&id)
	return id, err
}

func (r *MediaRepo) Delete(ctx context.Context, id int64) error {
	_, err := r.db.Exec(ctx, `DELETE FROM tt_media_files WHERE id = $1`, id)
	return err
}

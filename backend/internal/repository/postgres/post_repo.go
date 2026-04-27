package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kurniawa9157/template-base/internal/domain"
)

type PostRepo struct{ db *pgxpool.Pool }

func NewPostRepo(db *pgxpool.Pool) *PostRepo { return &PostRepo{db: db} }

const postCols = `id, slug, title, excerpt, content, cover_image, type, status, tags, sequence,
	published_at, author_id, created_at, updated_at`

func (r *PostRepo) scan(row pgx.Row) (*domain.Post, error) {
	p := &domain.Post{}
	err := row.Scan(&p.ID, &p.Slug, &p.Title, &p.Excerpt, &p.Content, &p.CoverImage,
		&p.Type, &p.Status, &p.Tags, &p.Sequence, &p.PublishedAt, &p.AuthorID,
		&p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	return p, err
}

func (r *PostRepo) GetByID(ctx context.Context, id int64) (*domain.Post, error) {
	return r.scan(r.db.QueryRow(ctx,
		`SELECT `+postCols+` FROM tt_posts WHERE id = $1 AND deleted_at IS NULL`, id))
}

func (r *PostRepo) GetBySlug(ctx context.Context, slug string) (*domain.Post, error) {
	return r.scan(r.db.QueryRow(ctx,
		`SELECT `+postCols+` FROM tt_posts WHERE slug = $1 AND deleted_at IS NULL`, slug))
}

type PostListFilter struct {
	Type   string
	Status string
	Search string
	Limit  int
	Page   int
}

func (r *PostRepo) List(ctx context.Context, f PostListFilter) ([]domain.Post, int, error) {
	if f.Limit <= 0 {
		f.Limit = 20
	}
	if f.Page <= 0 {
		f.Page = 1
	}

	conds := []string{"deleted_at IS NULL"}
	var args []any
	if f.Type != "" {
		args = append(args, f.Type)
		conds = append(conds, fmt.Sprintf("type = $%d", len(args)))
	}
	if f.Status != "" {
		args = append(args, f.Status)
		conds = append(conds, fmt.Sprintf("status = $%d", len(args)))
	}
	if f.Search != "" {
		args = append(args, "%"+f.Search+"%")
		conds = append(conds, fmt.Sprintf("(title ILIKE $%d OR slug ILIKE $%d)", len(args), len(args)))
	}
	where := strings.Join(conds, " AND ")

	var total int
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM tt_posts WHERE `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, f.Limit, (f.Page-1)*f.Limit)
	q := fmt.Sprintf(
		`SELECT %s FROM tt_posts WHERE %s ORDER BY COALESCE(published_at, created_at) DESC LIMIT $%d OFFSET $%d`,
		postCols, where, len(args)-1, len(args),
	)
	rows, err := r.db.Query(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []domain.Post
	for rows.Next() {
		p := domain.Post{}
		if err := rows.Scan(&p.ID, &p.Slug, &p.Title, &p.Excerpt, &p.Content, &p.CoverImage,
			&p.Type, &p.Status, &p.Tags, &p.Sequence, &p.PublishedAt, &p.AuthorID,
			&p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, 0, err
		}
		out = append(out, p)
	}
	return out, total, rows.Err()
}

type CreatePostInput struct {
	Slug        string
	Title       string
	Excerpt     *string
	Content     *string
	CoverImage  *string
	Type        domain.PostType
	Status      domain.PostStatus
	Tags        *string
	AuthorID    *int64
}

func (r *PostRepo) Create(ctx context.Context, in CreatePostInput) (int64, error) {
	// Hitung published_at di Go, kirim sebagai param terpisah supaya $status
	// tidak dipakai di 2 konteks (column varchar + comparison text) yang
	// bikin pgx PG 42P08 "inconsistent types deduced".
	var publishedAt *time.Time
	if in.Status == domain.PostStatusPublished {
		now := time.Now()
		publishedAt = &now
	}
	// Pass status sebagai plain string biar pgx tidak bingung dengan typed
	// string (domain.PostStatus). Sama dengan type sebagai plain string.
	statusStr := string(in.Status)
	typeStr := string(in.Type)
	var id int64
	err := r.db.QueryRow(ctx, `
		INSERT INTO tt_posts (slug, title, excerpt, content, cover_image, type, status, tags, author_id, published_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id
	`, in.Slug, in.Title, in.Excerpt, in.Content, in.CoverImage, typeStr, statusStr, in.Tags, in.AuthorID, publishedAt).Scan(&id)
	return id, err
}

type UpdatePostInput struct {
	Title      string
	Slug       string
	Excerpt    *string
	Content    *string
	CoverImage *string
	Type       domain.PostType
	Status     domain.PostStatus
	Tags       *string
}

func (r *PostRepo) Update(ctx context.Context, id int64, in UpdatePostInput) error {
	// Pass status sebagai plain string + tambah param boolean isPublished
	// untuk dipakai di CASE — supaya status tidak referenced di 2 konteks.
	statusStr := string(in.Status)
	typeStr := string(in.Type)
	isPublished := in.Status == domain.PostStatusPublished
	_, err := r.db.Exec(ctx, `
		UPDATE tt_posts
		SET slug = $2, title = $3, excerpt = $4, content = $5, cover_image = $6,
		    type = $7, status = $8, tags = $9,
		    published_at = CASE
		      WHEN $10 AND published_at IS NULL THEN NOW()
		      WHEN NOT $10 THEN NULL
		      ELSE published_at
		    END,
		    updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
	`, id, in.Slug, in.Title, in.Excerpt, in.Content, in.CoverImage, typeStr, statusStr, in.Tags, isPublished)
	return err
}

// SoftDelete — set deleted_at, post tidak akan muncul di list lagi.
func (r *PostRepo) SoftDelete(ctx context.Context, id int64) error {
	_, err := r.db.Exec(ctx, `UPDATE tt_posts SET deleted_at = NOW() WHERE id = $1`, id)
	return err
}

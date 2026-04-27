package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kurniawa9157/template-base/internal/domain"
)

type TemplateRepo struct{ db *pgxpool.Pool }

func NewTemplateRepo(db *pgxpool.Pool) *TemplateRepo { return &TemplateRepo{db: db} }

const tplCols = `id, code, name, type_template, slug, is_active, created_at, updated_at, updated_by_id`

func (r *TemplateRepo) scanTemplate(row pgx.Row) (*domain.Template, error) {
	t := &domain.Template{}
	err := row.Scan(&t.ID, &t.Code, &t.Name, &t.TypeTemplate, &t.Slug, &t.IsActive, &t.CreatedAt, &t.UpdatedAt, &t.UpdatedByID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	return t, err
}

func (r *TemplateRepo) GetByID(ctx context.Context, id int64) (*domain.Template, error) {
	return r.scanTemplate(r.db.QueryRow(ctx,
		`SELECT `+tplCols+` FROM tr_templates WHERE id = $1`, id))
}

func (r *TemplateRepo) GetBySlug(ctx context.Context, slug string) (*domain.Template, error) {
	return r.scanTemplate(r.db.QueryRow(ctx,
		`SELECT `+tplCols+` FROM tr_templates WHERE slug = $1 AND type_template = 'page' AND is_active = TRUE`, slug))
}

func (r *TemplateRepo) GetByCode(ctx context.Context, code string) (*domain.Template, error) {
	return r.scanTemplate(r.db.QueryRow(ctx,
		`SELECT `+tplCols+` FROM tr_templates WHERE code = $1`, code))
}

// ListFilter — opsional filter buat List.
type TemplateListFilter struct {
	TypeTemplate string // kosong = semua type
	OnlyActive   bool
}

func (r *TemplateRepo) List(ctx context.Context, f TemplateListFilter) ([]domain.Template, error) {
	var args []any
	conds := []string{"1=1"}
	if f.TypeTemplate != "" {
		args = append(args, f.TypeTemplate)
		conds = append(conds, fmt.Sprintf("type_template = $%d", len(args)))
	}
	if f.OnlyActive {
		conds = append(conds, "is_active = TRUE")
	}
	q := `SELECT ` + tplCols + ` FROM tr_templates WHERE ` + strings.Join(conds, " AND ") + ` ORDER BY id ASC`
	rows, err := r.db.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.Template
	for rows.Next() {
		t := domain.Template{}
		if err := rows.Scan(&t.ID, &t.Code, &t.Name, &t.TypeTemplate, &t.Slug, &t.IsActive, &t.CreatedAt, &t.UpdatedAt, &t.UpdatedByID); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

type CreateTemplateInput struct {
	Code         string
	Name         string
	TypeTemplate domain.TemplateType
	Slug         *string
	IsActive     bool
	UpdatedByID  *int64
}

func (r *TemplateRepo) Create(ctx context.Context, in CreateTemplateInput) (int64, error) {
	var id int64
	err := r.db.QueryRow(ctx, `
		INSERT INTO tr_templates (code, name, type_template, slug, is_active, updated_by_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`, in.Code, in.Name, in.TypeTemplate, in.Slug, in.IsActive, in.UpdatedByID).Scan(&id)
	return id, err
}

type UpdateTemplateInput struct {
	Name        string
	Slug        *string
	IsActive    bool
	UpdatedByID *int64
}

func (r *TemplateRepo) Update(ctx context.Context, id int64, in UpdateTemplateInput) error {
	_, err := r.db.Exec(ctx, `
		UPDATE tr_templates
		SET name = $2, slug = $3, is_active = $4, updated_by_id = $5, updated_at = NOW()
		WHERE id = $1
	`, id, in.Name, in.Slug, in.IsActive, in.UpdatedByID)
	return err
}

func (r *TemplateRepo) Delete(ctx context.Context, id int64) error {
	_, err := r.db.Exec(ctx, `DELETE FROM tr_templates WHERE id = $1`, id)
	return err
}

// --- Template Values ---

const tvCols = `id, template_id, key, value, "order", updated_at`

func (r *TemplateRepo) ListValues(ctx context.Context, templateID int64) ([]domain.TemplateValue, error) {
	rows, err := r.db.Query(ctx,
		`SELECT `+tvCols+` FROM tr_template_values WHERE template_id = $1 ORDER BY "order" ASC, id ASC`, templateID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.TemplateValue
	for rows.Next() {
		v := domain.TemplateValue{}
		if err := rows.Scan(&v.ID, &v.TemplateID, &v.Key, &v.Value, &v.Order, &v.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (r *TemplateRepo) GetValue(ctx context.Context, templateID int64, key string) (*domain.TemplateValue, error) {
	v := &domain.TemplateValue{}
	err := r.db.QueryRow(ctx,
		`SELECT `+tvCols+` FROM tr_template_values WHERE template_id = $1 AND key = $2`,
		templateID, key,
	).Scan(&v.ID, &v.TemplateID, &v.Key, &v.Value, &v.Order, &v.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	return v, err
}

// UpsertValue — set 1 value by key (mis. key='layout' untuk simpan blocks).
func (r *TemplateRepo) UpsertValue(ctx context.Context, templateID int64, key, value string, order int) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO tr_template_values (template_id, key, value, "order", updated_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (template_id, key) DO UPDATE
		SET value = EXCLUDED.value, "order" = EXCLUDED."order", updated_at = NOW()
	`, templateID, key, value, order)
	return err
}

// AppendItem — tambah item baru dengan key auto-generated 'item_<n+1>'.
// Order di-set ke MAX(order)+1 supaya item baru di akhir.
func (r *TemplateRepo) AppendItem(ctx context.Context, templateID int64, value string) (int64, string, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return 0, "", err
	}
	defer tx.Rollback(ctx)

	// Hitung next item index berdasarkan max order existing.
	var maxOrder int
	err = tx.QueryRow(ctx, `
		SELECT COALESCE(MAX("order"), 0) FROM tr_template_values
		WHERE template_id = $1 AND key LIKE 'item_%'
	`, templateID).Scan(&maxOrder)
	if err != nil {
		return 0, "", err
	}
	nextOrder := maxOrder + 1
	key := fmt.Sprintf("item_%d", nextOrder)

	var id int64
	err = tx.QueryRow(ctx, `
		INSERT INTO tr_template_values (template_id, key, value, "order")
		VALUES ($1, $2, $3, $4) RETURNING id
	`, templateID, key, value, nextOrder).Scan(&id)
	if err != nil {
		return 0, "", err
	}
	return id, key, tx.Commit(ctx)
}

func (r *TemplateRepo) UpdateItemValue(ctx context.Context, itemID int64, value string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE tr_template_values SET value = $2, updated_at = NOW() WHERE id = $1
	`, itemID, value)
	return err
}

func (r *TemplateRepo) DeleteValue(ctx context.Context, itemID int64) error {
	_, err := r.db.Exec(ctx, `DELETE FROM tr_template_values WHERE id = $1`, itemID)
	return err
}

// ReorderItems — set order satu-satu sesuai urutan ids di slice.
func (r *TemplateRepo) ReorderItems(ctx context.Context, templateID int64, orderedIDs []int64) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	for i, id := range orderedIDs {
		if _, err := tx.Exec(ctx, `
			UPDATE tr_template_values SET "order" = $2 WHERE id = $1 AND template_id = $3
		`, id, i+1, templateID); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

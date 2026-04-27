package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kurniawa9157/template-base/internal/domain"
)

type RoleRepo struct{ db *pgxpool.Pool }

func NewRoleRepo(db *pgxpool.Pool) *RoleRepo { return &RoleRepo{db: db} }

func (r *RoleRepo) GetByID(ctx context.Context, id int64) (*domain.Role, error) {
	role := &domain.Role{}
	err := r.db.QueryRow(ctx, `
		SELECT id, code, name, parent_id, level, is_active, created_at, updated_at
		FROM tr_roles WHERE id = $1
	`, id).Scan(&role.ID, &role.Code, &role.Name, &role.ParentID, &role.Level, &role.IsActive, &role.CreatedAt, &role.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	return role, err
}

func (r *RoleRepo) GetByCode(ctx context.Context, code string) (*domain.Role, error) {
	role := &domain.Role{}
	err := r.db.QueryRow(ctx, `
		SELECT id, code, name, parent_id, level, is_active, created_at, updated_at
		FROM tr_roles WHERE code = $1
	`, code).Scan(&role.ID, &role.Code, &role.Name, &role.ParentID, &role.Level, &role.IsActive, &role.CreatedAt, &role.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	return role, err
}

// List — semua role, diurutkan berdasarkan level lalu code.
func (r *RoleRepo) List(ctx context.Context) ([]domain.Role, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, code, name, parent_id, level, is_active, created_at, updated_at
		FROM tr_roles
		ORDER BY level ASC, code ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]domain.Role, 0)
	for rows.Next() {
		var role domain.Role
		if err := rows.Scan(&role.ID, &role.Code, &role.Name, &role.ParentID, &role.Level, &role.IsActive, &role.CreatedAt, &role.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, role)
	}
	return out, rows.Err()
}

// CreateRoleInput untuk /admin/roles.
type CreateRoleInput struct {
	Code     string
	Name     string
	ParentID *int64
	Level    int
}

func (r *RoleRepo) Create(ctx context.Context, in CreateRoleInput) (int64, error) {
	var id int64
	err := r.db.QueryRow(ctx, `
		INSERT INTO tr_roles (code, name, parent_id, level, is_active)
		VALUES ($1, $2, $3, $4, TRUE)
		RETURNING id
	`, in.Code, in.Name, in.ParentID, in.Level).Scan(&id)
	return id, err
}

// UpdateRoleInput untuk PATCH role.
type UpdateRoleInput struct {
	Name     string
	ParentID *int64
	Level    int
	IsActive bool
}

func (r *RoleRepo) Update(ctx context.Context, id int64, in UpdateRoleInput) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE tr_roles
		SET name = $2, parent_id = $3, level = $4, is_active = $5, updated_at = NOW()
		WHERE id = $1
	`, id, in.Name, in.ParentID, in.Level, in.IsActive)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// Delete — user dengan role ini akan kena FK ON DELETE SET NULL.
func (r *RoleRepo) Delete(ctx context.Context, id int64) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM tr_roles WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

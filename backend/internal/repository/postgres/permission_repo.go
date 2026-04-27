package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kurniawa9157/template-base/internal/domain"
)

type PermissionRepo struct{ db *pgxpool.Pool }

func NewPermissionRepo(db *pgxpool.Pool) *PermissionRepo { return &PermissionRepo{db: db} }

// ListByRole mengembalikan semua permission milik 1 role.
// Dipakai oleh /auth/me untuk menyusun PermissionMap client-side.
func (r *PermissionRepo) ListByRole(ctx context.Context, roleID int64) ([]domain.Permission, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, role_id, module_code, can_view, can_create, can_edit, can_delete
		FROM tr_permissions
		WHERE role_id = $1
		ORDER BY module_code
	`, roleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]domain.Permission, 0)
	for rows.Next() {
		var p domain.Permission
		if err := rows.Scan(&p.ID, &p.RoleID, &p.ModuleCode, &p.CanView, &p.CanCreate, &p.CanEdit, &p.CanDelete); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// GetForRoleModule mengembalikan permission untuk 1 module dari 1 role.
// Dipakai oleh checker saat middleware RequirePermission dipanggil.
// Return (nil, nil) bila row tidak ada — artinya role belum diset permission itu (= deny).
func (r *PermissionRepo) GetForRoleModule(ctx context.Context, roleID int64, moduleCode string) (*domain.Permission, error) {
	var p domain.Permission
	err := r.db.QueryRow(ctx, `
		SELECT id, role_id, module_code, can_view, can_create, can_edit, can_delete
		FROM tr_permissions
		WHERE role_id = $1 AND module_code = $2
	`, roleID, moduleCode).Scan(&p.ID, &p.RoleID, &p.ModuleCode, &p.CanView, &p.CanCreate, &p.CanEdit, &p.CanDelete)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

// BulkUpsert — simpan matrix permission untuk 1 role dalam 1 transaksi.
func (r *PermissionRepo) BulkUpsert(ctx context.Context, roleID int64, perms []domain.Permission) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	for _, p := range perms {
		if _, err := tx.Exec(ctx, `
			INSERT INTO tr_permissions (role_id, module_code, can_view, can_create, can_edit, can_delete)
			VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT (role_id, module_code) DO UPDATE SET
				can_view = EXCLUDED.can_view,
				can_create = EXCLUDED.can_create,
				can_edit = EXCLUDED.can_edit,
				can_delete = EXCLUDED.can_delete,
				updated_at = NOW()
		`, roleID, p.ModuleCode, p.CanView, p.CanCreate, p.CanEdit, p.CanDelete); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

// ToMap membangun PermissionMap dari slice Permission.
func ToPermissionMap(perms []domain.Permission) domain.PermissionMap {
	out := make(domain.PermissionMap, len(perms))
	for _, p := range perms {
		out[p.ModuleCode] = map[domain.Action]bool{
			domain.ActionView:   p.CanView,
			domain.ActionCreate: p.CanCreate,
			domain.ActionEdit:   p.CanEdit,
			domain.ActionDelete: p.CanDelete,
		}
	}
	return out
}

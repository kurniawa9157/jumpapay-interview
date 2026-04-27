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

type UserRepo struct{ db *pgxpool.Pool }

func NewUserRepo(db *pgxpool.Pool) *UserRepo { return &UserRepo{db: db} }

const userSelectCols = `id, code, first_name, mid_name, last_name, is_admin, role_id, status_code,
	google2fa_secret, google2fa_enabled, google2fa_confirmed_at, last_login_at,
	created_at, updated_at`

func (r *UserRepo) scan(row pgx.Row) (*domain.User, error) {
	u := &domain.User{}
	err := row.Scan(
		&u.ID, &u.Code, &u.FirstName, &u.MidName, &u.LastName, &u.IsAdmin, &u.RoleID, &u.StatusCode,
		&u.Google2FASecret, &u.Google2FAEnabled, &u.Google2FAConfirmedAt, &u.LastLoginAt,
		&u.CreatedAt, &u.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	return u, err
}

// GetByID mengembalikan user lengkap berdasarkan id.
func (r *UserRepo) GetByID(ctx context.Context, id int64) (*domain.User, error) {
	row := r.db.QueryRow(ctx, `SELECT `+userSelectCols+` FROM users WHERE id = $1`, id)
	return r.scan(row)
}

// GetBrief — versi ringan untuk permission check (is_admin + role_id).
func (r *UserRepo) GetBrief(ctx context.Context, id int64) (*domain.UserBrief, error) {
	u := &domain.UserBrief{}
	err := r.db.QueryRow(ctx, `SELECT id, is_admin, role_id FROM users WHERE id = $1`, id).
		Scan(&u.ID, &u.IsAdmin, &u.RoleID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	return u, err
}

// UpdateLastLogin menset last_login_at = NOW().
func (r *UserRepo) UpdateLastLogin(ctx context.Context, userID int64) error {
	_, err := r.db.Exec(ctx, `UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`, userID)
	return err
}

// SetTotpSecret — simpan secret TOTP baru (enabled = false sampai user
// confirm dengan code pertama). Menghapus confirmed_at kalau ada (re-setup).
func (r *UserRepo) SetTotpSecret(ctx context.Context, userID int64, secret string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE users SET google2fa_secret = $2, google2fa_enabled = FALSE,
			google2fa_confirmed_at = NULL, updated_at = NOW()
		WHERE id = $1
	`, userID, secret)
	return err
}

// EnableTotp — set enabled=true + confirmed_at=NOW() setelah user verify
// code TOTP pertama mereka.
func (r *UserRepo) EnableTotp(ctx context.Context, userID int64) error {
	_, err := r.db.Exec(ctx, `
		UPDATE users SET google2fa_enabled = TRUE,
			google2fa_confirmed_at = NOW(), updated_at = NOW()
		WHERE id = $1
	`, userID)
	return err
}

// DisableTotp — hapus secret + reset semua flag 2FA (user bisa re-setup).
func (r *UserRepo) DisableTotp(ctx context.Context, userID int64) error {
	_, err := r.db.Exec(ctx, `
		UPDATE users SET google2fa_secret = NULL, google2fa_enabled = FALSE,
			google2fa_confirmed_at = NULL, updated_at = NOW()
		WHERE id = $1
	`, userID)
	return err
}

// CreateUser insert user baru, return id hasil.
// Dipakai oleh cmd/seed dan admin user management (Batch B2).
type CreateUserInput struct {
	Code       string
	FirstName  string
	MidName    *string
	LastName   *string
	IsAdmin    bool
	RoleID     *int64
	StatusCode domain.UserStatus
}

func (r *UserRepo) Create(ctx context.Context, in CreateUserInput) (int64, error) {
	if in.StatusCode == "" {
		in.StatusCode = domain.UserStatusActive
	}
	var id int64
	err := r.db.QueryRow(ctx, `
		INSERT INTO users (code, first_name, mid_name, last_name, is_admin, role_id, status_code, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
		RETURNING id
	`, in.Code, in.FirstName, in.MidName, in.LastName, in.IsAdmin, in.RoleID, in.StatusCode, time.Now()).
		Scan(&id)
	return id, err
}

// ExistsByCode mengecek keberadaan user code — dipakai seeder idempotent.
func (r *UserRepo) ExistsByCode(ctx context.Context, code string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE code = $1)`, code).Scan(&exists)
	return exists, err
}

// ListFilter — filter untuk endpoint /admin/users.
type ListFilter struct {
	Search     string            // nama, email, atau code
	RoleID     *int64            // filter 1 role
	StatusCode domain.UserStatus // ACTIVE, SUSPENDED, INACTIVE (kosong = semua)
	Limit      int
	Offset     int
}

// ListUserRow menggabungkan User + email primer + role name untuk UI admin.
type ListUserRow struct {
	User     domain.User
	Email    *string
	RoleCode *string
	RoleName *string
}

// List mengembalikan user non-admin dengan filter + pagination. Return (rows, total).
func (r *UserRepo) List(ctx context.Context, f ListFilter) ([]ListUserRow, int, error) {
	if f.Limit <= 0 || f.Limit > 200 {
		f.Limit = 20
	}
	args := []any{}
	where := []string{"u.is_admin = FALSE"}

	if f.Search != "" {
		args = append(args, "%"+f.Search+"%")
		idx := len(args)
		where = append(where, fmt.Sprintf(
			"(u.first_name ILIKE $%d OR u.last_name ILIKE $%d OR u.code ILIKE $%d "+
				"OR EXISTS (SELECT 1 FROM tt_contacts c WHERE c.user_id = u.id AND c.value ILIKE $%d))",
			idx, idx, idx, idx,
		))
	}
	if f.RoleID != nil {
		args = append(args, *f.RoleID)
		where = append(where, fmt.Sprintf("u.role_id = $%d", len(args)))
	}
	if f.StatusCode != "" {
		args = append(args, f.StatusCode)
		where = append(where, fmt.Sprintf("u.status_code = $%d", len(args)))
	}
	whereSQL := "WHERE " + strings.Join(where, " AND ")

	var total int
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM users u `+whereSQL, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count users: %w", err)
	}

	args = append(args, f.Limit, f.Offset)
	limitIdx := len(args) - 1
	offsetIdx := len(args)

	rows, err := r.db.Query(ctx, fmt.Sprintf(`
		SELECT u.id, u.code, u.first_name, u.mid_name, u.last_name, u.is_admin, u.role_id, u.status_code,
		       u.google2fa_secret, u.google2fa_enabled, u.google2fa_confirmed_at, u.last_login_at,
		       u.created_at, u.updated_at,
		       (SELECT c.value FROM tt_contacts c WHERE c.user_id = u.id AND c.type_code = 'EMAIL' AND c.is_primary = TRUE LIMIT 1) AS email,
		       r.code AS role_code, r.name AS role_name
		FROM users u
		LEFT JOIN tr_roles r ON r.id = u.role_id
		%s
		ORDER BY u.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereSQL, limitIdx, offsetIdx), args...)
	if err != nil {
		return nil, 0, fmt.Errorf("query users: %w", err)
	}
	defer rows.Close()

	out := make([]ListUserRow, 0)
	for rows.Next() {
		var row ListUserRow
		u := &row.User
		if err := rows.Scan(
			&u.ID, &u.Code, &u.FirstName, &u.MidName, &u.LastName, &u.IsAdmin, &u.RoleID, &u.StatusCode,
			&u.Google2FASecret, &u.Google2FAEnabled, &u.Google2FAConfirmedAt, &u.LastLoginAt,
			&u.CreatedAt, &u.UpdatedAt,
			&row.Email, &row.RoleCode, &row.RoleName,
		); err != nil {
			return nil, 0, err
		}
		out = append(out, row)
	}
	return out, total, rows.Err()
}

// UpdateUserInput — field yang boleh diubah admin (is_admin tidak bisa).
type UpdateUserInput struct {
	FirstName  string
	MidName    *string
	LastName   *string
	RoleID     *int64
	StatusCode domain.UserStatus
	UpdatedBy  int64
}

func (r *UserRepo) Update(ctx context.Context, id int64, in UpdateUserInput) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE users
		SET first_name = $2, mid_name = $3, last_name = $4,
		    role_id = $5, status_code = $6,
		    updated_at = NOW(), updated_by = $7
		WHERE id = $1 AND is_admin = FALSE
	`, id, in.FirstName, in.MidName, in.LastName, in.RoleID, in.StatusCode, in.UpdatedBy)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// SetStatus — shortcut untuk suspend/activate.
func (r *UserRepo) SetStatus(ctx context.Context, id int64, status domain.UserStatus, actorID int64) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE users SET status_code = $2, updated_at = NOW(), updated_by = $3
		WHERE id = $1 AND is_admin = FALSE
	`, id, status, actorID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// UpdateNameFields — self-service update nama user (tanpa ubah role/status).
// Dipakai endpoint /me/profile. actorID = id user yang sedang login (self update).
func (r *UserRepo) UpdateNameFields(ctx context.Context, id int64, first string, mid, last *string, actorID int64) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE users
		SET first_name = $2, mid_name = $3, last_name = $4,
		    updated_at = NOW(), updated_by = $5
		WHERE id = $1
	`, id, first, mid, last, actorID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// CountByRoleCode — jumlah user aktif per role code (untuk /admin/stats).
func (r *UserRepo) CountByRoleCode(ctx context.Context, roleCode string) (int, error) {
	var n int
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM users u
		JOIN tr_roles r ON r.id = u.role_id
		WHERE r.code = $1 AND u.status_code = 'ACTIVE' AND u.is_admin = FALSE
	`, roleCode).Scan(&n)
	return n, err
}

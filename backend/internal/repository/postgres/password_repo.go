package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kurniawa9157/template-base/internal/domain"
)

type PasswordRepo struct{ db *pgxpool.Pool }

func NewPasswordRepo(db *pgxpool.Pool) *PasswordRepo { return &PasswordRepo{db: db} }

// GetActive mengembalikan password aktif user untuk type tertentu (MAIN, OTP_LOGIN, dll).
func (r *PasswordRepo) GetActive(ctx context.Context, userID int64, typeCode domain.PasswordType) (*domain.Password, error) {
	p := &domain.Password{}
	err := r.db.QueryRow(ctx, `
		SELECT id, user_id, type_code, password, plain_hint, is_active, expired_at,
		       failed_attempts, locked_until, last_used_at, created_at
		FROM tt_passwords
		WHERE user_id = $1 AND type_code = $2 AND is_active = TRUE
		ORDER BY created_at DESC
		LIMIT 1
	`, userID, typeCode).Scan(
		&p.ID, &p.UserID, &p.TypeCode, &p.PasswordHash, &p.PlainHint, &p.IsActive, &p.ExpiredAt,
		&p.FailedAttempts, &p.LockedUntil, &p.LastUsedAt, &p.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	return p, err
}

// Create insert password baru. Untuk type MAIN, panggil DeactivatePrevious dulu
// agar hanya 1 row is_active=TRUE per type (history pattern).
type CreatePasswordInput struct {
	UserID    int64
	TypeCode  domain.PasswordType
	Hash      string
	PlainHint *string
	ExpiredAt *time.Time
}

func (r *PasswordRepo) Create(ctx context.Context, in CreatePasswordInput) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO tt_passwords (user_id, type_code, password, plain_hint, is_active, expired_at)
		VALUES ($1, $2, $3, $4, TRUE, $5)
	`, in.UserID, in.TypeCode, in.Hash, in.PlainHint, in.ExpiredAt)
	return err
}

// DeactivatePrevious set semua row type_code tertentu user menjadi is_active=FALSE.
// Dipanggil sebelum Create untuk rotasi password.
func (r *PasswordRepo) DeactivatePrevious(ctx context.Context, userID int64, typeCode domain.PasswordType) error {
	_, err := r.db.Exec(ctx, `
		UPDATE tt_passwords SET is_active = FALSE
		WHERE user_id = $1 AND type_code = $2 AND is_active = TRUE
	`, userID, typeCode)
	return err
}

// RecordFailedAttempt increment counter + set locked_until kalau threshold tercapai.
func (r *PasswordRepo) RecordFailedAttempt(ctx context.Context, passwordID int64, threshold int, lockDuration time.Duration) error {
	_, err := r.db.Exec(ctx, `
		UPDATE tt_passwords
		SET failed_attempts = failed_attempts + 1,
		    locked_until = CASE WHEN failed_attempts + 1 >= $2 THEN NOW() + $3::INTERVAL ELSE locked_until END
		WHERE id = $1
	`, passwordID, threshold, lockDuration.String())
	return err
}

// ResetAttempts — dipanggil setelah login sukses.
func (r *PasswordRepo) ResetAttempts(ctx context.Context, passwordID int64) error {
	_, err := r.db.Exec(ctx, `
		UPDATE tt_passwords
		SET failed_attempts = 0, locked_until = NULL, last_used_at = NOW()
		WHERE id = $1
	`, passwordID)
	return err
}

package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kurniawa9157/template-base/internal/domain"
)

type RefreshTokenRepo struct{ db *pgxpool.Pool }

func NewRefreshTokenRepo(db *pgxpool.Pool) *RefreshTokenRepo { return &RefreshTokenRepo{db: db} }

type CreateRefreshInput struct {
	UserID     int64
	TokenHash  string
	DeviceInfo string
	IPAddress  string
	ExpiresAt  time.Time
}

func (r *RefreshTokenRepo) Create(ctx context.Context, in CreateRefreshInput) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO tt_refresh_tokens (user_id, token_hash, device_info, ip_address, expires_at)
		VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), $5)
	`, in.UserID, in.TokenHash, in.DeviceInfo, in.IPAddress, in.ExpiresAt)
	return err
}

// GetValidByHash mengambil refresh token yang belum revoked & belum expired.
func (r *RefreshTokenRepo) GetValidByHash(ctx context.Context, tokenHash string) (*domain.RefreshToken, error) {
	rt := &domain.RefreshToken{}
	err := r.db.QueryRow(ctx, `
		SELECT id, user_id, token_hash, device_info, ip_address, issued_at, expires_at, revoked_at
		FROM tt_refresh_tokens
		WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()
	`, tokenHash).Scan(
		&rt.ID, &rt.UserID, &rt.TokenHash, &rt.DeviceInfo, &rt.IPAddress,
		&rt.IssuedAt, &rt.ExpiresAt, &rt.RevokedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	return rt, err
}

// Revoke set revoked_at=NOW() untuk 1 token.
func (r *RefreshTokenRepo) Revoke(ctx context.Context, id int64) error {
	_, err := r.db.Exec(ctx, `UPDATE tt_refresh_tokens SET revoked_at = NOW() WHERE id = $1`, id)
	return err
}

// RevokeByHash — versi Revoke via hash langsung (dipakai saat logout).
func (r *RefreshTokenRepo) RevokeByHash(ctx context.Context, tokenHash string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE tt_refresh_tokens SET revoked_at = NOW()
		WHERE token_hash = $1 AND revoked_at IS NULL
	`, tokenHash)
	return err
}

// RevokeAllForUser — untuk "logout dari semua device" (Batch B2).
func (r *RefreshTokenRepo) RevokeAllForUser(ctx context.Context, userID int64) error {
	_, err := r.db.Exec(ctx, `
		UPDATE tt_refresh_tokens SET revoked_at = NOW()
		WHERE user_id = $1 AND revoked_at IS NULL
	`, userID)
	return err
}

// ListActiveByUser — daftar sesi aktif (belum expired, belum revoked).
func (r *RefreshTokenRepo) ListActiveByUser(ctx context.Context, userID int64) ([]domain.RefreshToken, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, token_hash, device_info, ip_address, issued_at, expires_at, revoked_at
		FROM tt_refresh_tokens
		WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
		ORDER BY issued_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.RefreshToken, 0)
	for rows.Next() {
		var t domain.RefreshToken
		if err := rows.Scan(&t.ID, &t.UserID, &t.TokenHash, &t.DeviceInfo,
			&t.IPAddress, &t.IssuedAt, &t.ExpiresAt, &t.RevokedAt); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

// RevokeByIDForUser — revoke 1 sesi, hanya kalau milik user tsb (safety guard).
func (r *RefreshTokenRepo) RevokeByIDForUser(ctx context.Context, userID, sessionID int64) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE tt_refresh_tokens SET revoked_at = NOW()
		WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
	`, sessionID, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// RevokeAllForUserExceptHash — revoke semua sesi aktif user KECUALI yang
// token_hash-nya cocok. Dipakai untuk "ganti password" dan "logout semua
// device lain", supaya device yang sedang dipakai user tetap aktif.
func (r *RefreshTokenRepo) RevokeAllForUserExceptHash(ctx context.Context, userID int64, keepHash string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE tt_refresh_tokens SET revoked_at = NOW()
		WHERE user_id = $1 AND revoked_at IS NULL
		  AND ($2 = '' OR token_hash <> $2)
	`, userID, keepHash)
	return err
}

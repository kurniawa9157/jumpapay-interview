package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kurniawa9157/template-base/internal/domain"
)

type ContactRepo struct{ db *pgxpool.Pool }

func NewContactRepo(db *pgxpool.Pool) *ContactRepo { return &ContactRepo{db: db} }

// FindLoginableByValue — implementasi inti ContactUserProvider Laravel:
// cari contact yang bisa dipakai login (email/phone) dari nilai identifier.
func (r *ContactRepo) FindLoginableByValue(ctx context.Context, value string) (*domain.Contact, error) {
	c := &domain.Contact{}
	err := r.db.QueryRow(ctx, `
		SELECT id, user_id, type_code, value, is_primary, can_login, is_verified, is_active, created_at, updated_at
		FROM tt_contacts
		WHERE value = $1 AND can_login = TRUE AND is_active = TRUE
		LIMIT 1
	`, value).Scan(
		&c.ID, &c.UserID, &c.TypeCode, &c.Value, &c.IsPrimary, &c.CanLogin, &c.IsVerified, &c.IsActive,
		&c.CreatedAt, &c.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	return c, err
}

// GetPrimaryEmail mengembalikan value email primary dari user (buat claim `email`).
func (r *ContactRepo) GetPrimaryEmail(ctx context.Context, userID int64) (string, error) {
	var value string
	err := r.db.QueryRow(ctx, `
		SELECT value FROM tt_contacts
		WHERE user_id = $1 AND type_code = $2 AND is_primary = TRUE
		LIMIT 1
	`, userID, domain.ContactTypeEmail).Scan(&value)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	return value, err
}

// Create — insert contact baru (dipakai seeder & user management).
type CreateContactInput struct {
	UserID     int64
	TypeCode   domain.ContactType
	Value      string
	IsPrimary  bool
	CanLogin   bool
	IsVerified bool
}

func (r *ContactRepo) Create(ctx context.Context, in CreateContactInput) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO tt_contacts (user_id, type_code, value, is_primary, can_login, is_verified, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, TRUE)
		ON CONFLICT (type_code, value) DO NOTHING
	`, in.UserID, in.TypeCode, in.Value, in.IsPrimary, in.CanLogin, in.IsVerified)
	return err
}

// GetPrimaryPhone — helper simetris dengan GetPrimaryEmail.
func (r *ContactRepo) GetPrimaryPhone(ctx context.Context, userID int64) (string, error) {
	var value string
	err := r.db.QueryRow(ctx, `
		SELECT value FROM tt_contacts
		WHERE user_id = $1 AND type_code = $2 AND is_primary = TRUE
		LIMIT 1
	`, userID, domain.ContactTypePhone).Scan(&value)
	if err != nil {
		return "", nil
	}
	return value, nil
}

// UpsertPrimaryPhone — kalau value kosong → hapus phone primary user (nonaktifkan).
// Kalau ada row phone primary → update value. Kalau tidak ada → insert baru.
func (r *ContactRepo) UpsertPrimaryPhone(ctx context.Context, userID int64, value string) error {
	if value == "" {
		_, err := r.db.Exec(ctx, `
			UPDATE tt_contacts SET is_active = FALSE
			WHERE user_id = $1 AND type_code = $2 AND is_primary = TRUE
		`, userID, domain.ContactTypePhone)
		return err
	}
	tag, err := r.db.Exec(ctx, `
		UPDATE tt_contacts SET value = $3, is_active = TRUE, updated_at = NOW()
		WHERE user_id = $1 AND type_code = $2 AND is_primary = TRUE
	`, userID, domain.ContactTypePhone, value)
	if err != nil {
		return err
	}
	if tag.RowsAffected() > 0 {
		return nil
	}
	// Tidak ada row primary — insert baru.
	_, err = r.db.Exec(ctx, `
		INSERT INTO tt_contacts (user_id, type_code, value, is_primary, can_login, is_verified, is_active)
		VALUES ($1, $2, $3, TRUE, FALSE, FALSE, TRUE)
		ON CONFLICT (type_code, value) DO UPDATE SET is_active = TRUE, updated_at = NOW()
	`, userID, domain.ContactTypePhone, value)
	return err
}

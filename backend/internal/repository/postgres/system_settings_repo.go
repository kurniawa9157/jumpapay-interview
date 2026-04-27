package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kurniawa9157/template-base/internal/domain"
)

type SystemSettingsRepo struct{ db *pgxpool.Pool }

func NewSystemSettingsRepo(db *pgxpool.Pool) *SystemSettingsRepo {
	return &SystemSettingsRepo{db: db}
}

// SettingRow — satu baris tr_system_settings.
type SettingRow struct {
	GroupCode string    `json:"group_code"`
	Key       string    `json:"key"`
	Value     string    `json:"value"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Get — ambil value string berdasarkan key. Mengembalikan ErrNotFound jika tidak ada.
func (r *SystemSettingsRepo) Get(ctx context.Context, key string) (string, error) {
	var value string
	err := r.db.QueryRow(ctx, `SELECT value FROM tr_system_settings WHERE key = $1`, key).Scan(&value)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", domain.ErrNotFound
	}
	return value, err
}

// GetMany — ambil beberapa setting sekaligus, return map key→value.
// Key yang tidak ada akan absent dari map (tidak error).
func (r *SystemSettingsRepo) GetMany(ctx context.Context, keys []string) (map[string]string, error) {
	if len(keys) == 0 {
		return map[string]string{}, nil
	}
	rows, err := r.db.Query(ctx, `
		SELECT key, value FROM tr_system_settings WHERE key = ANY($1)
	`, keys)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make(map[string]string, len(keys))
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			return nil, err
		}
		out[k] = v
	}
	return out, rows.Err()
}

// List — semua settings, diurutkan per group lalu key.
func (r *SystemSettingsRepo) List(ctx context.Context) ([]SettingRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT group_code, key, value, updated_at
		FROM tr_system_settings
		ORDER BY group_code ASC, key ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []SettingRow
	for rows.Next() {
		var s SettingRow
		if err := rows.Scan(&s.GroupCode, &s.Key, &s.Value, &s.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

// Set — upsert value by key (preserve group_code kalau row sudah ada,
// gunakan groupCode parameter kalau row baru).
func (r *SystemSettingsRepo) Set(ctx context.Context, groupCode, key, value string) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO tr_system_settings (group_code, key, value, updated_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
	`, groupCode, key, value)
	return err
}

// SetMany — bulk upsert (1 transaksi). Entry dengan value="" tetap disimpan
// apa adanya (panggil delete eksplisit kalau mau hapus).
func (r *SystemSettingsRepo) SetMany(ctx context.Context, entries []SettingRow) error {
	if len(entries) == 0 {
		return nil
	}
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	for _, e := range entries {
		_, err := tx.Exec(ctx, `
			INSERT INTO tr_system_settings (group_code, key, value, updated_at)
			VALUES ($1, $2, $3, NOW())
			ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
		`, e.GroupCode, e.Key, e.Value)
		if err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

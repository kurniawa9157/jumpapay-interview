package postgres

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kurniawa9157/template-base/internal/domain"
)

type ActivityRepo struct{ db *pgxpool.Pool }

func NewActivityRepo(db *pgxpool.Pool) *ActivityRepo { return &ActivityRepo{db: db} }

// ListForUser — ambil N aktivitas terakhir user (untuk /profile/histori).
func (r *ActivityRepo) ListForUser(ctx context.Context, userID int64, limit int) ([]domain.Activity, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, activity_code, description, ip_address, user_agent,
		       device_type, os, browser, location_country, location_city, session_id,
		       is_success, metadata, created_at
		FROM th_user_activity
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.Activity, 0)
	for rows.Next() {
		var a domain.Activity
		if err := rows.Scan(&a.ID, &a.UserID, &a.ActivityCode, &a.Description,
			&a.IPAddress, &a.UserAgent, &a.DeviceType, &a.OS, &a.Browser,
			&a.LocationCountry, &a.LocationCity, &a.SessionID, &a.IsSuccess,
			&a.Metadata, &a.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

// Insert append row th_user_activity.
func (r *ActivityRepo) Insert(ctx context.Context, in domain.ActivityInput) error {
	var metadataJSON []byte
	if len(in.Metadata) > 0 {
		b, err := json.Marshal(in.Metadata)
		if err != nil {
			return err
		}
		metadataJSON = b
	}

	_, err := r.db.Exec(ctx, `
		INSERT INTO th_user_activity
			(user_id, activity_code, description, ip_address, user_agent, device_type,
			 session_id, is_success, metadata)
		VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''), NULLIF($6, ''),
		        NULLIF($7, ''), $8, $9)
	`, in.UserID, in.ActivityCode, in.Description, in.IPAddress, in.UserAgent, in.DeviceType,
		in.SessionID, in.IsSuccess, metadataJSON)
	return err
}

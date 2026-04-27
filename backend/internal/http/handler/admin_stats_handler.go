package handler

import (
	"context"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kurniawa9157/template-base/internal/http/response"
	"github.com/kurniawa9157/template-base/internal/repository/postgres"
)

// AdminStatsHandler — dasbor admin summary.
// Foundation version: total user (semua role) + activity log terbaru.
// Tambah metric project-specific (count per role custom, count per status, dll)
// sesuai kebutuhan.
type AdminStatsHandler struct {
	db    *pgxpool.Pool
	users *postgres.UserRepo
}

func NewAdminStatsHandler(db *pgxpool.Pool, users *postgres.UserRepo) *AdminStatsHandler {
	return &AdminStatsHandler{db: db, users: users}
}

type recentActivity struct {
	ID     int64     `json:"id"`
	Actor  string    `json:"actor"`
	Action string    `json:"action"`
	Target string    `json:"target"`
	At     time.Time `json:"at"`
}

// GET /admin/stats
func (h *AdminStatsHandler) Stats(c *gin.Context) {
	ctx := c.Request.Context()

	totalUsers, _ := h.countTotalUsers(ctx)
	totalActive, _ := h.countActiveUsers(ctx)
	recent := h.recentActivity(ctx, 10)

	response.OK(c, gin.H{
		"totalUsers":     totalUsers,
		"activeUsers":    totalActive,
		"recentActivity": recent,
	})
}

func (h *AdminStatsHandler) countTotalUsers(ctx context.Context) (int, error) {
	var n int
	err := h.db.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&n)
	return n, err
}

func (h *AdminStatsHandler) countActiveUsers(ctx context.Context) (int, error) {
	var n int
	err := h.db.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE status_code = 'ACTIVE'`).Scan(&n)
	return n, err
}

func (h *AdminStatsHandler) recentActivity(ctx context.Context, limit int) []recentActivity {
	rows, err := h.db.Query(ctx, `
		SELECT a.id, COALESCE(u.first_name || COALESCE(' ' || u.last_name, ''), 'Sistem') AS actor,
		       a.activity_code, COALESCE(a.description, ''), a.created_at
		FROM th_user_activity a
		LEFT JOIN users u ON u.id = a.user_id
		ORDER BY a.created_at DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return []recentActivity{}
	}
	defer rows.Close()

	out := make([]recentActivity, 0)
	for rows.Next() {
		var r recentActivity
		if err := rows.Scan(&r.ID, &r.Actor, &r.Action, &r.Target, &r.At); err != nil {
			continue
		}
		out = append(out, r)
	}
	return out
}

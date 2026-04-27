package permission

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/kurniawa9157/template-base/internal/domain"
	"github.com/kurniawa9157/template-base/internal/repository/postgres"
)

// Checker memeriksa apakah user boleh melakukan action pada module tertentu.
// Mirror Laravel `hasPermission($module, $action)` + cache Redis 5 menit.
type Checker struct {
	users  *postgres.UserRepo
	perms  *postgres.PermissionRepo
	rdb    *redis.Client
	logger *slog.Logger
	ttl    time.Duration
}

func NewChecker(users *postgres.UserRepo, perms *postgres.PermissionRepo, rdb *redis.Client, logger *slog.Logger) *Checker {
	return &Checker{users: users, perms: perms, rdb: rdb, logger: logger, ttl: 5 * time.Minute}
}

// Has — true kalau user punya permission untuk module×action.
// Super admin (is_admin=TRUE) bypass otomatis.
func (c *Checker) Has(ctx context.Context, userID int64, module string, action domain.Action) (bool, error) {
	brief, err := c.users.GetBrief(ctx, userID)
	if err != nil {
		return false, err
	}
	if brief.IsAdmin {
		return true, nil
	}
	if brief.RoleID == nil {
		return false, nil
	}

	perm, err := c.getCachedPermission(ctx, *brief.RoleID, module)
	if err != nil {
		return false, err
	}
	if perm == nil {
		return false, nil
	}
	return perm.Allow(action), nil
}

// InvalidateRole — hapus cache saat matrix permission role diubah.
func (c *Checker) InvalidateRole(ctx context.Context, roleID int64) {
	pattern := fmt.Sprintf("perm:%d:*", roleID)
	iter := c.rdb.Scan(ctx, 0, pattern, 100).Iterator()
	for iter.Next(ctx) {
		_ = c.rdb.Del(ctx, iter.Val()).Err()
	}
}

func (c *Checker) getCachedPermission(ctx context.Context, roleID int64, module string) (*domain.Permission, error) {
	key := fmt.Sprintf("perm:%d:%s", roleID, module)

	if raw, err := c.rdb.Get(ctx, key).Bytes(); err == nil && len(raw) > 0 {
		// Payload "null" artinya perm tidak ada (deny) — cached juga untuk hindari re-query.
		if string(raw) == "null" {
			return nil, nil
		}
		p := &domain.Permission{}
		if err := json.Unmarshal(raw, p); err == nil {
			return p, nil
		}
	}

	perm, err := c.perms.GetForRoleModule(ctx, roleID, module)
	if err != nil {
		return nil, err
	}
	payload := []byte("null")
	if perm != nil {
		if b, err := json.Marshal(perm); err == nil {
			payload = b
		}
	}
	if err := c.rdb.Set(ctx, key, payload, c.ttl).Err(); err != nil {
		c.logger.Warn("cache permission gagal", "err", err, "key", key)
	}
	return perm, nil
}

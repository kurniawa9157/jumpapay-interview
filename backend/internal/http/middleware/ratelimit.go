package middleware

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"

	"github.com/kurniawa9157/template-base/internal/http/response"
)

// RateLimit — fixed window per-IP+scope, menggunakan Redis INCR + EXPIRE.
// scope ditambahkan ke key untuk membedakan endpoint (misalnya "login", "global").
func RateLimit(rdb *redis.Client, scope string, limit int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := fmt.Sprintf("rl:%s:%s", scope, c.ClientIP())
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()

		count, err := rdb.Incr(ctx, key).Result()
		if err != nil {
			// Redis down → jangan tolak request, lanjut.
			c.Next()
			return
		}
		if count == 1 {
			_ = rdb.Expire(ctx, key, window).Err()
		}
		if int(count) > limit {
			c.Header("Retry-After", fmt.Sprintf("%.0f", window.Seconds()))
			response.Err(c, http.StatusTooManyRequests, "rate_limited",
				"Terlalu banyak permintaan. Coba lagi dalam beberapa saat.")
			return
		}
		c.Next()
	}
}

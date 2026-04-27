package middleware

import (
	"log/slog"
	"net/http"
	"runtime/debug"

	"github.com/gin-gonic/gin"

	"github.com/kurniawa9157/template-base/internal/http/response"
)

// Recovery menangkap panic dan mengembalikan 500 JSON, log stack trace.
func Recovery(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if rec := recover(); rec != nil {
				logger.Error("panic in handler",
					"err", rec,
					"path", c.FullPath(),
					"method", c.Request.Method,
					"stack", string(debug.Stack()),
				)
				if !c.Writer.Written() {
					response.Err(c, http.StatusInternalServerError, "internal_error", "Terjadi kesalahan internal.")
				}
			}
		}()
		c.Next()
	}
}

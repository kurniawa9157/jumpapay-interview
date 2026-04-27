package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/kurniawa9157/template-base/internal/http/response"
	"github.com/kurniawa9157/template-base/internal/service/auth"
)

// Konstanta context key agar konsisten diakses dari handler.
const (
	CtxKeyUserID  = "user_id"
	CtxKeyRoleID  = "role_id"
	CtxKeyIsAdmin = "is_admin"
)

// RequireAuth memvalidasi header Authorization: Bearer <access_token>.
// Inject user_id, role_id, is_admin ke context.
func RequireAuth(js *auth.JWTService) gin.HandlerFunc {
	return func(c *gin.Context) {
		raw := strings.TrimSpace(strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer "))
		if raw == "" {
			response.Err(c, http.StatusUnauthorized, "missing_token", "Authorization header diperlukan.")
			return
		}
		claims, err := js.ParseAccess(raw)
		if err != nil {
			response.Err(c, http.StatusUnauthorized, "invalid_token", "Token tidak valid atau kedaluwarsa.")
			return
		}
		c.Set(CtxKeyUserID, claims.UserID)
		c.Set(CtxKeyRoleID, claims.RoleID)
		c.Set(CtxKeyIsAdmin, claims.IsAdmin)
		c.Next()
	}
}

// GetUserID mengembalikan user ID yang sudah di-inject oleh RequireAuth.
func GetUserID(c *gin.Context) (int64, bool) {
	v, ok := c.Get(CtxKeyUserID)
	if !ok {
		return 0, false
	}
	id, ok := v.(int64)
	return id, ok
}

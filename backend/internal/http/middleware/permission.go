package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/kurniawa9157/template-base/internal/domain"
	"github.com/kurniawa9157/template-base/internal/http/response"
	"github.com/kurniawa9157/template-base/internal/service/permission"
)

// RequirePermission — guard route level berdasarkan module + action.
// Harus dipasang SETELAH RequireAuth agar user_id tersedia di context.
func RequirePermission(checker *permission.Checker, module string, action domain.Action) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := GetUserID(c)
		if !ok {
			response.Err(c, http.StatusUnauthorized, "missing_user", "Autentikasi diperlukan.")
			return
		}
		allowed, err := checker.Has(c.Request.Context(), userID, module, action)
		if err != nil {
			response.Err(c, http.StatusInternalServerError, "permission_check_failed",
				"Gagal memeriksa izin: "+err.Error())
			return
		}
		if !allowed {
			response.Err(c, http.StatusForbidden, "forbidden",
				"Anda tidak memiliki izin untuk mengakses fitur ini.")
			return
		}
		c.Next()
	}
}

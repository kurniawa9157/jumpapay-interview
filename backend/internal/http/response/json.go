package response

import (
	"errors"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/kurniawa9157/template-base/internal/domain"
)

// OK mengirim status 200 dengan payload data.
func OK(c *gin.Context, data any) {
	c.JSON(http.StatusOK, data)
}

// Created — 201.
func Created(c *gin.Context, data any) {
	c.JSON(http.StatusCreated, data)
}

// NoContent — 204.
func NoContent(c *gin.Context) { c.Status(http.StatusNoContent) }

// ErrorBody — struktur error konsisten untuk frontend.
type ErrorBody struct {
	Error   string            `json:"error"`
	Message string            `json:"message"`
	Details map[string]string `json:"details,omitempty"`
}

// Err mengirim response error dengan code + message.
func Err(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, ErrorBody{Error: code, Message: message})
}

// ErrDetails — versi dengan field-level errors.
func ErrDetails(c *gin.Context, status int, code, message string, details map[string]string) {
	c.AbortWithStatusJSON(status, ErrorBody{Error: code, Message: message, Details: details})
}

// FromDomainError memetakan domain error standar ke HTTP status + code.
// Untuk pgx PgError (constraint violation dll), translate ke 4xx dengan
// pesan yang actionable (mis. "slug sudah terpakai" untuk unique violation).
// Error lain selain domain + pg → 500 + log ke stderr supaya admin bisa
// trace dari log container, sambil tetap merespon dengan generic message
// (jangan bocorkan internal SQL ke user).
func FromDomainError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrInvalidCredentials):
		Err(c, http.StatusUnauthorized, "invalid_credentials", err.Error())
	case errors.Is(err, domain.ErrUserSuspended):
		Err(c, http.StatusForbidden, "user_suspended", err.Error())
	case errors.Is(err, domain.ErrUserInactive):
		Err(c, http.StatusForbidden, "user_inactive", err.Error())
	case errors.Is(err, domain.ErrAccountLocked):
		Err(c, http.StatusLocked, "account_locked", err.Error())
	case errors.Is(err, domain.ErrInvalidToken):
		Err(c, http.StatusUnauthorized, "invalid_token", err.Error())
	case errors.Is(err, domain.ErrRefreshTokenRevoked):
		Err(c, http.StatusUnauthorized, "refresh_revoked", err.Error())
	case errors.Is(err, domain.ErrRequires2FA):
		Err(c, http.StatusUnauthorized, "requires_2fa", err.Error())
	case errors.Is(err, domain.ErrInvalid2FACode):
		Err(c, http.StatusUnauthorized, "invalid_2fa_code", err.Error())
	case errors.Is(err, domain.ErrForbidden):
		Err(c, http.StatusForbidden, "forbidden", err.Error())
	case errors.Is(err, domain.ErrNotFound):
		Err(c, http.StatusNotFound, "not_found", err.Error())
	case errors.Is(err, domain.ErrRateLimited):
		Err(c, http.StatusTooManyRequests, "rate_limited", err.Error())
	case errors.Is(err, domain.ErrInvalidInput):
		Err(c, http.StatusBadRequest, "invalid_input", err.Error())
	default:
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			handlePgError(c, pgErr)
			return
		}
		// Unknown error — log full detail tapi response generic.
		log.Printf("[unhandled-error] %s %s: %v", c.Request.Method, c.Request.URL.Path, err)
		Err(c, http.StatusInternalServerError, "internal_error", "Terjadi kesalahan internal. Coba lagi nanti.")
	}
}

// handlePgError — translate kode PostgreSQL standar ke pesan user-friendly.
// Reference: https://www.postgresql.org/docs/current/errcodes-appendix.html
func handlePgError(c *gin.Context, e *pgconn.PgError) {
	// Log dulu supaya admin bisa trace constraint name dll.
	log.Printf("[pg-error] %s %s: code=%s constraint=%s detail=%s msg=%s",
		c.Request.Method, c.Request.URL.Path, e.Code, e.ConstraintName, e.Detail, e.Message)
	switch e.Code {
	case "23505": // unique_violation
		Err(c, http.StatusConflict, "duplicate", "Data dengan nilai unik tersebut sudah ada (mis. slug/email/code sudah terpakai).")
	case "23503": // foreign_key_violation
		Err(c, http.StatusBadRequest, "invalid_reference", "Referensi data tidak valid: "+e.Detail)
	case "23502": // not_null_violation
		Err(c, http.StatusBadRequest, "missing_field", "Field wajib '"+e.ColumnName+"' tidak boleh kosong.")
	case "22001": // string_data_right_truncation
		Err(c, http.StatusBadRequest, "value_too_long", "Salah satu field melebihi panjang yang diizinkan.")
	case "23514": // check_violation
		Err(c, http.StatusBadRequest, "invalid_value", "Nilai tidak memenuhi constraint: "+e.Detail)
	default:
		Err(c, http.StatusInternalServerError, "db_error", "Database error ("+e.Code+"): "+e.Message)
	}
}

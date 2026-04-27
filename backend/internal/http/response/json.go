package response

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

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
		Err(c, http.StatusInternalServerError, "internal_error", "Terjadi kesalahan internal. Coba lagi nanti.")
	}
}

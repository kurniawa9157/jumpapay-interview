package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/kurniawa9157/template-base/internal/domain"
	"github.com/kurniawa9157/template-base/internal/http/middleware"
	"github.com/kurniawa9157/template-base/internal/http/response"
	"github.com/kurniawa9157/template-base/internal/service/account"
	"github.com/kurniawa9157/template-base/internal/service/auth"
)

type AccountHandler struct {
	svc *account.Service
}

func NewAccountHandler(svc *account.Service) *AccountHandler { return &AccountHandler{svc: svc} }

// GET /api/v1/me/profile
func (h *AccountHandler) GetProfile(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	p, err := h.svc.GetProfile(c.Request.Context(), userID)
	if err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.OK(c, p)
}

type updateProfileRequest struct {
	FirstName string  `json:"first_name" binding:"required,min=2"`
	MidName   *string `json:"mid_name"`
	LastName  *string `json:"last_name"`
	// Phone: "" (string kosong) = hapus phone; null / tidak dikirim = tidak ubah.
	Phone *string `json:"phone"`
}

// PATCH /api/v1/me/profile
func (h *AccountHandler) UpdateProfile(c *gin.Context) {
	var req updateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	userID, _ := middleware.GetUserID(c)
	p, err := h.svc.UpdateProfile(c.Request.Context(), userID, account.UpdateProfileInput{
		FirstName: req.FirstName, MidName: req.MidName, LastName: req.LastName, Phone: req.Phone,
	})
	if err != nil {
		response.Err(c, http.StatusBadRequest, "update_failed", err.Error())
		return
	}
	response.OK(c, p)
}

type changePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=8"`
	// Refresh token user saat ini — kalau dikirim, sesi ini TIDAK di-revoke
	// supaya user tetap login di device saat ini.
	KeepRefreshToken string `json:"keep_refresh_token"`
}

// POST /api/v1/me/password
func (h *AccountHandler) ChangePassword(c *gin.Context) {
	var req changePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	userID, _ := middleware.GetUserID(c)
	keepHash := ""
	if req.KeepRefreshToken != "" {
		keepHash = auth.HashRefreshToken(req.KeepRefreshToken)
	}
	if err := h.svc.ChangePassword(c.Request.Context(), userID, req.CurrentPassword, req.NewPassword, keepHash); err != nil {
		if errors.Is(err, domain.ErrInvalidCredentials) {
			response.Err(c, http.StatusUnauthorized, "invalid_current_password", "Password saat ini tidak cocok.")
			return
		}
		response.Err(c, http.StatusBadRequest, "change_failed", err.Error())
		return
	}
	response.NoContent(c)
}

// GET /api/v1/me/sessions?current=<sha256_hex>
func (h *AccountHandler) ListSessions(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	currentHash := c.Query("current")
	list, err := h.svc.ListSessions(c.Request.Context(), userID, currentHash)
	if err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.OK(c, gin.H{"sessions": list})
}

// DELETE /api/v1/me/sessions/:id
func (h *AccountHandler) RevokeSession(c *gin.Context) {
	sessionID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_id", "ID sesi tidak valid.")
		return
	}
	userID, _ := middleware.GetUserID(c)
	if err := h.svc.RevokeSession(c.Request.Context(), userID, sessionID); err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.NoContent(c)
}

type revokeOthersRequest struct {
	// Kalau non-empty, sesi yang match hash ini akan dipertahankan.
	KeepRefreshToken string `json:"keep_refresh_token"`
}

// POST /api/v1/me/sessions/revoke-others
func (h *AccountHandler) RevokeOtherSessions(c *gin.Context) {
	var req revokeOthersRequest
	_ = c.ShouldBindJSON(&req)
	userID, _ := middleware.GetUserID(c)
	keepHash := ""
	if req.KeepRefreshToken != "" {
		keepHash = auth.HashRefreshToken(req.KeepRefreshToken)
	}
	if err := h.svc.RevokeOtherSessions(c.Request.Context(), userID, keepHash); err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.NoContent(c)
}

// --- 2FA TOTP ---

// POST /api/v1/me/2fa/setup — generate secret + QR. Secret belum aktif
// sampai user verify dengan Confirm2FA.
func (h *AccountHandler) Setup2FA(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	setup, err := h.svc.Setup2FA(c.Request.Context(), userID)
	if err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.OK(c, setup)
}

type confirm2FARequest struct {
	Code string `json:"code" binding:"required,len=6"`
}

// POST /api/v1/me/2fa/confirm — user kirim 6-digit TOTP dari authenticator app.
func (h *AccountHandler) Confirm2FA(c *gin.Context) {
	var req confirm2FARequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	userID, _ := middleware.GetUserID(c)
	if err := h.svc.Confirm2FA(c.Request.Context(), userID, req.Code); err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.OK(c, gin.H{"two_factor_enabled": true})
}

type disable2FARequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
}

// POST /api/v1/me/2fa/disable — butuh password saat ini sebagai guard.
func (h *AccountHandler) Disable2FA(c *gin.Context) {
	var req disable2FARequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	userID, _ := middleware.GetUserID(c)
	if err := h.svc.Disable2FA(c.Request.Context(), userID, req.CurrentPassword); err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.OK(c, gin.H{"two_factor_enabled": false})
}

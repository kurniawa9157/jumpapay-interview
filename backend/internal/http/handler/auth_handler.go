package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/kurniawa9157/template-base/internal/http/middleware"
	"github.com/kurniawa9157/template-base/internal/http/response"
	"github.com/kurniawa9157/template-base/internal/service/auth"
)

type AuthHandler struct {
	svc *auth.Service
}

func NewAuthHandler(svc *auth.Service) *AuthHandler { return &AuthHandler{svc: svc} }

// --- Request DTO ---

type loginRequest struct {
	Identifier string `json:"identifier" binding:"required"`
	Password   string `json:"password" binding:"required,min=6"`
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type logoutRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type verify2FARequest struct {
	Pending2FAToken string `json:"pending_2fa_token" binding:"required"`
	Code            string `json:"code" binding:"required,len=6"`
}

// --- Handler ---

// POST /api/v1/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_body", "Isi permintaan tidak valid: "+err.Error())
		return
	}
	result, err := h.svc.Login(c.Request.Context(), req.Identifier, req.Password, clientCtx(c))
	if err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.OK(c, result)
}

// POST /api/v1/auth/2fa/verify — step kedua login untuk user ber-2FA.
func (h *AuthHandler) Verify2FA(c *gin.Context) {
	var req verify2FARequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_body", "Isi permintaan tidak valid: "+err.Error())
		return
	}
	result, err := h.svc.VerifyPending2FA(c.Request.Context(), req.Pending2FAToken, req.Code, clientCtx(c))
	if err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.OK(c, result)
}

// POST /api/v1/auth/refresh
func (h *AuthHandler) Refresh(c *gin.Context) {
	var req refreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_body", "Isi permintaan tidak valid: "+err.Error())
		return
	}
	result, err := h.svc.Refresh(c.Request.Context(), req.RefreshToken, clientCtx(c))
	if err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.OK(c, result)
}

// POST /api/v1/auth/logout (Bearer)
func (h *AuthHandler) Logout(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Err(c, http.StatusUnauthorized, "missing_user", "Tidak ada user di context.")
		return
	}
	var req logoutRequest
	_ = c.ShouldBindJSON(&req) // body opsional
	h.svc.Logout(c.Request.Context(), userID, req.RefreshToken, clientCtx(c))
	c.Status(http.StatusNoContent)
}

// GET /api/v1/auth/me (Bearer)
func (h *AuthHandler) Me(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Err(c, http.StatusUnauthorized, "missing_user", "Tidak ada user di context.")
		return
	}
	me, err := h.svc.Me(c.Request.Context(), userID)
	if err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.OK(c, me)
}

// --- Helper ---

func clientCtx(c *gin.Context) auth.ClientContext {
	ua := c.Request.UserAgent()
	device := "UNKNOWN"
	ual := strings.ToLower(ua)
	switch {
	case strings.Contains(ual, "mobile") || strings.Contains(ual, "android") || strings.Contains(ual, "iphone"):
		device = "MOBILE"
	case strings.Contains(ual, "ipad") || strings.Contains(ual, "tablet"):
		device = "TABLET"
	case ua != "":
		device = "DESKTOP"
	}
	return auth.ClientContext{
		IP:         c.ClientIP(),
		UserAgent:  ua,
		DeviceType: device,
	}
}

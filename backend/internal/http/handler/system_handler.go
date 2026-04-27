package handler

import (
	"github.com/gin-gonic/gin"

	"github.com/kurniawa9157/template-base/internal/http/response"
	"github.com/kurniawa9157/template-base/internal/service/system"
)

type SystemHandler struct {
	svc *system.Service
}

func NewSystemHandler(svc *system.Service) *SystemHandler {
	return &SystemHandler{svc: svc}
}

// GET /api/v1/system/theme — public, dipakai frontend untuk hydrate brand
// theme sebelum login (landing page pun ikut tema global).
func (h *SystemHandler) GetTheme(c *gin.Context) {
	brand, err := h.svc.GetBrandTheme(c.Request.Context())
	if err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.OK(c, gin.H{"brand": brand})
}

type updateThemeReq struct {
	Brand string `json:"brand" binding:"required"`
}

// PUT /api/v1/admin/system/theme — admin only (SYSTEM_SETTINGS edit).
func (h *SystemHandler) UpdateTheme(c *gin.Context) {
	var req updateThemeReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, 400, "invalid_body", err.Error())
		return
	}
	if err := h.svc.SetBrandTheme(c.Request.Context(), req.Brand); err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.OK(c, gin.H{"brand": req.Brand})
}

// GET /api/v1/system/snapshot — public; brand_theme + app_name + maintenance
// status untuk hydrate global state frontend sebelum login.
func (h *SystemHandler) GetSnapshot(c *gin.Context) {
	snap, err := h.svc.PublicSnapshot(c.Request.Context())
	if err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.OK(c, snap)
}

// GET /api/v1/admin/system/settings — admin list semua settings.
func (h *SystemHandler) ListSettings(c *gin.Context) {
	list, err := h.svc.ListAll(c.Request.Context())
	if err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.OK(c, gin.H{"settings": list})
}

type bulkUpdateReq struct {
	Entries []system.BulkUpdateInput `json:"entries" binding:"required,min=1"`
}

// PUT /api/v1/admin/system/settings — bulk update multiple keys.
func (h *SystemHandler) BulkUpdateSettings(c *gin.Context) {
	var req bulkUpdateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, 400, "invalid_body", err.Error())
		return
	}
	if err := h.svc.BulkUpdate(c.Request.Context(), req.Entries); err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.OK(c, gin.H{"updated": len(req.Entries)})
}

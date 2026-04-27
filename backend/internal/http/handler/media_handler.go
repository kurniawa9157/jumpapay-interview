package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/kurniawa9157/template-base/internal/http/middleware"
	"github.com/kurniawa9157/template-base/internal/http/response"
	"github.com/kurniawa9157/template-base/internal/service/content"
)

type MediaHandler struct {
	svc *content.MediaService
}

func NewMediaHandler(svc *content.MediaService) *MediaHandler {
	return &MediaHandler{svc: svc}
}

// POST /admin/media/upload — multipart, field name 'file'.
func (h *MediaHandler) Upload(c *gin.Context) {
	fh, err := c.FormFile("file")
	if err != nil {
		response.Err(c, http.StatusBadRequest, "no_file", "form field 'file' wajib ada")
		return
	}
	uid, _ := middleware.GetUserID(c)
	m, err := h.svc.Upload(c.Request.Context(), fh, &uid)
	if err != nil {
		response.Err(c, http.StatusBadRequest, "upload_failed", err.Error())
		return
	}
	response.Created(c, m)
}

// GET /admin/media?limit=50&page=1
func (h *MediaHandler) List(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	items, total, err := h.svc.List(c.Request.Context(), limit, page)
	if err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.OK(c, gin.H{"media": items, "total": total, "page": page, "limit": limit})
}

// DELETE /admin/media/:id
func (h *MediaHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_id", "id tidak valid")
		return
	}
	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.NoContent(c)
}

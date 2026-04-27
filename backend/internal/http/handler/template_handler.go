package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/kurniawa9157/template-base/internal/domain"
	"github.com/kurniawa9157/template-base/internal/http/middleware"
	"github.com/kurniawa9157/template-base/internal/http/response"
	"github.com/kurniawa9157/template-base/internal/repository/postgres"
	"github.com/kurniawa9157/template-base/internal/service/content"
)

type TemplateHandler struct {
	svc *content.TemplateService
}

func NewTemplateHandler(svc *content.TemplateService) *TemplateHandler {
	return &TemplateHandler{svc: svc}
}

// GET /admin/templates?type_template=slider
func (h *TemplateHandler) List(c *gin.Context) {
	f := postgres.TemplateListFilter{
		TypeTemplate: c.Query("type_template"),
		OnlyActive:   c.Query("only_active") == "1",
	}
	items, err := h.svc.List(c.Request.Context(), f)
	if err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.OK(c, gin.H{"templates": items})
}

// GET /admin/templates/:id — return template + semua values.
func (h *TemplateHandler) Get(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_id", "id tidak valid")
		return
	}
	t, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.OK(c, t)
}

type createTemplateReq struct {
	Code         string `json:"code" binding:"required,min=1"`
	Name         string `json:"name" binding:"required,min=1"`
	TypeTemplate string `json:"type_template" binding:"required"`
	Slug         string `json:"slug"`
	IsActive     bool   `json:"is_active"`
}

// POST /admin/templates
func (h *TemplateHandler) Create(c *gin.Context) {
	var req createTemplateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	uid, _ := middleware.GetUserID(c)
	in := postgres.CreateTemplateInput{
		Code:         req.Code,
		Name:         req.Name,
		TypeTemplate: domain.TemplateType(req.TypeTemplate),
		IsActive:     req.IsActive,
		UpdatedByID:  &uid,
	}
	if req.Slug != "" {
		in.Slug = &req.Slug
	}
	id, err := h.svc.Create(c.Request.Context(), in)
	if err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.Created(c, gin.H{"id": id})
}

type updateTemplateReq struct {
	Name     string `json:"name" binding:"required,min=1"`
	Slug     string `json:"slug"`
	IsActive bool   `json:"is_active"`
}

// PATCH /admin/templates/:id
func (h *TemplateHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_id", "id tidak valid")
		return
	}
	var req updateTemplateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	uid, _ := middleware.GetUserID(c)
	in := postgres.UpdateTemplateInput{
		Name:        req.Name,
		IsActive:    req.IsActive,
		UpdatedByID: &uid,
	}
	if req.Slug != "" {
		in.Slug = &req.Slug
	}
	if err := h.svc.Update(c.Request.Context(), id, in); err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.NoContent(c)
}

// DELETE /admin/templates/:id
func (h *TemplateHandler) Delete(c *gin.Context) {
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

type setValueReq struct {
	Value string `json:"value"`
}

// PUT /admin/templates/:id/values/:key — upsert single value (mis. layout).
func (h *TemplateHandler) SetValue(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_id", "id tidak valid")
		return
	}
	key := c.Param("key")
	if key == "" {
		response.Err(c, http.StatusBadRequest, "invalid_key", "key wajib")
		return
	}
	var req setValueReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	if err := h.svc.SetValue(c.Request.Context(), id, key, req.Value); err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.OK(c, gin.H{"ok": true})
}

// POST /admin/templates/:id/items — append item baru.
func (h *TemplateHandler) AddItem(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_id", "id tidak valid")
		return
	}
	var req setValueReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	item, err := h.svc.AddItem(c.Request.Context(), id, req.Value)
	if err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.Created(c, item)
}

// PUT /admin/templates/:id/items/:itemId
func (h *TemplateHandler) UpdateItem(c *gin.Context) {
	itemID, err := strconv.ParseInt(c.Param("itemId"), 10, 64)
	if err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_id", "itemId tidak valid")
		return
	}
	var req setValueReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	if err := h.svc.UpdateItem(c.Request.Context(), itemID, req.Value); err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.NoContent(c)
}

// DELETE /admin/templates/:id/items/:itemId
func (h *TemplateHandler) DeleteItem(c *gin.Context) {
	itemID, err := strconv.ParseInt(c.Param("itemId"), 10, 64)
	if err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_id", "itemId tidak valid")
		return
	}
	if err := h.svc.DeleteItem(c.Request.Context(), itemID); err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.NoContent(c)
}

type reorderReq struct {
	IDs []int64 `json:"ids" binding:"required"`
}

// PUT /admin/templates/:id/items/reorder
func (h *TemplateHandler) ReorderItems(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_id", "id tidak valid")
		return
	}
	var req reorderReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	if err := h.svc.ReorderItems(c.Request.Context(), id, req.IDs); err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.NoContent(c)
}

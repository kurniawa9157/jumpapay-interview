package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/kurniawa9157/template-base/internal/domain"
	"github.com/kurniawa9157/template-base/internal/http/response"
	"github.com/kurniawa9157/template-base/internal/repository/postgres"
	"github.com/kurniawa9157/template-base/internal/service/content"
)

// PublicHandler — endpoint public (tanpa auth) untuk hydrate landing.
type PublicHandler struct {
	tplSvc  *content.TemplateService
	postSvc *content.PostService
}

func NewPublicHandler(tplSvc *content.TemplateService, postSvc *content.PostService) *PublicHandler {
	return &PublicHandler{tplSvc: tplSvc, postSvc: postSvc}
}

// GET /api/v1/public/template?slug=/
func (h *PublicHandler) GetTemplateBySlug(c *gin.Context) {
	slug := c.DefaultQuery("slug", "/")
	t, err := h.tplSvc.GetBySlug(c.Request.Context(), slug)
	if err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.OK(c, t)
}

// GET /api/v1/public/template/:id — generic, dipakai renderer untuk resolve
// referenced template (slider/menu/footer).
func (h *PublicHandler) GetTemplateByID(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_id", "id tidak valid")
		return
	}
	t, err := h.tplSvc.GetByID(c.Request.Context(), id)
	if err != nil {
		response.FromDomainError(c, err)
		return
	}
	if !t.IsActive {
		response.Err(c, http.StatusNotFound, "not_found", "template tidak aktif")
		return
	}
	response.OK(c, t)
}

// GET /api/v1/public/posts?type=post&limit=6
func (h *PublicHandler) ListPosts(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "6"))
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	items, total, err := h.postSvc.List(c.Request.Context(), postgres.PostListFilter{
		Type:   c.Query("type"),
		Status: string(domain.PostStatusPublished), // public hanya lihat published
		Limit:  limit,
		Page:   page,
	})
	if err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.OK(c, gin.H{"posts": items, "total": total, "page": page, "limit": limit})
}

// GET /api/v1/public/posts/:slug — detail post public.
func (h *PublicHandler) GetPost(c *gin.Context) {
	slug := c.Param("slug")
	p, err := h.postSvc.GetBySlug(c.Request.Context(), slug)
	if err != nil {
		response.FromDomainError(c, err)
		return
	}
	if p.Status != domain.PostStatusPublished {
		response.Err(c, http.StatusNotFound, "not_found", "post tidak tersedia")
		return
	}
	response.OK(c, p)
}

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

type PostHandler struct {
	svc *content.PostService
}

func NewPostHandler(svc *content.PostService) *PostHandler {
	return &PostHandler{svc: svc}
}

// GET /admin/posts?type=post&status=published&search=&page=1&limit=20
func (h *PostHandler) List(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	f := postgres.PostListFilter{
		Type:   c.Query("type"),
		Status: c.Query("status"),
		Search: c.Query("search"),
		Limit:  limit,
		Page:   page,
	}
	items, total, err := h.svc.List(c.Request.Context(), f)
	if err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.OK(c, gin.H{"posts": items, "total": total, "page": page, "limit": limit})
}

func (h *PostHandler) Get(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_id", "id tidak valid")
		return
	}
	p, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.OK(c, p)
}

type createPostReq struct {
	Slug       string  `json:"slug" binding:"required,min=1"`
	Title      string  `json:"title" binding:"required,min=1"`
	Excerpt    *string `json:"excerpt"`
	Content    *string `json:"content"`
	CoverImage *string `json:"cover_image"`
	Type       string  `json:"type" binding:"required"`
	Status     string  `json:"status" binding:"required"`
	Tags       *string `json:"tags"`
}

func (h *PostHandler) Create(c *gin.Context) {
	var req createPostReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	uid, _ := middleware.GetUserID(c)
	id, err := h.svc.Create(c.Request.Context(), postgres.CreatePostInput{
		Slug: req.Slug, Title: req.Title, Excerpt: req.Excerpt, Content: req.Content,
		CoverImage: req.CoverImage, Type: domain.PostType(req.Type),
		Status: domain.PostStatus(req.Status), Tags: req.Tags, AuthorID: &uid,
	})
	if err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.Created(c, gin.H{"id": id})
}

type updatePostReq struct {
	Slug       string  `json:"slug" binding:"required,min=1"`
	Title      string  `json:"title" binding:"required,min=1"`
	Excerpt    *string `json:"excerpt"`
	Content    *string `json:"content"`
	CoverImage *string `json:"cover_image"`
	Type       string  `json:"type" binding:"required"`
	Status     string  `json:"status" binding:"required"`
	Tags       *string `json:"tags"`
}

func (h *PostHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_id", "id tidak valid")
		return
	}
	var req updatePostReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	if err := h.svc.Update(c.Request.Context(), id, postgres.UpdatePostInput{
		Slug: req.Slug, Title: req.Title, Excerpt: req.Excerpt, Content: req.Content,
		CoverImage: req.CoverImage, Type: domain.PostType(req.Type),
		Status: domain.PostStatus(req.Status), Tags: req.Tags,
	}); err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.NoContent(c)
}

func (h *PostHandler) Delete(c *gin.Context) {
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

package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/kurniawa9157/template-base/internal/domain"
	"github.com/kurniawa9157/template-base/internal/http/middleware"
	"github.com/kurniawa9157/template-base/internal/http/response"
	"github.com/kurniawa9157/template-base/internal/service/user"
)

type UserHandler struct {
	svc *user.Service
}

func NewUserHandler(svc *user.Service) *UserHandler { return &UserHandler{svc: svc} }

// GET /admin/users?search=...&role=ROLE_PPAT&status=ACTIVE&page=1&limit=20
func (h *UserHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	in := user.ListInput{
		Search:     c.Query("search"),
		RoleCode:   c.Query("role"),
		StatusCode: domain.UserStatus(c.Query("status")),
		Page:       page,
		Limit:      limit,
	}
	result, err := h.svc.List(c.Request.Context(), in)
	if err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.OK(c, result)
}

// GET /admin/users/:id
func (h *UserHandler) Get(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_id", "ID user tidak valid.")
		return
	}
	dto, err := h.svc.Get(c.Request.Context(), id)
	if err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.OK(c, dto)
}

type createUserRequest struct {
	FirstName string  `json:"first_name" binding:"required,min=2"`
	MidName   *string `json:"mid_name"`
	LastName  *string `json:"last_name"`
	Email     string  `json:"email" binding:"required,email"`
	Password  string  `json:"password" binding:"required,min=8"`
	RoleCode  string  `json:"role_code" binding:"required"`
}

// POST /admin/users
func (h *UserHandler) Create(c *gin.Context) {
	var req createUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	actorID, _ := middleware.GetUserID(c)
	id, err := h.svc.Create(c.Request.Context(), user.CreateInput{
		FirstName: req.FirstName, MidName: req.MidName, LastName: req.LastName,
		Email: req.Email, Password: req.Password, RoleCode: req.RoleCode, CreatedBy: actorID,
	})
	if err != nil {
		response.Err(c, http.StatusBadRequest, "create_failed", err.Error())
		return
	}
	response.Created(c, gin.H{"id": id})
}

type updateUserRequest struct {
	FirstName  string  `json:"first_name" binding:"required,min=2"`
	MidName    *string `json:"mid_name"`
	LastName   *string `json:"last_name"`
	RoleCode   string  `json:"role_code"`
	StatusCode string  `json:"status_code" binding:"required,oneof=ACTIVE SUSPENDED INACTIVE"`
}

// PATCH /admin/users/:id
func (h *UserHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_id", "ID user tidak valid.")
		return
	}
	var req updateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	actorID, _ := middleware.GetUserID(c)
	err = h.svc.Update(c.Request.Context(), id, user.UpdateInput{
		FirstName:  req.FirstName,
		MidName:    req.MidName,
		LastName:   req.LastName,
		RoleCode:   req.RoleCode,
		StatusCode: domain.UserStatus(req.StatusCode),
		UpdatedBy:  actorID,
	})
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			response.FromDomainError(c, err)
			return
		}
		response.Err(c, http.StatusBadRequest, "update_failed", err.Error())
		return
	}
	response.NoContent(c)
}

// POST /admin/users/:id/suspend
func (h *UserHandler) Suspend(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_id", "ID user tidak valid.")
		return
	}
	actorID, _ := middleware.GetUserID(c)
	if err := h.svc.Suspend(c.Request.Context(), id, actorID); err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.NoContent(c)
}

// POST /admin/users/:id/reset-password
func (h *UserHandler) ResetPassword(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_id", "ID user tidak valid.")
		return
	}
	result, err := h.svc.ResetPassword(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			response.FromDomainError(c, err)
			return
		}
		response.Err(c, http.StatusBadRequest, "reset_failed", err.Error())
		return
	}
	response.OK(c, result)
}

// POST /admin/users/:id/activate
func (h *UserHandler) Activate(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_id", "ID user tidak valid.")
		return
	}
	actorID, _ := middleware.GetUserID(c)
	if err := h.svc.Activate(c.Request.Context(), id, actorID); err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.NoContent(c)
}

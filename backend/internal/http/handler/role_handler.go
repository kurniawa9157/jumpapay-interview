package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/kurniawa9157/template-base/internal/domain"
	"github.com/kurniawa9157/template-base/internal/http/response"
	"github.com/kurniawa9157/template-base/internal/repository/postgres"
	"github.com/kurniawa9157/template-base/internal/service/permission"
)

type RoleHandler struct {
	roles   *postgres.RoleRepo
	perms   *postgres.PermissionRepo
	checker *permission.Checker
}

func NewRoleHandler(roles *postgres.RoleRepo, perms *postgres.PermissionRepo, checker *permission.Checker) *RoleHandler {
	return &RoleHandler{roles: roles, perms: perms, checker: checker}
}

// GET /admin/roles
func (h *RoleHandler) List(c *gin.Context) {
	list, err := h.roles.List(c.Request.Context())
	if err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.OK(c, gin.H{"roles": list, "modules": domain.AllModules()})
}

type createRoleRequest struct {
	Code     string `json:"code" binding:"required,min=3"`
	Name     string `json:"name" binding:"required,min=2"`
	ParentID *int64 `json:"parent_id"`
	Level    int    `json:"level"`
}

// POST /admin/roles
func (h *RoleHandler) Create(c *gin.Context) {
	var req createRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	id, err := h.roles.Create(c.Request.Context(), postgres.CreateRoleInput{
		Code: req.Code, Name: req.Name, ParentID: req.ParentID, Level: req.Level,
	})
	if err != nil {
		response.Err(c, http.StatusBadRequest, "create_failed", err.Error())
		return
	}
	response.Created(c, gin.H{"id": id})
}

type updateRoleRequest struct {
	Name     string `json:"name" binding:"required,min=2"`
	ParentID *int64 `json:"parent_id"`
	Level    int    `json:"level"`
	IsActive bool   `json:"is_active"`
}

// PATCH /admin/roles/:id
func (h *RoleHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_id", "ID role tidak valid.")
		return
	}
	var req updateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	if err := h.roles.Update(c.Request.Context(), id, postgres.UpdateRoleInput{
		Name: req.Name, ParentID: req.ParentID, Level: req.Level, IsActive: req.IsActive,
	}); err != nil {
		response.FromDomainError(c, err)
		return
	}
	h.checker.InvalidateRole(c.Request.Context(), id)
	response.NoContent(c)
}

// DELETE /admin/roles/:id
func (h *RoleHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_id", "ID role tidak valid.")
		return
	}
	if err := h.roles.Delete(c.Request.Context(), id); err != nil {
		response.FromDomainError(c, err)
		return
	}
	h.checker.InvalidateRole(c.Request.Context(), id)
	response.NoContent(c)
}

// GET /admin/roles/:id/permissions — ambil matrix permission 1 role.
func (h *RoleHandler) GetPermissions(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_id", "ID role tidak valid.")
		return
	}
	perms, err := h.perms.ListByRole(c.Request.Context(), id)
	if err != nil {
		response.FromDomainError(c, err)
		return
	}
	response.OK(c, gin.H{
		"role_id":     id,
		"modules":     domain.AllModules(),
		"permissions": perms,
	})
}

type permissionEntry struct {
	ModuleCode string `json:"module_code" binding:"required"`
	CanView    bool   `json:"can_view"`
	CanCreate  bool   `json:"can_create"`
	CanEdit    bool   `json:"can_edit"`
	CanDelete  bool   `json:"can_delete"`
}

type putPermissionsRequest struct {
	Permissions []permissionEntry `json:"permissions" binding:"required,dive"`
}

// PUT /admin/roles/:id/permissions — bulk update matrix.
func (h *RoleHandler) SetPermissions(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_id", "ID role tidak valid.")
		return
	}
	var req putPermissionsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}

	// Validasi: module_code harus ada di daftar AllModules().
	valid := map[string]bool{}
	for _, m := range domain.AllModules() {
		valid[m] = true
	}
	perms := make([]domain.Permission, 0, len(req.Permissions))
	for _, p := range req.Permissions {
		if !valid[p.ModuleCode] {
			response.Err(c, http.StatusBadRequest, "invalid_module",
				"Module code tidak dikenal: "+p.ModuleCode)
			return
		}
		perms = append(perms, domain.Permission{
			RoleID:     id,
			ModuleCode: p.ModuleCode,
			CanView:    p.CanView,
			CanCreate:  p.CanCreate,
			CanEdit:    p.CanEdit,
			CanDelete:  p.CanDelete,
		})
	}

	if err := h.perms.BulkUpsert(c.Request.Context(), id, perms); err != nil {
		response.Err(c, http.StatusInternalServerError, "save_failed", err.Error())
		return
	}
	h.checker.InvalidateRole(c.Request.Context(), id)
	response.NoContent(c)
}

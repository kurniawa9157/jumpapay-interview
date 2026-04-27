package domain

// Action — jenis operasi yang dicek oleh permission checker.
type Action string

const (
	ActionView   Action = "view"
	ActionCreate Action = "create"
	ActionEdit   Action = "edit"
	ActionDelete Action = "delete"
)

// Module codes — single source of truth untuk RBAC matrix.
// Gunakan konstanta ini di handler dan middleware; jangan hardcode string.
//
// Foundation modules:
//   USER_MGMT, ROLE_MGMT, PERMISSION_MGMT, SYSTEM_SETTINGS, AUDIT_LOG
// Tambah module project-specific di sini sesuai kebutuhan.
const (
	ModuleUserMgmt       = "USER_MGMT"
	ModuleRoleMgmt       = "ROLE_MGMT"
	ModulePermissionMgmt = "PERMISSION_MGMT"
	ModuleSystemSettings = "SYSTEM_SETTINGS"
	ModuleAuditLog       = "AUDIT_LOG"
	// CONTENT_MGMT meliputi templates (page/slider/menu/footer), posts, dan media.
	// Granular split (TEMPLATE/POST/MEDIA) bisa di-add nanti kalau perlu.
	ModuleContentMgmt = "CONTENT_MGMT"
)

// AllModules adalah daftar semua module code yang valid.
// Dipakai untuk validasi input & generate UI matrix permission.
func AllModules() []string {
	return []string{
		ModuleUserMgmt,
		ModuleRoleMgmt,
		ModulePermissionMgmt,
		ModuleSystemSettings,
		ModuleAuditLog,
		ModuleContentMgmt,
	}
}

// Permission — satu baris tr_permissions (role × module × CRUD flags).
type Permission struct {
	ID         int64  `json:"id"`
	RoleID     int64  `json:"role_id"`
	ModuleCode string `json:"module_code"`
	CanView    bool   `json:"can_view"`
	CanCreate  bool   `json:"can_create"`
	CanEdit    bool   `json:"can_edit"`
	CanDelete  bool   `json:"can_delete"`
}

// Allow mengembalikan true kalau permission memberi akses untuk action tertentu.
func (p Permission) Allow(action Action) bool {
	switch action {
	case ActionView:
		return p.CanView
	case ActionCreate:
		return p.CanCreate
	case ActionEdit:
		return p.CanEdit
	case ActionDelete:
		return p.CanDelete
	}
	return false
}

// PermissionMap — representasi ringan untuk dikirim ke client:
// key = module code, value = map action→bool.
type PermissionMap map[string]map[Action]bool

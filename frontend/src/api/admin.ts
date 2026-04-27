import { request } from "./client";

const qs = (params?: Record<string, unknown>) => {
  if (!params) return "";
  const pairs: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") pairs.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return pairs.length ? `?${pairs.join("&")}` : "";
};

// ============================================================
// Admin — User / Role / Permission management
// ============================================================

export type BackendUserStatus = "ACTIVE" | "SUSPENDED" | "INACTIVE";

export interface BackendUserDTO {
  id: number;
  code: string;
  full_name: string;
  first_name: string;
  mid_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  role_id?: number | null;
  role_code?: string | null;
  role_name?: string | null;
  status_code: BackendUserStatus;
  last_login_at?: string | null;
  created_at: string;
}

export interface BackendListUsersResponse {
  users: BackendUserDTO[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminListUsersParams {
  search?: string;
  role?: string;
  status?: BackendUserStatus;
  page?: number;
  limit?: number;
}

export const adminListUsers = (params?: AdminListUsersParams): Promise<BackendListUsersResponse> =>
  request<BackendListUsersResponse>(`/admin/users${qs(params as Record<string, unknown> | undefined)}`);

export const adminGetUser = (id: number): Promise<BackendUserDTO> =>
  request<BackendUserDTO>(`/admin/users/${id}`);

export interface AdminCreateUserInput {
  first_name: string;
  mid_name?: string | null;
  last_name?: string | null;
  email: string;
  password: string;
  role_code: string;
}

export const adminCreateUser = (input: AdminCreateUserInput): Promise<{ id: number }> =>
  request<{ id: number }>("/admin/users", { method: "POST", body: input });

export interface AdminUpdateUserInput {
  first_name: string;
  mid_name?: string | null;
  last_name?: string | null;
  role_code?: string;
  status_code: BackendUserStatus;
}

export const adminUpdateUser = (id: number, patch: AdminUpdateUserInput): Promise<void> =>
  request<void>(`/admin/users/${id}`, { method: "PATCH", body: patch });

export const adminSuspendUser = (id: number): Promise<void> =>
  request<void>(`/admin/users/${id}/suspend`, { method: "POST" });

export const adminActivateUser = (id: number): Promise<void> =>
  request<void>(`/admin/users/${id}/activate`, { method: "POST" });

export interface AdminResetPasswordResponse {
  temp_password: string;
  reset_at: string;
}

export const adminResetPassword = (id: number): Promise<AdminResetPasswordResponse> =>
  request<AdminResetPasswordResponse>(`/admin/users/${id}/reset-password`, { method: "POST" });

// --- Roles ---

export interface AdminRoleDTO {
  id: number;
  code: string;
  name: string;
  parent_id?: number | null;
  level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminListRolesResponse {
  roles: AdminRoleDTO[];
  modules: string[];
}

export const adminListRoles = (): Promise<AdminListRolesResponse> =>
  request<AdminListRolesResponse>("/admin/roles");

export interface AdminCreateRoleInput {
  code: string;
  name: string;
  parent_id?: number | null;
  level: number;
}

export const adminCreateRole = (input: AdminCreateRoleInput): Promise<{ id: number }> =>
  request<{ id: number }>("/admin/roles", { method: "POST", body: input });

export interface AdminUpdateRoleInput {
  name: string;
  parent_id?: number | null;
  level: number;
  is_active: boolean;
}

export const adminUpdateRole = (id: number, patch: AdminUpdateRoleInput): Promise<void> =>
  request<void>(`/admin/roles/${id}`, { method: "PATCH", body: patch });

export const adminDeleteRole = (id: number): Promise<void> =>
  request<void>(`/admin/roles/${id}`, { method: "DELETE" });

// --- Role permissions ---

export interface AdminPermissionDTO {
  id: number;
  role_id: number;
  module_code: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface AdminGetRolePermissionsResponse {
  role_id: number;
  modules: string[];
  permissions: AdminPermissionDTO[];
}

export const adminGetRolePermissions = (roleId: number): Promise<AdminGetRolePermissionsResponse> =>
  request<AdminGetRolePermissionsResponse>(`/admin/roles/${roleId}/permissions`);

export interface AdminPermissionEntry {
  module_code: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export const adminSetRolePermissions = (roleId: number, permissions: AdminPermissionEntry[]): Promise<void> =>
  request<void>(`/admin/roles/${roleId}/permissions`, {
    method: "PUT",
    body: { permissions },
  });

// --- Stats ---

export interface AdminStatsResponse {
  totalUsers: number;
  activeUsers: number;
  recentActivity: Array<{
    id: number;
    actor: string;
    action: string;
    target: string;
    at: string;
  }>;
}

export const getAdminStats = (): Promise<AdminStatsResponse> =>
  request<AdminStatsResponse>("/admin/stats");

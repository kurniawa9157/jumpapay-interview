// Auth + RBAC core types — dipakai oleh login flow, /auth/me, dan permission
// gating di frontend. Tambah type project-specific di file API masing-masing
// (mis. src/api/admin.ts untuk DTO admin, atau buat file baru per domain).

export interface AuthUserDTO {
  id: number;
  code: string;
  first_name: string;
  mid_name?: string | null;
  last_name?: string | null;
  is_admin: boolean;
  role_id?: number | null;
  status_code: string;
  google2fa_enabled: boolean;
  last_login_at?: string | null;
}

export interface AuthRoleDTO {
  id: number;
  code: string;
  name: string;
}

export type AuthPermissionMap = Record<string, Record<"view" | "create" | "edit" | "delete", boolean>>;

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface GoogleLoginRequest {
  id_token: string;
}

export interface LoginResponse {
  status: "ok" | "requires_2fa";
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  pending_2fa_token?: string;
  user?: AuthUserDTO;
  role?: AuthRoleDTO | null;
  permissions?: AuthPermissionMap;
}

export interface MeResponse {
  user: AuthUserDTO;
  role?: AuthRoleDTO | null;
  permissions: AuthPermissionMap;
}

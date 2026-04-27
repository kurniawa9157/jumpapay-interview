import { request } from "./client";

export interface AccountProfileDTO {
  id: number;
  code: string;
  first_name: string;
  mid_name?: string | null;
  last_name?: string | null;
  email: string;
  phone: string;
  role_code?: string | null;
  role_name?: string | null;
  is_admin: boolean;
  status_code: string;
  two_factor_enabled: boolean;
  last_login_at?: string | null;
  created_at: string;
}

export interface AccountSessionDTO {
  id: number;
  device_info?: string | null;
  ip_address?: string | null;
  issued_at: string;
  expires_at: string;
  is_current: boolean;
}

export const getMyProfile = (): Promise<AccountProfileDTO> =>
  request<AccountProfileDTO>("/me/profile");

export interface UpdateMyProfileInput {
  first_name: string;
  mid_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
}

export const updateMyProfile = (input: UpdateMyProfileInput): Promise<AccountProfileDTO> =>
  request<AccountProfileDTO>("/me/profile", { method: "PATCH", body: input });

export interface ChangePasswordInput {
  current_password: string;
  new_password: string;
  keep_refresh_token?: string;
}

export const changeMyPassword = (input: ChangePasswordInput): Promise<void> =>
  request<void>("/me/password", { method: "POST", body: input });

// sha256 hex — untuk tandai session yang sedang aktif.
export const sha256Hex = async (raw: string): Promise<string> => {
  const buf = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export const listMySessions = async (currentRefresh?: string): Promise<AccountSessionDTO[]> => {
  const q = currentRefresh ? `?current=${await sha256Hex(currentRefresh)}` : "";
  const res = await request<{ sessions: AccountSessionDTO[] }>(`/me/sessions${q}`);
  return res.sessions;
};

export const revokeMySession = (id: number): Promise<void> =>
  request<void>(`/me/sessions/${id}`, { method: "DELETE" });

export const revokeOtherSessions = (keepRefresh: string): Promise<void> =>
  request<void>("/me/sessions/revoke-others", {
    method: "POST",
    body: { keep_refresh_token: keepRefresh },
  });

// --- 2FA TOTP ---

export interface TwoFactorSetupDTO {
  secret: string;       // base32 — bisa di-paste manual di authenticator app
  otpauth_url: string;  // otpauth://... — untuk QR di client lain
  qr_png_b64: string;   // data URI (data:image/png;base64,...) — pakai di <img src>
}

export const setupMy2FA = (): Promise<TwoFactorSetupDTO> =>
  request<TwoFactorSetupDTO>("/me/2fa/setup", { method: "POST", body: {} });

export const confirmMy2FA = (code: string): Promise<{ two_factor_enabled: true }> =>
  request<{ two_factor_enabled: true }>("/me/2fa/confirm", {
    method: "POST",
    body: { code },
  });

export const disableMy2FA = (currentPassword: string): Promise<{ two_factor_enabled: false }> =>
  request<{ two_factor_enabled: false }>("/me/2fa/disable", {
    method: "POST",
    body: { current_password: currentPassword },
  });

import { request, tokenStore, ApiError } from "./client";
import type { GoogleLoginRequest, LoginRequest, LoginResponse, MeResponse } from "./types";

// login — panggil POST /auth/login, simpan tokens ke localStorage kalau status=ok.
export const login = async (req: LoginRequest): Promise<LoginResponse> => {
  const res = await request<LoginResponse>("/auth/login", {
    method: "POST",
    body: req,
    skipAuth: true,
  });
  if (res.status === "ok" && res.access_token && res.refresh_token) {
    tokenStore.set(res.access_token, res.refresh_token);
  }
  return res;
};

export const loginWithGoogle = async (req: GoogleLoginRequest): Promise<LoginResponse> => {
  const res = await request<LoginResponse>("/auth/google", {
    method: "POST",
    body: req,
    skipAuth: true,
  });
  if (res.status === "ok" && res.access_token && res.refresh_token) {
    tokenStore.set(res.access_token, res.refresh_token);
  }
  return res;
};

// me — ambil user yang sedang login (hydrate session setelah refresh halaman).
export const me = (): Promise<MeResponse> => request<MeResponse>("/auth/me");

// verify2FA — step ke-2 login untuk user ber-2FA. Pending token didapat
// dari login() saat status='requires_2fa'. Setelah verify sukses, simpan
// access+refresh token seperti login normal.
export const verify2FA = async (pendingToken: string, code: string): Promise<LoginResponse> => {
  const res = await request<LoginResponse>("/auth/2fa/verify", {
    method: "POST",
    body: { pending_2fa_token: pendingToken, code },
    skipAuth: true,
  });
  if (res.status === "ok" && res.access_token && res.refresh_token) {
    tokenStore.set(res.access_token, res.refresh_token);
  }
  return res;
};

// logout — call backend + clear token lokal. Selalu clear meski backend error.
export const logout = async (): Promise<void> => {
  const refresh = tokenStore.getRefresh();
  try {
    await request("/auth/logout", {
      method: "POST",
      body: refresh ? { refresh_token: refresh } : undefined,
    });
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) {
      // Log saja; tetap lanjut clear.
      console.warn("logout gagal di server", err);
    }
  }
  tokenStore.clear();
};

// isAuthenticated — helper sederhana.
export const isAuthenticated = (): boolean => tokenStore.getAccess() !== null;

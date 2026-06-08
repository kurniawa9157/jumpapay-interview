const DEFAULT_BASE_URL = "/api/v1";
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

export const baseUrl = env.VITE_API_BASE_URL || DEFAULT_BASE_URL;
export const useMockApi = (env.VITE_USE_MOCK_API ?? "true") !== "false";

// --- Token storage (localStorage) ---

const ACCESS_KEY = "jumpapay-access-token";
const REFRESH_KEY = "jumpapay-refresh-token";

export const tokenStore = {
  getAccess: (): string | null => {
    try { return localStorage.getItem(ACCESS_KEY); } catch { return null; }
  },
  getRefresh: (): string | null => {
    try { return localStorage.getItem(REFRESH_KEY); } catch { return null; }
  },
  set: (access: string, refresh: string) => {
    try {
      localStorage.setItem(ACCESS_KEY, access);
      localStorage.setItem(REFRESH_KEY, refresh);
    } catch { /* ignore */ }
  },
  clear: () => {
    try {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
    } catch { /* ignore */ }
  },
};

// --- Error ---

export class ApiError extends Error {
  code: string;
  status: number;
  fieldErrors?: Record<string, string>;

  constructor(code: string, message: string, status: number, fieldErrors?: Record<string, string>) {
    super(message);
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

// --- Auth event — dipancarkan saat refresh token gagal / user di-force-logout ---

type AuthListener = () => void;
let authListeners: AuthListener[] = [];

export const onAuthExpired = (cb: AuthListener): (() => void) => {
  authListeners.push(cb);
  return () => {
    authListeners = authListeners.filter((l) => l !== cb);
  };
};

const emitAuthExpired = () => {
  tokenStore.clear();
  authListeners.forEach((l) => {
    try { l(); } catch { /* swallow */ }
  });
};

// --- Request ---

type FetchOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /** Set true untuk skip auto Bearer header (dipakai endpoint /auth/login & /auth/refresh). */
  skipAuth?: boolean;
  /** Internal: mencegah refresh loop. */
  _retried?: boolean;
};

const isFormData = (v: unknown): v is FormData => typeof FormData !== "undefined" && v instanceof FormData;

const doFetch = async <T>(path: string, opts: FetchOptions): Promise<T> => {
  const url = path.startsWith("http") ? path : `${baseUrl}${path}`;
  const headers: Record<string, string> = { Accept: "application/json", ...opts.headers };

  if (!opts.skipAuth) {
    const token = tokenStore.getAccess();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    if (isFormData(opts.body)) {
      body = opts.body;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(opts.body);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, { method: opts.method || "GET", headers, body, signal: opts.signal });
  } catch {
    throw new ApiError("network_error", "Tidak dapat terhubung ke server. Periksa koneksi Anda.", 0);
  }

  const contentType = response.headers.get("content-type") || "";
  const payload: unknown = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!response.ok) {
    const errPayload = (payload && typeof payload === "object" ? payload : {}) as {
      error?: string; message?: string; details?: Record<string, string>;
    };
    throw new ApiError(
      errPayload.error || "request_failed",
      errPayload.message || `Permintaan gagal (${response.status})`,
      response.status,
      errPayload.details,
    );
  }

  return payload as T;
};

// Refresh in-flight deduplication — jangan spam /auth/refresh jika banyak request paralel gagal 401.
let refreshingPromise: Promise<boolean> | null = null;

const tryRefresh = async (): Promise<boolean> => {
  if (refreshingPromise) return refreshingPromise;
  refreshingPromise = (async () => {
    const refresh = tokenStore.getRefresh();
    if (!refresh) return false;
    try {
      const res = await doFetch<{ access_token: string; refresh_token: string }>(
        "/auth/refresh",
        { method: "POST", body: { refresh_token: refresh }, skipAuth: true },
      );
      tokenStore.set(res.access_token, res.refresh_token);
      return true;
    } catch {
      return false;
    } finally {
      refreshingPromise = null;
    }
  })();
  return refreshingPromise;
};

export const request = async <T>(path: string, opts: FetchOptions = {}): Promise<T> => {
  try {
    return await doFetch<T>(path, opts);
  } catch (err) {
    if (
      err instanceof ApiError &&
      err.status === 401 &&
      !opts.skipAuth &&
      !opts._retried &&
      tokenStore.getRefresh()
    ) {
      const ok = await tryRefresh();
      if (ok) {
        return doFetch<T>(path, { ...opts, _retried: true });
      }
      emitAuthExpired();
    }
    throw err;
  }
};

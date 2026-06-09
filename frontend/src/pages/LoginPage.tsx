import React, { useEffect, useRef, useState } from "react";
import { useAppearance } from "../appearance";
import { Icon } from "../components/Icon";
import { Field, TextInput } from "../components/formKit";
import { ApiError, authApi } from "../api";
import type { MeResponse } from "../api";
import { DEFAULT_APPEARANCE_TEMPLATE } from "../types/appearance.types";

interface Props {
  onBack: () => void;
  onSuccess: (me: MeResponse) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              type?: "standard" | "icon";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              width?: number;
            },
          ) => void;
        };
      };
    };
  }
}

// Cek apakah response /me punya akses minimal. Super admin bypass; user lain
// butuh paling tidak satu permission true di module manapun.
const hasAnyAccess = (me: MeResponse): boolean => {
  if (me.user.is_admin) return true;
  const perms = me.permissions || {};
  for (const actions of Object.values(perms)) {
    if (!actions) continue;
    for (const allowed of Object.values(actions)) {
      if (allowed) return true;
    }
  }
  return false;
};

type Step =
  | { kind: "credentials" }
  | { kind: "2fa"; pendingToken: string; identifier: string };

const hexToRgba = (hex: string, alpha: number): string => {
  const clean = hex.replace("#", "");
  const normalized =
    clean.length === 3
      ? clean.split("").map((char) => char + char).join("")
      : clean;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const LoginPage: React.FC<Props> = ({ onBack, onSuccess }) => {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
  const googleClientId = env.VITE_GOOGLE_CLIENT_ID || "";
  const appearance = useAppearance();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [step, setStep] = useState<Step>({ kind: "credentials" });
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dipakai oleh kedua step — setelah dapat token, cek akses + panggil onSuccess.
  const finishLogin = async (requireAdminAccess = true) => {
    const me = await authApi.me();
    if (requireAdminAccess && !hasAnyAccess(me)) {
      await authApi.logout();
      setError(
        "Akun Anda belum memiliki hak akses. Hubungi administrator untuk menetapkan peran " +
          "atau izin pada akun ini.",
      );
      return;
    }
    onSuccess(me);
  };

  const handleGoogleToken = async (idToken: string, allowCustomer = true) => {
    setGoogleSubmitting(true);
    setError(null);
    try {
      await authApi.loginWithGoogle({ id_token: idToken });
      await finishLogin(!allowCustomer);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login Google gagal. Silakan coba lagi.");
    } finally {
      setGoogleSubmitting(false);
    }
  };

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current || step.kind !== "credentials") return;
    let cancelled = false;
    const renderGoogleButton = () => {
      if (cancelled || !window.google || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          if (response.credential) {
            void handleGoogleToken(response.credential);
          } else {
            setError("Google tidak mengirim credential. Coba lagi.");
          }
        },
      });
      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        type: "standard",
        text: "continue_with",
        shape: "rectangular",
        width: 360,
      });
      setGoogleReady(true);
    };

    if (window.google) {
      renderGoogleButton();
      return () => {
        cancelled = true;
      };
    }

    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", renderGoogleButton, { once: true });
      return () => {
        cancelled = true;
        existing.removeEventListener("load", renderGoogleButton);
      };
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", renderGoogleButton, { once: true });
    script.addEventListener("error", () => {
      if (!cancelled) setError("Script Google Sign-In gagal dimuat.");
    });
    document.head.appendChild(script);
    return () => {
      cancelled = true;
      script.removeEventListener("load", renderGoogleButton);
    };
  }, [googleClientId, step.kind]);

  const handleDemoGoogle = () => {
    void handleGoogleToken("demo:demo.customer@jumpapay.local:Demo Customer");
  };

  const handleSubmitCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Email dan kata sandi wajib diisi.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await authApi.login({ identifier: identifier.trim(), password });
      if (res.status === "requires_2fa") {
        if (!res.pending_2fa_token) {
          setError("Server tidak mengirim token 2FA. Hubungi administrator.");
          return;
        }
        // Pindah ke step 2FA. Clear password dari state.
        setStep({ kind: "2fa", pendingToken: res.pending_2fa_token, identifier: identifier.trim() });
        setPassword("");
        setCode("");
        return;
      }
      await finishLogin();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan tidak terduga. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step.kind !== "2fa") return;
    if (!/^\d{6}$/.test(code)) {
      setError("Masukkan 6 digit angka dari aplikasi authenticator.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await authApi.verify2FA(step.pendingToken, code);
      if (res.status !== "ok") {
        setError("Verifikasi gagal. Coba lagi.");
        return;
      }
      await finishLogin();
    } catch (err) {
      if (err instanceof ApiError) {
        // Kalau pending token expired (> 5 menit) → back ke step credentials.
        if (err.code === "invalid_token") {
          setError("Sesi login 2FA kedaluwarsa. Silakan login ulang.");
          setStep({ kind: "credentials" });
          return;
        }
        setError(err.message);
      } else {
        setError("Terjadi kesalahan tidak terduga. Silakan coba lagi.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel2FA = () => {
    setStep({ kind: "credentials" });
    setCode("");
    setError(null);
  };

  const logoSrc = appearance.assets.logo_url || appearance.assets.logo_mark_url;
  const loginBg = appearance.assets.login_background_url;
  const loginSettings = appearance.components.login || DEFAULT_APPEARANCE_TEMPLATE.components.login;
  const isSplit = loginSettings.layout !== "center";
  const showBrandPanel = isSplit && step.kind === "credentials";
  const buttonBackground = loginSettings.button_background || "var(--ina-brand-primary, #0f1e3d)";
  const bgOverlay =
    loginSettings.background_overlay === "dark"
      ? "linear-gradient(rgba(15,30,61,0.62), rgba(15,30,61,0.7))"
      : loginSettings.background_overlay === "none"
      ? ""
      : "linear-gradient(rgba(255,255,255,0.74), rgba(255,255,255,0.82))";
  const backgroundImage = loginBg
    ? `${bgOverlay ? `${bgOverlay}, ` : ""}url(${loginBg})`
    : undefined;
  const backgroundSize = loginSettings.background_fit === "repeat" ? "auto" : loginSettings.background_fit;
  const backgroundRepeat = loginSettings.background_fit === "repeat" ? "repeat" : "no-repeat";
  const cardClass =
    loginSettings.card_variant === "glass"
      ? "rounded-[28px] border border-white/60 p-8 shadow-[0_24px_60px_rgba(15,30,61,0.12)] backdrop-blur-xl"
      : "rounded-[28px] border border-line-cream p-8 shadow-[0_24px_60px_rgba(15,30,61,0.08)]";

  const formPanel = (
    <div className="w-full max-w-[420px]">
      <button
        type="button"
        onClick={step.kind === "2fa" ? handleCancel2FA : onBack}
        className="mb-6 inline-flex items-center gap-2 text-[12px] font-semibold text-ink-tertiary hover:text-brand-deep"
      >
        <Icon name="chevronLeft" size={14} />
        {step.kind === "2fa" ? "Kembali ke login" : "Kembali ke beranda"}
      </button>

      <div
        className={cardClass}
        style={{
          backgroundColor:
            loginSettings.card_variant === "glass"
              ? hexToRgba(loginSettings.card_background, 0.82)
              : loginSettings.card_background,
        }}
      >
        <div className="flex items-center gap-3">
          {loginSettings.show_logo && (
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-brand-deep text-white">
              {logoSrc && step.kind === "credentials" ? (
                <img src={logoSrc} alt="" className="h-full w-full object-contain p-1.5" />
              ) : (
                <Icon name={step.kind === "2fa" ? "shield" : "building"} size={20} />
              )}
            </div>
          )}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
              {step.kind === "2fa" ? "Verifikasi 2 faktor" : loginSettings.eyebrow}
            </div>
            <div className="font-serif text-[1.3rem] tracking-[-0.02em] text-brand">
              {step.kind === "2fa" ? "Masukkan kode" : loginSettings.title}
            </div>
          </div>
        </div>

        {step.kind === "credentials" ? (
          <>
            <p className="mt-4 text-[13px] leading-6 text-ink-soft">
              {loginSettings.description}
            </p>

            <form onSubmit={handleSubmitCredentials} className="mt-6 space-y-4">
              <div className="space-y-3">
                {googleClientId ? (
                  <div
                    className={googleReady ? "" : "flex h-11 items-center justify-center rounded-md border border-line-sand bg-white text-[12px] text-ink-muted"}
                    ref={googleButtonRef}
                  >
                    {!googleReady && "Memuat Google Sign-In..."}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleDemoGoogle}
                    disabled={googleSubmitting || submitting}
                    className="inline-flex w-full items-center justify-center gap-3 rounded-md border border-line-sand bg-white px-4 py-3 text-[13px] font-semibold text-ink transition hover:border-brand/40 hover:bg-paper-cream/60 disabled:opacity-60"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-line-sand text-[12px] font-bold text-brand">
                      G
                    </span>
                    {googleSubmitting ? "Memproses Google..." : "Masuk dengan Google Demo"}
                  </button>
                )}
                <div className="flex items-center gap-3 text-[11px] font-semibold uppercase text-ink-muted">
                  <span className="h-px flex-1 bg-line-sand" />
                  atau admin
                  <span className="h-px flex-1 bg-line-sand" />
                </div>
              </div>

              <Field label="Email" required>
                <TextInput
                  type="email"
                  value={identifier}
                  onChange={setIdentifier}
                  placeholder="nama@contoh.id"
                />
              </Field>
              <Field label="Kata Sandi" required>
                <TextInput
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="Masukkan kata sandi"
                />
              </Field>

              {error && (
                <div className="rounded-md border border-status-dangerBorder bg-status-dangerBg px-3 py-2 text-[12px] text-status-dangerFg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-deep px-4 py-3 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                style={{
                  background: buttonBackground,
                  color: loginSettings.button_text,
                }}
              >
                {submitting ? (
                  <>
                    <Icon name="spinner" size={14} className="animate-spin" /> Memverifikasi…
                  </>
                ) : (
                  <>
                    {loginSettings.button_label} <Icon name="arrowRight" size={14} />
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="mt-4 text-[13px] leading-6 text-ink-soft">
              Login untuk <strong className="text-brand">{step.identifier}</strong> memerlukan
              verifikasi 2 faktor. Buka aplikasi authenticator Anda (Google Authenticator, Authy,
              dll) dan masukkan kode 6 digit yang sedang aktif.
            </p>

            <form onSubmit={handleSubmit2FA} className="mt-6 space-y-4">
              <Field label="Kode 6 digit" required>
                <TextInput
                  value={code}
                  onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                />
              </Field>

              {error && (
                <div className="rounded-md border border-status-dangerBorder bg-status-dangerBg px-3 py-2 text-[12px] text-status-dangerFg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || code.length !== 6}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-deep px-4 py-3 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                style={{
                  background: buttonBackground,
                  color: loginSettings.button_text,
                }}
              >
                {submitting ? (
                  <>
                    <Icon name="spinner" size={14} className="animate-spin" /> Memverifikasi…
                  </>
                ) : (
                  <>
                    Verifikasi <Icon name="arrowRight" size={14} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 rounded-md border border-status-infoBorder bg-status-infoBg px-3 py-2 text-[11px] text-status-infoFg">
              Kehilangan akses ke authenticator? Hubungi administrator untuk me-reset 2FA akun Anda.
            </div>
          </>
        )}

        <div className="mt-6 border-t border-line-sand pt-4 text-center text-[11px] text-ink-muted">
          Dengan masuk, Anda menyetujui ketentuan penggunaan layanan ini.
        </div>
      </div>
    </div>
  );

  const brandPanel = showBrandPanel ? (
    <div className="hidden min-h-[620px] overflow-hidden rounded-[32px] bg-brand-deep text-white shadow-[0_26px_70px_rgba(15,30,61,0.16)] lg:block">
      <div
        className="flex h-full flex-col justify-end p-10"
        style={
          loginBg
            ? {
                backgroundImage: `linear-gradient(rgba(15,30,61,0.18), rgba(15,30,61,0.76)), url(${loginBg})`,
                backgroundSize,
                backgroundRepeat,
                backgroundPosition: loginSettings.background_position,
              }
            : undefined
        }
      >
        {logoSrc && loginSettings.show_logo && (
          <img src={logoSrc} alt="" className="mb-auto max-h-14 max-w-[220px] object-contain brightness-0 invert" />
        )}
        <div className="max-w-[440px]">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">
            {loginSettings.eyebrow}
          </div>
          <h1 className="mt-3 font-serif text-[2.5rem] leading-tight tracking-[-0.02em]">
            {loginSettings.title}
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-white/82">
            {loginSettings.description}
          </p>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#f6f2e9_0%,#fffdf8_50%,#eef3fb_100%)] bg-cover bg-center px-4 py-10"
      style={
        backgroundImage
          ? {
              backgroundImage,
              backgroundSize,
              backgroundRepeat,
              backgroundPosition: loginSettings.background_position,
            }
          : undefined
      }
    >
      <div className={isSplit ? "grid w-full max-w-[1120px] items-center gap-8 lg:grid-cols-2" : "w-full max-w-[420px]"}>
        {loginSettings.layout === "split_left" && brandPanel}
        <div className={isSplit ? "flex justify-center" : ""}>{formPanel}</div>
        {loginSettings.layout === "split_right" && brandPanel}
      </div>
    </div>
  );
};

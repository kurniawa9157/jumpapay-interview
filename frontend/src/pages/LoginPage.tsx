import React, { useState } from "react";
import { Icon } from "../components/Icon";
import { Field, TextInput } from "../components/formKit";
import { ApiError, authApi } from "../api";
import type { MeResponse } from "../api";

interface Props {
  onBack: () => void;
  onSuccess: (me: MeResponse) => void;
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

export const LoginPage: React.FC<Props> = ({ onBack, onSuccess }) => {
  const [step, setStep] = useState<Step>({ kind: "credentials" });
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dipakai oleh kedua step — setelah dapat token, cek akses + panggil onSuccess.
  const finishLogin = async () => {
    const me = await authApi.me();
    if (!hasAnyAccess(me)) {
      await authApi.logout();
      setError(
        "Akun Anda belum memiliki hak akses. Hubungi administrator untuk menetapkan peran " +
          "atau izin pada akun ini.",
      );
      return;
    }
    onSuccess(me);
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

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f6f2e9_0%,#fffdf8_50%,#eef3fb_100%)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px]">
        <button
          type="button"
          onClick={step.kind === "2fa" ? handleCancel2FA : onBack}
          className="mb-6 inline-flex items-center gap-2 text-[12px] font-semibold text-ink-tertiary hover:text-brand-deep"
        >
          <Icon name="chevronLeft" size={14} />
          {step.kind === "2fa" ? "Kembali ke login" : "Kembali ke beranda"}
        </button>

        <div className="rounded-[28px] border border-line-cream bg-white p-8 shadow-[0_24px_60px_rgba(15,30,61,0.08)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-deep text-white">
              <Icon name={step.kind === "2fa" ? "shield" : "building"} size={20} />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                {step.kind === "2fa" ? "Verifikasi 2 faktor" : "Portal aplikasi"}
              </div>
              <div className="font-serif text-[1.3rem] tracking-[-0.02em] text-brand">
                {step.kind === "2fa" ? "Masukkan kode" : "Masuk"}
              </div>
            </div>
          </div>

          {step.kind === "credentials" ? (
            <>
              <p className="mt-4 text-[13px] leading-6 text-ink-soft">
                Gunakan akun yang telah diaktivasi oleh administrator. Hubungi admin
                kalau belum punya akses.
              </p>

              <form onSubmit={handleSubmitCredentials} className="mt-6 space-y-4">
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
                >
                  {submitting ? (
                    <>
                      <Icon name="spinner" size={14} className="animate-spin" /> Memverifikasi…
                    </>
                  ) : (
                    <>
                      Masuk <Icon name="arrowRight" size={14} />
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
    </div>
  );
};

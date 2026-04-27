import React, { useState } from "react";
import { Button } from "@idds/react";
import { Icon } from "../../components/Icon";
import { Field, TextInput } from "../../components/formKit";
import { Badge } from "../../components/data/Badge";
import {
  ApiError,
  setupMy2FA,
  confirmMy2FA,
  disableMy2FA,
} from "../../api";
import type { TwoFactorSetupDTO } from "../../api";

interface Props {
  enabled: boolean;
  onChanged: () => void; // dipanggil setelah enable/disable berhasil (parent reload profile)
}

type Mode =
  | { kind: "idle" }
  | { kind: "setup"; data: TwoFactorSetupDTO; code: string }
  | { kind: "disable"; password: string };

export const Account2FA: React.FC<Props> = ({ enabled, onChanged }) => {
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleStartSetup = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const data = await setupMy2FA();
      setMode({ kind: "setup", data, code: "" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memulai setup 2FA.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmSetup = async () => {
    if (mode.kind !== "setup") return;
    if (!/^\d{6}$/.test(mode.code)) {
      setError("Masukkan 6 digit angka dari aplikasi authenticator.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await confirmMy2FA(mode.code);
      setMode({ kind: "idle" });
      showToast("2FA berhasil diaktifkan.");
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kode tidak valid. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisable = async () => {
    if (mode.kind !== "disable") return;
    if (!mode.password) {
      setError("Masukkan password Anda untuk konfirmasi.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await disableMy2FA(mode.password);
      setMode({ kind: "idle" });
      showToast("2FA berhasil dinonaktifkan.");
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menonaktifkan 2FA.");
    } finally {
      setSubmitting(false);
    }
  };

  const copySecret = async () => {
    if (mode.kind !== "setup") return;
    try {
      await navigator.clipboard.writeText(mode.data.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="rounded-[20px] border border-line-sand bg-white p-6 shadow-[0_14px_36px_rgba(15,30,61,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Keamanan akun</div>
          <h2 className="mt-1 flex items-center gap-2 font-serif text-[1.3rem] tracking-[-0.02em] text-brand">
            Verifikasi Dua Faktor (2FA)
            {enabled ? <Badge variant="success">Aktif</Badge> : <Badge variant="neutral">Belum aktif</Badge>}
          </h2>
          <p className="mt-2 text-[13px] text-ink-soft">
            Tambahkan lapisan keamanan ekstra. Saat 2FA aktif, login akan meminta kode 6 digit dari
            aplikasi authenticator (mis. Google Authenticator, Authy).
          </p>
        </div>
        {mode.kind === "idle" && !enabled && (
          <Button
            type="button"
            hierarchy="primary"
            size="sm"
            onClick={handleStartSetup}
            disabled={submitting}
            prefixIcon={<Icon name="shield" size={12} />}
          >
            {submitting ? "Menyiapkan…" : "Aktifkan 2FA"}
          </Button>
        )}
        {mode.kind === "idle" && enabled && (
          <Button
            type="button"
            hierarchy="secondary"
            size="sm"
            onClick={() => setMode({ kind: "disable", password: "" })}
            prefixIcon={<Icon name="x" size={12} />}
          >
            Nonaktifkan
          </Button>
        )}
      </div>

      {toast && (
        <div className="mt-3 rounded-md border border-status-successBorder bg-status-successBg px-3 py-2 text-[13px] text-status-successFg">
          <Icon name="check" size={12} className="mr-1 inline" /> {toast}
        </div>
      )}
      {error && (
        <div className="mt-3 rounded-md border border-status-dangerBorder bg-status-dangerBg px-3 py-2 text-[13px] text-status-dangerFg">
          {error}
        </div>
      )}

      {/* --- Setup wizard --- */}
      {mode.kind === "setup" && (
        <div className="mt-5 rounded-[14px] border border-line-sand bg-paper-cream/40 p-5">
          <h3 className="font-serif text-[1rem] text-brand">Scan QR di aplikasi authenticator</h3>
          <p className="mt-1 text-[12px] text-ink-soft">
            Buka Google Authenticator / Authy / aplikasi TOTP lain → tap tombol <em>Add account</em> → scan QR di bawah.
          </p>

          <div className="mt-4 grid gap-5 sm:grid-cols-[auto_1fr]">
            <div className="shrink-0">
              <img
                src={mode.data.qr_png_b64}
                alt="QR code 2FA"
                className="h-[200px] w-[200px] rounded-md border border-line-sand bg-white p-2"
              />
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  Tidak bisa scan? Ketik manual secret:
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <code className="flex-1 break-all rounded border border-line-sand bg-white px-3 py-2 font-mono text-[12px] text-brand">
                    {mode.data.secret}
                  </code>
                  <button
                    type="button"
                    onClick={copySecret}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line-sand bg-white px-2.5 py-2 text-[11px] font-semibold text-brand-deep hover:border-brand-deep"
                  >
                    <Icon name={copiedSecret ? "check" : "copy"} size={11} />
                    {copiedSecret ? "Tersalin" : "Salin"}
                  </button>
                </div>
              </div>

              <Field label="Kode 6 digit dari authenticator" required>
                <TextInput
                  value={mode.code}
                  onChange={(v) => setMode({ ...mode, code: v.replace(/\D/g, "").slice(0, 6) })}
                  placeholder="123456"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </Field>

              <div className="flex gap-2">
                <Button
                  type="button"
                  hierarchy="primary"
                  size="sm"
                  onClick={handleConfirmSetup}
                  disabled={submitting || mode.code.length !== 6}
                  prefixIcon={submitting ? <Icon name="spinner" size={12} className="animate-spin" /> : <Icon name="check" size={12} />}
                >
                  Konfirmasi & Aktifkan
                </Button>
                <Button
                  type="button"
                  hierarchy="secondary"
                  size="sm"
                  onClick={() => setMode({ kind: "idle" })}
                  disabled={submitting}
                >
                  Batal
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Disable prompt --- */}
      {mode.kind === "disable" && (
        <div className="mt-5 rounded-[14px] border border-status-warnBorder bg-status-warnBg p-5">
          <h3 className="font-serif text-[1rem] text-status-warnFg">Konfirmasi nonaktifkan 2FA</h3>
          <p className="mt-1 text-[12px] text-status-warnFg">
            Masukkan password Anda. Setelah 2FA mati, login cukup email + password saja.
          </p>
          <div className="mt-4 grid gap-3 sm:max-w-[360px]">
            <Field label="Password saat ini" required>
              <TextInput
                type="password"
                value={mode.password}
                onChange={(v) => setMode({ ...mode, password: v })}
                autoComplete="current-password"
              />
            </Field>
            <div className="flex gap-2">
              <Button
                type="button"
                hierarchy="primary"
                size="sm"
                onClick={handleDisable}
                disabled={submitting || !mode.password}
              >
                {submitting ? "Memproses…" : "Ya, nonaktifkan"}
              </Button>
              <Button
                type="button"
                hierarchy="secondary"
                size="sm"
                onClick={() => setMode({ kind: "idle" })}
                disabled={submitting}
              >
                Batal
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

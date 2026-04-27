import React, { useState } from "react";
import { Button } from "@idds/react";
import { Icon } from "../../components/Icon";
import { useModalClose } from "../../hooks/useModalClose";
import { ApiError, adminResetPassword } from "../../api";
import type { BackendUserDTO } from "../../api";

interface Props {
  user: BackendUserDTO;
  onClose: () => void;
}

export const ResetPasswordModal: React.FC<Props> = ({ user, onClose }) => {
  useModalClose(onClose);
  const [stage, setStage] = useState<"confirm" | "done">("confirm");
  const [submitting, setSubmitting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleReset = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await adminResetPassword(user.id);
      setTempPassword(res.temp_password);
      setStage("done");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal reset password.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:px-4 sm:py-8"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[20px] bg-white shadow-[0_30px_80px_rgba(15,30,61,0.25)] sm:rounded-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-line-sand px-6 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-status-warnBg text-status-warnFg">
            <Icon name="alert" size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
              Reset password
            </div>
            <h2 className="mt-1 font-serif text-[1.2rem] tracking-[-0.02em] text-brand">{user.full_name}</h2>
            <div className="mt-1 font-mono text-[11px] text-ink-muted">{user.email}</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-ink-muted hover:bg-paper-cream" aria-label="Tutup">
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {stage === "confirm" && (
            <>
              <p className="text-sm leading-6 text-ink-tertiary">
                Sistem akan men-generate password acak 12 karakter untuk user ini. Password lama akan
                dinonaktifkan dan <strong>semua sesi aktif di semua perangkat akan di-logout</strong>.
              </p>
              <div className="mt-4 rounded-md border border-status-warnBorder bg-status-warnBg px-4 py-3 text-[13px] text-status-warnFg">
                <strong>Perhatian:</strong> password baru hanya akan ditampilkan sekali setelah ini.
                Pastikan Anda dapat menyampaikannya ke user (WA / telepon / email internal).
              </div>
              {error && (
                <div className="mt-3 rounded-md border border-status-dangerBorder bg-status-dangerBg px-3 py-2 text-[13px] text-status-dangerFg">
                  {error}
                </div>
              )}
            </>
          )}

          {stage === "done" && (
            <>
              <p className="text-sm leading-6 text-ink-tertiary">
                Password baru berhasil dibuat. Salin dan sampaikan ke user — password ini
                <strong> tidak akan ditampilkan lagi</strong>.
              </p>
              <div className="mt-4 rounded-md border border-line-sand bg-paper-cream/40 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                  Password Sementara
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <code className="flex-1 break-all rounded bg-white px-3 py-2 font-mono text-[15px] font-semibold text-brand border border-line-sand">
                    {tempPassword}
                  </code>
                  <button
                    type="button"
                    onClick={copyPassword}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line-sand bg-white px-3 py-2 text-[12px] font-semibold text-brand-deep transition hover:border-brand-deep"
                  >
                    <Icon name={copied ? "check" : "copy"} size={12} /> {copied ? "Tersalin" : "Salin"}
                  </button>
                </div>
              </div>
              <div className="mt-4 rounded-md border border-status-infoBorder bg-status-infoBg px-4 py-3 text-[13px] text-status-infoFg">
                User harus login ulang dengan password ini. Semua sesi aktif-nya sudah di-revoke.
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-line-sand bg-paper-cream/30 px-6 py-4">
          {stage === "confirm" ? (
            <>
              <Button type="button" hierarchy="secondary" onClick={onClose}>
                Batal
              </Button>
              {/* Tetap custom — warn color intentional (destructive action). */}
              <button
                type="button"
                onClick={handleReset}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-md bg-status-warnFg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? <Icon name="spinner" size={14} className="animate-spin" /> : <Icon name="key" size={14} />}
                Reset Password
              </button>
            </>
          ) : (
            <Button type="button" hierarchy="primary" onClick={onClose} prefixIcon={<Icon name="check" size={14} />}>
              Selesai
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

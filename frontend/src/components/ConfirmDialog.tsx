import React, { useState } from "react";
import { Button } from "@idds/react";
import { Icon, type IconName } from "./Icon";
import { useModalClose } from "../hooks/useModalClose";

export type ConfirmTone = "danger" | "warn" | "info";

interface Props {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  icon?: IconName;
  // onConfirm bisa async — dialog akan tampil spinner + disable tombol
  // sampai promise selesai. Throw untuk batalkan close (mis. error API).
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

const TONE_STYLE: Record<ConfirmTone, { iconBg: string; accent: string; btnClass: string }> = {
  danger: {
    iconBg: "bg-status-dangerBg text-status-dangerFg",
    accent: "text-status-dangerFg",
    btnClass: "bg-status-dangerFg text-white hover:opacity-90",
  },
  warn: {
    iconBg: "bg-status-warnBg text-status-warnFg",
    accent: "text-accent",
    btnClass: "bg-status-warnFg text-white hover:opacity-90",
  },
  info: {
    iconBg: "bg-status-infoBg text-status-infoFg",
    accent: "text-brand-deep",
    btnClass: "",
  },
};

// ConfirmDialog — replacement untuk native window.confirm().
// Pakai pola modal custom yang sama dengan ResetPasswordModal supaya konsisten.
export const ConfirmDialog: React.FC<Props> = ({
  title,
  message,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  tone = "danger",
  icon,
  onConfirm,
  onClose,
}) => {
  useModalClose(onClose);
  const [submitting, setSubmitting] = useState(false);
  const tone_ = TONE_STYLE[tone];
  const iconName: IconName = icon ?? (tone === "danger" ? "trash" : tone === "warn" ? "alert" : "info");

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // Caller diharapkan handle error sendiri (toast/state).
      // Dialog tetap terbuka supaya user bisa retry / batal.
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:px-4 sm:py-8"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-[440px] flex-col overflow-hidden rounded-t-[20px] bg-white shadow-[0_30px_80px_rgba(15,30,61,0.25)] sm:rounded-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-line-sand px-6 py-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone_.iconBg}`}>
            <Icon name={iconName} size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${tone_.accent}`}>
              {tone === "danger" ? "Konfirmasi hapus" : tone === "warn" ? "Perhatian" : "Konfirmasi"}
            </div>
            <h2 className="mt-1 font-serif text-[1.15rem] tracking-[-0.02em] text-brand">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-ink-muted hover:bg-paper-cream"
            aria-label="Tutup"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="px-6 py-5 text-sm leading-6 text-ink-tertiary">{message}</div>

        <div className="flex justify-end gap-3 border-t border-line-sand bg-paper-cream/30 px-6 py-4">
          <Button type="button" hierarchy="secondary" onClick={onClose} disabled={submitting}>
            {cancelLabel}
          </Button>
          {tone === "info" ? (
            <Button type="button" hierarchy="primary" onClick={handleConfirm} disabled={submitting}>
              {submitting ? "Memproses…" : confirmLabel}
            </Button>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${tone_.btnClass}`}
            >
              {submitting && <Icon name="spinner" size={14} className="animate-spin" />}
              {submitting ? "Memproses…" : confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

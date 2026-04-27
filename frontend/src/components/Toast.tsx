import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Icon, type IconName } from "./Icon";

export type ToastTone = "success" | "danger" | "warn" | "info";

export interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
  duration: number;
}

interface ToastContextValue {
  show: (message: string, tone?: ToastTone, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warn: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLE: Record<ToastTone, { bg: string; border: string; text: string; icon: IconName }> = {
  success: { bg: "bg-status-successBg", border: "border-status-successBorder", text: "text-status-successFg", icon: "check" },
  danger:  { bg: "bg-status-dangerBg",  border: "border-status-dangerBorder",  text: "text-status-dangerFg",  icon: "alert" },
  warn:    { bg: "bg-status-warnBg",    border: "border-status-warnBorder",    text: "text-status-warnFg",    icon: "alert" },
  info:    { bg: "bg-status-infoBg",    border: "border-status-infoBorder",    text: "text-status-infoFg",    icon: "info"  },
};

// ToastProvider — global notification stack pojok kanan atas.
// Pakai timer per item, max 4 visible (auto pop yang lama).
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message: string, tone: ToastTone = "info", duration = 3500) => {
    const id = ++idRef.current;
    setItems((prev) => [...prev.slice(-3), { id, tone, message, duration }]);
    if (duration > 0) {
      window.setTimeout(() => dismiss(id), duration);
    }
  }, [dismiss]);

  const value: ToastContextValue = {
    show,
    success: (m, d) => show(m, "success", d),
    error: (m, d) => show(m, "danger", d ?? 5000),
    warn: (m, d) => show(m, "warn", d),
    info: (m, d) => show(m, "info", d),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-[80] flex flex-col items-center gap-2 px-4 sm:right-4 sm:left-auto sm:top-6 sm:items-end sm:px-0"
        aria-live="polite"
        aria-atomic="false"
      >
        {items.map((t) => {
          const s = TONE_STYLE[t.tone];
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex w-full max-w-[400px] items-start gap-3 rounded-md border ${s.border} ${s.bg} px-4 py-3 shadow-[0_10px_30px_rgba(15,30,61,0.12)] transition-all`}
            >
              <span className={`mt-0.5 ${s.text}`}>
                <Icon name={s.icon} size={16} />
              </span>
              <div className={`flex-1 text-sm leading-5 ${s.text}`}>{t.message}</div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className={`shrink-0 rounded p-1 ${s.text} hover:bg-white/40`}
                aria-label="Tutup notifikasi"
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

// useToast — akses dari komponen apa saja di dalam <ToastProvider>.
export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback noop kalau Provider belum mount — supaya komponen ga crash
    // saat di-render di test atau konteks lain.
    if (typeof window !== "undefined" && (window as { __toastWarned__?: boolean }).__toastWarned__ !== true) {
      // eslint-disable-next-line no-console
      console.warn("useToast() dipanggil di luar <ToastProvider>; menggunakan fallback noop.");
      (window as { __toastWarned__?: boolean }).__toastWarned__ = true;
    }
    const noop = () => undefined;
    return { show: noop, success: noop, error: noop, warn: noop, info: noop };
  }
  return ctx;
};


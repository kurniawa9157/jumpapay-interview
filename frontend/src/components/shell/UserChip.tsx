import React, { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";

export interface UserChipProps {
  name: string;
  role: string;
  avatarInitial: string;
  variant: "admin" | "ppat-user";
  onLogout: () => void;
  onOpenAccount?: () => void;
}

export const UserChip: React.FC<UserChipProps> = ({ name, role, avatarInitial, variant, onLogout, onOpenAccount }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const avatarBg = variant === "admin" ? "bg-brand-deep" : "bg-accent";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2.5 rounded-full border border-line-sand bg-white px-2 py-1 text-left text-sm transition hover:border-brand-deep"
      >
        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-white text-[12px] font-semibold ${avatarBg}`}>
          {avatarInitial}
        </span>
        <span className="hidden sm:block pr-2">
          <span className="block text-[12px] font-semibold text-brand leading-none">{name}</span>
          <span className="mt-0.5 block text-[10px] uppercase tracking-[0.14em] text-ink-muted leading-none">{role}</span>
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-40 w-56 rounded-lg border border-line-sand bg-white py-1 shadow-[0_20px_40px_rgba(15,30,61,0.12)]">
          <div className="px-3 py-2 border-b border-line-sand/60">
            <div className="text-[13px] font-semibold text-brand">{name}</div>
            <div className="text-[11px] text-ink-muted">{role}</div>
          </div>
          {onOpenAccount && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenAccount();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-ink-tertiary hover:bg-paper-cream"
            >
              <Icon name="user" size={14} />
              Akun Saya
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-ink-tertiary hover:bg-paper-cream"
          >
            <Icon name="logout" size={14} />
            Keluar
          </button>
        </div>
      )}
    </div>
  );
};

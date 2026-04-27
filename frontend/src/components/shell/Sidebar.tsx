import React from "react";
import { Icon, IconName } from "../Icon";

export interface SidebarNavItem {
  key: string;
  label: string;
  icon: IconName;
  badge?: number | string;
}

export interface SidebarProps {
  variant: "admin" | "ppat-user";
  items: SidebarNavItem[];
  activeKey: string;
  onNavigate: (key: string) => void;
  onClose?: () => void;
  brandTitle: string;
  brandSubtitle: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ variant, items, activeKey, onNavigate, onClose, brandTitle, brandSubtitle }) => {
  const isAdmin = variant === "admin";

  const bg = isAdmin ? "bg-sidebar-admin" : "bg-paper-cream";
  const textMuted = isAdmin ? "text-white/60" : "text-ink-muted";
  const brandText = isAdmin ? "text-white" : "text-brand";
  const accentLabel = isAdmin ? "text-white/70" : "text-accent";
  const hover = isAdmin
    ? "hover:bg-sidebar-adminHover hover:text-white"
    : "hover:bg-white hover:text-brand-deep";
  const activeClass = isAdmin
    ? "bg-sidebar-adminActive text-white"
    : "bg-white text-brand-deep shadow-[0_4px_12px_rgba(15,30,61,0.05)]";
  const idleText = isAdmin ? "text-white/80" : "text-ink-tertiary";
  const logoBg = isAdmin ? "bg-white/10 text-white" : "bg-brand-deep text-white";

  return (
    <aside className={`flex h-full w-[240px] flex-col ${bg} border-r ${isAdmin ? "border-brand-deep/40" : "border-line-cream"}`}>
      <div className="flex items-center gap-3 px-5 py-5">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${logoBg}`}>
          <Icon name="building" size={18} />
        </div>
        <div className="min-w-0">
          <div className={`text-[10px] font-bold uppercase tracking-[0.18em] ${accentLabel}`}>{brandSubtitle}</div>
          <div className={`truncate text-sm font-semibold tracking-[-0.01em] ${brandText}`}>{brandTitle}</div>
        </div>
        {onClose && (
          <button
            type="button"
            className={`ml-auto md:hidden ${isAdmin ? "text-white/70 hover:text-white" : "text-ink-tertiary hover:text-brand-deep"}`}
            onClick={onClose}
            aria-label="Tutup menu"
          >
            <Icon name="x" size={18} />
          </button>
        )}
      </div>

      <nav className={`mt-2 flex-1 overflow-y-auto px-3 pb-4`}>
        <div className={`px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] ${textMuted}`}>Navigasi</div>
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const isActive = item.key === activeKey;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => onNavigate(item.key)}
                  className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition ${
                    isActive ? activeClass : `${idleText} ${hover}`
                  }`}
                >
                  <Icon name={item.icon} size={16} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge !== undefined && item.badge !== 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      isAdmin ? "bg-white/15 text-white" : "bg-accent/10 text-accent"
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={`px-5 py-4 text-[10px] ${textMuted} border-t ${isAdmin ? "border-white/10" : "border-line-cream"}`}>
        e-PPAT · Kementerian ATR/BPN
      </div>
    </aside>
  );
};

import React from "react";
import { Icon } from "../Icon";
import { UserChip } from "./UserChip";

export interface TopbarProps {
  pageTitle: string;
  pageSubtitle?: string;
  user: { name: string; role: string; avatarInitial: string };
  variant: "admin" | "ppat-user";
  onLogout: () => void;
  onOpenAccount?: () => void;
  onToggleMobileNav: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ pageTitle, pageSubtitle, user, variant, onLogout, onOpenAccount, onToggleMobileNav }) => (
  <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line-sand bg-white/95 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8">
    <button
      type="button"
      className="md:hidden -ml-1 flex h-9 w-9 items-center justify-center rounded-md border border-line-sand text-ink-tertiary hover:border-brand-deep hover:text-brand-deep"
      onClick={onToggleMobileNav}
      aria-label="Buka menu"
    >
      <Icon name="menu" size={16} />
    </button>

    <div className="min-w-0 flex-1">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">{pageSubtitle || "Dasbor"}</div>
      <h1 className="truncate font-serif text-[1.25rem] tracking-[-0.02em] text-brand sm:text-[1.4rem]">{pageTitle}</h1>
    </div>

    <UserChip
      name={user.name}
      role={user.role}
      avatarInitial={user.avatarInitial}
      variant={variant}
      onLogout={onLogout}
      onOpenAccount={onOpenAccount}
    />
  </header>
);

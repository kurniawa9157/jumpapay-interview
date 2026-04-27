import React, { useState } from "react";
import { Sidebar, SidebarNavItem } from "./shell/Sidebar";
import { Topbar } from "./shell/Topbar";

export interface AuthenticatedShellProps {
  variant: "admin" | "ppat-user";
  navItems: SidebarNavItem[];
  activeKey: string;
  onNavigate: (key: string) => void;
  user: { name: string; role: string; avatarInitial: string };
  onLogout: () => void;
  onOpenAccount?: () => void;
  pageTitle: string;
  pageSubtitle?: string;
  brandTitle: string;
  brandSubtitle: string;
  children: React.ReactNode;
}

export const AuthenticatedShell: React.FC<AuthenticatedShellProps> = ({
  variant,
  navItems,
  activeKey,
  onNavigate,
  user,
  onLogout,
  onOpenAccount,
  pageTitle,
  pageSubtitle,
  brandTitle,
  brandSubtitle,
  children,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigate = (key: string) => {
    onNavigate(key);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-paper">
      <div className="hidden md:block fixed top-0 left-0 h-screen z-30">
        <Sidebar
          variant={variant}
          items={navItems}
          activeKey={activeKey}
          onNavigate={handleNavigate}
          brandTitle={brandTitle}
          brandSubtitle={brandSubtitle}
        />
      </div>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed top-0 left-0 h-screen z-50 md:hidden">
            <Sidebar
              variant={variant}
              items={navItems}
              activeKey={activeKey}
              onNavigate={handleNavigate}
              onClose={() => setMobileOpen(false)}
              brandTitle={brandTitle}
              brandSubtitle={brandSubtitle}
            />
          </div>
        </>
      )}

      <div className="flex min-h-screen flex-col md:pl-[240px]">
        <Topbar
          pageTitle={pageTitle}
          pageSubtitle={pageSubtitle}
          user={user}
          variant={variant}
          onLogout={onLogout}
          onOpenAccount={onOpenAccount}
          onToggleMobileNav={() => setMobileOpen(true)}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1200px]">{children}</div>
        </main>
      </div>
    </div>
  );
};

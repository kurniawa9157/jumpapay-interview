import { useEffect, useState } from "react";
import { RoleLanding } from "./pages/RoleLanding";
import { LoginPage } from "./pages/LoginPage";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AccountLayout } from "./pages/account/AccountLayout";
import type { AdminSession } from "./types/admin";
import { authApi, onAuthExpired, tokenStore } from "./api";
import type { MeResponse } from "./api";

// View union — public (landing | login) + authenticated (admin | account).
// Tambah view project-specific di sini saat extend template.
type View = "landing" | "login" | "admin" | "account";

const hasAnyAdminPermission = (me: MeResponse): boolean => {
  const perms = me.permissions || {};
  for (const moduleActions of Object.values(perms)) {
    if (!moduleActions) continue;
    for (const allowed of Object.values(moduleActions)) {
      if (allowed) return true;
    }
  }
  return false;
};

const authedView = (me: MeResponse): View => {
  if (me.user.is_admin) return "admin";
  if (hasAnyAdminPermission(me)) return "admin";
  return "landing";
};

const nameParts = (me: MeResponse): string => {
  const first = me.user.first_name || "";
  const last = me.user.last_name || "";
  return [first, last].filter(Boolean).join(" ").trim() || first || "Pengguna";
};

const adminSessionFromMe = (me: MeResponse): AdminSession => ({
  name: nameParts(me),
  role: me.user.is_admin ? "Super Admin" : (me.role?.name || "Admin"),
  avatarInitial: (me.user.first_name?.[0] || "A").toUpperCase(),
});

function App() {
  const [hydrating, setHydrating] = useState(true);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [view, setView] = useState<View>("landing");

  // Hydrate session dari access token saat mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!tokenStore.getAccess()) {
        setHydrating(false);
        return;
      }
      try {
        const data = await authApi.me();
        if (cancelled) return;
        setMe(data);
        setView(authedView(data));
      } catch {
        tokenStore.clear();
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Subscribe ke event refresh-gagal dari API client → force logout state.
  useEffect(() => {
    return onAuthExpired(() => {
      setMe(null);
      setView("login");
    });
  }, []);

  const goLanding = () => setView("landing");

  const handleLoginSuccess = (data: MeResponse) => {
    setMe(data);
    setView(authedView(data));
  };

  const handleLogout = async () => {
    await authApi.logout();
    setMe(null);
    setView("landing");
  };

  if (hydrating) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center text-sm text-ink-muted">
        Memuat sesi…
      </div>
    );
  }

  if (me) {
    if (view === "account") {
      return (
        <AccountLayout
          onBack={() => setView(authedView(me))}
          onLogout={handleLogout}
        />
      );
    }
    if (view === "admin") {
      return (
        <AdminLayout
          user={adminSessionFromMe(me)}
          permissions={me.permissions || {}}
          isSuperAdmin={me.user.is_admin}
          onExit={handleLogout}
          onOpenAccount={() => setView("account")}
        />
      );
    }
  }

  if (view === "login") {
    return <LoginPage onBack={goLanding} onSuccess={handleLoginSuccess} />;
  }

  return <RoleLanding onRequestLogin={() => setView("login")} />;
}

export default App;

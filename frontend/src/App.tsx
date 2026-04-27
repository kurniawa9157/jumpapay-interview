import { useEffect, useMemo, useState } from "react";
import { RoleLanding } from "./pages/RoleLanding";
import { LoginPage } from "./pages/LoginPage";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AccountLayout } from "./pages/account/AccountLayout";
import { PostDetailPage } from "./pages/PostDetailPage";
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

// Parse current URL pathname → { kind, slug }. Default 'home' untuk
// path yang tidak match. Saat ini hanya mendukung /p/<slug> untuk post
// detail; semua path lain dianggap home/landing.
type ParsedPath =
  | { kind: "home" }
  | { kind: "post"; slug: string };

const parsePath = (pathname: string): ParsedPath => {
  const m = pathname.match(/^\/p\/([^/?#]+)$/);
  if (m) return { kind: "post", slug: decodeURIComponent(m[1]) };
  return { kind: "home" };
};

function App() {
  const [hydrating, setHydrating] = useState(true);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [view, setView] = useState<View>("landing");
  const [pathname, setPathname] = useState<string>(
    typeof window !== "undefined" ? window.location.pathname : "/",
  );

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

  // Listen back/forward browser navigation (popstate) → re-parse pathname.
  // Pushstate kita panggil manual saat navigate ke /p/<slug> dari ArticleGrid.
  useEffect(() => {
    const handler = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  // Intercept klik global pada anchor `<a href="/p/...">` supaya tidak
  // full reload — pakai pushState + sync state. Lebih clean daripada
  // memodifikasi 7+ block component biar pakai router-aware Link.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href) return;
      // Cuma intercept link internal SPA (/p/, /, dst). Skip eksternal +
      // mailto + tel + anchor # dalam page.
      if (
        target.target === "_blank" ||
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#")
      ) return;
      // Hanya pattern yang kita kenal: /p/<slug> dan /
      if (href === "/" || /^\/p\//.test(href)) {
        e.preventDefault();
        window.history.pushState({}, "", href);
        setPathname(href);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const parsed = useMemo(() => parsePath(pathname), [pathname]);

  const navigateHome = () => {
    if (pathname !== "/") {
      window.history.pushState({}, "", "/");
      setPathname("/");
    }
  };

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

  // Post detail page lewat URL — render di luar logic admin/account
  // karena ini halaman public yang juga bisa diakses oleh user logged-in.
  // Auth button di header akan adapt sesuai state.
  if (parsed.kind === "post" && view !== "login") {
    const canEnterAdmin = !!me && (me.user.is_admin || hasAnyAdminPermission(me));
    return (
      <PostDetailPage
        slug={parsed.slug}
        loggedIn={!!me}
        canEnterAdmin={canEnterAdmin}
        onHome={navigateHome}
        onRequestLogin={() => setView("login")}
        onGoAdmin={() => setView("admin")}
        onAccount={() => setView("account")}
      />
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

  return (
    <RoleLanding
      me={me}
      onRequestLogin={() => setView("login")}
      onGoAdmin={() => setView("admin")}
      onAccount={() => setView("account")}
      onLogout={handleLogout}
    />
  );
}

export default App;

import React, { useEffect, useMemo, useState } from "react";
import { AuthenticatedShell } from "../../components/AuthenticatedShell";
import type { SidebarNavItem } from "../../components/shell/Sidebar";
import type { AdminSession } from "../../types/admin";
import { AdminDashboard } from "./AdminDashboard";
import { AdminDaftarUser } from "./AdminDaftarUser";
import { AdminRoles } from "./AdminRoles";
import { AdminPengaturan } from "./AdminPengaturan";
import { AdminLanding } from "./AdminLanding";
import { AdminMasters } from "./AdminMasters";
import { AdminPosts } from "./AdminPosts";
import { AdminMediaLibrary } from "./AdminMediaLibrary";
import type { AuthPermissionMap } from "../../api";

interface Props {
  user: AdminSession;
  permissions: AuthPermissionMap;
  isSuperAdmin: boolean;
  onExit: () => void;
  onOpenAccount?: () => void;
}

type AdminPage =
  | "dashboard"
  | "daftar-user"
  | "peran"
  | "pengaturan"
  | "landing"
  | "masters"
  | "posts"
  | "media";

const pageMeta: Record<AdminPage, { title: string; subtitle: string }> = {
  dashboard: { title: "Ringkasan", subtitle: "Dasbor admin" },
  "daftar-user": { title: "Daftar User", subtitle: "Kelola user sistem" },
  peran: { title: "Peran & Izin", subtitle: "RBAC per modul" },
  pengaturan: { title: "Pengaturan Sistem", subtitle: "Tema & preferensi global" },
  landing: { title: "Landing Page", subtitle: "Page builder layout" },
  masters: { title: "Master Konten", subtitle: "Slider, Menu, Footer" },
  posts: { title: "Posts & Pages", subtitle: "Artikel, berita, halaman statis" },
  media: { title: "Media Library", subtitle: "Upload & kelola gambar / file" },
};

// Cek akses modul: super admin = true; user lain = minimal punya can_view.
const canView = (
  permissions: AuthPermissionMap,
  isSuperAdmin: boolean,
  module: string,
): boolean => {
  if (isSuperAdmin) return true;
  return !!permissions[module]?.view;
};

export const AdminLayout: React.FC<Props> = ({
  user,
  permissions,
  isSuperAdmin,
  onExit,
  onOpenAccount,
}) => {
  const navItems = useMemo<SidebarNavItem[]>(() => {
    const items: SidebarNavItem[] = [
      { key: "dashboard", label: "Dasbor", icon: "dashboard" },
    ];
    if (canView(permissions, isSuperAdmin, "USER_MGMT")) {
      items.push({ key: "daftar-user", label: "Daftar User", icon: "users" });
    }
    if (
      canView(permissions, isSuperAdmin, "ROLE_MGMT") ||
      canView(permissions, isSuperAdmin, "PERMISSION_MGMT")
    ) {
      items.push({ key: "peran", label: "Peran & Izin", icon: "shield" });
    }
    if (canView(permissions, isSuperAdmin, "CONTENT_MGMT")) {
      items.push({ key: "landing", label: "Landing Page", icon: "edit" });
      items.push({ key: "masters", label: "Master Konten", icon: "list" });
      items.push({ key: "posts", label: "Posts & Pages", icon: "file" });
      items.push({ key: "media", label: "Media Library", icon: "image" });
    }
    if (canView(permissions, isSuperAdmin, "SYSTEM_SETTINGS")) {
      items.push({ key: "pengaturan", label: "Pengaturan", icon: "settings" });
    }
    return items;
  }, [permissions, isSuperAdmin]);

  const [page, setPage] = useState<AdminPage>(() => {
    if (navItems.some((i) => i.key === "dashboard")) return "dashboard";
    const first = navItems[0]?.key as AdminPage | undefined;
    return first ?? "dashboard";
  });

  useEffect(() => {
    if (!navItems.some((i) => i.key === page)) {
      const first = navItems[0]?.key as AdminPage | undefined;
      if (first) setPage(first);
    }
  }, [navItems, page]);

  const meta = pageMeta[page];

  return (
    <AuthenticatedShell
      variant="admin"
      navItems={navItems}
      activeKey={page}
      onNavigate={(k) => setPage(k as AdminPage)}
      user={user}
      onLogout={onExit}
      onOpenAccount={onOpenAccount}
      pageTitle={meta.title}
      pageSubtitle={meta.subtitle}
      brandTitle="App Template"
      brandSubtitle="Admin"
    >
      {page === "dashboard" && <AdminDashboard onNavigate={(k) => setPage(k as AdminPage)} />}
      {page === "daftar-user" && <AdminDaftarUser />}
      {page === "peran" && <AdminRoles />}
      {page === "landing" && <AdminLanding />}
      {page === "masters" && <AdminMasters />}
      {page === "posts" && <AdminPosts />}
      {page === "media" && <AdminMediaLibrary />}
      {page === "pengaturan" && <AdminPengaturan />}
    </AuthenticatedShell>
  );
};

import React, { useEffect, useMemo, useState } from "react";
import { BlockRenderer } from "../components/BlockRenderer";
import { LandingAuthProvider, type LandingAuthState } from "../components/LandingAuthContext";
import { getPublicTemplateBySlug, ApiError } from "../api";
import type { BuilderComponent } from "../types/builder.types";
import type { MeResponse } from "../api";
import { Icon } from "../components/Icon";

interface Props {
  slug: string; // e.g. "/pengumuman"
  me: MeResponse | null;
  onRequestLogin: () => void;
  onGoAdmin: () => void;
  onAccount: () => void;
  onLogout: () => void;
  onHome: () => void;
}

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

const displayNameOf = (me: MeResponse): string => {
  const f = me.user.first_name || "";
  const l = me.user.last_name || "";
  return [f, l].filter(Boolean).join(" ").trim() || f || "Pengguna";
};

export const PublicPage: React.FC<Props> = ({
  slug,
  me,
  onRequestLogin,
  onGoAdmin,
  onAccount,
  onLogout,
  onHome,
}) => {
  const [layout, setLayout] = useState<BuilderComponent[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const auth = useMemo<LandingAuthState>(
    () => ({
      loggedIn: !!me,
      canEnterAdmin: !!me && (me.user.is_admin || hasAnyAdminPermission(me)),
      displayName: me ? displayNameOf(me) : "",
      onLogin: onRequestLogin,
      onGoAdmin,
      onAccount,
      onLogout,
    }),
    [me, onRequestLogin, onGoAdmin, onAccount, onLogout],
  );

  useEffect(() => {
    let cancelled = false;
    setLayout(null);
    setNotFound(false);
    setError(null);
    (async () => {
      try {
        const tpl = await getPublicTemplateBySlug(slug);
        if (cancelled) return;
        const layoutValue = (tpl.values || []).find((v) => v.key === "layout");
        if (!layoutValue?.value) { setLayout([]); return; }
        try {
          const parsed = JSON.parse(layoutValue.value);
          setLayout(Array.isArray(parsed) ? parsed : []);
        } catch {
          setLayout([]);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(err instanceof ApiError ? err.message : "Gagal memuat halaman.");
        setLayout([]);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (layout === null) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center text-sm text-ink-muted">
        Memuat…
      </div>
    );
  }

  if (notFound || error) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-4 text-center px-4">
        <Icon name="file" size={36} className="text-ink-muted" />
        <h1 className="font-serif text-2xl text-brand">{notFound ? "Halaman tidak ditemukan" : "Terjadi kesalahan"}</h1>
        <p className="text-sm text-ink-soft">{error || `Halaman "${slug}" belum tersedia.`}</p>
        <button type="button" onClick={onHome} className="mt-2 rounded-md bg-brand-deep px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  const hasNavbar = layout.some((b) => b.type === "navbar");

  return (
    <LandingAuthProvider value={auth}>
      <div className="min-h-screen bg-paper">
        <BlockRenderer layout={layout} />
        {!hasNavbar && (
          <button
            type="button"
            onClick={onHome}
            className="fixed left-4 top-4 z-40 inline-flex items-center gap-2 rounded-full bg-brand-deep/90 px-4 py-2 text-[12px] font-semibold text-white shadow backdrop-blur hover:bg-brand-deep"
          >
            <Icon name="chevronLeft" size={12} />
            Beranda
          </button>
        )}
      </div>
    </LandingAuthProvider>
  );
};

import React, { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { Icon } from "../components/Icon";
import {
  ApiError,
  getPublicPostBySlug,
  getPublicTemplateBySlug,
} from "../api";
import type { Post } from "../types/cms";
import type { BuilderComponent } from "../types/builder.types";
import { BlockRenderer } from "../components/BlockRenderer";
import {
  LandingAuthProvider,
  type LandingAuthState,
} from "../components/LandingAuthContext";

interface Props {
  slug: string;
  onHome: () => void;
  onRequestLogin: () => void;
  onGoAdmin: () => void;
  onAccount: () => void;
  loggedIn: boolean;
  canEnterAdmin: boolean;
}

// PostDetailPage — full-page render satu post by slug. Diakses via URL
// /p/<slug> (di-handle App.tsx state-based router). Header minimal dengan
// Home + Auth button; main content blog-style; footer placeholder.
export const PostDetailPage: React.FC<Props> = ({
  slug,
  onHome,
  onRequestLogin,
  onGoAdmin,
  onAccount,
  loggedIn,
  canEnterAdmin,
}) => {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Layout dari homepage template — diambil supaya navbar + footer konsisten
  // dengan landing. Kalau gagal fetch, fallback minimal header tetap render.
  const [siteLayout, setSiteLayout] = useState<BuilderComponent[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPost(null);
    getPublicPostBySlug(slug)
      .then((p) => {
        if (!cancelled) setPost(p);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setError("Halaman tidak ditemukan.");
        } else {
          setError(err instanceof ApiError ? err.message : "Gagal memuat halaman.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Fetch homepage layout sekali (independent dari post) — pakai untuk
  // ekstrak navbar + footer block.
  useEffect(() => {
    let cancelled = false;
    getPublicTemplateBySlug("/")
      .then((tpl) => {
        if (cancelled) return;
        const layoutValue = (tpl.values || []).find((v) => v.key === "layout");
        if (!layoutValue?.value) {
          setSiteLayout([]);
          return;
        }
        try {
          const parsed = JSON.parse(layoutValue.value);
          setSiteLayout(Array.isArray(parsed) ? parsed : []);
        } catch {
          setSiteLayout([]);
        }
      })
      .catch(() => setSiteLayout([]));
    return () => {
      cancelled = true;
    };
  }, []);

  // Pisah navbar (top) + footer (bottom) dari layout. By convention:
  // navbar = first navbar block ditemukan; footer = last footer block.
  const navbarBlock = siteLayout?.find((b) => b.type === "navbar") ?? null;
  const footerBlock = (() => {
    if (!siteLayout) return null;
    for (let i = siteLayout.length - 1; i >= 0; i--) {
      if (siteLayout[i].type === "footer") return siteLayout[i];
    }
    return null;
  })();

  // Auth context — supaya tombol Masuk/Dasbor di NavbarBlock bekerja
  // sama persis seperti di landing page.
  const auth = useMemo<LandingAuthState>(
    () => ({
      loggedIn,
      canEnterAdmin,
      displayName: "",
      onLogin: onRequestLogin,
      onGoAdmin,
      onAccount,
      onLogout: () => undefined,
    }),
    [loggedIn, canEnterAdmin, onRequestLogin, onGoAdmin, onAccount],
  );

  const authLabel = !loggedIn ? "Masuk" : canEnterAdmin ? "Dasbor" : "Akun Saya";
  const authIcon: "user" | "dashboard" = loggedIn && canEnterAdmin ? "dashboard" : "user";
  const handleAuth = () =>
    !loggedIn ? onRequestLogin() : canEnterAdmin ? onGoAdmin() : onAccount();

  const formattedDate = post?.published_at || post?.created_at
    ? new Date(post.published_at || post.created_at).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <LandingAuthProvider value={auth}>
      <div className="min-h-screen bg-paper">
        {/* Navbar — pakai dari homepage layout supaya konsisten. Kalau tidak
            ada navbar block atau layout belum ke-fetch, fallback header
            minimal. */}
        {navbarBlock ? (
          <BlockRenderer layout={[navbarBlock]} />
        ) : (
          <header className="border-b border-line-sand bg-white">
            <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
              <button
                type="button"
                onClick={onHome}
                className="flex items-center gap-2 text-brand transition hover:opacity-80"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-deep text-white">
                  <Icon name="building" size={14} />
                </span>
                <span className="font-serif text-[1rem] tracking-[-0.01em]">Beranda</span>
              </button>
              <button
                type="button"
                onClick={handleAuth}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand-deep px-3.5 py-1.5 text-[12px] font-semibold text-white transition hover:opacity-90"
              >
                <Icon name={authIcon} size={12} />
                {authLabel}
              </button>
            </div>
          </header>
        )}

        {/* Body */}
        <main className="mx-auto max-w-[820px] px-4 py-10 sm:px-6 lg:py-14">
        {loading ? (
          <div className="space-y-4">
            <div className="h-8 w-2/3 animate-pulse rounded bg-paper-cream/70" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-paper-cream/60" />
            <div className="aspect-[16/9] animate-pulse rounded-lg bg-paper-cream/60" />
            <div className="h-4 animate-pulse rounded bg-paper-cream/60" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-paper-cream/60" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-paper-cream/60" />
          </div>
        ) : error || !post ? (
          <div className="rounded-[16px] border border-line-sand bg-white px-6 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-status-warnBg text-status-warnFg">
              <Icon name="alert" size={20} />
            </div>
            <h1 className="mt-4 font-serif text-[1.4rem] tracking-[-0.02em] text-brand">
              {error || "Halaman tidak ditemukan"}
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              URL: <code className="font-mono text-[12px]">/p/{slug}</code>
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={onHome}
                className="inline-flex items-center gap-2 rounded-md bg-brand-deep px-4 py-2 text-[13px] font-semibold text-white transition hover:opacity-90"
              >
                <Icon name="chevronLeft" size={12} /> Kembali ke Beranda
              </button>
            </div>
          </div>
        ) : (
          <article>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
              {post.type === "page" ? "Halaman" : "Artikel"}
            </div>
            <h1 className="mt-2 font-serif text-[2rem] leading-tight tracking-[-0.02em] text-brand sm:text-[2.4rem]">
              {post.title}
            </h1>
            {formattedDate && (
              <p className="mt-3 flex items-center gap-2 text-[13px] text-ink-muted">
                <Icon name="calendar" size={12} />
                {formattedDate}
              </p>
            )}

            {post.cover_image && (
              <CoverImage src={post.cover_image} alt={post.title} aspect={post.cover_aspect} />
            )}

            {post.excerpt && (
              <p className="mt-6 border-l-4 border-brand-deep/40 bg-paper-cream/40 px-5 py-3 text-[15px] italic leading-7 text-ink-soft">
                {post.excerpt}
              </p>
            )}

            {post.content && (
              <div
                className="rte-content mt-8 text-[16px] leading-8"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(post.content),
                }}
              />
            )}

            {post.tags && (
              <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-line-sand pt-5 text-[12px]">
                <span className="text-ink-muted">Tag:</span>
                {post.tags.split(",").map((t, i) => {
                  const tag = t.trim();
                  if (!tag) return null;
                  return (
                    <span
                      key={i}
                      className="rounded-full bg-paper-cream px-3 py-1 font-semibold text-brand-deep"
                    >
                      {tag}
                    </span>
                  );
                })}
              </div>
            )}

            <div className="mt-10 border-t border-line-sand pt-6">
              <button
                type="button"
                onClick={onHome}
                className="inline-flex items-center gap-2 text-[13px] font-semibold text-brand-deep hover:underline"
              >
                <Icon name="chevronLeft" size={12} /> Kembali ke Beranda
              </button>
            </div>
          </article>
        )}
        </main>

        {/* Footer — pakai dari homepage layout. Kalau tidak ada, skip. */}
        {footerBlock && <BlockRenderer layout={[footerBlock]} />}
      </div>
    </LandingAuthProvider>
  );
};

// CoverImage — render cover dengan aspect ratio yang admin pilih.
//   aspect = "auto" → tampilkan image natural size (max-h limit untuk
//                     prevent gambar raksasa)
//   aspect = "<num>" → padding-bottom <num>% trick (uniform aspect ratio
//                      di semua viewport, gambar object-cover)
const CoverImage: React.FC<{ src: string; alt: string; aspect?: string }> = ({
  src,
  alt,
  aspect,
}) => {
  if (!aspect || aspect === "auto") {
    return (
      <div className="mt-6 overflow-hidden rounded-[16px] border border-line-sand">
        <img
          src={src}
          alt={alt}
          className="mx-auto block max-h-[600px] w-full object-contain"
        />
      </div>
    );
  }
  const pct = Number(aspect);
  if (!Number.isFinite(pct) || pct <= 0) {
    return (
      <div className="mt-6 overflow-hidden rounded-[16px] border border-line-sand">
        <img src={src} alt={alt} className="w-full" />
      </div>
    );
  }
  return (
    <div className="mt-6 overflow-hidden rounded-[16px] border border-line-sand">
      <div className="relative w-full" style={{ paddingBottom: `${pct}%` }}>
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </div>
  );
};

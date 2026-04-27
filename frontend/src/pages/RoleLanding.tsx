import React, { useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import { BlockRenderer } from "../components/BlockRenderer";
import { getPublicTemplateBySlug, ApiError } from "../api";
import type { BuilderComponent } from "../types/builder.types";

interface Props {
  onRequestLogin: () => void;
}

// Landing page — fetch template homepage (slug='/') + render dynamic via
// BlockRenderer. Kalau belum ada layout (template baru di-seed dengan
// layout=[]), tampilkan empty state dengan CTA Masuk.
export const RoleLanding: React.FC<Props> = ({ onRequestLogin }) => {
  const [layout, setLayout] = useState<BuilderComponent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tpl = await getPublicTemplateBySlug("/");
        if (cancelled) return;
        const layoutValue = (tpl.values || []).find((v) => v.key === "layout");
        if (!layoutValue || !layoutValue.value) {
          setLayout([]);
          return;
        }
        try {
          const parsed = JSON.parse(layoutValue.value);
          setLayout(Array.isArray(parsed) ? parsed : []);
        } catch {
          setLayout([]);
          setError("Format layout tidak valid.");
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          // Template homepage belum ada — kemungkinan migrasi belum jalan.
          setLayout([]);
        } else {
          setError(err instanceof ApiError ? err.message : "Gagal memuat halaman.");
          setLayout([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Empty state — tidak ada layout. Tampil minimal landing dengan CTA.
  if (layout && layout.length === 0) {
    return <EmptyLanding onRequestLogin={onRequestLogin} error={error} />;
  }

  // Loading state.
  if (layout === null) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center text-sm text-ink-muted">
        Memuat…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <BlockRenderer layout={layout} />
      <FloatingLoginButton onClick={onRequestLogin} />
    </div>
  );
};

// FloatingLoginButton — selalu muncul saat belum login supaya admin tetap
// punya akses login meski layout custom tidak sertakan tombol/link Masuk.
// Posisi fixed top-right, subtle tapi visible. Boleh dihilangkan kalau
// project sudah pasti punya login link di navbar.
const FloatingLoginButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="fixed right-4 top-4 z-40 inline-flex items-center gap-2 rounded-full bg-brand-deep/95 px-4 py-2 text-[12px] font-semibold text-white shadow-[0_8px_22px_rgba(15,30,61,0.25)] backdrop-blur transition hover:bg-brand-deep hover:shadow-[0_10px_28px_rgba(15,30,61,0.35)] sm:right-6 sm:top-6"
    aria-label="Masuk ke akun admin"
  >
    <Icon name="user" size={12} />
    Masuk
  </button>
);

// EmptyLanding — fallback ketika belum ada layout. Tetap functional dengan
// hero + CTA Masuk. Admin bisa replace via builder.
const EmptyLanding: React.FC<{ onRequestLogin: () => void; error: string | null }> = ({
  onRequestLogin,
  error,
}) => (
  <div className="min-h-screen bg-paper">
    <header className="border-b border-line-sand bg-white">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-deep text-white">
            <Icon name="building" size={16} />
          </span>
          <div className="font-serif text-[1.05rem] tracking-[-0.02em] text-brand">
            App Template
          </div>
        </div>
        <button
          type="button"
          onClick={onRequestLogin}
          className="inline-flex items-center gap-2 rounded-md bg-brand-deep px-4 py-2 text-[12px] font-semibold text-white transition hover:opacity-90"
        >
          <Icon name="user" size={14} />
          Masuk
        </button>
      </div>
    </header>

    <main className="mx-auto max-w-[1100px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <section className="rounded-[24px] border border-line-sand bg-white px-6 py-12 text-center shadow-[0_18px_45px_rgba(15,30,61,0.04)] sm:px-10 sm:py-16">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
          Foundation Template
        </div>
        <h1 className="mt-3 font-serif text-[2.2rem] leading-tight tracking-[-0.02em] text-brand sm:text-[2.6rem]">
          Halaman ini siap <span className="text-accent">dikustomisasi</span>
        </h1>
        <p className="mx-auto mt-5 max-w-[620px] text-[15px] leading-7 text-ink-soft">
          Login sebagai admin untuk menyusun landing dengan builder visual —
          tambahkan navbar, slider, card grid, footer, dan lainnya tanpa edit code.
        </p>
        {error && (
          <p className="mx-auto mt-4 max-w-[480px] text-[12px] text-status-warnFg">
            {error}
          </p>
        )}
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onRequestLogin}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-deep px-5 py-3 text-[13px] font-semibold text-white shadow-[0_10px_26px_rgba(15,30,61,0.18)] transition hover:-translate-y-0.5"
          >
            Masuk untuk mulai membangun <Icon name="arrowRight" size={14} />
          </button>
        </div>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: "shield" as const,
            title: "Auth + RBAC",
            desc: "JWT, role-permission matrix, 2FA TOTP, audit log.",
          },
          {
            icon: "users" as const,
            title: "User Management",
            desc: "CRUD user, suspend/activate, reset password, role assignment.",
          },
          {
            icon: "sparkle" as const,
            title: "Page Builder + IDDS",
            desc: "Builder visual 7 block, brand theme switcher, dark mode-ready.",
          },
        ].map((f) => (
          <div key={f.title} className="rounded-[16px] border border-line-sand bg-white p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-paper-cream text-brand-deep">
              <Icon name={f.icon} size={16} />
            </span>
            <h3 className="mt-3 font-serif text-[1.05rem] tracking-[-0.01em] text-brand">
              {f.title}
            </h3>
            <p className="mt-1.5 text-[13px] leading-6 text-ink-soft">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>

    <footer className="border-t border-line-sand bg-white">
      <div className="mx-auto max-w-[1200px] px-4 py-5 text-center text-[11px] text-ink-muted sm:px-6 lg:px-8">
        Template foundation — siap dikustomisasi sesuai kebutuhan project Anda.
      </div>
    </footer>
  </div>
);

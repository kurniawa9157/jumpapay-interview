import React from "react";
import { Icon } from "../components/Icon";

// Landing page minimal generik — hero card dengan CTA Masuk + section info
// kosong yang siap diisi konten project. Replace dengan halaman marketing
// kalau project kamu butuh.

interface Props {
  onRequestLogin: () => void;
}

export const RoleLanding: React.FC<Props> = ({ onRequestLogin }) => (
  <div className="min-h-screen bg-paper">
    <header className="border-b border-line-sand bg-white">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-deep text-white">
            <Icon name="building" size={16} />
          </span>
          <div className="font-serif text-[1.05rem] tracking-[-0.02em] text-brand">App Template</div>
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
          Bangun aplikasi <span className="text-accent">Anda</span> di atas fondasi yang siap pakai
        </h1>
        <p className="mx-auto mt-5 max-w-[620px] text-[15px] leading-7 text-ink-soft">
          Auth + JWT, RBAC permission matrix, manajemen user/role, 2FA, theme switcher IDDS,
          dan akun self-service — semua sudah jadi. Tinggal tambah fitur project Anda di atasnya.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onRequestLogin}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-deep px-5 py-3 text-[13px] font-semibold text-white shadow-[0_10px_26px_rgba(15,30,61,0.18)] transition hover:-translate-y-0.5"
          >
            Masuk ke aplikasi <Icon name="arrowRight" size={14} />
          </button>
        </div>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { icon: "shield" as const, title: "Auth + RBAC", desc: "JWT access/refresh token, role-permission matrix, 2FA TOTP, audit log." },
          { icon: "users" as const, title: "User Management", desc: "CRUD user, suspend/activate, reset password, role assignment." },
          { icon: "sparkle" as const, title: "IDDS Brand Theme", desc: "Switch brand color runtime (8 brand IDDS + custom), dark mode-ready." },
        ].map((f) => (
          <div key={f.title} className="rounded-[16px] border border-line-sand bg-white p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-paper-cream text-brand-deep">
              <Icon name={f.icon} size={16} />
            </span>
            <h3 className="mt-3 font-serif text-[1.05rem] tracking-[-0.01em] text-brand">{f.title}</h3>
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

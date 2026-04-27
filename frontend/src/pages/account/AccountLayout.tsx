import React, { useState } from "react";
import { PublicShell } from "../../components/PublicShell";
import { Icon } from "../../components/Icon";
import { AccountProfil } from "./AccountProfil";
import { AccountKeamanan } from "./AccountKeamanan";

type Tab = "profil" | "keamanan";

interface Props {
  onBack: () => void;
  onLogout: () => void;
}

const tabs: { key: Tab; label: string; icon: "user" | "shield" }[] = [
  { key: "profil", label: "Data Diri", icon: "user" },
  { key: "keamanan", label: "Keamanan", icon: "shield" },
];

export const AccountLayout: React.FC<Props> = ({ onBack, onLogout }) => {
  const [tab, setTab] = useState<Tab>("profil");

  return (
    <PublicShell
      navItems={[{ label: "Akun Saya", active: true }]}
      actions={
        <>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 border border-line-cream px-4 py-2.5 text-[12px] font-semibold text-ink-tertiary transition hover:border-brand-deep hover:text-brand-deep"
          >
            <Icon name="chevronLeft" size={14} /> Kembali
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center justify-center gap-2 border border-status-dangerBorder bg-white px-4 py-2.5 text-[12px] font-semibold text-status-dangerFg transition hover:bg-status-dangerBg"
          >
            <Icon name="logout" size={14} /> Keluar
          </button>
        </>
      }
      mainClassName="mx-auto max-w-[900px] px-4 py-8 sm:px-6 lg:px-8"
    >
      <div className="mb-6">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
          Pengaturan Akun
        </div>
        <h1 className="mt-2 font-serif text-[2rem] tracking-[-0.02em] text-brand">Akun Saya</h1>
        <p className="mt-2 max-w-[640px] text-[14px] leading-6 text-ink-soft">
          Kelola data diri dan keamanan akun Anda di sini. Perubahan password akan otomatis
          mengakhiri sesi di device lain.
        </p>
      </div>

      <div className="mb-5 flex items-center gap-1 rounded-[14px] border border-line-sand bg-white p-1">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-[10px] px-3 py-2 text-[13px] font-semibold transition ${
                active ? "bg-brand-deep text-white" : "text-ink-tertiary hover:text-brand-deep"
              }`}
            >
              <Icon name={t.icon} size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "profil" && <AccountProfil />}
      {tab === "keamanan" && <AccountKeamanan />}
    </PublicShell>
  );
};

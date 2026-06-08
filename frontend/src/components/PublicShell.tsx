import React from "react";
import { useAppearance } from "../appearance";
import { Icon } from "./Icon";

export interface PublicNavItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface PublicHeaderProps {
  navItems?: PublicNavItem[];
  actions?: React.ReactNode;
}

interface PublicShellProps extends PublicHeaderProps {
  children: React.ReactNode;
  mainClassName?: string;
}

const footerColumns = [
  {
    title: "JumpaPay",
    items: [
      "Platform layanan digital akta tanah",
      "Onboarding PPAT & para pihak",
      "Dukungan proses transaksi elektronik",
    ],
  },
  {
    title: "Navigasi",
    items: ["Tentang layanan", "Manfaat", "Fitur", "Cara kerja", "Onboarding"],
  },
  {
    title: "Kontak",
    items: [
      "dukungan@jumpapay.atrbpn.go.id",
      "Hari kerja 08.00–17.00 WIB",
      "Kementerian ATR/BPN Republik Indonesia",
    ],
  },
];

export const PublicHeader: React.FC<PublicHeaderProps> = ({ navItems = [], actions }) => {
  const appearance = useAppearance();
  const logoSrc = appearance.assets.public_header_logo_url || appearance.assets.logo_url;

  return (
  <header className="sticky top-0 z-50 border-b border-line-sand bg-paper/95 backdrop-blur-md shadow-[0_10px_30px_rgba(15,30,61,0.08)]">
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-brand-deep text-white shadow-[0_12px_30px_rgba(16,36,79,0.24)]">
            {logoSrc ? (
              <img src={logoSrc} alt="" className="h-full w-full object-contain p-1.5" />
            ) : (
              <Icon name="building" size={20} />
            )}
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Portal layanan ATR/BPN</div>
            <div className="text-lg font-semibold tracking-[-0.02em] text-brand">JumpaPay</div>
          </div>
        </div>

        <nav className="-mx-1 overflow-x-auto pb-1 text-[13px] text-[#5e6c87] [scrollbar-width:none] lg:mx-0 lg:flex-1 lg:pb-0">
          <div className="inline-flex min-w-max items-center gap-4 px-1 lg:justify-center lg:gap-6 lg:px-0">
            {navItems.map((item) => {
              const className = `border-b py-2 transition ${
                item.active
                  ? "border-brand-deep text-brand-deep"
                  : "border-transparent hover:border-brand-deep hover:text-brand-deep"
              }`;

              if (item.href) {
                return (
                  <a key={item.label} href={item.href} className={className}>
                    {item.label}
                  </a>
                );
              }

              return (
                <span key={item.label} className={className}>
                  {item.label}
                </span>
              );
            })}
          </div>
        </nav>

        {actions ? <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">{actions}</div> : null}
      </div>
    </div>
  </header>
  );
};

export const PublicFooter: React.FC = () => (
  <footer className="border-t border-[#d5ccbc] bg-[linear-gradient(180deg,#2d3c42_0%,#27353b_100%)] text-white">
    <div className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="grid gap-8 md:grid-cols-3">
        {footerColumns.map((column) => (
          <div key={column.title}>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#f7d67a]">{column.title}</div>
            <div className="mt-4 space-y-2 text-sm leading-6 text-white/78">
              {column.items.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-5 text-[12px] text-white/55 md:flex-row md:items-center md:justify-between">
        <div>Copyright © 2026 JumpaPay · Kementerian ATR/BPN</div>
        <div className="flex flex-col gap-3 text-white/70 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <span className="inline-flex items-center gap-2 break-all sm:break-normal">
            <Icon name="mail" size={14} /> dukungan@jumpapay.atrbpn.go.id
          </span>
          <span className="inline-flex items-center gap-2">
            <Icon name="clock" size={14} /> 08.00–17.00 WIB
          </span>
        </div>
      </div>
    </div>
  </footer>
);

export const PublicShell: React.FC<PublicShellProps> = ({ children, navItems, actions, mainClassName }) => (
  <div className="flex min-h-screen flex-col bg-paper-cream text-brand">
    <PublicHeader navItems={navItems} actions={actions} />
    <main className={mainClassName ?? "mx-auto flex w-full max-w-[1240px] flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-8"}>
      {children}
    </main>
    <PublicFooter />
  </div>
);

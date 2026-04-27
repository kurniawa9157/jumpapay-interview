import React, { useEffect, useState } from "react";
import { StatCard } from "../../components/data/StatCard";
import { Icon } from "../../components/Icon";
import { ApiError, getAdminStats } from "../../api";
import type { AdminStatsResponse } from "../../api";

interface Props {
  onNavigate: (key: "daftar-user" | "peran" | "pengaturan") => void;
}

const formatRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  return `${days} hari lalu`;
};

export const AdminDashboard: React.FC<Props> = ({ onNavigate }) => {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getAdminStats();
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Gagal memuat ringkasan.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-md border border-status-dangerBorder bg-status-dangerBg px-4 py-3 text-sm text-status-dangerFg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total User"
          value={stats?.totalUsers ?? "—"}
          icon="users"
          description="Semua user terdaftar"
        />
        <StatCard
          label="User Aktif"
          value={stats?.activeUsers ?? "—"}
          icon="trendingUp"
          description="Status ACTIVE"
        />
        <StatCard
          label="Aktivitas (10 terakhir)"
          value={stats?.recentActivity?.length ?? 0}
          icon="clock"
          description="Audit log"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-[20px] border border-line-sand bg-white p-6 shadow-[0_14px_36px_rgba(15,30,61,0.04)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Aksi cepat</div>
          <h2 className="mt-1 font-serif text-[1.4rem] tracking-[-0.02em] text-brand">Mulai dari sini</h2>
          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={() => onNavigate("daftar-user")}
              className="flex w-full items-center gap-4 rounded-xl border border-line-sand bg-paper-cream/40 px-4 py-3 text-left transition hover:border-brand-deep"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-deep/10 text-brand-deep">
                <Icon name="users" size={16} />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-brand">Kelola user</span>
                <span className="block text-xs text-ink-soft">Tambah, suspend, reset password</span>
              </span>
              <Icon name="chevronRight" size={14} />
            </button>
            <button
              type="button"
              onClick={() => onNavigate("peran")}
              className="flex w-full items-center gap-4 rounded-xl border border-line-sand bg-paper-cream/40 px-4 py-3 text-left transition hover:border-brand-deep"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                <Icon name="shield" size={16} />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-brand">Atur peran & izin</span>
                <span className="block text-xs text-ink-soft">RBAC matrix per modul</span>
              </span>
              <Icon name="chevronRight" size={14} />
            </button>
            <button
              type="button"
              onClick={() => onNavigate("pengaturan")}
              className="flex w-full items-center gap-4 rounded-xl border border-line-sand bg-paper-cream/40 px-4 py-3 text-left transition hover:border-brand-deep"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-paper-cream text-brand-deep">
                <Icon name="settings" size={16} />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-brand">Pengaturan sistem</span>
                <span className="block text-xs text-ink-soft">Brand theme + preferensi global</span>
              </span>
              <Icon name="chevronRight" size={14} />
            </button>
          </div>
        </div>

        <div className="rounded-[20px] border border-line-sand bg-white p-6 shadow-[0_14px_36px_rgba(15,30,61,0.04)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Aktivitas terbaru</div>
          <h2 className="mt-1 font-serif text-[1.25rem] tracking-[-0.02em] text-brand">Log aksi user</h2>
          <ul className="mt-4 space-y-3">
            {(stats?.recentActivity ?? []).map((item) => (
              <li key={item.id} className="flex items-start gap-3 text-sm">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-deep" />
                <div className="min-w-0 flex-1">
                  <div className="text-ink-tertiary">
                    <span className="font-semibold text-brand">{item.actor}</span>{" "}
                    <span className="font-mono text-[12px] text-ink-muted">{item.action}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-ink-muted">{formatRelative(item.at)}</div>
                </div>
              </li>
            ))}
            {(stats?.recentActivity ?? []).length === 0 && (
              <li className="text-sm text-ink-muted">Belum ada aktivitas.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

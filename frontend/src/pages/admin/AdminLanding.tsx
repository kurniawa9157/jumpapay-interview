import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@idds/react";
import { Icon } from "../../components/Icon";
import { Badge } from "../../components/data/Badge";
import {
  ApiError,
  adminListTemplates,
} from "../../api";
import type { Template } from "../../types/cms";
import { AdminLandingBuilder } from "./landing/AdminLandingBuilder";

type View =
  | { kind: "list" }
  | { kind: "builder"; template: Template };

// AdminLanding — entry untuk landing page builder. Default tampil list
// template type='page'. Klik "Edit Layout" → switch ke builder mode.
export const AdminLanding: React.FC = () => {
  const [view, setView] = useState<View>({ kind: "list" });
  const [pages, setPages] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await adminListTemplates({ type_template: "page" });
      setPages(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat template.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  if (view.kind === "builder") {
    return (
      <AdminLandingBuilder
        templateID={view.template.id}
        templateName={view.template.name}
        onBack={() => {
          setView({ kind: "list" });
          loadPages();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-[16px] border border-line-sand bg-white p-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Total halaman
          </div>
          <div className="mt-0.5 font-serif text-[1.3rem] tracking-[-0.02em] text-brand">
            {loading ? "…" : `${pages.length} template page`}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-status-dangerBorder bg-status-dangerBg px-4 py-3 text-sm text-status-dangerFg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-[16px] border border-line-sand bg-white px-5 py-6 text-sm text-ink-muted">
          Memuat template…
        </div>
      ) : pages.length === 0 ? (
        <div className="rounded-[16px] border border-line-sand bg-white px-5 py-10 text-center text-sm text-ink-muted">
          Belum ada template halaman. Migrasi awal menyediakan template{" "}
          <code className="font-mono text-[12px] text-brand">homepage</code> default — kalau hilang,
          jalankan ulang migrasi 000009 atau buat manual via menu Templates.
        </div>
      ) : (
        <div className="space-y-3">
          {pages.map((tpl) => (
            <div
              key={tpl.id}
              className="rounded-[16px] border border-line-sand bg-white shadow-[0_10px_24px_rgba(15,30,61,0.04)]"
            >
              <div className="flex items-center gap-4 px-5 py-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-paper-cream text-brand-deep">
                  <Icon name="file" size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-brand">{tpl.name}</div>
                  <div className="font-mono text-[11px] text-ink-muted">
                    {tpl.code} · slug: {tpl.slug || "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {tpl.is_active ? (
                    <Badge variant="success">Aktif</Badge>
                  ) : (
                    <Badge variant="neutral">Non-aktif</Badge>
                  )}
                  <Button
                    type="button"
                    hierarchy="primary"
                    size="sm"
                    onClick={() => setView({ kind: "builder", template: tpl })}
                    prefixIcon={<Icon name="edit" size={12} />}
                  >
                    Edit Layout
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-md border border-status-infoBorder bg-status-infoBg px-4 py-3 text-[13px] text-status-infoFg">
        <Icon name="info" size={14} className="mr-1 inline" />
        Master data slider, menu, footer dikelola di menu <strong>Konten</strong> →
        Sliders / Menus / Footers (akan ditambahkan di batch berikutnya). Untuk
        sementara bisa manage via API atau SQL.
      </div>
    </div>
  );
};

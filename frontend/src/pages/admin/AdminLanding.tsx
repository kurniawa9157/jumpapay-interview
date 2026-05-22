import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@idds/react";
import { Icon } from "../../components/Icon";
import { Badge } from "../../components/data/Badge";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import {
  ApiError,
  adminListTemplates,
  adminCreateTemplate,
  adminDeleteTemplate,
} from "../../api";
import type { Template } from "../../types/cms";
import { AdminLandingBuilder } from "./landing/AdminLandingBuilder";

type View =
  | { kind: "list" }
  | { kind: "builder"; template: Template };

// Slug yang tidak boleh dipakai — sudah dipakai oleh SPA routing internal.
const RESERVED_SLUGS = ["/login", "/admin", "/account", "/p"];

const slugify = (s: string): string =>
  s.toLowerCase().trim().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const AdminLanding: React.FC = () => {
  const [view, setView] = useState<View>({ kind: "list" });
  const [pages, setPages] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  useEffect(() => { loadPages(); }, [loadPages]);

  const handleNameChange = (val: string) => {
    setNewName(val);
    if (!slugManual) setNewSlug(slugify(val));
  };

  const handleSlugChange = (val: string) => {
    setSlugManual(true);
    setNewSlug(val);
  };

  const resolvedSlug = newSlug.trim().startsWith("/") ? newSlug.trim() : `/${newSlug.trim()}`;
  const slugReserved = RESERVED_SLUGS.some((r) => resolvedSlug === r || resolvedSlug.startsWith(r + "/"));
  const canCreate = !creating && newName.trim() && newSlug.trim() && resolvedSlug !== "/" && !slugReserved;

  const handleCreate = async () => {
    if (!canCreate) return;
    setCreating(true);
    setCreateError(null);
    try {
      const code = resolvedSlug.replace(/^\//, "").replace(/[^a-z0-9_-]/gi, "_");
      await adminCreateTemplate({ code, name: newName.trim(), type_template: "page", slug: resolvedSlug, is_active: true });
      setShowCreate(false);
      setNewName("");
      setNewSlug("");
      setSlugManual(false);
      await loadPages();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Gagal membuat halaman.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminDeleteTemplate(deleteTarget.id);
      setDeleteTarget(null);
      await loadPages();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menghapus halaman.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  if (view.kind === "builder") {
    return (
      <AdminLandingBuilder
        templateID={view.template.id}
        templateName={view.template.name}
        onBack={() => { setView({ kind: "list" }); loadPages(); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-[16px] border border-line-sand bg-white p-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Total halaman</div>
          <div className="mt-0.5 font-serif text-[1.3rem] tracking-[-0.02em] text-brand">
            {loading ? "…" : `${pages.length} template page`}
          </div>
        </div>
        <Button
          type="button"
          hierarchy="primary"
          size="sm"
          onClick={() => { setShowCreate(true); setCreateError(null); }}
          prefixIcon={<Icon name="plus" size={12} />}
        >
          Buat Halaman Baru
        </Button>
      </div>

      {showCreate && (
        <div className="rounded-[16px] border border-brand-deep/30 bg-white p-5 shadow-[0_10px_24px_rgba(15,30,61,0.06)]">
          <h3 className="font-serif text-[16px] tracking-[-0.01em] text-brand">Halaman Baru</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Nama Halaman</span>
              <input
                value={newName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Pengumuman"
                className="w-full rounded-md border border-line-sand bg-white px-3 py-2 text-sm text-brand focus:border-brand-deep focus:outline-none focus:ring-2 focus:ring-brand-deep/15"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Slug URL</span>
              <div className="flex items-center rounded-md border border-line-sand bg-white focus-within:border-brand-deep focus-within:ring-2 focus-within:ring-brand-deep/15">
                <span className="pl-3 text-sm text-ink-muted">/</span>
                <input
                  value={newSlug.replace(/^\//, "")}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="pengumuman"
                  className="min-w-0 flex-1 bg-transparent px-1 py-2 font-mono text-sm text-brand focus:outline-none"
                />
              </div>
              {slugReserved && (
                <p className="mt-1 text-[11px] text-status-dangerFg">Slug ini sudah dipakai sistem.</p>
              )}
            </label>
          </div>
          {createError && <p className="mt-2 text-[12px] text-status-dangerFg">{createError}</p>}
          <div className="mt-4 flex gap-2">
            <Button type="button" hierarchy="primary" size="sm" onClick={handleCreate} disabled={!canCreate}>
              {creating ? "Membuat…" : "Buat"}
            </Button>
            <Button type="button" hierarchy="secondary" size="sm" onClick={() => { setShowCreate(false); setNewName(""); setNewSlug(""); setSlugManual(false); }} disabled={creating}>
              Batal
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-status-dangerBorder bg-status-dangerBg px-4 py-3 text-sm text-status-dangerFg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-[16px] border border-line-sand bg-white px-5 py-6 text-sm text-ink-muted">Memuat template…</div>
      ) : pages.length === 0 ? (
        <div className="rounded-[16px] border border-line-sand bg-white px-5 py-10 text-center text-sm text-ink-muted">
          Belum ada template halaman. Migrasi awal menyediakan template{" "}
          <code className="font-mono text-[12px] text-brand">homepage</code> default.
        </div>
      ) : (
        <div className="space-y-3">
          {pages.map((tpl) => (
            <div key={tpl.id} className="rounded-[16px] border border-line-sand bg-white shadow-[0_10px_24px_rgba(15,30,61,0.04)]">
              <div className="flex items-center gap-4 px-5 py-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-paper-cream text-brand-deep">
                  <Icon name="file" size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-brand">{tpl.name}</div>
                  <div className="font-mono text-[11px] text-ink-muted">
                    {tpl.code} · slug:{" "}
                    <a href={tpl.slug || "/"} className="underline hover:text-brand-deep">{tpl.slug || "/"}</a>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {tpl.is_active ? <Badge variant="success">Aktif</Badge> : <Badge variant="neutral">Non-aktif</Badge>}
                  <Button
                    type="button"
                    hierarchy="primary"
                    size="sm"
                    onClick={() => setView({ kind: "builder", template: tpl })}
                    prefixIcon={<Icon name="edit" size={12} />}
                  >
                    Edit Layout
                  </Button>
                  {tpl.slug !== "/" && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(tpl)}
                      className="rounded-md border border-line-sand bg-white p-2 text-ink-tertiary hover:border-status-dangerBorder hover:text-status-dangerFg"
                      title="Hapus halaman"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Hapus halaman?"
          message={<>Halaman <strong>{deleteTarget.name}</strong> (slug: <code>{deleteTarget.slug}</code>) akan dihapus permanen beserta layoutnya.</>}
          confirmLabel={deleting ? "Menghapus…" : "Hapus"}
          cancelLabel="Batal"
          tone="danger"
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

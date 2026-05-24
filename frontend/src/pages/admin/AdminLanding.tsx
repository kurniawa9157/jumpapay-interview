import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@idds/react";
import { Icon } from "../../components/Icon";
import { Badge } from "../../components/data/Badge";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useToast } from "../../components/Toast";
import { useModalClose } from "../../hooks/useModalClose";
import { Field, TextInput } from "../../components/formKit";
import {
  ApiError,
  adminListTemplates,
  adminCreateTemplate,
  adminSaveLayout,
  adminUpdateTemplate,
  adminDeleteTemplate,
} from "../../api";
import type { Template } from "../../types/cms";
import { AdminLandingBuilder } from "./landing/AdminLandingBuilder";
import { importLayoutZip, suffixIfTaken, slugify, type ImportProgress } from "./landing/importLayout";

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
  const [importOpen, setImportOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Template | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const toast = useToast();

  const handleToggleActive = async (tpl: Template) => {
    setTogglingId(tpl.id);
    try {
      await adminUpdateTemplate(tpl.id, {
        name: tpl.name,
        slug: tpl.slug ?? undefined,
        is_active: !tpl.is_active,
      });
      // Optimistic-ish: update list lokal supaya tidak nunggu reload network.
      setPages((prev) =>
        prev.map((p) => (p.id === tpl.id ? { ...p, is_active: !p.is_active } : p)),
      );
      toast.success(`Template ${tpl.is_active ? "dinonaktifkan" : "diaktifkan"}.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal toggle status.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminDeleteTemplate(deleteTarget.id);
      toast.success(`Template "${deleteTarget.name}" dihapus.`);
      setDeleteTarget(null);
      await loadPages();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal hapus.");
      throw err; // supaya ConfirmDialog tidak auto-close
    }
  };

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
        <Button
          type="button"
          hierarchy="secondary"
          onClick={() => setImportOpen(true)}
          prefixIcon={<Icon name="upload" size={14} />}
        >
          Import Layout (ZIP)
        </Button>
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
                  <button
                    type="button"
                    onClick={() => handleToggleActive(tpl)}
                    disabled={togglingId === tpl.id}
                    title={`Klik untuk ${tpl.is_active ? "nonaktifkan" : "aktifkan"}`}
                    className="cursor-pointer transition hover:opacity-70 disabled:opacity-50"
                  >
                    {tpl.is_active ? (
                      <Badge variant="success">Aktif</Badge>
                    ) : (
                      <Badge variant="neutral">Non-aktif</Badge>
                    )}
                  </button>
                  <Button
                    type="button"
                    hierarchy="primary"
                    size="sm"
                    onClick={() => setView({ kind: "builder", template: tpl })}
                    prefixIcon={<Icon name="edit" size={12} />}
                  >
                    Edit Layout
                  </Button>
                  <Button
                    type="button"
                    hierarchy="secondary"
                    size="sm"
                    onClick={() => setEditTarget(tpl)}
                    prefixIcon={<Icon name="settings" size={12} />}
                    title="Ubah nama / slug / status"
                  >
                    Info
                  </Button>
                  <Button
                    type="button"
                    hierarchy="secondary"
                    size="sm"
                    onClick={() => setDeleteTarget(tpl)}
                    prefixIcon={<Icon name="x" size={12} />}
                    title="Hapus template"
                  >
                    Hapus
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

      {importOpen && (
        <ImportLayoutModal
          existingNames={pages.map((p) => p.name)}
          existingCodes={pages.map((p) => p.code)}
          onClose={() => setImportOpen(false)}
          onDone={(tpl) => {
            setImportOpen(false);
            toast.success(`Layout "${tpl.name}" berhasil diimport.`);
            setView({ kind: "builder", template: tpl });
          }}
        />
      )}

      {editTarget && (
        <EditTemplateModal
          template={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(updated) => {
            setEditTarget(null);
            toast.success("Info template tersimpan.");
            setPages((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={`Hapus "${deleteTarget.name}"?`}
          message={
            <span>
              Template + semua values (layout JSON + master items) akan
              terhapus permanen. Aksi ini <strong>tidak bisa di-undo</strong>.
              Yakin?
            </span>
          }
          confirmLabel="Hapus"
          tone="danger"
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
};

// EditTemplateModal — ubah nama / slug / is_active.
interface EditModalProps {
  template: Template;
  onClose: () => void;
  onSaved: (updated: Template) => void;
}

const EditTemplateModal: React.FC<EditModalProps> = ({ template, onClose, onSaved }) => {
  useModalClose(onClose);
  const [name, setName] = useState(template.name);
  const [slug, setSlug] = useState(template.slug || "");
  const [isActive, setIsActive] = useState(template.is_active);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Nama wajib diisi.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await adminUpdateTemplate(template.id, {
        name: trimmedName,
        slug: slug.trim() || undefined,
        is_active: isActive,
      });
      onSaved({ ...template, name: trimmedName, slug: slug.trim() || null, is_active: isActive });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan.");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={submitting ? undefined : onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[480px] rounded-[16px] bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
              Edit Info
            </div>
            <h3 className="mt-1 font-serif text-[18px] tracking-[-0.01em] text-brand">
              {template.name}
            </h3>
            <p className="mt-0.5 font-mono text-[11px] text-ink-muted">
              code: {template.code} (tidak bisa diubah)
            </p>
          </div>
          <button
            type="button"
            onClick={submitting ? undefined : onClose}
            disabled={submitting}
            className="rounded p-1 text-ink-tertiary hover:bg-paper-cream disabled:opacity-50"
          >
            <Icon name="x" size={14} />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Nama" required>
            <TextInput value={name} onChange={setName} />
          </Field>
          <Field
            label="Slug URL"
            hint={
              slug.trim() === "" ? (
                <span>Kosongkan kalau tidak dipakai sebagai halaman publik.</span>
              ) : slug.trim() === "/" ? (
                <span>Akan diakses di URL <code className="font-mono text-brand">/</code> (homepage).</span>
              ) : (
                <span>
                  Akan diakses di URL{" "}
                  <code className="font-mono text-brand">
                    /{slug.trim().replace(/^\/+/, "").toLowerCase()}
                  </code>
                  . Hindari kata terlarang: admin, api, install, runtime, login, dst.
                </span>
              )
            }
          >
            <TextInput
              value={slug}
              onChange={setSlug}
              placeholder="contoh: cafe (tanpa garis miring)"
            />
          </Field>
          {/* Toggle aktif — pakai button bergaya pill supaya tidak bergantung
              native checkbox styling (yg ke-reset oleh @idds/styles). */}
          <button
            type="button"
            onClick={() => setIsActive((v) => !v)}
            className="flex w-full cursor-pointer items-center gap-3 rounded-md border border-line-sand bg-paper-cream/30 px-3 py-2.5 text-left text-[13px] transition hover:bg-paper-cream/60"
          >
            <span
              className={`relative inline-flex h-5 w-9 flex-none items-center rounded-full transition ${
                isActive ? "bg-status-successFg" : "bg-line-sand"
              }`}
              aria-checked={isActive}
              role="switch"
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${
                  isActive ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </span>
            <span>
              <span className="font-semibold text-brand">
                {isActive ? "Aktif" : "Non-aktif"}
              </span>
              <span className="ml-1 text-ink-muted">
                — {isActive ? "muncul di publik" : "tersembunyi dari publik"}
              </span>
            </span>
          </button>

          {error && (
            <div className="rounded-md border border-status-dangerBorder bg-status-dangerBg px-3 py-2 text-[12px] text-status-dangerFg">
              {error}
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" hierarchy="secondary" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button
            type="submit"
            hierarchy="primary"
            disabled={submitting}
            prefixIcon={
              submitting ? (
                <Icon name="spinner" size={12} className="animate-spin" />
              ) : (
                <Icon name="save" size={12} />
              )
            }
          >
            {submitting ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      </form>
    </div>
  );
};

// ImportLayoutModal — modal upload ZIP, parse + upload images + create
// template baru, lalu callback onDone dengan template baru (auto-suffix nama).
interface ImportModalProps {
  existingNames: string[];
  existingCodes: string[];
  onClose: () => void;
  onDone: (tpl: Template) => void;
}

const ImportLayoutModal: React.FC<ImportModalProps> = ({ existingNames, existingCodes, onClose, onDone }) => {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleImport = async () => {
    if (!file) {
      setErrorMsg("Pilih file ZIP dulu.");
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    try {
      // 1. Parse ZIP + upload images + rewrite + regen ID
      const result = await importLayoutZip(file, setProgress);

      // 2. Auto-suffix nama supaya tidak bentrok existing
      const finalName = suffixIfTaken(result.name, existingNames);

      // 3. Pastikan code juga unik (slug dari final name + suffix random kalau bentrok)
      let finalCode = slugify(finalName);
      if (!finalCode) finalCode = `imported-${Date.now()}`;
      if (existingCodes.includes(finalCode)) {
        finalCode = `${finalCode}-${Date.now().toString(36).slice(-5)}`;
      }

      // 4. Create template baru
      const { id } = await adminCreateTemplate({
        code: finalCode,
        name: finalName,
        type_template: "page",
        slug: finalCode,
        is_active: false, // safer: tidak auto-aktifkan, operator review dulu di builder
      });

      // 5. Save layout JSON
      await adminSaveLayout(id, result.blocks);

      // 6. Callback dengan template "virtual" — onDone akan navigate ke builder.
      // Field minimal yg dibutuhkan untuk AdminLandingBuilder: id, name, code.
      const nowIso = new Date().toISOString();
      onDone({
        id,
        code: finalCode,
        name: finalName,
        type_template: "page",
        slug: finalCode,
        is_active: false,
        created_at: nowIso,
        updated_at: nowIso,
      });
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Import gagal.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={busy ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[560px] max-h-[90vh] overflow-y-auto rounded-[16px] bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-serif text-[18px] tracking-[-0.01em] text-brand">Import Layout ZIP</h3>
            <p className="mt-1 text-[12px] leading-5 text-ink-soft">
              ZIP berisi <code className="font-mono">layout.json</code> + folder{" "}
              <code className="font-mono">images/</code>. Image akan di-upload otomatis,
              ID block di-regenerate, dan referensi master (slider/menu/footer)
              dikosongkan — pilih ulang di Properties Panel setelah import.
            </p>
          </div>
          <button
            type="button"
            onClick={busy ? undefined : onClose}
            className="rounded p-1 text-ink-tertiary hover:bg-paper-cream disabled:opacity-50"
            disabled={busy}
          >
            <Icon name="x" size={14} />
          </button>
        </div>

        <div className="mb-3">
          <label className="block text-[12px] font-semibold text-brand mb-1.5">File ZIP</label>
          <input
            type="file"
            accept=".zip,application/zip"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={busy}
            className="block w-full text-[13px] file:mr-3 file:rounded-md file:border-0 file:bg-brand-deep file:px-3 file:py-2 file:text-[12px] file:font-semibold file:text-white hover:file:opacity-90 disabled:opacity-50"
          />
        </div>

        {progress && busy && (
          <div className="mb-3 rounded-md border border-line-sand bg-paper-cream/40 px-3 py-2">
            <div className="flex items-center gap-2 text-[12px] text-brand">
              <Icon name="spinner" size={12} className="animate-spin" />
              <span className="font-semibold capitalize">{progress.step}</span>
              {progress.total > 0 && (
                <span className="text-ink-muted">
                  ({progress.current}/{progress.total})
                </span>
              )}
            </div>
            <div className="mt-1 text-[11px] text-ink-soft truncate">{progress.message}</div>
            {progress.total > 0 && (
              <div className="mt-1 h-1 w-full overflow-hidden rounded bg-line-sand">
                <div
                  className="h-full bg-brand-deep transition-all"
                  style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                />
              </div>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="mb-3 rounded-md border border-status-dangerBorder bg-status-dangerBg px-3 py-2 text-[12px] text-status-dangerFg">
            {errorMsg}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button type="button" hierarchy="secondary" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button
            type="button"
            hierarchy="primary"
            onClick={handleImport}
            disabled={busy || !file}
            prefixIcon={busy ? <Icon name="spinner" size={12} className="animate-spin" /> : <Icon name="upload" size={12} />}
          >
            {busy ? "Memproses…" : "Import"}
          </Button>
        </div>
      </div>
    </div>
  );
};

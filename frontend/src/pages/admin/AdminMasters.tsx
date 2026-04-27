import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@idds/react";
import { Icon } from "../../components/Icon";
import { Field, TextInput } from "../../components/formKit";
import { Badge } from "../../components/data/Badge";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useToast } from "../../components/Toast";
import { RichTextEditor } from "../../components/RichTextEditor";
import { MediaPicker } from "../../components/MediaPicker";
import { MenuBuilder } from "./landing/MenuBuilder";
import {
  ApiError,
  adminListTemplates,
  adminGetTemplate,
  adminCreateTemplate,
  adminDeleteTemplate,
  adminAddTemplateItem,
  adminUpdateTemplateItem,
  adminDeleteTemplateItem,
} from "../../api";
import type { Template, TemplateValue } from "../../types/cms";

type MasterType = "slider" | "menu" | "footer";

interface ItemField {
  key: string;
  label: string;
  type: "text" | "textarea" | "url" | "richtext" | "image";
  placeholder?: string;
}

// Field definition per master type. Items disimpan di tr_template_values
// dengan value=JSON string. Form ini render input per field, di-serialize
// jadi JSON saat save.
const ITEM_FIELDS: Record<MasterType, ItemField[]> = {
  slider: [
    { key: "image_url", label: "Gambar Slide", type: "image", placeholder: "/uploads/x.jpg" },
    { key: "caption", label: "Caption (Title)", type: "text" },
    { key: "subtitle", label: "Subtitle", type: "text" },
    { key: "link", label: "Link URL", type: "url", placeholder: "/about" },
  ],
  menu: [
    { key: "label", label: "Label", type: "text", placeholder: "Beranda" },
    { key: "url", label: "URL", type: "url", placeholder: "/" },
  ],
  footer: [
    { key: "title", label: "Heading", type: "text", placeholder: "Tentang Kami" },
    { key: "content", label: "Content", type: "richtext" },
  ],
};

const TYPE_LABELS: Record<MasterType, { single: string; plural: string }> = {
  slider: { single: "Slider", plural: "Sliders" },
  menu: { single: "Menu Navbar", plural: "Menus" },
  footer: { single: "Footer Widget", plural: "Footers" },
};

// AdminMasters — page dengan 3 tab (Sliders/Menus/Footers). Tiap tab
// pakai layout master-detail: list master di kiri, items di kanan.
export const AdminMasters: React.FC = () => {
  const [tab, setTab] = useState<MasterType>("slider");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 rounded-[14px] border border-line-sand bg-white p-1">
        {(["slider", "menu", "footer"] as MasterType[]).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-[10px] px-3 py-2 text-[13px] font-semibold transition ${
                active ? "bg-brand-deep text-white" : "text-ink-tertiary hover:text-brand-deep"
              }`}
            >
              {TYPE_LABELS[t].plural}
            </button>
          );
        })}
      </div>

      <MasterDetail key={tab} type={tab} />
    </div>
  );
};

// previewText — convert HTML / data URL ke plain text singkat untuk preview
// di list item. Strip tags, decode entities umum, redact data:image base64
// jadi placeholder, normalize whitespace, batasi panjang.
const previewText = (raw: string): string => {
  if (!raw) return "(kosong)";
  let t = raw
    // Replace data:image base64 (super long) dengan placeholder ringkas
    .replace(/<img[^>]+src=["']data:image\/[^"']+["'][^>]*>/gi, "[gambar inline]")
    .replace(/<img[^>]+>/gi, "[gambar]")
    // Strip tag HTML
    .replace(/<[^>]*>/g, " ")
    // Decode entity umum
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length > 160) t = t.slice(0, 157) + "…";
  return t || "(kosong)";
};

// MasterDetail — list master + detail panel untuk edit items.
const MasterDetail: React.FC<{ type: MasterType }> = ({ type }) => {
  const labels = TYPE_LABELS[type];
  const [list, setList] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [items, setItems] = useState<TemplateValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const toast = useToast();

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminListTemplates({ type_template: type });
      setList(res);
      if (res.length > 0 && !selected) setSelected(res[0]);
      else if (res.length === 0) setSelected(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat daftar.");
    } finally {
      setLoading(false);
    }
  }, [type, selected]);

  const loadItems = useCallback(async (templateID: number) => {
    try {
      const tpl = await adminGetTemplate(templateID);
      setItems(
        (tpl.values || [])
          .filter((v) => v.key.startsWith("item_"))
          .sort((a, b) => a.order - b.order),
      );
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (selected) loadItems(selected.id);
    else setItems([]);
  }, [selected, loadItems]);

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      {/* List master */}
      <div className="rounded-[16px] border border-line-sand bg-white">
        <div className="flex items-center justify-between border-b border-line-sand px-4 py-3">
          <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Daftar
          </span>
          <Button
            type="button"
            hierarchy="primary"
            size="sm"
            onClick={() => setCreating(true)}
            prefixIcon={<Icon name="plus" size={11} />}
          >
            Baru
          </Button>
        </div>
        {loading ? (
          <div className="px-4 py-6 text-sm text-ink-muted">Memuat…</div>
        ) : list.length === 0 ? (
          <div className="px-4 py-6 text-sm text-ink-muted">
            Belum ada {labels.single}.
          </div>
        ) : (
          <ul className="max-h-[60vh] overflow-y-auto">
            {list.map((tpl) => {
              const active = selected?.id === tpl.id;
              return (
                <li key={tpl.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(tpl)}
                    className={`flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition ${
                      active
                        ? "border-brand-deep bg-paper-cream/60"
                        : "border-transparent hover:bg-paper-cream/30"
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-paper-cream text-brand-deep">
                      <Icon name="file" size={14} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-brand">
                        {tpl.name}
                      </span>
                      <span className="block truncate font-mono text-[10px] text-ink-muted">
                        ID {tpl.id} · {tpl.code}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {error && (
          <div className="border-t border-status-dangerBorder bg-status-dangerBg px-4 py-2 text-[12px] text-status-dangerFg">
            {error}
          </div>
        )}
      </div>

      {/* Detail panel */}
      <div>
        {selected ? (
          type === "menu" ? (
            <MenuBuilderWrapper
              template={selected}
              items={items}
              onItemsChanged={() => loadItems(selected.id)}
              onTemplateDeleted={() => {
                setSelected(null);
                loadList();
              }}
              typeLabel={labels.single}
            />
          ) : (
            <ItemsManager
              template={selected}
              items={items}
              fields={ITEM_FIELDS[type]}
              typeLabel={labels.single}
              onItemsChanged={() => loadItems(selected.id)}
              onTemplateDeleted={() => {
                setSelected(null);
                loadList();
              }}
            />
          )
        ) : (
          <div className="rounded-[16px] border border-line-sand bg-white px-5 py-10 text-center text-sm text-ink-muted">
            Pilih atau buat {labels.single} di kiri untuk mulai mengelola item.
          </div>
        )}
      </div>

      {creating && (
        <CreateMasterModal
          type={type}
          typeLabel={labels.single}
          onClose={() => setCreating(false)}
          onCreated={(tpl) => {
            setCreating(false);
            setSelected(tpl);
            toast.success(`${labels.single} "${tpl.name}" dibuat.`);
            loadList();
          }}
        />
      )}
    </div>
  );
};

// MenuBuilderWrapper — bridge antara AdminMasters dan MenuBuilder.
// Tugasnya: handle confirm dialog untuk delete master + delete cascade items.
const MenuBuilderWrapper: React.FC<{
  template: Template;
  items: TemplateValue[];
  typeLabel: string;
  onItemsChanged: () => void;
  onTemplateDeleted: () => void;
}> = ({ template, items, typeLabel, onItemsChanged, onTemplateDeleted }) => {
  const toast = useToast();
  const [confirmMasterDelete, setConfirmMasterDelete] = useState(false);

  const handleConfirmMasterDelete = async () => {
    try {
      await adminDeleteTemplate(template.id);
      toast.success(`${typeLabel} "${template.name}" terhapus.`);
      onTemplateDeleted();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal menghapus master.");
      throw err;
    }
  };

  return (
    <>
      <MenuBuilder
        template={template}
        items={items}
        onChanged={onItemsChanged}
        onTemplateDeleted={onTemplateDeleted}
        onRequestMasterDelete={() => setConfirmMasterDelete(true)}
      />
      {confirmMasterDelete && (
        <ConfirmDialog
          title={`Hapus ${typeLabel} "${template.name}"?`}
          message={
            <>
              Master ini beserta <strong>{items.length} item</strong> akan dihapus permanen.
              Block navbar di builder yang memakai ID master ini akan jadi broken.
            </>
          }
          confirmLabel="Hapus Master"
          tone="danger"
          onConfirm={handleConfirmMasterDelete}
          onClose={() => setConfirmMasterDelete(false)}
        />
      )}
    </>
  );
};

// ItemsManager — kelola item di template selected (CRUD per item).
const ItemsManager: React.FC<{
  template: Template;
  items: TemplateValue[];
  fields: ItemField[];
  typeLabel: string;
  onItemsChanged: () => void;
  onTemplateDeleted: () => void;
}> = ({ template, items, fields, typeLabel, onItemsChanged, onTemplateDeleted }) => {
  const [editing, setEditing] = useState<{
    mode: "new" | "edit";
    itemID?: number;
    data: Record<string, string>;
  } | null>(null);
  const [confirmItemDelete, setConfirmItemDelete] = useState<TemplateValue | null>(null);
  const [confirmMasterDelete, setConfirmMasterDelete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const openNew = () =>
    setEditing({
      mode: "new",
      data: Object.fromEntries(fields.map((f) => [f.key, ""])),
    });

  const openEdit = (item: TemplateValue) => {
    let data: Record<string, string> = {};
    try {
      const parsed = JSON.parse(item.value || "{}");
      data = Object.fromEntries(
        fields.map((f) => [f.key, String(parsed[f.key] ?? "")]),
      );
    } catch {
      data = Object.fromEntries(fields.map((f) => [f.key, ""]));
    }
    setEditing({ mode: "edit", itemID: item.id, data });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = JSON.stringify(editing.data);
      if (editing.mode === "new") {
        await adminAddTemplateItem(template.id, payload);
        toast.success("Item ditambahkan.");
      } else if (editing.itemID) {
        await adminUpdateTemplateItem(template.id, editing.itemID, payload);
        toast.success("Item diperbarui.");
      }
      setEditing(null);
      onItemsChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan item.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmItemDelete = async () => {
    if (!confirmItemDelete) return;
    try {
      await adminDeleteTemplateItem(template.id, confirmItemDelete.id);
      toast.success("Item terhapus.");
      onItemsChanged();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Gagal menghapus.";
      toast.error(msg);
      setError(msg);
      throw err;
    }
  };

  const handleConfirmMasterDelete = async () => {
    try {
      await adminDeleteTemplate(template.id);
      toast.success(`${typeLabel} "${template.name}" terhapus.`);
      onTemplateDeleted();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Gagal menghapus master.";
      toast.error(msg);
      setError(msg);
      throw err;
    }
  };

  return (
    <div className="rounded-[16px] border border-line-sand bg-white">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line-sand px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-[1.1rem] tracking-[-0.01em] text-brand">{template.name}</h2>
            <Badge variant={template.is_active ? "success" : "neutral"}>
              {template.is_active ? "Aktif" : "Non-aktif"}
            </Badge>
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-ink-muted">
            Code: {template.code} · ID: {template.id} · Untuk dipakai di builder, pakai ID ini di properties picker.
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" hierarchy="primary" size="sm" onClick={openNew} prefixIcon={<Icon name="plus" size={12} />}>
            Tambah Item
          </Button>
          <Button type="button" hierarchy="secondary" size="sm" onClick={() => setConfirmMasterDelete(true)} prefixIcon={<Icon name="trash" size={12} />}>
            Hapus Master
          </Button>
        </div>
      </div>

      {/* Items list — overflow-y di-batasi supaya kalau banyak item tidak
          bikin scroll page utama panjang. Inner card scroll independen. */}
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto px-5 py-4">
        {error && (
          <div className="mb-3 rounded-md border border-status-dangerBorder bg-status-dangerBg px-3 py-2 text-[13px] text-status-dangerFg">
            {error}
          </div>
        )}
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed border-line-sand bg-paper-cream/40 px-4 py-8 text-center text-sm text-ink-muted">
            Belum ada item. Klik "Tambah Item" untuk mulai.
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => {
              let preview = "";
              try {
                const parsed = JSON.parse(item.value || "{}");
                const raw = String(parsed[fields[0].key] || parsed[fields[1]?.key || ""] || "(kosong)");
                preview = previewText(raw);
              } catch {
                preview = previewText(item.value);
              }
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-md border border-line-sand bg-paper-cream/30 px-3 py-2"
                >
                  <span className="shrink-0 font-mono text-[10px] text-ink-muted">{item.key}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-brand">{preview}</span>
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="rounded-md border border-line-sand bg-white p-1.5 text-ink-tertiary hover:border-brand-deep hover:text-brand-deep"
                    aria-label="Edit"
                  >
                    <Icon name="edit" size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmItemDelete(item)}
                    className="rounded-md border border-status-dangerBorder bg-white p-1.5 text-status-dangerFg hover:bg-status-dangerBg"
                    aria-label="Hapus"
                  >
                    <Icon name="trash" size={12} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editing && (
        <ItemEditModal
          fields={fields}
          mode={editing.mode}
          data={editing.data}
          onChange={(data) => setEditing({ ...editing, data })}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          submitting={submitting}
        />
      )}

      {confirmItemDelete && (
        <ConfirmDialog
          title="Hapus item ini?"
          message="Item akan dihapus permanen dari master ini. Aksi tidak bisa dibatalkan."
          confirmLabel="Hapus"
          tone="danger"
          onConfirm={handleConfirmItemDelete}
          onClose={() => setConfirmItemDelete(null)}
        />
      )}

      {confirmMasterDelete && (
        <ConfirmDialog
          title={`Hapus ${typeLabel} "${template.name}"?`}
          message={
            <>
              Master ini beserta <strong>{items.length} item</strong> di dalamnya akan dihapus permanen.
              Block di builder yang memakai ID master ini akan jadi broken.
            </>
          }
          confirmLabel="Hapus Master"
          tone="danger"
          onConfirm={handleConfirmMasterDelete}
          onClose={() => setConfirmMasterDelete(false)}
        />
      )}
    </div>
  );
};

// CreateMasterModal — modal untuk buat master baru (code, name).
const CreateMasterModal: React.FC<{
  type: MasterType;
  typeLabel: string;
  onClose: () => void;
  onCreated: (tpl: Template) => void;
}> = ({ type, typeLabel, onClose, onCreated }) => {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setError("Code dan Name wajib diisi.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await adminCreateTemplate({
        code: code.trim().toLowerCase().replace(/\s+/g, "-"),
        name: name.trim(),
        type_template: type,
        is_active: true,
      });
      const tpl = await adminGetTemplate(res.id);
      onCreated(tpl);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal membuat.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-[20px] bg-white p-6 shadow-[0_30px_80px_rgba(15,30,61,0.25)]"
      >
        <h3 className="font-serif text-[1.2rem] tracking-[-0.01em] text-brand">
          Tambah {typeLabel}
        </h3>
        <div className="mt-4 space-y-3">
          <Field label="Code" required hint="Identifier unik, hanya huruf kecil + dash">
            <TextInput value={code} onChange={setCode} placeholder="hero-slider" />
          </Field>
          <Field label="Name" required>
            <TextInput value={name} onChange={setName} placeholder="Hero Slider" />
          </Field>
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
          <Button type="submit" hierarchy="primary" disabled={submitting}>
            {submitting ? "Menyimpan…" : "Buat"}
          </Button>
        </div>
      </form>
    </div>
  );
};

// ItemEditModal — modal generic untuk add/edit item dengan field config.
const ItemEditModal: React.FC<{
  fields: ItemField[];
  mode: "new" | "edit";
  data: Record<string, string>;
  onChange: (data: Record<string, string>) => void;
  onSave: () => void;
  onCancel: () => void;
  submitting: boolean;
}> = ({ fields, mode, data, onChange, onSave, onCancel, submitting }) => {
  // pickerForKey — state field key yang sedang buka MediaPicker
  // (mendukung multiple image field per type kalau di kemudian hari ada).
  const [pickerForKey, setPickerForKey] = useState<string | null>(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-[20px] bg-white p-6 shadow-[0_30px_80px_rgba(15,30,61,0.25)]"
      >
        <h3 className="font-serif text-[1.2rem] tracking-[-0.01em] text-brand">
          {mode === "new" ? "Tambah Item" : "Edit Item"}
        </h3>
        <div className="mt-4 space-y-3">
          {fields.map((f) => (
            <Field key={f.key} label={f.label}>
              {f.type === "richtext" ? (
                <RichTextEditor
                  value={data[f.key] || ""}
                  onChange={(html) => onChange({ ...data, [f.key]: html })}
                  variant="full"
                  placeholder={f.placeholder || "Tulis konten…"}
                  minHeight={160}
                />
              ) : f.type === "textarea" ? (
                <textarea
                  className="w-full rounded-md border border-line-sand bg-white px-3 py-2 text-sm text-brand focus:border-brand-deep focus:outline-none focus:ring-2 focus:ring-brand-deep/15"
                  rows={4}
                  value={data[f.key] || ""}
                  onChange={(e) => onChange({ ...data, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                />
              ) : f.type === "image" ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <TextInput
                      value={data[f.key] || ""}
                      onChange={(v) => onChange({ ...data, [f.key]: v })}
                      placeholder={f.placeholder || "/uploads/foo.jpg"}
                    />
                    <button
                      type="button"
                      onClick={() => setPickerForKey(f.key)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line-sand bg-white px-3 text-[12px] font-semibold text-brand-deep transition hover:border-brand-deep"
                      title="Pilih dari Media Library"
                    >
                      <Icon name="image" size={12} /> Pilih
                    </button>
                  </div>
                  {data[f.key] && (
                    <div className="overflow-hidden rounded-md border border-line-sand">
                      <img
                        src={data[f.key]}
                        alt="Preview"
                        className="h-32 w-full object-cover"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <TextInput
                  value={data[f.key] || ""}
                  onChange={(v) => onChange({ ...data, [f.key]: v })}
                  placeholder={f.placeholder}
                />
              )}
            </Field>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" hierarchy="secondary" onClick={onCancel} disabled={submitting}>
            Batal
          </Button>
          <Button type="button" hierarchy="primary" onClick={onSave} disabled={submitting}>
            {submitting ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      </div>

      {pickerForKey && (
        <MediaPicker
          mimePrefix="image/"
          onSelect={(m) => onChange({ ...data, [pickerForKey]: m.url })}
          onClose={() => setPickerForKey(null)}
        />
      )}
    </div>
  );
};

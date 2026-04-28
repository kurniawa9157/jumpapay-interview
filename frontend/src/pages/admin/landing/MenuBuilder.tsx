import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@idds/react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Icon } from "../../../components/Icon";
import { Field, TextInput, Select } from "../../../components/formKit";
import { useToast } from "../../../components/Toast";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { useModalClose } from "../../../hooks/useModalClose";
import {
  ApiError,
  adminAddTemplateItem,
  adminDeleteTemplateItem,
  adminUpdateTemplateItem,
  adminReorderTemplateItems,
  adminListPosts,
} from "../../../api";
import type { Template, TemplateValue, Post } from "../../../types/cms";

// Schema item menu — disimpan sebagai JSON di tr_template_values.value.
// parent_id null = top-level. Mengacu ke tr_template_values.id item lain.
// Support 1 level submenu (parent + children) untuk simplicity.
interface MenuItem {
  label: string;
  url: string;
  target?: "_self" | "_blank";
  parent_id?: number | null;
}

interface ParsedItem {
  raw: TemplateValue;
  data: MenuItem;
}

const parseItem = (v: TemplateValue): ParsedItem => {
  let data: MenuItem;
  try {
    const obj = JSON.parse(v.value || "{}");
    data = {
      label: String(obj.label || ""),
      url: String(obj.url || ""),
      target: obj.target === "_blank" ? "_blank" : "_self",
      parent_id: obj.parent_id ?? null,
    };
  } catch {
    data = { label: "(rusak)", url: "", target: "_self", parent_id: null };
  }
  return { raw: v, data };
};

interface Props {
  template: Template;
  items: TemplateValue[];
  onChanged: () => void;
  onTemplateDeleted: () => void;
  onRequestMasterDelete: () => void;
}

// MenuBuilder — UI khusus type='menu' dengan left panel (presets) + right
// panel (tree dengan reorder/indent/outdent). Replace generic ItemsManager
// untuk memberikan UX yang lebih ringkas seperti CMS WordPress.
export const MenuBuilder: React.FC<Props> = ({
  template,
  items,
  onChanged,
  onRequestMasterDelete,
}) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<ParsedItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ParsedItem | null>(null);

  // Posts untuk picker. Lazy load on mount.
  const [pages, setPages] = useState<Post[]>([]);
  const [news, setNews] = useState<Post[]>([]);
  useEffect(() => {
    adminListPosts({ type: "page", limit: 100, status: "published" })
      .then((r) => setPages(r.posts || []))
      .catch(() => setPages([]));
    adminListPosts({ type: "post", limit: 100, status: "published" })
      .then((r) => setNews(r.posts || []))
      .catch(() => setNews([]));
  }, []);

  const parsed = useMemo(
    () => [...items].sort((a, b) => a.order - b.order).map(parseItem),
    [items],
  );

  // ── Tree rendering: top-level (parent_id null) + children ──
  const topLevel = parsed.filter((p) => !p.data.parent_id);
  const childrenOf = (id: number) =>
    parsed.filter((p) => p.data.parent_id === id);

  const addItem = useCallback(
    async (data: MenuItem) => {
      if (busy) return;
      setBusy(true);
      try {
        await adminAddTemplateItem(template.id, JSON.stringify(data));
        toast.success(`"${data.label}" ditambahkan ke menu.`);
        onChanged();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Gagal menambah.");
      } finally {
        setBusy(false);
      }
    },
    [template.id, busy, toast, onChanged],
  );

  const updateItem = useCallback(
    async (item: ParsedItem, patch: Partial<MenuItem>) => {
      const merged = { ...item.data, ...patch };
      try {
        await adminUpdateTemplateItem(
          template.id,
          item.raw.id,
          JSON.stringify(merged),
        );
        onChanged();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Gagal update.");
        throw err;
      }
    },
    [template.id, onChanged, toast],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmDelete) return;
    try {
      // Hapus children dulu kalau ini parent.
      const kids = childrenOf(confirmDelete.raw.id);
      for (const k of kids) {
        await adminDeleteTemplateItem(template.id, k.raw.id);
      }
      await adminDeleteTemplateItem(template.id, confirmDelete.raw.id);
      toast.success(
        kids.length > 0
          ? `"${confirmDelete.data.label}" + ${kids.length} sub-item terhapus.`
          : `"${confirmDelete.data.label}" terhapus.`,
      );
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal hapus.");
      throw err;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmDelete, template.id, toast, onChanged, parsed]);

  const reorder = useCallback(
    async (ids: number[]) => {
      try {
        await adminReorderTemplateItems(template.id, ids);
        onChanged();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Gagal reorder.");
      }
    },
    [template.id, onChanged, toast],
  );

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Drag-drop reorder dalam siblings yang sama (parent_id sama). Cross-
  // parent drag di-reject — pakai indent/outdent button untuk pindah parent.
  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;
      if (!over || active.id === over.id) return;
      const activeItem = parsed.find((p) => p.raw.id === Number(active.id));
      const overItem = parsed.find((p) => p.raw.id === Number(over.id));
      if (!activeItem || !overItem) return;
      const aParent = activeItem.data.parent_id ?? null;
      const oParent = overItem.data.parent_id ?? null;
      if (aParent !== oParent) return; // cross-parent — reject

      const siblings = parsed.filter((p) => (p.data.parent_id ?? null) === aParent);
      const fromIdx = siblings.findIndex((s) => s.raw.id === activeItem.raw.id);
      const toIdx = siblings.findIndex((s) => s.raw.id === overItem.raw.id);
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;

      const reordered = [...siblings];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);

      // Rebuild full order array (preserving non-sibling positions).
      const queue = [...reordered];
      const newFull: ParsedItem[] = [];
      for (const p of parsed) {
        if ((p.data.parent_id ?? null) === aParent) {
          const next = queue.shift();
          if (next) newFull.push(next);
        } else {
          newFull.push(p);
        }
      }
      reorder(newFull.map((p) => p.raw.id));
    },
    [parsed, reorder],
  );

  // moveUp/Down — swap position dengan sibling sebelum/sesudah dalam parent
  // yang sama. Semua sibling lain stay; cuma 2 ID yang ditukar.
  const moveSibling = useCallback(
    (item: ParsedItem, direction: "up" | "down") => {
      const parentID = item.data.parent_id ?? null;
      const siblings = parsed.filter((p) => (p.data.parent_id ?? null) === parentID);
      const idx = siblings.findIndex((s) => s.raw.id === item.raw.id);
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (idx < 0 || targetIdx < 0 || targetIdx >= siblings.length) return;
      // Build full ordering: siblings di-swap, lalu rest tetap relatif.
      const siblingsSwapped = [...siblings];
      [siblingsSwapped[idx], siblingsSwapped[targetIdx]] = [
        siblingsSwapped[targetIdx],
        siblingsSwapped[idx],
      ];
      // Rebuild full array preserving siblings order baru + non-sibling pos.
      const newOrder: ParsedItem[] = [];
      const swappedQueue = [...siblingsSwapped];
      for (const p of parsed) {
        if ((p.data.parent_id ?? null) === parentID) {
          const next = swappedQueue.shift();
          if (next) newOrder.push(next);
        } else {
          newOrder.push(p);
        }
      }
      reorder(newOrder.map((p) => p.raw.id));
    },
    [parsed, reorder],
  );

  // Indent — jadikan child dari sibling sebelumnya. Hanya jalan kalau:
  //   - punya prev sibling di level yang sama, dan
  //   - prev sibling itu top-level (depth 0). Item ini juga harus depth 0.
  // (1 level submenu only.)
  const indent = useCallback(
    (item: ParsedItem) => {
      if (item.data.parent_id) return; // sudah child, max depth 1
      const top = parsed.filter((p) => !p.data.parent_id);
      const idx = top.findIndex((t) => t.raw.id === item.raw.id);
      if (idx <= 0) return; // tidak ada prev top-level
      // Pastikan prev top-level bukan jadi child setelah ini (it stays parent).
      const newParent = top[idx - 1].raw.id;
      // Cek prev tidak punya parent (memang top-level — sudah dipastikan).
      updateItem(item, { parent_id: newParent });
    },
    [parsed, updateItem],
  );

  // Outdent — keluarkan dari parent (jadi top-level lagi).
  const outdent = useCallback(
    (item: ParsedItem) => {
      if (!item.data.parent_id) return;
      updateItem(item, { parent_id: null });
    },
    [updateItem],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* Left panel — presets */}
      <div className="rounded-[16px] border border-line-sand bg-white">
        <div className="border-b border-line-sand px-4 py-3 text-center text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          Add Menu Items
        </div>
        <div className="space-y-4 p-4">
          <PostPickerForm
            label="Article Page"
            placeholder="-- Pilih Page --"
            posts={pages}
            disabled={busy}
            onAdd={(post) =>
              addItem({
                label: post.title,
                url: `/p/${post.slug}`,
                target: "_self",
                parent_id: null,
              })
            }
          />
          <PostPickerForm
            label="Article News"
            placeholder="-- Pilih News --"
            posts={news}
            disabled={busy}
            onAdd={(post) =>
              addItem({
                label: post.title,
                url: `/p/${post.slug}`,
                target: "_self",
                parent_id: null,
              })
            }
          />
          <CustomLinkForm disabled={busy} onAdd={addItem} />
        </div>
      </div>

      {/* Right panel — tree */}
      <div className="rounded-[16px] border border-line-sand bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line-sand px-5 py-3">
          <div>
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Menu Structure
            </span>
            <div className="mt-0.5 font-mono text-[11px] text-ink-muted">
              {template.name} · ID {template.id} · {parsed.length} item
            </div>
          </div>
          <Button
            type="button"
            hierarchy="secondary"
            size="sm"
            onClick={onRequestMasterDelete}
            prefixIcon={<Icon name="trash" size={12} />}
          >
            Hapus Master
          </Button>
        </div>
        {/* Inner scroll — kalau menu banyak item, scroll di dalam card
            saja, tidak push page utama jadi panjang. */}
        <div className="max-h-[calc(100vh-280px)] overflow-y-auto px-3 py-3">
          {parsed.length === 0 ? (
            <div className="rounded-md border border-dashed border-line-sand bg-paper-cream/30 px-4 py-10 text-center text-sm text-ink-muted">
              Menu masih kosong. Tambahkan item dari panel kiri.
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={parsed.map((p) => p.raw.id)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-1.5">
                  {topLevel.map((p, idx) => (
                    <MenuItemRow
                      key={p.raw.id}
                      item={p}
                      depth={0}
                      isFirst={idx === 0}
                      isLast={idx === topLevel.length - 1}
                      canIndent={idx > 0}
                      canOutdent={false}
                      onEdit={() => setEditing(p)}
                      onDelete={() => setConfirmDelete(p)}
                      onMoveUp={() => moveSibling(p, "up")}
                      onMoveDown={() => moveSibling(p, "down")}
                      onIndent={() => indent(p)}
                      onOutdent={() => outdent(p)}
                    >
                      {childrenOf(p.raw.id).map((c, cidx, all) => (
                        <MenuItemRow
                          key={c.raw.id}
                          item={c}
                          depth={1}
                          isFirst={cidx === 0}
                          isLast={cidx === all.length - 1}
                          canIndent={false}
                          canOutdent
                          onEdit={() => setEditing(c)}
                          onDelete={() => setConfirmDelete(c)}
                          onMoveUp={() => moveSibling(c, "up")}
                          onMoveDown={() => moveSibling(c, "down")}
                          onIndent={() => indent(c)}
                          onOutdent={() => outdent(c)}
                        />
                      ))}
                    </MenuItemRow>
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
          <div className="mt-3 flex items-center gap-2 rounded-md border border-status-infoBorder bg-status-infoBg px-3 py-2 text-[12px] text-status-infoFg">
            <Icon name="info" size={13} />
            Drag <Icon name="grip" size={11} className="inline" /> untuk reorder dalam siblings, →
            untuk jadikan sub-menu, ← untuk keluarkan.
          </div>
        </div>
      </div>

      {editing && (
        <EditMenuItemModal
          item={editing}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            try {
              await updateItem(editing, patch);
              toast.success("Menu item diperbarui.");
              setEditing(null);
            } catch {
              /* error sudah di-toast */
            }
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={`Hapus "${confirmDelete.data.label}"?`}
          message={
            childrenOf(confirmDelete.raw.id).length > 0
              ? `Item ini punya ${childrenOf(confirmDelete.raw.id).length} sub-menu. Semua akan ikut terhapus.`
              : "Item akan dihapus permanen dari menu."
          }
          confirmLabel="Hapus"
          tone="danger"
          onConfirm={handleConfirmDelete}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
};

// MenuItemRow — single row (top atau child), lengkap dengan toolbar action.
const MenuItemRow: React.FC<{
  item: ParsedItem;
  depth: 0 | 1;
  isFirst: boolean;
  isLast: boolean;
  canIndent: boolean;
  canOutdent: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onIndent: () => void;
  onOutdent: () => void;
  children?: React.ReactNode;
}> = ({
  item,
  depth,
  isFirst,
  isLast,
  canIndent,
  canOutdent,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onIndent,
  onOutdent,
  children,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.raw.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
  <li ref={setNodeRef} style={style}>
    <div
      className={`flex flex-wrap items-center gap-2 rounded-md border border-line-sand bg-paper-cream/30 px-3 py-2 ${
        depth === 1 ? "ml-6 border-l-4 border-l-brand-deep/40" : ""
      } ${isDragging ? "shadow-[0_10px_28px_rgba(15,30,61,0.18)]" : ""}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-ink-muted hover:text-brand-deep active:cursor-grabbing"
        aria-label="Drag untuk reorder"
        title="Drag untuk pindah dalam siblings"
      >
        <Icon name="grip" size={14} />
      </button>
      <span className="rounded-md bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
        {depth === 0 ? "link" : "sub"}
      </span>
      <span className="flex-1 truncate text-[13px] font-semibold text-brand">
        {item.data.label}{" "}
        <span className="font-mono text-[11px] font-normal text-ink-muted">
          ({item.data.url})
        </span>
        {item.data.target === "_blank" && (
          <span className="ml-2 text-[10px] text-ink-muted">↗ tab baru</span>
        )}
      </span>
      <div className="flex items-center gap-0.5">
        <IconBtn icon="arrowUp" label="Naik" onClick={onMoveUp} disabled={isFirst} />
        <IconBtn icon="arrowDown" label="Turun" onClick={onMoveDown} disabled={isLast} />
        <IconBtn icon="arrowRight" label="Jadikan sub-menu" onClick={onIndent} disabled={!canIndent} />
        <IconBtn icon="chevronLeft" label="Keluarkan dari sub" onClick={onOutdent} disabled={!canOutdent} />
        <span className="mx-1 h-4 w-px bg-line-sand" />
        <IconBtn icon="edit" label="Edit" onClick={onEdit} />
        <IconBtn icon="trash" label="Hapus" tone="danger" onClick={onDelete} />
      </div>
    </div>
    {children && <ul className="mt-1.5 space-y-1.5">{children}</ul>}
  </li>
  );
};

const IconBtn: React.FC<{
  icon: React.ComponentProps<typeof Icon>["name"];
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}> = ({ icon, label, onClick, disabled, tone = "default" }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={label}
    aria-label={label}
    className={`inline-flex h-7 w-7 items-center justify-center rounded transition disabled:opacity-30 ${
      tone === "danger"
        ? "text-status-dangerFg hover:bg-status-dangerBg"
        : "text-ink-tertiary hover:bg-white hover:text-brand-deep"
    }`}
  >
    <Icon name={icon} size={12} />
  </button>
);

// PostPickerForm — dropdown post + button +
const PostPickerForm: React.FC<{
  label: string;
  placeholder: string;
  posts: Post[];
  disabled: boolean;
  onAdd: (post: Post) => void;
}> = ({ label, placeholder, posts, disabled, onAdd }) => {
  const [selected, setSelected] = useState<string>("");
  const handleAdd = () => {
    const post = posts.find((p) => String(p.id) === selected);
    if (post) {
      onAdd(post);
      setSelected("");
    }
  };
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <Select
          value={selected}
          onChange={setSelected}
          options={[
            { value: "", label: placeholder },
            ...posts.map((p) => ({ value: String(p.id), label: p.title })),
          ]}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled || !selected}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-white transition hover:opacity-90 disabled:opacity-40"
          title="Tambah ke menu"
          aria-label="Tambah"
        >
          <Icon name="plus" size={14} />
        </button>
      </div>
    </Field>
  );
};

// CustomLinkForm — URL + Label + target select + button +
const CustomLinkForm: React.FC<{
  disabled: boolean;
  onAdd: (data: MenuItem) => void;
}> = ({ disabled, onAdd }) => {
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [target, setTarget] = useState<"_self" | "_blank">("_self");
  const handleAdd = () => {
    if (!url.trim() || !label.trim()) return;
    onAdd({
      label: label.trim(),
      url: url.trim(),
      target,
      parent_id: null,
    });
    setUrl("");
    setLabel("");
    setTarget("_self");
  };
  return (
    <Field label="Custom Link">
      <div className="space-y-2">
        <TextInput
          value={url}
          onChange={setUrl}
          placeholder="URL (https://… atau #section)"
        />
        <TextInput value={label} onChange={setLabel} placeholder="Label" />
        <div className="flex gap-2">
          <Select
            value={target}
            onChange={(v) => setTarget(v as "_self" | "_blank")}
            options={[
              { value: "_self", label: "Same tab" },
              { value: "_blank", label: "New tab" },
            ]}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={disabled || !url.trim() || !label.trim()}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-white transition hover:opacity-90 disabled:opacity-40"
            title="Tambah ke menu"
            aria-label="Tambah"
          >
            <Icon name="plus" size={14} />
          </button>
        </div>
      </div>
    </Field>
  );
};

// EditMenuItemModal — edit label/url/target sebuah item.
const EditMenuItemModal: React.FC<{
  item: ParsedItem;
  onClose: () => void;
  onSave: (patch: Partial<MenuItem>) => Promise<void> | void;
}> = ({ item, onClose, onSave }) => {
  useModalClose(onClose);
  const [label, setLabel] = useState(item.data.label);
  const [url, setUrl] = useState(item.data.url);
  const [target, setTarget] = useState<"_self" | "_blank">(
    item.data.target || "_self",
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!label.trim() || !url.trim()) return;
    setSubmitting(true);
    try {
      await onSave({ label: label.trim(), url: url.trim(), target });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] rounded-[20px] bg-white p-6 shadow-[0_30px_80px_rgba(15,30,61,0.25)]"
      >
        <h3 className="font-serif text-[1.2rem] tracking-[-0.01em] text-brand">
          Edit Menu Item
        </h3>
        <div className="mt-4 space-y-3">
          <Field label="Label" required>
            <TextInput value={label} onChange={setLabel} placeholder="Beranda" />
          </Field>
          <Field label="URL" required>
            <TextInput value={url} onChange={setUrl} placeholder="/ atau #beranda" />
          </Field>
          <Field label="Target">
            <Select
              value={target}
              onChange={(v) => setTarget(v as "_self" | "_blank")}
              options={[
                { value: "_self", label: "Same tab" },
                { value: "_blank", label: "New tab" },
              ]}
            />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" hierarchy="secondary" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button type="button" hierarchy="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      </div>
    </div>
  );
};

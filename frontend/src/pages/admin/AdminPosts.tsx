import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@idds/react";
import { Icon } from "../../components/Icon";
import { Field, TextInput, Select } from "../../components/formKit";
import { Badge } from "../../components/data/Badge";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useToast } from "../../components/Toast";
import { RichTextEditor } from "../../components/RichTextEditor";
import { MediaPicker } from "../../components/MediaPicker";
import { PostPageBuilder } from "./PostPageBuilder";
import {
  ApiError,
  adminListPosts,
  adminCreatePost,
  adminUpdatePost,
  adminDeletePost,
} from "../../api";
import type { Post } from "../../types/cms";
import type { AdminCreatePostInput } from "../../api";

type Filter = "all" | "post" | "page";

// AdminPosts — CRUD post (article + page) untuk article_grid block.
// View modes:
//   - 'list' (default): tabel posts + form modal
//   - 'builder': full-screen page builder untuk edit page_layout suatu post
export const AdminPosts: React.FC = () => {
  const [view, setView] = useState<{ kind: "list" } | { kind: "builder"; post: Post }>({
    kind: "list",
  });
  const [filter, setFilter] = useState<Filter>("all");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ mode: "new" | "edit"; post?: Post } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Post | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminListPosts({
        type: filter === "all" ? undefined : filter,
        limit: 50,
        page: 1,
      });
      setPosts(res.posts || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat post.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load, reloadTick]);

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      await adminDeletePost(confirmDelete.id);
      toast.success(`Post "${confirmDelete.title}" terhapus.`);
      setReloadTick((v) => v + 1);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Gagal menghapus.";
      toast.error(msg);
      throw err; // biar dialog tetap terbuka
    }
  };

  // Render full-screen page builder kalau user klik "Edit Layout".
  if (view.kind === "builder") {
    return (
      <PostPageBuilder
        postID={view.post.id}
        postTitle={view.post.title}
        onBack={() => {
          setView({ kind: "list" });
          setReloadTick((v) => v + 1);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-line-sand bg-white p-4">
        <div className="flex gap-1 rounded-full border border-line-sand bg-white p-1">
          {(["all", "post", "page"] as Filter[]).map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                  active ? "bg-brand-deep text-white" : "text-ink-tertiary hover:text-brand-deep"
                }`}
              >
                {f === "all" ? "Semua" : f === "post" ? "Post / News" : "Page"}
              </button>
            );
          })}
        </div>
        <Button
          type="button"
          hierarchy="primary"
          size="sm"
          onClick={() => setEditing({ mode: "new" })}
          prefixIcon={<Icon name="plus" size={12} />}
        >
          Tambah Post
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-status-dangerBorder bg-status-dangerBg px-4 py-3 text-sm text-status-dangerFg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-[16px] border border-line-sand bg-white px-5 py-6 text-sm text-ink-muted">
          Memuat…
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-[16px] border border-line-sand bg-white px-5 py-10 text-center text-sm text-ink-muted">
          Belum ada post.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-line-sand bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line-sand bg-table-headerBg text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                <th className="px-4 py-3">Judul</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Diterbitkan</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-t border-line-sand/60 hover:bg-table-rowHover">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-brand">{p.title}</div>
                    <div className="font-mono text-[11px] text-ink-muted">/{p.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-ink-tertiary">{p.type}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        p.status === "published"
                          ? "success"
                          : p.status === "draft"
                          ? "warn"
                          : "neutral"
                      }
                    >
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-ink-tertiary">
                    {p.published_at
                      ? new Date(p.published_at).toLocaleDateString("id-ID", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {p.type === "page" && (
                        <button
                          type="button"
                          onClick={() => setView({ kind: "builder", post: p })}
                          className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition ${
                            p.use_builder
                              ? "border border-brand-deep bg-brand-deep text-white hover:opacity-90"
                              : "border border-brand-deep/40 bg-paper-cream text-brand-deep hover:border-brand-deep"
                          }`}
                          title={
                            p.use_builder
                              ? "Edit page sections (builder mode aktif)"
                              : "Aktifkan + edit page sections"
                          }
                        >
                          Edit Layout
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditing({ mode: "edit", post: p })}
                        className="rounded-md border border-line-sand bg-white p-1.5 text-ink-tertiary hover:border-brand-deep hover:text-brand-deep"
                        aria-label="Edit"
                      >
                        <Icon name="edit" size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(p)}
                        className="rounded-md border border-status-dangerBorder bg-white p-1.5 text-status-dangerFg hover:bg-status-dangerBg"
                        aria-label="Hapus"
                      >
                        <Icon name="trash" size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <PostFormModal
          mode={editing.mode}
          post={editing.post}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            toast.success(
              editing.mode === "new"
                ? `Post "${saved.title}" dibuat.`
                : `Post "${saved.title}" diperbarui.`,
            );
            setEditing(null);
            setReloadTick((v) => v + 1);
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={`Hapus "${confirmDelete.title}"?`}
          message={
            <>
              Aksi ini tidak bisa dibatalkan. Post akan dihapus permanen dari database
              {confirmDelete.status === "published" && (
                <>
                  {" "}dan <strong>tidak akan muncul lagi</strong> di public landing
                </>
              )}
              .
            </>
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

// slugify — convert title ke URL-safe slug. Strip diakritik (untuk teks ID
// yang kebanyakan tanpa aksen tetap aman), lowercase, replace whitespace +
// non-alfanumerik dengan dash, collapse multiple dash, trim leading/trailing.
const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove diakritik
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const PostFormModal: React.FC<{
  mode: "new" | "edit";
  post?: Post;
  onClose: () => void;
  onSaved: (saved: { title: string }) => void;
}> = ({ mode, post, onClose, onSaved }) => {
  const [form, setForm] = useState<AdminCreatePostInput>({
    slug: post?.slug || "",
    title: post?.title || "",
    excerpt: post?.excerpt ?? "",
    content: post?.content ?? "",
    cover_image: post?.cover_image ?? "",
    cover_aspect: post?.cover_aspect || "auto",
    use_builder: post?.use_builder || false,
    page_layout: post?.page_layout ?? null,
    type: post?.type || "post",
    status: post?.status || "draft",
    tags: post?.tags ?? "",
  });
  // editingSlug — kalau false, slug auto-derive dari title. Kalau true, slug
  // di-edit manual oleh user (atau load dari existing post di edit mode).
  const [editingSlug, setEditingSlug] = useState(mode === "edit");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);

  const handleTitleChange = (v: string) => {
    setForm((f) => ({
      ...f,
      title: v,
      // Auto-update slug hanya kalau user belum manual edit (new mode default).
      slug: editingSlug ? f.slug : slugify(v),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Auto-derive final slug kalau user kosongin atau belum di-edit
    const finalSlug = (form.slug || slugify(form.title)).trim();
    if (!form.title.trim() || !finalSlug) {
      setError("Title wajib diisi.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: AdminCreatePostInput = {
        ...form,
        slug: finalSlug,
        title: form.title.trim(),
        excerpt: form.excerpt?.trim() || null,
        content: form.content?.trim() || null,
        cover_image: form.cover_image?.trim() || null,
        tags: form.tags?.trim() || null,
      };
      if (mode === "new") await adminCreatePost(payload);
      else if (post) await adminUpdatePost(post.id, payload);
      onSaved({ title: payload.title });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan post.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-8"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-[640px] flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_30px_80px_rgba(15,30,61,0.25)]"
      >
        <div className="border-b border-line-sand px-6 py-4">
          <h2 className="font-serif text-[1.2rem] tracking-[-0.01em] text-brand">
            {mode === "new" ? "Tambah Post" : `Edit — ${post?.title}`}
          </h2>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <Field label="Title" required>
            <TextInput value={form.title} onChange={handleTitleChange} />
          </Field>
          <div className="flex items-center justify-between gap-2 rounded-md border border-line-sand bg-paper-cream/30 px-3 py-2 text-[12px]">
            <span className="text-ink-muted">URL slug:</span>
            {editingSlug ? (
              <input
                type="text"
                value={form.slug}
                onChange={(e) =>
                  setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })
                }
                className="flex-1 rounded border border-line-sand bg-white px-2 py-1 font-mono text-[12px] text-brand focus:border-brand-deep focus:outline-none"
                placeholder="auto-dari-title"
              />
            ) : (
              <code className="flex-1 truncate font-mono text-brand">
                /{form.slug || slugify(form.title) || "(otomatis dari title)"}
              </code>
            )}
            <button
              type="button"
              onClick={() => {
                if (editingSlug) {
                  // Reset ke auto kalau klik balik
                  setForm((f) => ({ ...f, slug: slugify(f.title) }));
                  setEditingSlug(false);
                } else {
                  setEditingSlug(true);
                }
              }}
              className="shrink-0 text-[11px] font-semibold text-brand-deep hover:underline"
            >
              {editingSlug ? "Reset auto" : "Edit"}
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type">
              <Select
                value={form.type}
                onChange={(v) => setForm({ ...form, type: v as "post" | "page" })}
                options={[
                  { value: "post", label: "Post / News" },
                  { value: "page", label: "Page (statis)" },
                ]}
              />
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onChange={(v) => setForm({ ...form, status: v as "draft" | "published" | "archived" })}
                options={[
                  { value: "draft", label: "Draft" },
                  { value: "published", label: "Published" },
                  { value: "archived", label: "Archived" },
                ]}
              />
            </Field>
          </div>

          {/* Toggle Page Builder — hanya muncul untuk type=page. */}
          {form.type === "page" && (
            <div className="flex items-start gap-3 rounded-md border border-line-sand bg-paper-cream/30 px-4 py-3">
              <input
                id="use-builder-toggle"
                type="checkbox"
                checked={!!form.use_builder}
                onChange={(e) => setForm({ ...form, use_builder: e.target.checked })}
                className="mt-0.5 h-4 w-4 cursor-pointer accent-brand-deep"
              />
              <label htmlFor="use-builder-toggle" className="flex-1 cursor-pointer">
                <div className="text-[13px] font-semibold text-brand">Gunakan Page Builder</div>
                <div className="mt-0.5 text-[11px] leading-5 text-ink-muted">
                  {form.use_builder
                    ? "Konten halaman akan dirender dari layout builder. Edit sections via tombol \"Edit Layout\" di list. RichTextEditor di bawah disembunyikan."
                    : "Konten halaman dirender dari RichTextEditor di bawah (HTML). Aktifkan untuk pakai page sections (slider, card grid, dll)."}
                </div>
              </label>
            </div>
          )}
          <Field label="Cover Image URL" hint="Pilih dari Media Library atau paste URL manual">
            <div className="flex gap-2">
              <TextInput
                value={form.cover_image || ""}
                onChange={(v) => setForm({ ...form, cover_image: v })}
                placeholder="/uploads/cover.jpg"
              />
              <button
                type="button"
                onClick={() => setCoverPickerOpen(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line-sand bg-white px-3 text-[12px] font-semibold text-brand-deep transition hover:border-brand-deep"
                title="Pilih dari Media Library"
              >
                <Icon name="image" size={12} /> Pilih
              </button>
            </div>
            {form.cover_image && (
              <div className="mt-2 overflow-hidden rounded-md border border-line-sand">
                <img src={form.cover_image} alt="Cover preview" className="h-32 w-full object-cover" />
              </div>
            )}
          </Field>
          {form.cover_image && (
            <Field
              label="Tinggi Cover (di halaman detail)"
              hint="Persentase tinggi terhadap lebar. Auto = ukuran asli image."
            >
              <Select
                value={form.cover_aspect || "auto"}
                onChange={(v) => setForm({ ...form, cover_aspect: v })}
                options={[
                  { value: "auto", label: "Auto (ukuran asli)" },
                  { value: "30", label: "30% — sangat rendah" },
                  { value: "40", label: "40% — pendek" },
                  { value: "50", label: "50% — 2:1 panorama" },
                  { value: "56.25", label: "56.25% — 16:9 widescreen" },
                  { value: "66.66", label: "66.66% — 3:2 photo" },
                  { value: "75", label: "75% — 4:3 klasik" },
                  { value: "100", label: "100% — 1:1 kotak" },
                ]}
              />
            </Field>
          )}
          <Field label="Excerpt" hint="Ringkasan singkat (1-2 kalimat). Plain text saja.">
            <textarea
              className="w-full rounded-md border border-line-sand bg-white px-3 py-2 text-sm text-brand focus:border-brand-deep focus:outline-none focus:ring-2 focus:ring-brand-deep/15"
              rows={2}
              value={form.excerpt || ""}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            />
          </Field>
          {form.use_builder && form.type === "page" ? (
            <div className="rounded-md border border-status-infoBorder bg-status-infoBg px-4 py-3 text-[13px] text-status-infoFg">
              <Icon name="info" size={13} className="mr-1 inline" />
              Page Builder aktif. Edit page sections via tombol{" "}
              <strong>Edit Layout</strong> di list (warna brand-deep solid).
              {mode === "new" && (
                <span className="block mt-1 text-[11px]">
                  (Simpan post ini dulu, lalu kembali ke list.)
                </span>
              )}
            </div>
          ) : (
            <Field label="Content" hint="WYSIWYG. Insert gambar via tombol di toolbar (ambil dari Media Library).">
              <RichTextEditor
                value={form.content || ""}
                onChange={(html) => setForm({ ...form, content: html })}
                variant="full"
                placeholder="Mulai tulis artikel di sini…"
                minHeight={260}
              />
            </Field>
          )}
          <Field label="Tags" hint="Pisah dengan koma, mis. teknologi, produk, tips">
            <TextInput value={form.tags || ""} onChange={(v) => setForm({ ...form, tags: v })} />
          </Field>

          {error && (
            <div className="rounded-md border border-status-dangerBorder bg-status-dangerBg px-3 py-2 text-[13px] text-status-dangerFg">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line-sand bg-paper-cream/30 px-6 py-4">
          <Button type="button" hierarchy="secondary" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button type="submit" hierarchy="primary" disabled={submitting}>
            {submitting ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      </form>

      {coverPickerOpen && (
        <MediaPicker
          mimePrefix="image/"
          onSelect={(m) => setForm((f) => ({ ...f, cover_image: m.url }))}
          onClose={() => setCoverPickerOpen(false)}
        />
      )}
    </div>
  );
};

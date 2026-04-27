import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@idds/react";
import { Icon } from "../../components/Icon";
import { Field, TextInput, Select } from "../../components/formKit";
import { Badge } from "../../components/data/Badge";
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
export const AdminPosts: React.FC = () => {
  const [filter, setFilter] = useState<Filter>("all");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ mode: "new" | "edit"; post?: Post } | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

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

  const handleDelete = async (p: Post) => {
    if (!confirm(`Hapus "${p.title}"?`)) return;
    try {
      await adminDeletePost(p.id);
      setReloadTick((v) => v + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menghapus.");
    }
  };

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
                        onClick={() => handleDelete(p)}
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
          onSaved={() => {
            setEditing(null);
            setReloadTick((v) => v + 1);
          }}
        />
      )}
    </div>
  );
};

const PostFormModal: React.FC<{
  mode: "new" | "edit";
  post?: Post;
  onClose: () => void;
  onSaved: () => void;
}> = ({ mode, post, onClose, onSaved }) => {
  const [form, setForm] = useState<AdminCreatePostInput>({
    slug: post?.slug || "",
    title: post?.title || "",
    excerpt: post?.excerpt ?? "",
    content: post?.content ?? "",
    cover_image: post?.cover_image ?? "",
    type: post?.type || "post",
    status: post?.status || "draft",
    tags: post?.tags ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.slug.trim()) {
      setError("Slug dan Title wajib diisi.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: AdminCreatePostInput = {
        ...form,
        slug: form.slug.trim(),
        title: form.title.trim(),
        excerpt: form.excerpt?.trim() || null,
        content: form.content?.trim() || null,
        cover_image: form.cover_image?.trim() || null,
        tags: form.tags?.trim() || null,
      };
      if (mode === "new") await adminCreatePost(payload);
      else if (post) await adminUpdatePost(post.id, payload);
      onSaved();
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" required>
              <TextInput value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
            </Field>
            <Field label="Slug" required hint="URL-friendly, lowercase">
              <TextInput value={form.slug} onChange={(v) => setForm({ ...form, slug: v.toLowerCase().replace(/\s+/g, "-") })} />
            </Field>
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
          <Field label="Cover Image URL" hint="Upload via Media Library, paste URL hasil di sini">
            <TextInput value={form.cover_image || ""} onChange={(v) => setForm({ ...form, cover_image: v })} placeholder="/uploads/cover.jpg" />
          </Field>
          <Field label="Excerpt" hint="Ringkasan singkat (1-2 kalimat)">
            <textarea
              className="w-full rounded-md border border-line-sand bg-white px-3 py-2 text-sm text-brand focus:border-brand-deep focus:outline-none focus:ring-2 focus:ring-brand-deep/15"
              rows={2}
              value={form.excerpt || ""}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            />
          </Field>
          <Field label="Content (HTML)">
            <textarea
              className="w-full rounded-md border border-line-sand bg-white px-3 py-2 font-mono text-sm text-brand focus:border-brand-deep focus:outline-none focus:ring-2 focus:ring-brand-deep/15"
              rows={10}
              value={form.content || ""}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="<p>Konten artikel...</p>"
            />
          </Field>
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
    </div>
  );
};

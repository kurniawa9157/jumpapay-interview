import React, { useEffect, useState } from "react";
import { Button } from "@idds/react";
import { Icon } from "../../components/Icon";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useToast } from "../../components/Toast";
import { useNavigationGuard } from "../../hooks/useNavigationGuard";
import {
  ApiError,
  adminGetPost,
  adminUpdatePost,
  getPublicTemplateBySlug,
} from "../../api";
import type { Post } from "../../types/cms";
import type { BuilderComponent, ComponentType } from "../../types/builder.types";
import { useBuilder } from "../../hooks/useBuilder";
import { BlockRenderer } from "../../components/BlockRenderer";
import { ComponentPalette } from "./landing/ComponentPalette";
import { BuilderCanvas } from "./landing/BuilderCanvas";
import { PropertiesPanel } from "./landing/PropertiesPanel";

interface Props {
  postID: number;
  postTitle: string;
  onBack: () => void;
}

// Type yang TIDAK boleh ditambah di page builder — navbar + footer karena
// sudah dihandle homepage layout. Admin tidak boleh duplikat di page level.
const PAGE_BUILDER_EXCLUDE: ComponentType[] = ["navbar", "footer"];

// PostPageBuilder — full-screen view untuk edit page_layout suatu post.
// Pattern sama dengan AdminLandingBuilder: load post → parse page_layout
// JSON → render 3-panel → save kembali via PATCH /admin/posts/:id.
//
// Yang berbeda dari AdminLandingBuilder:
//  1. Save target = adminUpdatePost (PATCH post), bukan adminSaveLayout
//  2. ComponentPalette di-filter exclude navbar+footer
//  3. Saat save, ikut update use_builder=true (in case admin baru pertama
//     kali aktifkan builder mode lewat tombol di list)
export const PostPageBuilder: React.FC<Props> = ({ postID, postTitle, onBack }) => {
  const toast = useToast();
  const {
    components,
    selected,
    selectedId,
    isDirty,
    setSelectedId,
    addComponent,
    removeComponent,
    duplicateComponent,
    updateProp,
    moveComponent,
    loadLayout,
    markSaved,
  } = useBuilder();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [confirmBack, setConfirmBack] = useState(false);
  // Navbar + footer ghost dari homepage layout supaya admin lihat konteks
  // saat edit. Ghost = pointer-events-none + opacity rendah, label "From
  // Homepage" untuk jelas asal-nya.
  const [ghostNavbar, setGhostNavbar] = useState<BuilderComponent | null>(null);
  const [ghostFooter, setGhostFooter] = useState<BuilderComponent | null>(null);

  const pendingRemove = pendingRemoveId
    ? components.find((c) => c.id === pendingRemoveId) || null
    : null;

  // Fetch homepage layout sekali untuk ekstrak ghost navbar/footer.
  useEffect(() => {
    let cancelled = false;
    getPublicTemplateBySlug("/")
      .then((tpl) => {
        if (cancelled) return;
        const lv = (tpl.values || []).find((v) => v.key === "layout");
        if (!lv?.value) return;
        try {
          const blocks = JSON.parse(lv.value) as BuilderComponent[];
          if (!Array.isArray(blocks)) return;
          setGhostNavbar(blocks.find((b) => b.type === "navbar") || null);
          for (let i = blocks.length - 1; i >= 0; i--) {
            if (blocks[i].type === "footer") {
              setGhostFooter(blocks[i]);
              break;
            }
          }
        } catch {
          /* ignore parse error */
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await adminGetPost(postID);
        if (cancelled) return;
        setPost(p);
        if (p.page_layout) {
          try {
            const parsed = JSON.parse(p.page_layout);
            if (Array.isArray(parsed)) loadLayout(parsed as BuilderComponent[]);
            else loadLayout([]);
          } catch {
            loadLayout([]);
          }
        } else {
          loadLayout([]);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Gagal memuat post.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [postID, loadLayout]);

  const handleSave = async () => {
    if (!post) return;
    setSaving(true);
    setError(null);
    try {
      await adminUpdatePost(post.id, {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        cover_image: post.cover_image,
        cover_aspect: post.cover_aspect || "auto",
        use_builder: true,
        page_layout: JSON.stringify(components),
        type: post.type,
        status: post.status,
        tags: post.tags,
      });
      markSaved();
      toast.success("Layout halaman tersimpan.");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Gagal menyimpan layout.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (isDirty) setConfirmBack(true);
    else onBack();
  };

  // Warn user kalau leave dengan unsaved changes (browser tab close).
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Register guard untuk in-app navigation (sidebar nav klik).
  useNavigationGuard(isDirty);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-160px)] items-center justify-center text-sm text-ink-muted">
        Memuat layout halaman…
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex h-[calc(100vh-160px)] flex-col items-center justify-center gap-3 text-sm text-ink-muted">
        <p>{error || "Post tidak ditemukan."}</p>
        <Button type="button" hierarchy="secondary" size="sm" onClick={onBack}>
          Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-160px)] flex-col overflow-hidden rounded-[12px] border border-line-sand bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-line-sand bg-paper-cream/30 px-4 py-2.5">
        <Button
          type="button"
          hierarchy="tertiary"
          size="sm"
          onClick={handleBack}
          prefixIcon={<Icon name="chevronLeft" size={12} />}
        >
          Kembali
        </Button>
        <div className="min-w-0 flex-1">
          <span className="truncate text-[13px] font-semibold text-brand">{postTitle}</span>
          <span className="ml-2 text-[11px] text-ink-muted">/ Page Builder</span>
          {isDirty && <span className="ml-2 text-[11px] text-status-warnFg">● Unsaved</span>}
        </div>
        {error && <span className="text-[11px] text-status-dangerFg">{error}</span>}
        <Button
          type="button"
          hierarchy="primary"
          size="sm"
          onClick={handleSave}
          disabled={saving || !isDirty}
          prefixIcon={
            saving ? (
              <Icon name="spinner" size={12} className="animate-spin" />
            ) : (
              <Icon name="save" size={12} />
            )
          }
        >
          {saving ? "Menyimpan…" : "Save Layout"}
        </Button>
      </div>

      {/* 3-panel */}
      <div className="flex flex-1 overflow-hidden">
        <ComponentPalette
          onAdd={addComponent}
          exclude={PAGE_BUILDER_EXCLUDE}
          hint="Navbar & Footer otomatis dari halaman utama. Tidak perlu ditambah lagi di sini."
        />
        <div className="flex flex-1 flex-col overflow-hidden bg-paper-cream/40">
          {ghostNavbar && <Ghost block={ghostNavbar} label="Navbar (dari halaman utama)" />}
          <BuilderCanvas
            components={components}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRemove={(id) => setPendingRemoveId(id)}
            onDuplicate={duplicateComponent}
            onMove={moveComponent}
          />
          {ghostFooter && <Ghost block={ghostFooter} label="Footer (dari halaman utama)" />}
        </div>
        <PropertiesPanel component={selected} updateProp={updateProp} />
      </div>

      {pendingRemove && (
        <ConfirmDialog
          title="Hapus block ini?"
          message="Block + seluruh konfigurasi-nya akan dihapus dari layout. Aksi tidak bisa di-undo."
          confirmLabel="Hapus Block"
          tone="danger"
          onConfirm={() => {
            removeComponent(pendingRemove.id);
            toast.success("Block dihapus.");
          }}
          onClose={() => setPendingRemoveId(null)}
        />
      )}

      {confirmBack && (
        <ConfirmDialog
          title="Tinggalkan tanpa simpan?"
          message={
            <>
              Ada perubahan yang <strong>belum disimpan</strong>. Lanjut kembali → perubahan layout
              hilang.
            </>
          }
          confirmLabel="Tinggalkan"
          cancelLabel="Tetap di sini"
          tone="warn"
          onConfirm={() => {
            setConfirmBack(false);
            onBack();
          }}
          onClose={() => setConfirmBack(false)}
        />
      )}
    </div>
  );
};

// Ghost — render block (navbar/footer) sebagai preview konteks. Non-
// interactive (pointer-events-none). Label badge di sudut menunjukkan
// asal-nya. Maksimal scale-95 + opacity untuk visual cue "ini bukan
// area edit, ini cuma frame".
const Ghost: React.FC<{ block: BuilderComponent; label: string }> = ({ block, label }) => (
  <div className="relative shrink-0 select-none">
    <span className="absolute left-3 top-1.5 z-10 rounded bg-brand-deep/85 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white shadow">
      {label}
    </span>
    <div className="pointer-events-none origin-top opacity-70" style={{ filter: "saturate(0.85)" }}>
      <BlockRenderer layout={[block]} />
    </div>
  </div>
);


import React, { useEffect, useState } from "react";
import { Button } from "@idds/react";
import { Icon } from "../../../components/Icon";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { useToast } from "../../../components/Toast";
import { useNavigationGuard } from "../../../hooks/useNavigationGuard";
import {
  ApiError,
  adminGetTemplate,
  adminSaveLayout,
} from "../../../api";
import type { BuilderComponent } from "../../../types/builder.types";
import { COMPONENT_LABELS } from "../../../types/builder.types";
import { useBuilder } from "../../../hooks/useBuilder";
import { ComponentPalette } from "./ComponentPalette";
import { BuilderCanvas } from "./BuilderCanvas";
import { PropertiesPanel } from "./PropertiesPanel";

interface Props {
  templateID: number;
  templateName: string;
  onBack: () => void;
}

// AdminLandingBuilder — 3-panel builder UI untuk edit template page layout.
// Toolbar di atas (back + nama + save). Konten = palette | canvas | properties.
export const AdminLandingBuilder: React.FC<Props> = ({ templateID, templateName, onBack }) => {
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [confirmBack, setConfirmBack] = useState(false);
  const toast = useToast();

  const pendingRemove = pendingRemoveId
    ? components.find((c) => c.id === pendingRemoveId) || null
    : null;

  // Load layout dari template_values key='layout'.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tpl = await adminGetTemplate(templateID);
        if (cancelled) return;
        const layoutValue = (tpl.values || []).find((v) => v.key === "layout");
        if (layoutValue && layoutValue.value) {
          try {
            const parsed = JSON.parse(layoutValue.value);
            if (Array.isArray(parsed)) loadLayout(parsed as BuilderComponent[]);
            else loadLayout([]);
          } catch {
            loadLayout([]);
          }
        } else {
          loadLayout([]);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Gagal memuat layout.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [templateID, loadLayout]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await adminSaveLayout(templateID, components);
      markSaved();
      toast.success("Layout tersimpan.");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Gagal menyimpan layout.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (isDirty) {
      setConfirmBack(true);
    } else {
      onBack();
    }
  };

  // Warn user kalau leave dengan unsaved changes (browser-level).
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
        Memuat layout…
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-160px)] flex-col overflow-hidden rounded-[12px] border border-line-sand bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-line-sand bg-paper-cream/30 px-4 py-2.5">
        <Button type="button" hierarchy="tertiary" size="sm" onClick={handleBack} prefixIcon={<Icon name="chevronLeft" size={12} />}>
          Kembali
        </Button>
        <div className="min-w-0 flex-1">
          <span className="truncate text-[13px] font-semibold text-brand">{templateName}</span>
          {isDirty && <span className="ml-2 text-[11px] text-status-warnFg">● Unsaved</span>}
        </div>
        {error && <span className="text-[11px] text-status-dangerFg">{error}</span>}
        <Button
          type="button"
          hierarchy="primary"
          size="sm"
          onClick={handleSave}
          disabled={saving || !isDirty}
          prefixIcon={saving ? <Icon name="spinner" size={12} className="animate-spin" /> : <Icon name="save" size={12} />}
        >
          {saving ? "Menyimpan…" : "Save Layout"}
        </Button>
      </div>

      {/* 3-panel */}
      <div className="flex flex-1 overflow-hidden">
        <ComponentPalette onAdd={addComponent} />
        <BuilderCanvas
          components={components}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onRemove={(id) => setPendingRemoveId(id)}
          onDuplicate={duplicateComponent}
          onMove={moveComponent}
        />
        <PropertiesPanel component={selected} updateProp={updateProp} />
      </div>

      {pendingRemove && (
        <ConfirmDialog
          title={`Hapus block "${COMPONENT_LABELS[pendingRemove.type]}"?`}
          message="Block beserta seluruh konfigurasi-nya akan dihapus dari layout. Aksi tidak bisa di-undo (perlu ulang dari awal kalau salah)."
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
              Ada perubahan yang <strong>belum disimpan</strong>. Kalau lanjut kembali, semua perubahan
              di canvas akan hilang.
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

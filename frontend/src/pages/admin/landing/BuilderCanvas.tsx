import React from "react";
import { Icon } from "../../../components/Icon";
import {
  type BuilderComponent,
  COMPONENT_LABELS,
} from "../../../types/builder.types";
import { CanvasPreview } from "./CanvasPreview";

interface Props {
  components: BuilderComponent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMove: (from: number, to: number) => void;
}

// BuilderCanvas — center pane. List blocks dengan toolbar (move/dup/delete).
// Click block → select → properties di kanan aktif.
export const BuilderCanvas: React.FC<Props> = ({
  components,
  selectedId,
  onSelect,
  onRemove,
  onDuplicate,
  onMove,
}) => {
  if (components.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center bg-paper-cream/40">
        <div className="text-center">
          <p className="font-serif text-lg text-brand">Canvas Kosong</p>
          <p className="mt-1 text-sm text-ink-muted">
            Klik component dari panel kiri untuk menambahkan block.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto bg-paper-cream/40 p-4">
      {components.map((comp, idx) => {
        const isSelected = selectedId === comp.id;
        return (
          <div
            key={comp.id}
            onClick={() => onSelect(comp.id)}
            className={`group relative cursor-pointer rounded-lg border-2 bg-white transition-all ${
              isSelected
                ? "border-brand-deep shadow-[0_10px_30px_rgba(15,30,61,0.15)]"
                : "border-line-sand hover:border-brand-deep/40"
            }`}
          >
            {/* Action bar */}
            <div className="flex items-center justify-between border-b border-line-sand bg-paper-cream/40 px-3 py-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                {COMPONENT_LABELS[comp.type]}
              </span>
              <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(idx, idx - 1);
                  }}
                  disabled={idx === 0}
                  className="rounded p-1 hover:bg-paper-cream disabled:opacity-30"
                  aria-label="Pindah ke atas"
                >
                  <Icon name="arrowUp" size={12} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(idx, idx + 1);
                  }}
                  disabled={idx === components.length - 1}
                  className="rounded p-1 hover:bg-paper-cream disabled:opacity-30"
                  aria-label="Pindah ke bawah"
                >
                  <Icon name="arrowDown" size={12} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(comp.id);
                  }}
                  className="rounded p-1 hover:bg-paper-cream"
                  aria-label="Duplikat"
                >
                  <Icon name="copy" size={12} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Hapus block ini?")) onRemove(comp.id);
                  }}
                  className="rounded p-1 text-status-dangerFg hover:bg-status-dangerBg"
                  aria-label="Hapus"
                >
                  <Icon name="trash" size={12} />
                </button>
              </div>
            </div>

            {/* Preview */}
            <div className="p-3">
              <CanvasPreview component={comp} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

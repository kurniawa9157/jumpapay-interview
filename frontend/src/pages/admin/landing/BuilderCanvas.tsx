import React from "react";
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

// BuilderCanvas — center pane. Drag-drop reorder via grip handle, plus
// fallback ↑↓ button untuk keyboard-only / accessibility users.
export const BuilderCanvas: React.FC<Props> = ({
  components,
  selectedId,
  onSelect,
  onRemove,
  onDuplicate,
  onMove,
}) => {
  // Sensor: pointer (mouse/touch) + keyboard. Activation distance 5px supaya
  // klik-to-select tidak ke-trigger drag tanpa sengaja.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = components.findIndex((c) => c.id === active.id);
    const to = components.findIndex((c) => c.id === over.id);
    if (from < 0 || to < 0) return;
    onMove(from, to);
  };

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
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={components.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {components.map((comp, idx) => (
            <SortableBlock
              key={comp.id}
              comp={comp}
              idx={idx}
              total={components.length}
              isSelected={selectedId === comp.id}
              onSelect={onSelect}
              onRemove={onRemove}
              onDuplicate={onDuplicate}
              onMove={onMove}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
};

const SortableBlock: React.FC<{
  comp: BuilderComponent;
  idx: number;
  total: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMove: (from: number, to: number) => void;
}> = ({ comp, idx, total, isSelected, onSelect, onRemove, onDuplicate, onMove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: comp.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(comp.id)}
      className={`group relative cursor-pointer rounded-lg border-2 bg-white transition-all ${
        isSelected
          ? "border-brand-deep shadow-[0_10px_30px_rgba(15,30,61,0.15)]"
          : "border-line-sand hover:border-brand-deep/40"
      } ${isDragging ? "shadow-[0_18px_42px_rgba(15,30,61,0.22)]" : ""}`}
    >
      {/* Action bar */}
      <div className="flex items-center justify-between border-b border-line-sand bg-paper-cream/40 px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          {/* Drag handle — listeners hanya di sini supaya klik area lain
              tetap select block, bukan drag. */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="cursor-grab rounded p-1 text-ink-muted hover:bg-paper-cream hover:text-brand-deep active:cursor-grabbing"
            aria-label="Drag untuk reorder"
            title="Drag untuk pindah block"
          >
            <Icon name="grip" size={14} />
          </button>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
            {COMPONENT_LABELS[comp.type]}
          </span>
        </div>
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
            disabled={idx === total - 1}
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
              onRemove(comp.id);
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
};

import React from "react";
import { Icon, type IconName } from "../../../components/Icon";
import {
  type ComponentType,
  COMPONENT_LABELS,
} from "../../../types/builder.types";

const PALETTE_ITEMS: { type: ComponentType; icon: IconName }[] = [
  { type: "navbar", icon: "menu" },
  { type: "slider", icon: "image" },
  { type: "html_block", icon: "code" },
  { type: "card_grid", icon: "dashboard" },
  { type: "image_block", icon: "image" },
  { type: "article_grid", icon: "list" },
  { type: "footer", icon: "building" },
];

interface Props {
  onAdd: (type: ComponentType) => void;
}

export const ComponentPalette: React.FC<Props> = ({ onAdd }) => (
  <div className="w-[200px] shrink-0 overflow-y-auto border-r border-line-sand bg-paper-cream/40 p-3">
    <p className="px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-muted">
      Component
    </p>
    <div className="mt-2 space-y-1.5">
      {PALETTE_ITEMS.map(({ type, icon }) => (
        <button
          key={type}
          type="button"
          onClick={() => onAdd(type)}
          className="flex w-full items-center gap-2 rounded-md border border-line-sand bg-white px-3 py-2 text-left text-[12px] text-ink-tertiary transition hover:border-brand-deep hover:bg-paper-cream"
        >
          <Icon name={icon} size={14} />
          <span>{COMPONENT_LABELS[type]}</span>
        </button>
      ))}
    </div>
  </div>
);

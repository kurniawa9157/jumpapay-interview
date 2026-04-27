import React from "react";
import { Icon } from "../Icon";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<Props> = ({ value, onChange, placeholder = "Cari…", className = "" }) => (
  <div className={`relative ${className}`}>
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">
      <Icon name="search" size={14} />
    </span>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-line-sand bg-white py-2 pl-9 pr-3 text-sm text-brand placeholder:text-ink-muted focus:border-brand-deep focus:outline-none focus:ring-2 focus:ring-brand-deep/15"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange("")}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-muted hover:text-brand-deep"
        aria-label="Bersihkan pencarian"
      >
        <Icon name="x" size={12} />
      </button>
    )}
  </div>
);

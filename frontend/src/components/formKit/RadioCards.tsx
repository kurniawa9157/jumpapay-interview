import React from "react";

export interface RadioOption {
  value: string;
  label: string;
  desc?: string;
}

export interface RadioCardsProps {
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
}

export const RadioCards: React.FC<RadioCardsProps> = ({ value, onChange, options }) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
    {options.map((o) => {
      const isSelected = value === o.value;
      return (
        <div
          key={o.value}
          className={`flex items-center gap-3 py-3.5 px-4 border rounded-md cursor-pointer transition-all duration-150 text-[13px] bg-white ${
            isSelected ? "border-brand-deep bg-paper-cream ring-1 ring-brand-deep" : "border-line-sand hover:border-brand-deep"
          }`}
          onClick={() => onChange(o.value)}
        >
          <div
            className={`w-4 h-4 rounded-full border-[1.5px] shrink-0 flex items-center justify-center ${
              isSelected ? "border-brand-deep" : "border-line-sand"
            }`}
          >
            {isSelected && <div className="w-2 h-2 bg-brand-deep rounded-full" />}
          </div>
          <div className="flex-1">
            <div className="font-medium text-brand">{o.label}</div>
            {o.desc && <div className="text-[11px] text-ink-muted mt-0.5">{o.desc}</div>}
          </div>
        </div>
      );
    })}
  </div>
);

import React from "react";
import { Icon, IconName } from "../Icon";

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: IconName;
  delta?: { value: string; positive?: boolean };
  description?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, delta, description }) => (
  <div className="rounded-[20px] border border-line-sand bg-white p-5 shadow-[0_14px_36px_rgba(15,30,61,0.04)]">
    <div className="flex items-start justify-between gap-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{label}</div>
      {icon && (
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-paper-sky text-brand-deep">
          <Icon name={icon} size={16} />
        </span>
      )}
    </div>
    <div className="mt-3 font-serif text-[1.9rem] leading-none tracking-[-0.02em] text-brand">{value}</div>
    {(delta || description) && (
      <div className="mt-2 flex items-center gap-2 text-[12px]">
        {delta && (
          <span className={delta.positive ? "text-status-successFg font-medium" : "text-status-dangerFg font-medium"}>
            {delta.value}
          </span>
        )}
        {description && <span className="text-ink-soft">{description}</span>}
      </div>
    )}
  </div>
);

import React from "react";

export interface FieldProps {
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  colSpan?: number;
}

export const Field: React.FC<FieldProps> = ({ label, required, optional, hint, error, children, colSpan }) => (
  <div className={`flex flex-col gap-1.5 ${colSpan ? `col-span-${colSpan}` : ""}`}>
    <label className="text-xs font-medium text-neutral-700 tracking-[0.01em]">
      {label}
      {required && <span className="text-red-600 ml-[3px]">*</span>}
      {optional && <span className="text-neutral-400 font-normal ml-1.5 text-[11px]">(opsional)</span>}
    </label>
    {children}
    {error ? (
      <div className="text-[11px] text-red-600 mt-0.5 leading-relaxed">{error}</div>
    ) : hint ? (
      <div className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">{hint}</div>
    ) : null}
  </div>
);

import React from "react";
import { SelectDropdown, type SelectOption } from "@idds/react";

export interface Option {
  value: string;
  label: string;
}

// API dipertahankan agar call-site lama tetap jalan. Internally delegasi ke
// SelectDropdown IDDS — dapat theming brand + keyboard a11y + search bawaan.
export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  size?: "sm" | "md" | "lg";
}

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  className,
  size = "md",
}) => {
  const iddsOptions: SelectOption[] = options.map((o) => ({
    value: o.value,
    label: o.label,
  }));

  return (
    <SelectDropdown
      options={iddsOptions}
      selected={value || ""}
      onSelect={(v) => onChange(typeof v === "string" ? v : String(v ?? ""))}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      size={size}
      width="100%"
    />
  );
};

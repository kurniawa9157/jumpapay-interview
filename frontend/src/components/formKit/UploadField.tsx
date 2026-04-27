import React, { useRef } from "react";
import { Icon } from "../Icon";
import type { FileData } from "./types";

export interface UploadFieldProps {
  file: FileData | null;
  onChange: (file: FileData | null) => void;
  accept?: string;
  primaryText?: string;
  subText?: string;
}

const fmtSize = (b: number) =>
  b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(2)} MB`;

export const UploadField: React.FC<UploadFieldProps> = ({
  file,
  onChange,
  accept = ".pdf,.jpg,.jpeg,.png",
  primaryText = "Seret file ke sini atau klik untuk memilih",
  subText = "PDF, JPG, PNG · maks. 5MB",
}) => {
  const ref = useRef<HTMLInputElement>(null);

  const handle = (f?: File | null) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (e) => onChange({ name: f.name, size: f.size, type: f.type, dataUrl: e?.target?.result });
    if (f.type.startsWith("image/")) reader.readAsDataURL(f);
    else onChange({ name: f.name, size: f.size, type: f.type });
  };

  if (file) {
    return (
      <div
        className="border border-solid border-brand-deep bg-white rounded-lg p-5 flex items-center gap-4 cursor-pointer hover:bg-paper-cream transition-colors"
        onClick={() => ref.current?.click()}
      >
        <div className="w-10 h-10 shrink-0 rounded-full bg-status-successFg text-white flex items-center justify-center">
          <Icon name="check" size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-brand whitespace-nowrap overflow-hidden text-ellipsis">{file.name}</div>
          <div className="text-[11px] font-mono text-ink-muted mt-0.5">
            {fmtSize(file.size)} · {file.type || "file"}
          </div>
        </div>
        <button
          type="button"
          className="text-brand-deep py-1 bg-transparent border-none underline decoration-line-sand underline-offset-4 hover:decoration-brand-deep text-sm font-medium"
          onClick={(e) => {
            e.stopPropagation();
            onChange(null);
          }}
        >
          Ganti
        </button>
        <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
      </div>
    );
  }

  return (
    <div
      className="border border-dashed border-line-sand rounded-lg p-7 text-center cursor-pointer transition-all duration-150 bg-paper-cream relative overflow-hidden hover:border-brand-deep hover:bg-paper-vanilla"
      onClick={() => ref.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        handle(e.dataTransfer.files[0]);
      }}
    >
      <div className="w-10 h-10 rounded-full bg-white text-brand-deep flex items-center justify-center mx-auto mb-3 transition-all duration-150 ring-1 ring-line-sand">
        <Icon name="upload" size={20} />
      </div>
      <div className="text-[13px] font-medium text-brand">{primaryText}</div>
      <div className="text-[11px] text-ink-muted mt-1">{subText}</div>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
    </div>
  );
};

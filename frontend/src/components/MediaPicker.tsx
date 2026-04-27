import React, { useEffect, useState } from "react";
import { Button } from "@idds/react";
import { Icon } from "./Icon";
import { useModalClose } from "../hooks/useModalClose";
import { adminListMedia, ApiError } from "../api";
import type { MediaFile } from "../types/cms";

interface Props {
  // Filter MIME — kalau cuma butuh image, kasih `image/`. Default semua.
  mimePrefix?: string;
  onSelect: (file: MediaFile) => void;
  onClose: () => void;
}

const isImage = (mime: string) => mime.startsWith("image/");

// MediaPicker — modal grid file dari Media Library. Klik 1 file → onSelect(file).
// Dipakai dari RichTextEditor toolbar (insert image) atau form mana pun yang
// butuh URL file (Cover Image, hero image, dll).
export const MediaPicker: React.FC<Props> = ({ mimePrefix, onSelect, onClose }) => {
  useModalClose(onClose);
  const [items, setItems] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await adminListMedia(60, 1);
        if (cancel) return;
        const filtered = mimePrefix
          ? (res.media || []).filter((m) => m.mime_type.startsWith(mimePrefix))
          : res.media || [];
        setItems(filtered);
      } catch (err) {
        if (!cancel) setError(err instanceof ApiError ? err.message : "Gagal memuat media.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [mimePrefix]);

  const visible = search.trim()
    ? items.filter((m) =>
        (m.original_name || m.filename).toLowerCase().includes(search.trim().toLowerCase()),
      )
    : items;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:px-4 sm:py-8"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-[800px] flex-col overflow-hidden rounded-t-[20px] bg-white shadow-[0_30px_80px_rgba(15,30,61,0.25)] sm:rounded-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-line-sand px-6 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paper-cream text-brand-deep">
            <Icon name="image" size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
              Pilih dari Media Library
            </div>
            <h2 className="mt-1 font-serif text-[1.15rem] tracking-[-0.02em] text-brand">
              {mimePrefix === "image/" ? "Pilih Gambar" : "Pilih File"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-ink-muted hover:bg-paper-cream"
            aria-label="Tutup"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="border-b border-line-sand px-6 py-3">
          <div className="relative">
            <Icon
              name="search"
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama file…"
              className="w-full rounded-md border border-line-sand bg-white py-2 pl-9 pr-3 text-sm text-brand placeholder:text-ink-muted focus:border-brand-deep focus:outline-none focus:ring-2 focus:ring-brand-deep/15"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="mb-3 rounded-md border border-status-dangerBorder bg-status-dangerBg px-3 py-2 text-[13px] text-status-dangerFg">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square animate-pulse rounded-md border border-line-sand bg-paper-cream/60"
                />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-md border border-dashed border-line-sand bg-paper-cream/30 px-4 py-12 text-center text-sm text-ink-muted">
              {items.length === 0
                ? "Media Library kosong. Upload file dulu di menu Media Library."
                : "Tidak ada file yang cocok dengan pencarian."}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {visible.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onSelect(m);
                    onClose();
                  }}
                  className="group flex flex-col overflow-hidden rounded-md border border-line-sand bg-white text-left transition hover:border-brand-deep hover:shadow-[0_8px_22px_rgba(15,30,61,0.08)]"
                >
                  <div className="relative aspect-square bg-paper-cream/40">
                    {isImage(m.mime_type) ? (
                      <img
                        src={m.url_thumb || m.url}
                        alt={m.original_name || m.filename}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-ink-muted">
                        <Icon name="file" size={28} />
                      </div>
                    )}
                  </div>
                  <div className="border-t border-line-sand px-2 py-1.5">
                    <div className="truncate text-[11px] font-semibold text-brand">
                      {m.original_name || m.filename}
                    </div>
                    <div className="truncate text-[10px] text-ink-muted">
                      {m.mime_type.split("/")[1] || m.mime_type}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line-sand bg-paper-cream/30 px-6 py-3 text-[12px] text-ink-muted">
          <span>{visible.length} file</span>
          <Button type="button" hierarchy="secondary" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
};

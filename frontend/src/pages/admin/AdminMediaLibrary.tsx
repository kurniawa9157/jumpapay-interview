import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@idds/react";
import { Icon } from "../../components/Icon";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useToast } from "../../components/Toast";
import {
  ApiError,
  adminListMedia,
  adminUploadMedia,
  adminDeleteMedia,
} from "../../api";
import type { MediaFile } from "../../types/cms";

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const isImage = (mime: string): boolean => mime.startsWith("image/");

// AdminMediaLibrary — grid view media files + upload + delete + copy URL.
// File diserve di /uploads/{filename} (Static dari backend).
export const AdminMediaLibrary: React.FC = () => {
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MediaFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminListMedia(60, 1);
      setMedia(res.media || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat media.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadTick]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setUploading(true);
    setError(null);
    setUploadProgress({ current: 0, total: list.length });
    let success = 0;
    try {
      for (let i = 0; i < list.length; i++) {
        setUploadProgress({ current: i + 1, total: list.length });
        await adminUploadMedia(list[i]);
        success++;
      }
      toast.success(
        list.length === 1
          ? `File "${list[0].name}" terunggah.`
          : `${success} file terunggah.`,
      );
      setReloadTick((v) => v + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload gagal.";
      toast.error(success > 0 ? `${success}/${list.length} berhasil. ${msg}` : msg);
      if (success > 0) setReloadTick((v) => v + 1);
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      await adminDeleteMedia(confirmDelete.id);
      toast.success("File terhapus.");
      setReloadTick((v) => v + 1);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Gagal menghapus.";
      toast.error(msg);
      throw err;
    }
  };

  const handleCopyUrl = async (m: MediaFile) => {
    try {
      await navigator.clipboard.writeText(m.url);
      setCopiedId(m.id);
      setTimeout(() => setCopiedId((id) => (id === m.id ? null : id)), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-line-sand bg-white p-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Total file
          </div>
          <div className="mt-0.5 font-serif text-[1.3rem] tracking-[-0.02em] text-brand">
            {loading ? "…" : `${media.length} file`}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
          <Button
            type="button"
            hierarchy="primary"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            prefixIcon={<Icon name="upload" size={12} />}
          >
            {uploading
              ? uploadProgress
                ? `Mengunggah ${uploadProgress.current}/${uploadProgress.total}…`
                : "Mengunggah…"
              : "Upload File"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-status-dangerBorder bg-status-dangerBg px-4 py-3 text-sm text-status-dangerFg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-[12px] border border-line-sand bg-white"
            >
              <div className="aspect-square animate-pulse bg-paper-cream/60" />
              <div className="space-y-1.5 border-t border-line-sand px-2.5 py-2">
                <div className="h-3 w-3/4 animate-pulse rounded bg-paper-cream/60" />
                <div className="h-2 w-1/2 animate-pulse rounded bg-paper-cream/40" />
              </div>
            </div>
          ))}
        </div>
      ) : media.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-line-sand bg-white px-5 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-paper-cream text-brand-deep">
            <Icon name="image" size={24} />
          </div>
          <p className="mt-3 font-serif text-[1.1rem] tracking-[-0.01em] text-brand">Media Library kosong</p>
          <p className="mt-1 text-sm text-ink-muted">
            Upload gambar / dokumen pertama untuk dipakai di Posts atau builder block.
          </p>
          <div className="mt-4">
            <Button
              type="button"
              hierarchy="primary"
              size="sm"
              onClick={() => inputRef.current?.click()}
              prefixIcon={<Icon name="upload" size={12} />}
            >
              Upload File
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {media.map((m) => (
            <div
              key={m.id}
              className="group flex flex-col overflow-hidden rounded-[12px] border border-line-sand bg-white shadow-[0_6px_18px_rgba(15,30,61,0.04)] transition hover:shadow-[0_10px_24px_rgba(15,30,61,0.08)]"
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
                    <Icon name="file" size={32} />
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 flex items-end justify-end gap-1 bg-gradient-to-t from-black/40 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(m)}
                    className="pointer-events-auto rounded-md bg-white/90 p-1.5 text-ink-tertiary backdrop-blur hover:bg-white hover:text-brand-deep"
                    aria-label="Copy URL"
                    title="Copy URL"
                  >
                    <Icon name={copiedId === m.id ? "check" : "copy"} size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(m)}
                    className="pointer-events-auto rounded-md bg-white/90 p-1.5 text-status-dangerFg backdrop-blur hover:bg-status-dangerBg"
                    aria-label="Hapus"
                    title="Hapus"
                  >
                    <Icon name="trash" size={12} />
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-0.5 border-t border-line-sand px-2.5 py-2">
                <div
                  className="truncate text-[12px] font-semibold text-brand"
                  title={m.original_name || m.filename}
                >
                  {m.original_name || m.filename}
                </div>
                <div className="flex items-center justify-between text-[10px] text-ink-muted">
                  <span className="truncate">{m.mime_type.split("/")[1] || m.mime_type}</span>
                  <span>{formatBytes(m.size_bytes)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-md border border-status-infoBorder bg-status-infoBg px-4 py-3 text-[13px] text-status-infoFg">
        <Icon name="info" size={14} className="mr-1 inline" />
        Klik tombol <Icon name="copy" size={12} className="inline" /> untuk copy URL — paste ke kolom{" "}
        <strong>Cover Image URL</strong> di Posts atau ke field gambar di builder block.
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title={`Hapus "${confirmDelete.original_name || confirmDelete.filename}"?`}
          message={
            <>
              File akan dihapus permanen dari server. Pastikan tidak ada Post atau builder block yang
              masih merujuk ke URL <code className="font-mono text-[12px]">{confirmDelete.url}</code> —
              link akan jadi broken.
            </>
          }
          confirmLabel="Hapus"
          tone="danger"
          onConfirm={handleConfirmDelete}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
};

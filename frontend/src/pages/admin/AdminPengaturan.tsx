import React, { useEffect, useState } from "react";
import { Button } from "@idds/react";
import { ApiError, getSystemTheme, updateSystemTheme } from "../../api";
import { applyBrand, AVAILABLE_BRANDS, type EppatBrand } from "../../theme";
import { AdminPengaturanUmum } from "./AdminPengaturanUmum";

// Pengaturan sistem — saat ini baru 1 section: Brand theme.
// Preview langsung terapkan (sebagian UI ikut berubah seketika).
// Simpan kirim PUT /admin/system/theme — efek global untuk semua user.
export const AdminPengaturan: React.FC = () => {
  const [current, setCurrent] = useState<EppatBrand | null>(null);
  const [selected, setSelected] = useState<EppatBrand | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { brand } = await getSystemTheme();
        if (cancelled) return;
        setCurrent(brand);
        setSelected(brand);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Gagal memuat pengaturan.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Preview instan saat pilihan berubah (tanpa save). Biarkan user
  // merasakan tema dulu sebelum commit.
  const handleChange = (brand: EppatBrand) => {
    setSelected(brand);
    applyBrand(brand);
  };

  const handleSave = async () => {
    if (!selected || selected === current) return;
    setSaving(true);
    setError(null);
    setToast(null);
    try {
      await updateSystemTheme(selected);
      setCurrent(selected);
      setToast("Tema brand tersimpan. Memuat ulang halaman…");
      // Reload sekalian supaya SEMUA area apply brand dari awal (include
      // style yang di-cache CSSOM, computed values, IDDS internal state).
      // Delay singkat supaya user sempat baca toast.
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan tema.");
      // Rollback preview kalau gagal save.
      if (current) {
        setSelected(current);
        applyBrand(current);
      }
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!current) return;
    setSelected(current);
    applyBrand(current);
  };

  const dirty = selected !== null && selected !== current;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-status-dangerBorder bg-status-dangerBg px-4 py-3 text-sm text-status-dangerFg">
          {error}
        </div>
      )}
      {toast && (
        <div className="rounded-md border border-status-successBorder bg-status-successBg px-4 py-2 text-sm text-status-successFg">
          {toast}
        </div>
      )}

      <section className="rounded-[16px] border border-line-sand bg-white">
        <header className="border-b border-line-sand px-5 py-4">
          <h2 className="font-serif text-[18px] tracking-[-0.01em] text-brand">Tema Brand</h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            Ganti palet warna aplikasi. Perubahan berlaku untuk seluruh user setelah disimpan.
            Default <strong>ATR/BPN</strong> sesuai guideline resmi.
          </p>
        </header>

        <div className="px-5 py-5">
          {loading ? (
            <div className="text-sm text-ink-muted">Memuat…</div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {AVAILABLE_BRANDS.map((b) => {
                  const active = selected === b.value;
                  return (
                    <button
                      key={b.value}
                      type="button"
                      onClick={() => handleChange(b.value)}
                      className={`flex items-start gap-3 rounded-[12px] border p-3 text-left transition ${
                        active
                          ? "border-brand-deep bg-paper-cream ring-2 ring-brand-deep/20"
                          : "border-line-sand bg-white hover:border-brand-deep/40"
                      }`}
                    >
                      <span
                        className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full ring-1 ring-inset ring-black/10"
                        style={{ background: b.swatch }}
                        aria-hidden
                      >
                        {active && (
                          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/95 text-[10px] font-black text-brand-deep">
                            ✓
                          </span>
                        )}
                      </span>
                      <span className="flex-1">
                        <span className="block text-[13px] font-semibold text-brand">{b.label}</span>
                        {b.hint ? (
                          <span className="mt-0.5 block text-[11px] text-ink-muted">{b.hint}</span>
                        ) : (
                          <span className="mt-0.5 block font-mono text-[10px] text-ink-muted">{b.swatch}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 flex items-center gap-2 border-t border-line-sand pt-4">
                <Button
                  type="button"
                  hierarchy="primary"
                  onClick={handleSave}
                  disabled={!dirty || saving}
                >
                  {saving ? "Menyimpan…" : "Simpan"}
                </Button>
                <Button
                  type="button"
                  hierarchy="secondary"
                  onClick={handleReset}
                  disabled={!dirty || saving}
                >
                  Batal
                </Button>
                <span className="ml-auto text-[11px] text-ink-muted">
                  Aktif: <strong className="text-brand">{AVAILABLE_BRANDS.find((b) => b.value === current)?.label || current}</strong>
                </span>
              </div>
            </>
          )}
        </div>
      </section>

      <AdminPengaturanUmum />
    </div>
  );
};

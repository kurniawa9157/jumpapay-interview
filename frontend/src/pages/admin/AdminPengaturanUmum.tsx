import React, { useEffect, useState } from "react";
import { Button, Checkbox } from "@idds/react";
import { Icon } from "../../components/Icon";
import { Field, TextInput } from "../../components/formKit";
import {
  ApiError,
  adminListSettings,
  adminUpdateSettings,
} from "../../api";
import type { SystemSettingUpdateEntry } from "../../api";

// Key yang boleh diubah via endpoint generic (harus match allowedSettingKeys
// di backend service/system/service.go).
const EDITABLE_KEYS = [
  "app_name",
  "app_tagline",
  "timezone",
  "maintenance_mode",
  "maintenance_message",
] as const;

type Form = Record<(typeof EDITABLE_KEYS)[number], string>;

const emptyForm: Form = {
  app_name: "",
  app_tagline: "",
  timezone: "Asia/Jakarta",
  maintenance_mode: "0",
  maintenance_message: "",
};

export const AdminPengaturanUmum: React.FC = () => {
  const [form, setForm] = useState<Form>(emptyForm);
  const [initial, setInitial] = useState<Form>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await adminListSettings();
        if (cancelled) return;
        const next: Form = { ...emptyForm };
        for (const row of rows) {
          if (EDITABLE_KEYS.includes(row.key as (typeof EDITABLE_KEYS)[number])) {
            (next as Record<string, string>)[row.key] = row.value ?? "";
          }
        }
        setForm(next);
        setInitial(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Gagal memuat pengaturan.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = EDITABLE_KEYS.some((k) => form[k] !== initial[k]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setToast(null);
    try {
      const entries: SystemSettingUpdateEntry[] = EDITABLE_KEYS
        .filter((k) => form[k] !== initial[k])
        .map((k) => ({ key: k, value: form[k] }));
      if (entries.length === 0) {
        setSaving(false);
        return;
      }
      await adminUpdateSettings(entries);
      setInitial(form);
      setToast(`Pengaturan tersimpan (${entries.length} perubahan).`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan pengaturan.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(initial);
  };

  const set = <K extends keyof Form>(k: K, v: string) => setForm((prev) => ({ ...prev, [k]: v }));
  const maintenanceOn = form.maintenance_mode === "1";

  return (
    <section className="rounded-[16px] border border-line-sand bg-white">
      <header className="border-b border-line-sand px-5 py-4">
        <h2 className="font-serif text-[18px] tracking-[-0.01em] text-brand">Pengaturan Umum</h2>
        <p className="mt-1 text-[13px] text-ink-soft">
          Identitas aplikasi, zona waktu, dan mode pemeliharaan. Perubahan berlaku untuk seluruh user.
        </p>
      </header>

      <div className="px-5 py-5">
        {loading ? (
          <div className="text-sm text-ink-muted">Memuat…</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama Aplikasi">
              <TextInput
                value={form.app_name}
                onChange={(v) => set("app_name", v)}
                placeholder="e-PPAT"
              />
            </Field>
            <Field label="Zona Waktu" hint="Format IANA, mis. Asia/Jakarta">
              <TextInput
                value={form.timezone}
                onChange={(v) => set("timezone", v)}
                placeholder="Asia/Jakarta"
              />
            </Field>
            <Field label="Tagline" colSpan={2}>
              <TextInput
                value={form.app_tagline}
                onChange={(v) => set("app_tagline", v)}
                placeholder="Onboarding Pejabat Pembuat Akta Tanah"
              />
            </Field>

            <div className="col-span-2 rounded-[12px] border border-line-sand bg-paper-cream/40 p-4">
              <Checkbox
                id="maintenance-mode"
                label="Aktifkan mode pemeliharaan"
                subtext="Saat aktif, user non-admin akan melihat halaman maintenance. Admin tetap bisa login."
                checked={maintenanceOn}
                onChange={(v) => set("maintenance_mode", v ? "1" : "0")}
              />
              <div className="mt-4">
                <Field label="Pesan pemeliharaan">
                  <TextInput
                    value={form.maintenance_message}
                    onChange={(v) => set("maintenance_message", v)}
                    placeholder="Sistem sedang dalam pemeliharaan. Kami akan kembali segera."
                    disabled={!maintenanceOn}
                  />
                </Field>
              </div>
            </div>

            {error && (
              <div className="col-span-2 rounded-md border border-status-dangerBorder bg-status-dangerBg px-3 py-2 text-[13px] text-status-dangerFg">
                {error}
              </div>
            )}
            {toast && (
              <div className="col-span-2 rounded-md border border-status-successBorder bg-status-successBg px-3 py-2 text-[13px] text-status-successFg">
                <Icon name="check" size={12} className="mr-1 inline" /> {toast}
              </div>
            )}

            <div className="col-span-2 flex items-center gap-2 border-t border-line-sand pt-4">
              <Button
                type="button"
                hierarchy="primary"
                onClick={handleSave}
                disabled={!dirty || saving}
              >
                {saving ? "Menyimpan…" : "Simpan Perubahan"}
              </Button>
              <Button
                type="button"
                hierarchy="secondary"
                onClick={handleReset}
                disabled={!dirty || saving}
              >
                Batal
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

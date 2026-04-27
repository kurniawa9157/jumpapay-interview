import React, { useEffect, useState } from "react";
import { Button } from "@idds/react";
import { Icon } from "../../components/Icon";
import { Field, TextInput } from "../../components/formKit";
import { Badge } from "../../components/data/Badge";
import { ApiError, getMyProfile, updateMyProfile } from "../../api";
import type { AccountProfileDTO, UpdateMyProfileInput } from "../../api";

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const AccountProfil: React.FC = () => {
  const [profile, setProfile] = useState<AccountProfileDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ first_name: "", mid_name: "", last_name: "", phone: "" });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await getMyProfile();
      setProfile(p);
      setForm({
        first_name: p.first_name,
        mid_name: p.mid_name ?? "",
        last_name: p.last_name ?? "",
        phone: p.phone ?? "",
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat profil.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    if (form.first_name.trim().length < 2) {
      setError("Nama depan minimal 2 karakter.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input: UpdateMyProfileInput = {
        first_name: form.first_name.trim(),
        mid_name: form.mid_name.trim() || null,
        last_name: form.last_name.trim() || null,
        phone: form.phone.trim() || "",
      };
      const updated = await updateMyProfile(input);
      setProfile(updated);
      setEditing(false);
      showToast("Profil berhasil disimpan.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan profil.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!profile) return;
    setForm({
      first_name: profile.first_name,
      mid_name: profile.mid_name ?? "",
      last_name: profile.last_name ?? "",
      phone: profile.phone ?? "",
    });
    setEditing(false);
    setError(null);
  };

  if (loading) {
    return <div className="rounded-[16px] border border-line-sand bg-white px-5 py-6 text-sm text-ink-muted">Memuat profil…</div>;
  }
  if (!profile) {
    return <div className="rounded-md border border-status-dangerBorder bg-status-dangerBg px-4 py-3 text-sm text-status-dangerFg">Profil tidak tersedia.</div>;
  }

  const rowClass = "flex flex-col gap-1 border-b border-line-sand/60 py-3 last:border-0 sm:flex-row sm:items-baseline sm:justify-between";
  const labelClass = "text-[11px] uppercase tracking-[0.14em] text-ink-muted sm:w-40";
  const valueClass = "text-sm text-brand sm:flex-1";

  return (
    <div className="space-y-5">
      {toast && (
        <div className="rounded-md border border-status-successBorder bg-status-successBg px-4 py-2 text-sm text-status-successFg">
          <Icon name="check" size={12} className="mr-1 inline" /> {toast}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-status-dangerBorder bg-status-dangerBg px-4 py-3 text-sm text-status-dangerFg">
          {error}
        </div>
      )}

      <div className="rounded-[20px] border border-line-sand bg-white p-6 shadow-[0_14px_36px_rgba(15,30,61,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Identitas akun</div>
            <h2 className="mt-1 font-serif text-[1.4rem] tracking-[-0.02em] text-brand">
              {[profile.first_name, profile.mid_name, profile.last_name].filter(Boolean).join(" ")}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {profile.is_admin ? (
                <Badge variant="info">Super Admin</Badge>
              ) : profile.role_name ? (
                <Badge variant="info">{profile.role_name}</Badge>
              ) : null}
              <Badge variant={profile.status_code === "ACTIVE" ? "success" : "neutral"}>
                {profile.status_code === "ACTIVE" ? "Aktif" : profile.status_code}
              </Badge>
              <span className="font-mono text-[12px] text-ink-muted">{profile.code}</span>
            </div>
          </div>
          {!editing && (
            <Button
              type="button"
              hierarchy="secondary"
              size="sm"
              onClick={() => setEditing(true)}
              prefixIcon={<Icon name="edit" size={12} />}
            >
              Ubah Data
            </Button>
          )}
        </div>

        {!editing ? (
          <div className="mt-5">
            <div className={rowClass}>
              <div className={labelClass}>Nama Depan</div>
              <div className={valueClass}>{profile.first_name}</div>
            </div>
            <div className={rowClass}>
              <div className={labelClass}>Nama Tengah</div>
              <div className={valueClass}>{profile.mid_name || "—"}</div>
            </div>
            <div className={rowClass}>
              <div className={labelClass}>Nama Belakang</div>
              <div className={valueClass}>{profile.last_name || "—"}</div>
            </div>
            <div className={rowClass}>
              <div className={labelClass}>Email</div>
              <div className={valueClass}>
                {profile.email || "—"}
                <span className="ml-2 text-[11px] text-ink-muted">(hubungi admin untuk mengubah)</span>
              </div>
            </div>
            <div className={rowClass}>
              <div className={labelClass}>Telepon</div>
              <div className={valueClass}>{profile.phone || "—"}</div>
            </div>
            <div className={rowClass}>
              <div className={labelClass}>Login terakhir</div>
              <div className={valueClass}>{formatDate(profile.last_login_at)}</div>
            </div>
            <div className={rowClass}>
              <div className={labelClass}>Akun dibuat</div>
              <div className={valueClass}>{formatDate(profile.created_at)}</div>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Field label="Nama Depan" required>
              <TextInput
                value={form.first_name}
                onChange={(v) => setForm({ ...form, first_name: v })}
              />
            </Field>
            <Field label="Nama Tengah">
              <TextInput
                value={form.mid_name}
                onChange={(v) => setForm({ ...form, mid_name: v })}
              />
            </Field>
            <Field label="Nama Belakang">
              <TextInput
                value={form.last_name}
                onChange={(v) => setForm({ ...form, last_name: v })}
              />
            </Field>
            <Field label="Telepon" colSpan={3} hint="Kosongkan untuk menghapus nomor telepon">
              <TextInput
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
                placeholder="0812 3456 7890"
              />
            </Field>
            <div className="col-span-3 flex justify-end gap-3">
              <Button type="button" hierarchy="secondary" onClick={handleCancel}>
                Batal
              </Button>
              <Button
                type="button"
                hierarchy="primary"
                onClick={handleSave}
                disabled={saving}
                prefixIcon={saving ? <Icon name="spinner" size={14} className="animate-spin" /> : <Icon name="save" size={14} />}
              >
                Simpan Perubahan
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

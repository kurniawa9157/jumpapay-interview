import React, { useEffect, useState } from "react";
import { Button, Checkbox } from "@idds/react";
import { Icon } from "../../components/Icon";
import { Field, TextInput, Select } from "../../components/formKit";
import { useModalClose } from "../../hooks/useModalClose";
import { ApiError, adminCreateRole, adminUpdateRole } from "../../api";
import type { AdminRoleDTO } from "../../api";

interface Props {
  mode: "create" | "edit";
  role?: AdminRoleDTO;
  allRoles: AdminRoleDTO[];
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  code: string;
  name: string;
  parentId: string; // "" = no parent
  level: string;
  isActive: boolean;
}

const emptyState: FormState = { code: "", name: "", parentId: "", level: "1", isActive: true };

export const RoleFormModal: React.FC<Props> = ({ mode, role, allRoles, onClose, onSaved }) => {
  useModalClose(onClose);
  const [form, setForm] = useState<FormState>(emptyState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "edit" && role) {
      setForm({
        code: role.code,
        name: role.name,
        parentId: role.parent_id ? String(role.parent_id) : "",
        level: String(role.level),
        isActive: role.is_active,
      });
    } else {
      setForm(emptyState);
    }
  }, [mode, role]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) {
      setError("Nama peran minimal 2 karakter.");
      return;
    }
    if (mode === "create" && form.code.trim().length < 3) {
      setError("Kode peran minimal 3 karakter (misalnya ROLE_REVIEWER).");
      return;
    }

    const parentId = form.parentId ? parseInt(form.parentId, 10) : null;
    const level = parseInt(form.level, 10) || 1;

    setSubmitting(true);
    setError(null);
    try {
      if (mode === "create") {
        await adminCreateRole({
          code: form.code.trim().toUpperCase(),
          name: form.name.trim(),
          parent_id: parentId,
          level,
        });
      } else if (role) {
        await adminUpdateRole(role.id, {
          name: form.name.trim(),
          parent_id: parentId,
          level,
          is_active: form.isActive,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan peran.");
    } finally {
      setSubmitting(false);
    }
  };

  const parentOptions = allRoles
    .filter((r) => !role || r.id !== role.id) // tidak boleh parent = self
    .map((r) => ({ value: String(r.id), label: `${r.name} (${r.code})` }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:px-4 sm:py-8"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[20px] bg-white shadow-[0_30px_80px_rgba(15,30,61,0.25)] sm:rounded-[20px]"
      >
        <div className="flex items-start gap-3 border-b border-line-sand px-6 py-4">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
              Peran & Izin
            </div>
            <h2 className="mt-1 font-serif text-[1.2rem] tracking-[-0.02em] text-brand">
              {mode === "create" ? "Tambah Peran Baru" : `Ubah Peran — ${role?.name}`}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-ink-muted hover:bg-paper-cream" aria-label="Tutup">
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <Field
            label="Kode Peran"
            required={mode === "create"}
            hint={mode === "edit" ? "Kode tidak dapat diubah setelah dibuat" : "Huruf kapital + underscore, misal ROLE_REVIEWER"}
          >
            <TextInput
              value={form.code}
              onChange={(v) => update("code", v.toUpperCase())}
              placeholder="ROLE_REVIEWER"
              disabled={mode === "edit"}
            />
          </Field>
          <Field label="Nama Peran" required>
            <TextInput
              value={form.name}
              onChange={(v) => update("name", v)}
              placeholder="Misal: Petugas Review"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Induk (opsional)">
              <Select
                value={form.parentId}
                onChange={(v) => update("parentId", v)}
                placeholder="Tanpa induk"
                options={[{ value: "", label: "Tanpa induk" }, ...parentOptions]}
              />
            </Field>
            <Field label="Level" hint="Urutan hierarki (1 = paling tinggi)">
              <TextInput
                type="number"
                value={form.level}
                onChange={(v) => update("level", v)}
              />
            </Field>
          </div>
          {mode === "edit" && (
            <Checkbox
              id="role-is-active"
              label="Peran aktif (user dapat di-assign peran ini)"
              checked={form.isActive}
              onChange={(v) => update("isActive", v)}
            />
          )}

          {error && (
            <div className="rounded-md border border-status-dangerBorder bg-status-dangerBg px-3 py-2 text-sm text-status-dangerFg">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-line-sand bg-paper-cream/30 px-6 py-4">
          <Button type="button" hierarchy="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            hierarchy="primary"
            disabled={submitting}
            prefixIcon={submitting ? <Icon name="spinner" size={14} className="animate-spin" /> : <Icon name="save" size={14} />}
          >
            {mode === "create" ? "Buat Peran" : "Simpan"}
          </Button>
        </div>
      </form>
    </div>
  );
};

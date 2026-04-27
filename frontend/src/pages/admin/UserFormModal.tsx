import React, { useEffect, useState } from "react";
import { Button } from "@idds/react";
import { Icon } from "../../components/Icon";
import { Field, TextInput, Select } from "../../components/formKit";
import { useModalClose } from "../../hooks/useModalClose";
import { ApiError, adminCreateUser, adminUpdateUser } from "../../api";
import type {
  AdminCreateUserInput,
  AdminRoleDTO,
  AdminUpdateUserInput,
  BackendUserDTO,
  BackendUserStatus,
} from "../../api";

interface Props {
  mode: "create" | "edit";
  user?: BackendUserDTO;
  roles: AdminRoleDTO[];
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  firstName: string;
  midName: string;
  lastName: string;
  email: string;
  password: string;
  roleCode: string;
  statusCode: BackendUserStatus;
}

const emptyState: FormState = {
  firstName: "",
  midName: "",
  lastName: "",
  email: "",
  password: "",
  roleCode: "",
  statusCode: "ACTIVE",
};

const toPtr = (s: string): string | null => (s.trim() === "" ? null : s.trim());

export const UserFormModal: React.FC<Props> = ({ mode, user, roles, onClose, onSaved }) => {
  useModalClose(onClose);
  const [form, setForm] = useState<FormState>(emptyState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mode === "edit" && user) {
      setForm({
        firstName: user.first_name,
        midName: user.mid_name ?? "",
        lastName: user.last_name ?? "",
        email: user.email ?? "",
        password: "",
        roleCode: user.role_code ?? "",
        statusCode: user.status_code,
      });
    } else {
      setForm(emptyState);
    }
  }, [mode, user]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key as string]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (form.firstName.trim().length < 2) errs.firstName = "Nama depan minimal 2 karakter";
    if (mode === "create") {
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = "Format email tidak valid";
      if (form.password.length < 8) errs.password = "Password minimal 8 karakter";
      if (!form.roleCode) errs.roleCode = "Pilih peran";
    } else {
      if (!form.statusCode) errs.statusCode = "Pilih status";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "create") {
        const payload: AdminCreateUserInput = {
          first_name: form.firstName.trim(),
          mid_name: toPtr(form.midName),
          last_name: toPtr(form.lastName),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          role_code: form.roleCode,
        };
        await adminCreateUser(payload);
      } else if (user) {
        const payload: AdminUpdateUserInput = {
          first_name: form.firstName.trim(),
          mid_name: toPtr(form.midName),
          last_name: toPtr(form.lastName),
          role_code: form.roleCode || undefined,
          status_code: form.statusCode,
        };
        await adminUpdateUser(user.id, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan user.");
    } finally {
      setSubmitting(false);
    }
  };

  const title = mode === "create" ? "Tambah User Baru" : `Ubah User — ${user?.full_name || ""}`;
  const submitLabel = mode === "create" ? "Buat User" : "Simpan Perubahan";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:px-4 sm:py-8"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[95vh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[20px] bg-white shadow-[0_30px_80px_rgba(15,30,61,0.25)] sm:rounded-[20px]"
      >
        <div className="flex items-start gap-3 border-b border-line-sand px-6 py-4">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
              Manajemen user
            </div>
            <h2 className="mt-1 font-serif text-[1.3rem] tracking-[-0.02em] text-brand">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-ink-muted hover:bg-paper-cream" aria-label="Tutup">
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Nama Depan" required error={fieldErrors.firstName}>
              <TextInput value={form.firstName} onChange={(v) => update("firstName", v)} error={!!fieldErrors.firstName} />
            </Field>
            <Field label="Nama Tengah">
              <TextInput value={form.midName} onChange={(v) => update("midName", v)} />
            </Field>
            <Field label="Nama Belakang">
              <TextInput value={form.lastName} onChange={(v) => update("lastName", v)} />
            </Field>
          </div>

          {mode === "create" && (
            <>
              <Field label="Email" required error={fieldErrors.email}>
                <TextInput
                  type="email"
                  value={form.email}
                  onChange={(v) => update("email", v)}
                  placeholder="nama@contoh.id"
                  error={!!fieldErrors.email}
                />
              </Field>
              <Field label="Password Awal" required hint="User akan diminta ganti saat login pertama (flow ini akan ditambah di iterasi berikut)" error={fieldErrors.password}>
                <TextInput
                  type="password"
                  value={form.password}
                  onChange={(v) => update("password", v)}
                  placeholder="Minimal 8 karakter"
                  error={!!fieldErrors.password}
                />
              </Field>
            </>
          )}

          {mode === "edit" && user?.email && (
            <Field label="Email">
              <div className="rounded-md border border-line-sand bg-paper-cream/50 px-3 py-2 text-sm text-ink-tertiary">
                {user.email} <span className="text-[11px] text-ink-muted">(tidak dapat diubah dari sini)</span>
              </div>
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Peran"
              required={mode === "create"}
              error={fieldErrors.roleCode}
              hint={mode === "edit" ? "Kosongkan untuk membiarkan peran tetap" : undefined}
            >
              <Select
                value={form.roleCode}
                onChange={(v) => update("roleCode", v)}
                placeholder="Pilih peran"
                options={[
                  ...(mode === "edit" ? [{ value: "", label: "(tidak berubah)" }] : []),
                  ...roles
                    .filter((r) => r.is_active && r.code !== "ROLE_ADMIN")
                    .map((r) => ({ value: r.code, label: r.name })),
                ]}
              />
            </Field>
            {mode === "edit" && (
              <Field label="Status" required error={fieldErrors.statusCode}>
                <Select
                  value={form.statusCode}
                  onChange={(v) => update("statusCode", v as BackendUserStatus)}
                  options={[
                    { value: "ACTIVE", label: "Aktif" },
                    { value: "SUSPENDED", label: "Ditangguhkan" },
                    { value: "INACTIVE", label: "Non-aktif" },
                  ]}
                />
              </Field>
            )}
          </div>

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
            {submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
};

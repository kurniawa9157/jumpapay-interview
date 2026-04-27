import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "../../components/Icon";
import { ApiError, adminGetRolePermissions, adminSetRolePermissions } from "../../api";
import type { AdminPermissionDTO, AdminRoleDTO } from "../../api";

interface Props {
  role: AdminRoleDTO;
  onSaved?: () => void;
}

type ActionKey = "can_view" | "can_create" | "can_edit" | "can_delete";

const ACTIONS: { key: ActionKey; label: string }[] = [
  { key: "can_view", label: "View" },
  { key: "can_create", label: "Create" },
  { key: "can_edit", label: "Edit" },
  { key: "can_delete", label: "Delete" },
];

const MODULE_LABELS: Record<string, string> = {
  PPAT_REVIEW: "Review Pendaftaran PPAT",
  PIHAK_REVIEW: "Review Pendaftaran Pihak",
  USER_MGMT: "Manajemen User",
  ROLE_MGMT: "Manajemen Peran",
  PERMISSION_MGMT: "Matriks Izin",
  SYSTEM_SETTINGS: "Pengaturan Sistem",
  AUDIT_LOG: "Log Aktivitas",
};

// entryFor — mengembalikan row permission untuk 1 module dari list, atau default semua false.
const entryFor = (perms: AdminPermissionDTO[], moduleCode: string, roleID: number): AdminPermissionDTO => {
  const found = perms.find((p) => p.module_code === moduleCode);
  if (found) return found;
  return {
    id: 0, role_id: roleID, module_code: moduleCode,
    can_view: false, can_create: false, can_edit: false, can_delete: false,
  };
};

export const PermissionMatrixPanel: React.FC<Props> = ({ role, onSaved }) => {
  const [modules, setModules] = useState<string[]>([]);
  const [state, setState] = useState<Record<string, AdminPermissionDTO>>({});
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminGetRolePermissions(role.id);
      const mods = res.modules || [];
      setModules(mods);
      const map: Record<string, AdminPermissionDTO> = {};
      mods.forEach((m) => { map[m] = entryFor(res.permissions || [], m, role.id); });
      setState(map);
      setDirty(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat permission.");
    } finally {
      setLoading(false);
    }
  }, [role.id]);

  useEffect(() => { load(); }, [load]);

  const toggle = (moduleCode: string, action: ActionKey) => {
    setState((prev) => ({
      ...prev,
      [moduleCode]: { ...prev[moduleCode], [action]: !prev[moduleCode][action] },
    }));
    setDirty(true);
    setSuccess(null);
  };

  const toggleRow = (moduleCode: string, value: boolean) => {
    setState((prev) => ({
      ...prev,
      [moduleCode]: {
        ...prev[moduleCode],
        can_view: value, can_create: value, can_edit: value, can_delete: value,
      },
    }));
    setDirty(true);
    setSuccess(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = modules.map((m) => ({
        module_code: m,
        can_view: state[m]?.can_view ?? false,
        can_create: state[m]?.can_create ?? false,
        can_edit: state[m]?.can_edit ?? false,
        can_delete: state[m]?.can_delete ?? false,
      }));
      await adminSetRolePermissions(role.id, payload);
      setDirty(false);
      setSuccess("Perubahan izin tersimpan.");
      setTimeout(() => setSuccess(null), 3000);
      onSaved?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan permission.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="px-4 py-6 text-sm text-ink-muted">Memuat matriks izin…</div>;
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md border border-status-dangerBorder bg-status-dangerBg px-3 py-2 text-[13px] text-status-dangerFg">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-status-successBorder bg-status-successBg px-3 py-2 text-[13px] text-status-successFg">
          <Icon name="check" size={12} className="mr-1 inline" /> {success}
        </div>
      )}

      <div className="overflow-x-auto rounded-[14px] border border-line-sand bg-white">
        <table className="w-full text-sm">
          <thead className="bg-table-headerBg">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-tertiary">Module</th>
              {ACTIONS.map((a) => (
                <th key={a.key} className="w-20 px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-tertiary">
                  {a.label}
                </th>
              ))}
              <th className="w-24 px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-tertiary">Semua</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((m) => {
              const row = state[m];
              const all = row?.can_view && row?.can_create && row?.can_edit && row?.can_delete;
              return (
                <tr key={m} className="border-t border-line-sand/60 hover:bg-table-rowHover">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-brand">{MODULE_LABELS[m] || m}</div>
                    <div className="font-mono text-[10px] text-ink-muted">{m}</div>
                  </td>
                  {ACTIONS.map((a) => (
                    <td key={a.key} className="px-2 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={!!row?.[a.key]}
                        onChange={() => toggle(m, a.key)}
                        className="h-4 w-4 rounded border-line-sand"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => toggleRow(m, !all)}
                      className="rounded-md border border-line-sand bg-white px-2 py-0.5 text-[11px] text-ink-tertiary hover:border-brand-deep"
                    >
                      {all ? "Hapus" : "Pilih"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-[12px] text-ink-muted">
          {dirty ? "Ada perubahan yang belum disimpan." : "Tidak ada perubahan pending."}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={load}
            disabled={saving}
            className="rounded-md border border-line-sand bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-tertiary hover:border-brand-deep disabled:opacity-60"
          >
            Batalkan
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-2 rounded-md bg-brand-deep px-3 py-1.5 text-[12px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? <Icon name="spinner" size={12} className="animate-spin" /> : <Icon name="save" size={12} />}
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  );
};

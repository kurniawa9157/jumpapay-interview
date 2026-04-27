import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@idds/react";
import { Icon } from "../../components/Icon";
import { Badge } from "../../components/data/Badge";
import {
  ApiError,
  adminDeleteRole,
  adminGetRolePermissions,
  adminListRoles,
} from "../../api";
import type { AdminRoleDTO } from "../../api";
import { RoleFormModal } from "./RoleFormModal";
import { PermissionMatrixPanel } from "./PermissionMatrixPanel";

// Hitung jumlah "flag true" permission untuk 1 role. Kalau 0, role perlu di-set.
const countGrantedFlags = (perms: Array<{ can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }>): number => {
  let n = 0;
  for (const p of perms) {
    if (p.can_view) n++;
    if (p.can_create) n++;
    if (p.can_edit) n++;
    if (p.can_delete) n++;
  }
  return n;
};

export const AdminRoles: React.FC = () => {
  const [roles, setRoles] = useState<AdminRoleDTO[]>([]);
  // Map role.id → jumlah flag permission true. 0 = belum di-set.
  const [permCounts, setPermCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [formModal, setFormModal] = useState<
    | { mode: "create" }
    | { mode: "edit"; role: AdminRoleDTO }
    | null
  >(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminListRoles();
      setRoles(res.roles);
      // Fetch jumlah permission per role paralel. Non-fatal kalau gagal.
      const counts: Record<number, number> = {};
      await Promise.all(
        res.roles.map(async (r) => {
          try {
            const p = await adminGetRolePermissions(r.id);
            counts[r.id] = countGrantedFlags(p.permissions || []);
          } catch {
            counts[r.id] = -1; // -1 = tidak diketahui (abaikan saat render).
          }
        })
      );
      setPermCounts(counts);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat peran.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleDelete = async (role: AdminRoleDTO) => {
    if (!confirm(`Hapus peran "${role.name}" (${role.code})?\n\nUser yang memiliki peran ini akan menjadi tanpa peran dan kehilangan semua izin sampai di-assign peran baru.`)) return;
    try {
      await adminDeleteRole(role.id);
      showToast(`Peran ${role.name} dihapus.`);
      if (expanded === role.id) setExpanded(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menghapus peran.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-[16px] border border-line-sand bg-white p-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Total peran
          </div>
          <div className="mt-0.5 font-serif text-[1.3rem] tracking-[-0.02em] text-brand">
            {loading ? "…" : `${roles.length} peran terdaftar`}
          </div>
        </div>
        <Button
          type="button"
          hierarchy="primary"
          size="sm"
          onClick={() => setFormModal({ mode: "create" })}
          prefixIcon={<Icon name="shield" size={12} />}
        >
          Tambah Peran
        </Button>
      </div>

      {toast && (
        <div className="rounded-md border border-status-successBorder bg-status-successBg px-4 py-2 text-sm text-status-successFg">
          <Icon name="check" size={12} className="mr-1 inline" /> {toast}
        </div>
      )}

      {!loading && roles.some((r) => permCounts[r.id] === 0 && r.code !== "ROLE_ADMIN") && (
        <div className="rounded-md border border-status-warnBorder bg-status-warnBg px-4 py-3 text-[13px] text-status-warnFg">
          <strong>Ada peran yang belum memiliki izin.</strong> User yang di-assign peran tanpa izin
          tidak dapat login ke area admin maupun PPAT. Klik peran untuk membuka matriks dan centang
          izin yang diperlukan, lalu klik <em>Simpan Perubahan</em>.
        </div>
      )}

      {error && (
        <div className="rounded-md border border-status-dangerBorder bg-status-dangerBg px-4 py-3 text-sm text-status-dangerFg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-[16px] border border-line-sand bg-white px-5 py-6 text-sm text-ink-muted">
          Memuat peran…
        </div>
      ) : roles.length === 0 ? (
        <div className="rounded-[16px] border border-line-sand bg-white px-5 py-10 text-center text-sm text-ink-muted">
          Belum ada peran.
        </div>
      ) : (
        <div className="space-y-3">
          {roles.map((role) => {
            const isExpanded = expanded === role.id;
            return (
              <div key={role.id} className="rounded-[16px] border border-line-sand bg-white shadow-[0_10px_24px_rgba(15,30,61,0.04)]">
                <div className="flex items-center gap-3 px-5 py-4">
                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : role.id)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition ${isExpanded ? "bg-brand-deep text-white" : "bg-paper-cream text-ink-tertiary"}`}>
                      <Icon name={isExpanded ? "chevronRight" : "chevronRight"} size={12} className={isExpanded ? "rotate-90 transition-transform" : "transition-transform"} />
                    </span>
                    <div>
                      <div className="font-semibold text-brand">{role.name}</div>
                      <div className="font-mono text-[11px] text-ink-muted">{role.code}</div>
                    </div>
                  </button>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-ink-muted">Level {role.level}</span>
                    {permCounts[role.id] === 0 && role.code !== "ROLE_ADMIN" && (
                      <Badge variant="warn">Belum ada izin</Badge>
                    )}
                    {role.is_active ? (
                      <Badge variant="success">Aktif</Badge>
                    ) : (
                      <Badge variant="neutral">Non-aktif</Badge>
                    )}
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setFormModal({ mode: "edit", role })}
                        className="rounded-md border border-line-sand bg-white p-2 text-ink-tertiary hover:border-brand-deep hover:text-brand-deep"
                        title="Ubah peran"
                      >
                        <Icon name="edit" size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(role)}
                        className="rounded-md border border-status-dangerBorder bg-white p-2 text-status-dangerFg hover:bg-status-dangerBg"
                        title="Hapus peran"
                      >
                        <Icon name="x" size={12} />
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-line-sand bg-paper-cream/30 px-5 py-4">
                    <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                      Matriks Izin — {role.name}
                    </div>
                    <PermissionMatrixPanel role={role} onSaved={load} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {formModal && (
        <RoleFormModal
          mode={formModal.mode}
          role={formModal.mode === "edit" ? formModal.role : undefined}
          allRoles={roles}
          onClose={() => setFormModal(null)}
          onSaved={() => {
            showToast(formModal.mode === "create" ? "Peran berhasil dibuat." : "Peran berhasil diperbarui.");
            load();
          }}
        />
      )}
    </div>
  );
};

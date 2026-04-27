import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@idds/react";
import { Badge } from "../../components/data/Badge";
import { DataTable, DataTableColumn } from "../../components/data/DataTable";
import { SearchBar } from "../../components/data/SearchBar";
import { Icon } from "../../components/Icon";
import {
  ApiError,
  adminActivateUser,
  adminListRoles,
  adminListUsers,
  adminSuspendUser,
} from "../../api";
import type { AdminRoleDTO, BackendUserDTO, BackendUserStatus } from "../../api";
import { UserFormModal } from "./UserFormModal";
import { ResetPasswordModal } from "./ResetPasswordModal";

const STATUS_OPTIONS: { key: "all" | BackendUserStatus; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "ACTIVE", label: "Aktif" },
  { key: "SUSPENDED", label: "Ditangguhkan" },
  { key: "INACTIVE", label: "Non-aktif" },
];

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" });
};

const statusBadge = (status: BackendUserStatus) => {
  if (status === "ACTIVE") return <Badge variant="success">Aktif</Badge>;
  if (status === "SUSPENDED") return <Badge variant="warn">Ditangguhkan</Badge>;
  return <Badge variant="neutral">Non-aktif</Badge>;
};

export const AdminDaftarUser: React.FC = () => {
  const [status, setStatus] = useState<"all" | BackendUserStatus>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<BackendUserDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [roles, setRoles] = useState<AdminRoleDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [menuOpenFor, setMenuOpenFor] = useState<number | null>(null);

  const [formModal, setFormModal] = useState<
    | { mode: "create" }
    | { mode: "edit"; user: BackendUserDTO }
    | null
  >(null);
  const [resetModal, setResetModal] = useState<BackendUserDTO | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminListUsers({
        search: search.trim() || undefined,
        role: roleFilter === "all" ? undefined : roleFilter,
        status: status === "all" ? undefined : status,
        page: 1,
        limit: 100,
      });
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat user.");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, status]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers, reloadTick]);

  useEffect(() => {
    // Load roles sekali untuk filter + form modal.
    adminListRoles().then((r) => setRoles(r.roles)).catch(() => { /* ignore */ });
  }, []);

  const reload = () => setReloadTick((v) => v + 1);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSuspend = async (u: BackendUserDTO) => {
    if (!confirm(`Tangguhkan user "${u.full_name}"? Akun tidak akan bisa login sampai diaktifkan kembali.`)) return;
    try {
      await adminSuspendUser(u.id);
      showToast(`${u.full_name} ditangguhkan.`);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal suspend user.");
    }
    setMenuOpenFor(null);
  };

  const handleActivate = async (u: BackendUserDTO) => {
    try {
      await adminActivateUser(u.id);
      showToast(`${u.full_name} diaktifkan.`);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal aktifkan user.");
    }
    setMenuOpenFor(null);
  };

  const columns = useMemo<DataTableColumn<BackendUserDTO>[]>(
    () => [
      {
        key: "nama",
        header: "Nama",
        render: (row) => (
          <div>
            <div className="font-semibold text-brand">{row.full_name}</div>
            <div className="font-mono text-[11px] text-ink-muted">{row.code}</div>
          </div>
        ),
      },
      {
        key: "email",
        header: "Email",
        render: (row) => <span className="text-[12px] text-ink-tertiary">{row.email || "—"}</span>,
      },
      {
        key: "role",
        header: "Peran",
        render: (row) =>
          row.role_name ? (
            <Badge variant="info">{row.role_name}</Badge>
          ) : (
            <span className="text-[11px] text-ink-muted italic">Tanpa peran</span>
          ),
      },
      {
        key: "last_login",
        header: "Login terakhir",
        render: (row) => <span className="text-[12px] text-ink-tertiary">{formatDate(row.last_login_at)}</span>,
      },
      {
        key: "status",
        header: "Status",
        render: (row) => statusBadge(row.status_code),
      },
      {
        key: "aksi",
        header: "",
        render: (row) => (
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpenFor(menuOpenFor === row.id ? null : row.id);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line-sand bg-white text-ink-tertiary hover:border-brand-deep"
              aria-label="Aksi"
            >
              <Icon name="list" size={14} />
            </button>
            {menuOpenFor === row.id && (
              <div
                className="absolute right-0 top-[calc(100%+4px)] z-10 w-44 overflow-hidden rounded-md border border-line-sand bg-white shadow-[0_10px_24px_rgba(15,30,61,0.1)]"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    setFormModal({ mode: "edit", user: row });
                    setMenuOpenFor(null);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-ink-tertiary hover:bg-paper-cream"
                >
                  <Icon name="edit" size={12} /> Ubah Data
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetModal(row);
                    setMenuOpenFor(null);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-ink-tertiary hover:bg-paper-cream"
                >
                  <Icon name="key" size={12} /> Reset Password
                </button>
                {row.status_code === "ACTIVE" ? (
                  <button
                    type="button"
                    onClick={() => handleSuspend(row)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-status-warnFg hover:bg-status-warnBg"
                  >
                    <Icon name="lock" size={12} /> Tangguhkan
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleActivate(row)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-status-successFg hover:bg-status-successBg"
                  >
                    <Icon name="check" size={12} /> Aktifkan
                  </button>
                )}
              </div>
            )}
          </div>
        ),
      },
    ],
    [menuOpenFor],
  );

  // Close menu saat klik di luar.
  useEffect(() => {
    if (menuOpenFor === null) return;
    const close = () => setMenuOpenFor(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpenFor]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-[16px] border border-line-sand bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full border border-line-sand bg-white p-1">
            {STATUS_OPTIONS.map((opt) => {
              const active = opt.key === status;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setStatus(opt.key)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                    active ? "bg-brand-deep text-white" : "text-ink-tertiary hover:text-brand-deep"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {roles.length > 0 && (
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-md border border-line-sand bg-white px-3 py-1.5 text-[12px] text-ink-tertiary"
            >
              <option value="all">Semua peran</option>
              {roles.map((r) => (
                <option key={r.id} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
          <span className="text-[12px] text-ink-muted">
            {loading ? "Memuat…" : `${total} user`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <SearchBar value={search} onChange={setSearch} placeholder="Cari nama / email…" className="w-[240px]" />
          <Button
            type="button"
            hierarchy="primary"
            size="sm"
            onClick={() => setFormModal({ mode: "create" })}
            prefixIcon={<Icon name="user" size={12} />}
          >
            Tambah User
          </Button>
        </div>
      </div>

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

      <DataTable<BackendUserDTO>
        columns={columns}
        rows={users}
        getRowKey={(row) => String(row.id)}
        loading={loading}
        emptyLabel={search ? `Tidak ada user cocok dengan "${search}".` : "Belum ada user."}
      />

      {formModal && (
        <UserFormModal
          mode={formModal.mode}
          user={formModal.mode === "edit" ? formModal.user : undefined}
          roles={roles}
          onClose={() => setFormModal(null)}
          onSaved={() => {
            showToast(formModal.mode === "create" ? "User berhasil dibuat." : "User berhasil diperbarui.");
            reload();
          }}
        />
      )}

      {resetModal && (
        <ResetPasswordModal
          user={resetModal}
          onClose={() => {
            setResetModal(null);
            reload();
          }}
        />
      )}
    </div>
  );
};

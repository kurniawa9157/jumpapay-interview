import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@idds/react";
import { Icon } from "../../components/Icon";
import { Field, TextInput } from "../../components/formKit";
import { Badge } from "../../components/data/Badge";
import {
  ApiError,
  changeMyPassword,
  getMyProfile,
  listMySessions,
  revokeMySession,
  revokeOtherSessions,
  tokenStore,
} from "../../api";
import type { AccountSessionDTO } from "../../api";
import { Account2FA } from "./Account2FA";

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export const AccountKeamanan: React.FC = () => {
  // --- 2FA status (fetched dari profile) ---
  const [twoFaEnabled, setTwoFaEnabled] = useState<boolean>(false);
  const reload2FAStatus = useCallback(async () => {
    try {
      const p = await getMyProfile();
      setTwoFaEnabled(p.two_factor_enabled);
    } catch {
      /* non-fatal — default false */
    }
  }, []);
  useEffect(() => {
    reload2FAStatus();
  }, [reload2FAStatus]);

  // --- Ganti password ---
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);
    if (pwForm.next.length < 8) {
      setPwError("Password baru minimal 8 karakter.");
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError("Konfirmasi password tidak cocok.");
      return;
    }
    if (pwForm.current === pwForm.next) {
      setPwError("Password baru harus berbeda dengan yang lama.");
      return;
    }
    setPwSubmitting(true);
    try {
      const keep = tokenStore.getRefresh() || undefined;
      await changeMyPassword({
        current_password: pwForm.current,
        new_password: pwForm.next,
        keep_refresh_token: keep,
      });
      setPwForm({ current: "", next: "", confirm: "" });
      setPwSuccess("Password berhasil diubah. Sesi di device lain telah di-logout; Anda tetap login di sini.");
      reloadSessions();
    } catch (err) {
      setPwError(err instanceof ApiError ? err.message : "Gagal mengubah password.");
    } finally {
      setPwSubmitting(false);
    }
  };

  // --- Sesi aktif ---
  const [sessions, setSessions] = useState<AccountSessionDTO[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<number | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);
  const [sessionsToast, setSessionsToast] = useState<string | null>(null);

  const reloadSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const refresh = tokenStore.getRefresh() || undefined;
      const list = await listMySessions(refresh);
      setSessions(list);
    } catch (err) {
      setSessionsError(err instanceof ApiError ? err.message : "Gagal memuat sesi.");
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadSessions();
  }, [reloadSessions]);

  const showSessionToast = (msg: string) => {
    setSessionsToast(msg);
    setTimeout(() => setSessionsToast(null), 3000);
  };

  const handleRevokeOne = async (s: AccountSessionDTO) => {
    if (s.is_current) {
      if (!confirm("Ini sesi yang sedang Anda pakai. Melanjutkan akan membuat Anda otomatis logout. Yakin?")) return;
    } else {
      if (!confirm("Logout sesi ini?")) return;
    }
    setRevoking(s.id);
    try {
      await revokeMySession(s.id);
      if (s.is_current) {
        // Token sendiri di-revoke — next request akan 401 → auto logout via onAuthExpired.
        // Tapi kita bisa langsung reload ke login.
        tokenStore.clear();
        window.location.reload();
        return;
      }
      showSessionToast("Sesi berhasil di-logout.");
      reloadSessions();
    } catch (err) {
      setSessionsError(err instanceof ApiError ? err.message : "Gagal logout sesi.");
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeOthers = async () => {
    if (!confirm("Logout dari semua device lain? Anda tetap login di device ini.")) return;
    setRevokingOthers(true);
    try {
      const keep = tokenStore.getRefresh() || "";
      await revokeOtherSessions(keep);
      showSessionToast("Semua device lain telah di-logout.");
      reloadSessions();
    } catch (err) {
      setSessionsError(err instanceof ApiError ? err.message : "Gagal revoke.");
    } finally {
      setRevokingOthers(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* --- 2FA --- */}
      <Account2FA enabled={twoFaEnabled} onChanged={reload2FAStatus} />

      {/* --- Ganti password --- */}
      <div className="rounded-[20px] border border-line-sand bg-white p-6 shadow-[0_14px_36px_rgba(15,30,61,0.04)]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Keamanan akun</div>
        <h2 className="mt-1 font-serif text-[1.3rem] tracking-[-0.02em] text-brand">Ganti Password</h2>
        <p className="mt-2 text-[13px] text-ink-soft">
          Setelah password diubah, semua sesi aktif di device lain akan otomatis di-logout. Anda tetap login di device ini.
        </p>

        <form onSubmit={handleChangePassword} className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Password saat ini" required colSpan={2}>
            <TextInput
              type="password"
              value={pwForm.current}
              onChange={(v) => setPwForm({ ...pwForm, current: v })}
              placeholder="Masukkan password yang Anda pakai sekarang"
            />
          </Field>
          <Field label="Password baru" required hint="Minimal 8 karakter">
            <TextInput
              type="password"
              value={pwForm.next}
              onChange={(v) => setPwForm({ ...pwForm, next: v })}
            />
          </Field>
          <Field label="Konfirmasi password baru" required>
            <TextInput
              type="password"
              value={pwForm.confirm}
              onChange={(v) => setPwForm({ ...pwForm, confirm: v })}
            />
          </Field>

          {pwError && (
            <div className="col-span-2 rounded-md border border-status-dangerBorder bg-status-dangerBg px-3 py-2 text-[13px] text-status-dangerFg">
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="col-span-2 rounded-md border border-status-successBorder bg-status-successBg px-3 py-2 text-[13px] text-status-successFg">
              <Icon name="check" size={12} className="mr-1 inline" /> {pwSuccess}
            </div>
          )}

          <div className="col-span-2 flex justify-end">
            <Button
              type="submit"
              hierarchy="primary"
              disabled={pwSubmitting || !pwForm.current || !pwForm.next || !pwForm.confirm}
              prefixIcon={pwSubmitting ? <Icon name="spinner" size={14} className="animate-spin" /> : <Icon name="key" size={14} />}
            >
              Ubah Password
            </Button>
          </div>
        </form>
      </div>

      {/* --- Sesi aktif --- */}
      <div className="rounded-[20px] border border-line-sand bg-white p-6 shadow-[0_14px_36px_rgba(15,30,61,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Keamanan akun</div>
            <h2 className="mt-1 font-serif text-[1.3rem] tracking-[-0.02em] text-brand">Sesi Aktif</h2>
            <p className="mt-2 text-[13px] text-ink-soft">
              Daftar device yang sedang login dengan akun Anda. Anda bisa logout device tertentu atau semua sekaligus.
            </p>
          </div>
          {sessions.length > 1 && (
            <button
              type="button"
              onClick={handleRevokeOthers}
              disabled={revokingOthers}
              className="inline-flex items-center gap-2 rounded-md border border-status-warnBorder bg-status-warnBg px-3 py-2 text-[12px] font-semibold text-status-warnFg transition hover:opacity-90 disabled:opacity-60"
            >
              {revokingOthers ? <Icon name="spinner" size={12} className="animate-spin" /> : <Icon name="logout" size={12} />}
              Logout semua device lain
            </button>
          )}
        </div>

        {sessionsToast && (
          <div className="mt-3 rounded-md border border-status-successBorder bg-status-successBg px-3 py-2 text-[13px] text-status-successFg">
            <Icon name="check" size={12} className="mr-1 inline" /> {sessionsToast}
          </div>
        )}
        {sessionsError && (
          <div className="mt-3 rounded-md border border-status-dangerBorder bg-status-dangerBg px-3 py-2 text-[13px] text-status-dangerFg">
            {sessionsError}
          </div>
        )}

        <div className="mt-5 divide-y divide-line-sand/60">
          {sessionsLoading ? (
            <div className="py-6 text-sm text-ink-muted">Memuat sesi…</div>
          ) : sessions.length === 0 ? (
            <div className="py-6 text-sm text-ink-muted">Tidak ada sesi aktif.</div>
          ) : (
            sessions.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper-cream text-ink-tertiary">
                  <Icon name="shield" size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-brand">{s.device_info || "Device tidak diketahui"}</span>
                    {s.is_current && <Badge variant="success">Sesi ini</Badge>}
                  </div>
                  <div className="mt-0.5 text-[12px] text-ink-muted">
                    IP {s.ip_address || "—"} · Dimulai {formatDateTime(s.issued_at)}
                  </div>
                  <div className="text-[11px] text-ink-muted">Berlaku hingga {formatDateTime(s.expires_at)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevokeOne(s)}
                  disabled={revoking === s.id}
                  className="inline-flex items-center gap-2 rounded-md border border-line-sand bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-tertiary transition hover:border-status-dangerFg hover:text-status-dangerFg disabled:opacity-60"
                >
                  {revoking === s.id ? (
                    <Icon name="spinner" size={12} className="animate-spin" />
                  ) : (
                    <Icon name="logout" size={12} />
                  )}
                  {s.is_current ? "Logout dari sini" : "Logout"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

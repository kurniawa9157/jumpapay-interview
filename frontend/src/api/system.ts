import { request } from "./client";
import type { EppatBrand } from "../theme";

// GET /system/theme — public, dipanggil sebelum login untuk hydrate tema.
export const getSystemTheme = async (): Promise<{ brand: EppatBrand }> => {
  return request<{ brand: EppatBrand }>("/system/theme", { skipAuth: true });
};

// PUT /admin/system/theme — admin only (permission SYSTEM_SETTINGS edit).
export const updateSystemTheme = async (brand: EppatBrand): Promise<{ brand: EppatBrand }> => {
  return request<{ brand: EppatBrand }>("/admin/system/theme", {
    method: "PUT",
    body: { brand },
  });
};

// --- Generic settings CRUD (admin) ---

export interface SystemSettingRow {
  group_code: string;
  key: string;
  value: string;
  updated_at: string;
}

export const adminListSettings = async (): Promise<SystemSettingRow[]> => {
  const res = await request<{ settings: SystemSettingRow[] | null }>("/admin/system/settings");
  return res.settings || [];
};

export interface SystemSettingUpdateEntry {
  key: string;
  value: string;
}

export const adminUpdateSettings = async (
  entries: SystemSettingUpdateEntry[],
): Promise<{ updated: number }> => {
  return request<{ updated: number }>("/admin/system/settings", {
    method: "PUT",
    body: { entries },
  });
};

// Public snapshot — brand + app_name + maintenance status.
export interface SystemSnapshot {
  brand_theme?: string;
  app_name?: string;
  app_tagline?: string;
  maintenance_mode?: string;
  maintenance_message?: string;
}

export const getSystemSnapshot = async (): Promise<SystemSnapshot> => {
  return request<SystemSnapshot>("/system/snapshot", { skipAuth: true });
};

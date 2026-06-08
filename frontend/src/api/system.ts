import { request } from "./client";
import type { JumpaPayBrand } from "../theme";
import type { AppearanceTemplate } from "../types/appearance.types";

// GET /system/theme — public, dipanggil sebelum login untuk hydrate tema.
export const getSystemTheme = async (): Promise<{ brand: JumpaPayBrand }> => {
  return request<{ brand: JumpaPayBrand }>("/system/theme", { skipAuth: true });
};

// PUT /admin/system/theme — admin only (permission SYSTEM_SETTINGS edit).
export const updateSystemTheme = async (brand: JumpaPayBrand): Promise<{ brand: JumpaPayBrand }> => {
  return request<{ brand: JumpaPayBrand }>("/admin/system/theme", {
    method: "PUT",
    body: { brand },
  });
};

// GET /system/appearance — public, dipanggil sebelum mount untuk hydrate
// warna, logo, dan gaya komponen.
export const getSystemAppearance = async (): Promise<AppearanceTemplate> => {
  return request<AppearanceTemplate>("/system/appearance", { skipAuth: true });
};

// PUT /admin/cms/appearance — CMS only (permission CONTENT_MGMT edit).
export const updateSystemAppearance = async (
  template: AppearanceTemplate,
): Promise<AppearanceTemplate> => {
  return request<AppearanceTemplate>("/admin/cms/appearance", {
    method: "PUT",
    body: template,
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

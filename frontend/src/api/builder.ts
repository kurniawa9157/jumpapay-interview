import { request } from "./client";
import type { Template, TemplateValue, TemplateWithValues } from "../types/cms";

// Admin templates API.

export interface AdminListTemplatesParams {
  type_template?: string;
  only_active?: boolean;
}

export const adminListTemplates = async (
  params: AdminListTemplatesParams = {},
): Promise<Template[]> => {
  const qs = new URLSearchParams();
  if (params.type_template) qs.set("type_template", params.type_template);
  if (params.only_active) qs.set("only_active", "1");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await request<{ templates: Template[] | null }>(
    `/admin/templates${suffix}`,
  );
  return res.templates || [];
};

export const adminGetTemplate = (id: number | string): Promise<TemplateWithValues> =>
  request<TemplateWithValues>(`/admin/templates/${id}`);

export interface AdminCreateTemplateInput {
  code: string;
  name: string;
  type_template: "page" | "slider" | "menu" | "footer";
  slug?: string;
  is_active?: boolean;
}

export const adminCreateTemplate = (input: AdminCreateTemplateInput): Promise<{ id: number }> =>
  request<{ id: number }>("/admin/templates", { method: "POST", body: input });

export interface AdminUpdateTemplateInput {
  name: string;
  slug?: string;
  is_active: boolean;
}

export const adminUpdateTemplate = (
  id: number,
  input: AdminUpdateTemplateInput,
): Promise<void> =>
  request<void>(`/admin/templates/${id}`, { method: "PATCH", body: input });

export const adminDeleteTemplate = (id: number): Promise<void> =>
  request<void>(`/admin/templates/${id}`, { method: "DELETE" });

// PUT /admin/templates/:id/values/:key — upsert single value (mis. layout).
export const adminSetTemplateValue = (
  templateID: number,
  key: string,
  value: string,
): Promise<{ ok: true }> =>
  request<{ ok: true }>(`/admin/templates/${templateID}/values/${key}`, {
    method: "PUT",
    body: { value },
  });

// POST /admin/templates/:id/items — append new item (key auto 'item_<n>').
export const adminAddTemplateItem = (
  templateID: number,
  value: string,
): Promise<TemplateValue> =>
  request<TemplateValue>(`/admin/templates/${templateID}/items`, {
    method: "POST",
    body: { value },
  });

export const adminUpdateTemplateItem = (
  templateID: number,
  itemID: number,
  value: string,
): Promise<void> =>
  request<void>(`/admin/templates/${templateID}/items/${itemID}`, {
    method: "PUT",
    body: { value },
  });

export const adminDeleteTemplateItem = (
  templateID: number,
  itemID: number,
): Promise<void> =>
  request<void>(`/admin/templates/${templateID}/items/${itemID}`, {
    method: "DELETE",
  });

export const adminReorderTemplateItems = (
  templateID: number,
  ids: number[],
): Promise<void> =>
  request<void>(`/admin/templates/${templateID}/items/reorder`, {
    method: "PUT",
    body: { ids },
  });

// Helper: simpan layout (blocks) ke template via SetValue dengan key='layout'.
export const adminSaveLayout = (
  templateID: number,
  blocks: unknown[],
): Promise<{ ok: true }> =>
  adminSetTemplateValue(templateID, "layout", JSON.stringify(blocks));

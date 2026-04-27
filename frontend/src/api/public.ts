import { request } from "./client";
import type { Post, TemplateWithValues } from "../types/cms";

// GET /public/template?slug=/  — fetch landing page template (type='page').
export const getPublicTemplateBySlug = (slug: string): Promise<TemplateWithValues> =>
  request<TemplateWithValues>(`/public/template?slug=${encodeURIComponent(slug)}`, { skipAuth: true });

// GET /public/template/:id — generic, dipakai renderer untuk resolve referenced
// template (slider/menu/footer berdasarkan id di block props).
export const getPublicTemplateByID = (id: number | string): Promise<TemplateWithValues> =>
  request<TemplateWithValues>(`/public/template/${id}`, { skipAuth: true });

// GET /public/posts?type=post&limit=6 — list published posts.
export interface ListPublicPostsParams {
  type?: "post" | "page";
  limit?: number;
  page?: number;
}

export const listPublicPosts = (params: ListPublicPostsParams = {}): Promise<{
  posts: Post[];
  total: number;
  page: number;
  limit: number;
}> => {
  const qs = new URLSearchParams();
  if (params.type) qs.set("type", params.type);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.page) qs.set("page", String(params.page));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request(`/public/posts${suffix}`, { skipAuth: true });
};

// GET /public/posts/:slug
export const getPublicPostBySlug = (slug: string): Promise<Post> =>
  request<Post>(`/public/posts/${encodeURIComponent(slug)}`, { skipAuth: true });

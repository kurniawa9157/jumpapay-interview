import { request, baseUrl, tokenStore } from "./client";
import type { Post, MediaFile } from "../types/cms";

// ===== Posts =====

export interface AdminListPostsParams {
  type?: "post" | "page";
  status?: "draft" | "published" | "archived";
  search?: string;
  page?: number;
  limit?: number;
}

export const adminListPosts = (params: AdminListPostsParams = {}): Promise<{
  posts: Post[];
  total: number;
  page: number;
  limit: number;
}> => {
  const qs = new URLSearchParams();
  if (params.type) qs.set("type", params.type);
  if (params.status) qs.set("status", params.status);
  if (params.search) qs.set("search", params.search);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request(`/admin/posts${suffix}`);
};

export const adminGetPost = (id: number): Promise<Post> =>
  request<Post>(`/admin/posts/${id}`);

export interface AdminCreatePostInput {
  slug: string;
  title: string;
  excerpt?: string | null;
  content?: string | null;
  cover_image?: string | null;
  cover_aspect?: string;
  type: "post" | "page";
  status: "draft" | "published" | "archived";
  tags?: string | null;
}

export const adminCreatePost = (input: AdminCreatePostInput): Promise<{ id: number }> =>
  request<{ id: number }>("/admin/posts", { method: "POST", body: input });

export const adminUpdatePost = (id: number, input: AdminCreatePostInput): Promise<void> =>
  request<void>(`/admin/posts/${id}`, { method: "PATCH", body: input });

export const adminDeletePost = (id: number): Promise<void> =>
  request<void>(`/admin/posts/${id}`, { method: "DELETE" });

// ===== Media =====

export const adminListMedia = (limit = 50, page = 1): Promise<{
  media: MediaFile[];
  total: number;
  page: number;
  limit: number;
}> => request(`/admin/media?limit=${limit}&page=${page}`);

export const adminDeleteMedia = (id: number): Promise<void> =>
  request<void>(`/admin/media/${id}`, { method: "DELETE" });

// adminUploadMedia — multipart upload via fetch direct (gak bisa pakai
// request<T> helper karena body multipart). Manual handle Authorization
// header dari tokenStore.
export const adminUploadMedia = async (file: File): Promise<MediaFile> => {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${baseUrl}/admin/media/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenStore.getAccess() || ""}`,
    },
    body: fd,
  });
  if (!res.ok) {
    let message = "Upload gagal";
    try {
      const data = await res.json();
      message = data.message || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json();
};

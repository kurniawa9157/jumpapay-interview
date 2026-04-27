// CMS DTO mirror dari backend domain types.

export interface Template {
  id: number
  code: string
  name: string
  type_template: 'page' | 'slider' | 'menu' | 'footer'
  slug?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  updated_by_id?: number | null
}

export interface TemplateValue {
  id: number
  template_id: number
  key: string
  value: string
  order: number
  updated_at: string
}

export interface TemplateWithValues extends Template {
  values: TemplateValue[]
}

export interface Post {
  id: number
  slug: string
  title: string
  excerpt?: string | null
  content?: string | null
  cover_image?: string | null
  // Persentase tinggi cover terhadap lebar di detail page (mis. "60" =
  // padding-bottom 60%, ~16:9). "auto" = pakai ukuran natural image.
  cover_aspect: string
  // use_builder = true → render public pakai page_layout JSON; false →
  // render content HTML (perilaku existing). Hanya relevan untuk type='page'.
  use_builder: boolean
  page_layout?: string | null
  type: 'post' | 'page'
  status: 'draft' | 'published' | 'archived'
  tags?: string | null
  sequence: number
  published_at?: string | null
  author_id?: number | null
  created_at: string
  updated_at: string
}

export interface MediaFile {
  id: number
  filename: string
  original_name?: string | null
  mime_type: string
  size_bytes: number
  uploaded_by_id?: number | null
  has_thumbnails: boolean
  created_at: string
  // URL original. URLThumb/Medium/Large adalah variant resize (300/800/
  // 1600w). Kalau has_thumbnails=false, semua variant fallback ke URL
  // original — frontend bisa pakai responsive srcset tanpa branching.
  url: string
  url_thumb: string
  url_medium: string
  url_large: string
}

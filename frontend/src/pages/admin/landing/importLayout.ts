// Util untuk import layout dari ZIP yang di-export builder eksternal.
// Format ZIP: layout.json (root) + folder images/ dengan path yg di-reference
// dari JSON (mis. "images/abc.png").
//
// Flow:
//   1. JSZip buka ZIP
//   2. Parse + validate layout.json
//   3. Loop file di folder images/ → upload via adminUploadMedia → dapat URL
//      runtime ("/uploads/uuid-xxx.png")
//   4. Rewrite SEMUA reference "images/xxx" di JSON jadi URL runtime
//   5. Regenerate block id (jangan pakai id dari file)
//   6. Auto-create master template (slider/menu/footer) dari inline data
//   7. Return {name, layout} siap di-save sebagai template baru

import JSZip from "jszip";
import { adminUploadMedia } from "../../../api/content";
import { adminCreateTemplate, adminAddTemplateItem } from "../../../api/builder";
import type { BuilderComponent, ComponentType } from "../../../types/builder.types";
import { COMPONENT_DEFAULTS, generateId } from "../../../types/builder.types";

const VALID_TYPES: ReadonlySet<ComponentType> = new Set([
  "navbar", "slider", "html_block", "card_grid", "image_block", "article_grid", "footer",
]);

// Mapping field name dari JSON ekspor → schema master template yang
// dipakai SliderBlock/NavbarBlock/FooterBlock (lihat block components).
// Slider:  JSON slides[].{image,title,subtitle,ctaText,ctaUrl}
//   → master values item_N = JSON {image_url, caption, subtitle, link}
// Menu:    JSON menuItems[].{label, url, target?}
//   → master values item_N = JSON {label, url, target}
// Footer:  JSON columns[].{title, html?, links?}
//   → master values item_N = JSON {title, content}
//     (links[] di-flatten jadi <ul> HTML supaya muat di shape FooterWidget)
function mapSlideToMaster(s: any): Record<string, unknown> {
  return {
    image_url: typeof s?.image === "string" ? s.image : (s?.image_url ?? ""),
    caption: typeof s?.title === "string" ? s.title : (s?.caption ?? ""),
    subtitle: s?.subtitle ?? "",
    link: typeof s?.ctaUrl === "string" ? s.ctaUrl : (s?.link ?? ""),
  };
}

function mapMenuItemToMaster(m: any): Record<string, unknown> {
  return {
    label: m?.label ?? "",
    url: m?.url ?? "",
    target: m?.target === "_blank" ? "_blank" : "_self",
    parent_id: m?.parent_id ?? null,
  };
}

function mapFooterColumnToMaster(c: any): Record<string, unknown> {
  let content = "";
  if (typeof c?.html === "string" && c.html) {
    content = c.html;
  } else if (Array.isArray(c?.links) && c.links.length > 0) {
    const items = c.links
      .map((l: any) => `<li><a href="${escapeHtml(String(l?.url ?? "#"))}">${escapeHtml(String(l?.label ?? ""))}</a></li>`)
      .join("");
    content = `<ul class="space-y-1">${items}</ul>`;
  }
  return {
    title: c?.title ?? "",
    content,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface ImportResult {
  name: string;
  prompt?: string;
  blocks: BuilderComponent[];
  imageCount: number;
  uploadedImages: number;
}

export interface ImportProgress {
  step: "parsing" | "uploading" | "rewriting" | "done";
  current: number;
  total: number;
  message: string;
}

export class ImportError extends Error {}

type ImageMap = Map<string, string>;

export async function importLayoutZip(
  file: File,
  onProgress?: (p: ImportProgress) => void,
): Promise<ImportResult> {
  onProgress?.({ step: "parsing", current: 0, total: 0, message: "Membuka ZIP…" });
  const zip = await JSZip.loadAsync(file);
  const layoutFile = zip.file("layout.json");
  if (!layoutFile) {
    throw new ImportError("ZIP tidak punya file 'layout.json' di root.");
  }
  const layoutText = await layoutFile.async("string");
  let layoutJson: any;
  try {
    layoutJson = JSON.parse(layoutText);
  } catch (e) {
    throw new ImportError("layout.json bukan JSON valid: " + (e as Error).message);
  }

  if (!layoutJson || typeof layoutJson !== "object") {
    throw new ImportError("layout.json bukan object.");
  }
  if (!Array.isArray(layoutJson.layout)) {
    throw new ImportError("Field 'layout' (array) tidak ditemukan di JSON.");
  }
  const rawBlocks = layoutJson.layout as Array<{ id?: unknown; type?: unknown; props?: unknown }>;
  for (let i = 0; i < rawBlocks.length; i++) {
    const b = rawBlocks[i];
    if (typeof b.type !== "string" || !VALID_TYPES.has(b.type as ComponentType)) {
      throw new ImportError(`Block #${i + 1}: tipe '${b.type}' tidak dikenal.`);
    }
    if (b.props && typeof b.props !== "object") {
      throw new ImportError(`Block #${i + 1}: 'props' bukan object.`);
    }
  }

  const imageFiles: { path: string; file: JSZip.JSZipObject }[] = [];
  zip.folder("images")?.forEach((relativePath, fileObj) => {
    if (fileObj.dir) return;
    imageFiles.push({ path: `images/${relativePath}`, file: fileObj });
  });

  const imageMap: ImageMap = new Map();
  for (let i = 0; i < imageFiles.length; i++) {
    const { path, file: zf } = imageFiles[i];
    onProgress?.({
      step: "uploading",
      current: i,
      total: imageFiles.length,
      message: `Upload image ${i + 1}/${imageFiles.length}: ${path}`,
    });
    try {
      const blob = await zf.async("blob");
      const mime = guessMime(path);
      const namedFile = new File([blob], baseName(path), { type: mime });
      const uploaded = await adminUploadMedia(namedFile);
      imageMap.set(path, uploaded.url);
    } catch (e) {
      throw new ImportError(`Gagal upload ${path}: ${(e as Error).message}`);
    }
  }

  // Rewrite props per block + auto-create master template (slider/menu/footer)
  // dari inline data di JSON kalau ada. SliderBlock/NavbarBlock/FooterBlock
  // hanya fetch via master ID, jadi kita translate inline data → master template
  // baru + set ID-nya ke props.{slider_id, menu_navbar_id, footer_id}.
  onProgress?.({ step: "rewriting", current: 0, total: rawBlocks.length, message: "Memproses block…" });
  const baseSlug = slugify(layoutJson.name ?? "import");
  const layoutShortId = `${Date.now().toString(36).slice(-5)}`;
  const blocks: BuilderComponent[] = [];
  for (let i = 0; i < rawBlocks.length; i++) {
    const b = rawBlocks[i];
    const type = b.type as ComponentType;
    const props = rewriteProps(b.props ?? {}, imageMap);

    onProgress?.({
      step: "rewriting",
      current: i,
      total: rawBlocks.length,
      message: `Block ${i + 1}/${rawBlocks.length}: ${type}`,
    });

    if (type === "slider" && Array.isArray((props as any).slides) && (props as any).slides.length > 0) {
      const slides = (props as any).slides as any[];
      const code = `imp-slider-${baseSlug}-${layoutShortId}-${i}`.slice(0, 50);
      const sliderID = await createMasterFromItems("slider", code, `Slider — ${layoutJson.name ?? "import"} #${i + 1}`, slides, mapSlideToMaster);
      (props as any).slider_id = String(sliderID);
    }
    if (type === "navbar" && Array.isArray((props as any).menuItems) && (props as any).menuItems.length > 0) {
      const items = (props as any).menuItems as any[];
      const code = `imp-menu-${baseSlug}-${layoutShortId}-${i}`.slice(0, 50);
      const menuID = await createMasterFromItems("menu", code, `Menu — ${layoutJson.name ?? "import"} #${i + 1}`, items, mapMenuItemToMaster);
      (props as any).menu_navbar_id = String(menuID);
    }
    if (type === "footer" && Array.isArray((props as any).columns) && (props as any).columns.length > 0) {
      const cols = (props as any).columns as any[];
      const code = `imp-footer-${baseSlug}-${layoutShortId}-${i}`.slice(0, 50);
      const footerID = await createMasterFromItems("footer", code, `Footer — ${layoutJson.name ?? "import"} #${i + 1}`, cols, mapFooterColumnToMaster);
      (props as any).footer_id = String(footerID);
    }

    const merged = { ...COMPONENT_DEFAULTS[type], ...props };
    blocks.push({ id: generateId(), type, props: merged });
  }

  onProgress?.({ step: "done", current: rawBlocks.length, total: rawBlocks.length, message: "Selesai" });

  return {
    name: typeof layoutJson.name === "string" && layoutJson.name.trim() !== ""
      ? layoutJson.name.trim()
      : "Layout Import",
    prompt: typeof layoutJson.prompt === "string" ? layoutJson.prompt : undefined,
    blocks,
    imageCount: imageFiles.length,
    uploadedImages: imageMap.size,
  };
}

// rewriteProps — deep walk semua string di props, ganti reference "images/..."
// dengan URL hasil upload. Cover direct string props, nested array/object,
// dan HTML string (scan pattern src="images/...").
function rewriteProps(props: any, imageMap: ImageMap): Record<string, unknown> {
  const walk = (v: any): any => {
    if (v == null) return v;
    if (typeof v === "string") return rewriteString(v, imageMap);
    if (Array.isArray(v)) return v.map(walk);
    if (typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v)) out[k] = walk(val);
      return out;
    }
    return v;
  };
  return walk(props) as Record<string, unknown>;
}

function rewriteString(s: string, imageMap: ImageMap): string {
  if (s.startsWith("images/") && imageMap.has(s)) {
    return imageMap.get(s)!;
  }
  if (s.includes("images/")) {
    let out = s;
    for (const [from, to] of imageMap) {
      out = out.split(from).join(to);
    }
    return out;
  }
  return s;
}

function baseName(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx >= 0 ? path.slice(idx + 1) : path;
}

function guessMime(path: string): string {
  const ext = path.toLowerCase().split(".").pop() || "";
  switch (ext) {
    case "png": return "image/png";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "gif": return "image/gif";
    case "webp": return "image/webp";
    case "svg": return "image/svg+xml";
    default: return "application/octet-stream";
  }
}

// createMasterFromItems — POST /admin/templates lalu append item per-elemen.
async function createMasterFromItems<T>(
  type: "slider" | "menu" | "footer",
  code: string,
  name: string,
  items: T[],
  mapper: (item: T) => Record<string, unknown>,
): Promise<number> {
  const { id } = await adminCreateTemplate({
    code,
    name,
    type_template: type,
    slug: code,
    is_active: true,
  });
  for (const item of items) {
    const mapped = mapper(item);
    await adminAddTemplateItem(id, JSON.stringify(mapped));
  }
  return id;
}

export function suffixIfTaken(name: string, existing: string[]): string {
  if (!existing.includes(name)) return name;
  for (let i = 2; i < 100; i++) {
    const cand = `${name} (${i})`;
    if (!existing.includes(cand)) return cand;
  }
  return `${name} (${Date.now()})`;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 50);
}

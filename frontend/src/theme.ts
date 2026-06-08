// Brand theme switcher — wrapper di atas @idds/react theme API.
//
// Default: 'atrbpn' (CustomTheme palet ATR/BPN yang sudah di-desain UI/UX tim).
// Pilihan lain adalah BrandName bawaan IDDS (inagov, inaku, bgn, bkn, lan, panrb,
// default) — bisa dipilih admin via Pengaturan Sistem.
//
// Nilai disimpan di backend (tr_system_settings.brand_theme) supaya seluruh user
// melihat brand yang sama. Frontend hydrate lewat GET /api/v1/system/theme.

import {
  setBrandTheme as iddsSetBrandTheme,
  setCustomTheme,
  type BrandName,
  type CustomTheme,
} from "@idds/react";
import { setCurrentAppearance } from "./appearance";
import {
  DEFAULT_APPEARANCE_TEMPLATE,
  type AppearanceColors,
  type AppearanceComponentSettings,
  type AppearanceTemplate,
} from "./types/appearance.types";

// 'atrbpn' adalah opsi custom kita. Sisanya = BrandName IDDS.
export type JumpaPayBrand = "atrbpn" | BrandName;

export const DEFAULT_BRAND: JumpaPayBrand = "atrbpn";

// Palet ATR/BPN — mapping dari tailwind.config.js ke CSS var IDDS.
// Setelah "bridge Tailwind" (tailwind.config.js color pakai var(--ina-*)),
// semua custom component kita ikut brand switch. Default atrbpn harus
// explicit override semua var yang dipakai, kalau tidak → fallback ke palet
// IDDS default (biru) saat brand = atrbpn.
const atrbpnTheme: CustomTheme = {
  name: "atrbpn",
  colors: {
    // Brand — navy ATR/BPN (dipakai button primary, accent bar, ring focus).
    "--ina-brand-primary": "#0f1e3d",
    "--ina-brand-hover": "#10244f",

    // Content (teks) — heading navy, body gray dari palet kita.
    "--ina-content-primary": "#0f1e3d",
    "--ina-content-secondary": "#56657f",
    "--ina-content-tertiary": "#4b5871",

    // Background — paper putih-gading + cream + vanilla.
    "--ina-background-primary": "#fffdfa",
    "--ina-background-secondary": "#f6f2e9",
    "--ina-background-tertiary": "#fdfbf5",

    // Stroke — line sand tua untuk divider.
    "--ina-stroke-primary": "#ded6c7",
    "--ina-stroke-secondary": "#d9d1bf",
  },
};

// IDDS brand-specific vars punya naming tidak konsisten antar brand:
// - BGN, BKN, LAN, INAKU pakai --ina-{brand}-brand-primary / -hover
// - INAGOV, PANRB pakai --ina-primary-primary (di-scoped ke [data-brand])
// - IDDS default pakai --ina-primary-primary juga
//
// Untuk mirror ke --ina-brand-primary (generic), coba beberapa source
// sampai dapat value. Fallback atrbpn hex kalau semua kosong.
const BRAND_PRIMARY_SOURCES = [
  "--ina-{brand}-brand-primary",
  "--ina-primary-primary",
  "--ina-primary-500",
];
const BRAND_HOVER_SOURCES = [
  "--ina-{brand}-brand-hover",
  "--ina-primary-600",
];

// Base tokens netral (content/background/stroke) — selalu dipakai, tidak
// bergantung brand. Biar teks/kartu/border tetap sesuai look ATR/BPN
// meski brand di-switch ke BGN/BKN/dll.
const NEUTRAL_BASE_KEYS = [
  "--ina-content-primary",
  "--ina-content-secondary",
  "--ina-content-tertiary",
  "--ina-background-primary",
  "--ina-background-secondary",
  "--ina-background-tertiary",
  "--ina-stroke-primary",
  "--ina-stroke-secondary",
];

// RGB-triplet vars untuk token yang perlu opacity modifier di Tailwind
// (misal bg-paper-cream/40, ring-brand-deep/15). Tailwind 3.x tidak bisa
// apply opacity ke var() solid color — harus format `rgb(R G B / <alpha>)`.
// Jadi kita sediakan var paralel yang berisi triplet RGB.
const ATRBPN_RGB: Record<string, string> = {
  "--jumpapay-brand-rgb": "15 30 61",          // #0f1e3d (brand-primary / brand-deep)
  "--jumpapay-brand-hover-rgb": "16 36 79",    // #10244f
  "--jumpapay-paper-cream-rgb": "246 242 233", // #f6f2e9
  "--jumpapay-paper-vanilla-rgb": "253 251 245", // #fdfbf5
  "--jumpapay-line-sand-rgb": "222 214 199",   // #ded6c7
  "--jumpapay-line-sand-dark-rgb": "217 209 191", // #d9d1bf
};

function hexToRgbTriplet(hex: string): string | null {
  const s = hex.trim().replace(/^#/, "");
  if (s.length === 3) {
    const r = parseInt(s[0] + s[0], 16);
    const g = parseInt(s[1] + s[1], 16);
    const b = parseInt(s[2] + s[2], 16);
    return `${r} ${g} ${b}`;
  }
  if (s.length === 6) {
    const r = parseInt(s.slice(0, 2), 16);
    const g = parseInt(s.slice(2, 4), 16);
    const b = parseInt(s.slice(4, 6), 16);
    return `${r} ${g} ${b}`;
  }
  return null;
}

// Catatan: beberapa CSS var IDDS di-set dengan !important di :root
// (--ina-brand-hover, --ina-background-tertiary). setProperty tanpa
// priority 'important' tidak akan mengalahkan cascade itu — hasilnya
// override kita silently diabaikan. Makanya semua setProperty di sini
// pakai 'important'.
function setVar(key: string, value: string) {
  document.documentElement.style.setProperty(key, value, "important");
}

function setOptionalVar(key: string, value?: string) {
  if (value) setVar(key, value);
}

function applyNeutralBase() {
  for (const key of NEUTRAL_BASE_KEYS) {
    const v = atrbpnTheme.colors[key];
    if (v) setVar(key, v);
  }
}

// applyAtrbpnRgbTriplets — default RGB triplets untuk opacity-modifier Tailwind.
// Dipakai di atrbpn brand DAN saat brand non-atrbpn belum meng-override.
function applyAtrbpnRgbTriplets() {
  for (const [k, v] of Object.entries(ATRBPN_RGB)) {
    setVar(k, v);
  }
}

// mirrorBrandRgb — override --jumpapay-brand-rgb dengan hex brand IDDS aktif
// (convert hex → RGB triplet). Content/bg/stroke RGB tetap atrbpn (readability).
function mirrorBrandRgb(brand: string) {
  const hex = readFirstDefinedVar(BRAND_PRIMARY_SOURCES, brand);
  if (!hex) return;
  const triplet = hexToRgbTriplet(hex);
  if (triplet) {
    setVar("--jumpapay-brand-rgb", triplet);
    setVar("--jumpapay-brand-hover-rgb", triplet);
  }
}

function applyAtrbpnBrandVars() {
  // Khusus atrbpn: apply brand var dengan !important supaya mengalahkan
  // IDDS default !important (--ina-brand-hover).
  setVar("--ina-brand-primary", atrbpnTheme.colors["--ina-brand-primary"]!);
  setVar("--ina-brand-hover", atrbpnTheme.colors["--ina-brand-hover"]!);
}

function readRequiredVar(key: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(key).trim();
  return value || fallback;
}

// readFirstDefinedVar — coba beberapa source CSS var, ambil yang pertama
// punya value. Return hex/color string atau null kalau semua kosong.
function readFirstDefinedVar(sources: string[], brand: string): string | null {
  const cs = getComputedStyle(document.documentElement);
  for (const tpl of sources) {
    const src = tpl.replace("{brand}", brand);
    const v = cs.getPropertyValue(src).trim();
    if (v) return v;
  }
  return null;
}

function mirrorIddsBrandVars(brand: string) {
  const primary = readFirstDefinedVar(BRAND_PRIMARY_SOURCES, brand);
  setVar(
    "--ina-brand-primary",
    primary || atrbpnTheme.colors["--ina-brand-primary"]!,
  );
  const hover = readFirstDefinedVar(BRAND_HOVER_SOURCES, brand);
  setVar(
    "--ina-brand-hover",
    hover || primary || atrbpnTheme.colors["--ina-brand-hover"]!,
  );
}

// applyBrand — terapkan pilihan brand ke <html>. Idempotent, aman dipanggil
// beberapa kali (misal saat admin ganti preferensi).
export function applyBrand(brand: JumpaPayBrand) {
  if (brand === "atrbpn") {
    // setCustomTheme IDDS internally pakai setProperty tanpa priority.
    // Untuk var yang IDDS default-nya pakai !important (--ina-brand-hover),
    // override-nya tidak bekerja. Kita panggil IDDS first supaya data-brand
    // dilepas, lalu apply ulang semua var dengan !important.
    setCustomTheme(atrbpnTheme);
    applyNeutralBase();
    applyAtrbpnBrandVars();
    applyAtrbpnRgbTriplets();
    return;
  }
  // Brand non-atrbpn:
  // 1. Aktifkan brand IDDS (set data-brand attribute + var prefixed).
  iddsSetBrandTheme(brand);
  // 2. Apply neutral base ATR/BPN ke var generik (content/bg/stroke).
  //    Tidak pakai setCustomTheme supaya data-brand tidak hilang.
  applyNeutralBase();
  // 3. Mirror var prefixed brand → var generik (--ina-brand-primary dll).
  mirrorIddsBrandVars(brand);
  // 4. Set RGB triplet base + override brand triplet dengan hex IDDS aktif.
  applyAtrbpnRgbTriplets();
  mirrorBrandRgb(brand);
}

const COLOR_VAR_MAP: Record<keyof AppearanceColors, string> = {
  brand_primary: "--ina-brand-primary",
  brand_hover: "--ina-brand-hover",
  content_primary: "--ina-content-primary",
  content_secondary: "--ina-content-secondary",
  content_tertiary: "--ina-content-tertiary",
  background_primary: "--ina-background-primary",
  background_secondary: "--ina-background-secondary",
  background_tertiary: "--ina-background-tertiary",
  stroke_primary: "--ina-stroke-primary",
  stroke_secondary: "--ina-stroke-secondary",
};

export function getPresetAppearanceColors(brand: JumpaPayBrand): AppearanceColors {
  applyBrand(brand);
  return {
    brand_primary: readRequiredVar("--ina-brand-primary", atrbpnTheme.colors["--ina-brand-primary"]!),
    brand_hover: readRequiredVar("--ina-brand-hover", atrbpnTheme.colors["--ina-brand-hover"]!),
    content_primary: readRequiredVar("--ina-content-primary", atrbpnTheme.colors["--ina-content-primary"]!),
    content_secondary: readRequiredVar("--ina-content-secondary", atrbpnTheme.colors["--ina-content-secondary"]!),
    content_tertiary: readRequiredVar("--ina-content-tertiary", atrbpnTheme.colors["--ina-content-tertiary"]!),
    background_primary: readRequiredVar("--ina-background-primary", atrbpnTheme.colors["--ina-background-primary"]!),
    background_secondary: readRequiredVar("--ina-background-secondary", atrbpnTheme.colors["--ina-background-secondary"]!),
    background_tertiary: readRequiredVar("--ina-background-tertiary", atrbpnTheme.colors["--ina-background-tertiary"]!),
    stroke_primary: readRequiredVar("--ina-stroke-primary", atrbpnTheme.colors["--ina-stroke-primary"]!),
    stroke_secondary: readRequiredVar("--ina-stroke-secondary", atrbpnTheme.colors["--ina-stroke-secondary"]!),
  };
}

function applyCustomColors(colors: AppearanceColors) {
  setCustomTheme({
    name: "custom",
    colors: {
      "--ina-brand-primary": colors.brand_primary,
      "--ina-brand-hover": colors.brand_hover,
      "--ina-content-primary": colors.content_primary,
      "--ina-content-secondary": colors.content_secondary,
      "--ina-content-tertiary": colors.content_tertiary,
      "--ina-background-primary": colors.background_primary,
      "--ina-background-secondary": colors.background_secondary,
      "--ina-background-tertiary": colors.background_tertiary,
      "--ina-stroke-primary": colors.stroke_primary,
      "--ina-stroke-secondary": colors.stroke_secondary,
    },
  });

  for (const [source, target] of Object.entries(COLOR_VAR_MAP)) {
    setOptionalVar(target, colors[source as keyof AppearanceColors]);
  }

  setOptionalRgb("--jumpapay-brand-rgb", colors.brand_primary);
  setOptionalRgb("--jumpapay-brand-hover-rgb", colors.brand_hover);
  setOptionalRgb("--jumpapay-paper-cream-rgb", colors.background_secondary);
  setOptionalRgb("--jumpapay-paper-vanilla-rgb", colors.background_tertiary);
  setOptionalRgb("--jumpapay-line-sand-rgb", colors.stroke_primary);
  setOptionalRgb("--jumpapay-line-sand-dark-rgb", colors.stroke_secondary);
}

function setOptionalRgb(key: string, hex: string) {
  const triplet = hexToRgbTriplet(hex);
  if (triplet) setVar(key, triplet);
}

const APP_CLASS_PREFIXES = [
  "app-density-",
  "app-radius-",
  "app-button-",
  "app-form-",
  "app-tabs-",
  "app-table-",
  "app-card-",
  "app-modal-",
  "app-sidebar-",
];

function resetAppClasses(root: HTMLElement) {
  for (const cls of Array.from(root.classList)) {
    if (APP_CLASS_PREFIXES.some((prefix) => cls.startsWith(prefix))) {
      root.classList.remove(cls);
    }
  }
}

function applyComponentSettings(components: AppearanceComponentSettings) {
  const root = document.documentElement;
  resetAppClasses(root);
  root.classList.add(`app-density-${components.density}`);
  root.classList.add(`app-radius-${components.radius}`);
  root.classList.add(`app-button-${components.button.shape}`);
  root.classList.add(`app-button-default-${components.button.default_hierarchy}`);
  root.classList.add(`app-form-${components.form.size}`);
  root.classList.add(`app-form-label-${components.form.label_layout}`);
  root.classList.add(`app-form-radius-${components.form.field_radius}`);
  root.classList.add(`app-tabs-${components.tabs.variant}`);
  root.classList.add(`app-tabs-size-${components.tabs.size}`);
  root.classList.add(components.tabs.use_brand_color ? "app-tabs-brand" : "app-tabs-neutral");
  if (components.tabs.full_width) root.classList.add("app-tabs-full");
  root.classList.add(`app-table-${components.table.density}`);
  if (components.table.zebra) root.classList.add("app-table-zebra");
  root.classList.add(`app-card-${components.card.variant}`);
  root.classList.add(`app-card-shadow-${components.card.shadow}`);
  root.classList.add(`app-card-radius-${components.card.radius}`);
  root.classList.add(`app-modal-size-${components.modal.size}`);
  root.classList.add(`app-modal-${components.modal.header_style}`);
  root.classList.add(`app-sidebar-${components.sidebar.variant}`);
  root.classList.add(`app-sidebar-density-${components.sidebar.density}`);
  if (components.table.bordered) root.classList.add("app-table-bordered");
  if (components.table.sticky_header) root.classList.add("app-table-sticky");

  const controlRadius: Record<string, string> = {
    none: "0",
    sm: "6px",
    md: "8px",
    lg: "12px",
    pill: "999px",
  };
  const cardRadius: Record<string, string> = {
    none: "0",
    sm: "6px",
    md: "8px",
    lg: "14px",
  };
  setVar("--app-radius-control", controlRadius[components.form.field_radius] || "8px");
  setVar("--app-radius-card", cardRadius[components.card.radius] || "8px");
  setVar("--app-radius-modal", cardRadius[components.modal.radius] || "12px");
}

function applyFavicon(url: string) {
  if (!url) return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = url;
}

export function applyAppearanceTemplate(template: AppearanceTemplate) {
  const next: AppearanceTemplate = {
    ...DEFAULT_APPEARANCE_TEMPLATE,
    ...template,
    assets: { ...DEFAULT_APPEARANCE_TEMPLATE.assets, ...template.assets },
    components: {
      ...DEFAULT_APPEARANCE_TEMPLATE.components,
      ...template.components,
      button: { ...DEFAULT_APPEARANCE_TEMPLATE.components.button, ...template.components?.button },
      form: { ...DEFAULT_APPEARANCE_TEMPLATE.components.form, ...template.components?.form },
      tabs: { ...DEFAULT_APPEARANCE_TEMPLATE.components.tabs, ...template.components?.tabs },
      table: { ...DEFAULT_APPEARANCE_TEMPLATE.components.table, ...template.components?.table },
      card: { ...DEFAULT_APPEARANCE_TEMPLATE.components.card, ...template.components?.card },
      modal: { ...DEFAULT_APPEARANCE_TEMPLATE.components.modal, ...template.components?.modal },
      sidebar: { ...DEFAULT_APPEARANCE_TEMPLATE.components.sidebar, ...template.components?.sidebar },
    },
  };

  if (next.mode === "custom" && next.custom) {
    applyCustomColors(next.custom.colors);
  } else {
    applyBrand(next.preset_brand);
  }
  applyComponentSettings(next.components);
  applyFavicon(next.assets.favicon_url);
  setCurrentAppearance(next);
}

// AVAILABLE_BRANDS — opsi yang boleh dipilih admin. Urut sesuai prioritas
// tampilan di dropdown. swatch = brand-primary hex (buat preview color dot
// di UI). Hardcoded dari inspeksi node_modules/@idds/styles/dist/index.css
// — update kalau upgrade @idds/styles major version.
export const AVAILABLE_BRANDS: {
  value: JumpaPayBrand;
  label: string;
  hint?: string;
  swatch: string;
}[] = [
  { value: "atrbpn",  label: "Navy Dark",    swatch: "#0f1e3d", hint: "Biru navy gelap — default template" },
  { value: "default", label: "Navy Blue",    swatch: "#06264d", hint: "Biru navy standar IDDS" },
  { value: "inagov",  label: "Sky Blue",     swatch: "#629cef", hint: "Biru langit cerah" },
  { value: "inaku",   label: "Deep Blue",    swatch: "#06264d", hint: "Biru dalam" },
  { value: "bgn",     label: "Royal Blue",   swatch: "#0058ff", hint: "Biru royal" },
  { value: "bkn",     label: "Crimson",      swatch: "#de1d5e", hint: "Merah krimson" },
  { value: "lan",     label: "Steel Blue",   swatch: "#2663a3", hint: "Biru baja" },
  { value: "panrb",   label: "Burgundy",     swatch: "#b42b2d", hint: "Merah burgundy" },
];

export function isValidJumpaPayBrand(v: string): v is JumpaPayBrand {
  return AVAILABLE_BRANDS.some((b) => b.value === v);
}

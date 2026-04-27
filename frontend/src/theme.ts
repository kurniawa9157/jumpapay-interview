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

// 'atrbpn' adalah opsi custom kita. Sisanya = BrandName IDDS.
export type EppatBrand = "atrbpn" | BrandName;

export const DEFAULT_BRAND: EppatBrand = "atrbpn";

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
  "--eppat-brand-rgb": "15 30 61",          // #0f1e3d (brand-primary / brand-deep)
  "--eppat-brand-hover-rgb": "16 36 79",    // #10244f
  "--eppat-paper-cream-rgb": "246 242 233", // #f6f2e9
  "--eppat-paper-vanilla-rgb": "253 251 245", // #fdfbf5
  "--eppat-line-sand-rgb": "222 214 199",   // #ded6c7
  "--eppat-line-sand-dark-rgb": "217 209 191", // #d9d1bf
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

// mirrorBrandRgb — override --eppat-brand-rgb dengan hex brand IDDS aktif
// (convert hex → RGB triplet). Content/bg/stroke RGB tetap atrbpn (readability).
function mirrorBrandRgb(brand: string) {
  const hex = readFirstDefinedVar(BRAND_PRIMARY_SOURCES, brand);
  if (!hex) return;
  const triplet = hexToRgbTriplet(hex);
  if (triplet) {
    setVar("--eppat-brand-rgb", triplet);
    setVar("--eppat-brand-hover-rgb", triplet);
  }
}

function applyAtrbpnBrandVars() {
  // Khusus atrbpn: apply brand var dengan !important supaya mengalahkan
  // IDDS default !important (--ina-brand-hover).
  setVar("--ina-brand-primary", atrbpnTheme.colors["--ina-brand-primary"]!);
  setVar("--ina-brand-hover", atrbpnTheme.colors["--ina-brand-hover"]!);
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
export function applyBrand(brand: EppatBrand) {
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

// AVAILABLE_BRANDS — opsi yang boleh dipilih admin. Urut sesuai prioritas
// tampilan di dropdown. swatch = brand-primary hex (buat preview color dot
// di UI). Hardcoded dari inspeksi node_modules/@idds/styles/dist/index.css
// — update kalau upgrade @idds/styles major version.
export const AVAILABLE_BRANDS: {
  value: EppatBrand;
  label: string;
  hint?: string;
  swatch: string;
}[] = [
  { value: "atrbpn",  label: "ATR/BPN",      swatch: "#0f1e3d", hint: "Default — palet resmi e-PPAT" },
  { value: "default", label: "IDDS Default", swatch: "#06264d" },
  { value: "inagov",  label: "INA Gov",      swatch: "#629cef" },
  { value: "inaku",   label: "INA Ku",       swatch: "#06264d" },
  { value: "bgn",     label: "BGN",          swatch: "#0058ff" },
  { value: "bkn",     label: "BKN",          swatch: "#de1d5e" },
  { value: "lan",     label: "LAN",          swatch: "#2663a3" },
  { value: "panrb",   label: "PAN-RB",       swatch: "#b42b2d" },
];

export function isValidEppatBrand(v: string): v is EppatBrand {
  return AVAILABLE_BRANDS.some((b) => b.value === v);
}

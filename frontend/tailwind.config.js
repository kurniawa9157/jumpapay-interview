/** @type {import('tailwindcss').Config} */
//
// Bridge Tailwind → IDDS CSS vars (batch M5a):
// Token brand / ink / paper / line di-map ke var(--ina-*) supaya ikut
// setBrandTheme() dari @idds/react. Default value datang dari
// src/theme.ts atrbpnTheme (setCustomTheme).
//
// Yang TIDAK di-bridge (masih hex hardcoded):
//   - status.*   → semantic (success/warn/danger/info) stabil antar brand
//   - sidebar.*  → dark navy desain khusus, dibridge di batch lanjutan
//   - table.*    → dibridge di batch lanjutan
//   - accent.*   → dibridge di batch lanjutan (perlu keputusan UX)
//   - neutral, primary → Tailwind default palette, bukan token brand
//
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        neutral: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Token brand — pakai format rgb(var / <alpha-value>) supaya opacity
        // modifier (bg-brand-deep/10, ring-brand-deep/15, dll) bisa dikomposisi.
        // Triplet RGB di-set runtime di theme.ts (ikut brand switch).
        brand: {
          DEFAULT: 'rgb(var(--jumpapay-brand-rgb) / <alpha-value>)',
          deep:    'rgb(var(--jumpapay-brand-rgb) / <alpha-value>)',
          dark:    'rgb(var(--jumpapay-brand-hover-rgb) / <alpha-value>)',
        },
        // Accent (pink magenta) — tetap hex, belum di-bridge.
        accent: {
          DEFAULT: '#be185d',
        },
        // Ink (teks sekunder/tersier) — bridge ke --ina-content-*.
        ink: {
          muted:    'var(--ina-content-secondary)',
          soft:     'var(--ina-content-secondary)',
          tertiary: 'var(--ina-content-tertiary)',
        },
        // Paper (background) — pakai rgb(var / alpha) untuk opacity modifier.
        // sky / mint tetap hex (varian khusus).
        paper: {
          DEFAULT: 'var(--ina-background-primary)',
          cream:   'rgb(var(--jumpapay-paper-cream-rgb) / <alpha-value>)',
          vanilla: 'rgb(var(--jumpapay-paper-vanilla-rgb) / <alpha-value>)',
          sky:     '#eef3fb',
          mint:    '#edf8f5',
        },
        // Line (border) — pakai rgb(var / alpha).
        line: {
          cream:     'rgb(var(--jumpapay-line-sand-dark-rgb) / <alpha-value>)',
          sand:      'rgb(var(--jumpapay-line-sand-rgb) / <alpha-value>)',
          sandDark:  'rgb(var(--jumpapay-line-sand-dark-rgb) / <alpha-value>)',
          skyLight:  '#dae3f1',
          mintLight: '#d7e8e2',
          cream2:    'rgb(var(--jumpapay-line-sand-rgb) / <alpha-value>)',
        },
        // Status palette — semantic, TIDAK ikut brand switch (sengaja).
        status: {
          successBg: '#ecfdf5',
          successFg: '#047857',
          successBorder: '#a7f3d0',
          warnBg: '#fffbeb',
          warnFg: '#b45309',
          warnBorder: '#fde68a',
          infoBg: '#eff6ff',
          infoFg: '#1d4ed8',
          infoBorder: '#bfdbfe',
          dangerBg: '#fef2f2',
          dangerFg: '#b91c1c',
          dangerBorder: '#fecaca',
          neutralBg: '#f1f5f9',
          neutralFg: '#475569',
          neutralBorder: '#cbd5e1',
        },
        // Sidebar admin — bridge ke --ina-brand-*.
        // Default atrbpn = navy (dari theme.ts). Saat pilih brand lain,
        // sidebar ikut warna brand. Catatan: beberapa brand IDDS punya
        // brand-primary yang lebih terang; kontras teks putih mungkin
        // perlu diperhatikan.
        sidebar: {
          admin:       'var(--ina-brand-primary)',
          adminHover:  'var(--ina-brand-hover)',
          // adminActive pakai color-mix: navy brand + 25% white = lighter
          // shade untuk "page aktif" state. Supported di modern browsers.
          adminActive: 'color-mix(in srgb, var(--ina-brand-primary) 70%, white 30%)',
        },
        // Table — bridge ke background family.
        table: {
          headerBg: 'var(--ina-background-secondary)',
          rowHover: 'var(--ina-background-tertiary)',
          zebra:    'var(--ina-background-tertiary)',
        },
      }
    },
  },
  plugins: [],
}

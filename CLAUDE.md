# CLAUDE.md — Panduan Agent untuk Template Base

> Template foundation: Auth + RBAC + User Management + IDDS Brand Theme.
> Diekstrak dari project e-PPAT, di-strip ke layer pondasi yang reusable.

## Apa ini?

**template-base**: foundation siap pakai untuk membangun aplikasi web Go + React + IDDS. Tinggal `git clone`, ganti nama project, dan mulai tambah feature project-specific Anda di atasnya.

**Stack:**
- Backend: Go 1.22+ + gin + PostgreSQL 16 + Redis 7
- Frontend: React 18 + TypeScript + Vite + Tailwind 3.4 + `@idds/react` v1.6.17
- Auth: JWT (access + refresh) + 2FA TOTP
- Deploy: Docker Compose + Nginx Proxy Manager

## Yang sudah jadi (jangan utak-atik kecuali untuk customize)

### Backend
- **Auth flow lengkap**: login (email/phone identifier) + 2FA TOTP wizard + refresh token rotation + logout + scope claim di JWT
- **RBAC**: role × module × CRUD permission matrix, super admin bypass
- **User management**: CRUD via `/admin/users` + suspend/activate + reset password (generate random 12-char)
- **Role management**: CRUD `/admin/roles` + permission matrix endpoint
- **Account self-service** (`/me/*`): GET/PATCH profile, ganti password (revoke sesi lain), list+revoke sessions, 2FA setup/confirm/disable
- **System settings** (`/admin/system/*`): brand theme + general settings (app_name, app_tagline, timezone, maintenance_mode, maintenance_message)
- **Audit log**: `th_user_activity` — login, logout, login_failed, password_change, 2fa events
- **Health check**: `/health` (basic) + `/health/ready` (ping DB + Redis, 503 kalau degraded)
- **Migrasi**: `000001_init_schema` (10 tables) + `000002_seed_references` (lookup + role admin + permission seed) + `000004_seed_appearance` (brand_theme default)

### Frontend
- **LoginPage** dengan flow 2FA wizard (state machine credentials → 2fa)
- **AdminLayout** dengan sidebar permission-aware nav
- **Admin pages**: Dashboard (stats + recent activity), Daftar User (CRUD modal), Peran & Izin (matrix), Pengaturan (Tema brand + Pengaturan Umum)
- **Account pages**: Akun Saya (Data Diri + Keamanan dengan 2FA + sesi aktif)
- **IDDS theme system**: brand switcher 8 brand (ATR/BPN custom + 7 IDDS) + RGB triplet untuk opacity modifier + cascade !important fix + auto-reload setelah simpan
- **Components**: formKit (TextInput, Select, RadioCards, UploadField), DataTable, Badge, SearchBar, StatCard, modal hooks (useModalClose dengan ESC + click-outside + scroll lock)
- **Landing page** generic minimal — hero card + 3 feature card. Customize sesuai project.

## Layout repo

```
backend/
  cmd/
    server/main.go        — entry HTTP server
    seed/main.go          — buat super admin pertama (idempotent)
  internal/
    config/               — env loader
    domain/               — pure types + errors
    repository/postgres/  — pgx-based repos
    service/              — business logic (auth, account, permission, system, user)
    http/
      handler/            — HTTP handlers
      middleware/         — auth, permission, ratelimit, recovery, cors, logger
      response/           — JSON helpers + domain error mapping
      router.go           — mount semua route + middleware stack
    platform/             — db, redis, logger init
  migrations/             — golang-migrate SQL up/down
  Dockerfile, Makefile, docker-compose.yml, .env.example

frontend/
  src/
    api/                  — typed clients (auth, account, admin, system)
    components/           — IDDS + custom (formKit, shell, data, hooks)
    pages/                — LoginPage, RoleLanding, admin/, account/
    theme.ts              — brand switcher + atrbpnTheme + RGB triplet logic
    main.tsx              — hydrate theme sebelum mount
    App.tsx               — view routing minimal (state-based, tanpa React Router)
  tailwind.config.js      — color tokens bridged ke var(--ina-*)
  Dockerfile, nginx.conf, vite.config.ts, package.json
```

## Konsep Theme System (WAJIB PAHAMI)

1. **Admin pilih brand** di Pengaturan → PUT `/api/v1/admin/system/theme` → disimpan di `tr_system_settings.brand_theme`
2. **Public GET** `/api/v1/system/theme` di-fetch di [main.tsx](frontend/src/main.tsx) sebelum mount → `applyBrand(brand)` → set CSS var di `<html>`
3. **Komponen IDDS** (Button, TextField, Modal, Badge, Alert, Checkbox, SelectDropdown) pakai `var(--ina-*)` internally — otomatis ikut brand
4. **Custom Tailwind komponen** pakai class `bg-brand`, `text-ink-muted`, dll. Token di [tailwind.config.js](frontend/tailwind.config.js) bridge ke `var(--ina-*)` atau `rgb(var(--eppat-*-rgb) / <alpha-value>)`
5. **RGB triplet vars** (`--eppat-brand-rgb`, `--eppat-paper-cream-rgb`, dst) diperlukan untuk opacity modifier (`bg-paper-cream/40`) — Tailwind 3.x tidak bisa compose alpha ke `var()` solid
6. Auto-reload setelah Simpan supaya brand apply konsisten semua area

### File kunci theme:
- [frontend/src/theme.ts](frontend/src/theme.ts) — `applyBrand()`, `atrbpnTheme`, `mirrorIddsBrandVars()`, `mirrorBrandRgb()`, `hexToRgbTriplet()`
- [frontend/src/main.tsx](frontend/src/main.tsx) — hydrate theme sebelum mount
- [frontend/src/pages/admin/AdminPengaturan.tsx](frontend/src/pages/admin/AdminPengaturan.tsx) — UI switcher
- [backend/internal/service/system/service.go](backend/internal/service/system/service.go) — validasi brand
- [backend/migrations/000004_seed_appearance.up.sql](backend/migrations/000004_seed_appearance.up.sql) — seed default

## Customize template ke project baru

### 1. Rename module + project
- `backend/go.mod` line 1: `module github.com/<org>/<project>`
- Cari & ganti import path: `find backend -name "*.go" -exec sed -i 's|kurniawa9157/template-base|<org>/<project>|g' {} \;`
- `frontend/package.json` field `name`
- `frontend/index.html` `<title>`

### 2. Update brand defaults
- `backend/migrations/000002_seed_references.up.sql`: ganti `app_name`, `app_tagline`
- `backend/.env.example`: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`, `DB_NAME`
- `frontend/src/pages/admin/AdminLayout.tsx`: `brandTitle`, `brandSubtitle`
- `frontend/src/pages/RoleLanding.tsx`: hero text + nama app
- `frontend/src/theme.ts`: kalau brand color project beda dari ATR/BPN navy, edit `atrbpnTheme.colors.--ina-brand-primary` + `ATRBPN_RGB`

### 3. Tambah module permission baru
- `backend/internal/domain/permission.go`: tambah `ModuleXxx = "XXX"` constant
- `AllModules()` slice tambahkan
- Migration baru atau seed update untuk grant default ke ROLE_ADMIN
- Pakai di handler: `middleware.RequirePermission(checker, domain.ModuleXxx, domain.ActionView)`

### 4. Tambah feature halaman
- Backend: domain → repo → service → handler → router. Pattern sudah ada di `user_handler.go`, `role_handler.go` sebagai referensi
- Frontend: tambah `src/pages/admin/<Feature>.tsx`, register di [AdminLayout.tsx](frontend/src/pages/admin/AdminLayout.tsx) navItems + render switch

## Command referensi

```bash
# Backend dev (local)
cd backend && cp .env.example .env && nano .env  # set DB password + JWT secret
cd backend && go run ./cmd/seed                  # buat super admin
cd backend && go run ./cmd/server                # atau: make run

# Frontend dev
cd frontend && npm install
cd frontend && npm run dev                       # vite dev port 5173

# DB native (pakai golang-migrate CLI atau Docker)
migrate -path backend/migrations -database "postgres://postgres:pwd@localhost:5432/template_base?sslmode=disable" up

# Atau full stack via Docker
docker compose --env-file backend/.env up -d
```

## Login default setelah seed

- Email: `admin@template.local` (atau yang Anda set di `SEED_ADMIN_EMAIL`)
- Password: `Admin1234!` (atau `SEED_ADMIN_PASSWORD`)
- **Wajib ganti password** di production via `/me/password`

## Gotchas (pelajaran dari project asal)

1. **CSS cascade `!important`**: IDDS default menaruh `!important` di `--ina-brand-hover` dan `--ina-background-tertiary`. `setProperty()` tanpa priority SILENTLY ignored. Selalu pakai `setProperty(key, value, 'important')` di [theme.ts](frontend/src/theme.ts).
2. **Tailwind opacity + var() color**: Tailwind 3.x TIDAK emit class saat opacity modifier dipakai di `var()` color. Pakai format `rgb(var(--xxx-rgb) / <alpha-value>)` di config + set RGB triplet di runtime.
3. **IDDS `setCustomTheme()`** me-remove `data-brand` attribute. Untuk non-atrbpn brand: jangan panggil setCustomTheme, pakai manual `setProperty` saja.
4. **Brand-prefixed vars**: IDDS set `--ina-bgn-brand-primary` (bukan `--ina-brand-primary`) saat `setBrandTheme('bgn')`. Mirror manual via `mirrorIddsBrandVars()`.
5. **`bg-brand/40` overlay**: hindari opacity pada bridged token untuk modal overlay. Pakai `bg-black/40` (semantic backdrop, bukan brand).
6. **IDDS BrandName type**: v1.6.17 expose `'inagov' | 'inaku' | 'bgn' | 'bkn' | 'lan' | 'panrb' | 'default'`. Jangan tambah `'inapas'` — TypeScript error.
7. **formKit wrapper pattern**: API wrapper `Select`, `TextInput`, `RadioCards`, `UploadField` di [src/components/formKit/](frontend/src/components/formKit/). Internal delegasi ke IDDS. Jangan ubah API wrapper — call-site banyak.
8. **Modal container masih custom**: pakai overlay+dialog manual. Buttons di dalam sudah IDDS. Pakai `useModalClose()` hook untuk ESC + click-outside.
9. **Backend `.gitignore`**: hati-hati rule `server` / `seed` yang bisa match folder `cmd/server/`. Sudah di-fix di template tapi cek kalau ada issue commit file Go.
10. **Nginx SPA fallback**: frontend Dockerfile + nginx.conf serve `index.html` untuk path non-asset. Sudah di-setup.

## Landing Page Builder + CMS (LP-1 s/d LP-4 — selesai)

Sistem builder landing page dengan EAV pattern + master data reuse + media library. Diport hybrid dari `template-go` reference, adapt ke stack template-base (state-based router + custom `request<T>()` + custom Icon + IDDS).

### Schema (4 tabel saja — pakai EAV via `type_template`)

Migrasi 000005–000009:
- **`tr_templates`**: id, code (unique), name, `type_template` (page/slider/menu/footer), slug (untuk type=page), is_active. Discriminator pattern — TIDAK pakai tabel terpisah untuk slider/menu/footer.
- **`tr_template_values`**: id, template_id, key, value (TEXT/JSON), order. Key konvensi: `layout` untuk page blocks, `item_<n>` untuk slider/menu/footer items.
- **`tt_posts`**: posts/pages content (artikel + halaman statis). Bukan EAV karena perlu query (filter status, type, sort published_at).
- **`tt_media_files`**: file uploads (uuid-prefixed filename + mime + size). Diserve via `/uploads/<filename>` static dari backend.

Plus seed 000009: insert default `homepage` template (type=page, slug='/') + grant `CONTENT_MGMT` ke `ROLE_ADMIN`.

### Endpoint generic (templates filter by type)

Karena slider/menu/footer pakai tabel `tr_templates` yang sama, endpoint generik — UI admin filter via `?type_template=slider`.

- **Templates** `/admin/templates` (list/create/get/patch/delete), `:id/values/:key` (upsert single value mis. layout), `:id/items` (append item auto-key + reorder)
- **Posts** `/admin/posts` (CRUD + filter `?type=post|page`)
- **Media** `/admin/media/upload` (multipart), list, delete
- **Public** `/public/template?slug=/`, `/public/template/:id` (untuk renderer resolve slider/menu/footer by id), `/public/posts?type=post&limit=N`

Permission module: **`CONTENT_MGMT`** (single — granular per resource bisa di-add nanti kalau perlu).

### Frontend — block + builder + CMS pages

**Block components** ([src/components/blocks/](frontend/src/components/blocks/)) — 7 type:
- `navbar`, `slider`, `html_block`, `image_block`, `card_grid`, `article_grid`, `footer`
- Dispatcher [BlockRenderer.tsx](frontend/src/components/BlockRenderer.tsx) → switch on `block.type`
- HTML sanitization via `dompurify` di `html_block`
- Replace lucide → `Icon`, replace react-router Link → `<a>`

**Builder UI 3-panel** ([src/pages/admin/landing/](frontend/src/pages/admin/landing/)):
- `ComponentPalette` (kiri 200px, 7 tombol tambah block)
- `BuilderCanvas` (tengah, list block + toolbar move/dup/delete + click-select)
- `PropertiesPanel` (kanan 300px, dynamic form per block type — pakai existing formKit components)
- `AdminLandingBuilder` toolbar (back/save/dirty indicator) + 3-panel layout
- Hook `useBuilder` ([src/hooks/useBuilder.ts](frontend/src/hooks/useBuilder.ts)) — pure React state (components, selected, addComponent, removeComponent, duplicateComponent, updateProp, moveComponent, loadLayout, markSaved + dirty flag)

**CMS pages** ([src/pages/admin/](frontend/src/pages/admin/)):
- `AdminLanding` — list template type=page → klik "Edit Layout" switch ke builder mode (state-based, bukan router)
- `AdminMasters` — 3 tab Sliders/Menus/Footers, master-detail. Items disimpan sebagai JSON di `tr_template_values` key=`item_<n>`. Field config per type di `ITEM_FIELDS` constant.
- `AdminPosts` — CRUD tab post/page (article + halaman statis), slug auto-format, status badges
- `AdminMediaLibrary` — grid view + multipart upload + copy URL helper (paste ke field gambar)

**API clients** ([src/api/](frontend/src/api/)):
- `builder.ts` — `adminListTemplates`, `adminGetTemplate`, `adminCreateTemplate`, `adminAddTemplateItem`, `adminSaveLayout` helper
- `content.ts` — Posts CRUD + Media list/delete + `adminUploadMedia` (multipart fetch direct, bukan `request<T>` karena FormData)
- `public.ts` — `getPublicTemplateBySlug`, `getPublicTemplateByID`, `listPublicPosts`

**Public landing** — [RoleLanding.tsx](frontend/src/pages/RoleLanding.tsx) fetch homepage template (slug='/') → parse `layout` JSON → render via BlockRenderer. Fallback empty state dengan CTA Masuk.

### Customize block / type baru

1. Tambah type di [src/types/builder.types.ts](frontend/src/types/builder.types.ts): `ComponentType` union + `COMPONENT_DEFAULTS` + `COMPONENT_LABELS`
2. Tambah Icon kalau perlu di [src/components/Icon.tsx](frontend/src/components/Icon.tsx)
3. Buat `XxxBlock.tsx` di `src/components/blocks/` (props sesuai default)
4. Register di [src/components/BlockRenderer.tsx](frontend/src/components/BlockRenderer.tsx) switch
5. Tambah field editor di [PropertiesPanel.tsx](frontend/src/pages/admin/landing/PropertiesPanel.tsx) per type
6. Optional: kalau pakai master data (slider/menu/footer pattern), tambah `MasterPicker` field + filter `type_template=<newtype>`

### Gotcha

- **EAV penyimpanan**: items SLIDER / MENU / FOOTER simpan sebagai JSON di field `value` row `tr_template_values`. Reorder pakai field `order` numeric. Append baru pakai endpoint `/items` yang auto-assign `item_<next>`.
- **Layout simpan sebagai 1 row**: layout page blocks disimpan di 1 row `tr_template_values` (key='layout', value=JSON array). Tidak per-block. Save = upsert 1 row via `PUT :id/values/layout`.
- **`UPLOAD_DIR` env**: backend serve `/uploads/*` dari path ini (default `./uploads/`). Production volume mount supaya persistent.
- **Public renderer fetch**: `RoleLanding` cuma fetch 1x homepage. Block yang butuh master data (slider/menu/footer dengan `*_id` props) fetch sendiri di useEffect — bisa di-optimize jadi eager-load di v2.

## Aturan mutlak

- **Selalu** verify build (`go build ./...` + `npm run build`) sebelum commit
- **Jangan** hapus auth/RBAC/user mgmt foundation — itu reason d'être template ini
- **Jangan** ubah palette ATR/BPN tanpa update `atrbpnTheme` + `ATRBPN_RGB` keduanya, kalau memang mau brand sendiri
- **Selalu** dokumentasi di sini saat tambah module permission baru / seed default baru

---
Template diekstrak dari project e-PPAT pada 2026-04-26. Update saat extend foundation.

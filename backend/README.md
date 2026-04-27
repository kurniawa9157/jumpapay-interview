# e-PPAT Backend (Go)

Backend untuk aplikasi onboarding e-PPAT, ditulis dalam Go 1.22+. Pondasi authentication, user management, dan RBAC mencerminkan project Laravel referensi di `onboarding-peruri`.

## Stack

- **Go 1.22+** + **gin** (router)
- **PostgreSQL 16** (database) + **Redis 7** (cache & rate limit)
- **JWT** (access + refresh token) untuk auth, mendukung web SPA & mobile
- **bcrypt** untuk password, **TOTP** (`pquerna/otp`) untuk 2FA
- **pgx/v5** untuk DB driver, **golang-migrate** untuk migration

## Setup cepat

### Opsi A — Docker (disarankan)

Prasyarat: Docker Desktop terpasang.

```bash
cp .env.example .env
docker compose up -d postgres redis
go run ./cmd/server
```

### Opsi B — Native install

Prasyarat:
1. **Go 1.22+** — https://go.dev/dl/
2. **PostgreSQL 16** — https://www.postgresql.org/download/windows/ (pakai user `postgres`)
3. **Redis** — Laragon sudah ship Redis di `c:/laragon/bin/redis`. Start via Laragon UI.
4. **golang-migrate CLI** — `go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest`

```bash
# 1. Buat database
psql -U postgres -c "CREATE DATABASE eppat;"

# 2. Copy env
cp .env.example .env
# Edit .env: pastikan DB_PASSWORD dan JWT_SECRET

# 3. Install deps
go mod tidy

# 4. Apply migration + seed super admin
make migrate-up

# 5. Jalankan server
go run ./cmd/server
# atau dengan hot reload (install air dulu: go install github.com/air-verse/air@latest)
air
```

Server listen di `http://localhost:8080`.

## Endpoint (Batch B1)

```
POST   /api/v1/auth/login          { identifier, password }
POST   /api/v1/auth/refresh        { refresh_token }
POST   /api/v1/auth/logout         (Bearer)
GET    /api/v1/auth/me             (Bearer)
GET    /health
```

## Struktur direktori

Lihat `ARCHITECTURE.md` (akan dibuat di Batch berikut) untuk layout lengkap.

## Tes cepat (curl)

```bash
# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@eppat.id","password":"Admin1234!"}'

# Ambil token dari response, lalu:
curl http://localhost:8080/api/v1/auth/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## Roadmap

- **B1 (sekarang)**: foundation + auth JWT + super admin
- **B2**: RBAC middleware + admin user/role/permission CRUD
- **B3**: onboarding PPAT/Pihak + admin review + Peruri/Tera integration mock
- **B4**: PPAT profile area + 2FA setup + integration test + Docker prod build

## Catatan

Backend ini dirancang untuk dipasangkan dengan frontend React di `../frontend/`. Frontend saat ini masih pakai mock API — setelah B3 siap, set `VITE_USE_MOCK_API=false` dan `VITE_API_BASE_URL=http://localhost:8080/api/v1`.

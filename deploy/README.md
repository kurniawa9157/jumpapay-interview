# Deployment e-PPAT — Docker Compose

Stack deployment lengkap (PostgreSQL + Redis + backend Go + frontend nginx) dalam satu `docker compose up -d`. Ditujukan untuk VPS Linux (Ubuntu 22.04+) atau server on-premise dengan Docker 24+ dan Docker Compose v2.

---

## Arsitektur

```
                   ┌─────────────────┐
  Internet ───────▶│  Reverse proxy  │  (opsional: Caddy/nginx/traefik + TLS)
                   │   (host/80,443) │
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │  frontend (80)  │  nginx:alpine serve SPA
                   │                 │  + proxy /api/* ke backend
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │  backend :8080  │  Go + gin
                   └────┬────────┬───┘
                        │        │
              ┌─────────▼──┐  ┌──▼─────────┐
              │ postgres 16│  │  redis 7   │
              │ (volume)   │  │  (volume)  │
              └────────────┘  └────────────┘
```

Dua service one-shot (`migrate`, `seed`) hanya jalan sekali saat stack dinyalakan — akan keluar setelah selesai, aman di-ignore di `docker compose ps`.

---

## Prasyarat server

- **Docker 24+** dan **Docker Compose v2** (plugin `docker compose`, bukan legacy `docker-compose`)
- **Port 80** (atau port lain sesuai `HTTP_PORT`) bebas. Jika sudah ada reverse proxy (Caddy/nginx), pilih port > 1024
- Akses git ke repository (deploy pakai git pull untuk update)

Cek versi Docker:
```bash
docker --version           # harus 24.x+
docker compose version     # harus v2.x+
```

---

## Langkah pertama (first deploy)

```bash
# 1. Clone repo
git clone ssh://git@gitlab.cube-x.dev:2222/kurniawa9157/e-ppat-platform.git
cd e-ppat-platform/deploy

# 2. Siapkan env
cp .env.production.example .env
nano .env        # → isi DB_PASSWORD, JWT_SECRET, APP_FRONTEND_ORIGIN, SEED_ADMIN_*

# Generate JWT secret kuat:
#   openssl rand -base64 64

# 3. Build image + start stack
docker compose --env-file .env build
docker compose --env-file .env up -d

# 4. Cek status
docker compose ps
docker compose logs -f backend
```

Urutan bootstrap yang akan terjadi:
1. `postgres` & `redis` start → healthcheck
2. `migrate` apply 3 file SQL di `../backend/migrations/` → exit 0
3. `seed` insert super admin pertama (idempotent) → exit 0
4. `backend` mulai listen :8080
5. `frontend` nginx serve SPA di port `HTTP_PORT`

Setelah `docker compose ps` menunjukkan `backend` & `frontend` running:
- Buka `http://<host>:<HTTP_PORT>/`
- Klik **Masuk** → gunakan `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` dari `.env`

---

## Update deployment

```bash
cd e-ppat-platform
git pull

cd deploy
docker compose --env-file .env build backend frontend
docker compose --env-file .env up -d backend frontend

# Kalau ada migration baru, jalankan:
docker compose --env-file .env run --rm migrate
```

Database & Redis tetap persist di volume `eppat_pg_data` dan `eppat_redis_data`.

---

## Reverse proxy + TLS (rekomendasi production)

Stack ini expose port HTTP (80) saja. Untuk HTTPS, taruh reverse proxy di depan (pilih salah satu):

### Opsi A — Caddy (auto Let's Encrypt)

Install di host, buat `/etc/caddy/Caddyfile`:
```
eppat.example.com {
    reverse_proxy 127.0.0.1:80
}
```

Lalu set `HTTP_PORT=8080` di `.env` agar frontend dengar di 8080 (tidak bentrok Caddy di 80/443).

### Opsi B — nginx di host

Install nginx, buat vhost `proxy_pass http://127.0.0.1:80/` + certbot.

### Opsi C — Cloudflare Tunnel

Set `HTTP_PORT=8080`, jalankan `cloudflared tunnel` di host yang proxy ke `localhost:8080`.

---

## Operasional

### Backup database

```bash
docker compose exec -T postgres pg_dump -U eppat eppat > backup-$(date +%F).sql
```

Restore:
```bash
docker compose exec -T postgres psql -U eppat eppat < backup-2026-04-24.sql
```

### Reset seed super admin

Seed idempotent — untuk re-seed, hapus user `SUPER_ADMIN` dulu:
```bash
docker compose exec postgres psql -U eppat eppat \
  -c "DELETE FROM users WHERE code = 'SUPER_ADMIN';"
docker compose run --rm seed
```

### Tail log

```bash
docker compose logs -f              # semua service
docker compose logs -f backend      # backend saja
docker compose logs --tail 100 frontend
```

### Restart backend saja

```bash
docker compose restart backend
```

### Down total + hapus data

**⚠️ Menghapus semua data DB & Redis**:
```bash
docker compose down -v
```

---

## Troubleshooting

**Frontend 502 saat akses /api/***
- `docker compose logs backend` — pastikan listen :8080 & terhubung postgres+redis
- `docker compose ps` — status backend harus `healthy`

**Login gagal "network_error"**
- Cek `APP_FRONTEND_ORIGIN` di `.env` — harus match dengan host yang dibuka browser (skema + hostname)
- Frontend nginx proxy `/api/` ke `backend:8080` — kalau origin beda (split deployment), ubah `VITE_API_BASE_URL` ke absolute URL backend

**Migration stuck / dirty**
- `docker compose run --rm migrate -path=/migrations -database="postgres://eppat:${DB_PASSWORD}@postgres:5432/eppat?sslmode=disable" force <VERSION>`
- Lalu `up` ulang

**Seed ingin diganti password-nya**
- Update `SEED_ADMIN_PASSWORD` di `.env`
- Hapus user existing (lihat "Reset seed" di atas)
- `docker compose run --rm seed`

---

## File yang terlibat

```
deploy/
├── docker-compose.yml          ← stack definition
├── .env.production.example     ← template env
├── .env                         ← BUAT SENDIRI, tidak di-commit
└── README.md                    ← file ini

backend/Dockerfile              ← multi-stage Go build (server + seed)
backend/.dockerignore

frontend/Dockerfile             ← multi-stage node → nginx
frontend/nginx.conf             ← SPA fallback + proxy /api
frontend/.dockerignore
```

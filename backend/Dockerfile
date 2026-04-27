# syntax=docker/dockerfile:1.7

# --- Stage 1: build semua binary ---
# golang:1.23-alpine = Go 1.23 stable, match go.mod yang butuh >= 1.22
# dan kompatibel dengan versi lokal Go 1.24 yang dipakai developer.
FROM golang:1.23-alpine AS builder

# git dibutuhkan kalau modul tertentu di-fetch via VCS.
RUN apk add --no-cache git

WORKDIR /src

# Cache modul.
COPY go.mod go.sum* ./
RUN go mod download

# Salin source.
COPY . .

# Build terpisah supaya error per binary jelas di log.
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/seed   ./cmd/seed

# --- Stage 2: runtime tipis ---
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata && \
    addgroup -S app && adduser -S app -G app
ENV TZ=Asia/Jakarta

WORKDIR /app

COPY --from=builder /out/server /app/server
COPY --from=builder /out/seed   /app/seed
# Migrations disertakan agar bisa di-mount-less oleh service migrate (opsional).
COPY migrations ./migrations

USER app
EXPOSE 8080

# Tidak pakai ENTRYPOINT supaya docker-compose bisa override CMD ke /app/seed
# untuk one-shot seeder. Default: jalankan server HTTP.
CMD ["/app/server"]

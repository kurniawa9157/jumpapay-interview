# syntax=docker/dockerfile:1.7

# --- Stage 1: build bundle Vite ---
FROM node:20-alpine AS builder

WORKDIR /src

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# VITE_API_BASE_URL di-set lewat build arg sehingga bisa beda per env.
# Default "/api/v1" artinya frontend dan backend di-proxy oleh nginx yang sama.
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_USE_MOCK_API=false
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_USE_MOCK_API=$VITE_USE_MOCK_API

RUN npm run build

# --- Stage 2: serve via nginx ---
FROM nginx:1.27-alpine

# Copy config kustom (SPA fallback + proxy /api → backend:8080).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy bundle hasil build.
COPY --from=builder /src/dist /usr/share/nginx/html

EXPOSE 80

# Healthcheck sederhana (exit 0 kalau nginx merespon / ).
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --quiet --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

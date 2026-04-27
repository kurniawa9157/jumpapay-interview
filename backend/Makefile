.PHONY: help run build test migrate-up migrate-down migrate-new seed tidy lint

MIGRATE := migrate -database "postgres://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=disable" -path migrations
DB_USER ?= postgres
DB_PASSWORD ?= changeme
DB_HOST ?= 127.0.0.1
DB_PORT ?= 5432
DB_NAME ?= template_base

help:
	@echo "Target yang tersedia:"
	@echo "  make run            - Jalankan server"
	@echo "  make build          - Build binary"
	@echo "  make tidy           - go mod tidy"
	@echo "  make migrate-up     - Apply semua migration"
	@echo "  make migrate-down   - Rollback 1 migration"
	@echo "  make migrate-new N=nama_migrasi - Buat migration baru"
	@echo "  make seed           - Seed super admin"
	@echo "  make test           - Jalankan test"

run:
	go run ./cmd/server

build:
	go build -o bin/server ./cmd/server

tidy:
	go mod tidy

test:
	go test ./... -race -cover

migrate-up:
	$(MIGRATE) up

migrate-down:
	$(MIGRATE) down 1

migrate-new:
	@if [ -z "$(N)" ]; then echo "Usage: make migrate-new N=nama_migrasi"; exit 1; fi
	$(MIGRATE) create -ext sql -seq $(N)

seed:
	go run ./cmd/seed

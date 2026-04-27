package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	"github.com/kurniawa9157/template-base/internal/config"
	"github.com/kurniawa9157/template-base/internal/domain"
	"github.com/kurniawa9157/template-base/internal/platform"
	"github.com/kurniawa9157/template-base/internal/repository/postgres"
	"github.com/kurniawa9157/template-base/internal/service/auth"
)

// Seeder super admin — idempotent (skip kalau user dengan code SUPER_ADMIN sudah ada).
// Dipanggil via `make seed` atau `go run ./cmd/seed`.
func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("config load failed", "err", err)
		os.Exit(1)
	}
	logger := platform.NewLogger(cfg.AppEnv)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool, err := platform.NewPostgresPool(ctx, cfg.DSN(), cfg.DBMaxConns)
	if err != nil {
		logger.Error("postgres connect failed", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	userRepo := postgres.NewUserRepo(pool)
	contactRepo := postgres.NewContactRepo(pool)
	pwRepo := postgres.NewPasswordRepo(pool)

	const superAdminCode = "SUPER_ADMIN"

	exists, err := userRepo.ExistsByCode(ctx, superAdminCode)
	if err != nil {
		logger.Error("check existing super admin failed", "err", err)
		os.Exit(1)
	}
	if exists {
		logger.Info("super admin sudah ada, skip seed", "code", superAdminCode)
		return
	}

	// Pisah first/mid/last name dari SEED_ADMIN_NAME sederhana.
	first, mid, last := splitName(cfg.SeedAdminName)

	userID, err := userRepo.Create(ctx, postgres.CreateUserInput{
		Code:       superAdminCode,
		FirstName:  first,
		MidName:    nullable(mid),
		LastName:   nullable(last),
		IsAdmin:    true,
		RoleID:     nil, // super admin bypass role
		StatusCode: domain.UserStatusActive,
	})
	if err != nil {
		logger.Error("create user failed", "err", err)
		os.Exit(1)
	}

	if err := contactRepo.Create(ctx, postgres.CreateContactInput{
		UserID:     userID,
		TypeCode:   domain.ContactTypeEmail,
		Value:      cfg.SeedAdminEmail,
		IsPrimary:  true,
		CanLogin:   true,
		IsVerified: true,
	}); err != nil {
		logger.Error("create contact failed", "err", err)
		os.Exit(1)
	}

	hash, err := auth.HashPassword(cfg.SeedAdminPassword)
	if err != nil {
		logger.Error("hash password failed", "err", err)
		os.Exit(1)
	}
	if err := pwRepo.Create(ctx, postgres.CreatePasswordInput{
		UserID:   userID,
		TypeCode: domain.PasswordTypeMain,
		Hash:     hash,
	}); err != nil {
		logger.Error("create password failed", "err", err)
		os.Exit(1)
	}

	fmt.Printf("✓ Super admin berhasil dibuat\n")
	fmt.Printf("  Email:    %s\n", cfg.SeedAdminEmail)
	fmt.Printf("  Password: %s\n", cfg.SeedAdminPassword)
	fmt.Printf("  ID:       %d\n", userID)
}

func splitName(name string) (first, mid, last string) {
	parts := strings.Fields(name)
	switch len(parts) {
	case 0:
		return "Admin", "", ""
	case 1:
		return parts[0], "", ""
	case 2:
		return parts[0], "", parts[1]
	default:
		return parts[0], strings.Join(parts[1:len(parts)-1], " "), parts[len(parts)-1]
	}
}

func nullable(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

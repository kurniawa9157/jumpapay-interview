package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/kurniawa9157/template-base/internal/config"
	httpx "github.com/kurniawa9157/template-base/internal/http"
	"github.com/kurniawa9157/template-base/internal/platform"
	"github.com/kurniawa9157/template-base/internal/repository/postgres"
	"github.com/kurniawa9157/template-base/internal/service/account"
	"github.com/kurniawa9157/template-base/internal/service/auth"
	"github.com/kurniawa9157/template-base/internal/service/content"
	"github.com/kurniawa9157/template-base/internal/service/permission"
	"github.com/kurniawa9157/template-base/internal/service/system"
	userservice "github.com/kurniawa9157/template-base/internal/service/user"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("config load failed", "err", err)
		os.Exit(1)
	}

	logger := platform.NewLogger(cfg.AppEnv)
	slog.SetDefault(logger)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// Postgres
	pool, err := platform.NewPostgresPool(ctx, cfg.DSN(), cfg.DBMaxConns)
	if err != nil {
		logger.Error("postgres connect failed", "err", err)
		os.Exit(1)
	}
	defer pool.Close()
	logger.Info("postgres connected", "host", cfg.DBHost, "db", cfg.DBName)

	// Redis
	rdb, err := platform.NewRedisClient(ctx, cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)
	if err != nil {
		logger.Error("redis connect failed", "err", err)
		os.Exit(1)
	}
	defer rdb.Close()
	logger.Info("redis connected", "addr", cfg.RedisAddr)

	// Repos
	userRepo := postgres.NewUserRepo(pool)
	contactRepo := postgres.NewContactRepo(pool)
	pwRepo := postgres.NewPasswordRepo(pool)
	roleRepo := postgres.NewRoleRepo(pool)
	permRepo := postgres.NewPermissionRepo(pool)
	activityRepo := postgres.NewActivityRepo(pool)
	refreshRepo := postgres.NewRefreshTokenRepo(pool)
	sysSettingsRepo := postgres.NewSystemSettingsRepo(pool)
	templateRepo := postgres.NewTemplateRepo(pool)
	postRepo := postgres.NewPostRepo(pool)
	mediaRepo := postgres.NewMediaRepo(pool)

	// Services
	jwtSvc := auth.NewJWTService(cfg.JWTSecret, cfg.JWTAccessTTL, cfg.JWTRefreshTTL)
	activitySvc := auth.NewActivityService(activityRepo, logger)
	authSvc := auth.NewService(userRepo, contactRepo, pwRepo, permRepo, roleRepo, refreshRepo, jwtSvc, activitySvc, logger)
	permChecker := permission.NewChecker(userRepo, permRepo, rdb, logger)
	userSvc := userservice.NewService(userRepo, contactRepo, pwRepo, roleRepo, refreshRepo)
	accountSvc := account.NewService(userRepo, contactRepo, pwRepo, roleRepo, refreshRepo)
	systemSvc := system.NewService(sysSettingsRepo)
	templateSvc := content.NewTemplateService(templateRepo)
	postSvc := content.NewPostService(postRepo)
	mediaSvc := content.NewMediaService(mediaRepo, cfg.UploadDir, cfg.UploadMaxSizeMB)

	// Router
	router := httpx.NewRouter(httpx.Deps{
		Cfg:               cfg,
		Logger:            logger,
		DB:                pool,
		Redis:             rdb,
		JWTService:        jwtSvc,
		AuthService:       authSvc,
		PermissionChecker: permChecker,
		UserService:       userSvc,
		AccountService:    accountSvc,
		SystemService:     systemSvc,
		TemplateService:   templateSvc,
		PostService:       postSvc,
		MediaService:      mediaSvc,
		UserRepo:          userRepo,
		RoleRepo:          roleRepo,
		PermissionRepo:    permRepo,
	})

	srv := &http.Server{
		Addr:              ":" + cfg.AppPort,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	go func() {
		logger.Info("server listening", "port", cfg.AppPort, "env", cfg.AppEnv)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("server error", "err", err)
			stop()
		}
	}()

	<-ctx.Done()
	logger.Info("shutdown signal received")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("graceful shutdown failed", "err", err)
	}
	logger.Info("server stopped")
}

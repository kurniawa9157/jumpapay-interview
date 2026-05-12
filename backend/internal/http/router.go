package http

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/kurniawa9157/template-base/internal/config"
	"github.com/kurniawa9157/template-base/internal/domain"
	"github.com/kurniawa9157/template-base/internal/http/handler"
	"github.com/kurniawa9157/template-base/internal/http/middleware"
	"github.com/kurniawa9157/template-base/internal/repository/postgres"
	"github.com/kurniawa9157/template-base/internal/service/account"
	"github.com/kurniawa9157/template-base/internal/service/auth"
	"github.com/kurniawa9157/template-base/internal/service/content"
	"github.com/kurniawa9157/template-base/internal/service/permission"
	"github.com/kurniawa9157/template-base/internal/service/system"
	userservice "github.com/kurniawa9157/template-base/internal/service/user"
)

// Deps — semua dependency yang diperlukan untuk mount router.
type Deps struct {
	Cfg               *config.Config
	Logger            *slog.Logger
	DB                *pgxpool.Pool
	Redis             *redis.Client
	JWTService        *auth.JWTService
	AuthService       *auth.Service
	PermissionChecker *permission.Checker
	UserService       *userservice.Service
	AccountService    *account.Service
	SystemService     *system.Service
	TemplateService   *content.TemplateService
	PostService       *content.PostService
	MediaService      *content.MediaService
	UserRepo          *postgres.UserRepo
	RoleRepo          *postgres.RoleRepo
	PermissionRepo    *postgres.PermissionRepo
}

// NewRouter membangun gin Engine dengan middleware stack + route groups.
func NewRouter(d Deps) *gin.Engine {
	if d.Cfg.IsDev() {
		gin.SetMode(gin.DebugMode)
	} else {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(middleware.Recovery(d.Logger))
	r.Use(middleware.RequestLogger(d.Logger))
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{d.Cfg.AppFrontendOrigin},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length", "Retry-After"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "time": time.Now().UTC()})
	})

	// Detailed health — cek konektivitas DB + Redis. Dipakai orchestrator
	// (k8s liveness/readiness) atau monitoring untuk deteksi degraded state.
	r.GET("/health/ready", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()

		checks := gin.H{}
		overall := true

		if err := d.DB.Ping(ctx); err != nil {
			checks["postgres"] = gin.H{"ok": false, "error": err.Error()}
			overall = false
		} else {
			checks["postgres"] = gin.H{"ok": true}
		}

		if err := d.Redis.Ping(ctx).Err(); err != nil {
			checks["redis"] = gin.H{"ok": false, "error": err.Error()}
			overall = false
		} else {
			checks["redis"] = gin.H{"ok": true}
		}

		status := http.StatusOK
		if !overall {
			status = http.StatusServiceUnavailable
		}
		c.JSON(status, gin.H{
			"status": map[bool]string{true: "ok", false: "degraded"}[overall],
			"checks": checks,
			"time":   time.Now().UTC(),
		})
	})

	v1 := r.Group("/api/v1")

	authHandler := handler.NewAuthHandler(d.AuthService)
	userHandler := handler.NewUserHandler(d.UserService)
	roleHandler := handler.NewRoleHandler(d.RoleRepo, d.PermissionRepo, d.PermissionChecker)
	statsHandler := handler.NewAdminStatsHandler(d.DB, d.UserRepo)
	accountHandler := handler.NewAccountHandler(d.AccountService)
	systemHandler := handler.NewSystemHandler(d.SystemService)
	templateHandler := handler.NewTemplateHandler(d.TemplateService)
	postHandler := handler.NewPostHandler(d.PostService)
	mediaHandler := handler.NewMediaHandler(d.MediaService)
	publicHandler := handler.NewPublicHandler(d.TemplateService, d.PostService)

	// --- /system group (public read — dipakai hydrate tema di boot app) ---
	systemGroup := v1.Group("/system")
	{
		systemGroup.GET("/theme", systemHandler.GetTheme)
		systemGroup.GET("/appearance", systemHandler.GetAppearance)
		systemGroup.GET("/snapshot", systemHandler.GetSnapshot)
	}

	// --- /public group (no auth) — hydrate landing + posts public ---
	publicGroup := v1.Group("/public")
	{
		publicGroup.GET("/template", publicHandler.GetTemplateBySlug)
		publicGroup.GET("/template/:id", publicHandler.GetTemplateByID)
		publicGroup.GET("/posts", publicHandler.ListPosts)
		publicGroup.GET("/posts/:slug", publicHandler.GetPost)
	}

	// Static files — serve uploads dari UPLOAD_DIR (default ./uploads).
	r.Static("/uploads", d.Cfg.UploadDir)

	// --- /auth group ---
	authGroup := v1.Group("/auth")
	{
		loginLimiter := middleware.RateLimit(d.Redis, "login", d.Cfg.LoginRateLimitPerMinute, time.Minute)
		authGroup.POST("/login", loginLimiter, authHandler.Login)
		authGroup.POST("/2fa/verify", loginLimiter, authHandler.Verify2FA)
		authGroup.POST("/refresh", loginLimiter, authHandler.Refresh)

		protected := authGroup.Group("")
		protected.Use(middleware.RequireAuth(d.JWTService))
		{
			protected.POST("/logout", authHandler.Logout)
			protected.GET("/me", authHandler.Me)
		}
	}

	// --- /admin group (semua butuh auth; per-route permission gate) ---
	adminGroup := v1.Group("/admin")
	adminGroup.Use(middleware.RequireAuth(d.JWTService))
	{
		users := adminGroup.Group("/users")
		{
			users.GET("",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleUserMgmt, domain.ActionView),
				userHandler.List)
			users.GET("/:id",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleUserMgmt, domain.ActionView),
				userHandler.Get)
			users.POST("",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleUserMgmt, domain.ActionCreate),
				userHandler.Create)
			users.PATCH("/:id",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleUserMgmt, domain.ActionEdit),
				userHandler.Update)
			users.POST("/:id/suspend",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleUserMgmt, domain.ActionEdit),
				userHandler.Suspend)
			users.POST("/:id/activate",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleUserMgmt, domain.ActionEdit),
				userHandler.Activate)
			users.POST("/:id/reset-password",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleUserMgmt, domain.ActionEdit),
				userHandler.ResetPassword)
		}

		roles := adminGroup.Group("/roles")
		{
			roles.GET("",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleRoleMgmt, domain.ActionView),
				roleHandler.List)
			roles.POST("",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleRoleMgmt, domain.ActionCreate),
				roleHandler.Create)
			roles.PATCH("/:id",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleRoleMgmt, domain.ActionEdit),
				roleHandler.Update)
			roles.DELETE("/:id",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleRoleMgmt, domain.ActionDelete),
				roleHandler.Delete)

			roles.GET("/:id/permissions",
				middleware.RequirePermission(d.PermissionChecker, domain.ModulePermissionMgmt, domain.ActionView),
				roleHandler.GetPermissions)
			roles.PUT("/:id/permissions",
				middleware.RequirePermission(d.PermissionChecker, domain.ModulePermissionMgmt, domain.ActionEdit),
				roleHandler.SetPermissions)
		}

		adminGroup.GET("/stats", statsHandler.Stats)

		// System settings (brand theme, app_name, maintenance, dll).
		sys := adminGroup.Group("/system")
		{
			sys.PUT("/theme",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleSystemSettings, domain.ActionEdit),
				systemHandler.UpdateTheme)
			sys.PUT("/appearance",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleSystemSettings, domain.ActionEdit),
				systemHandler.UpdateAppearance)
			sys.GET("/settings",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleSystemSettings, domain.ActionView),
				systemHandler.ListSettings)
			sys.PUT("/settings",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleSystemSettings, domain.ActionEdit),
				systemHandler.BulkUpdateSettings)
		}

		// CMS appearance settings (brand, IDDS/custom theme, logo, component style).
		cms := adminGroup.Group("/cms")
		{
			cms.PUT("/appearance",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleContentMgmt, domain.ActionEdit),
				systemHandler.UpdateAppearance)
		}

		// Templates (page/slider/menu/footer) + values + items.
		templates := adminGroup.Group("/templates")
		{
			templates.GET("",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleContentMgmt, domain.ActionView),
				templateHandler.List)
			templates.GET("/:id",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleContentMgmt, domain.ActionView),
				templateHandler.Get)
			templates.POST("",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleContentMgmt, domain.ActionCreate),
				templateHandler.Create)
			templates.PATCH("/:id",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleContentMgmt, domain.ActionEdit),
				templateHandler.Update)
			templates.DELETE("/:id",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleContentMgmt, domain.ActionDelete),
				templateHandler.Delete)
			templates.PUT("/:id/values/:key",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleContentMgmt, domain.ActionEdit),
				templateHandler.SetValue)
			templates.POST("/:id/items",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleContentMgmt, domain.ActionEdit),
				templateHandler.AddItem)
			templates.PUT("/:id/items/reorder",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleContentMgmt, domain.ActionEdit),
				templateHandler.ReorderItems)
			templates.PUT("/:id/items/:itemId",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleContentMgmt, domain.ActionEdit),
				templateHandler.UpdateItem)
			templates.DELETE("/:id/items/:itemId",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleContentMgmt, domain.ActionDelete),
				templateHandler.DeleteItem)
		}

		// Posts (article/news/page).
		posts := adminGroup.Group("/posts")
		{
			posts.GET("",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleContentMgmt, domain.ActionView),
				postHandler.List)
			posts.GET("/:id",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleContentMgmt, domain.ActionView),
				postHandler.Get)
			posts.POST("",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleContentMgmt, domain.ActionCreate),
				postHandler.Create)
			posts.PATCH("/:id",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleContentMgmt, domain.ActionEdit),
				postHandler.Update)
			posts.DELETE("/:id",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleContentMgmt, domain.ActionDelete),
				postHandler.Delete)
		}

		// Media library + upload.
		media := adminGroup.Group("/media")
		{
			media.GET("",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleContentMgmt, domain.ActionView),
				mediaHandler.List)
			media.POST("/upload",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleContentMgmt, domain.ActionEdit),
				mediaHandler.Upload)
			media.DELETE("/:id",
				middleware.RequirePermission(d.PermissionChecker, domain.ModuleContentMgmt, domain.ActionDelete),
				mediaHandler.Delete)
		}
	}

	// --- /me group (self-service: data diri + keamanan + sesi) ---
	meGroup := v1.Group("/me")
	meGroup.Use(middleware.RequireAuth(d.JWTService))
	{
		meGroup.GET("/profile", accountHandler.GetProfile)
		meGroup.PATCH("/profile", accountHandler.UpdateProfile)
		meGroup.POST("/password", accountHandler.ChangePassword)
		meGroup.GET("/sessions", accountHandler.ListSessions)
		meGroup.DELETE("/sessions/:id", accountHandler.RevokeSession)
		meGroup.POST("/sessions/revoke-others", accountHandler.RevokeOtherSessions)

		// 2FA TOTP
		meGroup.POST("/2fa/setup", accountHandler.Setup2FA)
		meGroup.POST("/2fa/confirm", accountHandler.Confirm2FA)
		meGroup.POST("/2fa/disable", accountHandler.Disable2FA)
	}

	return r
}

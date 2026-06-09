package config

import (
	"fmt"
	"time"

	"github.com/caarlos0/env/v11"
	"github.com/joho/godotenv"
)

// Config menampung semua env variables yang diperlukan aplikasi.
type Config struct {
	// App
	AppEnv            string `env:"APP_ENV" envDefault:"development"`
	AppPort           string `env:"APP_PORT" envDefault:"8080"`
	AppFrontendOrigin string `env:"APP_FRONTEND_ORIGIN" envDefault:"http://localhost:5173"`
	GoogleClientID    string `env:"GOOGLE_CLIENT_ID"`

	// Postgres
	DBHost     string `env:"DB_HOST" envDefault:"127.0.0.1"`
	DBPort     int    `env:"DB_PORT" envDefault:"5432"`
	DBUser     string `env:"DB_USER" envDefault:"postgres"`
	DBPassword string `env:"DB_PASSWORD,required"`
	DBName     string `env:"DB_NAME" envDefault:"jumpapay"`
	DBSSLMode  string `env:"DB_SSLMODE" envDefault:"disable"`
	DBMaxConns int    `env:"DB_MAX_CONNS" envDefault:"10"`

	// Redis
	RedisAddr     string `env:"REDIS_ADDR" envDefault:"127.0.0.1:6379"`
	RedisPassword string `env:"REDIS_PASSWORD"`
	RedisDB       int    `env:"REDIS_DB" envDefault:"0"`

	// JWT
	JWTSecret     string        `env:"JWT_SECRET,required"`
	JWTAccessTTL  time.Duration `env:"JWT_ACCESS_TTL" envDefault:"15m"`
	JWTRefreshTTL time.Duration `env:"JWT_REFRESH_TTL" envDefault:"168h"`

	// Seed super admin (dipakai cmd/seed)
	SeedAdminEmail    string `env:"SEED_ADMIN_EMAIL" envDefault:"admin@jumpapay.id"`
	SeedAdminPassword string `env:"SEED_ADMIN_PASSWORD" envDefault:"Admin1234!"`
	SeedAdminName     string `env:"SEED_ADMIN_NAME" envDefault:"Admin ATR/BPN"`

	// Rate limit
	RateLimitPerMinute      int `env:"RATE_LIMIT_PER_MINUTE" envDefault:"60"`
	LoginRateLimitPerMinute int `env:"LOGIN_RATE_LIMIT_PER_MINUTE" envDefault:"10"`

	// Media upload
	UploadDir       string `env:"UPLOAD_DIR" envDefault:"./uploads"`
	UploadMaxSizeMB int    `env:"UPLOAD_MAX_SIZE_MB" envDefault:"5"`

	// Storage backend untuk Media Library: 'local' (default, filesystem)
	// atau 's3' (S3-compatible mis. AWS S3 / MinIO).
	MediaStorage string `env:"MEDIA_STORAGE" envDefault:"local"`

	// AWS S3 / S3-compatible (MinIO) — hanya dipakai kalau MEDIA_STORAGE=s3.
	AWSAccessKeyID          string `env:"AWS_ACCESS_KEY_ID"`
	AWSSecretAccessKey      string `env:"AWS_SECRET_ACCESS_KEY"`
	AWSDefaultRegion        string `env:"AWS_DEFAULT_REGION" envDefault:"us-east-1"`
	AWSBucket               string `env:"AWS_BUCKET"`
	AWSEndpoint             string `env:"AWS_ENDPOINT"`
	AWSURL                  string `env:"AWS_URL"`
	AWSUsePathStyleEndpoint bool   `env:"AWS_USE_PATH_STYLE_ENDPOINT" envDefault:"false"`
}

// Load membaca .env (opsional) lalu parse env vars ke struct.
func Load() (*Config, error) {
	// .env tidak harus ada (production pakai env asli)
	_ = godotenv.Load()

	cfg := &Config{}
	if err := env.Parse(cfg); err != nil {
		return nil, fmt.Errorf("parse env: %w", err)
	}
	return cfg, nil
}

// DSN membentuk Postgres connection string.
func (c *Config) DSN() string {
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%d/%s?sslmode=%s",
		c.DBUser, c.DBPassword, c.DBHost, c.DBPort, c.DBName, c.DBSSLMode,
	)
}

// IsDev mengembalikan true saat APP_ENV=development.
func (c *Config) IsDev() bool {
	return c.AppEnv == "development"
}

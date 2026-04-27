package platform

import (
	"log/slog"
	"os"
)

// NewLogger membangun slog logger dengan output JSON.
// Level Debug untuk development, Info untuk production.
func NewLogger(env string) *slog.Logger {
	level := slog.LevelInfo
	if env == "development" {
		level = slog.LevelDebug
	}
	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level:     level,
		AddSource: false,
	})
	return slog.New(handler)
}

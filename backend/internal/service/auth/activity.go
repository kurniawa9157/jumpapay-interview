package auth

import (
	"context"
	"log/slog"

	"github.com/kurniawa9157/template-base/internal/domain"
)

// ActivityRecorder — interface yang diimplementasi oleh ActivityRepo.
type ActivityRecorder interface {
	Insert(ctx context.Context, in domain.ActivityInput) error
}

// ActivityService membungkus ActivityRecorder + log kegagalan tanpa mengganggu flow utama.
type ActivityService struct {
	repo   ActivityRecorder
	logger *slog.Logger
}

func NewActivityService(repo ActivityRecorder, logger *slog.Logger) *ActivityService {
	return &ActivityService{repo: repo, logger: logger}
}

// Record — fire-and-log (tidak mengembalikan error supaya caller tidak gagal karena audit log).
func (s *ActivityService) Record(ctx context.Context, in domain.ActivityInput) {
	if err := s.repo.Insert(ctx, in); err != nil {
		s.logger.Warn("gagal mencatat aktivitas", "err", err, "code", in.ActivityCode)
	}
}

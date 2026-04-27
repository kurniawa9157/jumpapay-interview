package content

import (
	"context"

	"github.com/kurniawa9157/template-base/internal/domain"
	"github.com/kurniawa9157/template-base/internal/repository/postgres"
)

type PostService struct {
	repo *postgres.PostRepo
}

func NewPostService(repo *postgres.PostRepo) *PostService {
	return &PostService{repo: repo}
}

func (s *PostService) GetByID(ctx context.Context, id int64) (*domain.Post, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *PostService) GetBySlug(ctx context.Context, slug string) (*domain.Post, error) {
	return s.repo.GetBySlug(ctx, slug)
}

func (s *PostService) List(ctx context.Context, f postgres.PostListFilter) ([]domain.Post, int, error) {
	return s.repo.List(ctx, f)
}

func (s *PostService) Create(ctx context.Context, in postgres.CreatePostInput) (int64, error) {
	if !domain.ValidPostType(string(in.Type)) || !domain.ValidPostStatus(string(in.Status)) {
		return 0, domain.ErrInvalidInput
	}
	return s.repo.Create(ctx, in)
}

func (s *PostService) Update(ctx context.Context, id int64, in postgres.UpdatePostInput) error {
	if !domain.ValidPostType(string(in.Type)) || !domain.ValidPostStatus(string(in.Status)) {
		return domain.ErrInvalidInput
	}
	return s.repo.Update(ctx, id, in)
}

func (s *PostService) Delete(ctx context.Context, id int64) error {
	return s.repo.SoftDelete(ctx, id)
}

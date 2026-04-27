package content

import (
	"context"

	"github.com/kurniawa9157/template-base/internal/domain"
	"github.com/kurniawa9157/template-base/internal/repository/postgres"
)

type TemplateService struct {
	repo *postgres.TemplateRepo
}

func NewTemplateService(repo *postgres.TemplateRepo) *TemplateService {
	return &TemplateService{repo: repo}
}

func (s *TemplateService) GetByID(ctx context.Context, id int64) (*domain.TemplateWithValues, error) {
	t, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	values, err := s.repo.ListValues(ctx, id)
	if err != nil {
		return nil, err
	}
	return &domain.TemplateWithValues{Template: *t, Values: values}, nil
}

func (s *TemplateService) GetBySlug(ctx context.Context, slug string) (*domain.TemplateWithValues, error) {
	t, err := s.repo.GetBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	values, err := s.repo.ListValues(ctx, t.ID)
	if err != nil {
		return nil, err
	}
	return &domain.TemplateWithValues{Template: *t, Values: values}, nil
}

func (s *TemplateService) List(ctx context.Context, f postgres.TemplateListFilter) ([]domain.Template, error) {
	return s.repo.List(ctx, f)
}

func (s *TemplateService) Create(ctx context.Context, in postgres.CreateTemplateInput) (int64, error) {
	if !domain.ValidTemplateType(string(in.TypeTemplate)) {
		return 0, domain.ErrInvalidInput
	}
	return s.repo.Create(ctx, in)
}

func (s *TemplateService) Update(ctx context.Context, id int64, in postgres.UpdateTemplateInput) error {
	return s.repo.Update(ctx, id, in)
}

func (s *TemplateService) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}

// SetValue — upsert single value (mis. key='layout' untuk simpan blocks JSON).
func (s *TemplateService) SetValue(ctx context.Context, templateID int64, key, value string) error {
	return s.repo.UpsertValue(ctx, templateID, key, value, 0)
}

// AddItem — append item baru (key auto 'item_<n>').
func (s *TemplateService) AddItem(ctx context.Context, templateID int64, value string) (*domain.TemplateValue, error) {
	_, key, err := s.repo.AppendItem(ctx, templateID, value)
	if err != nil {
		return nil, err
	}
	return s.repo.GetValue(ctx, templateID, key)
}

func (s *TemplateService) UpdateItem(ctx context.Context, itemID int64, value string) error {
	return s.repo.UpdateItemValue(ctx, itemID, value)
}

func (s *TemplateService) DeleteItem(ctx context.Context, itemID int64) error {
	return s.repo.DeleteValue(ctx, itemID)
}

func (s *TemplateService) ReorderItems(ctx context.Context, templateID int64, orderedIDs []int64) error {
	return s.repo.ReorderItems(ctx, templateID, orderedIDs)
}

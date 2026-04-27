package system

import (
	"context"
	"errors"

	"github.com/kurniawa9157/template-base/internal/domain"
	"github.com/kurniawa9157/template-base/internal/repository/postgres"
)

// ValidBrands — daftar brand theme yang boleh disimpan sebagai setting.
// 'atrbpn' = custom theme (di-resolve di frontend via setCustomTheme).
// Lainnya mengikuti BrandName dari @idds/react.
var ValidBrands = map[string]struct{}{
	"atrbpn":  {},
	"default": {},
	"inagov":  {},
	"inaku":   {},
	"bgn":     {},
	"bkn":     {},
	"lan":     {},
	"panrb":   {},
}

const (
	keyBrandTheme   = "brand_theme"
	groupAppearance = "appearance"
	defaultBrand    = "atrbpn"
)

type Service struct {
	repo *postgres.SystemSettingsRepo
}

func NewService(repo *postgres.SystemSettingsRepo) *Service {
	return &Service{repo: repo}
}

// GetBrandTheme — baca setting brand theme saat ini. Fallback ke default
// kalau row belum ada (aman untuk DB yang belum ke-seed).
func (s *Service) GetBrandTheme(ctx context.Context) (string, error) {
	v, err := s.repo.Get(ctx, keyBrandTheme)
	if errors.Is(err, domain.ErrNotFound) {
		return defaultBrand, nil
	}
	if err != nil {
		return "", err
	}
	if _, ok := ValidBrands[v]; !ok {
		return defaultBrand, nil
	}
	return v, nil
}

// SetBrandTheme — simpan pilihan brand. Validasi terhadap ValidBrands.
func (s *Service) SetBrandTheme(ctx context.Context, brand string) error {
	if _, ok := ValidBrands[brand]; !ok {
		return domain.ErrInvalidInput
	}
	return s.repo.Set(ctx, groupAppearance, keyBrandTheme, brand)
}

// PublicSnapshot — subset setting yang aman diekspos tanpa auth. Frontend
// pakai ini untuk hydrate global state sebelum login (brand theme, nama app,
// status maintenance). Key yang belum di-seed akan absent dari map.
var publicSnapshotKeys = []string{
	"brand_theme",
	"app_name",
	"app_tagline",
	"maintenance_mode",
	"maintenance_message",
}

func (s *Service) PublicSnapshot(ctx context.Context) (map[string]string, error) {
	m, err := s.repo.GetMany(ctx, publicSnapshotKeys)
	if err != nil {
		return nil, err
	}
	// Pastikan brand_theme selalu ada (fallback default).
	if _, ok := m["brand_theme"]; !ok {
		m["brand_theme"] = defaultBrand
	}
	if v := m["brand_theme"]; v != "" {
		if _, ok := ValidBrands[v]; !ok {
			m["brand_theme"] = defaultBrand
		}
	}
	return m, nil
}

// ListAll — semua settings untuk admin panel.
func (s *Service) ListAll(ctx context.Context) ([]postgres.SettingRow, error) {
	return s.repo.List(ctx)
}

// BulkUpdateInput — entry yang boleh di-update admin via endpoint generic.
type BulkUpdateInput struct {
	GroupCode string `json:"group_code"`
	Key       string `json:"key"`
	Value     string `json:"value"`
}

// allowedSettingKeys — whitelist key yang boleh diubah via endpoint generic.
// Sengaja strict supaya tidak ada key random yang di-insert. Tambah di sini
// kalau mau ekspose setting baru ke admin UI.
var allowedSettingKeys = map[string]string{
	"app_name":            "general",
	"app_tagline":         "general",
	"timezone":            "general",
	"maintenance_mode":    "maintenance",
	"maintenance_message": "maintenance",
	// brand_theme — sengaja tidak di sini, pakai endpoint khusus dengan validasi
	// value (SetBrandTheme).
}

// BulkUpdate — apply multiple settings sekaligus. Validate setiap entry
// terhadap allowedSettingKeys supaya key unknown di-reject. GroupCode
// di-override ke nilai canonical dari whitelist (ignore input client).
func (s *Service) BulkUpdate(ctx context.Context, entries []BulkUpdateInput) error {
	rows := make([]postgres.SettingRow, 0, len(entries))
	for _, e := range entries {
		group, ok := allowedSettingKeys[e.Key]
		if !ok {
			return domain.ErrInvalidInput
		}
		rows = append(rows, postgres.SettingRow{
			GroupCode: group, Key: e.Key, Value: e.Value,
		})
	}
	return s.repo.SetMany(ctx, rows)
}

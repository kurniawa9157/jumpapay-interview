package account

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/kurniawa9157/template-base/internal/domain"
	"github.com/kurniawa9157/template-base/internal/repository/postgres"
	"github.com/kurniawa9157/template-base/internal/service/auth"
)

// Service — self-service untuk user yang login: data diri, ganti password,
// manajemen sesi aktif. Berlaku untuk semua role (admin, ppat-user, petugas).
type Service struct {
	users     *postgres.UserRepo
	contacts  *postgres.ContactRepo
	passwords *postgres.PasswordRepo
	roles     *postgres.RoleRepo
	refresh   *postgres.RefreshTokenRepo
}

func NewService(
	users *postgres.UserRepo,
	contacts *postgres.ContactRepo,
	passwords *postgres.PasswordRepo,
	roles *postgres.RoleRepo,
	refresh *postgres.RefreshTokenRepo,
) *Service {
	return &Service{users: users, contacts: contacts, passwords: passwords, roles: roles, refresh: refresh}
}

// ProfileDTO — response /me/profile.
type ProfileDTO struct {
	ID              int64      `json:"id"`
	Code            string     `json:"code"`
	FirstName       string     `json:"first_name"`
	MidName         *string    `json:"mid_name,omitempty"`
	LastName        *string    `json:"last_name,omitempty"`
	Email           string     `json:"email"`
	Phone           string     `json:"phone"`
	RoleCode        *string    `json:"role_code,omitempty"`
	RoleName        *string    `json:"role_name,omitempty"`
	IsAdmin         bool       `json:"is_admin"`
	StatusCode      string     `json:"status_code"`
	TwoFactorEnabled bool      `json:"two_factor_enabled"`
	LastLoginAt     *time.Time `json:"last_login_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
}

func (s *Service) GetProfile(ctx context.Context, userID int64) (*ProfileDTO, error) {
	u, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	email, _ := s.contacts.GetPrimaryEmail(ctx, u.ID)
	phone, _ := s.contacts.GetPrimaryPhone(ctx, u.ID)
	dto := &ProfileDTO{
		ID: u.ID, Code: u.Code,
		FirstName: u.FirstName, MidName: u.MidName, LastName: u.LastName,
		Email: email, Phone: phone,
		IsAdmin: u.IsAdmin, StatusCode: string(u.StatusCode),
		TwoFactorEnabled: u.Google2FAEnabled,
		LastLoginAt:      u.LastLoginAt, CreatedAt: u.CreatedAt,
	}
	if u.RoleID != nil {
		if role, err := s.roles.GetByID(ctx, *u.RoleID); err == nil {
			dto.RoleCode = &role.Code
			dto.RoleName = &role.Name
		}
	}
	return dto, nil
}

// UpdateProfileInput — field yang boleh diubah user sendiri.
// Email tidak boleh diubah self-service di batch ini (butuh flow verifikasi).
type UpdateProfileInput struct {
	FirstName string
	MidName   *string
	LastName  *string
	Phone     *string // kalau pointer nil → tidak berubah; kalau string kosong → hapus
}

func (s *Service) UpdateProfile(ctx context.Context, userID int64, in UpdateProfileInput) (*ProfileDTO, error) {
	if strings.TrimSpace(in.FirstName) == "" {
		return nil, fmt.Errorf("nama depan wajib diisi")
	}
	if err := s.users.UpdateNameFields(ctx, userID, in.FirstName, in.MidName, in.LastName, userID); err != nil {
		return nil, err
	}
	if in.Phone != nil {
		if err := s.contacts.UpsertPrimaryPhone(ctx, userID, strings.TrimSpace(*in.Phone)); err != nil {
			return nil, fmt.Errorf("update telepon: %w", err)
		}
	}
	return s.GetProfile(ctx, userID)
}

// ChangePassword — verify current → hash new → rotate → revoke sesi lain.
// keepRefreshHash (hex SHA-256 dari refresh token yang sedang dipakai client)
// kalau non-empty akan dipertahankan, supaya user tidak perlu login ulang di
// device saat ini. Kalau kosong → semua sesi revoke.
func (s *Service) ChangePassword(ctx context.Context, userID int64, current, next, keepRefreshHash string) error {
	if len(next) < 8 {
		return fmt.Errorf("password baru minimal 8 karakter")
	}
	if current == next {
		return fmt.Errorf("password baru harus berbeda dengan yang lama")
	}

	pw, err := s.passwords.GetActive(ctx, userID, domain.PasswordTypeMain)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return domain.ErrInvalidCredentials
		}
		return err
	}
	if err := auth.VerifyPassword(pw.PasswordHash, current); err != nil {
		return domain.ErrInvalidCredentials
	}
	hash, err := auth.HashPassword(next)
	if err != nil {
		return err
	}
	if err := s.passwords.DeactivatePrevious(ctx, userID, domain.PasswordTypeMain); err != nil {
		return err
	}
	if err := s.passwords.Create(ctx, postgres.CreatePasswordInput{
		UserID: userID, TypeCode: domain.PasswordTypeMain, Hash: hash,
	}); err != nil {
		return err
	}
	if err := s.refresh.RevokeAllForUserExceptHash(ctx, userID, keepRefreshHash); err != nil {
		return fmt.Errorf("revoke sesi: %w", err)
	}
	return nil
}

// SessionDTO — row /me/sessions.
type SessionDTO struct {
	ID         int64     `json:"id"`
	DeviceInfo *string   `json:"device_info,omitempty"`
	IPAddress  *string   `json:"ip_address,omitempty"`
	IssuedAt   time.Time `json:"issued_at"`
	ExpiresAt  time.Time `json:"expires_at"`
	IsCurrent  bool      `json:"is_current"`
}

func (s *Service) ListSessions(ctx context.Context, userID int64, currentHash string) ([]SessionDTO, error) {
	list, err := s.refresh.ListActiveByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]SessionDTO, 0, len(list))
	for _, t := range list {
		out = append(out, SessionDTO{
			ID: t.ID, DeviceInfo: t.DeviceInfo, IPAddress: t.IPAddress,
			IssuedAt: t.IssuedAt, ExpiresAt: t.ExpiresAt,
			IsCurrent: currentHash != "" && currentHash == t.TokenHash,
		})
	}
	return out, nil
}

func (s *Service) RevokeSession(ctx context.Context, userID, sessionID int64) error {
	return s.refresh.RevokeByIDForUser(ctx, userID, sessionID)
}

func (s *Service) RevokeOtherSessions(ctx context.Context, userID int64, keepHash string) error {
	return s.refresh.RevokeAllForUserExceptHash(ctx, userID, keepHash)
}

// --- 2FA (TOTP) ---

// Setup2FA — generate secret baru + QR code untuk user. Secret disimpan ke DB
// tapi google2fa_enabled masih FALSE sampai user confirm via Confirm2FA.
// Kalau user sebelumnya sudah enable, memanggil Setup2FA ulang = regenerate
// (disable dulu secara implisit via SetTotpSecret yang reset flag).
func (s *Service) Setup2FA(ctx context.Context, userID int64) (*auth.TotpSetup, error) {
	u, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	// Account name di QR — pakai email primer. Fallback ke code user.
	accountName := u.Code
	if email, _ := s.contacts.GetPrimaryEmail(ctx, u.ID); email != "" {
		accountName = email
	}
	setup, err := auth.GenerateTotpSetup(accountName)
	if err != nil {
		return nil, err
	}
	if err := s.users.SetTotpSecret(ctx, userID, setup.Secret); err != nil {
		return nil, err
	}
	return setup, nil
}

// Confirm2FA — verify 6-digit TOTP code user pertama kali. Kalau valid,
// flag google2fa_enabled di-set TRUE. User wajib verify ini sebelum 2FA
// efektif berlaku di login flow.
func (s *Service) Confirm2FA(ctx context.Context, userID int64, code string) error {
	u, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return err
	}
	if u.Google2FASecret == nil || *u.Google2FASecret == "" {
		return fmt.Errorf("belum setup 2FA, panggil setup terlebih dahulu")
	}
	if !auth.VerifyTotpCode(*u.Google2FASecret, code) {
		return domain.ErrInvalid2FACode
	}
	return s.users.EnableTotp(ctx, userID)
}

// Disable2FA — butuh password sebagai konfirmasi (biar orang yang physical
// access ke sesi tidak bisa mudah matikan 2FA).
func (s *Service) Disable2FA(ctx context.Context, userID int64, currentPassword string) error {
	pw, err := s.passwords.GetActive(ctx, userID, domain.PasswordTypeMain)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return domain.ErrInvalidCredentials
		}
		return err
	}
	if err := auth.VerifyPassword(pw.PasswordHash, currentPassword); err != nil {
		return domain.ErrInvalidCredentials
	}
	return s.users.DisableTotp(ctx, userID)
}

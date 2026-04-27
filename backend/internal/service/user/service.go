package user

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"strings"
	"time"

	"github.com/kurniawa9157/template-base/internal/domain"
	"github.com/kurniawa9157/template-base/internal/repository/postgres"
	"github.com/kurniawa9157/template-base/internal/service/auth"
)

// Service mengorkestrasi admin user management:
// - create: insert user + contact email + password hash
// - update: patch fields
// - suspend/activate: shortcut status_code
// - reset-password: generate random + revoke semua refresh token user
type Service struct {
	users    *postgres.UserRepo
	contacts *postgres.ContactRepo
	pw       *postgres.PasswordRepo
	roles    *postgres.RoleRepo
	refresh  *postgres.RefreshTokenRepo
}

func NewService(
	users *postgres.UserRepo,
	contacts *postgres.ContactRepo,
	pw *postgres.PasswordRepo,
	roles *postgres.RoleRepo,
	refresh *postgres.RefreshTokenRepo,
) *Service {
	return &Service{users: users, contacts: contacts, pw: pw, roles: roles, refresh: refresh}
}

// UserDTO — shape konsisten untuk response list/detail.
type UserDTO struct {
	ID          int64             `json:"id"`
	Code        string            `json:"code"`
	FullName    string            `json:"full_name"`
	FirstName   string            `json:"first_name"`
	MidName     *string           `json:"mid_name,omitempty"`
	LastName    *string           `json:"last_name,omitempty"`
	Email       *string           `json:"email,omitempty"`
	RoleID      *int64            `json:"role_id,omitempty"`
	RoleCode    *string           `json:"role_code,omitempty"`
	RoleName    *string           `json:"role_name,omitempty"`
	StatusCode  domain.UserStatus `json:"status_code"`
	LastLoginAt *time.Time        `json:"last_login_at,omitempty"`
	CreatedAt   time.Time         `json:"created_at"`
}

func dtoFromRow(row postgres.ListUserRow) UserDTO {
	u := row.User
	return UserDTO{
		ID: u.ID, Code: u.Code, FullName: u.FullName(),
		FirstName: u.FirstName, MidName: u.MidName, LastName: u.LastName,
		Email: row.Email, RoleID: u.RoleID, RoleCode: row.RoleCode, RoleName: row.RoleName,
		StatusCode: u.StatusCode, LastLoginAt: u.LastLoginAt, CreatedAt: u.CreatedAt,
	}
}

// ListInput — query parameter dari handler.
type ListInput struct {
	Search     string
	RoleCode   string // dikonversi ke role_id
	StatusCode domain.UserStatus
	Page       int
	Limit      int
}

// ListResult dikembalikan ke handler sebagai JSON.
type ListResult struct {
	Users []UserDTO `json:"users"`
	Total int       `json:"total"`
	Page  int       `json:"page"`
	Limit int       `json:"limit"`
}

func (s *Service) List(ctx context.Context, in ListInput) (*ListResult, error) {
	if in.Page < 1 {
		in.Page = 1
	}
	if in.Limit <= 0 || in.Limit > 200 {
		in.Limit = 20
	}
	filter := postgres.ListFilter{
		Search:     in.Search,
		StatusCode: in.StatusCode,
		Limit:      in.Limit,
		Offset:     (in.Page - 1) * in.Limit,
	}
	if in.RoleCode != "" {
		role, err := s.roles.GetByCode(ctx, in.RoleCode)
		if err == nil {
			filter.RoleID = &role.ID
		}
	}
	rows, total, err := s.users.List(ctx, filter)
	if err != nil {
		return nil, err
	}
	out := make([]UserDTO, 0, len(rows))
	for _, r := range rows {
		out = append(out, dtoFromRow(r))
	}
	return &ListResult{Users: out, Total: total, Page: in.Page, Limit: in.Limit}, nil
}

// Get mengembalikan user + role + email.
func (s *Service) Get(ctx context.Context, id int64) (*UserDTO, error) {
	u, err := s.users.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	email, _ := s.contacts.GetPrimaryEmail(ctx, u.ID)
	dto := UserDTO{
		ID: u.ID, Code: u.Code, FullName: u.FullName(),
		FirstName: u.FirstName, MidName: u.MidName, LastName: u.LastName,
		RoleID: u.RoleID, StatusCode: u.StatusCode, LastLoginAt: u.LastLoginAt, CreatedAt: u.CreatedAt,
	}
	if email != "" {
		dto.Email = &email
	}
	if u.RoleID != nil {
		if role, err := s.roles.GetByID(ctx, *u.RoleID); err == nil {
			dto.RoleCode = &role.Code
			dto.RoleName = &role.Name
		}
	}
	return &dto, nil
}

// CreateInput — input admin saat tambah user baru.
type CreateInput struct {
	FirstName string
	MidName   *string
	LastName  *string
	Email     string
	Password  string
	RoleCode  string // resolve ke role_id
	CreatedBy int64
}

// Create insert user + contact email + password hash dalam 1 urutan.
// Code di-generate otomatis (USR_ + random 6 char).
func (s *Service) Create(ctx context.Context, in CreateInput) (int64, error) {
	role, err := s.roles.GetByCode(ctx, in.RoleCode)
	if err != nil {
		return 0, fmt.Errorf("role tidak ditemukan: %w", err)
	}

	code, err := generateUserCode()
	if err != nil {
		return 0, err
	}

	userID, err := s.users.Create(ctx, postgres.CreateUserInput{
		Code:       code,
		FirstName:  in.FirstName,
		MidName:    in.MidName,
		LastName:   in.LastName,
		IsAdmin:    false,
		RoleID:     &role.ID,
		StatusCode: domain.UserStatusActive,
	})
	if err != nil {
		return 0, fmt.Errorf("insert user: %w", err)
	}

	if err := s.contacts.Create(ctx, postgres.CreateContactInput{
		UserID:     userID,
		TypeCode:   domain.ContactTypeEmail,
		Value:      strings.ToLower(in.Email),
		IsPrimary:  true,
		CanLogin:   true,
		IsVerified: false,
	}); err != nil {
		return 0, fmt.Errorf("insert contact: %w", err)
	}

	hash, err := auth.HashPassword(in.Password)
	if err != nil {
		return 0, fmt.Errorf("hash password: %w", err)
	}
	if err := s.pw.Create(ctx, postgres.CreatePasswordInput{
		UserID: userID, TypeCode: domain.PasswordTypeMain, Hash: hash,
	}); err != nil {
		return 0, fmt.Errorf("insert password: %w", err)
	}
	return userID, nil
}

// UpdateInput — patch dari admin.
type UpdateInput struct {
	FirstName  string
	MidName    *string
	LastName   *string
	RoleCode   string
	StatusCode domain.UserStatus
	UpdatedBy  int64
}

func (s *Service) Update(ctx context.Context, id int64, in UpdateInput) error {
	var roleID *int64
	if in.RoleCode != "" {
		role, err := s.roles.GetByCode(ctx, in.RoleCode)
		if err != nil {
			return fmt.Errorf("role tidak ditemukan: %w", err)
		}
		roleID = &role.ID
	}
	return s.users.Update(ctx, id, postgres.UpdateUserInput{
		FirstName: in.FirstName, MidName: in.MidName, LastName: in.LastName,
		RoleID: roleID, StatusCode: in.StatusCode, UpdatedBy: in.UpdatedBy,
	})
}

// Suspend & Activate — shortcut status change.
func (s *Service) Suspend(ctx context.Context, id int64, actorID int64) error {
	return s.users.SetStatus(ctx, id, domain.UserStatusSuspended, actorID)
}

func (s *Service) Activate(ctx context.Context, id int64, actorID int64) error {
	return s.users.SetStatus(ctx, id, domain.UserStatusActive, actorID)
}

// ResetPasswordResult — return ke admin setelah reset sukses.
type ResetPasswordResult struct {
	TempPassword string    `json:"temp_password"`
	ResetAt      time.Time `json:"reset_at"`
}

// ResetPassword — admin minta reset password user:
//  1. Generate password random 12-char (huruf+angka campur)
//  2. Deactivate password MAIN lama → insert baru (history pattern)
//  3. Revoke semua refresh_token user (force login ulang di semua device)
//  4. Return plain password sekali saja — admin wajib sampaikan ke user
func (s *Service) ResetPassword(ctx context.Context, userID int64) (*ResetPasswordResult, error) {
	// Pastikan user ada (menghindari reset ke ID sembarang).
	u, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if u.IsAdmin {
		return nil, fmt.Errorf("tidak dapat reset password super admin via endpoint ini")
	}

	plain, err := generateRandomPassword(12)
	if err != nil {
		return nil, err
	}
	hash, err := auth.HashPassword(plain)
	if err != nil {
		return nil, err
	}

	if err := s.pw.DeactivatePrevious(ctx, userID, domain.PasswordTypeMain); err != nil {
		return nil, fmt.Errorf("deactivate lama: %w", err)
	}
	if err := s.pw.Create(ctx, postgres.CreatePasswordInput{
		UserID: userID, TypeCode: domain.PasswordTypeMain, Hash: hash,
	}); err != nil {
		return nil, fmt.Errorf("insert password baru: %w", err)
	}
	if err := s.refresh.RevokeAllForUser(ctx, userID); err != nil {
		return nil, fmt.Errorf("revoke sessions: %w", err)
	}

	return &ResetPasswordResult{TempPassword: plain, ResetAt: time.Now()}, nil
}

// generateRandomPassword — kombinasi huruf + angka, hindari karakter
// ambigu (0/O/1/l/I) supaya admin mudah diktekan via telepon.
func generateRandomPassword(length int) (string, error) {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
	if length < 8 {
		length = 8
	}
	buf := make([]byte, length)
	rb := make([]byte, length)
	if _, err := rand.Read(rb); err != nil {
		return "", err
	}
	for i := 0; i < length; i++ {
		buf[i] = alphabet[int(rb[i])%len(alphabet)]
	}
	return string(buf), nil
}

// generateUserCode — USR_ + 6 char base64 url-safe.
func generateUserCode() (string, error) {
	b := make([]byte, 6)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return "USR_" + strings.ToUpper(base64.RawURLEncoding.EncodeToString(b))[:8], nil
}

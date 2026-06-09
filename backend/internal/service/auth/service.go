package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/kurniawa9157/template-base/internal/domain"
	"github.com/kurniawa9157/template-base/internal/repository/postgres"
)

// Service mengkoordinir login, refresh, logout, me.
// Alur login multi-channel mencerminkan Laravel ContactUserProvider:
//
//	identifier → tt_contacts → users → tt_passwords (MAIN, is_active=TRUE)
type Service struct {
	users          *postgres.UserRepo
	contacts       *postgres.ContactRepo
	pw             *postgres.PasswordRepo
	perms          *postgres.PermissionRepo
	roles          *postgres.RoleRepo
	refresh        *postgres.RefreshTokenRepo
	jwtSvc         *JWTService
	activity       *ActivityService
	logger         *slog.Logger
	googleClientID string
}

func NewService(
	users *postgres.UserRepo,
	contacts *postgres.ContactRepo,
	pw *postgres.PasswordRepo,
	perms *postgres.PermissionRepo,
	roles *postgres.RoleRepo,
	refresh *postgres.RefreshTokenRepo,
	jwtSvc *JWTService,
	activity *ActivityService,
	logger *slog.Logger,
	googleClientID string,
) *Service {
	return &Service{
		users: users, contacts: contacts, pw: pw, perms: perms, roles: roles,
		refresh: refresh, jwtSvc: jwtSvc, activity: activity, logger: logger,
		googleClientID: googleClientID,
	}
}

// LoginResult dikembalikan ke handler untuk dijadikan JSON response.
type LoginResult struct {
	Status          string               `json:"status"` // "ok" atau "requires_2fa"
	AccessToken     string               `json:"access_token,omitempty"`
	RefreshToken    string               `json:"refresh_token,omitempty"`
	ExpiresIn       int                  `json:"expires_in,omitempty"` // detik
	Pending2FAToken string               `json:"pending_2fa_token,omitempty"`
	User            *domain.User         `json:"user,omitempty"`
	Role            *domain.Role         `json:"role,omitempty"`
	Permissions     domain.PermissionMap `json:"permissions,omitempty"`
}

// ClientContext — metadata request yang dicatat ke activity log.
type ClientContext struct {
	IP         string
	UserAgent  string
	DeviceType string
}

type googleProfile struct {
	Email   string
	Name    string
	Picture string
}

type googleTokenInfo struct {
	Audience      string `json:"aud"`
	Email         string `json:"email"`
	EmailVerified string `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

// Login melakukan verifikasi kredensial + issue token.
func (s *Service) Login(ctx context.Context, identifier, password string, cc ClientContext) (*LoginResult, error) {
	contact, err := s.contacts.FindLoginableByValue(ctx, identifier)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			s.activity.Record(ctx, domain.ActivityInput{
				ActivityCode: domain.ActivityLoginFailed, Description: "contact tidak ditemukan",
				IPAddress: cc.IP, UserAgent: cc.UserAgent, DeviceType: cc.DeviceType, IsSuccess: false,
			})
			return nil, domain.ErrInvalidCredentials
		}
		return nil, err
	}

	user, err := s.users.GetByID(ctx, contact.UserID)
	if err != nil {
		return nil, err
	}
	if !user.IsActive() {
		s.activity.Record(ctx, domain.ActivityInput{
			UserID: &user.ID, ActivityCode: domain.ActivityLoginFailed,
			Description: "akun tidak aktif", IPAddress: cc.IP, UserAgent: cc.UserAgent, IsSuccess: false,
		})
		if user.StatusCode == domain.UserStatusSuspended {
			return nil, domain.ErrUserSuspended
		}
		return nil, domain.ErrUserInactive
	}

	pwRow, err := s.pw.GetActive(ctx, user.ID, domain.PasswordTypeMain)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, domain.ErrInvalidCredentials
		}
		return nil, err
	}

	now := time.Now()
	if pwRow.IsLocked(now) {
		s.activity.Record(ctx, domain.ActivityInput{
			UserID: &user.ID, ActivityCode: domain.ActivityLoginFailed,
			Description: "akun terkunci", IPAddress: cc.IP, UserAgent: cc.UserAgent, IsSuccess: false,
		})
		return nil, domain.ErrAccountLocked
	}

	if err := VerifyPassword(pwRow.PasswordHash, password); err != nil {
		_ = s.pw.RecordFailedAttempt(ctx, pwRow.ID, MaxLoginAttempts, 15*time.Minute)
		s.activity.Record(ctx, domain.ActivityInput{
			UserID: &user.ID, ActivityCode: domain.ActivityLoginFailed,
			Description: "password salah", IPAddress: cc.IP, UserAgent: cc.UserAgent, IsSuccess: false,
		})
		return nil, domain.ErrInvalidCredentials
	}

	// Jika 2FA aktif, keluarkan pending token — belum issue access/refresh.
	if user.HasTwoFactor() {
		pending, err := s.jwtSvc.IssuePending2FA(user.ID)
		if err != nil {
			return nil, err
		}
		return &LoginResult{Status: "requires_2fa", Pending2FAToken: pending}, nil
	}

	return s.completeLogin(ctx, user, pwRow.ID, cc, domain.ActivityLogin)
}

// LoginWithGoogle memverifikasi Google ID token, membuat akun customer bila
// email belum ada, lalu menerbitkan access/refresh token.
func (s *Service) LoginWithGoogle(ctx context.Context, idToken string, cc ClientContext) (*LoginResult, error) {
	profile, err := s.verifyGoogleIDToken(ctx, idToken)
	if err != nil {
		return nil, domain.ErrInvalidCredentials
	}
	email := strings.ToLower(strings.TrimSpace(profile.Email))
	if email == "" {
		return nil, domain.ErrInvalidCredentials
	}

	contact, err := s.contacts.FindLoginableByValue(ctx, email)
	if err != nil && !errors.Is(err, domain.ErrNotFound) {
		return nil, err
	}

	var user *domain.User
	if contact != nil {
		user, err = s.users.GetByID(ctx, contact.UserID)
		if err != nil {
			return nil, err
		}
	} else {
		first, last := splitName(profile.Name, email)
		userID, err := s.users.Create(ctx, postgres.CreateUserInput{
			Code:       "CUST-" + strings.ToUpper(uuid.NewString()[:8]),
			FirstName:  first,
			LastName:   last,
			IsAdmin:    false,
			RoleID:     nil,
			StatusCode: domain.UserStatusActive,
		})
		if err != nil {
			return nil, err
		}
		if err := s.contacts.Create(ctx, postgres.CreateContactInput{
			UserID: userID, TypeCode: domain.ContactTypeEmail, Value: email,
			IsPrimary: true, CanLogin: true, IsVerified: true,
		}); err != nil {
			return nil, err
		}
		user, err = s.users.GetByID(ctx, userID)
		if err != nil {
			return nil, err
		}
	}

	if !user.IsActive() {
		return nil, domain.ErrUserInactive
	}
	return s.completeExternalLogin(ctx, user, cc)
}

// completeLogin — reset failed attempts, update last_login, issue tokens, log success.
func (s *Service) completeLogin(
	ctx context.Context,
	user *domain.User,
	pwID int64,
	cc ClientContext,
	activityCode domain.ActivityCode,
) (*LoginResult, error) {
	_ = s.pw.ResetAttempts(ctx, pwID)
	_ = s.users.UpdateLastLogin(ctx, user.ID)

	access, accessExp, err := s.jwtSvc.IssueAccess(user.ID, user.RoleID, user.IsAdmin)
	if err != nil {
		return nil, err
	}
	rawRefresh, refreshHash, refreshExp, err := s.jwtSvc.NewRefreshToken()
	if err != nil {
		return nil, err
	}
	if err := s.refresh.Create(ctx, postgres.CreateRefreshInput{
		UserID: user.ID, TokenHash: refreshHash, DeviceInfo: cc.DeviceType,
		IPAddress: cc.IP, ExpiresAt: refreshExp,
	}); err != nil {
		return nil, err
	}

	role, perms := s.loadRoleAndPermissions(ctx, user)

	s.activity.Record(ctx, domain.ActivityInput{
		UserID: &user.ID, ActivityCode: activityCode,
		IPAddress: cc.IP, UserAgent: cc.UserAgent, DeviceType: cc.DeviceType, IsSuccess: true,
	})

	expiresIn := int(time.Until(accessExp).Seconds())
	return &LoginResult{
		Status: "ok", AccessToken: access, RefreshToken: rawRefresh, ExpiresIn: expiresIn,
		User: user, Role: role, Permissions: perms,
	}, nil
}

func (s *Service) completeExternalLogin(ctx context.Context, user *domain.User, cc ClientContext) (*LoginResult, error) {
	_ = s.users.UpdateLastLogin(ctx, user.ID)

	access, accessExp, err := s.jwtSvc.IssueAccess(user.ID, user.RoleID, user.IsAdmin)
	if err != nil {
		return nil, err
	}
	rawRefresh, refreshHash, refreshExp, err := s.jwtSvc.NewRefreshToken()
	if err != nil {
		return nil, err
	}
	if err := s.refresh.Create(ctx, postgres.CreateRefreshInput{
		UserID: user.ID, TokenHash: refreshHash, DeviceInfo: cc.DeviceType,
		IPAddress: cc.IP, ExpiresAt: refreshExp,
	}); err != nil {
		return nil, err
	}
	role, perms := s.loadRoleAndPermissions(ctx, user)
	s.activity.Record(ctx, domain.ActivityInput{
		UserID: &user.ID, ActivityCode: domain.ActivityLogin,
		Description: "login google", IPAddress: cc.IP, UserAgent: cc.UserAgent,
		DeviceType: cc.DeviceType, IsSuccess: true,
	})

	return &LoginResult{
		Status: "ok", AccessToken: access, RefreshToken: rawRefresh,
		ExpiresIn: int(time.Until(accessExp).Seconds()),
		User:      user, Role: role, Permissions: perms,
	}, nil
}

func (s *Service) verifyGoogleIDToken(ctx context.Context, idToken string) (*googleProfile, error) {
	idToken = strings.TrimSpace(idToken)
	if idToken == "" {
		return nil, fmt.Errorf("empty google token")
	}
	if s.googleClientID == "" && strings.HasPrefix(idToken, "demo:") {
		parts := strings.SplitN(strings.TrimPrefix(idToken, "demo:"), ":", 2)
		email := parts[0]
		name := "Demo Customer"
		if len(parts) == 2 && strings.TrimSpace(parts[1]) != "" {
			name = parts[1]
		}
		return &googleProfile{Email: email, Name: name}, nil
	}
	if s.googleClientID == "" {
		return nil, fmt.Errorf("google client id is not configured")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		"https://oauth2.googleapis.com/tokeninfo?id_token="+url.QueryEscape(idToken), nil)
	if err != nil {
		return nil, err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("google token rejected")
	}
	var info googleTokenInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, err
	}
	if s.googleClientID != "" && info.Audience != s.googleClientID {
		return nil, fmt.Errorf("google audience mismatch")
	}
	if info.Email == "" || info.EmailVerified != "true" {
		return nil, fmt.Errorf("google email not verified")
	}
	return &googleProfile{Email: info.Email, Name: info.Name, Picture: info.Picture}, nil
}

func splitName(name, email string) (string, *string) {
	name = strings.TrimSpace(name)
	if name == "" {
		name = strings.Split(email, "@")[0]
	}
	parts := strings.Fields(name)
	if len(parts) <= 1 {
		return name, nil
	}
	last := strings.Join(parts[1:], " ")
	return parts[0], &last
}

// VerifyPending2FA — step ke-2 login untuk user ber-2FA. User submit 6-digit
// TOTP code + pending token yang didapat saat login sebelumnya. Kalau valid,
// issue access+refresh token seperti login normal.
func (s *Service) VerifyPending2FA(
	ctx context.Context,
	pendingToken, code string,
	cc ClientContext,
) (*LoginResult, error) {
	claims, err := s.jwtSvc.ParsePending2FA(pendingToken)
	if err != nil {
		return nil, domain.ErrInvalidToken
	}
	user, err := s.users.GetByID(ctx, claims.UserID)
	if err != nil {
		return nil, err
	}
	if !user.HasTwoFactor() || user.Google2FASecret == nil || *user.Google2FASecret == "" {
		// Edge case — user disable 2FA setelah login step 1. Token tidak valid lagi.
		return nil, domain.ErrInvalidToken
	}
	if !VerifyTotpCode(*user.Google2FASecret, code) {
		s.activity.Record(ctx, domain.ActivityInput{
			UserID: &user.ID, ActivityCode: domain.ActivityLoginFailed,
			Description: "2FA code salah", IPAddress: cc.IP, UserAgent: cc.UserAgent, IsSuccess: false,
		})
		return nil, domain.ErrInvalid2FACode
	}
	// Ambil password row aktif untuk reset failed attempts (konsisten dengan
	// completeLogin path normal).
	pwRow, err := s.pw.GetActive(ctx, user.ID, domain.PasswordTypeMain)
	if err != nil {
		return nil, err
	}
	return s.completeLogin(ctx, user, pwRow.ID, cc, domain.ActivityLogin)
}

// Refresh memvalidasi refresh token, revoke yang lama, issue pair baru.
func (s *Service) Refresh(ctx context.Context, rawRefresh string, cc ClientContext) (*LoginResult, error) {
	hash := HashRefreshToken(rawRefresh)
	rt, err := s.refresh.GetValidByHash(ctx, hash)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, domain.ErrInvalidToken
		}
		return nil, err
	}
	user, err := s.users.GetByID(ctx, rt.UserID)
	if err != nil {
		return nil, err
	}
	if !user.IsActive() {
		_ = s.refresh.Revoke(ctx, rt.ID)
		return nil, domain.ErrUserSuspended
	}

	// Revoke yang lama, issue baru (rotation).
	if err := s.refresh.Revoke(ctx, rt.ID); err != nil {
		return nil, err
	}
	access, accessExp, err := s.jwtSvc.IssueAccess(user.ID, user.RoleID, user.IsAdmin)
	if err != nil {
		return nil, err
	}
	newRaw, newHash, newExp, err := s.jwtSvc.NewRefreshToken()
	if err != nil {
		return nil, err
	}
	if err := s.refresh.Create(ctx, postgres.CreateRefreshInput{
		UserID: user.ID, TokenHash: newHash, DeviceInfo: cc.DeviceType,
		IPAddress: cc.IP, ExpiresAt: newExp,
	}); err != nil {
		return nil, err
	}

	s.activity.Record(ctx, domain.ActivityInput{
		UserID: &user.ID, ActivityCode: domain.ActivityTokenRefresh,
		IPAddress: cc.IP, UserAgent: cc.UserAgent, IsSuccess: true,
	})

	role, perms := s.loadRoleAndPermissions(ctx, user)
	expiresIn := int(time.Until(accessExp).Seconds())
	return &LoginResult{
		Status: "ok", AccessToken: access, RefreshToken: newRaw, ExpiresIn: expiresIn,
		User: user, Role: role, Permissions: perms,
	}, nil
}

// Logout revoke refresh token yang dikirim oleh client (atau noop kalau tidak ada).
func (s *Service) Logout(ctx context.Context, userID int64, rawRefresh string, cc ClientContext) {
	if rawRefresh != "" {
		_ = s.refresh.RevokeByHash(ctx, HashRefreshToken(rawRefresh))
	}
	s.activity.Record(ctx, domain.ActivityInput{
		UserID: &userID, ActivityCode: domain.ActivityLogout,
		IPAddress: cc.IP, UserAgent: cc.UserAgent, IsSuccess: true,
	})
}

// Me mengembalikan user + role + permissions dari user_id (dari access token).
type MeResult struct {
	User        *domain.User         `json:"user"`
	Role        *domain.Role         `json:"role,omitempty"`
	Permissions domain.PermissionMap `json:"permissions"`
}

func (s *Service) Me(ctx context.Context, userID int64) (*MeResult, error) {
	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	role, perms := s.loadRoleAndPermissions(ctx, user)
	return &MeResult{User: user, Role: role, Permissions: perms}, nil
}

// loadRoleAndPermissions — helper yang mengembalikan role + permission map.
// Super admin: semua module=true untuk semua action. Role=nil: empty map.
func (s *Service) loadRoleAndPermissions(ctx context.Context, user *domain.User) (*domain.Role, domain.PermissionMap) {
	if user.IsAdmin {
		return nil, adminPermissionMap()
	}
	if user.RoleID == nil {
		return nil, domain.PermissionMap{}
	}
	role, err := s.roles.GetByID(ctx, *user.RoleID)
	if err != nil {
		s.logger.Warn("load role gagal", "err", err, "role_id", *user.RoleID)
	}
	perms, err := s.perms.ListByRole(ctx, *user.RoleID)
	if err != nil {
		s.logger.Warn("load permissions gagal", "err", err, "role_id", *user.RoleID)
		return role, domain.PermissionMap{}
	}
	return role, postgres.ToPermissionMap(perms)
}

// adminPermissionMap — super admin otomatis punya semua permission.
func adminPermissionMap() domain.PermissionMap {
	out := make(domain.PermissionMap, len(domain.AllModules()))
	for _, m := range domain.AllModules() {
		out[m] = map[domain.Action]bool{
			domain.ActionView:   true,
			domain.ActionCreate: true,
			domain.ActionEdit:   true,
			domain.ActionDelete: true,
		}
	}
	return out
}

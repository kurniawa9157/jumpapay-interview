package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// AccessClaims — payload JWT access token.
type AccessClaims struct {
	UserID  int64  `json:"sub,string"`
	RoleID  *int64 `json:"role_id,omitempty,string"`
	IsAdmin bool   `json:"is_admin"`
	jwt.RegisteredClaims
}

// PendingTwoFAClaims — short-lived token saat login butuh 2FA.
type PendingTwoFAClaims struct {
	UserID  int64 `json:"sub,string"`
	Purpose string `json:"purpose"` // selalu "2fa_pending"
	jwt.RegisteredClaims
}

// JWTService menandatangani & memvalidasi access token + pending 2FA token.
// Refresh token bukan JWT — random opaque string disimpan hash-nya di DB.
type JWTService struct {
	secret     []byte
	accessTTL  time.Duration
	refreshTTL time.Duration
	issuer     string
}

func NewJWTService(secret string, accessTTL, refreshTTL time.Duration) *JWTService {
	return &JWTService{
		secret:     []byte(secret),
		accessTTL:  accessTTL,
		refreshTTL: refreshTTL,
		issuer:     "eppat-backend",
	}
}

// IssueAccess membuat access token baru (15 menit default).
func (s *JWTService) IssueAccess(userID int64, roleID *int64, isAdmin bool) (string, time.Time, error) {
	now := time.Now()
	exp := now.Add(s.accessTTL)
	claims := AccessClaims{
		UserID:  userID,
		RoleID:  roleID,
		IsAdmin: isAdmin,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    s.issuer,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(exp),
			ID:        uuid.NewString(),
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := tok.SignedString(s.secret)
	return signed, exp, err
}

// ParseAccess memvalidasi signature + expiry, mengembalikan claims.
func (s *JWTService) ParseAccess(raw string) (*AccessClaims, error) {
	claims := &AccessClaims{}
	token, err := jwt.ParseWithClaims(raw, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return s.secret, nil
	})
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	return claims, nil
}

// IssuePending2FA — token singkat (5 menit) penanda login butuh 2FA.
func (s *JWTService) IssuePending2FA(userID int64) (string, error) {
	now := time.Now()
	claims := PendingTwoFAClaims{
		UserID:  userID,
		Purpose: "2fa_pending",
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    s.issuer,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(5 * time.Minute)),
			ID:        uuid.NewString(),
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return tok.SignedString(s.secret)
}

// ParsePending2FA — baca pending 2FA token, validasi purpose.
func (s *JWTService) ParsePending2FA(raw string) (*PendingTwoFAClaims, error) {
	claims := &PendingTwoFAClaims{}
	tok, err := jwt.ParseWithClaims(raw, claims, func(t *jwt.Token) (any, error) {
		return s.secret, nil
	})
	if err != nil || !tok.Valid {
		return nil, fmt.Errorf("invalid 2fa token")
	}
	if claims.Purpose != "2fa_pending" {
		return nil, fmt.Errorf("wrong token purpose")
	}
	return claims, nil
}

// NewRefreshToken menghasilkan 256-bit random string (base64 url-safe).
// Return pair (raw, hash) — raw dikirim ke klien, hash disimpan di DB.
func (s *JWTService) NewRefreshToken() (raw, hash string, expiresAt time.Time, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return "", "", time.Time{}, err
	}
	raw = base64.RawURLEncoding.EncodeToString(b)
	sum := sha256.Sum256([]byte(raw))
	hash = hex.EncodeToString(sum[:])
	expiresAt = time.Now().Add(s.refreshTTL)
	return
}

// HashRefreshToken — helper untuk me-hash refresh token dari client saat validasi.
func HashRefreshToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

// AccessTTL mengembalikan durasi access token — dipakai handler untuk body response.
func (s *JWTService) AccessTTL() time.Duration { return s.accessTTL }

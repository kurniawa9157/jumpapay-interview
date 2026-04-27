package domain

import "time"

// RefreshToken — entry tt_refresh_tokens untuk revocation tracking.
// token_hash adalah SHA-256 dari raw token yang dikirim ke client.
type RefreshToken struct {
	ID         int64      `json:"id"`
	UserID     int64      `json:"user_id"`
	TokenHash  string     `json:"-"`
	DeviceInfo *string    `json:"device_info,omitempty"`
	IPAddress  *string    `json:"ip_address,omitempty"`
	IssuedAt   time.Time  `json:"issued_at"`
	ExpiresAt  time.Time  `json:"expires_at"`
	RevokedAt  *time.Time `json:"revoked_at,omitempty"`
}

// IsValid — true bila belum revoke & belum expired.
func (r RefreshToken) IsValid(now time.Time) bool {
	return r.RevokedAt == nil && r.ExpiresAt.After(now)
}

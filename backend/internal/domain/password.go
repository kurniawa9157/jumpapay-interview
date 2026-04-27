package domain

import "time"

// PasswordType — sesuai tr_data_references group PASSWORD_TYPE.
type PasswordType string

const (
	PasswordTypeMain     PasswordType = "MAIN"
	PasswordTypeOTPLogin PasswordType = "OTP_LOGIN"
	PasswordTypeOTPReset PasswordType = "OTP_RESET"
)

// Password — entry tt_passwords (history pattern).
type Password struct {
	ID             int64        `json:"id"`
	UserID         int64        `json:"user_id"`
	TypeCode       PasswordType `json:"type_code"`
	PasswordHash   string       `json:"-"`
	PlainHint      *string      `json:"plain_hint,omitempty"`
	IsActive       bool         `json:"is_active"`
	ExpiredAt      *time.Time   `json:"expired_at,omitempty"`
	FailedAttempts int          `json:"failed_attempts"`
	LockedUntil    *time.Time   `json:"locked_until,omitempty"`
	LastUsedAt     *time.Time   `json:"last_used_at,omitempty"`
	CreatedAt      time.Time    `json:"created_at"`
}

// IsLocked mengembalikan true kalau locked_until masih di masa depan.
func (p Password) IsLocked(now time.Time) bool {
	return p.LockedUntil != nil && p.LockedUntil.After(now)
}

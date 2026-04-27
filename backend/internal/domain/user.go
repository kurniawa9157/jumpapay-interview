package domain

import "time"

// UserStatus — sesuai tr_data_references group USER_STATUS.
type UserStatus string

const (
	UserStatusActive    UserStatus = "ACTIVE"
	UserStatusSuspended UserStatus = "SUSPENDED"
	UserStatusInactive  UserStatus = "INACTIVE"
)

// User adalah representasi inti tabel users.
type User struct {
	ID                   int64      `json:"id"`
	Code                 string     `json:"code"`
	FirstName            string     `json:"first_name"`
	MidName              *string    `json:"mid_name,omitempty"`
	LastName             *string    `json:"last_name,omitempty"`
	IsAdmin              bool       `json:"is_admin"`
	RoleID               *int64     `json:"role_id,omitempty"`
	StatusCode           UserStatus `json:"status_code"`
	Google2FASecret      *string    `json:"-"`
	Google2FAEnabled     bool       `json:"google2fa_enabled"`
	Google2FAConfirmedAt *time.Time `json:"google2fa_confirmed_at,omitempty"`
	LastLoginAt          *time.Time `json:"last_login_at,omitempty"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
}

// FullName menggabungkan nama depan, tengah, belakang.
func (u User) FullName() string {
	name := u.FirstName
	if u.MidName != nil && *u.MidName != "" {
		name += " " + *u.MidName
	}
	if u.LastName != nil && *u.LastName != "" {
		name += " " + *u.LastName
	}
	return name
}

// IsActive mengembalikan true saat status_code=ACTIVE.
func (u User) IsActive() bool {
	return u.StatusCode == UserStatusActive
}

// HasTwoFactor mengembalikan true kalau 2FA aktif & sudah confirmed.
func (u User) HasTwoFactor() bool {
	return u.Google2FAEnabled && u.Google2FASecret != nil && *u.Google2FASecret != ""
}

// UserBrief — snapshot ringan untuk permission check (tanpa data sensitif).
type UserBrief struct {
	ID      int64
	IsAdmin bool
	RoleID  *int64
}

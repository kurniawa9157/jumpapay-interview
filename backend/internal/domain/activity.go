package domain

import (
	"encoding/json"
	"time"
)

// ActivityCode — sesuai tr_data_references group ACTIVITY_CODE.
type ActivityCode string

const (
	ActivityLogin          ActivityCode = "LOGIN"
	ActivityLogout         ActivityCode = "LOGOUT"
	ActivityLoginFailed    ActivityCode = "LOGIN_FAILED"
	ActivityTokenRefresh   ActivityCode = "TOKEN_REFRESH"
	ActivityPasswordChange ActivityCode = "PASSWORD_CHANGE"
	Activity2FAEnabled     ActivityCode = "2FA_ENABLED"
	Activity2FADisabled    ActivityCode = "2FA_DISABLED"
)

// Activity — append-only log entry.
type Activity struct {
	ID              int64           `json:"id"`
	UserID          *int64          `json:"user_id,omitempty"`
	ActivityCode    ActivityCode    `json:"activity_code"`
	Description     *string         `json:"description,omitempty"`
	IPAddress       *string         `json:"ip_address,omitempty"`
	UserAgent       *string         `json:"user_agent,omitempty"`
	DeviceType      *string         `json:"device_type,omitempty"`
	OS              *string         `json:"os,omitempty"`
	Browser         *string         `json:"browser,omitempty"`
	LocationCountry *string         `json:"location_country,omitempty"`
	LocationCity    *string         `json:"location_city,omitempty"`
	SessionID       *string         `json:"session_id,omitempty"`
	IsSuccess       bool            `json:"is_success"`
	Metadata        json.RawMessage `json:"metadata,omitempty"`
	CreatedAt       time.Time       `json:"created_at"`
}

// ActivityInput — data untuk insert activity baru.
type ActivityInput struct {
	UserID       *int64
	ActivityCode ActivityCode
	Description  string
	IPAddress    string
	UserAgent    string
	DeviceType   string
	SessionID    string
	IsSuccess    bool
	Metadata     map[string]any
}

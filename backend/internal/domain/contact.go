package domain

import "time"

// ContactType — sesuai tr_data_references group CONTACT_TYPE.
type ContactType string

const (
	ContactTypeEmail  ContactType = "EMAIL"
	ContactTypePhone  ContactType = "PHONE"
	ContactTypeGoogle ContactType = "GOOGLE"
)

// Contact adalah satu channel login user (email/phone/google).
type Contact struct {
	ID         int64       `json:"id"`
	UserID     int64       `json:"user_id"`
	TypeCode   ContactType `json:"type_code"`
	Value      string      `json:"value"`
	IsPrimary  bool        `json:"is_primary"`
	CanLogin   bool        `json:"can_login"`
	IsVerified bool        `json:"is_verified"`
	IsActive   bool        `json:"is_active"`
	CreatedAt  time.Time   `json:"created_at"`
	UpdatedAt  time.Time   `json:"updated_at"`
}

package domain

import "time"

// Role — tr_roles.
type Role struct {
	ID        int64     `json:"id"`
	Code      string    `json:"code"`
	Name      string    `json:"name"`
	ParentID  *int64    `json:"parent_id,omitempty"`
	Level     int       `json:"level"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

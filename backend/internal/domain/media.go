package domain

import "time"

type MediaFile struct {
	ID            int64     `json:"id"`
	Filename      string    `json:"filename"`        // uuid-prefixed safe name
	OriginalName  *string   `json:"original_name,omitempty"`
	MimeType      string    `json:"mime_type"`
	SizeBytes     int64     `json:"size_bytes"`
	UploadedByID  *int64    `json:"uploaded_by_id,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	URL           string    `json:"url"` // computed: "/uploads/{filename}"
}

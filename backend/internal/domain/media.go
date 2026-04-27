package domain

import "time"

type MediaFile struct {
	ID            int64     `json:"id"`
	Filename      string    `json:"filename"` // uuid-prefixed safe name
	OriginalName  *string   `json:"original_name,omitempty"`
	MimeType      string    `json:"mime_type"`
	SizeBytes     int64     `json:"size_bytes"`
	UploadedByID  *int64    `json:"uploaded_by_id,omitempty"`
	HasThumbnails bool      `json:"has_thumbnails"`
	CreatedAt     time.Time `json:"created_at"`

	// Computed URLs. URL selalu point ke file original. URLThumb/Medium/Large
	// point ke variant resize (kalau has_thumbnails) atau fallback ke URL
	// original (kalau bukan image atau image lama sebelum thumbnail feature).
	URL       string `json:"url"`
	URLThumb  string `json:"url_thumb"`
	URLMedium string `json:"url_medium"`
	URLLarge  string `json:"url_large"`
}

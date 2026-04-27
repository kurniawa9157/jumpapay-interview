package domain

import "time"

// TemplateType — discriminator untuk tr_templates.
// Pakai string biar readable di SQL/log dan flexibel tambah type baru.
type TemplateType string

const (
	TemplateTypePage   TemplateType = "page"   // layout halaman, key='layout' = blocks JSON
	TemplateTypeSlider TemplateType = "slider" // master slider, items di template_values
	TemplateTypeMenu   TemplateType = "menu"   // master menu navbar
	TemplateTypeFooter TemplateType = "footer" // master footer widget
)

// ValidTemplateTypes mengembalikan true kalau type valid.
func ValidTemplateType(t string) bool {
	switch TemplateType(t) {
	case TemplateTypePage, TemplateTypeSlider, TemplateTypeMenu, TemplateTypeFooter:
		return true
	}
	return false
}

// Template — row tr_templates.
type Template struct {
	ID            int64        `json:"id"`
	Code          string       `json:"code"`
	Name          string       `json:"name"`
	TypeTemplate  TemplateType `json:"type_template"`
	Slug          *string      `json:"slug,omitempty"`
	IsActive      bool         `json:"is_active"`
	CreatedAt     time.Time    `json:"created_at"`
	UpdatedAt     time.Time    `json:"updated_at"`
	UpdatedByID   *int64       `json:"updated_by_id,omitempty"`
}

// TemplateValue — row tr_template_values. Value selalu disimpan sebagai TEXT
// (JSON string atau plain text). Frontend yang parse.
type TemplateValue struct {
	ID         int64     `json:"id"`
	TemplateID int64     `json:"template_id"`
	Key        string    `json:"key"`
	Value      string    `json:"value"`
	Order      int       `json:"order"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// TemplateWithValues — bundling template + semua values, dipakai response
// detail endpoint biar frontend cuma 1 request.
type TemplateWithValues struct {
	Template
	Values []TemplateValue `json:"values"`
}

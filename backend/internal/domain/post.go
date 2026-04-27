package domain

import "time"

// PostType — diskriminator content. 'post' untuk article/news, 'page' untuk
// halaman statis (mis. About, Privacy Policy yang konten teks bukan layout).
type PostType string

const (
	PostTypePost PostType = "post"
	PostTypePage PostType = "page"
)

// PostStatus — workflow status.
type PostStatus string

const (
	PostStatusDraft     PostStatus = "draft"
	PostStatusPublished PostStatus = "published"
	PostStatusArchived  PostStatus = "archived"
)

func ValidPostType(t string) bool {
	switch PostType(t) {
	case PostTypePost, PostTypePage:
		return true
	}
	return false
}

func ValidPostStatus(s string) bool {
	switch PostStatus(s) {
	case PostStatusDraft, PostStatusPublished, PostStatusArchived:
		return true
	}
	return false
}

type Post struct {
	ID          int64      `json:"id"`
	Slug        string     `json:"slug"`
	Title       string     `json:"title"`
	Excerpt     *string    `json:"excerpt,omitempty"`
	Content     *string    `json:"content,omitempty"`
	CoverImage  *string    `json:"cover_image,omitempty"`
	// CoverAspect — persentase tinggi cover terhadap lebar (mis. "60" =
	// padding-bottom 60% / aspect ~16:9). "auto" = pakai ukuran natural.
	CoverAspect string     `json:"cover_aspect"`
	Type        PostType   `json:"type"`
	Status      PostStatus `json:"status"`
	Tags        *string    `json:"tags,omitempty"`
	Sequence    int        `json:"sequence"`
	PublishedAt *time.Time `json:"published_at,omitempty"`
	AuthorID    *int64     `json:"author_id,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

package auth

import (
	"image"
	"image/png"
	"io"
)

// pngEncode — helper kecil supaya totp.go tidak perlu import image/png
// langsung (menjaga kebersihan file utama).
func pngEncode(w io.Writer, img image.Image) error {
	return png.Encode(w, img)
}

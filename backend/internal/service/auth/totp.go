package auth

import (
	"bytes"
	"encoding/base64"
	"fmt"

	"github.com/pquerna/otp/totp"
)

// TotpIssuer — label yang tampil di aplikasi authenticator (Google Auth, Authy).
const TotpIssuer = "e-PPAT"

// TotpSetup — data yang dikirim ke client saat mulai setup 2FA.
type TotpSetup struct {
	Secret    string `json:"secret"`      // Base32 secret (bisa di-paste manual di app)
	OtpAuthURL string `json:"otpauth_url"` // URI otpauth://totp/... untuk QR
	QRCodePNG string `json:"qr_png_b64"`  // data URI PNG base64 — frontend tinggal <img src=...>
}

// GenerateTotpSetup — buat secret baru + QR code PNG untuk user.
// Secret disimpan via UserRepo.SetTotpSecret TAPI belum di-enable sampai
// user confirm dengan code valid (lihat VerifyTotpCode).
func GenerateTotpSetup(accountName string) (*TotpSetup, error) {
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      TotpIssuer,
		AccountName: accountName,
	})
	if err != nil {
		return nil, fmt.Errorf("generate totp: %w", err)
	}

	// Render QR ke PNG 256×256.
	var buf bytes.Buffer
	img, err := key.Image(256, 256)
	if err != nil {
		return nil, fmt.Errorf("render qr image: %w", err)
	}
	// pquerna/otp Image() returns image.Image. Encode ke PNG.
	if err := pngEncode(&buf, img); err != nil {
		return nil, fmt.Errorf("encode png: %w", err)
	}

	return &TotpSetup{
		Secret:     key.Secret(),
		OtpAuthURL: key.URL(),
		QRCodePNG:  "data:image/png;base64," + base64.StdEncoding.EncodeToString(buf.Bytes()),
	}, nil
}

// VerifyTotpCode — cek apakah 6-digit code cocok dengan secret user.
// Menerima toleransi ±1 window (30 detik sebelum/sesudah) bawaan pquerna/otp.
func VerifyTotpCode(secret, code string) bool {
	return totp.Validate(code, secret)
}

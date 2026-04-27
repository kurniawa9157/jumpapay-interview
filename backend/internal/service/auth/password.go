package auth

import "golang.org/x/crypto/bcrypt"

// Konstanta policy login lockout.
const (
	MaxLoginAttempts = 5
	LockoutDuration  = "15 minutes" // digunakan sebagai interval string di SQL
)

// HashPassword membungkus bcrypt.GenerateFromPassword dengan cost 12.
func HashPassword(plain string) (string, error) {
	h, err := bcrypt.GenerateFromPassword([]byte(plain), 12)
	if err != nil {
		return "", err
	}
	return string(h), nil
}

// VerifyPassword mengembalikan nil kalau match.
func VerifyPassword(hash, plain string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain))
}

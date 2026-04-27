package domain

import "errors"

// Error domain — ditangani oleh HTTP layer menjadi status code yang tepat.
var (
	ErrNotFound            = errors.New("data tidak ditemukan")
	ErrInvalidCredentials  = errors.New("kredensial tidak valid")
	ErrUserSuspended       = errors.New("akun Anda ditangguhkan")
	ErrUserInactive        = errors.New("akun Anda belum aktif")
	ErrAccountLocked       = errors.New("akun terkunci sementara karena percobaan login gagal")
	ErrRequires2FA         = errors.New("verifikasi dua faktor diperlukan")
	ErrInvalid2FACode      = errors.New("kode 2FA tidak valid")
	ErrInvalidToken        = errors.New("token tidak valid atau kedaluwarsa")
	ErrRefreshTokenRevoked = errors.New("refresh token sudah di-revoke")
	ErrForbidden           = errors.New("Anda tidak memiliki izin untuk aksi ini")
	ErrRateLimited         = errors.New("terlalu banyak permintaan, coba lagi nanti")
	ErrInvalidInput        = errors.New("input tidak valid")
)

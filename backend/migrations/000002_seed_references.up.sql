-- Seed data references (lookup/enum tetap, idempotent via UNIQUE(code))

INSERT INTO tr_data_references (group_code, code, label, "order") VALUES
  ('CONTACT_TYPE', 'CONTACT_EMAIL',  'Email',     1),
  ('CONTACT_TYPE', 'CONTACT_PHONE',  'Telepon',   2),
  ('CONTACT_TYPE', 'CONTACT_GOOGLE', 'Google',    3),

  ('PASSWORD_TYPE', 'PW_MAIN',      'Password utama',   1),
  ('PASSWORD_TYPE', 'PW_OTP_LOGIN', 'OTP login',        2),
  ('PASSWORD_TYPE', 'PW_OTP_RESET', 'OTP reset',        3),

  ('USER_STATUS', 'US_ACTIVE',     'Aktif',        1),
  ('USER_STATUS', 'US_SUSPENDED',  'Ditangguhkan', 2),
  ('USER_STATUS', 'US_INACTIVE',   'Non-aktif',    3),

  ('ACTIVITY_CODE', 'ACT_LOGIN',           'Login',              1),
  ('ACTIVITY_CODE', 'ACT_LOGOUT',          'Logout',             2),
  ('ACTIVITY_CODE', 'ACT_LOGIN_FAILED',    'Login gagal',        3),
  ('ACTIVITY_CODE', 'ACT_TOKEN_REFRESH',   'Refresh token',      4),
  ('ACTIVITY_CODE', 'ACT_PASSWORD_CHANGE', 'Ganti kata sandi',   5),
  ('ACTIVITY_CODE', 'ACT_2FA_ENABLED',     '2FA diaktifkan',     6),
  ('ACTIVITY_CODE', 'ACT_2FA_DISABLED',    '2FA dinonaktifkan',  7)
ON CONFLICT (code) DO NOTHING;

-- Seed role dasar
INSERT INTO tr_roles (code, name, level, is_active) VALUES
  ('ROLE_ADMIN', 'Administrator', 1, TRUE),
  ('ROLE_USER',  'User',          2, TRUE)
ON CONFLICT (code) DO NOTHING;

-- Seed permission default untuk ROLE_ADMIN — full access pada module foundation.
-- Tambah module sesuai kebutuhan project setelah clone template.
INSERT INTO tr_permissions (role_id, module_code, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.module_code, TRUE, TRUE, TRUE, TRUE
FROM tr_roles r
CROSS JOIN (VALUES
  ('USER_MGMT'),
  ('ROLE_MGMT'),
  ('PERMISSION_MGMT'),
  ('SYSTEM_SETTINGS'),
  ('AUDIT_LOG')
) AS m(module_code)
WHERE r.code = 'ROLE_ADMIN'
ON CONFLICT (role_id, module_code) DO NOTHING;

-- Seed system settings awal — ganti app_name & tagline sesuai project.
INSERT INTO tr_system_settings (group_code, key, value) VALUES
  ('general', 'app_name',        'App Template'),
  ('general', 'app_tagline',     'Foundation untuk project Go + React + IDDS'),
  ('general', 'timezone',        'Asia/Jakarta'),
  ('maintenance', 'maintenance_mode',    '0'),
  ('maintenance', 'maintenance_message', 'Sistem sedang dalam pemeliharaan. Kami akan kembali segera.')
ON CONFLICT (key) DO NOTHING;

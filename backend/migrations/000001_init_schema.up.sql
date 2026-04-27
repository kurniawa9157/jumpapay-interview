-- Skema inti: auth, RBAC, user meta, audit log, lookup, system settings, JWT refresh tokens

CREATE TABLE tr_roles (
  id          BIGSERIAL PRIMARY KEY,
  code        VARCHAR(20) UNIQUE NOT NULL,
  name        VARCHAR(100) NOT NULL,
  parent_id   BIGINT REFERENCES tr_roles(id) ON DELETE SET NULL,
  level       INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id             BIGSERIAL PRIMARY KEY,
  code           VARCHAR(50) UNIQUE NOT NULL,
  first_name     VARCHAR(100) NOT NULL,
  mid_name       VARCHAR(100),
  last_name      VARCHAR(100),
  is_admin       BOOLEAN NOT NULL DEFAULT FALSE,
  role_id        BIGINT REFERENCES tr_roles(id) ON DELETE SET NULL,
  status_code    VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  google2fa_secret        VARCHAR(255),
  google2fa_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
  google2fa_confirmed_at  TIMESTAMPTZ,
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by     BIGINT,
  updated_by     BIGINT
);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_status ON users(status_code);

CREATE TABLE tt_contacts (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type_code           VARCHAR(30) NOT NULL,
  value               VARCHAR(255) NOT NULL,
  is_primary          BOOLEAN NOT NULL DEFAULT FALSE,
  can_login           BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified         BOOLEAN NOT NULL DEFAULT FALSE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  verify_token        VARCHAR(255),
  oauth_token         TEXT,
  oauth_refresh_token TEXT,
  oauth_expires_at    TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (type_code, value)
);
CREATE INDEX idx_contacts_login ON tt_contacts(value, can_login, is_active);
CREATE INDEX idx_contacts_user ON tt_contacts(user_id);

CREATE TABLE tt_passwords (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type_code       VARCHAR(30) NOT NULL,
  password        VARCHAR(255) NOT NULL,
  plain_hint      VARCHAR(10),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  expired_at      TIMESTAMPTZ,
  failed_attempts SMALLINT NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  last_used_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_passwords_active ON tt_passwords(user_id, type_code, is_active);

CREATE TABLE tr_meta_users (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  bio           TEXT,
  address       TEXT,
  city_name     VARCHAR(100),
  province_name VARCHAR(100),
  lat           DECIMAL(10, 8),
  lng           DECIMAL(11, 8),
  timezone      VARCHAR(50) DEFAULT 'Asia/Jakarta',
  locale        VARCHAR(10) DEFAULT 'id',
  theme         VARCHAR(20),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE th_user_activity (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT REFERENCES users(id) ON DELETE SET NULL,
  activity_code    VARCHAR(50) NOT NULL,
  description      TEXT,
  ip_address       VARCHAR(45),
  user_agent       TEXT,
  device_type      VARCHAR(20),
  os               VARCHAR(50),
  browser          VARCHAR(50),
  location_country VARCHAR(100),
  location_city    VARCHAR(100),
  session_id       VARCHAR(100),
  is_success       BOOLEAN NOT NULL DEFAULT TRUE,
  metadata         JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_activity_user ON th_user_activity(user_id, activity_code);
CREATE INDEX idx_activity_time ON th_user_activity(created_at DESC);

CREATE TABLE tr_permissions (
  id          BIGSERIAL PRIMARY KEY,
  role_id     BIGINT NOT NULL REFERENCES tr_roles(id) ON DELETE CASCADE,
  module_code VARCHAR(50) NOT NULL,
  can_view    BOOLEAN NOT NULL DEFAULT FALSE,
  can_create  BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit    BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (role_id, module_code)
);

CREATE TABLE tr_data_references (
  id         BIGSERIAL PRIMARY KEY,
  parent_id  BIGINT REFERENCES tr_data_references(id) ON DELETE SET NULL,
  group_code VARCHAR(50) NOT NULL,
  code       VARCHAR(50) NOT NULL,
  label      VARCHAR(150) NOT NULL,
  "order"    INTEGER NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (code)
);
CREATE INDEX idx_dataref_group ON tr_data_references(group_code);

CREATE TABLE tr_system_settings (
  id         BIGSERIAL PRIMARY KEY,
  group_code VARCHAR(50) NOT NULL,
  key        VARCHAR(100) UNIQUE NOT NULL,
  value      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tt_refresh_tokens (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) UNIQUE NOT NULL,
  device_info VARCHAR(255),
  ip_address  VARCHAR(45),
  issued_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ
);
CREATE INDEX idx_refresh_user_active ON tt_refresh_tokens(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_refresh_expires ON tt_refresh_tokens(expires_at);

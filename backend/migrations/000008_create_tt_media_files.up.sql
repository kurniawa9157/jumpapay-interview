-- Media files — registry file yang di-upload via /admin/media/upload.
-- File fisik disimpan di UPLOAD_DIR (default ./uploads), filename = uuid-prefixed.

CREATE TABLE tt_media_files (
  id              BIGSERIAL PRIMARY KEY,
  filename        VARCHAR(200) NOT NULL UNIQUE,
  original_name   VARCHAR(255),
  mime_type       VARCHAR(100) NOT NULL,
  size_bytes      BIGINT NOT NULL,
  uploaded_by_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_media_uploaded_by ON tt_media_files(uploaded_by_id);

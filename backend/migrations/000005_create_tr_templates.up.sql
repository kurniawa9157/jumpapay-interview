-- Templates — master tabel untuk semua jenis template/master data CMS.
-- Pakai field type_template sebagai discriminator:
--   'page'   = layout halaman (key='layout' di tr_template_values berisi blocks JSON)
--   'slider' = master slider (items disimpan sbg row di tr_template_values, key='item_*')
--   'menu'   = master menu navbar
--   'footer' = master footer widget

CREATE TABLE tr_templates (
  id            BIGSERIAL PRIMARY KEY,
  code          VARCHAR(100) UNIQUE NOT NULL,
  name          VARCHAR(200) NOT NULL,
  type_template VARCHAR(30) NOT NULL DEFAULT 'page',
  slug          VARCHAR(150),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_id BIGINT REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_templates_type ON tr_templates(type_template) WHERE is_active = TRUE;
CREATE INDEX idx_templates_slug ON tr_templates(slug) WHERE type_template = 'page';

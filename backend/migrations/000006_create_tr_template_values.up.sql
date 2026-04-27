-- Template values — EAV storage untuk config template.
-- Pattern:
--   - Page layout: 1 row dengan key='layout', value=JSON array of blocks
--   - Slider/Menu/Footer items: N row dengan key='item_1','item_2',...
--     value=JSON object per item, "order" field untuk sort
--   - Meta fields: key='meta_title', 'meta_description', dll

CREATE TABLE tr_template_values (
  id          BIGSERIAL PRIMARY KEY,
  template_id BIGINT NOT NULL REFERENCES tr_templates(id) ON DELETE CASCADE,
  key         VARCHAR(100) NOT NULL,
  value       TEXT,
  "order"     INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (template_id, key)
);
CREATE INDEX idx_template_values_tpl ON tr_template_values(template_id);

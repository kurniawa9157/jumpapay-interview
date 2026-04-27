-- Seed default homepage template + grant permission CONTENT_MGMT ke ROLE_ADMIN.

INSERT INTO tr_templates (code, name, type_template, slug, is_active)
VALUES ('homepage', 'Homepage', 'page', '/', TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO tr_template_values (template_id, key, value)
SELECT t.id, 'layout', '[]'
FROM tr_templates t
WHERE t.code = 'homepage'
ON CONFLICT (template_id, key) DO NOTHING;

-- Grant CONTENT_MGMT (full CRUD) ke ROLE_ADMIN.
INSERT INTO tr_permissions (role_id, module_code, can_view, can_create, can_edit, can_delete)
SELECT r.id, 'CONTENT_MGMT', TRUE, TRUE, TRUE, TRUE
FROM tr_roles r
WHERE r.code = 'ROLE_ADMIN'
ON CONFLICT (role_id, module_code) DO NOTHING;

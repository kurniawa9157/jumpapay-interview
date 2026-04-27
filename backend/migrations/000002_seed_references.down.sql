DELETE FROM tr_system_settings WHERE key IN ('app_name', 'app_tagline', 'timezone', 'maintenance_mode', 'maintenance_message');
DELETE FROM tr_permissions WHERE role_id IN (SELECT id FROM tr_roles WHERE code = 'ROLE_ADMIN');
DELETE FROM tr_roles WHERE code IN ('ROLE_ADMIN', 'ROLE_USER');
DELETE FROM tr_data_references WHERE group_code IN ('CONTACT_TYPE', 'PASSWORD_TYPE', 'USER_STATUS', 'ACTIVITY_CODE');

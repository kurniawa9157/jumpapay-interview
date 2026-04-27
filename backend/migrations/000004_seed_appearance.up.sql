-- Default brand theme untuk tampilan. 'atrbpn' = custom theme palet ATR/BPN
-- yang di-resolve di frontend via setCustomTheme(). Nilai lain harus match
-- BrandName IDDS (inagov, inaku, bgn, bkn, lan, panrb, default).
INSERT INTO tr_system_settings (group_code, key, value) VALUES
  ('appearance', 'brand_theme', 'atrbpn')
ON CONFLICT (key) DO NOTHING;

INSERT INTO tr_system_settings (group_code, key, value) VALUES
  ('appearance', 'appearance_template', '{
    "version": 1,
    "mode": "preset",
    "preset_brand": "atrbpn",
    "custom": null,
    "assets": {
      "logo_url": "",
      "logo_mark_url": "",
      "favicon_url": "",
      "login_background_url": "",
      "public_header_logo_url": ""
    },
    "components": {
      "density": "comfortable",
      "radius": "md",
      "button": {
        "shape": "rounded",
        "default_hierarchy": "primary"
      },
      "form": {
        "size": "md",
        "label_layout": "top",
        "field_radius": "md"
      },
      "tabs": {
        "variant": "underline",
        "size": "md",
        "use_brand_color": true,
        "full_width": false
      },
      "table": {
        "density": "comfortable",
        "zebra": true,
        "bordered": false,
        "sticky_header": true
      },
      "card": {
        "variant": "bordered",
        "shadow": "none",
        "radius": "md"
      },
      "modal": {
        "size": "md",
        "radius": "lg",
        "header_style": "plain"
      },
      "sidebar": {
        "variant": "brand_dark",
        "density": "comfortable"
      },
      "login": {
        "layout": "center",
        "card_variant": "solid",
        "background_overlay": "light",
        "background_fit": "cover",
        "background_position": "center",
        "card_background": "#ffffff",
        "button_background": "",
        "button_text": "#ffffff",
        "button_label": "Masuk",
        "show_logo": true,
        "eyebrow": "Portal aplikasi",
        "title": "Masuk",
        "description": "Gunakan akun yang telah diaktivasi oleh administrator. Hubungi admin kalau belum punya akses."
      }
    }
  }')
ON CONFLICT (key) DO NOTHING;

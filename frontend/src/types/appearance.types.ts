import type { JumpaPayBrand } from "../theme";

export type AppearanceMode = "preset" | "custom";
export type AppearanceDensity = "compact" | "comfortable" | "spacious";
export type AppearanceRadius = "none" | "sm" | "md" | "lg" | "pill";

export interface AppearanceTemplate {
  version: 1;
  mode: AppearanceMode;
  preset_brand: JumpaPayBrand;
  custom: AppearanceCustomTheme | null;
  assets: AppearanceAssets;
  components: AppearanceComponentSettings;
}

export interface AppearanceCustomTheme {
  name: string;
  colors: AppearanceColors;
}

export interface AppearanceColors {
  brand_primary: string;
  brand_hover: string;
  content_primary: string;
  content_secondary: string;
  content_tertiary: string;
  background_primary: string;
  background_secondary: string;
  background_tertiary: string;
  stroke_primary: string;
  stroke_secondary: string;
}

export interface AppearanceAssets {
  logo_url: string;
  logo_mark_url: string;
  favicon_url: string;
  login_background_url: string;
  public_header_logo_url: string;
}

export interface AppearanceComponentSettings {
  density: AppearanceDensity;
  radius: AppearanceRadius;
  button: {
    shape: "square" | "rounded" | "pill";
    default_hierarchy: "primary" | "secondary" | "tertiary";
  };
  form: {
    size: "sm" | "md" | "lg";
    label_layout: "top" | "left";
    field_radius: AppearanceRadius;
  };
  tabs: {
    variant: "underline" | "pills" | "boxed";
    size: "sm" | "md" | "lg";
    use_brand_color: boolean;
    full_width: boolean;
  };
  table: {
    density: AppearanceDensity;
    zebra: boolean;
    bordered: boolean;
    sticky_header: boolean;
  };
  card: {
    variant: "flat" | "bordered" | "elevated";
    shadow: "none" | "soft" | "strong";
    radius: Exclude<AppearanceRadius, "pill">;
  };
  modal: {
    size: "sm" | "md" | "lg" | "xl";
    radius: Exclude<AppearanceRadius, "pill">;
    header_style: "plain" | "brand";
  };
  sidebar: {
    variant: "brand_dark" | "brand_light" | "neutral";
    density: "compact" | "comfortable";
  };
  login: {
    layout: "center" | "split_left" | "split_right";
    card_variant: "solid" | "glass";
    background_overlay: "light" | "dark" | "none";
    background_fit: "cover" | "contain" | "repeat";
    background_position: "center" | "top" | "bottom";
    card_background: string;
    button_background: string;
    button_text: string;
    button_label: string;
    show_logo: boolean;
    eyebrow: string;
    title: string;
    description: string;
  };
}

export const DEFAULT_APPEARANCE_TEMPLATE: AppearanceTemplate = {
  version: 1,
  mode: "preset",
  preset_brand: "atrbpn",
  custom: null,
  assets: {
    logo_url: "",
    logo_mark_url: "",
    favicon_url: "",
    login_background_url: "",
    public_header_logo_url: "",
  },
  components: {
    density: "comfortable",
    radius: "md",
    button: {
      shape: "rounded",
      default_hierarchy: "primary",
    },
    form: {
      size: "md",
      label_layout: "top",
      field_radius: "md",
    },
    tabs: {
      variant: "underline",
      size: "md",
      use_brand_color: true,
      full_width: false,
    },
    table: {
      density: "comfortable",
      zebra: true,
      bordered: false,
      sticky_header: true,
    },
    card: {
      variant: "bordered",
      shadow: "none",
      radius: "md",
    },
    modal: {
      size: "md",
      radius: "lg",
      header_style: "plain",
    },
    sidebar: {
      variant: "brand_dark",
      density: "comfortable",
    },
    login: {
      layout: "center",
      card_variant: "solid",
      background_overlay: "light",
      background_fit: "cover",
      background_position: "center",
      card_background: "#ffffff",
      button_background: "",
      button_text: "#ffffff",
      button_label: "Masuk",
      show_logo: true,
      eyebrow: "Portal aplikasi",
      title: "Masuk",
      description:
        "Gunakan akun yang telah diaktivasi oleh administrator. Hubungi admin kalau belum punya akses.",
    },
  },
};

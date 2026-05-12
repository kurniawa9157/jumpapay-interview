package system

import (
	"context"
	"encoding/json"
	"errors"
	"regexp"
	"strings"

	"github.com/kurniawa9157/template-base/internal/domain"
	"github.com/kurniawa9157/template-base/internal/repository/postgres"
)

const keyAppearanceTemplate = "appearance_template"

var hexColorRe = regexp.MustCompile(`^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$`)

type AppearanceTemplate struct {
	Version     int                         `json:"version"`
	Mode        string                      `json:"mode"`
	PresetBrand string                      `json:"preset_brand"`
	Custom      *AppearanceCustomTheme      `json:"custom"`
	Assets      AppearanceAssets            `json:"assets"`
	Components  AppearanceComponentSettings `json:"components"`
}

type AppearanceCustomTheme struct {
	Name   string           `json:"name"`
	Colors AppearanceColors `json:"colors"`
}

type AppearanceColors struct {
	BrandPrimary        string `json:"brand_primary"`
	BrandHover          string `json:"brand_hover"`
	ContentPrimary      string `json:"content_primary"`
	ContentSecondary    string `json:"content_secondary"`
	ContentTertiary     string `json:"content_tertiary"`
	BackgroundPrimary   string `json:"background_primary"`
	BackgroundSecondary string `json:"background_secondary"`
	BackgroundTertiary  string `json:"background_tertiary"`
	StrokePrimary       string `json:"stroke_primary"`
	StrokeSecondary     string `json:"stroke_secondary"`
}

type AppearanceAssets struct {
	LogoURL             string `json:"logo_url"`
	LogoMarkURL         string `json:"logo_mark_url"`
	FaviconURL          string `json:"favicon_url"`
	LoginBackgroundURL  string `json:"login_background_url"`
	PublicHeaderLogoURL string `json:"public_header_logo_url"`
}

type AppearanceComponentSettings struct {
	Density string                    `json:"density"`
	Radius  string                    `json:"radius"`
	Button  AppearanceButtonSettings  `json:"button"`
	Form    AppearanceFormSettings    `json:"form"`
	Tabs    AppearanceTabsSettings    `json:"tabs"`
	Table   AppearanceTableSettings   `json:"table"`
	Card    AppearanceCardSettings    `json:"card"`
	Modal   AppearanceModalSettings   `json:"modal"`
	Sidebar AppearanceSidebarSettings `json:"sidebar"`
	Login   AppearanceLoginSettings   `json:"login"`
}

type AppearanceButtonSettings struct {
	Shape            string `json:"shape"`
	DefaultHierarchy string `json:"default_hierarchy"`
}

type AppearanceFormSettings struct {
	Size        string `json:"size"`
	LabelLayout string `json:"label_layout"`
	FieldRadius string `json:"field_radius"`
}

type AppearanceTabsSettings struct {
	Variant       string `json:"variant"`
	Size          string `json:"size"`
	UseBrandColor bool   `json:"use_brand_color"`
	FullWidth     bool   `json:"full_width"`
}

type AppearanceTableSettings struct {
	Density      string `json:"density"`
	Zebra        bool   `json:"zebra"`
	Bordered     bool   `json:"bordered"`
	StickyHeader bool   `json:"sticky_header"`
}

type AppearanceCardSettings struct {
	Variant string `json:"variant"`
	Shadow  string `json:"shadow"`
	Radius  string `json:"radius"`
}

type AppearanceModalSettings struct {
	Size        string `json:"size"`
	Radius      string `json:"radius"`
	HeaderStyle string `json:"header_style"`
}

type AppearanceSidebarSettings struct {
	Variant string `json:"variant"`
	Density string `json:"density"`
}

type AppearanceLoginSettings struct {
	Layout             string `json:"layout"`
	CardVariant        string `json:"card_variant"`
	BackgroundOverlay  string `json:"background_overlay"`
	BackgroundFit      string `json:"background_fit"`
	BackgroundPosition string `json:"background_position"`
	CardBackground     string `json:"card_background"`
	ButtonBackground   string `json:"button_background"`
	ButtonText         string `json:"button_text"`
	ButtonLabel        string `json:"button_label"`
	ShowLogo           bool   `json:"show_logo"`
	Eyebrow            string `json:"eyebrow"`
	Title              string `json:"title"`
	Description        string `json:"description"`
}

func DefaultAppearanceTemplate() AppearanceTemplate {
	return AppearanceTemplate{
		Version:     1,
		Mode:        "preset",
		PresetBrand: defaultBrand,
		Assets: AppearanceAssets{
			LogoURL:             "",
			LogoMarkURL:         "",
			FaviconURL:          "",
			LoginBackgroundURL:  "",
			PublicHeaderLogoURL: "",
		},
		Components: AppearanceComponentSettings{
			Density: "comfortable",
			Radius:  "md",
			Button: AppearanceButtonSettings{
				Shape:            "rounded",
				DefaultHierarchy: "primary",
			},
			Form: AppearanceFormSettings{
				Size:        "md",
				LabelLayout: "top",
				FieldRadius: "md",
			},
			Tabs: AppearanceTabsSettings{
				Variant:       "underline",
				Size:          "md",
				UseBrandColor: true,
				FullWidth:     false,
			},
			Table: AppearanceTableSettings{
				Density:      "comfortable",
				Zebra:        true,
				Bordered:     false,
				StickyHeader: true,
			},
			Card: AppearanceCardSettings{
				Variant: "bordered",
				Shadow:  "none",
				Radius:  "md",
			},
			Modal: AppearanceModalSettings{
				Size:        "md",
				Radius:      "lg",
				HeaderStyle: "plain",
			},
			Sidebar: AppearanceSidebarSettings{
				Variant: "brand_dark",
				Density: "comfortable",
			},
			Login: AppearanceLoginSettings{
				Layout:             "center",
				CardVariant:        "solid",
				BackgroundOverlay:  "light",
				BackgroundFit:      "cover",
				BackgroundPosition: "center",
				CardBackground:     "#ffffff",
				ButtonBackground:   "",
				ButtonText:         "#ffffff",
				ButtonLabel:        "Masuk",
				ShowLogo:           true,
				Eyebrow:            "Portal aplikasi",
				Title:              "Masuk",
				Description:        "Gunakan akun yang telah diaktivasi oleh administrator. Hubungi admin kalau belum punya akses.",
			},
		},
	}
}

func (s *Service) GetAppearanceTemplate(ctx context.Context) (AppearanceTemplate, error) {
	v, err := s.repo.Get(ctx, keyAppearanceTemplate)
	if errors.Is(err, domain.ErrNotFound) {
		tpl := DefaultAppearanceTemplate()
		brand, brandErr := s.GetBrandTheme(ctx)
		if brandErr == nil {
			tpl.PresetBrand = brand
		}
		return tpl, nil
	}
	if err != nil {
		return AppearanceTemplate{}, err
	}

	var tpl AppearanceTemplate
	if err := json.Unmarshal([]byte(v), &tpl); err != nil {
		tpl = DefaultAppearanceTemplate()
		brand, brandErr := s.GetBrandTheme(ctx)
		if brandErr == nil {
			tpl.PresetBrand = brand
		}
		return tpl, nil
	}
	if err := validateAppearanceTemplate(tpl); err != nil {
		return DefaultAppearanceTemplate(), nil
	}
	return tpl, nil
}

func (s *Service) SetAppearanceTemplate(ctx context.Context, tpl AppearanceTemplate) error {
	tpl = normalizeAppearanceTemplate(tpl)
	if err := validateAppearanceTemplate(tpl); err != nil {
		return err
	}
	payload, err := json.Marshal(tpl)
	if err != nil {
		return err
	}
	return s.repo.SetMany(ctx, []postgres.SettingRow{
		{GroupCode: groupAppearance, Key: keyAppearanceTemplate, Value: string(payload)},
		{GroupCode: groupAppearance, Key: keyBrandTheme, Value: tpl.PresetBrand},
	})
}

func normalizeAppearanceTemplate(tpl AppearanceTemplate) AppearanceTemplate {
	def := DefaultAppearanceTemplate()
	if tpl.Version == 0 {
		tpl.Version = def.Version
	}
	if tpl.Mode == "" {
		tpl.Mode = def.Mode
	}
	if tpl.PresetBrand == "" {
		tpl.PresetBrand = def.PresetBrand
	}
	if tpl.Components.Density == "" {
		tpl.Components.Density = def.Components.Density
	}
	if tpl.Components.Radius == "" {
		tpl.Components.Radius = def.Components.Radius
	}
	if tpl.Components.Button.Shape == "" {
		tpl.Components.Button.Shape = def.Components.Button.Shape
	}
	if tpl.Components.Button.DefaultHierarchy == "" {
		tpl.Components.Button.DefaultHierarchy = def.Components.Button.DefaultHierarchy
	}
	if tpl.Components.Form.Size == "" {
		tpl.Components.Form.Size = def.Components.Form.Size
	}
	if tpl.Components.Form.LabelLayout == "" {
		tpl.Components.Form.LabelLayout = def.Components.Form.LabelLayout
	}
	if tpl.Components.Form.FieldRadius == "" {
		tpl.Components.Form.FieldRadius = def.Components.Form.FieldRadius
	}
	if tpl.Components.Tabs.Variant == "" {
		tpl.Components.Tabs.Variant = def.Components.Tabs.Variant
	}
	if tpl.Components.Tabs.Size == "" {
		tpl.Components.Tabs.Size = def.Components.Tabs.Size
	}
	if tpl.Components.Table.Density == "" {
		tpl.Components.Table.Density = def.Components.Table.Density
	}
	if tpl.Components.Card.Variant == "" {
		tpl.Components.Card.Variant = def.Components.Card.Variant
	}
	if tpl.Components.Card.Shadow == "" {
		tpl.Components.Card.Shadow = def.Components.Card.Shadow
	}
	if tpl.Components.Card.Radius == "" {
		tpl.Components.Card.Radius = def.Components.Card.Radius
	}
	if tpl.Components.Modal.Size == "" {
		tpl.Components.Modal.Size = def.Components.Modal.Size
	}
	if tpl.Components.Modal.Radius == "" {
		tpl.Components.Modal.Radius = def.Components.Modal.Radius
	}
	if tpl.Components.Modal.HeaderStyle == "" {
		tpl.Components.Modal.HeaderStyle = def.Components.Modal.HeaderStyle
	}
	if tpl.Components.Sidebar.Variant == "" {
		tpl.Components.Sidebar.Variant = def.Components.Sidebar.Variant
	}
	if tpl.Components.Sidebar.Density == "" {
		tpl.Components.Sidebar.Density = def.Components.Sidebar.Density
	}
	if tpl.Components.Login.Layout == "" &&
		tpl.Components.Login.CardVariant == "" &&
		tpl.Components.Login.BackgroundOverlay == "" &&
		tpl.Components.Login.BackgroundFit == "" &&
		tpl.Components.Login.BackgroundPosition == "" &&
		tpl.Components.Login.CardBackground == "" &&
		tpl.Components.Login.ButtonBackground == "" &&
		tpl.Components.Login.ButtonText == "" &&
		tpl.Components.Login.ButtonLabel == "" &&
		tpl.Components.Login.Eyebrow == "" &&
		tpl.Components.Login.Title == "" &&
		tpl.Components.Login.Description == "" {
		tpl.Components.Login = def.Components.Login
		return tpl
	}
	if tpl.Components.Login.Layout == "" {
		tpl.Components.Login.Layout = def.Components.Login.Layout
	}
	if tpl.Components.Login.CardVariant == "" {
		tpl.Components.Login.CardVariant = def.Components.Login.CardVariant
	}
	if tpl.Components.Login.BackgroundOverlay == "" {
		tpl.Components.Login.BackgroundOverlay = def.Components.Login.BackgroundOverlay
	}
	if tpl.Components.Login.BackgroundFit == "" {
		tpl.Components.Login.BackgroundFit = def.Components.Login.BackgroundFit
	}
	if tpl.Components.Login.BackgroundPosition == "" {
		tpl.Components.Login.BackgroundPosition = def.Components.Login.BackgroundPosition
	}
	if tpl.Components.Login.CardBackground == "" {
		tpl.Components.Login.CardBackground = def.Components.Login.CardBackground
	}
	if tpl.Components.Login.ButtonText == "" {
		tpl.Components.Login.ButtonText = def.Components.Login.ButtonText
	}
	if tpl.Components.Login.ButtonLabel == "" {
		tpl.Components.Login.ButtonLabel = def.Components.Login.ButtonLabel
	}
	if tpl.Components.Login.Eyebrow == "" {
		tpl.Components.Login.Eyebrow = def.Components.Login.Eyebrow
	}
	if tpl.Components.Login.Title == "" {
		tpl.Components.Login.Title = def.Components.Login.Title
	}
	if tpl.Components.Login.Description == "" {
		tpl.Components.Login.Description = def.Components.Login.Description
	}
	return tpl
}

func validateAppearanceTemplate(tpl AppearanceTemplate) error {
	if tpl.Version != 1 {
		return domain.ErrInvalidInput
	}
	if tpl.Mode != "preset" && tpl.Mode != "custom" {
		return domain.ErrInvalidInput
	}
	if _, ok := ValidBrands[tpl.PresetBrand]; !ok {
		return domain.ErrInvalidInput
	}
	if err := validateAssets(tpl.Assets); err != nil {
		return err
	}
	if tpl.Mode == "custom" {
		if tpl.Custom == nil {
			return domain.ErrInvalidInput
		}
		if err := validateColors(tpl.Custom.Colors); err != nil {
			return err
		}
	}
	return validateComponentSettings(tpl.Components)
}

func validateColors(c AppearanceColors) error {
	required := []string{
		c.BrandPrimary, c.BrandHover, c.ContentPrimary, c.ContentSecondary,
		c.ContentTertiary, c.BackgroundPrimary, c.BackgroundSecondary,
		c.BackgroundTertiary, c.StrokePrimary, c.StrokeSecondary,
	}
	for _, v := range required {
		if !hexColorRe.MatchString(v) {
			return domain.ErrInvalidInput
		}
	}
	return nil
}

func validateAssets(a AppearanceAssets) error {
	values := []string{
		a.LogoURL, a.LogoMarkURL, a.FaviconURL, a.LoginBackgroundURL, a.PublicHeaderLogoURL,
	}
	for _, v := range values {
		if v == "" {
			continue
		}
		if strings.HasPrefix(v, "/uploads/") ||
			strings.HasPrefix(v, "http://") ||
			strings.HasPrefix(v, "https://") {
			continue
		}
		return domain.ErrInvalidInput
	}
	return nil
}

func validateComponentSettings(c AppearanceComponentSettings) error {
	if !oneOf(c.Density, "compact", "comfortable", "spacious") ||
		!oneOf(c.Radius, "none", "sm", "md", "lg", "pill") ||
		!oneOf(c.Button.Shape, "square", "rounded", "pill") ||
		!oneOf(c.Button.DefaultHierarchy, "primary", "secondary", "tertiary") ||
		!oneOf(c.Form.Size, "sm", "md", "lg") ||
		!oneOf(c.Form.LabelLayout, "top", "left") ||
		!oneOf(c.Form.FieldRadius, "none", "sm", "md", "lg", "pill") ||
		!oneOf(c.Tabs.Variant, "underline", "pills", "boxed") ||
		!oneOf(c.Tabs.Size, "sm", "md", "lg") ||
		!oneOf(c.Table.Density, "compact", "comfortable", "spacious") ||
		!oneOf(c.Card.Variant, "flat", "bordered", "elevated") ||
		!oneOf(c.Card.Shadow, "none", "soft", "strong") ||
		!oneOf(c.Card.Radius, "none", "sm", "md", "lg") ||
		!oneOf(c.Modal.Size, "sm", "md", "lg", "xl") ||
		!oneOf(c.Modal.Radius, "none", "sm", "md", "lg") ||
		!oneOf(c.Modal.HeaderStyle, "plain", "brand") ||
		!oneOf(c.Sidebar.Variant, "brand_dark", "brand_light", "neutral") ||
		!oneOf(c.Sidebar.Density, "compact", "comfortable") ||
		!oneOf(c.Login.Layout, "center", "split_left", "split_right") ||
		!oneOf(c.Login.CardVariant, "solid", "glass") ||
		!oneOf(c.Login.BackgroundOverlay, "light", "dark", "none") ||
		!oneOf(c.Login.BackgroundFit, "cover", "contain", "repeat") ||
		!oneOf(c.Login.BackgroundPosition, "center", "top", "bottom") {
		return domain.ErrInvalidInput
	}
	if !hexColorRe.MatchString(c.Login.CardBackground) ||
		(c.Login.ButtonBackground != "" && !hexColorRe.MatchString(c.Login.ButtonBackground)) ||
		!hexColorRe.MatchString(c.Login.ButtonText) {
		return domain.ErrInvalidInput
	}
	if len(c.Login.ButtonLabel) > 40 ||
		len(c.Login.Eyebrow) > 80 ||
		len(c.Login.Title) > 80 ||
		len(c.Login.Description) > 240 {
		return domain.ErrInvalidInput
	}
	return nil
}

func oneOf(v string, allowed ...string) bool {
	for _, a := range allowed {
		if v == a {
			return true
		}
	}
	return false
}

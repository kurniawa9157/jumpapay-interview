import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@idds/react";
import { ApiError, adminListMedia, adminUploadMedia, getSystemAppearance, updateSystemAppearance } from "../../api";
import { Icon } from "../../components/Icon";
import { applyAppearanceTemplate, AVAILABLE_BRANDS, getPresetAppearanceColors, type EppatBrand } from "../../theme";
import type { MediaFile } from "../../types/cms";
import {
  DEFAULT_APPEARANCE_TEMPLATE,
  type AppearanceColors,
  type AppearanceComponentSettings,
  type AppearanceTemplate,
} from "../../types/appearance.types";

const DEFAULT_CUSTOM_COLORS: AppearanceColors = {
  brand_primary: "#0f1e3d",
  brand_hover: "#10244f",
  content_primary: "#0f1e3d",
  content_secondary: "#56657f",
  content_tertiary: "#4b5871",
  background_primary: "#fffdfa",
  background_secondary: "#f6f2e9",
  background_tertiary: "#fdfbf5",
  stroke_primary: "#ded6c7",
  stroke_secondary: "#d9d1bf",
};

const colorFields: Array<[keyof AppearanceColors, string]> = [
  ["brand_primary", "Primary"],
  ["brand_hover", "Hover"],
  ["content_primary", "Teks utama"],
  ["content_secondary", "Teks sekunder"],
  ["content_tertiary", "Teks tersier"],
  ["background_primary", "Background"],
  ["background_secondary", "Background soft"],
  ["background_tertiary", "Background panel"],
  ["stroke_primary", "Border"],
  ["stroke_secondary", "Border kuat"],
];

const assetFields: Array<[keyof AppearanceTemplate["assets"], string, string]> = [
  ["logo_url", "Logo utama", "/uploads/logo.png"],
  ["logo_mark_url", "Logo kecil/sidebar", "/uploads/logo-mark.png"],
  ["favicon_url", "Favicon", "/uploads/favicon.png"],
  ["login_background_url", "Gambar login", "/uploads/login-bg.jpg"],
  ["public_header_logo_url", "Logo public header", "/uploads/public-logo.png"],
];

type ComponentSettingsTab = "global" | "button" | "form" | "tabs" | "table" | "card" | "modal" | "sidebar" | "login";

const componentTabs: Array<{ id: ComponentSettingsTab; label: string }> = [
  { id: "global", label: "Global" },
  { id: "button", label: "Button" },
  { id: "form", label: "Form" },
  { id: "tabs", label: "Tabs" },
  { id: "table", label: "Table" },
  { id: "card", label: "Card" },
  { id: "modal", label: "Modal" },
  { id: "sidebar", label: "Sidebar" },
  { id: "login", label: "Login" },
];

const isImage = (mime: string): boolean => mime.startsWith("image/");

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

function withCustom(template: AppearanceTemplate, colors?: AppearanceColors): AppearanceTemplate {
  return {
    ...template,
    mode: "custom",
    custom: {
      name: template.custom?.name || "Custom Template",
      colors: colors || template.custom?.colors || DEFAULT_CUSTOM_COLORS,
    },
  };
}

function withPresetColors(template: AppearanceTemplate, brand: EppatBrand): AppearanceTemplate {
  return {
    ...template,
    preset_brand: brand,
    custom: {
      name: `${AVAILABLE_BRANDS.find((b) => b.value === brand)?.label || brand} Custom`,
      colors: getPresetAppearanceColors(brand),
    },
  };
}

function normalizeAppearanceForEditor(template: AppearanceTemplate): AppearanceTemplate {
  if (template.mode !== "preset" || template.custom) return template;
  return withPresetColors(template, template.preset_brand);
}

function cloneTemplate(template: AppearanceTemplate): AppearanceTemplate {
  return JSON.parse(JSON.stringify(template)) as AppearanceTemplate;
}

function updateComponents(
  template: AppearanceTemplate,
  updater: (components: AppearanceComponentSettings) => AppearanceComponentSettings,
): AppearanceTemplate {
  return { ...template, components: updater(template.components) };
}

const SelectMini: React.FC<{
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}> = ({ label, value, options, onChange }) => (
  <label className="block">
    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
      {label}
    </span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-line-sand bg-white px-3 py-2 text-sm text-brand focus:border-brand-deep focus:outline-none focus:ring-2 focus:ring-brand-deep/15"
    >
      {options.map(([v, text]) => (
        <option key={v} value={v}>
          {text}
        </option>
      ))}
    </select>
  </label>
);

const CheckboxMini: React.FC<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <label className="flex min-h-[38px] items-center gap-2 rounded-md border border-line-sand bg-white px-3 py-2 text-sm text-brand">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="accent-brand-deep"
    />
    {label}
  </label>
);

const TextMini: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  multiline?: boolean;
}> = ({ label, value, onChange, maxLength, multiline }) => (
  <label className="block">
    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
      {label}
    </span>
    {multiline ? (
      <textarea
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full resize-none rounded-md border border-line-sand bg-white px-3 py-2 text-sm leading-6 text-brand focus:border-brand-deep focus:outline-none focus:ring-2 focus:ring-brand-deep/15"
      />
    ) : (
      <input
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-line-sand bg-white px-3 py-2 text-sm text-brand focus:border-brand-deep focus:outline-none focus:ring-2 focus:ring-brand-deep/15"
      />
    )}
  </label>
);

const ColorMini: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  allowEmpty?: boolean;
}> = ({ label, value, onChange, allowEmpty }) => (
  <label className="block">
    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
      {label}
    </span>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value || "#0f1e3d"}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-12 rounded border border-line-sand bg-white"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={allowEmpty ? "Kosong = ikut theme" : "#ffffff"}
        className="min-w-0 flex-1 rounded-md border border-line-sand bg-white px-3 py-2 font-mono text-[12px] text-brand focus:border-brand-deep focus:outline-none focus:ring-2 focus:ring-brand-deep/15"
      />
    </div>
  </label>
);

export const AdminThemeSettings: React.FC = () => {
  const [current, setCurrent] = useState<AppearanceTemplate | null>(null);
  const [draft, setDraft] = useState<AppearanceTemplate>(DEFAULT_APPEARANCE_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [componentTab, setComponentTab] = useState<ComponentSettingsTab>("global");
  const [mediaPickerKey, setMediaPickerKey] = useState<keyof AppearanceTemplate["assets"] | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaFile[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [uploadingAsset, setUploadingAsset] = useState<keyof AppearanceTemplate["assets"] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<keyof AppearanceTemplate["assets"] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const appearance = await getSystemAppearance();
        if (cancelled) return;
        const normalized = normalizeAppearanceForEditor(appearance);
        setCurrent(normalized);
        setDraft(cloneTemplate(normalized));
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Gagal memuat template tampilan.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = useMemo(
    () => current !== null && JSON.stringify(current) !== JSON.stringify(draft),
    [current, draft],
  );

  const preview = (next: AppearanceTemplate) => {
    setDraft(next);
    applyAppearanceTemplate(next);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setToast(null);
    try {
      const saved = await updateSystemAppearance(draft);
      const normalized = normalizeAppearanceForEditor(saved);
      setCurrent(normalized);
      setDraft(cloneTemplate(normalized));
      applyAppearanceTemplate(normalized);
      setToast("Template tampilan tersimpan.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan template tampilan.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!current) return;
    setDraft(cloneTemplate(current));
    applyAppearanceTemplate(current);
  };

  const setMode = (mode: AppearanceTemplate["mode"]) => {
    if (mode === "custom") {
      preview(withCustom(draft, draft.custom?.colors || getPresetAppearanceColors(draft.preset_brand)));
      return;
    }
    preview(withPresetColors({ ...draft, mode: "preset" }, draft.preset_brand));
  };

  const setColor = (key: keyof AppearanceColors, value: string) => {
    const next = withCustom(draft);
    preview({
      ...next,
      custom: {
        ...next.custom!,
        colors: { ...next.custom!.colors, [key]: value },
      },
    });
  };

  const setAsset = (key: keyof AppearanceTemplate["assets"], value: string) => {
    preview({ ...draft, assets: { ...draft.assets, [key]: value } });
  };

  const loadMedia = useCallback(async () => {
    setMediaLoading(true);
    setMediaError(null);
    try {
      const res = await adminListMedia(80, 1);
      setMediaItems((res.media || []).filter((m) => isImage(m.mime_type)));
    } catch (err) {
      setMediaError(err instanceof ApiError ? err.message : "Gagal memuat media.");
    } finally {
      setMediaLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mediaPickerKey) void loadMedia();
  }, [mediaPickerKey, loadMedia]);

  const openUpload = (key: keyof AppearanceTemplate["assets"]) => {
    uploadTargetRef.current = key;
    fileInputRef.current?.click();
  };

  const handleAssetUpload = async (files: FileList | null) => {
    const key = uploadTargetRef.current;
    const file = files?.[0];
    if (!key || !file) return;
    setUploadingAsset(key);
    setError(null);
    setToast(null);
    try {
      const uploaded = await adminUploadMedia(file);
      setAsset(key, uploaded.url);
      setToast(`File "${uploaded.original_name || uploaded.filename}" terunggah dan dipakai.`);
      if (mediaPickerKey) await loadMedia();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload gagal.");
    } finally {
      setUploadingAsset(null);
      uploadTargetRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePickMedia = (media: MediaFile) => {
    if (!mediaPickerKey) return;
    setAsset(mediaPickerKey, media.url);
    setToast(`Media "${media.original_name || media.filename}" dipilih.`);
    setMediaPickerKey(null);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-status-dangerBorder bg-status-dangerBg px-4 py-3 text-sm text-status-dangerFg">
          {error}
        </div>
      )}
      {toast && (
        <div className="rounded-md border border-status-successBorder bg-status-successBg px-4 py-2 text-sm text-status-successFg">
          {toast}
        </div>
      )}

      <section className="rounded-[16px] border border-line-sand bg-white">
        <header className="border-b border-line-sand px-5 py-4">
          <h2 className="font-serif text-[18px] tracking-[-0.01em] text-brand">Template Tampilan</h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            Atur preset IDDS, warna custom, logo, dan gaya komponen global aplikasi.
          </p>
        </header>

        {loading ? (
          <div className="px-5 py-5 text-sm text-ink-muted">Memuat...</div>
        ) : (
          <div className="grid gap-6 px-5 py-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <div className="inline-flex rounded-lg border border-line-sand bg-paper-cream/40 p-1">
                {(["preset", "custom"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setMode(mode)}
                    className={`rounded-md px-4 py-2 text-[12px] font-semibold transition ${
                      draft.mode === mode ? "bg-brand-deep text-white" : "text-ink-tertiary hover:text-brand-deep"
                    }`}
                  >
                    {mode === "preset" ? "Preset IDDS" : "Custom"}
                  </button>
                ))}
              </div>

              <div>
                <h3 className="font-serif text-[16px] tracking-[-0.01em] text-brand">Preset Brand</h3>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {AVAILABLE_BRANDS.map((b) => {
                    const active = draft.mode === "preset" && draft.preset_brand === b.value;
                    return (
                      <button
                        key={b.value}
                        type="button"
                        onClick={() => preview(withPresetColors({ ...draft, mode: "preset" }, b.value))}
                        className={`flex items-start gap-3 rounded-[12px] border p-3 text-left transition ${
                          active
                            ? "border-brand-deep bg-paper-cream ring-2 ring-brand-deep/20"
                            : "border-line-sand bg-white hover:border-brand-deep/40"
                        }`}
                      >
                        <span
                          className="mt-0.5 h-6 w-6 flex-none rounded-full ring-1 ring-inset ring-black/10"
                          style={{ background: b.swatch }}
                          aria-hidden
                        />
                        <span className="flex-1">
                          <span className="block text-[13px] font-semibold text-brand">{b.label}</span>
                          <span className="mt-0.5 block text-[11px] text-ink-muted">
                            {b.hint || b.swatch}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-serif text-[16px] tracking-[-0.01em] text-brand">Warna Custom</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {colorFields.map(([key, label]) => {
                    const value = (draft.custom?.colors || DEFAULT_CUSTOM_COLORS)[key];
                    return (
                      <label key={key} className="rounded-lg border border-line-sand bg-white p-3">
                        <span className="text-[12px] font-semibold text-brand">{label}</span>
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="color"
                            value={value}
                            onChange={(e) => setColor(key, e.target.value)}
                            className="h-9 w-11 rounded border border-line-sand bg-white"
                          />
                          <input
                            value={value}
                            onChange={(e) => setColor(key, e.target.value)}
                            className="min-w-0 flex-1 rounded-md border border-line-sand px-2 py-2 font-mono text-[12px] text-brand"
                          />
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-serif text-[16px] tracking-[-0.01em] text-brand">Logo & Gambar</h3>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleAssetUpload(e.target.files)}
                />
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {assetFields.map(([key, label, placeholder]) => {
                    const value = draft.assets[key];
                    const uploading = uploadingAsset === key;
                    return (
                      <div key={key} className="rounded-lg border border-line-sand bg-white p-3">
                        <div className="flex gap-3">
                          <div className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-md border border-line-sand bg-paper-cream/40">
                            {value ? (
                              <img src={value} alt="" className="h-full w-full object-contain p-1" />
                            ) : (
                              <Icon name="image" size={22} className="text-ink-muted" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[12px] font-semibold text-brand">{label}</div>
                            <input
                              value={value}
                              onChange={(e) => setAsset(key, e.target.value)}
                              placeholder={placeholder}
                              className="mt-1 w-full rounded-md border border-line-sand bg-white px-3 py-2 text-sm text-brand placeholder:text-ink-muted focus:border-brand-deep focus:outline-none focus:ring-2 focus:ring-brand-deep/15"
                            />
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            hierarchy="secondary"
                            size="sm"
                            onClick={() => openUpload(key)}
                            disabled={!!uploadingAsset}
                            prefixIcon={<Icon name="upload" size={12} />}
                          >
                            {uploading ? "Upload..." : "Upload"}
                          </Button>
                          <Button
                            type="button"
                            hierarchy="secondary"
                            size="sm"
                            onClick={() => setMediaPickerKey(key)}
                            disabled={!!uploadingAsset}
                            prefixIcon={<Icon name="image" size={12} />}
                          >
                            Pilih Media
                          </Button>
                          {value && (
                            <Button
                              type="button"
                              hierarchy="tertiary"
                              size="sm"
                              onClick={() => setAsset(key, "")}
                              disabled={!!uploadingAsset}
                            >
                              Kosongkan
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-serif text-[16px] tracking-[-0.01em] text-brand">Gaya Komponen</h3>
                <div className="mt-3 overflow-hidden rounded-lg border border-line-sand bg-white">
                  <div className="overflow-x-auto border-b border-line-sand bg-paper-cream/40 px-2 py-2">
                    <div className="flex min-w-max gap-1" role="tablist" aria-label="Pengaturan komponen">
                      {componentTabs.map((tab) => {
                        const active = componentTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setComponentTab(tab.id)}
                            className={`rounded-md px-3 py-2 text-[12px] font-semibold transition ${
                              active ? "bg-brand-deep text-white shadow-sm" : "text-ink-tertiary hover:bg-white hover:text-brand-deep"
                            }`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-4" role="tabpanel">
                    {componentTab === "global" && (
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        <SelectMini
                          label="Density"
                          value={draft.components.density}
                          options={[["compact", "Compact"], ["comfortable", "Comfortable"], ["spacious", "Spacious"]]}
                          onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, density: value as typeof c.density })))}
                        />
                        <SelectMini
                          label="Radius"
                          value={draft.components.radius}
                          options={[["none", "None"], ["sm", "Small"], ["md", "Medium"], ["lg", "Large"], ["pill", "Pill"]]}
                          onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, radius: value as typeof c.radius })))}
                        />
                      </div>
                    )}

                    {componentTab === "button" && (
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        <SelectMini
                          label="Shape"
                          value={draft.components.button.shape}
                          options={[["square", "Square"], ["rounded", "Rounded"], ["pill", "Pill"]]}
                          onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, button: { ...c.button, shape: value as typeof c.button.shape } })))}
                        />
                        <SelectMini
                          label="Default hierarchy"
                          value={draft.components.button.default_hierarchy}
                          options={[["primary", "Primary"], ["secondary", "Secondary"], ["tertiary", "Tertiary"]]}
                          onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, button: { ...c.button, default_hierarchy: value as typeof c.button.default_hierarchy } })))}
                        />
                      </div>
                    )}

                    {componentTab === "form" && (
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        <SelectMini
                          label="Size"
                          value={draft.components.form.size}
                          options={[["sm", "Small"], ["md", "Medium"], ["lg", "Large"]]}
                          onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, form: { ...c.form, size: value as typeof c.form.size } })))}
                        />
                        <SelectMini
                          label="Label layout"
                          value={draft.components.form.label_layout}
                          options={[["top", "Top"], ["left", "Left"]]}
                          onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, form: { ...c.form, label_layout: value as typeof c.form.label_layout } })))}
                        />
                        <SelectMini
                          label="Field radius"
                          value={draft.components.form.field_radius}
                          options={[["none", "None"], ["sm", "Small"], ["md", "Medium"], ["lg", "Large"], ["pill", "Pill"]]}
                          onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, form: { ...c.form, field_radius: value as typeof c.form.field_radius } })))}
                        />
                      </div>
                    )}

                    {componentTab === "tabs" && (
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        <SelectMini
                          label="Variant"
                          value={draft.components.tabs.variant}
                          options={[["underline", "Underline"], ["pills", "Pills"], ["boxed", "Boxed"]]}
                          onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, tabs: { ...c.tabs, variant: value as typeof c.tabs.variant } })))}
                        />
                        <SelectMini
                          label="Size"
                          value={draft.components.tabs.size}
                          options={[["sm", "Small"], ["md", "Medium"], ["lg", "Large"]]}
                          onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, tabs: { ...c.tabs, size: value as typeof c.tabs.size } })))}
                        />
                        <CheckboxMini
                          label="Use brand color"
                          checked={draft.components.tabs.use_brand_color}
                          onChange={(checked) => preview(updateComponents(draft, (c) => ({ ...c, tabs: { ...c.tabs, use_brand_color: checked } })))}
                        />
                        <CheckboxMini
                          label="Full width"
                          checked={draft.components.tabs.full_width}
                          onChange={(checked) => preview(updateComponents(draft, (c) => ({ ...c, tabs: { ...c.tabs, full_width: checked } })))}
                        />
                      </div>
                    )}

                    {componentTab === "table" && (
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        <SelectMini
                          label="Density"
                          value={draft.components.table.density}
                          options={[["compact", "Compact"], ["comfortable", "Comfortable"], ["spacious", "Spacious"]]}
                          onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, table: { ...c.table, density: value as typeof c.table.density } })))}
                        />
                        <CheckboxMini
                          label="Bordered"
                          checked={draft.components.table.bordered}
                          onChange={(checked) => preview(updateComponents(draft, (c) => ({ ...c, table: { ...c.table, bordered: checked } })))}
                        />
                        <CheckboxMini
                          label="Zebra rows"
                          checked={draft.components.table.zebra}
                          onChange={(checked) => preview(updateComponents(draft, (c) => ({ ...c, table: { ...c.table, zebra: checked } })))}
                        />
                        <CheckboxMini
                          label="Sticky header"
                          checked={draft.components.table.sticky_header}
                          onChange={(checked) => preview(updateComponents(draft, (c) => ({ ...c, table: { ...c.table, sticky_header: checked } })))}
                        />
                      </div>
                    )}

                    {componentTab === "card" && (
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        <SelectMini
                          label="Variant"
                          value={draft.components.card.variant}
                          options={[["flat", "Flat"], ["bordered", "Bordered"], ["elevated", "Elevated"]]}
                          onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, card: { ...c.card, variant: value as typeof c.card.variant } })))}
                        />
                        <SelectMini
                          label="Shadow"
                          value={draft.components.card.shadow}
                          options={[["none", "None"], ["soft", "Soft"], ["strong", "Strong"]]}
                          onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, card: { ...c.card, shadow: value as typeof c.card.shadow } })))}
                        />
                        <SelectMini
                          label="Radius"
                          value={draft.components.card.radius}
                          options={[["none", "None"], ["sm", "Small"], ["md", "Medium"], ["lg", "Large"]]}
                          onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, card: { ...c.card, radius: value as typeof c.card.radius } })))}
                        />
                      </div>
                    )}

                    {componentTab === "modal" && (
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        <SelectMini
                          label="Size"
                          value={draft.components.modal.size}
                          options={[["sm", "Small"], ["md", "Medium"], ["lg", "Large"], ["xl", "Extra Large"]]}
                          onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, modal: { ...c.modal, size: value as typeof c.modal.size } })))}
                        />
                        <SelectMini
                          label="Radius"
                          value={draft.components.modal.radius}
                          options={[["none", "None"], ["sm", "Small"], ["md", "Medium"], ["lg", "Large"]]}
                          onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, modal: { ...c.modal, radius: value as typeof c.modal.radius } })))}
                        />
                        <SelectMini
                          label="Header"
                          value={draft.components.modal.header_style}
                          options={[["plain", "Plain"], ["brand", "Brand"]]}
                          onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, modal: { ...c.modal, header_style: value as typeof c.modal.header_style } })))}
                        />
                      </div>
                    )}

                    {componentTab === "sidebar" && (
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        <SelectMini
                          label="Variant"
                          value={draft.components.sidebar.variant}
                          options={[["brand_dark", "Brand dark"], ["brand_light", "Brand light"], ["neutral", "Neutral"]]}
                          onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, sidebar: { ...c.sidebar, variant: value as typeof c.sidebar.variant } })))}
                        />
                        <SelectMini
                          label="Density"
                          value={draft.components.sidebar.density}
                          options={[["compact", "Compact"], ["comfortable", "Comfortable"]]}
                          onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, sidebar: { ...c.sidebar, density: value as typeof c.sidebar.density } })))}
                        />
                      </div>
                    )}

                    {componentTab === "login" && (
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        <SelectMini
                          label="Layout"
                          value={draft.components.login.layout}
                          options={[["center", "Center"], ["split_left", "Split left"], ["split_right", "Split right"]]}
                          onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, login: { ...c.login, layout: value as typeof c.login.layout } })))}
                        />
                        <SelectMini
                          label="Card"
                          value={draft.components.login.card_variant}
                          options={[["solid", "Solid"], ["glass", "Glass"]]}
                          onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, login: { ...c.login, card_variant: value as typeof c.login.card_variant } })))}
                        />
                        <SelectMini
                          label="Overlay"
                          value={draft.components.login.background_overlay}
                          options={[["light", "Light"], ["dark", "Dark"], ["none", "None"]]}
                          onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, login: { ...c.login, background_overlay: value as typeof c.login.background_overlay } })))}
                        />
                        <SelectMini
                          label="Background fit"
                          value={draft.components.login.background_fit}
                          options={[["cover", "Cover"], ["contain", "Contain"], ["repeat", "Repeat"]]}
                          onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, login: { ...c.login, background_fit: value as typeof c.login.background_fit } })))}
                        />
                        <SelectMini
                          label="Background position"
                          value={draft.components.login.background_position}
                          options={[["center", "Center"], ["top", "Top"], ["bottom", "Bottom"]]}
                          onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, login: { ...c.login, background_position: value as typeof c.login.background_position } })))}
                        />
                        <CheckboxMini
                          label="Show logo"
                          checked={draft.components.login.show_logo}
                          onChange={(checked) => preview(updateComponents(draft, (c) => ({ ...c, login: { ...c.login, show_logo: checked } })))}
                        />
                        <ColorMini
                          label="Card background"
                          value={draft.components.login.card_background}
                          onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, login: { ...c.login, card_background: value } })))}
                        />
                        <ColorMini
                          label="Button background"
                          value={draft.components.login.button_background}
                          allowEmpty
                          onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, login: { ...c.login, button_background: value } })))}
                        />
                        <ColorMini
                          label="Button text"
                          value={draft.components.login.button_text}
                          onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, login: { ...c.login, button_text: value } })))}
                        />
                        <TextMini
                          label="Button label"
                          value={draft.components.login.button_label}
                          maxLength={40}
                          onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, login: { ...c.login, button_label: value } })))}
                        />
                        <TextMini
                          label="Eyebrow"
                          value={draft.components.login.eyebrow}
                          maxLength={80}
                          onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, login: { ...c.login, eyebrow: value } })))}
                        />
                        <TextMini
                          label="Title"
                          value={draft.components.login.title}
                          maxLength={80}
                          onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, login: { ...c.login, title: value } })))}
                        />
                        <div className="md:col-span-2 lg:col-span-3">
                          <TextMini
                            label="Description"
                            value={draft.components.login.description}
                            maxLength={240}
                            multiline
                            onChange={(value) => preview(updateComponents(draft, (c) => ({ ...c, login: { ...c.login, description: value } })))}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <aside className="h-fit rounded-[16px] border border-line-sand bg-paper-cream/40 p-4">
              <h3 className="font-serif text-[16px] tracking-[-0.01em] text-brand">Preview</h3>
              <div className="mt-4 overflow-hidden rounded-lg border border-line-sand bg-white">
                <div className="bg-sidebar-admin px-4 py-3 text-white">
                  <div className="flex items-center gap-3">
                    {draft.assets.logo_mark_url ? (
                      <img src={draft.assets.logo_mark_url} alt="" className="h-9 w-9 rounded-md object-contain bg-white/10" />
                    ) : (
                      <span className="h-9 w-9 rounded-md bg-white/15" />
                    )}
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.16em] text-white/70">Admin</div>
                      <div className="text-sm font-semibold">App Template</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 p-4">
                  <div className="flex gap-2">
                    <Button type="button" hierarchy={draft.components.button.default_hierarchy} size="sm">
                      Default
                    </Button>
                    <button className="app-input rounded-md border border-line-sand px-3 py-2 text-[12px] font-semibold text-brand-deep">
                      Secondary
                    </button>
                  </div>
                  <input
                    readOnly
                    value="Contoh input"
                    className="app-input w-full rounded-md border border-line-sand bg-white px-3 py-2 text-sm text-brand"
                  />
                  <div className="flex gap-2 border-b border-line-sand text-[12px] font-semibold">
                    <span className="border-b-2 border-brand-deep px-2 py-2 text-brand-deep">Aktif</span>
                    <span className="px-2 py-2 text-ink-muted">Draft</span>
                  </div>
                  <div className={`rounded-md bg-white ${draft.components.table.bordered ? "border border-line-sand" : ""}`}>
                    <div className="app-table-header grid grid-cols-2 bg-table-headerBg px-3 py-2 text-[11px] font-semibold text-brand">
                      <span>Nama</span>
                      <span>Status</span>
                    </div>
                    <div className="app-table-row grid grid-cols-2 px-3 py-2 text-[12px] text-ink-soft">
                      <span>Workflow A</span>
                      <span>Aktif</span>
                    </div>
                    <div className="app-table-row grid grid-cols-2 px-3 py-2 text-[12px] text-ink-soft">
                      <span>Workflow B</span>
                      <span>Draft</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2 border-t border-line-sand pt-4">
                <Button type="button" hierarchy="primary" onClick={handleSave} disabled={!dirty || saving}>
                  {saving ? "Menyimpan..." : "Simpan"}
                </Button>
                <Button type="button" hierarchy="secondary" onClick={handleReset} disabled={!dirty || saving}>
                  Batal
                </Button>
              </div>
            </aside>
          </div>
        )}
      </section>

      {mediaPickerKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[16px] border border-line-sand bg-white shadow-[0_24px_80px_rgba(15,30,61,0.22)]">
            <header className="flex items-center justify-between gap-3 border-b border-line-sand px-5 py-4">
              <div>
                <h3 className="font-serif text-[18px] tracking-[-0.01em] text-brand">Pilih Media</h3>
                <p className="mt-0.5 text-[12px] text-ink-muted">
                  Pilih gambar dari Media Library untuk {assetFields.find(([key]) => key === mediaPickerKey)?.[1]}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMediaPickerKey(null)}
                className="rounded-md p-2 text-ink-muted hover:bg-paper-cream hover:text-brand-deep"
                aria-label="Tutup picker media"
              >
                <Icon name="x" size={18} />
              </button>
            </header>

            <div className="flex items-center justify-between gap-3 border-b border-line-sand bg-paper-cream/30 px-5 py-3">
              <div className="text-[12px] text-ink-muted">
                {mediaLoading ? "Memuat media..." : `${mediaItems.length} gambar tersedia`}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  hierarchy="secondary"
                  size="sm"
                  onClick={loadMedia}
                  disabled={mediaLoading || !!uploadingAsset}
                >
                  Refresh
                </Button>
                <Button
                  type="button"
                  hierarchy="primary"
                  size="sm"
                  onClick={() => openUpload(mediaPickerKey)}
                  disabled={!!uploadingAsset}
                  prefixIcon={<Icon name="upload" size={12} />}
                >
                  {uploadingAsset === mediaPickerKey ? "Upload..." : "Upload Baru"}
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {mediaError && (
                <div className="mb-4 rounded-md border border-status-dangerBorder bg-status-dangerBg px-4 py-3 text-sm text-status-dangerFg">
                  {mediaError}
                </div>
              )}

              {mediaLoading ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="overflow-hidden rounded-lg border border-line-sand bg-white">
                      <div className="aspect-square animate-pulse bg-paper-cream/60" />
                      <div className="border-t border-line-sand p-2">
                        <div className="h-3 w-3/4 animate-pulse rounded bg-paper-cream/70" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : mediaItems.length === 0 ? (
                <div className="rounded-[14px] border border-dashed border-line-sand bg-white px-5 py-10 text-center">
                  <Icon name="image" size={28} className="mx-auto text-ink-muted" />
                  <p className="mt-2 font-semibold text-brand">Belum ada gambar</p>
                  <p className="mt-1 text-sm text-ink-muted">Upload gambar baru untuk dipakai sebagai logo atau background.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {mediaItems.map((media) => (
                    <button
                      key={media.id}
                      type="button"
                      onClick={() => handlePickMedia(media)}
                      className="group overflow-hidden rounded-lg border border-line-sand bg-white text-left transition hover:border-brand-deep hover:shadow-[0_10px_24px_rgba(15,30,61,0.08)]"
                    >
                      <div className="aspect-square bg-paper-cream/40">
                        <img
                          src={media.url_thumb || media.url}
                          alt={media.original_name || media.filename}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="border-t border-line-sand px-2.5 py-2">
                        <div className="truncate text-[12px] font-semibold text-brand" title={media.original_name || media.filename}>
                          {media.original_name || media.filename}
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-ink-muted">
                          <span className="truncate">{media.mime_type.split("/")[1] || media.mime_type}</span>
                          <span>{formatBytes(media.size_bytes)}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

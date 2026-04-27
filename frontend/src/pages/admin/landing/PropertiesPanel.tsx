import React, { useEffect, useState } from "react";
import { Field, TextInput, Select } from "../../../components/formKit";
import { Icon } from "../../../components/Icon";
import { RichTextEditor } from "../../../components/RichTextEditor";
import {
  type BuilderComponent,
  type BentoRow,
} from "../../../types/builder.types";
import { adminListTemplates } from "../../../api/builder";
import type { Template } from "../../../types/cms";

interface Props {
  component: BuilderComponent | null;
  updateProp: (key: string, value: unknown) => void;
}

// PropertiesPanel — render form input dynamic per block type.
// Pakai formKit (TextInput/Select/Field) yang sudah brand-aware.
// Form sederhana — fokus field utama yang sering diubah admin.
export const PropertiesPanel: React.FC<Props> = ({ component, updateProp }) => {
  if (!component) {
    return (
      <div className="w-[300px] shrink-0 overflow-y-auto border-l border-line-sand bg-paper-cream/40 p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-muted">
          Properties
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          Pilih block di canvas untuk edit propertinya.
        </p>
      </div>
    );
  }

  return (
    <div className="w-[300px] shrink-0 overflow-y-auto border-l border-line-sand bg-paper-cream/40 p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
        Properties
      </p>
      <p className="mt-1 font-serif text-[14px] tracking-[-0.01em] text-brand">
        {component.type.replace("_", " ")}
      </p>
      <div className="mt-4 space-y-3">
        <BlockForm component={component} updateProp={updateProp} />
      </div>
    </div>
  );
};

// BlockForm — switch on type → render set of fields. Field yang sama-sama
// dipakai semua block (sectionId, bgColor) dirender di akhir.
const BlockForm: React.FC<Props> = ({ component, updateProp }) => {
  if (!component) return null;
  const p = component.props;

  const setStr = (key: string) => (v: string) => updateProp(key, v);
  const setNum = (key: string) => (v: string) => updateProp(key, Number(v) || 0);
  const setBool = (key: string, value: boolean) => () => updateProp(key, !value);

  switch (component.type) {
    case "navbar":
      return (
        <>
          <Field label="Brand Title">
            <TextInput value={(p.brandTitle as string) || ""} onChange={setStr("brandTitle")} placeholder="Brand" />
          </Field>
          <Field label="Logo URL" hint="Upload via Media Library, paste URL hasil di sini">
            <TextInput value={(p.logoUrl as string) || ""} onChange={setStr("logoUrl")} placeholder="/uploads/logo.png" />
          </Field>
          <MasterPicker label="Menu Navbar" type="menu" value={(p.menu_navbar_id as string) || ""} onChange={setStr("menu_navbar_id")} />
          <ColorField label="Background Color" value={(p.bgColor as string) || ""} onChange={setStr("bgColor")} />
          <ColorField label="Text Color" value={(p.textColor as string) || ""} onChange={setStr("textColor")} />
          <Field label="Padding">
            <Select
              value={(p.padding as string) || "md"}
              onChange={setStr("padding")}
              options={[{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }]}
            />
          </Field>
          <Field label="Menu Align">
            <Select
              value={(p.menuAlign as string) || "right"}
              onChange={setStr("menuAlign")}
              options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]}
            />
          </Field>
          <Toggle label="Sticky" checked={!!p.sticky} onChange={setBool("sticky", !!p.sticky)} />
          <Toggle label="Shadow" checked={!!p.shadow} onChange={setBool("shadow", !!p.shadow)} />
          <Toggle label="Show CTA Button" checked={!!p.showCtaButton} onChange={setBool("showCtaButton", !!p.showCtaButton)} />
          {!!p.showCtaButton && (
            <>
              <ColorField label="CTA Background" value={(p.btnBgColor as string) || ""} onChange={setStr("btnBgColor")} />
              <ColorField label="CTA Text Color" value={(p.btnTextColor as string) || ""} onChange={setStr("btnTextColor")} />
            </>
          )}
        </>
      );

    case "slider":
      return (
        <>
          <MasterPicker label="Slider" type="slider" value={(p.slider_id as string) || ""} onChange={setStr("slider_id")} />
          <Field label="Height">
            <Select
              value={(p.height as string) || "fullscreen"}
              onChange={setStr("height")}
              options={[
                { value: "fullscreen", label: "Fullscreen (100vh)" },
                { value: "auto", label: "Auto" },
                { value: "400px", label: "400px" },
                { value: "600px", label: "600px" },
              ]}
            />
          </Field>
          <Toggle label="Show Arrows" checked={!!p.showArrows} onChange={setBool("showArrows", !!p.showArrows)} />
          <Toggle label="Show Indicators" checked={!!p.showIndicators} onChange={setBool("showIndicators", !!p.showIndicators)} />
          <ColorField label="Arrow Color" value={(p.arrowColor as string) || ""} onChange={setStr("arrowColor")} />
          <ColorField label="Indicator Color" value={(p.indicatorColor as string) || ""} onChange={setStr("indicatorColor")} />
          <ColorField label="Caption Color" value={(p.captionColor as string) || ""} onChange={setStr("captionColor")} />
          <ColorField label="Overlay Color" value={(p.overlayColor as string) || ""} onChange={setStr("overlayColor")} />
          <Field label="Overlay Opacity (0–1)">
            <TextInput
              type="number"
              value={String(p.overlayOpacity || 0)}
              onChange={(v) => updateProp("overlayOpacity", Math.min(1, Math.max(0, Number(v) || 0)))}
            />
          </Field>
        </>
      );

    case "html_block":
      return (
        <>
          <Field label="HTML Content" hint="WYSIWYG. Markup di-sanitize via DOMPurify saat render di public.">
            <RichTextEditor
              value={(p.html as string) || ""}
              onChange={(html) => updateProp("html", html)}
              variant="full"
              placeholder="Tulis konten HTML block di sini…"
              minHeight={200}
            />
          </Field>
          <ColorField label="Background Color" value={(p.bgColor as string) || ""} onChange={setStr("bgColor")} />
          <ColorField label="Text Color" value={(p.textColor as string) || ""} onChange={setStr("textColor")} />
          <Field label="Padding">
            <Select
              value={(p.padding as string) || "medium"}
              onChange={setStr("padding")}
              options={[
                { value: "none", label: "None" },
                { value: "small", label: "Small" },
                { value: "medium", label: "Medium" },
                { value: "large", label: "Large" },
                { value: "xlarge", label: "Extra Large" },
              ]}
            />
          </Field>
          <Field label="Container Width">
            <Select
              value={(p.containerWidth as string) || "container"}
              onChange={setStr("containerWidth")}
              options={[
                { value: "container-sm", label: "Small (640px)" },
                { value: "container", label: "Default (1024px)" },
                { value: "container-lg", label: "Large (1280px)" },
                { value: "container-fluid", label: "Fluid (100%)" },
              ]}
            />
          </Field>
          <Toggle label="Hide on Mobile" checked={!!p.hideOnMobile} onChange={setBool("hideOnMobile", !!p.hideOnMobile)} />
          <Toggle label="Hide on Desktop" checked={!!p.hideOnDesktop} onChange={setBool("hideOnDesktop", !!p.hideOnDesktop)} />
        </>
      );

    case "card_grid":
      return (
        <>
          <ColorField label="Section Background" value={(p.sectionBg as string) || ""} onChange={setStr("sectionBg")} />
          <ColorField label="Card Background" value={(p.cardBg as string) || ""} onChange={setStr("cardBg")} />
          <ColorField label="Text Color" value={(p.textColor as string) || ""} onChange={setStr("textColor")} />
          <ColorField label="Border Color" value={(p.borderColor as string) || ""} onChange={setStr("borderColor")} />
          <Field label="Border Radius (px)">
            <TextInput type="number" value={String(p.borderRadius || 8)} onChange={setNum("borderRadius")} />
          </Field>
          <Field label="Card Shadow">
            <Select
              value={(p.cardShadow as string) || "sm"}
              onChange={setStr("cardShadow")}
              options={[
                { value: "none", label: "None" },
                { value: "sm", label: "Small" },
                { value: "md", label: "Medium" },
                { value: "lg", label: "Large" },
              ]}
            />
          </Field>
          <Field label="Gap">
            <Select
              value={(p.gap as string) || "medium"}
              onChange={setStr("gap")}
              options={[
                { value: "none", label: "None" },
                { value: "small", label: "Small" },
                { value: "medium", label: "Medium" },
                { value: "large", label: "Large" },
              ]}
            />
          </Field>
          <BentoEditor rows={(p.bentoRows as BentoRow[]) || []} onChange={(v) => updateProp("bentoRows", v)} />
        </>
      );

    case "image_block":
      return (
        <>
          <Field label="Image URL">
            <TextInput value={(p.src as string) || ""} onChange={setStr("src")} placeholder="/uploads/foo.jpg" />
          </Field>
          <Field label="Alt Text">
            <TextInput value={(p.alt as string) || ""} onChange={setStr("alt")} placeholder="Deskripsi singkat" />
          </Field>
          <Field label="Width">
            <Select
              value={(p.width as string) || "full"}
              onChange={setStr("width")}
              options={[{ value: "full", label: "100%" }, { value: "75%", label: "75%" }, { value: "50%", label: "50%" }, { value: "25%", label: "25%" }]}
            />
          </Field>
          <Field label="Align">
            <Select
              value={(p.align as string) || "center"}
              onChange={setStr("align")}
              options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]}
            />
          </Field>
          <ColorField label="Background Color" value={(p.bgColor as string) || ""} onChange={setStr("bgColor")} />
          <Field label="Shadow">
            <Select
              value={(p.shadow as string) || "none"}
              onChange={setStr("shadow")}
              options={[{ value: "none", label: "None" }, { value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }]}
            />
          </Field>
        </>
      );

    case "article_grid":
      return (
        <>
          <Field label="Title (opsional)">
            <TextInput value={(p.title as string) || ""} onChange={setStr("title")} placeholder="Berita Terbaru" />
          </Field>
          <Field label="Limit (jumlah artikel)">
            <TextInput type="number" value={String(p.limit || 6)} onChange={setNum("limit")} />
          </Field>
          <Field label="Columns">
            <Select
              value={String(p.cols || 3)}
              onChange={(v) => updateProp("cols", Number(v))}
              options={[{ value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }]}
            />
          </Field>
          <ColorField label="Section Background" value={(p.sectionBg as string) || ""} onChange={setStr("sectionBg")} />
          <ColorField label="Title Color" value={(p.titleColor as string) || ""} onChange={setStr("titleColor")} />
          <ColorField label="Card Background" value={(p.cardBg as string) || ""} onChange={setStr("cardBg")} />
          <ColorField label="Card Text Color" value={(p.cardTextColor as string) || ""} onChange={setStr("cardTextColor")} />
          <Field label="Hover Effect">
            <Select
              value={(p.hoverEffect as string) || "lift"}
              onChange={setStr("hoverEffect")}
              options={[{ value: "none", label: "None" }, { value: "lift", label: "Lift" }, { value: "scale", label: "Scale" }]}
            />
          </Field>
        </>
      );

    case "footer":
      return (
        <>
          <MasterPicker label="Footer Widget" type="footer" value={(p.footer_id as string) || ""} onChange={setStr("footer_id")} />
          <ColorField label="Background Color" value={(p.bgColor as string) || ""} onChange={setStr("bgColor")} />
          <ColorField label="Text Color" value={(p.textColor as string) || ""} onChange={setStr("textColor")} />
          <ColorField label="Heading Color" value={(p.headingColor as string) || ""} onChange={setStr("headingColor")} />
          <Field label="Padding">
            <Select
              value={(p.padding as string) || "lg"}
              onChange={setStr("padding")}
              options={[{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }, { value: "xl", label: "Extra Large" }]}
            />
          </Field>
          <Toggle label="Show Copyright" checked={!!p.showCopyright} onChange={setBool("showCopyright", !!p.showCopyright)} />
          {!!p.showCopyright && (
            <Field label="Copyright Text">
              <TextInput value={(p.copyrightText as string) || ""} onChange={setStr("copyrightText")} placeholder="© 2026 App Name" />
            </Field>
          )}
        </>
      );

    default:
      return <p className="text-sm text-ink-muted">Unsupported block type</p>;
  }
};

// Helper: color picker simple — input type=color + text input.
const ColorField: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <Field label={label}>
    <div className="flex gap-2">
      <input
        type="color"
        value={normalizeColor(value)}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 cursor-pointer rounded border border-line-sand bg-white"
      />
      <TextInput value={value} onChange={onChange} placeholder="#ffffff" className="flex-1" />
    </div>
  </Field>
);

// Browser color input only accepts #rrggbb. Coerce rgba/named ke fallback.
function normalizeColor(v: string): string {
  if (/^#[0-9a-f]{6}$/i.test(v)) return v;
  if (/^#[0-9a-f]{3}$/i.test(v)) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  return "#000000";
}

// Toggle helper — pakai checkbox native sederhana.
const Toggle: React.FC<{ label: string; checked: boolean; onChange: () => void }> = ({ label, checked, onChange }) => (
  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-line-sand bg-white px-3 py-2 text-sm text-ink-tertiary">
    <span>{label}</span>
    <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4" />
  </label>
);

// MasterPicker — dropdown pilih master template (slider/menu/footer).
// Auto-fetch saat mount, refresh kalau type berubah.
const MasterPicker: React.FC<{
  label: string;
  type: "slider" | "menu" | "footer";
  value: string;
  onChange: (v: string) => void;
}> = ({ label, type, value, onChange }) => {
  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    adminListTemplates({ type_template: type, only_active: true })
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [type]);

  return (
    <Field label={label} hint={`Master ${type} dikelola di menu Konten → ${type[0].toUpperCase() + type.slice(1)}s`}>
      {loading ? (
        <div className="text-xs text-ink-muted">Memuat…</div>
      ) : (
        <Select
          value={value}
          onChange={onChange}
          placeholder={items.length === 0 ? `Belum ada ${type} master` : "Pilih"}
          options={[
            { value: "", label: "(tidak diset)" },
            ...items.map((t) => ({ value: String(t.id), label: t.name })),
          ]}
        />
      )}
    </Field>
  );
};

// BentoEditor — editor untuk card_grid bentoRows. Sederhana: list rows,
// per row pilih cols + edit cells via textarea.
const BentoEditor: React.FC<{ rows: BentoRow[]; onChange: (rows: BentoRow[]) => void }> = ({ rows, onChange }) => {
  const addRow = () => onChange([...rows, { cols: 2, cells: ["", ""] }]);
  const removeRow = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const updateRowCols = (i: number, cols: number) =>
    onChange(
      rows.map((r, idx) =>
        idx !== i ? r : { cols, cells: Array.from({ length: cols }, (_, j) => r.cells[j] || "") },
      ),
    );
  const updateCell = (rowIdx: number, cellIdx: number, value: string) =>
    onChange(rows.map((r, idx) => (idx !== rowIdx ? r : { ...r, cells: r.cells.map((c, j) => (j === cellIdx ? value : c)) })));

  return (
    <div className="rounded-md border border-line-sand bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">Bento Rows</span>
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1 rounded-md border border-line-sand bg-white px-2 py-1 text-[11px] font-semibold text-brand-deep hover:border-brand-deep"
        >
          <Icon name="plus" size={11} /> Add Row
        </button>
      </div>
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="rounded border border-line-sand bg-paper-cream/30 p-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] text-ink-muted">Row {i + 1}</span>
              <div className="flex items-center gap-2">
                <select
                  value={row.cols}
                  onChange={(e) => updateRowCols(i, Number(e.target.value))}
                  className="rounded border border-line-sand bg-white px-1 text-[11px]"
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n} col
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="rounded p-1 text-status-dangerFg hover:bg-status-dangerBg"
                  aria-label="Hapus row"
                >
                  <Icon name="trash" size={11} />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {row.cells.map((cell, j) => (
                <div key={j}>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    Cell {j + 1}
                  </div>
                  <RichTextEditor
                    value={cell}
                    onChange={(html) => updateCell(i, j, html)}
                    variant="minimal"
                    placeholder={`Konten cell ${j + 1}…`}
                    minHeight={80}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-xs text-ink-muted">Belum ada row. Klik "Add Row".</p>
        )}
      </div>
    </div>
  );
};

import React, { useEffect, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { Icon, type IconName } from "./Icon";
import { MediaPicker } from "./MediaPicker";

export type RichTextVariant = "minimal" | "full";

interface Props {
  value: string;
  onChange: (html: string) => void;
  variant?: RichTextVariant;
  placeholder?: string;
  // Min-height tinggi area editor (px). Default 180 untuk full, 100 untuk minimal.
  minHeight?: number;
  // Disable insert image button (mis. kalau context-nya tidak butuh gambar).
  disableImage?: boolean;
}

interface ToolbarBtnProps {
  icon: IconName;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}

const ToolbarBtn: React.FC<ToolbarBtnProps> = ({ icon, label, onClick, active, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={label}
    aria-label={label}
    aria-pressed={active}
    className={`inline-flex h-7 w-7 items-center justify-center rounded transition disabled:opacity-30 ${
      active
        ? "bg-brand-deep text-white"
        : "text-ink-tertiary hover:bg-paper-cream hover:text-brand-deep"
    }`}
  >
    <Icon name={icon} size={12} />
  </button>
);

const ToolbarLabel: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
}> = ({ children, onClick, active, title }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`inline-flex h-7 items-center justify-center rounded px-1.5 text-[11px] font-bold transition ${
      active
        ? "bg-brand-deep text-white"
        : "text-ink-tertiary hover:bg-paper-cream hover:text-brand-deep"
    }`}
  >
    {children}
  </button>
);

const ToolbarSeparator: React.FC = () => <span className="mx-1 h-5 w-px bg-line-sand" />;

const Toolbar: React.FC<{
  editor: Editor;
  variant: RichTextVariant;
  onInsertImage: () => void;
  disableImage: boolean;
  sourceMode: boolean;
  onToggleSource: () => void;
}> = ({ editor, variant, onInsertImage, disableImage, sourceMode, onToggleSource }) => {
  const isFull = variant === "full";

  const handleSetLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL link (kosongkan untuk hapus):", previous || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  // Saat sourceMode aktif, semua tombol formatting di-disable (kecuali toggle
  // source itu sendiri). User edit raw HTML di textarea.
  const fmtDisabled = sourceMode;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-line-sand bg-paper-cream/30 px-2 py-1.5">
      <ToolbarLabel
        title="Bold (Ctrl+B)"
        onClick={() => !fmtDisabled && editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
      >
        <span style={{ fontWeight: 800, opacity: fmtDisabled ? 0.3 : 1 }}>B</span>
      </ToolbarLabel>
      <ToolbarLabel
        title="Italic (Ctrl+I)"
        onClick={() => !fmtDisabled && editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
      >
        <span style={{ fontStyle: "italic", fontWeight: 600, opacity: fmtDisabled ? 0.3 : 1 }}>I</span>
      </ToolbarLabel>
      <ToolbarLabel
        title="Underline (Ctrl+U)"
        onClick={() => !fmtDisabled && editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
      >
        <span style={{ textDecoration: "underline", fontWeight: 600, opacity: fmtDisabled ? 0.3 : 1 }}>U</span>
      </ToolbarLabel>
      <ToolbarLabel
        title="Strike"
        onClick={() => !fmtDisabled && editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
      >
        <span style={{ textDecoration: "line-through", fontWeight: 600, opacity: fmtDisabled ? 0.3 : 1 }}>S</span>
      </ToolbarLabel>

      {isFull && (
        <>
          <ToolbarSeparator />
          <ToolbarLabel
            title="Heading 2"
            onClick={() => !fmtDisabled && editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive("heading", { level: 2 })}
          >
            H2
          </ToolbarLabel>
          <ToolbarLabel
            title="Heading 3"
            onClick={() => !fmtDisabled && editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive("heading", { level: 3 })}
          >
            H3
          </ToolbarLabel>
          <ToolbarLabel
            title="Heading 4"
            onClick={() => !fmtDisabled && editor.chain().focus().toggleHeading({ level: 4 }).run()}
            active={editor.isActive("heading", { level: 4 })}
          >
            H4
          </ToolbarLabel>
        </>
      )}

      <ToolbarSeparator />
      <ToolbarLabel
        title="Bullet List"
        onClick={() => !fmtDisabled && editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
      >
        ●
      </ToolbarLabel>
      <ToolbarLabel
        title="Numbered List"
        onClick={() => !fmtDisabled && editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
      >
        1.
      </ToolbarLabel>
      {isFull && (
        <ToolbarLabel
          title="Quote"
          onClick={() => !fmtDisabled && editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
        >
          ❝
        </ToolbarLabel>
      )}

      {isFull && (
        <>
          <ToolbarSeparator />
          <ToolbarLabel
            title="Align Left"
            onClick={() => !fmtDisabled && editor.chain().focus().setTextAlign("left").run()}
            active={editor.isActive({ textAlign: "left" })}
          >
            ⇤
          </ToolbarLabel>
          <ToolbarLabel
            title="Align Center"
            onClick={() => !fmtDisabled && editor.chain().focus().setTextAlign("center").run()}
            active={editor.isActive({ textAlign: "center" })}
          >
            ☰
          </ToolbarLabel>
          <ToolbarLabel
            title="Align Right"
            onClick={() => !fmtDisabled && editor.chain().focus().setTextAlign("right").run()}
            active={editor.isActive({ textAlign: "right" })}
          >
            ⇥
          </ToolbarLabel>
          <ToolbarLabel
            title="Justify"
            onClick={() => !fmtDisabled && editor.chain().focus().setTextAlign("justify").run()}
            active={editor.isActive({ textAlign: "justify" })}
          >
            ☷
          </ToolbarLabel>
        </>
      )}

      <ToolbarSeparator />
      <ToolbarLabel
        title="Insert / Edit Link"
        onClick={() => !fmtDisabled && handleSetLink()}
        active={editor.isActive("link")}
      >
        <Icon name="arrowRight" size={11} />
      </ToolbarLabel>
      {!disableImage && (
        <ToolbarBtn
          icon="image"
          label="Insert Image dari Media Library"
          onClick={onInsertImage}
          disabled={fmtDisabled}
        />
      )}
      {isFull && (
        <ToolbarBtn
          icon="code"
          label="Inline Code Block"
          onClick={() => !fmtDisabled && editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive("codeBlock")}
          disabled={fmtDisabled}
        />
      )}

      <ToolbarSeparator />
      <ToolbarBtn
        icon="x"
        label="Clear formatting"
        onClick={() => !fmtDisabled && editor.chain().focus().unsetAllMarks().clearNodes().run()}
        disabled={fmtDisabled}
      />

      <span className="ml-auto" />
      <ToolbarLabel
        title={sourceMode ? "Kembali ke WYSIWYG" : "View / Edit Source HTML"}
        onClick={onToggleSource}
        active={sourceMode}
      >
        <span style={{ fontFamily: "ui-monospace, monospace" }}>{`</>`}</span>
      </ToolbarLabel>
    </div>
  );
};

// RichTextEditor — tiptap-based WYSIWYG dengan View Source toggle.
//   variant="minimal" → bold/italic/underline/strike/list/link/source.
//   variant="full"    → + heading 2-4, ordered list, quote, alignment,
//                       insert image, code block, source.
// Output HTML string disimpan apa adanya. Saat render di public, frontend
// harus sanitize via DOMPurify (sudah dipasang di blocks/HtmlBlock.tsx).
export const RichTextEditor: React.FC<Props> = ({
  value,
  onChange,
  variant = "full",
  placeholder = "Tulis di sini…",
  minHeight,
  disableImage = false,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const isFull = variant === "full";
  const heightPx = minHeight ?? (isFull ? 180 : 100);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: isFull ? { levels: [2, 3, 4] } : false,
        codeBlock: isFull ? {} : false,
        blockquote: isFull ? {} : false,
        // Ordered list aktif di kedua variant supaya konten footer juga bisa
        // pakai numbered list (mis. "Cara klaim" dll).
        horizontalRule: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      // TextAlign hanya untuk full variant — tapi extension tetap aktif di
      // editor instance (cuma toolbar yg conditional). Apply ke heading + p.
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
    editorProps: {
      attributes: { class: "rte-content focus:outline-none" },
    },
  });

  // Sync external value change saat NOT in source mode (di source mode,
  // textarea pegang truth-nya).
  useEffect(() => {
    if (!editor || sourceMode) return;
    const current = editor.getHTML();
    const next = value || "";
    if (next === "" && current === "<p></p>") return;
    if (next !== current) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  // Toggle source mode.
  //   WYSIWYG → source: ambil getHTML() saat ini, isi textarea.
  //   source → WYSIWYG: parse textarea ke editor + emit onChange.
  const handleToggleSource = () => {
    if (!editor) return;
    if (!sourceMode) {
      setSourceText(editor.getHTML());
      setSourceMode(true);
    } else {
      editor.commands.setContent(sourceText || "", { emitUpdate: false });
      onChange(sourceText === "<p></p>" ? "" : sourceText);
      setSourceMode(false);
    }
  };

  if (!editor) {
    return (
      <div className="rounded-md border border-line-sand bg-white px-3 py-2 text-sm text-ink-muted">
        Memuat editor…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-line-sand bg-white focus-within:border-brand-deep focus-within:ring-2 focus-within:ring-brand-deep/15">
      <Toolbar
        editor={editor}
        variant={variant}
        onInsertImage={() => setPickerOpen(true)}
        disableImage={disableImage}
        sourceMode={sourceMode}
        onToggleSource={handleToggleSource}
      />
      {sourceMode ? (
        <textarea
          value={sourceText}
          onChange={(e) => {
            setSourceText(e.target.value);
            // Emit onChange juga supaya save langsung dapat HTML terbaru
            // tanpa harus toggle balik.
            onChange(e.target.value);
          }}
          spellCheck={false}
          className="w-full bg-paper-cream/20 px-3 py-2 font-mono text-[12px] text-brand focus:outline-none"
          style={{ minHeight: `${heightPx}px` }}
          placeholder="<p>Paste HTML di sini…</p>"
        />
      ) : (
        <div
          className="rte-wrapper px-3 py-2"
          style={{ minHeight: `${heightPx}px` }}
          onClick={() => editor.chain().focus().run()}
        >
          <EditorContent editor={editor} />
        </div>
      )}

      {pickerOpen && (
        <MediaPicker
          mimePrefix="image/"
          onSelect={(m) =>
            editor
              .chain()
              .focus()
              .setImage({ src: m.url, alt: m.original_name || m.filename })
              .run()
          }
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
};

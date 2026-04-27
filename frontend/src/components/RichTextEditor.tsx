import React, { useEffect, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
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

const ToolbarLabel: React.FC<{ children: React.ReactNode; onClick: () => void; active?: boolean; title?: string }> = ({
  children,
  onClick,
  active,
  title,
}) => (
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
}> = ({ editor, variant, onInsertImage, disableImage }) => {
  const isFull = variant === "full";

  const handleSetLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL link (kosongkan untuk hapus):", previous || "https://");
    if (url === null) return; // cancel
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-line-sand bg-paper-cream/30 px-2 py-1.5">
      <ToolbarLabel
        title="Bold (Ctrl+B)"
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
      >
        <span style={{ fontWeight: 800 }}>B</span>
      </ToolbarLabel>
      <ToolbarLabel
        title="Italic (Ctrl+I)"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
      >
        <span style={{ fontStyle: "italic", fontWeight: 600 }}>I</span>
      </ToolbarLabel>
      <ToolbarLabel
        title="Strike"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
      >
        <span style={{ textDecoration: "line-through", fontWeight: 600 }}>S</span>
      </ToolbarLabel>

      {isFull && (
        <>
          <ToolbarSeparator />
          <ToolbarLabel
            title="Heading 2"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive("heading", { level: 2 })}
          >
            H2
          </ToolbarLabel>
          <ToolbarLabel
            title="Heading 3"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive("heading", { level: 3 })}
          >
            H3
          </ToolbarLabel>
        </>
      )}

      <ToolbarSeparator />
      <ToolbarLabel
        title="Bullet List"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
      >
        ●
      </ToolbarLabel>
      {isFull && (
        <ToolbarLabel
          title="Numbered List"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
        >
          1.
        </ToolbarLabel>
      )}
      {isFull && (
        <ToolbarLabel
          title="Quote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
        >
          ❝
        </ToolbarLabel>
      )}

      <ToolbarSeparator />
      <ToolbarLabel
        title="Insert / Edit Link"
        onClick={handleSetLink}
        active={editor.isActive("link")}
      >
        <Icon name="arrowRight" size={11} />
      </ToolbarLabel>
      {isFull && !disableImage && (
        <ToolbarBtn icon="image" label="Insert Image dari Media Library" onClick={onInsertImage} />
      )}
      {isFull && (
        <ToolbarBtn
          icon="code"
          label="Toggle Code Block"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive("codeBlock")}
        />
      )}

      <ToolbarSeparator />
      <ToolbarBtn
        icon="x"
        label="Clear formatting"
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
      />
    </div>
  );
};

// RichTextEditor — tiptap-based WYSIWYG.
//   variant="minimal" → bold/italic/strike/list/link saja. Untuk cell pendek.
//   variant="full"    → + heading, ordered list, quote, code, insert image. Untuk artikel.
// Output HTML string disimpan apa adanya. Saat render di public, frontend harus
// sanitize via DOMPurify (sudah dipasang di blocks/HtmlBlock.tsx).
export const RichTextEditor: React.FC<Props> = ({
  value,
  onChange,
  variant = "full",
  placeholder = "Tulis di sini…",
  minHeight,
  disableImage = false,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const isFull = variant === "full";
  const heightPx = minHeight ?? (isFull ? 180 : 100);

  // ToolbarBtn pertama (icon "check") nyangkut, hapus di render. Placeholder
  // workaround supaya icon set tetap minimal.
  // (Catatan: ToolbarBtn check tidak dipakai — Bold pakai ToolbarLabel "B".)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: isFull ? { levels: [2, 3] } : false,
        codeBlock: isFull ? {} : false,
        blockquote: isFull ? {} : false,
        orderedList: isFull ? {} : false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      // tiptap emit `<p></p>` untuk konten kosong → normalize ke ''
      onChange(html === "<p></p>" ? "" : html);
    },
    editorProps: {
      attributes: {
        class: "rte-content focus:outline-none",
      },
    },
  });

  // Sync external value change (mis. saat form load existing data).
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || "";
    if (next === "" && current === "<p></p>") return;
    if (next !== current) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

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
      />
      <div
        className="rte-wrapper px-3 py-2"
        style={{ minHeight: `${heightPx}px` }}
        onClick={() => editor.chain().focus().run()}
      >
        <EditorContent editor={editor} />
      </div>

      {pickerOpen && (
        <MediaPicker
          mimePrefix="image/"
          onSelect={(m) => editor.chain().focus().setImage({ src: m.url, alt: m.original_name || m.filename }).run()}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
};

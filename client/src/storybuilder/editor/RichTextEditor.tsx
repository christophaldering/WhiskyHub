import { useCallback, useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import DOMPurify from "dompurify";

const ALLOWED_TAGS = ["p", "br", "strong", "em", "u", "a", "h1", "h2", "h3", "h4", "ul", "ol", "li", "blockquote"];
const ALLOWED_ATTR = ["href", "target", "rel"];

export function sanitizeStoryHtml(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

const SAFE_URL_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

export function safeUrl(raw: string | undefined | null): string {
  if (!raw) return "";
  const original = String(raw);
  if (/[\u0000-\u001F\u007F]/.test(original)) return "";
  const trimmed = original.trim();
  if (!trimmed) return "";
  if (trimmed.includes("\\")) return "";
  if (trimmed.startsWith("//")) return "";
  if (trimmed.startsWith("/") || trimmed.startsWith("#") || trimmed.startsWith("?")) return trimmed;
  try {
    const parsed = new URL(trimmed, "https://placeholder.local");
    if (parsed.origin === "https://placeholder.local" && !trimmed.includes(":")) {
      return trimmed;
    }
    if (SAFE_URL_PROTOCOLS.has(parsed.protocol)) return parsed.toString();
    return "";
  } catch {
    return "";
  }
}

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  "data-testid"?: string;
};

export function RichTextEditor({ value, onChange, placeholder, minHeight = 140, "data-testid": testId }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
        protocols: ["http", "https", "mailto", "tel"],
        validate: (href) => safeUrl(href).length > 0,
      }),
      Placeholder.configure({ placeholder: placeholder ?? "Schreibe hier…" }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        style: `min-height:${minHeight}px;outline:none;padding:8px 10px;`,
        class: "story-richtext-editor",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = value || "<p></p>";
    if (current !== incoming && current !== value) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div
        style={{
          minHeight,
          background: "rgba(201,169,97,0.06)",
          border: "1px solid rgba(201,169,97,0.25)",
          borderRadius: 4,
        }}
      />
    );
  }

  return (
    <div
      data-testid={testId}
      style={{
        background: "rgba(201,169,97,0.06)",
        border: "1px solid rgba(201,169,97,0.25)",
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      <Toolbar editor={editor} />
      <div
        style={{
          background: "rgba(11,9,6,0.4)",
          color: "#F5EDE0",
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 14,
          lineHeight: 1.55,
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = useCallback(() => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link-URL eingeben (leer = entfernen):", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const safe = safeUrl(url);
    if (!safe) {
      window.alert("Diese URL ist nicht erlaubt. Nutze http(s)://, mailto: oder tel:.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: safe }).run();
  }, [editor]);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 4,
        padding: 6,
        borderBottom: "1px solid rgba(201,169,97,0.2)",
        background: "rgba(201,169,97,0.04)",
      }}
    >
      <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} testId="rt-bold" title="Fett (Cmd/Ctrl+B)">
        <strong>B</strong>
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} testId="rt-italic" title="Kursiv (Cmd/Ctrl+I)">
        <em>I</em>
      </ToolbarBtn>
      <Sep />
      <ToolbarBtn onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive("paragraph")} testId="rt-para" title="Absatz">
        ¶
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} testId="rt-h1" title="Überschrift 1">
        H1
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} testId="rt-h2" title="Überschrift 2">
        H2
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} testId="rt-h3" title="Überschrift 3">
        H3
      </ToolbarBtn>
      <Sep />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} testId="rt-ul" title="Liste">
        •
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} testId="rt-ol" title="Nummerierte Liste">
        1.
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} testId="rt-quote" title="Zitat-Block">
        ❝
      </ToolbarBtn>
      <Sep />
      <ToolbarBtn onClick={setLink} active={editor.isActive("link")} testId="rt-link" title="Link einfügen oder bearbeiten">
        ↗
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        active={false}
        testId="rt-clear"
        title="Formatierung entfernen"
      >
        ⌫
      </ToolbarBtn>
    </div>
  );
}

function ToolbarBtn({
  onClick,
  active,
  children,
  title,
  testId,
}: {
  onClick: () => void;
  active: boolean;
  children: React.ReactNode;
  title: string;
  testId: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      data-testid={`button-${testId}`}
      style={{
        background: active ? "#C9A961" : "rgba(201,169,97,0.08)",
        color: active ? "#0B0906" : "#A89A85",
        border: "1px solid rgba(201,169,97,0.25)",
        borderRadius: 3,
        padding: "3px 8px",
        fontSize: 12,
        cursor: "pointer",
        fontFamily: "'Inter', system-ui, sans-serif",
        minWidth: 26,
        lineHeight: 1.4,
      }}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span style={{ width: 1, background: "rgba(201,169,97,0.2)", margin: "0 2px" }} />;
}

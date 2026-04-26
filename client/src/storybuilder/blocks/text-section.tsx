import { z } from "zod";
import type { BlockDefinition, BlockEditorPanelProps, BlockRendererProps } from "../core/types";
import { RichTextEditor, sanitizeStoryHtml } from "../editor/RichTextEditor";

const payloadSchema = z.object({
  eyebrow: z.string().optional().default(""),
  heading: z.string().optional().default(""),
  body: z.string().default(""),
  alignment: z.enum(["left", "center"]).default("left"),
  variant: z.enum(["default", "act-intro"]).default("default"),
});

type Payload = z.infer<typeof payloadSchema>;

function bodyAsHtml(body: string): string {
  if (!body) return "";
  const trimmed = body.trim();
  if (trimmed.startsWith("<")) return sanitizeStoryHtml(trimmed);
  const escaped = trimmed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .split(/\n\n+/)
    .map((para) => `<p>${para.replace(/\n/g, "<br/>")}</p>`)
    .join("");
  return sanitizeStoryHtml(escaped);
}

function Renderer({ payload, theme }: BlockRendererProps<Payload>) {
  const isActIntro = payload.variant === "act-intro";
  return (
    <section
      data-testid="block-text-section"
      style={{
        padding: "clamp(4rem, 10vw, 8rem) 2rem",
        maxWidth: 900,
        margin: "0 auto",
        textAlign: payload.alignment,
      }}
    >
      {isActIntro ? <div style={{ width: 50, height: 1, background: theme.colors.amber, margin: "0 auto 2.5rem" }} /> : null}
      {payload.eyebrow ? (
        <div
          style={{
            fontFamily: theme.fonts.sans,
            fontSize: ".75rem",
            letterSpacing: ".4em",
            textTransform: "uppercase",
            color: theme.colors.amber,
            marginBottom: "1rem",
            textAlign: payload.alignment,
          }}
        >
          {payload.eyebrow}
        </div>
      ) : null}
      {payload.heading ? (
        <h2
          style={{
            fontFamily: theme.fonts.serif,
            fontStyle: isActIntro ? "italic" : "normal",
            fontSize: isActIntro ? "clamp(2rem, 5vw, 3.25rem)" : "clamp(1.5rem, 3.5vw, 2.4rem)",
            color: theme.colors.ink,
            fontWeight: 400,
            letterSpacing: "-.02em",
            marginBottom: payload.body ? "1.5rem" : 0,
            marginTop: 0,
            textAlign: payload.alignment,
          }}
        >
          {payload.heading}
        </h2>
      ) : null}
      {payload.body ? (
        <div
          data-testid="text-section-body"
          style={{
            fontFamily: theme.fonts.serif,
            fontSize: "clamp(1rem, 1.5vw, 1.15rem)",
            lineHeight: 1.7,
            color: theme.colors.inkDim,
            maxWidth: payload.alignment === "center" ? 620 : "none",
            margin: payload.alignment === "center" ? "0 auto" : "0",
            textAlign: payload.alignment,
          }}
          dangerouslySetInnerHTML={{ __html: bodyAsHtml(payload.body) }}
        />
      ) : null}
    </section>
  );
}

function EditorPanel({ payload, onChange }: BlockEditorPanelProps<Payload>) {
  const set = <K extends keyof Payload>(key: K, value: Payload[K]) => onChange({ ...payload, [key]: value });
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <label style={labelStyle}>
        <span>Variante</span>
        <select
          value={payload.variant}
          onChange={(e) => set("variant", e.target.value === "act-intro" ? "act-intro" : "default")}
          style={inputStyle}
          data-testid="select-text-variant"
        >
          <option value="default">Standard</option>
          <option value="act-intro">Akt-Einleitung (zentriert mit Trenner)</option>
        </select>
      </label>
      <label style={labelStyle}>
        <span>Eyebrow</span>
        <input
          type="text"
          value={payload.eyebrow ?? ""}
          onChange={(e) => set("eyebrow", e.target.value)}
          style={inputStyle}
          data-testid="input-text-eyebrow"
        />
      </label>
      <label style={labelStyle}>
        <span>Überschrift</span>
        <input
          type="text"
          value={payload.heading ?? ""}
          onChange={(e) => set("heading", e.target.value)}
          style={inputStyle}
          data-testid="input-text-heading"
        />
      </label>
      <label style={labelStyle}>
        <span>Text</span>
        <RichTextEditor
          value={payload.body}
          onChange={(html) => set("body", html)}
          placeholder="Schreibe hier deinen Text…"
          data-testid="richtext-text-body"
        />
      </label>
      <label style={labelStyle}>
        <span>Ausrichtung</span>
        <select
          value={payload.alignment}
          onChange={(e) => set("alignment", e.target.value === "center" ? "center" : "left")}
          style={inputStyle}
          data-testid="select-text-alignment"
        >
          <option value="left">Linksbündig</option>
          <option value="center">Zentriert</option>
        </select>
      </label>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: 12,
  color: "#A89A85",
};

const inputStyle: React.CSSProperties = {
  background: "rgba(201,169,97,0.06)",
  border: "1px solid rgba(201,169,97,0.25)",
  borderRadius: 4,
  padding: "8px 10px",
  color: "#F5EDE0",
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: 14,
  outline: "none",
};

export const textSectionBlock: BlockDefinition<Payload> = {
  type: "text-section",
  label: "Text-Sektion",
  description: "Klassischer Text-Block mit Überschrift und formatiertem Fließtext.",
  category: "generic",
  defaultPayload: () => ({
    eyebrow: "",
    heading: "Eine Überschrift",
    body: "<p>Schreibe hier deinen Text…</p>",
    alignment: "left",
    variant: "default",
  }),
  payloadSchema,
  Renderer,
  EditorPanel,
};

import { z } from "zod";
import type { BlockDefinition, BlockEditorPanelProps, BlockRendererProps } from "../core/types";

const payloadSchema = z.object({
  text: z.string().default(""),
  attribution: z.string().optional().default(""),
  role: z.string().optional().default(""),
  variant: z.enum(["pull", "block"]).default("block"),
});

type Payload = z.infer<typeof payloadSchema>;

function Renderer({ payload, theme }: BlockRendererProps<Payload>) {
  return (
    <section
      data-testid="block-quote"
      style={{
        padding: "clamp(3rem, 8vw, 6rem) 2rem",
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      <blockquote
        style={{
          fontFamily: theme.fonts.serif,
          fontStyle: "italic",
          fontSize: "clamp(1.3rem, 3vw, 2rem)",
          lineHeight: 1.5,
          color: theme.colors.ink,
          margin: 0,
          padding: payload.variant === "pull" ? "0 0 0 2rem" : "2rem 0 2rem 2rem",
          borderLeft: `2px solid ${theme.colors.amber}`,
        }}
      >
        {payload.text || "Hier dein Zitat..."}
      </blockquote>
      {payload.attribution || payload.role ? (
        <div
          style={{
            fontFamily: theme.fonts.sans,
            fontSize: ".75rem",
            letterSpacing: ".15em",
            textTransform: "uppercase",
            color: theme.colors.amber,
            marginTop: "1.5rem",
            paddingLeft: "2rem",
          }}
        >
          {payload.attribution}
          {payload.attribution && payload.role ? " · " : ""}
          {payload.role ? <span style={{ color: theme.colors.inkFaint }}>{payload.role}</span> : null}
        </div>
      ) : null}
    </section>
  );
}

function EditorPanel({ payload, onChange }: BlockEditorPanelProps<Payload>) {
  const set = <K extends keyof Payload>(key: K, value: Payload[K]) => onChange({ ...payload, [key]: value });
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <label style={labelStyle}>
        <span>Zitat-Text</span>
        <textarea
          value={payload.text}
          onChange={(e) => set("text", e.target.value)}
          rows={4}
          style={{ ...inputStyle, resize: "vertical", minHeight: 100 }}
          data-testid="textarea-quote-text"
        />
      </label>
      <label style={labelStyle}>
        <span>Quelle / Person</span>
        <input
          type="text"
          value={payload.attribution ?? ""}
          onChange={(e) => set("attribution", e.target.value)}
          style={inputStyle}
          data-testid="input-quote-attribution"
        />
      </label>
      <label style={labelStyle}>
        <span>Rolle (optional)</span>
        <input
          type="text"
          value={payload.role ?? ""}
          onChange={(e) => set("role", e.target.value)}
          placeholder="z.B. Master Distiller"
          style={inputStyle}
          data-testid="input-quote-role"
        />
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

export const quoteBlock: BlockDefinition<Payload> = {
  type: "quote",
  label: "Zitat",
  description: "Hervorgehobenes Zitat mit Amber-Trennlinie und optionaler Quelle.",
  category: "generic",
  defaultPayload: () => ({ text: "Schreibe hier ein Zitat...", attribution: "", role: "", variant: "block" }),
  payloadSchema,
  Renderer,
  EditorPanel,
};

import { z } from "zod";
import type { BlockDefinition, BlockEditorPanelProps, BlockRendererProps } from "../core/types";
import { safeUrl } from "../editor/RichTextEditor";

const payloadSchema = z.object({
  text: z.string().default(""),
  href: z.string().default(""),
  variant: z.enum(["primary", "outline"]).default("primary"),
  alignment: z.enum(["left", "center", "right"]).default("center"),
  newTab: z.boolean().default(false),
  helper: z.string().optional().default(""),
});

type Payload = z.infer<typeof payloadSchema>;

function Renderer({ payload, theme }: BlockRendererProps<Payload>) {
  const safeHref = safeUrl(payload.href);
  if (!payload.text || !safeHref) {
    return (
      <section
        data-testid="block-cta-button-empty"
        style={{
          padding: "2rem",
          maxWidth: 900,
          margin: "0 auto",
          textAlign: "center",
          fontFamily: theme.fonts.sans,
          color: theme.colors.inkFaint,
          border: `1px dashed ${theme.colors.amberDim}`,
          borderRadius: 4,
        }}
      >
        {payload.text && payload.href ? "URL nicht erlaubt — nur http(s)://, mailto: oder tel:." : "Noch kein CTA gesetzt"}
      </section>
    );
  }
  const isPrimary = payload.variant === "primary";
  return (
    <section
      data-testid="block-cta-button"
      style={{
        padding: "clamp(2rem, 5vw, 4rem) 2rem",
        maxWidth: 900,
        margin: "0 auto",
        textAlign: payload.alignment,
      }}
    >
      <a
        href={safeHref}
        target={payload.newTab ? "_blank" : undefined}
        rel={payload.newTab ? "noopener noreferrer" : undefined}
        data-testid="link-cta-button"
        style={{
          display: "inline-block",
          background: isPrimary ? theme.colors.amber : "transparent",
          color: isPrimary ? "#0B0906" : theme.colors.amber,
          border: `1px solid ${theme.colors.amber}`,
          padding: "14px 32px",
          fontFamily: theme.fonts.sans,
          fontSize: ".8rem",
          fontWeight: 600,
          letterSpacing: ".25em",
          textTransform: "uppercase",
          textDecoration: "none",
          borderRadius: 3,
        }}
      >
        {payload.text}
      </a>
      {payload.helper ? (
        <div
          style={{
            fontFamily: theme.fonts.serif,
            fontStyle: "italic",
            fontSize: ".85rem",
            color: theme.colors.inkFaint,
            marginTop: "1rem",
          }}
        >
          {payload.helper}
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
        <span>Button-Text</span>
        <input
          type="text"
          value={payload.text}
          onChange={(e) => set("text", e.target.value)}
          style={inputStyle}
          data-testid="input-cta-text"
        />
      </label>
      <label style={labelStyle}>
        <span>Ziel-URL</span>
        <input
          type="text"
          value={payload.href}
          onChange={(e) => set("href", e.target.value)}
          placeholder="https://… oder /pfad"
          style={inputStyle}
          data-testid="input-cta-href"
        />
      </label>
      <label style={labelStyle}>
        <span>Variante</span>
        <select
          value={payload.variant}
          onChange={(e) => set("variant", e.target.value === "outline" ? "outline" : "primary")}
          style={inputStyle}
          data-testid="select-cta-variant"
        >
          <option value="primary">Gefüllt (Amber)</option>
          <option value="outline">Outline</option>
        </select>
      </label>
      <label style={labelStyle}>
        <span>Ausrichtung</span>
        <select
          value={payload.alignment}
          onChange={(e) => {
            const v = e.target.value;
            set("alignment", v === "left" ? "left" : v === "right" ? "right" : "center");
          }}
          style={inputStyle}
          data-testid="select-cta-alignment"
        >
          <option value="left">Links</option>
          <option value="center">Zentriert</option>
          <option value="right">Rechts</option>
        </select>
      </label>
      <label style={{ ...labelStyle, flexDirection: "row", display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="checkbox"
          checked={payload.newTab}
          onChange={(e) => set("newTab", e.target.checked)}
          data-testid="checkbox-cta-new-tab"
        />
        <span>In neuem Tab öffnen</span>
      </label>
      <label style={labelStyle}>
        <span>Hinweistext (optional)</span>
        <input
          type="text"
          value={payload.helper ?? ""}
          onChange={(e) => set("helper", e.target.value)}
          style={inputStyle}
          data-testid="input-cta-helper"
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

export const ctaButtonBlock: BlockDefinition<Payload> = {
  type: "cta-button",
  label: "CTA-Button",
  description: "Aufruf-zur-Aktion mit Link, in zwei Varianten.",
  category: "generic",
  defaultPayload: () => ({
    text: "Jetzt entdecken",
    href: "#",
    variant: "primary",
    alignment: "center",
    newTab: false,
    helper: "",
  }),
  payloadSchema,
  Renderer,
  EditorPanel,
};

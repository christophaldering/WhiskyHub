import { z } from "zod";
import type { BlockDefinition, BlockEditorPanelProps, BlockRendererProps } from "../core/types";

const payloadSchema = z.object({
  variant: z.enum(["line", "stars", "space-small", "space-large"]).default("line"),
});

type Payload = z.infer<typeof payloadSchema>;

function Renderer({ payload, theme }: BlockRendererProps<Payload>) {
  if (payload.variant === "space-small") {
    return <div data-testid="block-divider-space-small" style={{ height: "3rem" }} />;
  }
  if (payload.variant === "space-large") {
    return <div data-testid="block-divider-space-large" style={{ height: "8rem" }} />;
  }
  if (payload.variant === "stars") {
    return (
      <div
        data-testid="block-divider-stars"
        style={{
          padding: "3rem 0",
          textAlign: "center",
          fontFamily: theme.fonts.serif,
          color: theme.colors.amber,
          letterSpacing: "1rem",
          fontSize: "1.5rem",
        }}
      >
        ✦ ✦ ✦
      </div>
    );
  }
  return (
    <div
      data-testid="block-divider-line"
      style={{
        padding: "3rem 0",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: 50, height: 1, background: theme.colors.amber }} />
    </div>
  );
}

function EditorPanel({ payload, onChange }: BlockEditorPanelProps<Payload>) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <label style={labelStyle}>
        <span>Trenner-Stil</span>
        <select
          value={payload.variant}
          onChange={(e) => {
            const v = e.target.value;
            const safe = v === "stars" || v === "space-small" || v === "space-large" ? v : "line";
            onChange({ variant: safe });
          }}
          style={inputStyle}
          data-testid="select-divider-variant"
        >
          <option value="line">Amber-Linie</option>
          <option value="stars">Sternchen-Reihe</option>
          <option value="space-small">Kleiner Abstand</option>
          <option value="space-large">Großer Abstand</option>
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

export const dividerBlock: BlockDefinition<Payload> = {
  type: "divider",
  label: "Trenner",
  description: "Visueller Abschnitts-Trenner (Linie, Sternchen oder Abstand).",
  category: "generic",
  defaultPayload: () => ({ variant: "line" }),
  payloadSchema,
  Renderer,
  EditorPanel,
};

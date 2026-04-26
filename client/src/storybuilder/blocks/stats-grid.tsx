import { z } from "zod";
import type { BlockDefinition, BlockEditorPanelProps, BlockRendererProps } from "../core/types";

const itemSchema = z.object({
  value: z.string().default(""),
  label: z.string().default(""),
  hint: z.string().optional().default(""),
});

const payloadSchema = z.object({
  eyebrow: z.string().optional().default(""),
  heading: z.string().optional().default(""),
  items: z.array(itemSchema).default([]),
  columns: z.enum(["2", "3", "4"]).default("3"),
});

type Payload = z.infer<typeof payloadSchema>;
type Item = z.infer<typeof itemSchema>;

function Renderer({ payload, theme }: BlockRendererProps<Payload>) {
  const cols = parseInt(payload.columns, 10);
  return (
    <section
      data-testid="block-stats-grid"
      style={{
        padding: "clamp(3rem, 8vw, 6rem) 2rem",
        maxWidth: 1100,
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      {payload.eyebrow ? (
        <div
          style={{
            fontFamily: theme.fonts.sans,
            fontSize: ".75rem",
            letterSpacing: ".4em",
            textTransform: "uppercase",
            color: theme.colors.amber,
            marginBottom: "1rem",
          }}
        >
          {payload.eyebrow}
        </div>
      ) : null}
      {payload.heading ? (
        <h2
          style={{
            fontFamily: theme.fonts.serif,
            fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
            color: theme.colors.ink,
            fontWeight: 400,
            margin: "0 0 3rem 0",
            letterSpacing: "-.02em",
          }}
        >
          {payload.heading}
        </h2>
      ) : null}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gap: "clamp(1.5rem, 3vw, 3rem)",
        }}
      >
        {payload.items.map((item, idx) => (
          <div key={idx} data-testid={`stats-item-${idx}`}>
            <div
              style={{
                fontFamily: theme.fonts.serif,
                fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
                fontWeight: 500,
                color: theme.colors.amber,
                lineHeight: 1,
                marginBottom: ".5rem",
              }}
            >
              {item.value}
            </div>
            <div
              style={{
                fontFamily: theme.fonts.sans,
                fontSize: ".8rem",
                letterSpacing: ".2em",
                textTransform: "uppercase",
                color: theme.colors.ink,
                marginBottom: item.hint ? ".4rem" : 0,
              }}
            >
              {item.label}
            </div>
            {item.hint ? (
              <div
                style={{
                  fontFamily: theme.fonts.serif,
                  fontStyle: "italic",
                  fontSize: ".85rem",
                  color: theme.colors.inkFaint,
                }}
              >
                {item.hint}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function EditorPanel({ payload, onChange }: BlockEditorPanelProps<Payload>) {
  const set = <K extends keyof Payload>(key: K, value: Payload[K]) => onChange({ ...payload, [key]: value });
  const updateItem = (idx: number, patch: Partial<Item>) => {
    const items = payload.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    set("items", items);
  };
  const addItem = () => set("items", [...payload.items, { value: "", label: "", hint: "" }]);
  const removeItem = (idx: number) => set("items", payload.items.filter((_, i) => i !== idx));
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <label style={labelStyle}>
        <span>Eyebrow</span>
        <input
          type="text"
          value={payload.eyebrow ?? ""}
          onChange={(e) => set("eyebrow", e.target.value)}
          style={inputStyle}
          data-testid="input-stats-eyebrow"
        />
      </label>
      <label style={labelStyle}>
        <span>Überschrift</span>
        <input
          type="text"
          value={payload.heading ?? ""}
          onChange={(e) => set("heading", e.target.value)}
          style={inputStyle}
          data-testid="input-stats-heading"
        />
      </label>
      <label style={labelStyle}>
        <span>Spalten</span>
        <select
          value={payload.columns}
          onChange={(e) => {
            const v = e.target.value;
            set("columns", v === "2" ? "2" : v === "4" ? "4" : "3");
          }}
          style={inputStyle}
          data-testid="select-stats-columns"
        >
          <option value="2">2 Spalten</option>
          <option value="3">3 Spalten</option>
          <option value="4">4 Spalten</option>
        </select>
      </label>
      <div style={{ display: "grid", gap: 8 }}>
        {payload.items.map((item, idx) => (
          <div
            key={idx}
            style={{
              border: "1px solid rgba(201,169,97,0.15)",
              borderRadius: 4,
              padding: 8,
              display: "grid",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#A89A85" }}>Wert {idx + 1}</span>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                style={{ ...miniButtonStyle, color: "#d97757" }}
                data-testid={`button-stats-remove-${idx}`}
                title="Entfernen"
              >
                ✕
              </button>
            </div>
            <input
              type="text"
              value={item.value}
              onChange={(e) => updateItem(idx, { value: e.target.value })}
              placeholder="Wert (z.B. 92)"
              style={inputStyle}
              data-testid={`input-stats-value-${idx}`}
            />
            <input
              type="text"
              value={item.label}
              onChange={(e) => updateItem(idx, { label: e.target.value })}
              placeholder="Label"
              style={inputStyle}
              data-testid={`input-stats-label-${idx}`}
            />
            <input
              type="text"
              value={item.hint ?? ""}
              onChange={(e) => updateItem(idx, { hint: e.target.value })}
              placeholder="Hinweis (optional)"
              style={inputStyle}
              data-testid={`input-stats-hint-${idx}`}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addItem}
        style={{
          background: "rgba(201,169,97,0.1)",
          border: "1px dashed rgba(201,169,97,0.4)",
          color: "#C9A961",
          padding: "8px 10px",
          borderRadius: 4,
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 12,
          cursor: "pointer",
        }}
        data-testid="button-stats-add-item"
      >
        + Wert hinzufügen
      </button>
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
  fontSize: 13,
  outline: "none",
};

const miniButtonStyle: React.CSSProperties = {
  background: "rgba(201,169,97,0.08)",
  border: "1px solid rgba(201,169,97,0.2)",
  borderRadius: 3,
  padding: "2px 6px",
  fontSize: 11,
  color: "#A89A85",
  cursor: "pointer",
  fontFamily: "'Inter', system-ui, sans-serif",
  minWidth: 24,
};

export const statsGridBlock: BlockDefinition<Payload> = {
  type: "stats-grid",
  label: "Statistik-Raster",
  description: "Mehrere Kennzahlen mit großer Zahl, Label und optionalem Hinweis.",
  category: "generic",
  defaultPayload: () => ({
    eyebrow: "",
    heading: "Eckdaten",
    columns: "3",
    items: [
      { value: "92", label: "Punkte", hint: "Höchstwertung" },
      { value: "6", label: "Drams", hint: "" },
      { value: "4", label: "Verkoster", hint: "" },
    ],
  }),
  payloadSchema,
  Renderer,
  EditorPanel,
};

import { z } from "zod";
import type { BlockDefinition, BlockEditorPanelProps, BlockRendererProps } from "../core/types";

const itemSchema = z.object({
  label: z.string().default(""),
  value: z.number().default(0),
  reference: z.number().optional().default(0),
  unit: z.string().optional().default(""),
  hint: z.string().optional().default(""),
});

const payloadSchema = z.object({
  eyebrow: z.string().optional().default(""),
  heading: z.string().optional().default(""),
  lead: z.string().optional().default(""),
  referenceLabel: z.string().optional().default("Vergleich"),
  yourLabel: z.string().optional().default("Du"),
  items: z.array(itemSchema).default([]),
});

type Payload = z.infer<typeof payloadSchema>;
type Item = z.infer<typeof itemSchema>;

function Renderer({ payload, theme }: BlockRendererProps<Payload>) {
  const maxScale = Math.max(
    1,
    ...payload.items.flatMap((i) => [Number.isFinite(i.value) ? i.value : 0, Number.isFinite(i.reference ?? 0) ? (i.reference ?? 0) : 0]),
  );
  return (
    <section
      data-testid="block-benchmark"
      style={{
        padding: "clamp(3rem, 8vw, 6rem) 2rem",
        maxWidth: 1000,
        margin: "0 auto",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
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
              fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
              color: theme.colors.ink,
              fontWeight: 400,
              margin: "0 0 1rem 0",
              letterSpacing: "-.02em",
            }}
          >
            {payload.heading}
          </h2>
        ) : null}
        {payload.lead ? (
          <p
            style={{
              fontFamily: theme.fonts.serif,
              fontStyle: "italic",
              fontSize: "1.05rem",
              color: theme.colors.inkDim,
              margin: 0,
              maxWidth: 640,
              marginInline: "auto",
            }}
          >
            {payload.lead}
          </p>
        ) : null}
      </div>
      {payload.items.length > 0 ? (
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          <LegendDot color={theme.colors.amber} label={payload.yourLabel || "Du"} theme={theme} />
          <LegendDot color={theme.colors.inkFaint} label={payload.referenceLabel || "Vergleich"} theme={theme} />
        </div>
      ) : null}
      <div style={{ display: "grid", gap: "1.5rem" }}>
        {payload.items.map((item, idx) => {
          const v = Number.isFinite(item.value) ? item.value : 0;
          const r = Number.isFinite(item.reference ?? 0) ? item.reference ?? 0 : 0;
          const vPct = Math.min(100, Math.max(0, (v / maxScale) * 100));
          const rPct = Math.min(100, Math.max(0, (r / maxScale) * 100));
          return (
            <div key={idx} data-testid={`benchmark-item-${idx}`}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: ".5rem",
                  fontFamily: theme.fonts.sans,
                  fontSize: ".85rem",
                  color: theme.colors.ink,
                  letterSpacing: ".05em",
                }}
              >
                <span style={{ textTransform: "uppercase", letterSpacing: ".15em", fontSize: ".75rem", color: theme.colors.inkDim }}>{item.label}</span>
                <span style={{ fontFamily: theme.fonts.serif, fontSize: "1.1rem", color: theme.colors.amber }}>
                  {v}
                  {item.unit ? ` ${item.unit}` : ""}
                  {r ? (
                    <span style={{ color: theme.colors.inkFaint, marginLeft: 8, fontSize: ".9rem" }}>
                      vs {r}
                      {item.unit ? ` ${item.unit}` : ""}
                    </span>
                  ) : null}
                </span>
              </div>
              <div
                style={{
                  position: "relative",
                  height: 14,
                  background: "rgba(201,169,97,0.08)",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: `${vPct}%`,
                    background: theme.colors.amber,
                    borderRadius: 2,
                    transition: "width .4s ease",
                  }}
                />
                {r ? (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: `${rPct}%`,
                      width: 2,
                      background: theme.colors.inkFaint,
                    }}
                  />
                ) : null}
              </div>
              {item.hint ? (
                <div
                  style={{
                    fontFamily: theme.fonts.serif,
                    fontStyle: "italic",
                    fontSize: ".85rem",
                    color: theme.colors.inkFaint,
                    marginTop: ".4rem",
                  }}
                >
                  {item.hint}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LegendDot({ color, label, theme }: { color: string; label: string; theme: BlockRendererProps<Payload>["theme"] }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: theme.fonts.sans,
        fontSize: ".7rem",
        letterSpacing: ".2em",
        textTransform: "uppercase",
        color: theme.colors.inkDim,
      }}
    >
      <span style={{ width: 10, height: 10, background: color, borderRadius: 2, display: "inline-block" }} />
      {label}
    </span>
  );
}

function EditorPanel({ payload, onChange }: BlockEditorPanelProps<Payload>) {
  const set = <K extends keyof Payload>(key: K, value: Payload[K]) => onChange({ ...payload, [key]: value });
  const updateItem = (idx: number, patch: Partial<Item>) => {
    const items = payload.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    set("items", items);
  };
  const addItem = () => set("items", [...payload.items, { label: "", value: 0, reference: 0, unit: "", hint: "" }]);
  const removeItem = (idx: number) => set("items", payload.items.filter((_, i) => i !== idx));
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <label style={labelStyle}>
        <span>Eyebrow</span>
        <input type="text" value={payload.eyebrow ?? ""} onChange={(e) => set("eyebrow", e.target.value)} style={inputStyle} data-testid="input-bench-eyebrow" />
      </label>
      <label style={labelStyle}>
        <span>Überschrift</span>
        <input type="text" value={payload.heading ?? ""} onChange={(e) => set("heading", e.target.value)} style={inputStyle} data-testid="input-bench-heading" />
      </label>
      <label style={labelStyle}>
        <span>Lead-Text</span>
        <textarea value={payload.lead ?? ""} onChange={(e) => set("lead", e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} data-testid="input-bench-lead" />
      </label>
      <label style={labelStyle}>
        <span>Label „Du"</span>
        <input type="text" value={payload.yourLabel ?? ""} onChange={(e) => set("yourLabel", e.target.value)} style={inputStyle} data-testid="input-bench-your-label" />
      </label>
      <label style={labelStyle}>
        <span>Label Vergleich</span>
        <input type="text" value={payload.referenceLabel ?? ""} onChange={(e) => set("referenceLabel", e.target.value)} style={inputStyle} data-testid="input-bench-ref-label" />
      </label>
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ ...labelStyle, marginBottom: 0 }}>Werte</span>
          <button type="button" onClick={addItem} style={miniButtonStyle} data-testid="button-bench-add-item">+ Wert</button>
        </div>
        {payload.items.map((item, idx) => (
          <div key={idx} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "#A89A85" }}>#{idx + 1}</span>
              <button type="button" onClick={() => removeItem(idx)} style={miniButtonStyle} data-testid={`button-bench-remove-${idx}`}>×</button>
            </div>
            <label style={labelStyle}>
              <span>Label</span>
              <input type="text" value={item.label} onChange={(e) => updateItem(idx, { label: e.target.value })} style={inputStyle} data-testid={`input-bench-label-${idx}`} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <label style={labelStyle}>
                <span>Eigener Wert</span>
                <input type="number" value={item.value} onChange={(e) => updateItem(idx, { value: Number(e.target.value) || 0 })} style={inputStyle} data-testid={`input-bench-value-${idx}`} />
              </label>
              <label style={labelStyle}>
                <span>Referenz</span>
                <input type="number" value={item.reference ?? 0} onChange={(e) => updateItem(idx, { reference: Number(e.target.value) || 0 })} style={inputStyle} data-testid={`input-bench-ref-${idx}`} />
              </label>
            </div>
            <label style={labelStyle}>
              <span>Einheit (optional)</span>
              <input type="text" value={item.unit ?? ""} onChange={(e) => updateItem(idx, { unit: e.target.value })} placeholder="Pkt." style={inputStyle} data-testid={`input-bench-unit-${idx}`} />
            </label>
            <label style={labelStyle}>
              <span>Hinweis</span>
              <input type="text" value={item.hint ?? ""} onChange={(e) => updateItem(idx, { hint: e.target.value })} style={inputStyle} data-testid={`input-bench-hint-${idx}`} />
            </label>
          </div>
        ))}
      </div>
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

const cardStyle: React.CSSProperties = {
  border: "1px solid rgba(201,169,97,0.15)",
  borderRadius: 4,
  padding: 8,
  display: "grid",
  gap: 8,
};

export const benchmarkBlock: BlockDefinition<Payload> = {
  type: "benchmark-block",
  label: "Benchmark-Block",
  description: "Vergleichsbalken: eigener Wert vs. Referenz, mehrzeilig.",
  category: "landing",
  defaultPayload: () => ({
    eyebrow: "",
    heading: "Im Vergleich",
    lead: "",
    yourLabel: "Du",
    referenceLabel: "Community",
    items: [
      { label: "Punkte", value: 87, reference: 82, unit: "", hint: "" },
      { label: "Verkostungen", value: 12, reference: 8, unit: "", hint: "" },
    ],
  }),
  payloadSchema,
  Renderer,
  EditorPanel,
};

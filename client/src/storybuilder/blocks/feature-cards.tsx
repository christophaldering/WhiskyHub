import { z } from "zod";
import type { BlockDefinition, BlockEditorPanelProps, BlockRendererProps } from "../core/types";
import { safeUrl } from "../editor/RichTextEditor";

const ICONS = ["wine", "users", "mic", "split", "sparkles", "compass", "feather", "flame"] as const;
const iconSchema = z.enum(ICONS);

const itemSchema = z.object({
  icon: iconSchema.optional().default("wine"),
  title: z.string().default(""),
  description: z.string().default(""),
  ctaLabel: z.string().optional().default(""),
  ctaHref: z.string().optional().default(""),
});

const payloadSchema = z.object({
  eyebrow: z.string().optional().default(""),
  heading: z.string().optional().default(""),
  lead: z.string().optional().default(""),
  columns: z.enum(["2", "3", "4"]).default("3"),
  items: z.array(itemSchema).default([]),
});

type Payload = z.infer<typeof payloadSchema>;
type Item = z.infer<typeof itemSchema>;
type IconKey = (typeof ICONS)[number];

function IconGlyph({ name, color }: { name: IconKey; color: string }) {
  const stroke = { stroke: color, strokeWidth: 1.4, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "wine":
      return (
        <svg viewBox="0 0 24 24" width={32} height={32} aria-hidden style={stroke}>
          <path d="M8 3h8l-1 7a4 4 0 1 1-6 0L8 3Z" />
          <path d="M12 17v4M9 21h6" />
        </svg>
      );
    case "users":
      return (
        <svg viewBox="0 0 24 24" width={32} height={32} aria-hidden style={stroke}>
          <circle cx="9" cy="9" r="3" />
          <circle cx="17" cy="11" r="2.5" />
          <path d="M3 19c.7-3 3.2-5 6-5s5.3 2 6 5" />
          <path d="M14 18c.5-2 2-3.5 3.5-3.5S20.5 16 21 18" />
        </svg>
      );
    case "mic":
      return (
        <svg viewBox="0 0 24 24" width={32} height={32} aria-hidden style={stroke}>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
        </svg>
      );
    case "split":
      return (
        <svg viewBox="0 0 24 24" width={32} height={32} aria-hidden style={stroke}>
          <path d="M4 4v16M12 4v16M20 4v16" />
        </svg>
      );
    case "sparkles":
      return (
        <svg viewBox="0 0 24 24" width={32} height={32} aria-hidden style={stroke}>
          <path d="M12 3v6M12 15v6M3 12h6M15 12h6M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3" />
        </svg>
      );
    case "compass":
      return (
        <svg viewBox="0 0 24 24" width={32} height={32} aria-hidden style={stroke}>
          <circle cx="12" cy="12" r="9" />
          <path d="m15 9-2.5 5.5L7 17l2.5-5.5L15 9Z" />
        </svg>
      );
    case "feather":
      return (
        <svg viewBox="0 0 24 24" width={32} height={32} aria-hidden style={stroke}>
          <path d="M20 5c-7 0-13 5-13 12v2h2c7 0 12-6 12-13l-1-1Z" />
          <path d="M9 14l11-9M9 17h6" />
        </svg>
      );
    case "flame":
      return (
        <svg viewBox="0 0 24 24" width={32} height={32} aria-hidden style={stroke}>
          <path d="M12 3c1.5 4 5 5 5 9a5 5 0 1 1-10 0c0-2 1-3 2-4-.5 2 .5 3 2 3 .5-2-.5-4 1-8Z" />
        </svg>
      );
    default:
      return null;
  }
}

function Renderer({ payload, theme }: BlockRendererProps<Payload>) {
  const cols = parseInt(payload.columns, 10);
  return (
    <section
      data-testid="block-feature-cards"
      style={{
        padding: "clamp(3rem, 8vw, 6rem) 2rem",
        maxWidth: 1200,
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
            fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
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
            fontSize: "clamp(1rem, 1.6vw, 1.15rem)",
            color: theme.colors.inkDim,
            maxWidth: 720,
            margin: "0 auto 3rem",
            lineHeight: 1.5,
            fontStyle: "italic",
          }}
        >
          {payload.lead}
        </p>
      ) : null}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(${cols >= 4 ? 220 : cols === 3 ? 260 : 320}px, 1fr))`,
          gap: "clamp(1rem, 2.5vw, 2rem)",
          marginTop: payload.lead || payload.heading ? "2rem" : 0,
        }}
      >
        {payload.items.map((item, idx) => {
          const safeHref = item.ctaHref ? safeUrl(item.ctaHref) : "";
          return (
            <article
              key={idx}
              data-testid={`feature-card-${idx}`}
              style={{
                border: `1px solid ${theme.colors.amberDim}`,
                borderRadius: 4,
                padding: "1.75rem 1.5rem",
                background: theme.colors.bgLift,
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: ".75rem",
              }}
            >
              <div style={{ color: theme.colors.amber }}>
                <IconGlyph name={(item.icon ?? "wine") as IconKey} color={theme.colors.amber} />
              </div>
              <h3
                style={{
                  fontFamily: theme.fonts.serif,
                  fontSize: "1.3rem",
                  margin: 0,
                  color: theme.colors.ink,
                  fontWeight: 500,
                }}
              >
                {item.title}
              </h3>
              {item.description ? (
                <p
                  style={{
                    fontFamily: theme.fonts.sans,
                    fontSize: ".95rem",
                    color: theme.colors.inkDim,
                    margin: 0,
                    lineHeight: 1.55,
                  }}
                >
                  {item.description}
                </p>
              ) : null}
              {item.ctaLabel && safeHref ? (
                <a
                  href={safeHref}
                  data-testid={`feature-card-cta-${idx}`}
                  style={{
                    marginTop: "auto",
                    fontFamily: theme.fonts.sans,
                    fontSize: ".75rem",
                    letterSpacing: ".2em",
                    textTransform: "uppercase",
                    color: theme.colors.amber,
                    textDecoration: "none",
                    borderTop: `1px solid ${theme.colors.amberDim}`,
                    paddingTop: ".75rem",
                  }}
                >
                  {item.ctaLabel} →
                </a>
              ) : null}
            </article>
          );
        })}
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
  const addItem = () => set("items", [...payload.items, { icon: "wine", title: "", description: "", ctaLabel: "", ctaHref: "" }]);
  const removeItem = (idx: number) => set("items", payload.items.filter((_, i) => i !== idx));
  const moveItem = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= payload.items.length) return;
    const items = [...payload.items];
    const [it] = items.splice(idx, 1);
    items.splice(target, 0, it);
    set("items", items);
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <label style={labelStyle}>
        <span>Eyebrow</span>
        <input type="text" value={payload.eyebrow ?? ""} onChange={(e) => set("eyebrow", e.target.value)} style={inputStyle} data-testid="input-feature-eyebrow" />
      </label>
      <label style={labelStyle}>
        <span>Überschrift</span>
        <input type="text" value={payload.heading ?? ""} onChange={(e) => set("heading", e.target.value)} style={inputStyle} data-testid="input-feature-heading" />
      </label>
      <label style={labelStyle}>
        <span>Lead-Text</span>
        <textarea value={payload.lead ?? ""} onChange={(e) => set("lead", e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} data-testid="input-feature-lead" />
      </label>
      <label style={labelStyle}>
        <span>Spalten</span>
        <select value={payload.columns} onChange={(e) => set("columns", e.target.value === "2" ? "2" : e.target.value === "4" ? "4" : "3")} style={inputStyle} data-testid="select-feature-columns">
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </select>
      </label>
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ ...labelStyle, marginBottom: 0 }}>Karten</span>
          <button type="button" onClick={addItem} style={miniButtonStyle} data-testid="button-feature-add-item">+ Karte</button>
        </div>
        {payload.items.map((item, idx) => (
          <div key={idx} style={cardStyle} data-testid={`feature-item-edit-${idx}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "#A89A85" }}>#{idx + 1}</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button type="button" onClick={() => moveItem(idx, -1)} style={miniButtonStyle} data-testid={`button-feature-up-${idx}`}>↑</button>
                <button type="button" onClick={() => moveItem(idx, 1)} style={miniButtonStyle} data-testid={`button-feature-down-${idx}`}>↓</button>
                <button type="button" onClick={() => removeItem(idx)} style={miniButtonStyle} data-testid={`button-feature-remove-${idx}`}>×</button>
              </div>
            </div>
            <label style={labelStyle}>
              <span>Icon</span>
              <select value={item.icon ?? "wine"} onChange={(e) => updateItem(idx, { icon: e.target.value as IconKey })} style={inputStyle} data-testid={`select-feature-icon-${idx}`}>
                {ICONS.map((ic) => (
                  <option key={ic} value={ic}>{ic}</option>
                ))}
              </select>
            </label>
            <label style={labelStyle}>
              <span>Titel</span>
              <input type="text" value={item.title} onChange={(e) => updateItem(idx, { title: e.target.value })} style={inputStyle} data-testid={`input-feature-title-${idx}`} />
            </label>
            <label style={labelStyle}>
              <span>Beschreibung</span>
              <textarea value={item.description} onChange={(e) => updateItem(idx, { description: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} data-testid={`input-feature-desc-${idx}`} />
            </label>
            <label style={labelStyle}>
              <span>CTA-Label (optional)</span>
              <input type="text" value={item.ctaLabel ?? ""} onChange={(e) => updateItem(idx, { ctaLabel: e.target.value })} style={inputStyle} data-testid={`input-feature-cta-label-${idx}`} />
            </label>
            <label style={labelStyle}>
              <span>CTA-URL</span>
              <input type="text" value={item.ctaHref ?? ""} onChange={(e) => updateItem(idx, { ctaHref: e.target.value })} placeholder="/labs/tastings" style={inputStyle} data-testid={`input-feature-cta-href-${idx}`} />
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

export const featureCardsBlock: BlockDefinition<Payload> = {
  type: "feature-cards",
  label: "Feature-Karten",
  description: "Raster mit Icon-Karten, ideal für Landingpage-Funktionen.",
  category: "landing",
  defaultPayload: () => ({
    eyebrow: "",
    heading: "Was CaskSense kann",
    lead: "",
    columns: "3",
    items: [
      { icon: "wine", title: "Geführte Verkostungen", description: "Hosts steuern Akt für Akt durch jede Session.", ctaLabel: "", ctaHref: "" },
      { icon: "users", title: "Verkoster-Insights", description: "Geschmacksprofile, Stabilität und Vorlieben pro Person.", ctaLabel: "", ctaHref: "" },
      { icon: "sparkles", title: "Story-Builder", description: "Sessions werden zu redaktionellen Stories.", ctaLabel: "", ctaHref: "" },
    ],
  }),
  payloadSchema,
  Renderer,
  EditorPanel,
};

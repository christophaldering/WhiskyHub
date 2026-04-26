import { useEffect, useState } from "react";
import { z } from "zod";
import type { BlockDefinition, BlockEditorPanelProps, BlockRendererProps } from "../core/types";

const STAT_KEYS = ["registeredUsers", "totalTastings", "totalRatings", "whiskiesTasted", "activeCommunities"] as const;
type StatKey = (typeof STAT_KEYS)[number];

const STAT_KEY_LABELS: Record<StatKey, string> = {
  registeredUsers: "Registrierte Verkoster",
  totalTastings: "Verkostungen gesamt",
  totalRatings: "Bewertungen abgegeben",
  whiskiesTasted: "Whiskys verkostet",
  activeCommunities: "Aktive Communities",
};

const itemSchema = z.object({
  statKey: z.enum(STAT_KEYS),
  label: z.string().default(""),
  hint: z.string().optional().default(""),
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
type LiveStatsResponse = { stats: Record<StatKey, number>; fetchedAt: string };

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "–";
  return new Intl.NumberFormat("de-DE").format(Math.max(0, Math.round(n)));
}

function Renderer({ payload, theme }: BlockRendererProps<Payload>) {
  const cols = parseInt(payload.columns, 10);
  const [stats, setStats] = useState<Record<StatKey, number> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/cms/live-stats", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Live-Statistiken nicht verfügbar");
        return r.json() as Promise<LiveStatsResponse>;
      })
      .then((data) => {
        if (cancelled) return;
        setStats(data.stats);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Live-Statistiken nicht verfügbar");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      data-testid="block-live-stats"
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
            margin: "0 auto 2.5rem",
            maxWidth: 640,
          }}
        >
          {payload.lead}
        </p>
      ) : null}
      {error ? (
        <div
          data-testid="live-stats-error"
          style={{ color: theme.colors.inkFaint, fontFamily: theme.fonts.sans, fontSize: 13 }}
        >
          {error}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap: "clamp(1.5rem, 3vw, 3rem)",
            marginTop: "2rem",
          }}
        >
          {payload.items.map((item, idx) => {
            const value = stats ? stats[item.statKey] : null;
            return (
              <div key={idx} data-testid={`live-stats-item-${idx}`}>
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
                  {value == null ? "…" : formatNumber(value)}
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
                  {item.label || STAT_KEY_LABELS[item.statKey]}
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
            );
          })}
        </div>
      )}
    </section>
  );
}

function EditorPanel({ payload, onChange }: BlockEditorPanelProps<Payload>) {
  const set = <K extends keyof Payload>(key: K, value: Payload[K]) => onChange({ ...payload, [key]: value });
  const updateItem = (idx: number, patch: Partial<Item>) => {
    const items = payload.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    set("items", items);
  };
  const addItem = () => set("items", [...payload.items, { statKey: "registeredUsers", label: "", hint: "" }]);
  const removeItem = (idx: number) => set("items", payload.items.filter((_, i) => i !== idx));
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <label style={labelStyle}>
        <span>Eyebrow</span>
        <input type="text" value={payload.eyebrow ?? ""} onChange={(e) => set("eyebrow", e.target.value)} style={inputStyle} data-testid="input-livestats-eyebrow" />
      </label>
      <label style={labelStyle}>
        <span>Überschrift</span>
        <input type="text" value={payload.heading ?? ""} onChange={(e) => set("heading", e.target.value)} style={inputStyle} data-testid="input-livestats-heading" />
      </label>
      <label style={labelStyle}>
        <span>Lead-Text</span>
        <textarea value={payload.lead ?? ""} onChange={(e) => set("lead", e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} data-testid="input-livestats-lead" />
      </label>
      <label style={labelStyle}>
        <span>Spalten</span>
        <select value={payload.columns} onChange={(e) => set("columns", e.target.value === "2" ? "2" : e.target.value === "4" ? "4" : "3")} style={inputStyle} data-testid="select-livestats-columns">
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </select>
      </label>
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ ...labelStyle, marginBottom: 0 }}>Kennzahlen (live)</span>
          <button type="button" onClick={addItem} style={miniButtonStyle} data-testid="button-livestats-add">+ Kennzahl</button>
        </div>
        {payload.items.map((item, idx) => (
          <div key={idx} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "#A89A85" }}>#{idx + 1}</span>
              <button type="button" onClick={() => removeItem(idx)} style={miniButtonStyle} data-testid={`button-livestats-remove-${idx}`}>×</button>
            </div>
            <label style={labelStyle}>
              <span>Datenquelle</span>
              <select value={item.statKey} onChange={(e) => updateItem(idx, { statKey: e.target.value as StatKey })} style={inputStyle} data-testid={`select-livestats-key-${idx}`}>
                {STAT_KEYS.map((k) => (
                  <option key={k} value={k}>{STAT_KEY_LABELS[k]}</option>
                ))}
              </select>
            </label>
            <label style={labelStyle}>
              <span>Label (optional, sonst Standard)</span>
              <input type="text" value={item.label} onChange={(e) => updateItem(idx, { label: e.target.value })} style={inputStyle} data-testid={`input-livestats-label-${idx}`} />
            </label>
            <label style={labelStyle}>
              <span>Hinweis</span>
              <input type="text" value={item.hint ?? ""} onChange={(e) => updateItem(idx, { hint: e.target.value })} style={inputStyle} data-testid={`input-livestats-hint-${idx}`} />
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

export const liveStatsBlock: BlockDefinition<Payload> = {
  type: "live-stats",
  label: "Live-Statistiken",
  description: "Echtzeit-Kennzahlen aus der CaskSense-Datenbank.",
  category: "landing",
  defaultPayload: () => ({
    eyebrow: "Live aus dem Labor",
    heading: "Was gerade passiert",
    lead: "",
    columns: "3",
    items: [
      { statKey: "registeredUsers", label: "", hint: "" },
      { statKey: "totalTastings", label: "", hint: "" },
      { statKey: "totalRatings", label: "", hint: "" },
    ],
  }),
  payloadSchema,
  Renderer,
  EditorPanel,
};

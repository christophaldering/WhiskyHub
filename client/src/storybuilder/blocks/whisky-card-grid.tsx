import { z } from "zod";
import type { BlockDefinition, BlockEditorPanelProps, BlockRendererProps } from "../core/types";
import { useTastingStoryData } from "../data/TastingStoryDataContext";
import { ResponsiveImage } from "../renderer/ResponsiveImage";

const overrideSchema = z.object({
  handoutText: z.string().optional().default(""),
  scoreLabel: z.string().optional().default(""),
});

const payloadSchema = z.object({
  eyebrow: z.string().optional().default("Im Glas"),
  heading: z.string().optional().default("Die Whiskys des Abends"),
  columns: z.enum(["2", "3", "4"]).default("3"),
  showScores: z.boolean().optional().default(true),
  includeWhiskyIds: z.array(z.string()).nullable().optional().default(null),
  overrides: z.record(overrideSchema).optional().default({}),
});

type Payload = z.infer<typeof payloadSchema>;

function Renderer({ payload, theme }: BlockRendererProps<Payload>) {
  const data = useTastingStoryData();
  const allWhiskies = data?.whiskies ?? [];
  const whiskies = payload.includeWhiskyIds && payload.includeWhiskyIds.length > 0
    ? allWhiskies.filter((w) => payload.includeWhiskyIds!.includes(w.id))
    : allWhiskies;
  const cols = parseInt(payload.columns, 10);

  if (whiskies.length === 0) {
    return (
      <PlaceholderEmpty theme={theme} testId="block-whisky-card-grid-empty" message="Noch keine Whiskys hinterlegt." />
    );
  }

  return (
    <section
      data-testid="block-whisky-card-grid"
      style={{
        padding: "clamp(3rem, 8vw, 6rem) 2rem",
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      <Header eyebrow={payload.eyebrow} heading={payload.heading} theme={theme} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(${Math.max(220, Math.floor(1100 / cols) - 32)}px, 1fr))`,
          gap: "clamp(1.2rem, 2.4vw, 2rem)",
        }}
      >
        {whiskies.map((w) => {
          const ov = payload.overrides?.[w.id] ?? { handoutText: "", scoreLabel: "" };
          const handout = ov.handoutText && ov.handoutText.trim().length > 0 ? ov.handoutText : (w.handoutExcerpt ?? "");
          const score = payload.showScores
            ? (ov.scoreLabel && ov.scoreLabel.trim().length > 0
                ? ov.scoreLabel
                : (w.avgScore !== null ? `${w.avgScore.toFixed(1)} Punkte` : ""))
            : "";
          return (
            <article
              key={w.id}
              data-testid={`whisky-card-${w.id}`}
              style={{
                background: theme.colors.bgLift,
                border: `1px solid ${theme.colors.amberDim}`,
                borderRadius: 6,
                padding: "1.6rem 1.4rem",
                display: "grid",
                gap: "1rem",
                color: theme.colors.ink,
              }}
            >
              {w.imageUrl ? (
                <ResponsiveImage
                  src={w.imageUrl}
                  alt={w.name}
                  sizes={`(max-width: 600px) 92vw, ${Math.max(180, Math.floor(1100 / cols))}px`}
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    objectFit: "contain",
                    display: "block",
                    filter: "drop-shadow(0 12px 24px rgba(0,0,0,0.45))",
                  }}
                  testId={`img-whisky-${w.id}`}
                />
              ) : (
                <div
                  aria-hidden
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    background: "rgba(201,169,97,0.05)",
                  }}
                />
              )}
              <div>
                <div
                  style={{
                    fontFamily: theme.fonts.sans,
                    fontSize: ".7rem",
                    letterSpacing: ".3em",
                    textTransform: "uppercase",
                    color: theme.colors.amber,
                    marginBottom: 6,
                  }}
                >
                  {w.distillery ?? "Distillery unbekannt"}
                  {w.region ? ` · ${w.region}` : ""}
                </div>
                <h3
                  data-testid={`text-whisky-name-${w.id}`}
                  style={{
                    fontFamily: theme.fonts.serif,
                    fontSize: "clamp(1.2rem, 2.2vw, 1.5rem)",
                    margin: 0,
                    fontWeight: 400,
                    lineHeight: 1.2,
                  }}
                >
                  {w.name}
                </h3>
                <div
                  style={{
                    fontFamily: theme.fonts.sans,
                    fontSize: ".75rem",
                    color: theme.colors.inkDim,
                    marginTop: 4,
                    letterSpacing: ".05em",
                  }}
                >
                  {[
                    w.age ? `${w.age} J.` : null,
                    w.abv !== null ? `${w.abv}% ABV` : null,
                    w.caskType,
                  ].filter(Boolean).join(" · ")}
                </div>
              </div>
              {handout ? (
                <p
                  data-testid={`text-whisky-handout-${w.id}`}
                  style={{
                    fontFamily: theme.fonts.serif,
                    fontStyle: "italic",
                    fontSize: ".95rem",
                    color: theme.colors.inkDim,
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {handout}
                </p>
              ) : null}
              {score ? (
                <div
                  data-testid={`text-whisky-score-${w.id}`}
                  style={{
                    fontFamily: theme.fonts.sans,
                    fontSize: ".7rem",
                    letterSpacing: ".3em",
                    textTransform: "uppercase",
                    color: theme.colors.amber,
                    borderTop: `1px solid ${theme.colors.amberDim}`,
                    paddingTop: 10,
                  }}
                >
                  {score}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Header({ eyebrow, heading, theme }: { eyebrow?: string; heading?: string; theme: BlockRendererProps<Payload>["theme"] }) {
  if (!eyebrow && !heading) return null;
  return (
    <div style={{ textAlign: "center", marginBottom: "clamp(2rem, 4vw, 3rem)" }}>
      {eyebrow ? (
        <div style={{ fontFamily: theme.fonts.sans, fontSize: ".75rem", letterSpacing: ".4em", textTransform: "uppercase", color: theme.colors.amber, marginBottom: 12 }}>{eyebrow}</div>
      ) : null}
      {heading ? (
        <h2 style={{ fontFamily: theme.fonts.serif, fontSize: "clamp(1.6rem, 3vw, 2.4rem)", color: theme.colors.ink, fontWeight: 400, margin: 0, letterSpacing: "-.02em" }}>{heading}</h2>
      ) : null}
    </div>
  );
}

function PlaceholderEmpty({ theme, testId, message }: { theme: BlockRendererProps<Payload>["theme"]; testId: string; message: string }) {
  return (
    <section data-testid={testId} style={{ padding: "4rem 2rem", textAlign: "center", color: theme.colors.inkFaint, fontFamily: theme.fonts.serif, fontStyle: "italic" }}>{message}</section>
  );
}

function EditorPanel({ payload, onChange }: BlockEditorPanelProps<Payload>) {
  const data = useTastingStoryData();
  const set = <K extends keyof Payload>(key: K, value: Payload[K]) => onChange({ ...payload, [key]: value });
  const allWhiskies = data?.whiskies ?? [];
  const updateOverride = (whiskyId: string, patch: Partial<{ handoutText: string; scoreLabel: string }>) => {
    const cur = payload.overrides ?? {};
    const existing = cur[whiskyId] ?? { handoutText: "", scoreLabel: "" };
    const next = { ...cur, [whiskyId]: { ...existing, ...patch } };
    set("overrides", next);
  };
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={hintStyle}>Daten aller Whiskys werden automatisch geladen. Pro Karte kannst du Handout-Text und Punkte überschreiben.</div>
      <label style={labelStyle}>
        <span>Eyebrow</span>
        <input type="text" value={payload.eyebrow ?? ""} onChange={(e) => set("eyebrow", e.target.value)} style={inputStyle} data-testid="input-whisky-grid-eyebrow" />
      </label>
      <label style={labelStyle}>
        <span>Überschrift</span>
        <input type="text" value={payload.heading ?? ""} onChange={(e) => set("heading", e.target.value)} style={inputStyle} data-testid="input-whisky-grid-heading" />
      </label>
      <label style={labelStyle}>
        <span>Spalten</span>
        <select value={payload.columns} onChange={(e) => set("columns", e.target.value as Payload["columns"])} style={inputStyle} data-testid="select-whisky-grid-columns">
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </select>
      </label>
      <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", display: "flex", gap: 8 }}>
        <input type="checkbox" checked={!!payload.showScores} onChange={(e) => set("showScores", e.target.checked)} data-testid="checkbox-whisky-grid-scores" />
        <span>Durchschnittspunkte anzeigen</span>
      </label>
      {allWhiskies.length === 0 ? (
        <div style={hintStyle}>Keine Whiskys verfügbar.</div>
      ) : (
        <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
          <div style={{ fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", color: "#A89A85" }}>Pro-Karte-Überschreibungen</div>
          {allWhiskies.map((w) => {
            const ov = payload.overrides?.[w.id] ?? { handoutText: "", scoreLabel: "" };
            return (
              <div key={w.id} style={overrideRow}>
                <div style={{ fontSize: 12, color: "#F5EDE0", marginBottom: 4 }}>{w.name}</div>
                <textarea
                  placeholder={w.handoutExcerpt ?? "Handout-Text…"}
                  value={ov.handoutText ?? ""}
                  onChange={(e) => updateOverride(w.id, { handoutText: e.target.value })}
                  style={{ ...inputStyle, minHeight: 50 }}
                  data-testid={`input-whisky-grid-handout-${w.id}`}
                />
                <input
                  type="text"
                  placeholder={w.avgScore !== null ? `${w.avgScore.toFixed(1)} Punkte` : "Punktelabel"}
                  value={ov.scoreLabel ?? ""}
                  onChange={(e) => updateOverride(w.id, { scoreLabel: e.target.value })}
                  style={inputStyle}
                  data-testid={`input-whisky-grid-score-${w.id}`}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "grid", gap: 4, fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12, color: "#A89A85" };
const inputStyle: React.CSSProperties = { background: "rgba(201,169,97,0.06)", border: "1px solid rgba(201,169,97,0.25)", borderRadius: 4, padding: "8px 10px", color: "#F5EDE0", fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, outline: "none" };
const hintStyle: React.CSSProperties = { fontSize: 11, color: "#6B5F4F", padding: "8px 10px", background: "rgba(201,169,97,0.04)", border: "1px dashed rgba(201,169,97,0.15)", borderRadius: 4 };
const overrideRow: React.CSSProperties = { display: "grid", gap: 6, padding: "10px", border: "1px solid rgba(201,169,97,0.12)", borderRadius: 4 };

export const whiskyCardGridBlock: BlockDefinition<Payload> = {
  type: "whisky-card-grid",
  label: "Whisky-Karten-Raster",
  description: "Karten für jeden Whisky des Abends mit Bild, Eckdaten, Handout und Punkten.",
  category: "tasting",
  defaultPayload: () => ({
    eyebrow: "Im Glas",
    heading: "Die Whiskys des Abends",
    columns: "3",
    showScores: true,
    includeWhiskyIds: null,
    overrides: {},
  }),
  payloadSchema,
  Renderer,
  EditorPanel,
};

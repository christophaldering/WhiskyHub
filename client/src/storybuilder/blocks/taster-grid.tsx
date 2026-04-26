import { z } from "zod";
import type { BlockDefinition, BlockEditorPanelProps, BlockRendererProps } from "../core/types";
import { useTastingStoryData } from "../data/TastingStoryDataContext";

const overrideSchema = z.object({
  funFact: z.string().optional().default(""),
});

const payloadSchema = z.object({
  eyebrow: z.string().optional().default("Wer mitverkostet hat"),
  heading: z.string().optional().default("Die Verkoster"),
  columns: z.enum(["2", "3", "4"]).default("3"),
  includeParticipantIds: z.array(z.string()).nullable().optional().default(null),
  overrides: z.record(overrideSchema).optional().default({}),
});

type Payload = z.infer<typeof payloadSchema>;

function Renderer({ payload, theme }: BlockRendererProps<Payload>) {
  const data = useTastingStoryData();
  const allParticipants = data?.participants ?? [];
  const participants = payload.includeParticipantIds && payload.includeParticipantIds.length > 0
    ? allParticipants.filter((p) => payload.includeParticipantIds!.includes(p.id))
    : allParticipants;
  const cols = parseInt(payload.columns, 10);

  if (participants.length === 0) {
    return (
      <section data-testid="block-taster-grid-empty" style={{ padding: "4rem 2rem", textAlign: "center", color: theme.colors.inkFaint, fontFamily: theme.fonts.serif, fontStyle: "italic" }}>
        Noch keine Verkoster eingeladen.
      </section>
    );
  }

  return (
    <section
      data-testid="block-taster-grid"
      style={{ padding: "clamp(3rem, 8vw, 6rem) 2rem", maxWidth: 1200, margin: "0 auto" }}
    >
      {payload.eyebrow || payload.heading ? (
        <div style={{ textAlign: "center", marginBottom: "clamp(2rem, 4vw, 3rem)" }}>
          {payload.eyebrow ? (
            <div style={{ fontFamily: theme.fonts.sans, fontSize: ".75rem", letterSpacing: ".4em", textTransform: "uppercase", color: theme.colors.amber, marginBottom: 12 }}>{payload.eyebrow}</div>
          ) : null}
          {payload.heading ? (
            <h2 style={{ fontFamily: theme.fonts.serif, fontSize: "clamp(1.6rem, 3vw, 2.4rem)", color: theme.colors.ink, fontWeight: 400, margin: 0, letterSpacing: "-.02em" }}>{payload.heading}</h2>
          ) : null}
        </div>
      ) : null}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(${Math.max(220, Math.floor(1100 / cols) - 32)}px, 1fr))`,
          gap: "clamp(1.2rem, 2.4vw, 2rem)",
        }}
      >
        {participants.map((p) => {
          const ov = payload.overrides?.[p.id];
          const funFact = ov?.funFact && ov.funFact.trim().length > 0 ? ov.funFact : null;
          return (
            <article
              key={p.id}
              data-testid={`taster-card-${p.id}`}
              style={{
                background: theme.colors.bgLift,
                border: `1px solid ${theme.colors.amberDim}`,
                borderRadius: 6,
                padding: "1.6rem 1.4rem",
                display: "grid",
                gap: "1rem",
                justifyItems: "center",
                textAlign: "center",
                color: theme.colors.ink,
              }}
            >
              <div
                aria-hidden
                data-testid={`taster-avatar-${p.id}`}
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${theme.colors.amber}33, ${theme.colors.amber}11)`,
                  border: `1px solid ${theme.colors.amber}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: theme.fonts.serif,
                  fontSize: "1.6rem",
                  letterSpacing: ".05em",
                  color: theme.colors.amber,
                }}
              >
                {p.initials}
              </div>
              <div>
                <div data-testid={`text-taster-name-${p.id}`} style={{ fontFamily: theme.fonts.serif, fontSize: "1.25rem", color: theme.colors.ink, lineHeight: 1.2 }}>
                  {p.name}
                </div>
                <div style={{ fontFamily: theme.fonts.sans, fontSize: ".7rem", letterSpacing: ".25em", textTransform: "uppercase", color: theme.colors.amber, marginTop: 6 }}>
                  {p.isHost ? "Host" : "Verkoster"}
                  {p.ratingCount > 0 ? ` · ${p.ratingCount} ${p.ratingCount === 1 ? "Bewertung" : "Bewertungen"}` : ""}
                </div>
              </div>
              {funFact ? (
                <p
                  data-testid={`text-taster-funfact-${p.id}`}
                  style={{ fontFamily: theme.fonts.serif, fontStyle: "italic", fontSize: ".95rem", color: theme.colors.inkDim, margin: 0, lineHeight: 1.5 }}
                >
                  {funFact}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function EditorPanel({ payload, onChange }: BlockEditorPanelProps<Payload>) {
  const data = useTastingStoryData();
  const set = <K extends keyof Payload>(key: K, value: Payload[K]) => onChange({ ...payload, [key]: value });
  const allParticipants = data?.participants ?? [];
  const updateOverride = (pid: string, patch: Partial<{ funFact: string }>) => {
    const cur = payload.overrides ?? {};
    const existing = cur[pid] ?? { funFact: "" };
    const next = { ...cur, [pid]: { ...existing, ...patch } };
    set("overrides", next);
  };
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={hintStyle}>Verkoster werden automatisch geladen. Pro Karte kannst du einen KI-Fun-Fakt überschreiben.</div>
      <label style={labelStyle}>
        <span>Eyebrow</span>
        <input type="text" value={payload.eyebrow ?? ""} onChange={(e) => set("eyebrow", e.target.value)} style={inputStyle} data-testid="input-taster-grid-eyebrow" />
      </label>
      <label style={labelStyle}>
        <span>Überschrift</span>
        <input type="text" value={payload.heading ?? ""} onChange={(e) => set("heading", e.target.value)} style={inputStyle} data-testid="input-taster-grid-heading" />
      </label>
      <label style={labelStyle}>
        <span>Spalten</span>
        <select value={payload.columns} onChange={(e) => set("columns", e.target.value as Payload["columns"])} style={inputStyle} data-testid="select-taster-grid-columns">
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </select>
      </label>
      {allParticipants.length === 0 ? (
        <div style={hintStyle}>Keine Verkoster verfügbar.</div>
      ) : (
        <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
          <div style={{ fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", color: "#A89A85" }}>Pro-Verkoster Fun-Fakts</div>
          {allParticipants.map((p) => {
            const ov = payload.overrides?.[p.id] ?? { funFact: "" };
            return (
              <div key={p.id} style={overrideRow}>
                <div style={{ fontSize: 12, color: "#F5EDE0", marginBottom: 4 }}>{p.name}</div>
                <textarea
                  placeholder="KI-Fun-Fakt (z.B. Smoke-Liebhaber, mag fruchtige Sherry-Casks…)"
                  value={ov.funFact ?? ""}
                  onChange={(e) => updateOverride(p.id, { funFact: e.target.value })}
                  style={{ ...inputStyle, minHeight: 50 }}
                  data-testid={`input-taster-funfact-${p.id}`}
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

export const tasterGridBlock: BlockDefinition<Payload> = {
  type: "taster-grid",
  label: "Verkoster-Raster",
  description: "Avatar-Initialen, Namen und KI-Fun-Fakts der Verkoster.",
  category: "tasting",
  defaultPayload: () => ({
    eyebrow: "Wer mitverkostet hat",
    heading: "Die Verkoster",
    columns: "3",
    includeParticipantIds: null,
    overrides: {},
  }),
  payloadSchema,
  Renderer,
  EditorPanel,
};

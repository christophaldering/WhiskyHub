import { z } from "zod";
import type { BlockDefinition, BlockEditorPanelProps, BlockRendererProps } from "../core/types";
import { useTastingStoryData } from "../data/TastingStoryDataContext";

const overrideSchema = z.object({
  commentary: z.string().optional().default(""),
});

const payloadSchema = z.object({
  eyebrow: z.string().optional().default("Ranking"),
  heading: z.string().optional().default("Wie ihr gewertet habt"),
  order: z.enum(["countdown", "topdown"]).default("countdown"),
  hideUnrated: z.boolean().optional().default(true),
  overrides: z.record(overrideSchema).optional().default({}),
});

type Payload = z.infer<typeof payloadSchema>;

function Renderer({ payload, theme }: BlockRendererProps<Payload>) {
  const data = useTastingStoryData();
  const ranking = data?.ranking ?? [];
  const filtered = payload.hideUnrated ? ranking.filter((r) => r.avgScore !== null) : ranking;
  const ordered = payload.order === "countdown" ? [...filtered].reverse() : filtered;

  if (ordered.length === 0) {
    return (
      <section data-testid="block-ranking-list-empty" style={{ padding: "4rem 2rem", textAlign: "center", color: theme.colors.inkFaint, fontFamily: theme.fonts.serif, fontStyle: "italic" }}>
        Noch keine Bewertungen vorhanden.
      </section>
    );
  }

  return (
    <section
      data-testid="block-ranking-list"
      style={{ padding: "clamp(3rem, 8vw, 6rem) 2rem", maxWidth: 880, margin: "0 auto" }}
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
      <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "1rem" }}>
        {ordered.map((entry) => {
          const ov = payload.overrides?.[entry.whiskyId];
          const commentary = ov?.commentary && ov.commentary.trim().length > 0 ? ov.commentary : null;
          const scoreLabel = entry.avgScore !== null ? `${entry.avgScore.toFixed(1)}` : "—";
          return (
            <li
              key={entry.whiskyId}
              data-testid={`ranking-entry-${entry.whiskyId}`}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: "1.2rem",
                alignItems: "center",
                padding: "1rem 1.2rem",
                background: theme.colors.bgLift,
                border: `1px solid ${theme.colors.amberDim}`,
                borderRadius: 4,
              }}
            >
              <div
                style={{
                  fontFamily: theme.fonts.serif,
                  fontSize: "2.2rem",
                  color: theme.colors.amber,
                  width: 56,
                  textAlign: "center",
                  fontWeight: 500,
                  lineHeight: 1,
                }}
                aria-hidden
              >
                {entry.position}
              </div>
              <div style={{ minWidth: 0 }}>
                <div data-testid={`text-ranking-name-${entry.whiskyId}`} style={{ fontFamily: theme.fonts.serif, fontSize: "1.2rem", color: theme.colors.ink, lineHeight: 1.2 }}>
                  {entry.name}
                </div>
                {entry.distillery ? (
                  <div style={{ fontFamily: theme.fonts.sans, fontSize: ".7rem", letterSpacing: ".2em", textTransform: "uppercase", color: theme.colors.inkDim, marginTop: 4 }}>
                    {entry.distillery}
                  </div>
                ) : null}
                {commentary ? (
                  <p data-testid={`text-ranking-commentary-${entry.whiskyId}`} style={{ fontFamily: theme.fonts.serif, fontStyle: "italic", fontSize: ".95rem", color: theme.colors.inkDim, marginTop: 8, marginBottom: 0, lineHeight: 1.5 }}>
                    {commentary}
                  </p>
                ) : null}
              </div>
              <div style={{ textAlign: "right", display: "grid", gap: 2 }}>
                <div data-testid={`text-ranking-score-${entry.whiskyId}`} style={{ fontFamily: theme.fonts.serif, fontSize: "1.4rem", color: theme.colors.ink }}>
                  {scoreLabel}
                </div>
                <div style={{ fontFamily: theme.fonts.sans, fontSize: ".7rem", letterSpacing: ".2em", textTransform: "uppercase", color: theme.colors.inkFaint }}>
                  {entry.voters} {entry.voters === 1 ? "Stimme" : "Stimmen"}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function EditorPanel({ payload, onChange }: BlockEditorPanelProps<Payload>) {
  const data = useTastingStoryData();
  const set = <K extends keyof Payload>(key: K, value: Payload[K]) => onChange({ ...payload, [key]: value });
  const ranking = data?.ranking ?? [];
  const updateOverride = (whiskyId: string, patch: Partial<{ commentary: string }>) => {
    const cur = payload.overrides ?? {};
    const existing = cur[whiskyId] ?? { commentary: "" };
    const next = { ...cur, [whiskyId]: { ...existing, ...patch } };
    set("overrides", next);
  };
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={hintStyle}>Reihenfolge und Punkte automatisch. Pro Eintrag kannst du eine KI-Kurzkritik hinterlegen.</div>
      <label style={labelStyle}>
        <span>Eyebrow</span>
        <input type="text" value={payload.eyebrow ?? ""} onChange={(e) => set("eyebrow", e.target.value)} style={inputStyle} data-testid="input-ranking-eyebrow" />
      </label>
      <label style={labelStyle}>
        <span>Überschrift</span>
        <input type="text" value={payload.heading ?? ""} onChange={(e) => set("heading", e.target.value)} style={inputStyle} data-testid="input-ranking-heading" />
      </label>
      <label style={labelStyle}>
        <span>Reihenfolge</span>
        <select value={payload.order} onChange={(e) => set("order", e.target.value as Payload["order"])} style={inputStyle} data-testid="select-ranking-order">
          <option value="countdown">Countdown (Letzter zuerst)</option>
          <option value="topdown">Topdown (Sieger zuerst)</option>
        </select>
      </label>
      <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", display: "flex", gap: 8 }}>
        <input type="checkbox" checked={!!payload.hideUnrated} onChange={(e) => set("hideUnrated", e.target.checked)} data-testid="checkbox-ranking-hide-unrated" />
        <span>Unbewertete ausblenden</span>
      </label>
      {ranking.length === 0 ? (
        <div style={hintStyle}>Keine Ranking-Daten verfügbar.</div>
      ) : (
        <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
          <div style={{ fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", color: "#A89A85" }}>KI-Kurzkritiken</div>
          {ranking.map((entry) => {
            const ov = payload.overrides?.[entry.whiskyId] ?? { commentary: "" };
            return (
              <div key={entry.whiskyId} style={overrideRow}>
                <div style={{ fontSize: 12, color: "#F5EDE0", marginBottom: 4 }}>{entry.position}. {entry.name}</div>
                <textarea
                  placeholder="z.B. Sherrybombe mit Eleganz im Finish."
                  value={ov.commentary ?? ""}
                  onChange={(e) => updateOverride(entry.whiskyId, { commentary: e.target.value })}
                  style={{ ...inputStyle, minHeight: 50 }}
                  data-testid={`input-ranking-commentary-${entry.whiskyId}`}
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

export const rankingListBlock: BlockDefinition<Payload> = {
  type: "ranking-list",
  label: "Ranking-Liste",
  description: "Whisky-für-Whisky Ranking mit Punkten und KI-Kurzkritiken.",
  category: "tasting",
  defaultPayload: () => ({
    eyebrow: "Ranking",
    heading: "Wie ihr gewertet habt",
    order: "countdown",
    hideUnrated: true,
    overrides: {},
  }),
  payloadSchema,
  Renderer,
  EditorPanel,
};

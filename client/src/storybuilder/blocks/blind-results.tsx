import { z } from "zod";
import type { BlockDefinition, BlockEditorPanelProps, BlockRendererProps } from "../core/types";
import { useTastingStoryData } from "../data/TastingStoryDataContext";

const overrideSchema = z.object({
  narration: z.string().optional().default(""),
});

const payloadSchema = z.object({
  eyebrow: z.string().optional().default("Blindverkostung"),
  heading: z.string().optional().default("Wer lag wie nah dran?"),
  showAllGuesses: z.boolean().optional().default(true),
  overrides: z.record(overrideSchema).optional().default({}),
});

type Payload = z.infer<typeof payloadSchema>;

function Renderer({ payload, theme }: BlockRendererProps<Payload>) {
  const data = useTastingStoryData();
  const blind = data?.blindResults ?? null;

  if (!blind || blind.length === 0) {
    return (
      <section data-testid="block-blind-results-empty" style={{ padding: "4rem 2rem", textAlign: "center", color: theme.colors.inkFaint, fontFamily: theme.fonts.serif, fontStyle: "italic" }}>
        Keine Blindverkostungs-Daten vorhanden.
      </section>
    );
  }

  return (
    <section
      data-testid="block-blind-results"
      style={{ padding: "clamp(3rem, 8vw, 6rem) 2rem", maxWidth: 1000, margin: "0 auto" }}
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
      <div style={{ display: "grid", gap: "1.6rem" }}>
        {blind.map((entry) => {
          const ov = payload.overrides?.[entry.whiskyId];
          const narration = ov?.narration && ov.narration.trim().length > 0 ? ov.narration : null;
          const closest = entry.guesses.find((g) => g.participantId === entry.closestParticipantId);
          return (
            <article
              key={entry.whiskyId}
              data-testid={`blind-result-${entry.whiskyId}`}
              style={{
                background: theme.colors.bgLift,
                border: `1px solid ${theme.colors.amberDim}`,
                borderRadius: 6,
                padding: "1.4rem 1.6rem",
                display: "grid",
                gap: "1rem",
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                <h3 data-testid={`text-blind-name-${entry.whiskyId}`} style={{ fontFamily: theme.fonts.serif, fontSize: "1.3rem", color: theme.colors.ink, margin: 0 }}>
                  {entry.whiskyName}
                </h3>
                <div style={{ fontFamily: theme.fonts.sans, fontSize: ".7rem", letterSpacing: ".3em", textTransform: "uppercase", color: theme.colors.amber }}>
                  {entry.actualAbv !== null ? `Tatsächlich ${entry.actualAbv}% ABV` : "ABV unbekannt"}
                </div>
              </div>
              {closest ? (
                <div
                  data-testid={`text-blind-closest-${entry.whiskyId}`}
                  style={{
                    fontFamily: theme.fonts.serif,
                    fontStyle: "italic",
                    fontSize: "1.05rem",
                    color: theme.colors.ink,
                  }}
                >
                  Am nächsten dran: <strong style={{ color: theme.colors.amber, fontStyle: "normal" }}>{closest.participantName}</strong>
                  {closest.guessAbv !== null ? ` mit ${closest.guessAbv}%` : ""}
                  {closest.deltaAbv !== null ? ` (${closest.deltaAbv === 0 ? "perfekt" : `Δ ${closest.deltaAbv.toFixed(1)}%`})` : ""}
                </div>
              ) : null}
              {payload.showAllGuesses && entry.guesses.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gap: 6,
                    fontFamily: theme.fonts.sans,
                    fontSize: ".85rem",
                    color: theme.colors.inkDim,
                  }}
                >
                  {entry.guesses.map((g) => (
                    <div
                      key={g.participantId}
                      data-testid={`blind-guess-${entry.whiskyId}-${g.participantId}`}
                      style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, padding: "4px 0", borderBottom: `1px solid ${theme.colors.amberDim}` }}
                    >
                      <span style={{ color: g.participantId === entry.closestParticipantId ? theme.colors.amber : theme.colors.inkDim }}>{g.participantName}</span>
                      <span>{g.guessAbv !== null ? `${g.guessAbv}%` : "—"}</span>
                      <span style={{ color: theme.colors.inkFaint }}>{g.deltaAbv !== null ? `Δ ${g.deltaAbv.toFixed(1)}` : "—"}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {narration ? (
                <p
                  data-testid={`text-blind-narration-${entry.whiskyId}`}
                  style={{
                    fontFamily: theme.fonts.serif,
                    fontStyle: "italic",
                    fontSize: ".95rem",
                    color: theme.colors.inkDim,
                    margin: 0,
                    lineHeight: 1.5,
                    borderTop: `1px solid ${theme.colors.amberDim}`,
                    paddingTop: 10,
                  }}
                >
                  {narration}
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
  const blind = data?.blindResults ?? [];
  const updateOverride = (whiskyId: string, patch: Partial<{ narration: string }>) => {
    const cur = payload.overrides ?? {};
    const existing = cur[whiskyId] ?? { narration: "" };
    const next = { ...cur, [whiskyId]: { ...existing, ...patch } };
    set("overrides", next);
  };
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={hintStyle}>Tipps und Treffer kommen automatisch aus den Bewertungsdaten (Blindmodus).</div>
      <label style={labelStyle}>
        <span>Eyebrow</span>
        <input type="text" value={payload.eyebrow ?? ""} onChange={(e) => set("eyebrow", e.target.value)} style={inputStyle} data-testid="input-blind-eyebrow" />
      </label>
      <label style={labelStyle}>
        <span>Überschrift</span>
        <input type="text" value={payload.heading ?? ""} onChange={(e) => set("heading", e.target.value)} style={inputStyle} data-testid="input-blind-heading" />
      </label>
      <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", display: "flex", gap: 8 }}>
        <input type="checkbox" checked={!!payload.showAllGuesses} onChange={(e) => set("showAllGuesses", e.target.checked)} data-testid="checkbox-blind-show-all" />
        <span>Alle Tipps anzeigen</span>
      </label>
      {blind.length === 0 ? (
        <div style={hintStyle}>Keine Blind-Daten verfügbar.</div>
      ) : (
        <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
          <div style={{ fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", color: "#A89A85" }}>KI-Erzählungen pro Whisky</div>
          {blind.map((entry) => {
            const ov = payload.overrides?.[entry.whiskyId] ?? { narration: "" };
            return (
              <div key={entry.whiskyId} style={overrideRow}>
                <div style={{ fontSize: 12, color: "#F5EDE0", marginBottom: 4 }}>{entry.whiskyName}</div>
                <textarea
                  placeholder="z.B. Niemand kam unter 5% Abweichung — der Sherrycask hat alle getäuscht."
                  value={ov.narration ?? ""}
                  onChange={(e) => updateOverride(entry.whiskyId, { narration: e.target.value })}
                  style={{ ...inputStyle, minHeight: 50 }}
                  data-testid={`input-blind-narration-${entry.whiskyId}`}
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

export const blindResultsBlock: BlockDefinition<Payload> = {
  type: "blind-results",
  label: "Blindverkostung",
  description: "Wer lag mit ABV-Tipps am nächsten dran? Mit KI-Narration pro Whisky.",
  category: "tasting",
  defaultPayload: () => ({
    eyebrow: "Blindverkostung",
    heading: "Wer lag wie nah dran?",
    showAllGuesses: true,
    overrides: {},
  }),
  payloadSchema,
  Renderer,
  EditorPanel,
};

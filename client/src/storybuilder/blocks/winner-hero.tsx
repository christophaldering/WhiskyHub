import { z } from "zod";
import type { BlockDefinition, BlockEditorPanelProps, BlockRendererProps } from "../core/types";
import { useTastingStoryData } from "../data/TastingStoryDataContext";

const payloadSchema = z.object({
  eyebrow: z.string().optional().default("Sieger des Abends"),
  headingOverride: z.string().optional().default(""),
  subtitleOverride: z.string().optional().default(""),
  closingLine: z.string().optional().default(""),
  scoreOverride: z.string().optional().default(""),
  imageOverrideUrl: z.string().optional().default(""),
  ctaLabel: z.string().optional().default(""),
  ctaHref: z.string().optional().default(""),
});

type Payload = z.infer<typeof payloadSchema>;

function Renderer({ payload, theme }: BlockRendererProps<Payload>) {
  const data = useTastingStoryData();
  const winner = data?.winner ?? null;
  const heading = (payload.headingOverride && payload.headingOverride.trim().length > 0)
    ? payload.headingOverride
    : (winner?.name ?? "Noch kein Sieger ermittelt");
  const subtitle = (payload.subtitleOverride && payload.subtitleOverride.trim().length > 0)
    ? payload.subtitleOverride
    : (winner?.distillery ?? "");
  const score = (payload.scoreOverride && payload.scoreOverride.trim().length > 0)
    ? payload.scoreOverride
    : (winner?.avgScore !== null && winner?.avgScore !== undefined ? `${winner.avgScore.toFixed(1)} Punkte` : "");
  const image = (payload.imageOverrideUrl && payload.imageOverrideUrl.trim().length > 0)
    ? payload.imageOverrideUrl
    : (winner?.imageUrl ?? "");
  const closingLine = payload.closingLine ?? "";

  return (
    <section
      data-testid="block-winner-hero"
      style={{
        position: "relative",
        padding: "clamp(4rem, 12vw, 8rem) 2rem",
        background: `linear-gradient(180deg, ${theme.colors.bg} 0%, ${theme.colors.bgLift} 100%)`,
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      {theme.effects.grain ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/></svg>\")",
            opacity: 0.05,
            pointerEvents: "none",
          }}
        />
      ) : null}
      <div style={{ position: "relative", maxWidth: 920, margin: "0 auto", display: "grid", gap: "clamp(1.5rem, 3vw, 2.5rem)", justifyItems: "center" }}>
        {payload.eyebrow ? (
          <div
            style={{
              fontFamily: theme.fonts.sans,
              fontSize: ".75rem",
              letterSpacing: ".5em",
              textTransform: "uppercase",
              color: theme.colors.amber,
            }}
          >
            {payload.eyebrow}
          </div>
        ) : null}
        {image ? (
          <div
            style={{
              width: "min(280px, 60vw)",
              aspectRatio: "3 / 4",
              backgroundImage: `url(${image})`,
              backgroundSize: "contain",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              filter: `drop-shadow(0 24px 48px rgba(0,0,0,0.55)) drop-shadow(0 0 36px ${theme.colors.amber}33)`,
            }}
            data-testid="img-winner-bottle"
          />
        ) : null}
        <h1
          data-testid="text-winner-name"
          style={{
            fontFamily: theme.fonts.serif,
            fontSize: "clamp(2.4rem, 6vw, 4rem)",
            color: theme.colors.ink,
            margin: 0,
            fontWeight: 400,
            letterSpacing: "-.02em",
            lineHeight: 1.05,
          }}
        >
          {heading}
        </h1>
        {subtitle ? (
          <div
            data-testid="text-winner-subtitle"
            style={{
              fontFamily: theme.fonts.serif,
              fontStyle: "italic",
              color: theme.colors.inkDim,
              fontSize: "clamp(1.1rem, 2vw, 1.4rem)",
            }}
          >
            {subtitle}
          </div>
        ) : null}
        {score ? (
          <div
            data-testid="text-winner-score"
            style={{
              fontFamily: theme.fonts.sans,
              fontSize: ".8rem",
              letterSpacing: ".4em",
              textTransform: "uppercase",
              color: theme.colors.amber,
              border: `1px solid ${theme.colors.amber}`,
              padding: "8px 18px",
              borderRadius: 999,
            }}
          >
            {score}
            {winner?.voters ? ` · ${winner.voters} ${winner.voters === 1 ? "Stimme" : "Stimmen"}` : ""}
          </div>
        ) : null}
        {closingLine ? (
          <p
            data-testid="text-winner-closing-line"
            style={{
              fontFamily: theme.fonts.serif,
              fontSize: "clamp(1.1rem, 2.2vw, 1.5rem)",
              color: theme.colors.inkDim,
              maxWidth: 640,
              margin: 0,
              fontStyle: "italic",
              lineHeight: 1.5,
            }}
          >
            {closingLine}
          </p>
        ) : null}
        {payload.ctaLabel && payload.ctaHref ? (
          <a
            href={payload.ctaHref}
            data-testid="link-winner-cta"
            style={{
              fontFamily: theme.fonts.sans,
              fontSize: ".75rem",
              letterSpacing: ".3em",
              textTransform: "uppercase",
              color: theme.colors.bg,
              background: theme.colors.amber,
              padding: "12px 28px",
              borderRadius: 4,
              textDecoration: "none",
            }}
          >
            {payload.ctaLabel}
          </a>
        ) : null}
      </div>
    </section>
  );
}

function EditorPanel({ payload, onChange }: BlockEditorPanelProps<Payload>) {
  const set = <K extends keyof Payload>(key: K, value: Payload[K]) => onChange({ ...payload, [key]: value });
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={hintStyle}>Sieger, Punkte und Bild kommen automatisch aus den Tasting-Daten. Felder hier überschreiben das.</div>
      <label style={labelStyle}>
        <span>Eyebrow</span>
        <input type="text" value={payload.eyebrow ?? ""} onChange={(e) => set("eyebrow", e.target.value)} style={inputStyle} data-testid="input-winner-eyebrow" />
      </label>
      <label style={labelStyle}>
        <span>Titel-Überschreibung</span>
        <input type="text" value={payload.headingOverride ?? ""} onChange={(e) => set("headingOverride", e.target.value)} style={inputStyle} placeholder="Auto: Whisky-Name" data-testid="input-winner-heading" />
      </label>
      <label style={labelStyle}>
        <span>Untertitel-Überschreibung</span>
        <input type="text" value={payload.subtitleOverride ?? ""} onChange={(e) => set("subtitleOverride", e.target.value)} style={inputStyle} placeholder="Auto: Destillerie" data-testid="input-winner-subtitle" />
      </label>
      <label style={labelStyle}>
        <span>Punkte-Überschreibung</span>
        <input type="text" value={payload.scoreOverride ?? ""} onChange={(e) => set("scoreOverride", e.target.value)} style={inputStyle} placeholder="Auto: ø Punkte" data-testid="input-winner-score" />
      </label>
      <label style={labelStyle}>
        <span>KI-Schlusszeile</span>
        <textarea value={payload.closingLine ?? ""} onChange={(e) => set("closingLine", e.target.value)} style={{ ...inputStyle, minHeight: 60 }} data-testid="input-winner-closing-line" />
      </label>
      <label style={labelStyle}>
        <span>Bild-URL (überschreibt Auto)</span>
        <input type="url" value={payload.imageOverrideUrl ?? ""} onChange={(e) => set("imageOverrideUrl", e.target.value)} style={inputStyle} data-testid="input-winner-image" />
      </label>
      <label style={labelStyle}>
        <span>CTA-Label</span>
        <input type="text" value={payload.ctaLabel ?? ""} onChange={(e) => set("ctaLabel", e.target.value)} style={inputStyle} data-testid="input-winner-cta-label" />
      </label>
      <label style={labelStyle}>
        <span>CTA-Link</span>
        <input type="url" value={payload.ctaHref ?? ""} onChange={(e) => set("ctaHref", e.target.value)} style={inputStyle} data-testid="input-winner-cta-href" />
      </label>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "grid", gap: 4, fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12, color: "#A89A85" };
const inputStyle: React.CSSProperties = { background: "rgba(201,169,97,0.06)", border: "1px solid rgba(201,169,97,0.25)", borderRadius: 4, padding: "8px 10px", color: "#F5EDE0", fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, outline: "none" };
const hintStyle: React.CSSProperties = { fontSize: 11, color: "#6B5F4F", padding: "8px 10px", background: "rgba(201,169,97,0.04)", border: "1px dashed rgba(201,169,97,0.15)", borderRadius: 4 };

export const winnerHeroBlock: BlockDefinition<Payload> = {
  type: "winner-hero",
  label: "Sieger-Hero",
  description: "Großer Auftritt für den Sieger des Abends mit Bild, Punkten und KI-Schlusszeile.",
  category: "tasting",
  defaultPayload: () => ({
    eyebrow: "Sieger des Abends",
    headingOverride: "",
    subtitleOverride: "",
    closingLine: "",
    scoreOverride: "",
    imageOverrideUrl: "",
    ctaLabel: "",
    ctaHref: "",
  }),
  payloadSchema,
  Renderer,
  EditorPanel,
};

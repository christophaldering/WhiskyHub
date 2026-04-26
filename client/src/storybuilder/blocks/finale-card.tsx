import { z } from "zod";
import type { BlockDefinition, BlockEditorPanelProps, BlockRendererProps } from "../core/types";
import { useTastingStoryData } from "../data/TastingStoryDataContext";

const payloadSchema = z.object({
  eyebrow: z.string().optional().default("Finale"),
  heading: z.string().optional().default("Auf den nächsten Dram."),
  closingLine: z.string().optional().default(""),
  signatureLine: z.string().optional().default(""),
  hostPhotoUrl: z.string().optional().default(""),
});

type Payload = z.infer<typeof payloadSchema>;

function formatDateForFinale(input: string | null): string {
  if (!input) return "";
  try {
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return input;
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return input;
  }
}

function Renderer({ payload, theme }: BlockRendererProps<Payload>) {
  const data = useTastingStoryData();
  const whiskies = data?.whiskies ?? [];
  const dateLabel = data?.meta?.date ? formatDateForFinale(data.meta.date) : "";
  const location = data?.meta?.location ?? "";
  const title = data?.meta?.title ?? "";
  return (
    <section
      data-testid="block-finale-card"
      style={{
        position: "relative",
        padding: "clamp(4rem, 10vw, 7rem) 2rem",
        background: theme.colors.bgLift,
        borderTop: `1px solid ${theme.colors.amberDim}`,
        borderBottom: `1px solid ${theme.colors.amberDim}`,
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
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
            opacity: 0.04,
            pointerEvents: "none",
          }}
        />
      ) : null}
      <div style={{ position: "relative", maxWidth: 1100, margin: "0 auto", display: "grid", gap: "clamp(1.5rem, 3vw, 2.5rem)", justifyItems: "center", textAlign: "center" }}>
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
        {payload.heading ? (
          <h2
            data-testid="text-finale-heading"
            style={{
              fontFamily: theme.fonts.serif,
              fontSize: "clamp(2rem, 5vw, 3.2rem)",
              color: theme.colors.ink,
              margin: 0,
              fontWeight: 400,
              letterSpacing: "-.02em",
              lineHeight: 1.1,
            }}
          >
            {payload.heading}
          </h2>
        ) : null}
        {payload.hostPhotoUrl ? (
          <div
            data-testid="img-finale-host"
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              backgroundImage: `url(${payload.hostPhotoUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              border: `2px solid ${theme.colors.amber}`,
              boxShadow: `0 12px 30px rgba(0,0,0,0.4)`,
            }}
          />
        ) : null}
        {whiskies.length > 0 ? (
          <div
            data-testid="finale-whisky-strip"
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "clamp(1rem, 2vw, 2rem)",
              marginTop: 12,
              opacity: 0.85,
            }}
          >
            {whiskies.map((w) => (
              <div
                key={w.id}
                data-testid={`finale-bottle-${w.id}`}
                style={{
                  width: 70,
                  height: 110,
                  backgroundImage: w.imageUrl ? `url(${w.imageUrl})` : "none",
                  backgroundSize: "contain",
                  backgroundPosition: "center bottom",
                  backgroundRepeat: "no-repeat",
                  backgroundColor: w.imageUrl ? "transparent" : "rgba(201,169,97,0.08)",
                  filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.45))",
                  borderRadius: w.imageUrl ? 0 : 6,
                }}
                title={w.name}
              />
            ))}
          </div>
        ) : null}
        {payload.closingLine ? (
          <p
            data-testid="text-finale-closing-line"
            style={{
              fontFamily: theme.fonts.serif,
              fontSize: "clamp(1.2rem, 2.4vw, 1.6rem)",
              fontStyle: "italic",
              color: theme.colors.inkDim,
              maxWidth: 720,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {payload.closingLine}
          </p>
        ) : null}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "1rem 2rem", marginTop: "1rem" }}>
          {title ? (
            <div data-testid="text-finale-tasting-title" style={metaItem(theme)}>
              {title}
            </div>
          ) : null}
          {dateLabel ? (
            <div data-testid="text-finale-date" style={metaItem(theme)}>
              {dateLabel}
            </div>
          ) : null}
          {location ? (
            <div data-testid="text-finale-location" style={metaItem(theme)}>
              {location}
            </div>
          ) : null}
        </div>
        <div
          data-testid="text-finale-signature"
          style={{
            fontFamily: theme.fonts.sans,
            fontSize: ".7rem",
            letterSpacing: ".4em",
            textTransform: "uppercase",
            color: theme.colors.inkFaint,
            marginTop: "1rem",
          }}
        >
          {payload.signatureLine && payload.signatureLine.trim().length > 0 ? payload.signatureLine : "CaskSense Labs"}
        </div>
      </div>
    </section>
  );
}

function metaItem(theme: { fonts: { sans: string }; colors: { inkDim: string; amber: string } }): React.CSSProperties {
  return {
    fontFamily: theme.fonts.sans,
    fontSize: ".7rem",
    letterSpacing: ".25em",
    textTransform: "uppercase",
    color: theme.colors.inkDim,
    borderLeft: `2px solid ${theme.colors.amber}`,
    paddingLeft: 12,
  };
}

function EditorPanel({ payload, onChange }: BlockEditorPanelProps<Payload>) {
  const set = <K extends keyof Payload>(key: K, value: Payload[K]) => onChange({ ...payload, [key]: value });
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={hintStyle}>Datum, Ort und Bottle-Strip kommen automatisch aus dem Tasting.</div>
      <label style={labelStyle}>
        <span>Eyebrow</span>
        <input type="text" value={payload.eyebrow ?? ""} onChange={(e) => set("eyebrow", e.target.value)} style={inputStyle} data-testid="input-finale-eyebrow" />
      </label>
      <label style={labelStyle}>
        <span>Überschrift</span>
        <input type="text" value={payload.heading ?? ""} onChange={(e) => set("heading", e.target.value)} style={inputStyle} data-testid="input-finale-heading" />
      </label>
      <label style={labelStyle}>
        <span>KI-Schlusszeile</span>
        <textarea value={payload.closingLine ?? ""} onChange={(e) => set("closingLine", e.target.value)} style={{ ...inputStyle, minHeight: 60 }} data-testid="input-finale-closing-line" />
      </label>
      <label style={labelStyle}>
        <span>Signatur (Standard: CaskSense Labs)</span>
        <input type="text" value={payload.signatureLine ?? ""} onChange={(e) => set("signatureLine", e.target.value)} style={inputStyle} data-testid="input-finale-signature" />
      </label>
      <label style={labelStyle}>
        <span>Foto-URL (Host/Gruppe)</span>
        <input type="url" value={payload.hostPhotoUrl ?? ""} onChange={(e) => set("hostPhotoUrl", e.target.value)} style={inputStyle} data-testid="input-finale-host-photo" />
      </label>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "grid", gap: 4, fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12, color: "#A89A85" };
const inputStyle: React.CSSProperties = { background: "rgba(201,169,97,0.06)", border: "1px solid rgba(201,169,97,0.25)", borderRadius: 4, padding: "8px 10px", color: "#F5EDE0", fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, outline: "none" };
const hintStyle: React.CSSProperties = { fontSize: 11, color: "#6B5F4F", padding: "8px 10px", background: "rgba(201,169,97,0.04)", border: "1px dashed rgba(201,169,97,0.15)", borderRadius: 4 };

export const finaleCardBlock: BlockDefinition<Payload> = {
  type: "finale-card",
  label: "Finale-Karte",
  description: "Abschluss mit allen Bottles, Datum, Ort und KI-Verabschiedung.",
  category: "tasting",
  defaultPayload: () => ({
    eyebrow: "Finale",
    heading: "Auf den nächsten Dram.",
    closingLine: "",
    signatureLine: "",
    hostPhotoUrl: "",
  }),
  payloadSchema,
  Renderer,
  EditorPanel,
};

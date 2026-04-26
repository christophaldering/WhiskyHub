import { z } from "zod";
import type { BlockDefinition, BlockEditorPanelProps, BlockRendererProps } from "../core/types";
import { safeUrl } from "../editor/RichTextEditor";
import { ImageUploadField } from "../editor/ImageUploadField";

const payloadSchema = z.object({
  eyebrow: z.string().optional().default(""),
  title: z.string().default("Titel"),
  subtitle: z.string().optional().default(""),
  meta: z.string().optional().default(""),
  imageUrl: z.string().optional().default(""),
  alignment: z.enum(["left", "center"]).default("center"),
  ctaLabel: z.string().optional().default(""),
  ctaHref: z.string().optional().default(""),
  ctaVariant: z.enum(["primary", "outline"]).optional().default("primary"),
  ctaSecondaryLabel: z.string().optional().default(""),
  ctaSecondaryHref: z.string().optional().default(""),
});

type Payload = z.infer<typeof payloadSchema>;

function Renderer({ payload, theme, mode }: BlockRendererProps<Payload>) {
  const isPrint = mode === "print";
  return (
    <section
      data-testid="block-hero-cover"
      style={{
        position: "relative",
        minHeight: isPrint ? "auto" : "100vh",
        display: "flex",
        alignItems: "flex-end",
        padding: isPrint ? "2rem 0" : "0 2rem 8vw",
        overflow: "hidden",
        textAlign: payload.alignment,
      }}
    >
      {safeUrl(payload.imageUrl) ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            backgroundImage: `linear-gradient(to bottom, rgba(11,9,6,0.3) 0%, rgba(11,9,6,0.6) 60%, ${theme.colors.bg} 100%), url("${safeUrl(payload.imageUrl).replace(/"/g, "%22")}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "brightness(0.75) contrast(1.05)",
          }}
        />
      ) : (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            background: `linear-gradient(160deg, ${theme.colors.bgLift} 0%, ${theme.colors.bg} 100%)`,
          }}
        />
      )}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 900,
          margin: "0 auto",
          width: "100%",
          textAlign: payload.alignment,
        }}
      >
        {payload.eyebrow ? (
          <div
            style={{
              fontFamily: theme.fonts.sans,
              fontSize: ".75rem",
              letterSpacing: ".3em",
              textTransform: "uppercase",
              color: theme.colors.amber,
              marginBottom: "1.5rem",
            }}
          >
            {payload.eyebrow}
          </div>
        ) : null}
        <h1
          style={{
            fontFamily: theme.fonts.serif,
            fontSize: "clamp(3rem, 10vw, 7rem)",
            lineHeight: 0.95,
            fontWeight: 500,
            letterSpacing: "-.03em",
            color: theme.colors.ink,
            margin: 0,
            marginBottom: payload.subtitle ? "1rem" : 0,
          }}
        >
          {payload.title}
        </h1>
        {payload.subtitle ? (
          <p
            style={{
              fontFamily: theme.fonts.serif,
              fontStyle: "italic",
              fontSize: "clamp(1.1rem, 2vw, 1.5rem)",
              color: theme.colors.inkDim,
              margin: 0,
              marginBottom: payload.meta ? "1.5rem" : 0,
            }}
          >
            {payload.subtitle}
          </p>
        ) : null}
        {payload.meta ? (
          <div
            style={{
              fontFamily: theme.fonts.sans,
              fontSize: ".7rem",
              letterSpacing: ".25em",
              textTransform: "uppercase",
              color: theme.colors.inkFaint,
              marginTop: "1.5rem",
            }}
          >
            {payload.meta}
          </div>
        ) : null}
        {(payload.ctaLabel && safeUrl(payload.ctaHref ?? "")) || (payload.ctaSecondaryLabel && safeUrl(payload.ctaSecondaryHref ?? "")) ? (
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: "2rem",
              justifyContent: payload.alignment === "center" ? "center" : "flex-start",
              flexWrap: "wrap",
            }}
          >
            {payload.ctaLabel && safeUrl(payload.ctaHref ?? "") ? (
              <a
                href={safeUrl(payload.ctaHref ?? "")}
                data-testid="link-hero-cta-primary"
                style={{
                  display: "inline-block",
                  background: payload.ctaVariant === "outline" ? "transparent" : theme.colors.amber,
                  color: payload.ctaVariant === "outline" ? theme.colors.amber : "#0B0906",
                  border: `1px solid ${theme.colors.amber}`,
                  padding: "12px 28px",
                  fontFamily: theme.fonts.sans,
                  fontSize: ".75rem",
                  fontWeight: 600,
                  letterSpacing: ".25em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  borderRadius: 3,
                }}
              >
                {payload.ctaLabel}
              </a>
            ) : null}
            {payload.ctaSecondaryLabel && safeUrl(payload.ctaSecondaryHref ?? "") ? (
              <a
                href={safeUrl(payload.ctaSecondaryHref ?? "")}
                data-testid="link-hero-cta-secondary"
                style={{
                  display: "inline-block",
                  background: "transparent",
                  color: theme.colors.ink,
                  border: `1px solid ${theme.colors.amberDim}`,
                  padding: "12px 28px",
                  fontFamily: theme.fonts.sans,
                  fontSize: ".75rem",
                  fontWeight: 500,
                  letterSpacing: ".25em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  borderRadius: 3,
                }}
              >
                {payload.ctaSecondaryLabel}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function EditorPanel({ payload, onChange }: BlockEditorPanelProps<Payload>) {
  const set = <K extends keyof Payload>(key: K, value: Payload[K]) => onChange({ ...payload, [key]: value });
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <label style={labelStyle}>
        <span>Eyebrow (kleine Zeile oben)</span>
        <input
          type="text"
          value={payload.eyebrow ?? ""}
          onChange={(e) => set("eyebrow", e.target.value)}
          style={inputStyle}
          data-testid="input-hero-eyebrow"
        />
      </label>
      <label style={labelStyle}>
        <span>Titel</span>
        <input
          type="text"
          value={payload.title}
          onChange={(e) => set("title", e.target.value)}
          style={inputStyle}
          data-testid="input-hero-title"
        />
      </label>
      <label style={labelStyle}>
        <span>Untertitel</span>
        <input
          type="text"
          value={payload.subtitle ?? ""}
          onChange={(e) => set("subtitle", e.target.value)}
          style={inputStyle}
          data-testid="input-hero-subtitle"
        />
      </label>
      <label style={labelStyle}>
        <span>Meta-Zeile (Datum, Ort, etc.)</span>
        <input
          type="text"
          value={payload.meta ?? ""}
          onChange={(e) => set("meta", e.target.value)}
          style={inputStyle}
          data-testid="input-hero-meta"
        />
      </label>
      <ImageUploadField
        value={payload.imageUrl ?? ""}
        onChange={(url) => set("imageUrl", url)}
        label="Hintergrundbild"
        testId="hero-image"
      />
      <label style={labelStyle}>
        <span>Ausrichtung</span>
        <select
          value={payload.alignment}
          onChange={(e) => set("alignment", e.target.value === "left" ? "left" : "center")}
          style={inputStyle}
          data-testid="select-hero-alignment"
        >
          <option value="center">Zentriert</option>
          <option value="left">Linksbündig</option>
        </select>
      </label>
      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Primärer CTA</legend>
        <label style={labelStyle}>
          <span>Label</span>
          <input
            type="text"
            value={payload.ctaLabel ?? ""}
            onChange={(e) => set("ctaLabel", e.target.value)}
            placeholder="Jetzt starten"
            style={inputStyle}
            data-testid="input-hero-cta-label"
          />
        </label>
        <label style={labelStyle}>
          <span>Ziel-URL</span>
          <input
            type="text"
            value={payload.ctaHref ?? ""}
            onChange={(e) => set("ctaHref", e.target.value)}
            placeholder="/labs/tastings"
            style={inputStyle}
            data-testid="input-hero-cta-href"
          />
        </label>
        <label style={labelStyle}>
          <span>Variante</span>
          <select
            value={payload.ctaVariant ?? "primary"}
            onChange={(e) => set("ctaVariant", e.target.value === "outline" ? "outline" : "primary")}
            style={inputStyle}
            data-testid="select-hero-cta-variant"
          >
            <option value="primary">Solid (Amber)</option>
            <option value="outline">Outline</option>
          </select>
        </label>
      </fieldset>
      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Sekundärer CTA</legend>
        <label style={labelStyle}>
          <span>Label</span>
          <input
            type="text"
            value={payload.ctaSecondaryLabel ?? ""}
            onChange={(e) => set("ctaSecondaryLabel", e.target.value)}
            placeholder="Mehr erfahren"
            style={inputStyle}
            data-testid="input-hero-cta-secondary-label"
          />
        </label>
        <label style={labelStyle}>
          <span>Ziel-URL</span>
          <input
            type="text"
            value={payload.ctaSecondaryHref ?? ""}
            onChange={(e) => set("ctaSecondaryHref", e.target.value)}
            placeholder="/about"
            style={inputStyle}
            data-testid="input-hero-cta-secondary-href"
          />
        </label>
      </fieldset>
    </div>
  );
}

const fieldsetStyle: React.CSSProperties = {
  border: "1px solid rgba(201,169,97,0.15)",
  borderRadius: 4,
  padding: "8px 10px 10px",
  display: "grid",
  gap: 8,
  margin: 0,
};

const legendStyle: React.CSSProperties = {
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: 10,
  letterSpacing: ".25em",
  textTransform: "uppercase",
  color: "#C9A961",
  padding: "0 4px",
};

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
  fontSize: 14,
  outline: "none",
};

export const heroCoverBlock: BlockDefinition<Payload> = {
  type: "hero-cover",
  label: "Cover-Hero",
  description: "Vollbild-Titel mit optionalem Hintergrundbild.",
  category: "generic",
  defaultPayload: () => ({ eyebrow: "", title: "Titel", subtitle: "", meta: "", imageUrl: "", alignment: "center", ctaLabel: "", ctaHref: "", ctaVariant: "primary", ctaSecondaryLabel: "", ctaSecondaryHref: "" }),
  payloadSchema,
  Renderer,
  EditorPanel,
};

import { z } from "zod";
import type { BlockDefinition, BlockEditorPanelProps, BlockRendererProps } from "../core/types";
import { safeUrl } from "../editor/RichTextEditor";
import { ImageUploadField } from "../editor/ImageUploadField";

const payloadSchema = z.object({
  imageUrl: z.string().default(""),
  alt: z.string().default(""),
  caption: z.string().optional().default(""),
  aspect: z.enum(["wide", "tall", "auto"]).default("wide"),
});

type Payload = z.infer<typeof payloadSchema>;

function Renderer({ payload, theme }: BlockRendererProps<Payload>) {
  const safeSrc = safeUrl(payload.imageUrl);
  if (!safeSrc) {
    return (
      <section
        data-testid="block-full-width-image-empty"
        style={{
          padding: "4rem 2rem",
          maxWidth: 900,
          margin: "0 auto",
          textAlign: "center",
          fontFamily: theme.fonts.sans,
          color: theme.colors.inkFaint,
          border: `1px dashed ${theme.colors.amberDim}`,
          borderRadius: 4,
        }}
      >
        Noch kein Bild gewählt
      </section>
    );
  }
  const aspectRatio = payload.aspect === "wide" ? "16 / 9" : payload.aspect === "tall" ? "3 / 4" : "auto";
  return (
    <section
      data-testid="block-full-width-image"
      style={{
        padding: "clamp(2rem, 5vw, 4rem) 0",
      }}
    >
      <figure style={{ margin: 0 }}>
        <img
          src={safeSrc}
          alt={payload.alt}
          loading="lazy"
          decoding="async"
          style={{
            width: "100%",
            display: "block",
            objectFit: "cover",
            aspectRatio,
            boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
          }}
        />
        {payload.caption ? (
          <figcaption
            style={{
              fontFamily: theme.fonts.serif,
              fontStyle: "italic",
              fontSize: "0.9rem",
              color: theme.colors.inkFaint,
              textAlign: "center",
              marginTop: "1rem",
              padding: "0 2rem",
            }}
          >
            {payload.caption}
          </figcaption>
        ) : null}
      </figure>
    </section>
  );
}

function EditorPanel({ payload, onChange }: BlockEditorPanelProps<Payload>) {
  const set = <K extends keyof Payload>(key: K, value: Payload[K]) => onChange({ ...payload, [key]: value });
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <ImageUploadField
        value={payload.imageUrl}
        onChange={(url) => set("imageUrl", url)}
        label="Bild"
        testId="full-width-image"
      />
      <label style={labelStyle}>
        <span>Alt-Text (Barrierefreiheit, Pflicht)</span>
        <input
          type="text"
          value={payload.alt}
          onChange={(e) => set("alt", e.target.value)}
          style={inputStyle}
          aria-required="true"
          aria-invalid={payload.imageUrl.length > 0 && payload.alt.trim().length === 0 ? true : undefined}
          data-testid="input-image-alt"
        />
        {payload.imageUrl.length > 0 && payload.alt.trim().length === 0 ? (
          <span style={altWarnStyle} data-testid="warn-image-alt">
            Bitte Alt-Text ergänzen, sonst ist das Bild für Screenreader unsichtbar.
          </span>
        ) : null}
      </label>
      <label style={labelStyle}>
        <span>Bildunterschrift</span>
        <input
          type="text"
          value={payload.caption ?? ""}
          onChange={(e) => set("caption", e.target.value)}
          style={inputStyle}
          data-testid="input-image-caption"
        />
      </label>
      <label style={labelStyle}>
        <span>Seitenverhältnis</span>
        <select
          value={payload.aspect}
          onChange={(e) => {
            const v = e.target.value;
            set("aspect", v === "tall" ? "tall" : v === "auto" ? "auto" : "wide");
          }}
          style={inputStyle}
          data-testid="select-image-aspect"
        >
          <option value="wide">Breit (16:9)</option>
          <option value="tall">Hoch (3:4)</option>
          <option value="auto">Original</option>
        </select>
      </label>
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

const altWarnStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#d97757",
  fontFamily: "'Inter', system-ui, sans-serif",
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

export const fullWidthImageBlock: BlockDefinition<Payload> = {
  type: "full-width-image",
  label: "Vollbreites Bild",
  description: "Großformatiges Bild über die gesamte Breite, optional mit Bildunterschrift.",
  category: "generic",
  defaultPayload: () => ({ imageUrl: "", alt: "", caption: "", aspect: "wide" }),
  payloadSchema,
  Renderer,
  EditorPanel,
};

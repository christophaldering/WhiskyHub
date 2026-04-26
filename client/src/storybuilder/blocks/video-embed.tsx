import { z } from "zod";
import type { BlockDefinition, BlockEditorPanelProps, BlockRendererProps } from "../core/types";

const payloadSchema = z.object({
  url: z.string().default(""),
  caption: z.string().optional().default(""),
  aspect: z.enum(["16-9", "4-3", "1-1"]).default("16-9"),
});

type Payload = z.infer<typeof payloadSchema>;

function parseEmbed(url: string): { embedUrl: string; provider: string } | null {
  if (!url) return null;
  const trimmed = url.trim();
  const yt = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/);
  if (yt) {
    return { embedUrl: `https://www.youtube.com/embed/${yt[1]}`, provider: "youtube" };
  }
  const vimeo = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) {
    return { embedUrl: `https://player.vimeo.com/video/${vimeo[1]}`, provider: "vimeo" };
  }
  return null;
}

function aspectToRatio(a: Payload["aspect"]): string {
  if (a === "4-3") return "4 / 3";
  if (a === "1-1") return "1 / 1";
  return "16 / 9";
}

function Renderer({ payload, theme }: BlockRendererProps<Payload>) {
  const parsed = parseEmbed(payload.url);
  if (!parsed) {
    return (
      <section
        data-testid="block-video-embed-empty"
        style={{
          padding: "3rem 2rem",
          maxWidth: 900,
          margin: "0 auto",
          textAlign: "center",
          fontFamily: theme.fonts.sans,
          color: theme.colors.inkFaint,
          border: `1px dashed ${theme.colors.amberDim}`,
          borderRadius: 4,
        }}
      >
        Noch keine gültige YouTube- oder Vimeo-URL hinterlegt
      </section>
    );
  }
  return (
    <section
      data-testid="block-video-embed"
      style={{
        padding: "clamp(2rem, 5vw, 4rem) 2rem",
        maxWidth: 1000,
        margin: "0 auto",
      }}
    >
      <figure style={{ margin: 0 }}>
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: aspectToRatio(payload.aspect),
            background: "#000",
            boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
          }}
        >
          <iframe
            src={parsed.embedUrl}
            title={payload.caption || "Video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              border: 0,
              display: "block",
            }}
            data-testid="iframe-video"
          />
        </div>
        {payload.caption ? (
          <figcaption
            style={{
              fontFamily: theme.fonts.serif,
              fontStyle: "italic",
              fontSize: ".9rem",
              color: theme.colors.inkFaint,
              textAlign: "center",
              marginTop: "1rem",
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
      <label style={labelStyle}>
        <span>Video-URL (YouTube oder Vimeo)</span>
        <input
          type="text"
          value={payload.url}
          onChange={(e) => set("url", e.target.value)}
          placeholder="https://youtube.com/watch?v=… oder vimeo.com/…"
          style={inputStyle}
          data-testid="input-video-url"
        />
      </label>
      <label style={labelStyle}>
        <span>Seitenverhältnis</span>
        <select
          value={payload.aspect}
          onChange={(e) => {
            const v = e.target.value;
            set("aspect", v === "4-3" ? "4-3" : v === "1-1" ? "1-1" : "16-9");
          }}
          style={inputStyle}
          data-testid="select-video-aspect"
        >
          <option value="16-9">16 : 9 (Standard)</option>
          <option value="4-3">4 : 3</option>
          <option value="1-1">1 : 1 (Quadrat)</option>
        </select>
      </label>
      <label style={labelStyle}>
        <span>Bildunterschrift (optional)</span>
        <input
          type="text"
          value={payload.caption ?? ""}
          onChange={(e) => set("caption", e.target.value)}
          style={inputStyle}
          data-testid="input-video-caption"
        />
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

export const videoEmbedBlock: BlockDefinition<Payload> = {
  type: "video-embed",
  label: "Video-Embed",
  description: "YouTube- oder Vimeo-Video, optional mit Bildunterschrift.",
  category: "generic",
  defaultPayload: () => ({ url: "", caption: "", aspect: "16-9" }),
  payloadSchema,
  Renderer,
  EditorPanel,
};

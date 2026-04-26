import { z } from "zod";
import { useState } from "react";
import type { BlockDefinition, BlockEditorPanelProps, BlockRendererProps } from "../core/types";
import { RichTextEditor, sanitizeStoryHtml } from "../editor/RichTextEditor";

const payloadSchema = z.object({
  leftHeading: z.string().optional().default(""),
  leftBody: z.string().default(""),
  rightHeading: z.string().optional().default(""),
  rightBody: z.string().default(""),
  ratio: z.enum(["1-1", "2-1", "1-2"]).default("1-1"),
  gap: z.enum(["sm", "md", "lg"]).default("md"),
});

type Payload = z.infer<typeof payloadSchema>;

function ratioToColumns(ratio: Payload["ratio"]): string {
  if (ratio === "2-1") return "2fr 1fr";
  if (ratio === "1-2") return "1fr 2fr";
  return "1fr 1fr";
}

function gapToPx(gap: Payload["gap"]): number {
  if (gap === "sm") return 24;
  if (gap === "lg") return 80;
  return 48;
}

function Renderer({ payload, theme }: BlockRendererProps<Payload>) {
  const headingStyle = {
    fontFamily: theme.fonts.serif,
    fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)",
    fontWeight: 400,
    color: theme.colors.ink,
    margin: "0 0 1rem 0",
    letterSpacing: "-.01em",
  } as const;
  const bodyStyle = {
    fontFamily: theme.fonts.serif,
    fontSize: "clamp(.95rem, 1.4vw, 1.05rem)",
    lineHeight: 1.7,
    color: theme.colors.inkDim,
  } as const;
  return (
    <section
      data-testid="block-two-column"
      style={{
        padding: "clamp(3rem, 6vw, 5rem) 2rem",
        maxWidth: 1100,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: ratioToColumns(payload.ratio),
          gap: gapToPx(payload.gap),
        }}
      >
        <div>
          {payload.leftHeading ? <h3 style={headingStyle}>{payload.leftHeading}</h3> : null}
          <div style={bodyStyle} dangerouslySetInnerHTML={{ __html: sanitizeStoryHtml(payload.leftBody) }} />
        </div>
        <div>
          {payload.rightHeading ? <h3 style={headingStyle}>{payload.rightHeading}</h3> : null}
          <div style={bodyStyle} dangerouslySetInnerHTML={{ __html: sanitizeStoryHtml(payload.rightBody) }} />
        </div>
      </div>
    </section>
  );
}

function EditorPanel({ payload, onChange }: BlockEditorPanelProps<Payload>) {
  const set = <K extends keyof Payload>(key: K, value: Payload[K]) => onChange({ ...payload, [key]: value });
  const [tab, setTab] = useState<"left" | "right">("left");
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <label style={labelStyle}>
        <span>Spaltenverhältnis</span>
        <select
          value={payload.ratio}
          onChange={(e) => {
            const v = e.target.value;
            set("ratio", v === "2-1" ? "2-1" : v === "1-2" ? "1-2" : "1-1");
          }}
          style={inputStyle}
          data-testid="select-twocol-ratio"
        >
          <option value="1-1">50 / 50</option>
          <option value="2-1">66 / 33</option>
          <option value="1-2">33 / 66</option>
        </select>
      </label>
      <label style={labelStyle}>
        <span>Abstand zwischen Spalten</span>
        <select
          value={payload.gap}
          onChange={(e) => {
            const v = e.target.value;
            set("gap", v === "sm" ? "sm" : v === "lg" ? "lg" : "md");
          }}
          style={inputStyle}
          data-testid="select-twocol-gap"
        >
          <option value="sm">Schmal</option>
          <option value="md">Mittel</option>
          <option value="lg">Weit</option>
        </select>
      </label>
      <div style={{ display: "flex", gap: 4 }}>
        <button
          type="button"
          onClick={() => setTab("left")}
          style={tab === "left" ? activeTabStyle : tabStyle}
          data-testid="button-twocol-tab-left"
        >
          Linke Spalte
        </button>
        <button
          type="button"
          onClick={() => setTab("right")}
          style={tab === "right" ? activeTabStyle : tabStyle}
          data-testid="button-twocol-tab-right"
        >
          Rechte Spalte
        </button>
      </div>
      {tab === "left" ? (
        <>
          <label style={labelStyle}>
            <span>Überschrift links</span>
            <input
              type="text"
              value={payload.leftHeading ?? ""}
              onChange={(e) => set("leftHeading", e.target.value)}
              style={inputStyle}
              data-testid="input-twocol-left-heading"
            />
          </label>
          <label style={labelStyle}>
            <span>Text links</span>
            <RichTextEditor
              value={payload.leftBody}
              onChange={(html) => set("leftBody", html)}
              placeholder="Text der linken Spalte…"
              data-testid="richtext-twocol-left-body"
            />
          </label>
        </>
      ) : (
        <>
          <label style={labelStyle}>
            <span>Überschrift rechts</span>
            <input
              type="text"
              value={payload.rightHeading ?? ""}
              onChange={(e) => set("rightHeading", e.target.value)}
              style={inputStyle}
              data-testid="input-twocol-right-heading"
            />
          </label>
          <label style={labelStyle}>
            <span>Text rechts</span>
            <RichTextEditor
              value={payload.rightBody}
              onChange={(html) => set("rightBody", html)}
              placeholder="Text der rechten Spalte…"
              data-testid="richtext-twocol-right-body"
            />
          </label>
        </>
      )}
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

const tabStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(201,169,97,0.2)",
  borderRadius: 3,
  padding: "4px 12px",
  fontSize: 11,
  color: "#A89A85",
  cursor: "pointer",
  fontFamily: "'Inter', system-ui, sans-serif",
  letterSpacing: ".1em",
  textTransform: "uppercase",
  flex: 1,
};

const activeTabStyle: React.CSSProperties = {
  ...tabStyle,
  background: "#C9A961",
  color: "#0B0906",
  borderColor: "#C9A961",
};

export const twoColumnBlock: BlockDefinition<Payload> = {
  type: "two-column",
  label: "Zwei Spalten",
  description: "Zwei Textspalten nebeneinander mit konfigurierbarem Verhältnis.",
  category: "generic",
  defaultPayload: () => ({
    leftHeading: "Linke Überschrift",
    leftBody: "<p>Text links.</p>",
    rightHeading: "Rechte Überschrift",
    rightBody: "<p>Text rechts.</p>",
    ratio: "1-1",
    gap: "md",
  }),
  payloadSchema,
  Renderer,
  EditorPanel,
};

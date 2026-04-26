import { memo, useMemo } from "react";
import type { BlockRendererProps, RendererMode, StoryBlock, StoryDocument, StoryTheme } from "../core/types";
import { getBlockDefinition, validatePayload } from "../blocks";
import { getTheme } from "../themes";

type Props = {
  document: StoryDocument;
  mode?: RendererMode;
  className?: string;
};

export function StoryRenderer({ document, mode = "public", className }: Props) {
  const theme = useMemo(() => getTheme(document.theme), [document.theme]);
  const visibleBlocks = useMemo(() => document.blocks.filter((b) => !b.hidden), [document.blocks]);

  return (
    <div
      data-testid="story-renderer"
      className={className}
      style={{
        background: theme.colors.bg,
        color: theme.colors.ink,
        fontFamily: theme.fonts.serif,
        position: "relative",
        minHeight: "100vh",
        overflowX: "hidden",
      }}
    >
      <PrintStyles />
      {theme.effects.grain ? <GrainOverlay /> : null}
      <div style={{ position: "relative", zIndex: 1 }}>
        {visibleBlocks.map((block) => (
          <BlockRenderItem key={block.id} block={block} theme={theme} mode={mode} />
        ))}
      </div>
    </div>
  );
}

type BlockRenderItemProps = {
  block: StoryBlock;
  theme: StoryTheme;
  mode: RendererMode;
};

const BlockRenderItem = memo(function BlockRenderItem({ block, theme, mode }: BlockRenderItemProps) {
  const def = useMemo(() => getBlockDefinition(block.type), [block.type]);
  const validation = useMemo(() => validatePayload(block.type, block.payload), [block.type, block.payload]);

  if (!def) {
    return (
      <div
        data-testid={`block-unknown-${block.type}`}
        style={{
          padding: "1rem 2rem",
          margin: "1rem auto",
          maxWidth: 900,
          border: `1px dashed ${theme.colors.amberDim}`,
          color: theme.colors.inkFaint,
          fontFamily: theme.fonts.sans,
          fontSize: 14,
          textAlign: "center",
        }}
      >
        Unbekannter Block-Typ: {block.type}
      </div>
    );
  }

  const Renderer = def.Renderer as React.ComponentType<BlockRendererProps<unknown>>;
  return (
    <div className="storybuilder-block" data-block-id={block.id} data-block-type={block.type}>
      {!validation.ok && mode !== "public" ? (
        <div
          data-testid={`block-validation-warning-${block.id}`}
          style={{
            padding: "8px 16px",
            margin: "0 auto",
            maxWidth: 900,
            background: "rgba(217,119,87,0.1)",
            color: "#d97757",
            fontFamily: theme.fonts.sans,
            fontSize: 12,
            borderLeft: "2px solid #d97757",
          }}
        >
          Block-Daten ungültig — Standardwerte werden angezeigt.
        </div>
      ) : null}
      <Renderer block={block} payload={validation.payload} theme={theme} mode={mode} />
    </div>
  );
});

function PrintStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
@media print {
  @page { size: A4; margin: 14mm; }
  html, body { background: #ffffff !important; color: #111111 !important; }
  [data-testid="story-renderer"] {
    background: #ffffff !important;
    color: #111111 !important;
    overflow: visible !important;
    min-height: auto !important;
  }
  .storybuilder-block {
    page-break-inside: avoid;
    break-inside: avoid;
    margin-bottom: 8mm;
  }
  [data-testid="block-hero-cover"] {
    min-height: auto !important;
    padding: 8mm 0 !important;
    page-break-after: auto;
  }
  [data-testid="block-hero-cover"] [aria-hidden="true"],
  [data-testid="block-hero-cover"] > div[aria-hidden] {
    display: none !important;
  }
  [data-testid="block-hero-cover"] h1 {
    color: #111111 !important;
    font-size: 28pt !important;
    line-height: 1.1 !important;
  }
  [data-testid^="block-"] {
    box-shadow: none !important;
  }
  img {
    max-width: 100% !important;
    page-break-inside: avoid;
  }
  a, a:visited { color: #111111 !important; text-decoration: underline; }
  [data-testid="grain-overlay"] { display: none !important; }
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
  [data-testid="story-renderer"] [style*="position: fixed"],
  [data-testid="story-renderer"] [style*="position:fixed"] {
    position: static !important;
  }
}
`,
      }}
    />
  );
}

function GrainOverlay() {
  return (
    <div
      aria-hidden
      data-testid="grain-overlay"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 100,
        opacity: 0.04,
        mixBlendMode: "overlay",
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
      }}
    />
  );
}

export const SP = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const FONT = {
  display: "'Playfair Display', Georgia, 'Times New Roman', serif",
  serif: "'Cormorant Garamond', Georgia, serif",
  body: "'DM Sans', system-ui, -apple-system, sans-serif",
} as const;

export const RADIUS = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const TOUCH_MIN = 44;

export interface PhaseTokens {
  accent: string;
  dim: string;
  glow: string;
}

export interface ThemeTokens {
  bg: string;
  bgCard: string;
  bgHover: string;
  border: string;
  text: string;
  muted: string;
  faint: string;
  gold: string;
  amber: string;
  green: string;
  headerBg: string;
  inputBg: string;
  phases: {
    nose: PhaseTokens;
    palate: PhaseTokens;
    finish: PhaseTokens;
    overall: PhaseTokens;
  };
}

export const LABS_THEME: ThemeTokens = {
  bg: "var(--labs-bg)",
  bgCard: "var(--labs-surface-elevated)",
  bgHover: "var(--labs-surface-hover)",
  border: "var(--labs-border-subtle)",
  text: "var(--labs-text)",
  muted: "var(--labs-text-secondary)",
  faint: "var(--labs-text-muted)",
  gold: "var(--labs-accent)",
  amber: "var(--labs-amber)",
  green: "var(--labs-success)",
  headerBg: "var(--labs-header-bg)",
  inputBg: "var(--labs-input-bg)",
  phases: {
    nose:    { accent: "var(--labs-phase-nose)",    dim: "var(--labs-phase-nose-dim)",    glow: "var(--labs-phase-nose-glow)" },
    palate:  { accent: "var(--labs-phase-palate)",  dim: "var(--labs-phase-palate-dim)",  glow: "var(--labs-phase-palate-glow)" },
    finish:  { accent: "var(--labs-phase-finish)",  dim: "var(--labs-phase-finish-dim)",  glow: "var(--labs-phase-finish-glow)" },
    overall: { accent: "var(--labs-phase-overall)", dim: "var(--labs-phase-overall-dim)", glow: "var(--labs-phase-overall-glow)" },
  },
};

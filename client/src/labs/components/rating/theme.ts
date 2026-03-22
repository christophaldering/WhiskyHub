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
  bg: "#0e0b05",
  bgCard: "rgba(255,255,255,0.045)",
  bgHover: "rgba(255,255,255,0.08)",
  border: "rgba(255,255,255,0.08)",
  text: "#f5ede0",
  muted: "rgba(245,237,224,0.55)",
  faint: "rgba(245,237,224,0.28)",
  gold: "#d4a847",
  amber: "#c47a3a",
  green: "#86c678",
  headerBg: "rgba(14,11,5,0.92)",
  inputBg: "rgba(255,255,255,0.06)",
  phases: {
    nose:    { accent: "#a8c4d4", dim: "rgba(168,196,212,0.08)", glow: "rgba(168,196,212,0.15)" },
    palate:  { accent: "#d4a847", dim: "rgba(212,168,71,0.08)",  glow: "rgba(212,168,71,0.15)" },
    finish:  { accent: "#c47a3a", dim: "rgba(196,122,58,0.08)",  glow: "rgba(196,122,58,0.15)" },
    overall: { accent: "#86c678", dim: "rgba(134,198,120,0.08)", glow: "rgba(134,198,120,0.15)" },
  },
};

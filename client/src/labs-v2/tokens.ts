export type V2Theme = "dark" | "light";

export const SP = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export type SpacingTokens = typeof SP;

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
export const TAB_BAR_H = 72;
export const TOP_BAR_H = 56;

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
  tabBg: string;
  headerBg: string;
  inputBg: string;
  phases: {
    nose: PhaseTokens;
    palate: PhaseTokens;
    finish: PhaseTokens;
    overall: PhaseTokens;
  };
}

const darkTheme: ThemeTokens = {
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
  tabBg: "rgba(14,11,5,0.96)",
  headerBg: "rgba(14,11,5,0.92)",
  inputBg: "rgba(255,255,255,0.06)",
  phases: {
    nose:    { accent: "#a8c4d4", dim: "rgba(168,196,212,0.08)", glow: "rgba(168,196,212,0.15)" },
    palate:  { accent: "#d4a847", dim: "rgba(212,168,71,0.08)",  glow: "rgba(212,168,71,0.15)" },
    finish:  { accent: "#c47a3a", dim: "rgba(196,122,58,0.08)",  glow: "rgba(196,122,58,0.15)" },
    overall: { accent: "#86c678", dim: "rgba(134,198,120,0.08)", glow: "rgba(134,198,120,0.15)" },
  },
};

const lightTheme: ThemeTokens = {
  bg: "#faf6f0",
  bgCard: "rgba(0,0,0,0.06)",
  bgHover: "rgba(0,0,0,0.10)",
  border: "rgba(0,0,0,0.15)",
  text: "#1a1208",
  muted: "rgba(26,18,8,0.65)",
  faint: "rgba(26,18,8,0.45)",
  gold: "#b8892a",
  amber: "#a05e22",
  green: "#4a8c3a",
  tabBg: "rgba(250,246,240,0.96)",
  headerBg: "rgba(250,246,240,0.92)",
  inputBg: "rgba(0,0,0,0.05)",
  phases: {
    nose:    { accent: "#5a8fa8", dim: "rgba(90,143,168,0.12)",  glow: "rgba(90,143,168,0.22)" },
    palate:  { accent: "#b8892a", dim: "rgba(184,137,42,0.12)",  glow: "rgba(184,137,42,0.22)" },
    finish:  { accent: "#a05e22", dim: "rgba(160,94,34,0.12)",   glow: "rgba(160,94,34,0.22)" },
    overall: { accent: "#4a8c3a", dim: "rgba(74,140,58,0.12)",   glow: "rgba(74,140,58,0.22)" },
  },
};

export const THEMES: Record<V2Theme, ThemeTokens> = {
  dark: darkTheme,
  light: lightTheme,
};

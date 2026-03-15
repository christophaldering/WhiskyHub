export type ThemeName = "dark-warm" | "light-warm";

const themes: Record<ThemeName, Record<string, string>> = {
  "dark-warm": {
    "--cs-bg": "#1a1714",
    "--cs-card": "#2e2621",
    "--cs-elevated": "#3d342c",
    "--cs-text": "#f5f0e8",
    "--cs-text-secondary": "#d6cbbd",
    "--cs-muted": "#888",
    "--cs-muted-light": "#8a7e6d",
    "--cs-accent": "#c9a76c",
    "--cs-accent-dim": "#a88d55",
    "--cs-border": "#4a4038",
    "--cs-success": "#7dba84",
    "--cs-danger": "#c47e7e",
    "--cs-error": "#b85c5c",
    "--cs-input-bg": "#252019",
    "--cs-input-border": "#4a4038",
    "--cs-gold": "#c9a76c",
    "--cs-silver": "#a8a8a8",
    "--cs-bronze": "#b87333",
    "--cs-high": "#7dba84",
    "--cs-medium": "#c9a76c",
    "--cs-low": "#b85c5c",
    "--cs-tagline": "#b8af90",
    "--cs-subtle-border": "#3a322b",
    "--cs-subtle-text": "#8a8070",
    "--cs-session-signed": "#c9a76c",
    "--cs-session-unsigned": "#6b6354",
    "--cs-accent-ink": "#c9a76c",
    "--cs-input-text": "#f5f0e8",
    "--cs-placeholder": "#8a8070",
    "--cs-shadow": "0 0 0 1px rgba(255, 255, 255, 0.06), 0 1px 2px rgba(0, 0, 0, 0.2)",
    "--cs-divider": "#3a322b",
    "--cs-slider-track": "#4a4038",
    "--cs-slider-thumb": "#c9a76c",
    "--cs-delta-positive": "#7dba84",
    "--cs-delta-negative": "#c47e7e",
    "--cs-table-row-hover": "rgba(201, 167, 108, 0.06)",
    "--cs-pill-bg": "rgba(201, 167, 108, 0.15)",
    "--cs-pill-text": "#c9a76c",
    "--cs-focus-ring": "rgba(201, 167, 108, 0.4)",
  },
  "light-warm": {
    "--cs-bg": "#F4EFE8",
    "--cs-card": "#FFFFFF",
    "--cs-elevated": "#f3f1ed",
    "--cs-text": "#2A231C",
    "--cs-text-secondary": "#3b352f",
    "--cs-muted": "#6F6256",
    "--cs-muted-light": "#8A7E73",
    "--cs-accent": "#C8A97E",
    "--cs-accent-dim": "#6B4E2E",
    "--cs-accent-ink": "#6B4E2E",
    "--cs-border": "#E4D8C8",
    "--cs-success": "#2E7D32",
    "--cs-danger": "#B3261E",
    "--cs-error": "#B3261E",
    "--cs-input-bg": "#FBF7F2",
    "--cs-input-border": "#E4D8C8",
    "--cs-input-text": "#2A231C",
    "--cs-placeholder": "#8A7E73",
    "--cs-gold": "#C8A97E",
    "--cs-silver": "#a8a8a8",
    "--cs-bronze": "#b87333",
    "--cs-high": "#2E7D32",
    "--cs-medium": "#C8A97E",
    "--cs-low": "#B3261E",
    "--cs-tagline": "#8A7E73",
    "--cs-subtle-border": "#E4D8C8",
    "--cs-subtle-text": "#8A7E73",
    "--cs-session-signed": "#6B4E2E",
    "--cs-session-unsigned": "#8A7E73",
    "--cs-shadow": "0 10px 30px rgba(35, 30, 25, 0.08)",
    "--cs-divider": "#DDD1C4",
    "--cs-slider-track": "#D9CFC2",
    "--cs-slider-thumb": "#C8A97E",
    "--cs-delta-positive": "#2E7D32",
    "--cs-delta-negative": "#B3261E",
    "--cs-table-row-hover": "rgba(0, 0, 0, 0.03)",
    "--cs-pill-bg": "rgba(201, 151, 58, 0.12)",
    "--cs-pill-text": "#6B4E2E",
    "--cs-focus-ring": "rgba(201, 151, 58, 0.4)",
  },
};

const LS_KEY = "cs_theme";

export function getTheme(): ThemeName {
  if (typeof window === "undefined") return "light-warm";
  const stored = localStorage.getItem(LS_KEY);
  if (stored === "light-warm" || stored === "dark-warm") return stored;
  return "light-warm";
}

export function setTheme(theme: ThemeName): void {
  localStorage.setItem(LS_KEY, theme);
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  const vars = themes[theme];
  for (const [prop, value] of Object.entries(vars)) {
    root.style.setProperty(prop, value);
  }
}

export function initTheme(): void {
  setTheme(getTheme());
}

export function alpha(cssVar: string, hexAlpha: string): string {
  const pct = Math.round((parseInt(hexAlpha, 16) / 255) * 100);
  return `color-mix(in srgb, ${cssVar} ${pct}%, transparent)`;
}

export const v = {
  bg: "var(--cs-bg)",
  card: "var(--cs-card)",
  elevated: "var(--cs-elevated)",
  text: "var(--cs-text)",
  textSecondary: "var(--cs-text-secondary)",
  muted: "var(--cs-muted)",
  mutedLight: "var(--cs-muted-light)",
  accent: "var(--cs-accent)",
  accentDim: "var(--cs-accent-dim)",
  accentInk: "var(--cs-accent-ink)",
  border: "var(--cs-border)",
  success: "var(--cs-success)",
  danger: "var(--cs-danger)",
  error: "var(--cs-error)",
  inputBg: "var(--cs-input-bg)",
  inputBorder: "var(--cs-input-border)",
  inputText: "var(--cs-input-text)",
  placeholder: "var(--cs-placeholder)",
  gold: "var(--cs-gold)",
  silver: "var(--cs-silver)",
  bronze: "var(--cs-bronze)",
  high: "var(--cs-high)",
  medium: "var(--cs-medium)",
  low: "var(--cs-low)",
  tagline: "var(--cs-tagline)",
  subtleBorder: "var(--cs-subtle-border)",
  subtleText: "var(--cs-subtle-text)",
  sessionSigned: "var(--cs-session-signed)",
  sessionUnsigned: "var(--cs-session-unsigned)",
  shadow: "var(--cs-shadow)",
  divider: "var(--cs-divider)",
  sliderTrack: "var(--cs-slider-track)",
  sliderThumb: "var(--cs-slider-thumb)",
  deltaPositive: "var(--cs-delta-positive)",
  deltaNegative: "var(--cs-delta-negative)",
  tableRowHover: "var(--cs-table-row-hover)",
  pillBg: "var(--cs-pill-bg)",
  pillText: "var(--cs-pill-text)",
  focusRing: "var(--cs-focus-ring)",
};

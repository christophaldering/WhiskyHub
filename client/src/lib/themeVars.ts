export type ThemeName = "dark-warm" | "light-warm";

const themes: Record<ThemeName, Record<string, string>> = {
  "dark-warm": {
    "--cs-bg": "#1a1714",
    "--cs-card": "#242018",
    "--cs-text": "#f5f0e8",
    "--cs-muted": "#888",
    "--cs-muted-light": "#8a7e6d",
    "--cs-accent": "#d4a256",
    "--cs-accent-dim": "#a8834a",
    "--cs-border": "#2e2a24",
    "--cs-success": "#6a9a5b",
    "--cs-danger": "#e57373",
    "--cs-error": "#c44",
    "--cs-input-bg": "#23201a",
    "--cs-input-border": "#3d362e",
    "--cs-gold": "#d4a256",
    "--cs-silver": "#a8a8a8",
    "--cs-bronze": "#b87333",
    "--cs-high": "#6a9a5b",
    "--cs-medium": "#d4a256",
    "--cs-low": "#c44",
    "--cs-tagline": "#b8af90",
    "--cs-subtle-border": "#2e281f",
    "--cs-subtle-text": "#8a8070",
    "--cs-session-signed": "#d4a256",
    "--cs-session-unsigned": "#6b6354",
  },
  "light-warm": {
    "--cs-bg": "#f5efe6",
    "--cs-card": "#ffffff",
    "--cs-text": "#231e19",
    "--cs-muted": "#6f6256",
    "--cs-muted-light": "#8a7e6d",
    "--cs-accent": "#d4a256",
    "--cs-accent-dim": "#b8924a",
    "--cs-border": "#e2d6c9",
    "--cs-success": "#2e7d32",
    "--cs-danger": "#b3261e",
    "--cs-error": "#b3261e",
    "--cs-input-bg": "#fbf7f2",
    "--cs-input-border": "#e2d6c9",
    "--cs-gold": "#d4a256",
    "--cs-silver": "#a8a8a8",
    "--cs-bronze": "#b87333",
    "--cs-high": "#2e7d32",
    "--cs-medium": "#d4a256",
    "--cs-low": "#b3261e",
    "--cs-tagline": "#8a7e6d",
    "--cs-subtle-border": "#e2d6c9",
    "--cs-subtle-text": "#8a7e6d",
    "--cs-session-signed": "#b8924a",
    "--cs-session-unsigned": "#8a7e6d",
  },
};

const LS_KEY = "cs_theme";

export function getTheme(): ThemeName {
  if (typeof window === "undefined") return "dark-warm";
  const stored = localStorage.getItem(LS_KEY);
  if (stored === "light-warm" || stored === "dark-warm") return stored;
  return "dark-warm";
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

export const v = {
  bg: "var(--cs-bg)",
  card: "var(--cs-card)",
  text: "var(--cs-text)",
  muted: "var(--cs-muted)",
  mutedLight: "var(--cs-muted-light)",
  accent: "var(--cs-accent)",
  accentDim: "var(--cs-accent-dim)",
  border: "var(--cs-border)",
  success: "var(--cs-success)",
  danger: "var(--cs-danger)",
  error: "var(--cs-error)",
  inputBg: "var(--cs-input-bg)",
  inputBorder: "var(--cs-input-border)",
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
};

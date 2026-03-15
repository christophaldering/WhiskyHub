export const c = {
  bg: "#1a1714",
  card: "#2e2621",
  border: "#4a4038",
  text: "#f5f0e8",
  muted: "#888",
  mutedLight: "#8a7e6d",
  accent: "#c9a76c",
  accentDim: "#a88d55",
  error: "#b85c5c",
  success: "#7dba84",
  high: "#7dba84",
  medium: "#c9a76c",
  low: "#b85c5c",
  gold: "#c9a76c",
  silver: "#a8a8a8",
  bronze: "#b87333",
  danger: "#c47e7e",
  inputBg: "#252019",
  inputBorder: "#4a4038",
};

export const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--cs-input-bg)",
  border: "1px solid var(--cs-input-border)",
  borderRadius: 12,
  color: "var(--cs-text)",
  padding: "12px 16px",
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "system-ui, -apple-system, sans-serif",
  transition: "border-color 0.2s",
};

export const cardStyle: React.CSSProperties = {
  background: "var(--cs-card)",
  border: "1px solid var(--cs-border)",
  borderRadius: 16,
  padding: 24,
  boxShadow: "var(--cs-shadow)",
};

export const sectionHeadingStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "var(--cs-muted-light)",
  marginBottom: 12,
};

export const pageTitleStyle: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: 26,
  fontWeight: 700,
  color: "var(--cs-text)",
  margin: 0,
  letterSpacing: "-0.02em",
};

export const pageSubtitleStyle: React.CSSProperties = {
  fontSize: 14,
  color: "var(--cs-muted)",
  marginTop: 6,
  lineHeight: 1.5,
};

export const sliderCSS = `
  input[type="range"].warm-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    background: var(--cs-slider-track);
    border-radius: 3px;
    outline: none;
    cursor: pointer;
  }
  input[type="range"].warm-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--cs-slider-thumb);
    border: 2px solid var(--cs-text);
    box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 1px 4px rgba(0,0,0,0.2);
    cursor: pointer;
  }
  input[type="range"].warm-slider::-moz-range-track {
    height: 6px;
    background: var(--cs-slider-track);
    border-radius: 3px;
    border: none;
  }
  input[type="range"].warm-slider::-moz-range-thumb {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--cs-slider-thumb);
    border: 2px solid var(--cs-text);
    box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 1px 4px rgba(0,0,0,0.2);
    cursor: pointer;
  }
`;

export const sectionSpacing = 40;

export const radius = { sm: 10, md: 14, lg: 18, xl: 22, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const shadow = {
  card: "0 0 0 1px rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.15)",
  elevated: "0 0 0 1px rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.18)",
  subtle: "0 0 0 1px rgba(255,255,255,0.04)",
} as const;

export const typo = {
  pageTitle: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    lineHeight: 1.15,
    color: "var(--cs-text)",
  } as React.CSSProperties,
  pageSubtitle: {
    fontSize: 14,
    fontWeight: 400,
    color: "var(--cs-muted)",
    lineHeight: 1.5,
    marginTop: 6,
  } as React.CSSProperties,
  sectionHeading: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    color: "var(--cs-muted-light)",
  } as React.CSSProperties,
  body: {
    fontSize: 15,
    fontWeight: 400,
    lineHeight: 1.55,
    color: "var(--cs-text)",
    fontFamily: "system-ui, -apple-system, sans-serif",
  } as React.CSSProperties,
  caption: {
    fontSize: 12,
    fontWeight: 400,
    color: "var(--cs-muted)",
    lineHeight: 1.4,
  } as React.CSSProperties,
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--cs-text)",
    fontFamily: "system-ui, -apple-system, sans-serif",
  } as React.CSSProperties,
} as const;

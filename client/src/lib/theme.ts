export const c = {
  bg: "#1a1714",
  card: "#242018",
  border: "#2e2a24",
  text: "#f5f0e8",
  muted: "#888",
  mutedLight: "#8a7e6d",
  accent: "#d4a256",
  accentDim: "#a8834a",
  error: "#c44",
  success: "#6a9a5b",
  high: "#6a9a5b",
  medium: "#d4a256",
  low: "#c44",
  gold: "#d4a256",
  silver: "#a8a8a8",
  bronze: "#b87333",
  danger: "#e57373",
  inputBg: "#23201a",
  inputBorder: "#3d362e",
};

export const inputStyle: React.CSSProperties = {
  width: "100%",
  background: c.inputBg,
  border: `1px solid ${c.inputBorder}`,
  borderRadius: 12,
  color: c.text,
  padding: "12px 16px",
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "system-ui, -apple-system, sans-serif",
  transition: "border-color 0.2s",
};

export const cardStyle: React.CSSProperties = {
  background: c.card,
  border: `1px solid ${c.border}30`,
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)",
};

export const sectionHeadingStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: c.mutedLight,
  marginBottom: 12,
};

export const pageTitleStyle: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: 26,
  fontWeight: 700,
  color: c.text,
  margin: 0,
  letterSpacing: "-0.02em",
};

export const pageSubtitleStyle: React.CSSProperties = {
  fontSize: 14,
  color: c.muted,
  marginTop: 6,
  lineHeight: 1.5,
};

export const sliderCSS = `
  input[type="range"].warm-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    background: ${c.border};
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
    background: ${c.accent};
    border: 2px solid ${c.text};
    box-shadow: 0 1px 4px rgba(0,0,0,0.4);
    cursor: pointer;
  }
  input[type="range"].warm-slider::-moz-range-track {
    height: 6px;
    background: ${c.border};
    border-radius: 3px;
    border: none;
  }
  input[type="range"].warm-slider::-moz-range-thumb {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: ${c.accent};
    border: 2px solid ${c.text};
    box-shadow: 0 1px 4px rgba(0,0,0,0.4);
    cursor: pointer;
  }
`;

export const sectionSpacing = 40;

export const radius = { sm: 10, md: 14, lg: 18, xl: 22, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const shadow = {
  card: "0 1px 4px rgba(0,0,0,0.18), 0 0 1px rgba(0,0,0,0.08)",
  elevated: "0 4px 16px rgba(0,0,0,0.24), 0 1px 4px rgba(0,0,0,0.12)",
  subtle: "0 1px 2px rgba(0,0,0,0.1)",
} as const;

export const typo = {
  pageTitle: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    lineHeight: 1.15,
    color: c.text,
  } as React.CSSProperties,
  pageSubtitle: {
    fontSize: 14,
    fontWeight: 400,
    color: c.muted,
    lineHeight: 1.5,
    marginTop: 6,
  } as React.CSSProperties,
  sectionHeading: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    color: c.mutedLight,
  } as React.CSSProperties,
  body: {
    fontSize: 15,
    fontWeight: 400,
    lineHeight: 1.55,
    color: c.text,
    fontFamily: "system-ui, -apple-system, sans-serif",
  } as React.CSSProperties,
  caption: {
    fontSize: 12,
    fontWeight: 400,
    color: c.muted,
    lineHeight: 1.4,
  } as React.CSSProperties,
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: c.text,
    fontFamily: "system-ui, -apple-system, sans-serif",
  } as React.CSSProperties,
} as const;

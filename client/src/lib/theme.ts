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
  borderRadius: 10,
  color: c.text,
  padding: "12px 14px",
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "system-ui, sans-serif",
};

export const cardStyle: React.CSSProperties = {
  background: c.card,
  border: `1px solid ${c.inputBorder}`,
  borderRadius: 14,
  padding: 24,
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

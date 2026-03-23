import { useState, useEffect } from "react";
import { THEMES, SP, type ThemeTokens } from "@/labs-apple/theme/tokens";

export { SP };
export type { ThemeTokens };

export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("rgba(")) {
    return color.replace(/,\s*[\d.]+\)$/, `, ${alpha})`);
  }
  if (color.startsWith("rgb(")) {
    return color.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
  }
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.slice(0, 2), 16);
    const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.slice(2, 4), 16);
    const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color;
}

function getStoredTheme(): "dark" | "light" {
  try {
    const stored = localStorage.getItem("cs_labs_theme") ?? localStorage.getItem("v2_theme") ?? localStorage.getItem("casksense_theme");
    if (stored === "dark" || stored === "light") return stored;
  } catch {}
  return "dark";
}

export function useAppleTheme(): ThemeTokens {
  const [theme, setTheme] = useState<"dark" | "light">(getStoredTheme);

  useEffect(() => {
    const onThemeChanged = () => setTheme(getStoredTheme());
    window.addEventListener("labs-theme-changed", onThemeChanged);
    window.addEventListener("storage", onThemeChanged);
    return () => {
      window.removeEventListener("labs-theme-changed", onThemeChanged);
      window.removeEventListener("storage", onThemeChanged);
    };
  }, []);

  return THEMES[theme];
}

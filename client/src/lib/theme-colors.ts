import { useAppStore } from "@/lib/store";

export const classicChartColors = {
  colors: ["#c8a864", "#a8845c", "#8b6f47", "#d4a853", "#b8934a", "#9e7d3f", "#c4956c", "#d9b87c"],
  primary: "#c8a864",
  secondary: "#a8845c",
  accent: "#d4a853",
  background: "hsl(var(--card))",
  text: "hsl(var(--muted-foreground))",
  grid: "hsl(var(--border))",
};

export const loungeChartColors = {
  colors: ["#8b5e3c", "#6b2c3e", "#c9a34e", "#7a4b2a", "#93344a", "#a67c3d", "#5c3a28", "#b08d52"],
  primary: "#8b5e3c",
  secondary: "#6b2c3e",
  accent: "#c9a34e",
  background: "hsl(var(--card))",
  text: "hsl(var(--muted-foreground))",
  grid: "hsl(var(--border))",
};

export const classicFlavorWheelColors: Record<string, string> = {
  fruity: "#e07b4c",
  floral: "#c77dba",
  sweet: "#d4a853",
  spicy: "#c04e3e",
  woody: "#8b6f47",
  smoky: "#6b7280",
  malty: "#b8934a",
  maritime: "#4a90a4",
};

export const loungeFlavorWheelColors: Record<string, string> = {
  fruity: "#b5603d",
  floral: "#8a4a6e",
  sweet: "#a67c3d",
  spicy: "#8b3332",
  woody: "#6b4f33",
  smoky: "#5a5d63",
  malty: "#8b6e38",
  maritime: "#3a6d7e",
};

export function useChartColors() {
  const uiTheme = useAppStore((s) => s.uiTheme);
  return uiTheme === "lounge" ? loungeChartColors : classicChartColors;
}

export function useFlavorWheelColors() {
  const uiTheme = useAppStore((s) => s.uiTheme);
  return uiTheme === "lounge" ? loungeFlavorWheelColors : classicFlavorWheelColors;
}

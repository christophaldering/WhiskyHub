import type { StoryTheme } from "../core/types";
import { casksenseEditorial } from "./casksense-editorial";

const themeRegistry = new Map<string, StoryTheme>();

themeRegistry.set(casksenseEditorial.id, casksenseEditorial);

export function getTheme(id: string): StoryTheme {
  return themeRegistry.get(id) ?? casksenseEditorial;
}

export function registerTheme(theme: StoryTheme): void {
  themeRegistry.set(theme.id, theme);
}

export function listThemes(): StoryTheme[] {
  return Array.from(themeRegistry.values());
}

export { casksenseEditorial };

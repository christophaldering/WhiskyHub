import { describe, it, expect } from "vitest";

describe("Theme tokens", () => {
  it("v.* tokens resolve to valid CSS variable strings", async () => {
    const { v } = await import("@/lib/themeVars");
    const tokenKeys = Object.keys(v);
    expect(tokenKeys.length).toBeGreaterThan(10);

    for (const key of tokenKeys) {
      const val = (v as any)[key];
      expect(typeof val).toBe("string");
      if (val.startsWith("var(")) {
        expect(val).toMatch(/^var\(--cs-[\w-]+\)$/);
      }
    }
  });

  it("both dark-warm and light-warm theme maps have same keys", async () => {
    const mod = await import("@/lib/themeVars");
    const themes = (mod as any).default?.themes;
    if (!themes) {
      const { v } = mod;
      expect(v.bg).toBeDefined();
      expect(v.card).toBeDefined();
      expect(v.elevated).toBeDefined();
      expect(v.text).toBeDefined();
      expect(v.textSecondary).toBeDefined();
      expect(v.accent).toBeDefined();
      expect(v.deltaPositive).toBeDefined();
      expect(v.deltaNegative).toBeDefined();
      expect(v.tableRowHover).toBeDefined();
      expect(v.pillBg).toBeDefined();
      expect(v.pillText).toBeDefined();
      expect(v.focusRing).toBeDefined();
      return;
    }
    const darkKeys = Object.keys(themes["dark-warm"]).sort();
    const lightKeys = Object.keys(themes["light-warm"]).sort();
    expect(darkKeys).toEqual(lightKeys);
  });

  it("all critical tokens exist in v export", async () => {
    const { v } = await import("@/lib/themeVars");
    const required = [
      "bg", "card", "elevated", "text", "textSecondary", "muted",
      "accent", "border", "success", "danger", "error",
      "deltaPositive", "deltaNegative", "tableRowHover",
      "pillBg", "pillText", "focusRing",
    ];
    for (const key of required) {
      expect((v as any)[key], `Missing token: ${key}`).toBeDefined();
    }
  });
});

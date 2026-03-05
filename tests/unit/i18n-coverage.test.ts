import { describe, it, expect } from "vitest";

function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

describe("i18n coverage — Module 2 keys", () => {
  it("all m2.* keys exist in both EN and DE", async () => {
    const mod = await import("@/lib/i18n");
    const i18n = (mod as any).default || mod;

    const enResources = i18n.options?.resources?.en?.translation ||
      i18n.store?.data?.en?.translation ||
      i18n.getResourceBundle?.("en", "translation") || {};
    const deResources = i18n.options?.resources?.de?.translation ||
      i18n.store?.data?.de?.translation ||
      i18n.getResourceBundle?.("de", "translation") || {};

    const requiredKeys = [
      "m2.tabs.tastings",
      "m2.tabs.taste",
      "m2.tabs.circle",
      "m2.profile",
      "m2.tastings.title",
      "m2.tastings.join",
      "m2.tastings.host",
      "m2.tastings.solo",
      "m2.join.title",
      "m2.host.title",
      "m2.solo.title",
      "m2.session.hostControl",
      "m2.hostControl.title",
      "m2.hostControl.start",
      "m2.hostControl.closeRating",
      "m2.hostControl.endTasting",
      "m2.play.title",
      "m2.taste.title",
      "m2.circle.title",
      "m2.circle.comingSoonTitle",
    ];

    const missingEN: string[] = [];
    const missingDE: string[] = [];

    for (const key of requiredKeys) {
      if (!getNestedValue(enResources, key)) missingEN.push(key);
      if (!getNestedValue(deResources, key)) missingDE.push(key);
    }

    expect(missingEN, `Missing EN keys: ${missingEN.join(", ")}`).toEqual([]);
    expect(missingDE, `Missing DE keys: ${missingDE.join(", ")}`).toEqual([]);
  });
});

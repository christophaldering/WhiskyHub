import { describe, it, expect } from "vitest";

const BASE = process.env.TEST_BASE_URL || "http://localhost:5000";

const M2_ROUTES = [
  "/m2/tastings",
  "/m2/taste",
  "/m2/circle",
  "/m2/tastings/join",
  "/m2/tastings/host",
  "/m2/tastings/solo",
  "/m2/tastings/dashboard",
  "/m2/taste/profile",
  "/m2/taste/analytics",
  "/m2/taste/drams",
  "/m2/taste/collection",
  "/m2/taste/compare",
  "/m2/taste/pairings",
  "/m2/taste/wheel",
  "/m2/taste/downloads",
  "/m2/taste/recommendations",
  "/m2/taste/benchmark",
  "/m2/taste/settings",
  "/m2/taste/wishlist",
  "/m2/discover/hub",
  "/m2/discover/lexicon",
  "/m2/discover/distilleries",
  "/m2/discover/bottlers",
  "/m2/discover/templates",
  "/m2/discover/guide",
  "/m2/discover/ai-curation",
  "/m2/discover/research",
  "/m2/discover/rabbit-hole",
  "/m2/discover/vocabulary",
  "/m2/discover/about",
  "/m2/discover/donate",
  "/m2/discover/activity",
  "/m2/discover/community",
  "/m2/admin",
  "/m2/impressum",
  "/m2/privacy",
];

describe("E2E route verification", () => {
  it("Landing page returns 200", async () => {
    const res = await fetch(`${BASE}/`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("CaskSense");
  });

  it("/m2 returns 200", async () => {
    const res = await fetch(`${BASE}/m2`, { redirect: "follow" });
    expect(res.status).toBe(200);
  });

  describe("All M2 routes return 200", () => {
    for (const route of M2_ROUTES) {
      it(`${route} returns 200`, async () => {
        const res = await fetch(`${BASE}${route}`);
        expect(res.status).toBe(200);
      });
    }
  });

  it("Auth flow: signin → get tastings → verify data", async () => {
    const signInRes = await fetch(`${BASE}/api/session/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test.m2@casksense.local",
        pin: "Test1234!",
      }),
    });
    expect(signInRes.status).toBe(200);
    const { pid } = await signInRes.json();

    const tastingsRes = await fetch(`${BASE}/api/tastings?participantId=${pid}`, {
      headers: { "x-participant-id": pid },
    });
    expect(tastingsRes.status).toBe(200);
    const tastings = await tastingsRes.json();
    expect(Array.isArray(tastings)).toBe(true);
  });

  it("Existing routes still work — / returns 200", async () => {
    const res = await fetch(`${BASE}/`);
    expect(res.status).toBe(200);
  });

  it("Existing routes still work — /tasting returns 200", async () => {
    const res = await fetch(`${BASE}/tasting`);
    expect(res.status).toBe(200);
  });

  it("Existing routes still work — /sessions returns 200", async () => {
    const res = await fetch(`${BASE}/sessions`);
    expect(res.status).toBe(200);
  });
});

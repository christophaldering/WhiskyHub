import { describe, it, expect } from "vitest";

const BASE = process.env.TEST_BASE_URL || "http://localhost:5000";

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

  it("/m2/tastings returns 200", async () => {
    const res = await fetch(`${BASE}/m2/tastings`);
    expect(res.status).toBe(200);
  });

  it("/m2/taste returns 200", async () => {
    const res = await fetch(`${BASE}/m2/taste`);
    expect(res.status).toBe(200);
  });

  it("/m2/circle returns 200", async () => {
    const res = await fetch(`${BASE}/m2/circle`);
    expect(res.status).toBe(200);
  });

  it("/m2/tastings/join returns 200", async () => {
    const res = await fetch(`${BASE}/m2/tastings/join`);
    expect(res.status).toBe(200);
  });

  it("/m2/tastings/host returns 200", async () => {
    const res = await fetch(`${BASE}/m2/tastings/host`);
    expect(res.status).toBe(200);
  });

  it("/m2/tastings/solo returns 200", async () => {
    const res = await fetch(`${BASE}/m2/tastings/solo`);
    expect(res.status).toBe(200);
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

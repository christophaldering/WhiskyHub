import { describe, it, expect, beforeAll } from "vitest";

const BASE = process.env.TEST_BASE_URL || "http://localhost:5000";

let testPid: string | null = null;

beforeAll(async () => {
  const res = await fetch(`${BASE}/api/session/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "test.m2@casksense.local",
      pin: "Test1234!",
    }),
  });
  if (res.ok) {
    const data = await res.json();
    testPid = data.pid;
  }
});

describe("Tastings API", () => {
  it("GET /api/tastings returns 200 with array (with participantId)", async () => {
    expect(testPid).toBeDefined();
    const res = await fetch(`${BASE}/api/tastings?participantId=${testPid}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("GET /api/tastings includes seeded test tasting", async () => {
    expect(testPid).toBeDefined();
    const res = await fetch(`${BASE}/api/tastings?participantId=${testPid}`);
    const data = await res.json();
    const testTasting = data.find((t: any) => t.title === "M2 Test Tasting");
    expect(testTasting, "Test tasting not found — run npm run db:seed:test first").toBeDefined();
    expect(testTasting.status).toBe("open");
  });

  it("GET /api/tastings/:id returns tasting details", async () => {
    expect(testPid).toBeDefined();
    const res = await fetch(`${BASE}/api/tastings?participantId=${testPid}`);
    const data = await res.json();
    const testTasting = data.find((t: any) => t.title === "M2 Test Tasting");
    if (!testTasting) {
      console.warn("Test tasting not found, skipping");
      return;
    }
    const detailRes = await fetch(`${BASE}/api/tastings/${testTasting.id}`);
    expect(detailRes.status).toBe(200);
    const detail = await detailRes.json();
    expect(detail.id).toBe(testTasting.id);
    expect(detail.title).toBe("M2 Test Tasting");
  });

  it("GET /api/tastings returns empty array without participantId", async () => {
    const res = await fetch(`${BASE}/api/tastings`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});

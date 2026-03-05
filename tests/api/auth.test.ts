import { describe, it, expect } from "vitest";

const BASE = process.env.TEST_BASE_URL || "http://localhost:5000";

describe("Auth session", () => {
  it("POST /api/session/signin returns pid for valid credentials", async () => {
    const res = await fetch(`${BASE}/api/session/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test.m2@casksense.local",
        pin: "Test1234!",
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.pid).toBeDefined();
    expect(typeof data.pid).toBe("string");
  });

  it("POST /api/session/signin rejects invalid credentials", async () => {
    const res = await fetch(`${BASE}/api/session/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test.m2@casksense.local",
        pin: "WrongPassword",
      }),
    });
    expect(res.status).not.toBe(200);
  });
});

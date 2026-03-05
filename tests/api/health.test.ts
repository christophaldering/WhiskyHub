import { describe, it, expect } from "vitest";

const BASE = process.env.TEST_BASE_URL || "http://localhost:5000";

describe("Health endpoint", () => {
  it("GET /api/health returns 200 with expected shape", async () => {
    const res = await fetch(`${BASE}/api/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(typeof data.db).toBe("boolean");
    expect(data.db).toBe(true);
    expect(data.timestamp).toBeDefined();
  });
});

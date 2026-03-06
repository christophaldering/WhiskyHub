import { describe, it, expect } from "vitest";

const BASE = process.env.TEST_BASE_URL || "http://localhost:5000";

describe("Historical Tastings API", () => {
  it("GET /api/historical/tastings returns 200 with expected shape", async () => {
    const res = await fetch(`${BASE}/api/historical/tastings`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("tastings");
    expect(data).toHaveProperty("total");
    expect(Array.isArray(data.tastings)).toBe(true);
    expect(typeof data.total).toBe("number");
  });

  it("GET /api/historical/tastings supports limit and offset", async () => {
    const res = await fetch(`${BASE}/api/historical/tastings?limit=5&offset=0`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.tastings.length).toBeLessThanOrEqual(5);
  });

  it("GET /api/historical/tastings supports search query", async () => {
    const res = await fetch(`${BASE}/api/historical/tastings?search=nonexistent_xyz_123`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.tastings)).toBe(true);
  });

  it("GET /api/historical/tastings/:id returns 404 for invalid id", async () => {
    const res = await fetch(`${BASE}/api/historical/tastings/00000000-0000-0000-0000-000000000000`);
    expect(res.status).toBe(404);
  });

  it("GET /api/historical/tastings/:id returns tasting if exists", async () => {
    const listRes = await fetch(`${BASE}/api/historical/tastings?limit=1`);
    const listData = await listRes.json();
    if (listData.tastings.length === 0) {
      console.warn("No historical tastings found, skipping detail test");
      return;
    }
    const id = listData.tastings[0].id;
    const res = await fetch(`${BASE}/api/historical/tastings/${id}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(id);
    expect(data).toHaveProperty("tastingNumber");
  });

  it("GET /api/historical/whisky-appearances returns empty when no params", async () => {
    const res = await fetch(`${BASE}/api/historical/whisky-appearances`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("appearances");
    expect(data).toHaveProperty("count");
    expect(data.count).toBe(0);
  });

  it("GET /api/historical/whisky-appearances returns results with distillery param", async () => {
    const res = await fetch(`${BASE}/api/historical/whisky-appearances?distillery=lagavulin`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("appearances");
    expect(data).toHaveProperty("count");
    expect(typeof data.count).toBe("number");
  });

  it("GET /api/historical/analytics returns 200 with data", async () => {
    const res = await fetch(`${BASE}/api/historical/analytics`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toBeDefined();
    expect(typeof data).toBe("object");
  });
});

describe("Historical M2 route stability", () => {
  const historicalRoutes = [
    "/m2/taste/historical",
    "/m2/taste/historical/insights",
  ];

  for (const route of historicalRoutes) {
    it(`${route} returns 200`, async () => {
      const res = await fetch(`${BASE}${route}`);
      expect(res.status).toBe(200);
    });
  }
});

describe("Historical Admin API (auth required)", () => {
  it("GET /api/admin/historical/reconciliation returns 403 without auth", async () => {
    const res = await fetch(`${BASE}/api/admin/historical/reconciliation`);
    expect(res.status).toBe(403);
  });

  it("GET /api/admin/historical/import-runs returns 403 without auth", async () => {
    const res = await fetch(`${BASE}/api/admin/historical/import-runs`);
    expect(res.status).toBe(403);
  });

  it("POST /api/admin/historical/import returns 403 without auth", async () => {
    const res = await fetch(`${BASE}/api/admin/historical/import`, { method: "POST" });
    expect(res.status).toBe(403);
  });
});

import { describe, it, expect } from "vitest";

const BASE = "http://localhost:5000";
const ADMIN_PID = "38f152c2-a4b7-49a1-bbf8-b0093cd3cd44";
const COMMUNITY_ID = "d1d8fd17-c63f-42e2-8524-7503803c625b";

async function fetchJSON(path: string, pid?: string) {
  const headers: Record<string, string> = {};
  if (pid) headers["x-participant-id"] = pid;
  const res = await fetch(`${BASE}${path}`, { headers });
  return { status: res.status, data: await res.json() };
}

describe("Community Visibility & Access Control", () => {

  describe("Anonymous user (no x-participant-id)", () => {
    it("sees 0 tastings in the list", async () => {
      const { data } = await fetchJSON("/api/historical/tastings");
      expect(data.total).toBe(0);
      expect(data.tastings).toHaveLength(0);
    });

    it("sees 0 entries in analytics", async () => {
      const { data } = await fetchJSON("/api/historical/analytics");
      expect(data.totalTastings).toBe(0);
      expect(data.totalEntries).toBe(0);
      expect(data.topWhiskies).toHaveLength(0);
    });

    it("sees 0 entries in public-insights (all community_only)", async () => {
      const { data } = await fetchJSON("/api/historical/public-insights");
      expect(data.totalEntries).toBe(0);
    });

    it("gets 403 on a community_only tasting detail", async () => {
      const admin = await fetchJSON("/api/historical/tastings?limit=1", ADMIN_PID);
      expect(admin.data.tastings.length).toBeGreaterThan(0);
      const tastingId = admin.data.tastings[0].id;

      const { status, data } = await fetchJSON(`/api/historical/tastings/${tastingId}`);
      expect(status).toBe(403);
      expect(data.code).toBe("COMMUNITY_ACCESS_REQUIRED");
    });

    it("sees 0 whisky appearances", async () => {
      const { data } = await fetchJSON("/api/historical/whisky-appearances?distillery=lagavulin");
      expect(data.count).toBe(0);
    });
  });

  describe("Admin user", () => {
    it("sees all 32 tastings", async () => {
      const { data } = await fetchJSON("/api/historical/tastings?limit=200", ADMIN_PID);
      expect(data.total).toBe(32);
    });

    it("sees full analytics", async () => {
      const { data } = await fetchJSON("/api/historical/analytics", ADMIN_PID);
      expect(data.totalTastings).toBe(32);
      expect(data.totalEntries).toBeGreaterThan(0);
    });

    it("can access any tasting detail", async () => {
      const list = await fetchJSON("/api/historical/tastings?limit=1", ADMIN_PID);
      const tastingId = list.data.tastings[0].id;
      const { status, data } = await fetchJSON(`/api/historical/tastings/${tastingId}`, ADMIN_PID);
      expect(status).toBe(200);
      expect(data.accessLevel).toBe("full");
    });
  });

  describe("Community member (admin is also member)", () => {
    it("sees enriched tastings from own community", async () => {
      const { data } = await fetchJSON("/api/historical/tastings?limit=200&enriched=true", ADMIN_PID);
      expect(data.total).toBe(32);
      expect(data.tastings[0]).toHaveProperty("avgTotalScore");
    });
  });

  describe("Zod validation on admin endpoints", () => {
    it("rejects invalid archiveVisibility", async () => {
      const res = await fetch(`${BASE}/api/admin/communities/${COMMUNITY_ID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-participant-id": ADMIN_PID },
        body: JSON.stringify({ archiveVisibility: "hacked_value" }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.message).toBe("Invalid input");
    });

    it("rejects invalid member role", async () => {
      const res = await fetch(`${BASE}/api/admin/communities/${COMMUNITY_ID}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-participant-id": ADMIN_PID },
        body: JSON.stringify({ role: "superadmin" }),
      });
      expect(res.status).toBe(400);
    });

    it("accepts valid archiveVisibility update", async () => {
      const res = await fetch(`${BASE}/api/admin/communities/${COMMUNITY_ID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-participant-id": ADMIN_PID },
        body: JSON.stringify({ archiveVisibility: "community_only" }),
      });
      expect(res.status).toBe(200);
    });
  });

  describe("Admin endpoints require auth", () => {
    it("rejects community list without auth", async () => {
      const { status, data } = await fetchJSON("/api/admin/communities");
      expect(status).toBe(403);
      expect(data.message).toBe("Forbidden");
    });
  });
});

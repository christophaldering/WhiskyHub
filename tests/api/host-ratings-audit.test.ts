import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../../server/db";
import { tastings, whiskies, ratings, ratingAudit, participants } from "../../shared/schema";

type AuditSnapshot = {
  nose: number | null;
  taste: number | null;
  finish: number | null;
  overall: number | null;
  notes: string;
  source: string | null;
};

const BASE = process.env.TEST_BASE_URL || "http://localhost:5000";

let testPid: string | null = null;
let testTastingId: string | null = null;
let firstWhiskyId: string | null = null;

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

  // Look up the seeded M2 tasting directly: the public tastings list filters
  // out test data for non-admin users, so we cannot rely on it here.
  const [t] = await db
    .select()
    .from(tastings)
    .where(eq(tastings.title, "M2 Test Tasting"))
    .limit(1);
  if (t) testTastingId = t.id;

  if (testTastingId) {
    const ws = await db
      .select()
      .from(whiskies)
      .where(eq(whiskies.tastingId, testTastingId))
      .orderBy(whiskies.sortOrder);
    if (ws.length > 0) firstWhiskyId = ws[0].id;
  }
});

afterAll(async () => {
  if (testPid && firstWhiskyId) {
    await db
      .delete(ratingAudit)
      .where(and(eq(ratingAudit.participantId, testPid), eq(ratingAudit.whiskyId, firstWhiskyId)));
    await db
      .delete(ratings)
      .where(and(eq(ratings.participantId, testPid), eq(ratings.whiskyId, firstWhiskyId)));
  }
});

describe("Host backfill audit log", () => {
  it("POST /api/tastings/:id/host-ratings saves the rating AND writes one audit row per saved rating", async () => {
    expect(testPid).toBeTruthy();
    expect(testTastingId).toBeTruthy();
    expect(firstWhiskyId).toBeTruthy();

    // Clean slate.
    await db
      .delete(ratingAudit)
      .where(and(eq(ratingAudit.participantId, testPid!), eq(ratingAudit.whiskyId, firstWhiskyId!)));
    await db
      .delete(ratings)
      .where(and(eq(ratings.participantId, testPid!), eq(ratings.whiskyId, firstWhiskyId!)));

    // First call → create path: oldValue should be null.
    const createRes = await fetch(`${BASE}/api/tastings/${testTastingId}/host-ratings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-participant-id": testPid! },
      body: JSON.stringify({
        participantId: testPid,
        ratings: [{ whiskyId: firstWhiskyId, nose: 80, taste: 82, finish: 78, overall: 80, notes: "audit-create" }],
      }),
    });
    expect(createRes.status).toBe(200);
    const createJson = await createRes.json();
    expect(createJson.saved.length).toBe(1);
    expect(createJson.saved[0].source).toBe("host");

    const auditAfterCreate = await db
      .select()
      .from(ratingAudit)
      .where(and(eq(ratingAudit.participantId, testPid!), eq(ratingAudit.whiskyId, firstWhiskyId!)))
      .orderBy(desc(ratingAudit.createdAt));
    expect(auditAfterCreate.length).toBe(1);
    expect(auditAfterCreate[0].action).toBe("host_backfilled");
    expect(auditAfterCreate[0].source).toBe("host");
    expect(auditAfterCreate[0].actorParticipantId).toBe(testPid);
    expect(auditAfterCreate[0].oldValue).toBeNull();
    expect(auditAfterCreate[0].newValue).not.toBeNull();
    expect((auditAfterCreate[0].newValue as AuditSnapshot).overall).toBe(80);
    expect(auditAfterCreate[0].ratingId).toBe(createJson.saved[0].id);

    // Second call → update path: oldValue should reflect the prior rating.
    const updateRes = await fetch(`${BASE}/api/tastings/${testTastingId}/host-ratings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-participant-id": testPid! },
      body: JSON.stringify({
        participantId: testPid,
        ratings: [{ whiskyId: firstWhiskyId, nose: 70, taste: 72, finish: 68, overall: 70, notes: "audit-update" }],
      }),
    });
    expect(updateRes.status).toBe(200);

    const auditAfterUpdate = await db
      .select()
      .from(ratingAudit)
      .where(and(eq(ratingAudit.participantId, testPid!), eq(ratingAudit.whiskyId, firstWhiskyId!)))
      .orderBy(desc(ratingAudit.createdAt));
    expect(auditAfterUpdate.length).toBe(2);
    const latest = auditAfterUpdate[0];
    expect(latest.oldValue).not.toBeNull();
    expect((latest.oldValue as AuditSnapshot).overall).toBe(80);
    expect((latest.newValue as AuditSnapshot).overall).toBe(70);
  });

  it("GET /api/tastings/:id/rating-audit is admin-only (403 for non-admin)", async () => {
    expect(testPid).toBeTruthy();
    expect(testTastingId).toBeTruthy();
    const res = await fetch(`${BASE}/api/tastings/${testTastingId}/rating-audit`, {
      headers: { "x-participant-id": testPid! },
    });
    expect(res.status).toBe(403);
  });

  it("GET /api/tastings/:id/rating-audit requires authentication (401 without session)", async () => {
    expect(testTastingId).toBeTruthy();
    const res = await fetch(`${BASE}/api/tastings/${testTastingId}/rating-audit`);
    expect(res.status).toBe(401);
  });

  it("GET /api/tastings/:id/rating-audit returns entries for an admin", async () => {
    expect(testTastingId).toBeTruthy();

    // Promote the test user to admin temporarily.
    const originalRole = (await db.select().from(participants).where(eq(participants.id, testPid!)).limit(1))[0]?.role;
    await db.update(participants).set({ role: "admin" }).where(eq(participants.id, testPid!));

    try {
      const res = await fetch(
        `${BASE}/api/tastings/${testTastingId}/rating-audit?participantId=${testPid}&whiskyId=${firstWhiskyId}`,
        { headers: { "x-participant-id": testPid! } },
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.entries)).toBe(true);
      expect(json.entries.length).toBeGreaterThanOrEqual(2);
      expect(json.entries[0].action).toBe("host_backfilled");
      expect(json.entries[0].source).toBe("host");
    } finally {
      await db.update(participants).set({ role: originalRole ?? "user" }).where(eq(participants.id, testPid!));
    }
  });
});

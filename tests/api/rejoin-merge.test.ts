import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";
import { storage } from "../../server/storage";
import { db, pool } from "../../server/db";
import {
  participants,
  tastings,
  tastingParticipants,
  whiskies,
  ratings,
} from "@shared/schema";

const BASE = process.env.TEST_BASE_URL || "http://localhost:5000";

let hostId: string;
let tastingId: string;
let extraTastingId: string;
let whiskyA: string;
let whiskyB: string;

const createdParticipantIds: string[] = [];
const createdTastingIds: string[] = [];

async function makeGuest(name: string): Promise<string> {
  const guestName = `${name} #${Math.random().toString(36).slice(2, 6)}`;
  const p = await storage.createParticipant({
    name: guestName,
    experienceLevel: "guest",
  });
  createdParticipantIds.push(p.id);
  return p.id;
}

async function addTp(
  tId: string,
  pId: string,
  rejoinCode?: string,
): Promise<{ rejoinCode: string }> {
  const tp = await storage.addParticipantToTasting({
    tastingId: tId,
    participantId: pId,
    rejoinCode: rejoinCode ?? null,
  });
  return { rejoinCode: tp.rejoinCode! };
}

beforeAll(async () => {
  const signin = await fetch(`${BASE}/api/session/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "test.m2@casksense.local",
      pin: "Test1234!",
    }),
  });
  if (!signin.ok) {
    throw new Error(
      "Test host user missing — run `npm run db:seed:test` before this test suite",
    );
  }
  const data = await signin.json();
  hostId = data.pid;

  const [tasting] = await db
    .insert(tastings)
    .values({
      title: "Rejoin/Merge Test Tasting",
      date: new Date().toISOString().split("T")[0],
      location: "Test",
      hostId,
      code: `RJM${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      status: "open",
      isTestData: true,
    })
    .returning();
  tastingId = tasting.id;
  createdTastingIds.push(tastingId);

  const [t2] = await db
    .insert(tastings)
    .values({
      title: "Rejoin/Merge Extra Tasting",
      date: new Date().toISOString().split("T")[0],
      location: "Test",
      hostId,
      code: `RJX${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      status: "open",
      isTestData: true,
    })
    .returning();
  extraTastingId = t2.id;
  createdTastingIds.push(extraTastingId);

  const [w1] = await db
    .insert(whiskies)
    .values({
      tastingId,
      name: "RJM Whisky A",
      distillery: "Test",
      sortOrder: 0,
    })
    .returning();
  whiskyA = w1.id;
  const [w2] = await db
    .insert(whiskies)
    .values({
      tastingId,
      name: "RJM Whisky B",
      distillery: "Test",
      sortOrder: 1,
    })
    .returning();
  whiskyB = w2.id;
});

afterAll(async () => {
  for (const tid of createdTastingIds) {
    await db.delete(ratings).where(eq(ratings.tastingId, tid));
    await db.delete(tastingParticipants).where(eq(tastingParticipants.tastingId, tid));
    await db.delete(whiskies).where(eq(whiskies.tastingId, tid));
    await db.delete(tastings).where(eq(tastings.id, tid));
  }
  for (const pid of createdParticipantIds) {
    await db.delete(participants).where(eq(participants.id, pid));
  }
});

describe("storage.addParticipantToTasting — rejoin code uniqueness", () => {
  it("retries on collision and still issues a unique code", async () => {
    const collidedCode = "ZZZZZZ";
    const aId = await makeGuest("Collide A");
    const aRes = await addTp(tastingId, aId, collidedCode);
    expect(aRes.rejoinCode).toBe(collidedCode);

    const bId = await makeGuest("Collide B");
    const bRes = await addTp(tastingId, bId, collidedCode);

    expect(bRes.rejoinCode).toBeTruthy();
    expect(bRes.rejoinCode).not.toBe(collidedCode);
    expect(bRes.rejoinCode).toMatch(/^[A-Z0-9]{6}$/);
  });

  it("auto-generated codes match the expected alphabet", async () => {
    const pId = await makeGuest("Auto Code");
    const res = await addTp(tastingId, pId);
    expect(res.rejoinCode).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  });
});

describe("storage.getTastingParticipantByRejoinCode — case/format tolerance", () => {
  it("matches with mixed case and dashes around the code", async () => {
    const pId = await makeGuest("Tolerant");
    const { rejoinCode } = await addTp(tastingId, pId);

    const lower = rejoinCode.toLowerCase();
    const dashed = `${lower.slice(0, 3)}-${lower.slice(3)}`;
    const spaced = ` ${rejoinCode.slice(0, 2)} ${rejoinCode.slice(2)} `;

    const a = await storage.getTastingParticipantByRejoinCode(tastingId, lower);
    const b = await storage.getTastingParticipantByRejoinCode(tastingId, dashed);
    const c = await storage.getTastingParticipantByRejoinCode(tastingId, spaced);

    expect(a?.participant.id).toBe(pId);
    expect(b?.participant.id).toBe(pId);
    expect(c?.participant.id).toBe(pId);
  });

  it("returns undefined for an unknown code", async () => {
    const res = await storage.getTastingParticipantByRejoinCode(
      tastingId,
      "NOPE99",
    );
    expect(res).toBeUndefined();
  });

  it("does not match a code from a different tasting", async () => {
    const pId = await makeGuest("Cross Tasting");
    const { rejoinCode } = await addTp(extraTastingId, pId);
    const res = await storage.getTastingParticipantByRejoinCode(
      tastingId,
      rejoinCode,
    );
    expect(res).toBeUndefined();
  });
});

describe("storage.mergeParticipantsInTasting — rating preservation", () => {
  it("ratingsMoved + ratingsDiscarded equals source ratings count", async () => {
    const srcId = await makeGuest("Merge Src");
    const tgtId = await makeGuest("Merge Tgt");
    await addTp(tastingId, srcId);
    await addTp(tastingId, tgtId);

    await storage.upsertRating({
      tastingId,
      whiskyId: whiskyA,
      participantId: srcId,
      nose: 70,
      taste: 70,
      finish: 70,
      overall: 70,
    });
    await storage.upsertRating({
      tastingId,
      whiskyId: whiskyB,
      participantId: srcId,
      nose: 80,
      taste: 80,
      finish: 80,
      overall: 80,
    });
    await storage.upsertRating({
      tastingId,
      whiskyId: whiskyA,
      participantId: tgtId,
      nose: 60,
      taste: 60,
      finish: 60,
      overall: 60,
    });

    const srcCountBefore = (
      await db
        .select()
        .from(ratings)
        .where(
          and(
            eq(ratings.tastingId, tastingId),
            eq(ratings.participantId, srcId),
          ),
        )
    ).length;

    const result = await storage.mergeParticipantsInTasting(
      tastingId,
      srcId,
      tgtId,
    );

    expect(result.ratingsMoved + result.ratingsDiscarded).toBe(srcCountBefore);
    expect(result.ratingsMoved).toBe(1);
    expect(result.ratingsDiscarded).toBe(1);

    const srcLeftover = await db
      .select()
      .from(ratings)
      .where(
        and(eq(ratings.tastingId, tastingId), eq(ratings.participantId, srcId)),
      );
    expect(srcLeftover.length).toBe(0);

    const tgtRatings = await db
      .select()
      .from(ratings)
      .where(
        and(eq(ratings.tastingId, tastingId), eq(ratings.participantId, tgtId)),
      );
    expect(tgtRatings.length).toBe(2);
  });

  it("removes a guest source participant with no other tastings after merge", async () => {
    const srcId = await makeGuest("Merge Lone");
    const tgtId = await makeGuest("Merge Lone Tgt");
    await addTp(tastingId, srcId);
    await addTp(tastingId, tgtId);

    await storage.mergeParticipantsInTasting(tastingId, srcId, tgtId);

    const stillThere = await db
      .select()
      .from(participants)
      .where(eq(participants.id, srcId));
    expect(stillThere.length).toBe(0);
  });

  it("keeps source participant if they are still in another tasting", async () => {
    const srcId = await makeGuest("Merge Multi");
    const tgtId = await makeGuest("Merge Multi Tgt");
    await addTp(tastingId, srcId);
    await addTp(extraTastingId, srcId);
    await addTp(tastingId, tgtId);

    await storage.mergeParticipantsInTasting(tastingId, srcId, tgtId);

    const stillThere = await db
      .select()
      .from(participants)
      .where(eq(participants.id, srcId));
    expect(stillThere.length).toBe(1);

    const removedFromTasting = await db
      .select()
      .from(tastingParticipants)
      .where(
        and(
          eq(tastingParticipants.tastingId, tastingId),
          eq(tastingParticipants.participantId, srcId),
        ),
      );
    expect(removedFromTasting.length).toBe(0);

    const stillInExtra = await db
      .select()
      .from(tastingParticipants)
      .where(
        and(
          eq(tastingParticipants.tastingId, extraTastingId),
          eq(tastingParticipants.participantId, srcId),
        ),
      );
    expect(stillInExtra.length).toBe(1);
  });

  it("rejects merging the host away", async () => {
    const tgtId = await makeGuest("Host Tgt");
    await addTp(tastingId, tgtId);
    await expect(
      storage.mergeParticipantsInTasting(tastingId, hostId, tgtId),
    ).rejects.toThrow(/host/i);
  });
});

describe("API /guest-rejoin", () => {
  it("rejoins case- and format-tolerantly", async () => {
    const pId = await makeGuest("API Tolerant");
    const { rejoinCode } = await addTp(tastingId, pId);

    const variant = `${rejoinCode.slice(0, 3).toLowerCase()}-${rejoinCode.slice(3).toLowerCase()}`;
    const res = await fetch(
      `${BASE}/api/tastings/${tastingId}/guest-rejoin`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejoinCode: variant }),
      },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(pId);
    expect(body.tastingId).toBe(tastingId);
    expect(body.rejoinCode).toBe(rejoinCode);
  });

  it("returns 400 when no code is provided", async () => {
    const res = await fetch(
      `${BASE}/api/tastings/${tastingId}/guest-rejoin`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown code", async () => {
    const res = await fetch(
      `${BASE}/api/tastings/${tastingId}/guest-rejoin`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejoinCode: "NOPE99" }),
      },
    );
    expect(res.status).toBe(404);
  });
});

describe("API /merge-participants — auth & authorisation", () => {
  let srcId: string;
  let tgtId: string;
  let strangerId: string;

  beforeAll(async () => {
    srcId = await makeGuest("API Merge Src");
    tgtId = await makeGuest("API Merge Tgt");
    strangerId = await makeGuest("API Merge Stranger");
    await addTp(tastingId, srcId);
    await addTp(tastingId, tgtId);
  });

  it("rejects without x-participant-id (401)", async () => {
    const res = await fetch(
      `${BASE}/api/tastings/${tastingId}/merge-participants`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceParticipantId: srcId,
          targetParticipantId: tgtId,
        }),
      },
    );
    expect(res.status).toBe(401);
  });

  it("rejects with a non-host participant id (403)", async () => {
    const res = await fetch(
      `${BASE}/api/tastings/${tastingId}/merge-participants`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-participant-id": strangerId,
        },
        body: JSON.stringify({
          sourceParticipantId: srcId,
          targetParticipantId: tgtId,
        }),
      },
    );
    expect(res.status).toBe(403);
  });

  it("succeeds when the host calls it", async () => {
    const res = await fetch(
      `${BASE}/api/tastings/${tastingId}/merge-participants`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-participant-id": hostId,
        },
        body: JSON.stringify({
          sourceParticipantId: srcId,
          targetParticipantId: tgtId,
        }),
      },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(typeof body.ratingsMoved).toBe("number");
    expect(typeof body.ratingsDiscarded).toBe("number");
  });
});

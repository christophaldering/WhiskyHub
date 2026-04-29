import { z } from "zod";
import { pool } from "./db";
import type { LabsToolDefinition, LabsToolSource } from "./labs-ask-tools";

const tastingIdSchema = z.string().trim().min(1).max(80);

const baseArgsSchema = z.object({ tasting_id: tastingIdSchema }).strict();

type AccessTasting = {
  id: string;
  title: string | null;
  date: string | null;
  location: string | null;
  status: string | null;
  hostId: string | null;
  ratingScale: number | null;
  blindMode: boolean | null;
};

type AccessResult = { ok: boolean; tasting?: AccessTasting };

function tastingReportRoute(id: string): string {
  return `/labs/results/${id}/report`;
}

function fmt(value: unknown, digits = 1): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const k = Math.pow(10, digits);
  return Math.round(n * k) / k;
}

function emptyArgs(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export async function verifyTastingAccess(
  participantId: string,
  tastingId: string,
): Promise<AccessResult> {
  const t = await pool.query(
    `SELECT id, title, location, date, status,
            host_id AS "hostId",
            rating_scale AS "ratingScale",
            blind_mode AS "blindMode"
     FROM tastings WHERE id = $1 LIMIT 1`,
    [tastingId],
  );
  const row = t.rows[0] as AccessTasting | undefined;
  if (!row) return { ok: false };
  if (row.hostId === participantId) return { ok: true, tasting: row };
  const p = await pool.query(
    `SELECT 1 FROM tasting_participants WHERE tasting_id = $1 AND participant_id = $2 LIMIT 1`,
    [tastingId, participantId],
  );
  if ((p.rowCount ?? 0) > 0) return { ok: true, tasting: row };
  return { ok: false };
}

function tastingSource(tasting: AccessTasting): LabsToolSource {
  const subtitle = [tasting.location, tasting.date].filter(Boolean).join(" \u2022 ");
  return {
    type: "tasting",
    id: tasting.id,
    title: tasting.title ?? "",
    subtitle: subtitle || undefined,
    route: tastingReportRoute(tasting.id),
  };
}

const accessDeniedDe = "Du bist weder Host noch Teilnehmer dieses Tastings.";
const accessDeniedEn = "You are neither host nor a participant of this tasting.";

function denied(locale: "de" | "en") {
  return {
    data: { error: "access_denied", message: locale === "de" ? accessDeniedDe : accessDeniedEn },
    sources: [] as LabsToolSource[],
  };
}

const getTastingSummary: LabsToolDefinition = {
  name: "get_tasting_summary",
  description:
    "Return a high-level summary of THE tasting that the user is currently asking about: title, date, location, status, blind mode, number of participants, number of whiskies, and the list of whiskies (name, distillery, region, age, peat) in pour order. Use this for orientation questions like 'What was poured?', 'Wie hieß das Tasting?', 'Wer war dabei?'.",
  parameters: {
    type: "object",
    properties: {
      tasting_id: { type: "string", description: "The tasting id provided in the system prompt." },
    },
    required: ["tasting_id"],
    additionalProperties: false,
  },
  handler: async (participantId, rawArgs, locale) => {
    const args = baseArgsSchema.parse(emptyArgs(rawArgs));
    const access = await verifyTastingAccess(participantId, args.tasting_id);
    if (!access.ok || !access.tasting) return denied(locale);
    const t = access.tasting;
    const ws = await pool.query(
      `SELECT id, name, distillery, region, age, peat_level AS "peatLevel", cask_type AS "caskType", sort_order AS "sortOrder"
       FROM whiskies WHERE tasting_id = $1
       ORDER BY sort_order ASC NULLS LAST`,
      [args.tasting_id],
    );
    type WRow = { id: string; name: string | null; distillery: string | null; region: string | null; age: string | null; peatLevel: string | null; caskType: string | null; sortOrder: number | null };
    const whiskies = (ws.rows as WRow[]).map((w) => ({
      name: w.name,
      distillery: w.distillery,
      region: w.region,
      age: w.age,
      peat_level: w.peatLevel,
      cask_type: w.caskType,
      position: w.sortOrder,
    }));
    const partsRow = await pool.query(
      `SELECT COUNT(*)::int AS c FROM tasting_participants WHERE tasting_id = $1`,
      [args.tasting_id],
    );
    const ratingsRow = await pool.query(
      `SELECT COUNT(*)::int AS c FROM ratings WHERE tasting_id = $1`,
      [args.tasting_id],
    );
    return {
      data: {
        tasting_id: t.id,
        title: t.title,
        date: t.date,
        location: t.location,
        status: t.status,
        blind_mode: t.blindMode,
        rating_scale: t.ratingScale,
        participant_count: (partsRow.rows[0] as { c: number } | undefined)?.c ?? 0,
        whisky_count: whiskies.length,
        rating_count: (ratingsRow.rows[0] as { c: number } | undefined)?.c ?? 0,
        whiskies,
      },
      sources: [tastingSource(t)],
    };
  },
};

const getPerDramStats: LabsToolDefinition = {
  name: "get_per_dram_stats",
  description:
    "Return per-whisky statistics for THE tasting: average overall/nose/taste/finish, standard deviation of overall (high stddev = polarising), number of ratings, plus the highest and lowest single overall score for each dram. Use this for 'Welcher Dram hat polarisiert?', 'Welcher war Top?', 'Wo lag der Schnitt?', 'Average score per dram'.",
  parameters: {
    type: "object",
    properties: {
      tasting_id: { type: "string", description: "The tasting id provided in the system prompt." },
    },
    required: ["tasting_id"],
    additionalProperties: false,
  },
  handler: async (participantId, rawArgs, locale) => {
    const args = baseArgsSchema.parse(emptyArgs(rawArgs));
    const access = await verifyTastingAccess(participantId, args.tasting_id);
    if (!access.ok || !access.tasting) return denied(locale);
    const sql = `
      SELECT w.id, w.name, w.distillery, w.region, w.sort_order AS "sortOrder",
             AVG(r.overall) AS avg_overall,
             AVG(r.nose) AS avg_nose,
             AVG(r.taste) AS avg_taste,
             AVG(r.finish) AS avg_finish,
             STDDEV_SAMP(r.overall) AS stddev_overall,
             COUNT(r.id)::int AS rating_count,
             MAX(r.overall) AS max_overall,
             MIN(r.overall) AS min_overall
      FROM whiskies w
      LEFT JOIN ratings r ON r.whisky_id = w.id AND r.tasting_id = w.tasting_id
      WHERE w.tasting_id = $1
      GROUP BY w.id, w.name, w.distillery, w.region, w.sort_order
      ORDER BY w.sort_order ASC NULLS LAST
    `;
    const result = await pool.query(sql, [args.tasting_id]);
    type Row = { id: string; name: string | null; distillery: string | null; region: string | null; sortOrder: number | null; avg_overall: string | null; avg_nose: string | null; avg_taste: string | null; avg_finish: string | null; stddev_overall: string | null; rating_count: number; max_overall: number | null; min_overall: number | null };
    const drams = (result.rows as Row[]).map((r) => ({
      whisky_id: r.id,
      name: r.name,
      distillery: r.distillery,
      region: r.region,
      position: r.sortOrder,
      avg_overall: fmt(r.avg_overall),
      avg_nose: fmt(r.avg_nose),
      avg_taste: fmt(r.avg_taste),
      avg_finish: fmt(r.avg_finish),
      stddev_overall: fmt(r.stddev_overall, 2),
      rating_count: r.rating_count,
      max_overall: fmt(r.max_overall),
      min_overall: fmt(r.min_overall),
    }));
    const sortedByAvg = drams
      .filter((d) => d.avg_overall !== null)
      .slice()
      .sort((a, b) => (b.avg_overall ?? 0) - (a.avg_overall ?? 0));
    const sortedByStddev = drams
      .filter((d) => d.stddev_overall !== null)
      .slice()
      .sort((a, b) => (b.stddev_overall ?? 0) - (a.stddev_overall ?? 0));
    return {
      data: {
        tasting_id: access.tasting.id,
        drams,
        top_dram: sortedByAvg[0] ?? null,
        bottom_dram: sortedByAvg[sortedByAvg.length - 1] ?? null,
        most_polarising_dram: sortedByStddev[0] ?? null,
      },
      sources: [tastingSource(access.tasting)],
    };
  },
};

const getTasterAgreementMatrix: LabsToolDefinition = {
  name: "get_taster_agreement_matrix",
  description:
    "Return how close each pair of participants rated whiskies in THE tasting. Returns the closest pair, the most divergent pair, and (for the asking user) which other participant was closest to them in average absolute deviation of overall scores. Use this for 'Wer war meinem Geschmack am nächsten?', 'Wo waren wir uns am einigsten?', 'Closest taster to me'.",
  parameters: {
    type: "object",
    properties: {
      tasting_id: { type: "string", description: "The tasting id provided in the system prompt." },
    },
    required: ["tasting_id"],
    additionalProperties: false,
  },
  handler: async (participantId, rawArgs, locale) => {
    const args = baseArgsSchema.parse(emptyArgs(rawArgs));
    const access = await verifyTastingAccess(participantId, args.tasting_id);
    if (!access.ok || !access.tasting) return denied(locale);
    const sql = `
      SELECT r.participant_id, r.whisky_id, r.overall, p.name AS participant_name
      FROM ratings r
      JOIN participants p ON p.id = r.participant_id
      WHERE r.tasting_id = $1 AND r.overall IS NOT NULL
    `;
    const result = await pool.query(sql, [args.tasting_id]);
    type Row = { participant_id: string; whisky_id: string; overall: number; participant_name: string | null };
    const rows = result.rows as Row[];
    const byPerson = new Map<string, Map<string, number>>();
    const names = new Map<string, string>();
    for (const r of rows) {
      names.set(r.participant_id, r.participant_name ?? "?");
      let inner = byPerson.get(r.participant_id);
      if (!inner) {
        inner = new Map();
        byPerson.set(r.participant_id, inner);
      }
      inner.set(r.whisky_id, Number(r.overall));
    }
    const ids = Array.from(byPerson.keys());
    type Pair = { a_id: string; b_id: string; a_name: string; b_name: string; avg_abs_delta: number; shared_count: number };
    const pairs: Pair[] = [];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const A = byPerson.get(ids[i]);
        const B = byPerson.get(ids[j]);
        if (!A || !B) continue;
        let sum = 0;
        let n = 0;
        A.forEach((av, wid) => {
          const bv = B.get(wid);
          if (typeof bv === "number") {
            sum += Math.abs(av - bv);
            n += 1;
          }
        });
        if (n >= 2) {
          pairs.push({
            a_id: ids[i],
            b_id: ids[j],
            a_name: names.get(ids[i]) ?? "?",
            b_name: names.get(ids[j]) ?? "?",
            avg_abs_delta: fmt(sum / n) ?? 0,
            shared_count: n,
          });
        }
      }
    }
    pairs.sort((a, b) => a.avg_abs_delta - b.avg_abs_delta);
    const closestPair = pairs[0] ?? null;
    const farthestPair = pairs[pairs.length - 1] ?? null;
    const userPairs = pairs
      .filter((p) => p.a_id === participantId || p.b_id === participantId)
      .map((p) => {
        const otherId = p.a_id === participantId ? p.b_id : p.a_id;
        const otherName = p.a_id === participantId ? p.b_name : p.a_name;
        return {
          other_id: otherId,
          other_name: otherName,
          avg_abs_delta: p.avg_abs_delta,
          shared_count: p.shared_count,
        };
      });
    userPairs.sort((a, b) => a.avg_abs_delta - b.avg_abs_delta);
    return {
      data: {
        tasting_id: access.tasting.id,
        pair_count: pairs.length,
        closest_pair: closestPair,
        most_divergent_pair: farthestPair,
        nearest_to_user: userPairs[0] ?? null,
        farthest_from_user: userPairs[userPairs.length - 1] ?? null,
        user_pairs: userPairs,
      },
      sources: [tastingSource(access.tasting)],
    };
  },
};

const getUserConsistency: LabsToolDefinition = {
  name: "get_user_consistency",
  description:
    "Return the asking user's rating consistency in THE tasting: their average absolute deviation from the per-whisky group mean (lower = closer to the group), and a ranked list of all participants by the same metric (median taster first). Use this for 'Wie konsistent war ich?', 'Wer ist Median-Taster?', 'Wer ist am dichtesten am Schnitt?'.",
  parameters: {
    type: "object",
    properties: {
      tasting_id: { type: "string", description: "The tasting id provided in the system prompt." },
    },
    required: ["tasting_id"],
    additionalProperties: false,
  },
  handler: async (participantId, rawArgs, locale) => {
    const args = baseArgsSchema.parse(emptyArgs(rawArgs));
    const access = await verifyTastingAccess(participantId, args.tasting_id);
    if (!access.ok || !access.tasting) return denied(locale);
    const sql = `
      SELECT r.participant_id, r.whisky_id, r.overall, p.name AS participant_name,
             gw.group_avg
      FROM ratings r
      JOIN participants p ON p.id = r.participant_id
      JOIN (
        SELECT whisky_id, AVG(overall) AS group_avg
        FROM ratings WHERE tasting_id = $1 AND overall IS NOT NULL
        GROUP BY whisky_id
      ) gw ON gw.whisky_id = r.whisky_id
      WHERE r.tasting_id = $1 AND r.overall IS NOT NULL
    `;
    const res = await pool.query(sql, [args.tasting_id]);
    type Row = { participant_id: string; whisky_id: string; overall: number; participant_name: string | null; group_avg: string };
    const rows = res.rows as Row[];
    const agg = new Map<string, { name: string; sum: number; n: number }>();
    for (const r of rows) {
      let bucket = agg.get(r.participant_id);
      if (!bucket) {
        bucket = { name: r.participant_name ?? "?", sum: 0, n: 0 };
        agg.set(r.participant_id, bucket);
      }
      bucket.sum += Math.abs(Number(r.overall) - Number(r.group_avg));
      bucket.n += 1;
    }
    const ranked = Array.from(agg.entries())
      .map(([id, b]) => ({
        participant_id: id,
        participant_name: b.name,
        is_user: id === participantId,
        avg_deviation: fmt(b.n > 0 ? b.sum / b.n : 0) ?? 0,
        rating_count: b.n,
      }))
      .sort((a, b) => a.avg_deviation - b.avg_deviation);
    const userEntry = ranked.find((r) => r.is_user) ?? null;
    return {
      data: {
        tasting_id: access.tasting.id,
        user: userEntry,
        median_taster: ranked[0] ?? null,
        ranked_by_consistency: ranked,
      },
      sources: [tastingSource(access.tasting)],
    };
  },
};

const getRevealTimeline: LabsToolDefinition = {
  name: "get_reveal_timeline",
  description:
    "Return how scores changed for the asking user (and the group) once the whiskies were revealed in THE tasting. Uses the per-rating blind_vs_open_delta column (positive = score went UP after reveal). Per-whisky group average delta and the user's own delta are returned. Use this for 'Wie hat das Reveal die Bewertung verändert?', 'Welcher Whisky hat nach Enthüllung gewonnen?'.",
  parameters: {
    type: "object",
    properties: {
      tasting_id: { type: "string", description: "The tasting id provided in the system prompt." },
    },
    required: ["tasting_id"],
    additionalProperties: false,
  },
  handler: async (participantId, rawArgs, locale) => {
    const args = baseArgsSchema.parse(emptyArgs(rawArgs));
    const access = await verifyTastingAccess(participantId, args.tasting_id);
    if (!access.ok || !access.tasting) return denied(locale);
    const sql = `
      SELECT w.id, w.name, w.distillery,
             AVG(r.blind_vs_open_delta) FILTER (WHERE r.blind_vs_open_delta IS NOT NULL) AS group_delta,
             COUNT(r.blind_vs_open_delta) FILTER (WHERE r.blind_vs_open_delta IS NOT NULL)::int AS group_n,
             MAX(r.blind_vs_open_delta) FILTER (WHERE r.participant_id = $2) AS user_delta
      FROM whiskies w
      LEFT JOIN ratings r ON r.whisky_id = w.id AND r.tasting_id = w.tasting_id
      WHERE w.tasting_id = $1
      GROUP BY w.id, w.name, w.distillery, w.sort_order
      ORDER BY w.sort_order ASC NULLS LAST
    `;
    const result = await pool.query(sql, [args.tasting_id, participantId]);
    type Row = { id: string; name: string | null; distillery: string | null; group_delta: string | null; group_n: number; user_delta: string | null };
    const drams = (result.rows as Row[]).map((r) => ({
      whisky_id: r.id,
      name: r.name,
      distillery: r.distillery,
      group_delta_avg: fmt(r.group_delta),
      group_sample_size: r.group_n,
      user_delta: fmt(r.user_delta),
    }));
    const hasData = drams.some((d) => d.group_delta_avg !== null || d.user_delta !== null);
    return {
      data: {
        tasting_id: access.tasting.id,
        has_reveal_data: hasData,
        drams,
      },
      sources: [tastingSource(access.tasting)],
    };
  },
};

export const labsTastingAskTools: LabsToolDefinition[] = [
  getTastingSummary,
  getPerDramStats,
  getTasterAgreementMatrix,
  getUserConsistency,
  getRevealTimeline,
];

export const labsTastingAskToolMap: Map<string, LabsToolDefinition> = new Map(
  labsTastingAskTools.map((t) => [t.name, t]),
);

export const TASTING_STATS_CHART_TOOL_NAMES = new Set<string>([
  "get_per_dram_stats",
  "get_user_consistency",
  "get_reveal_timeline",
]);

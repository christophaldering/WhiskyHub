import { z } from "zod";
import { pool } from "./db";

export type LabsToolSource = {
  type: "whisky" | "tasting" | "distillery" | "lexicon";
  id: string;
  title: string;
  subtitle?: string;
  snippet?: string;
  route: string;
};

export type LabsToolResult = {
  data: unknown;
  sources: LabsToolSource[];
};

export type LabsToolHandler = (
  participantId: string,
  rawArgs: unknown,
  locale: "de" | "en",
) => Promise<LabsToolResult>;

export type LabsToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: LabsToolHandler;
};

const limitSchema = z.coerce.number().int().min(1).max(20).default(5);
const optionalString = z.string().trim().min(1).max(80).optional();
const peatLevelSchema = z
  .enum(["none", "light", "medium", "heavy"])
  .optional();
const scoreSchema = z.coerce.number().min(0).max(100).optional();

const topWhiskiesSchema = z.object({
  limit: limitSchema,
  region: optionalString,
  peat_level: peatLevelSchema,
  distillery: optionalString,
});

const topTastingsSchema = z.object({
  limit: limitSchema,
});

const overviewStatsSchema = z.object({}).strict().optional();

const countWhiskiesSchema = z.object({
  region: optionalString,
  peat_level: peatLevelSchema,
  distillery: optionalString,
  min_score: scoreSchema,
  max_score: scoreSchema,
});

const recentRatingsSchema = z.object({
  limit: limitSchema,
});

const tastingsRoleSchema = z.object({}).strict().optional();

function emptyArgs(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function whiskyRoute(id: string): string {
  return `/labs/explore/bottles/${id}`;
}

function tastingRoute(id: string): string {
  return `/labs/tastings/${id}?section=praesentation`;
}

function fmtScore(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.round(value * 10) / 10;
}

const getUserTopWhiskies: LabsToolDefinition = {
  name: "get_user_top_whiskies",
  description:
    "Return the user's own highest-rated whiskies (sorted by their personal overall score). Optional filters: region (e.g. 'Islay', 'Speyside'), peat_level ('none' | 'light' | 'medium' | 'heavy'), distillery (substring match). Use this when the user asks about THEIR best/top/favorite whiskies.",
  parameters: {
    type: "object",
    properties: {
      limit: {
        type: "integer",
        description: "How many whiskies to return (1-20, default 5).",
        minimum: 1,
        maximum: 20,
      },
      region: { type: "string", description: "Optional region filter (e.g. 'Islay')." },
      peat_level: {
        type: "string",
        description: "Optional peat level filter.",
        enum: ["none", "light", "medium", "heavy"],
      },
      distillery: { type: "string", description: "Optional distillery substring filter." },
    },
    additionalProperties: false,
  },
  handler: async (participantId, rawArgs) => {
    const args = topWhiskiesSchema.parse(emptyArgs(rawArgs));
    const params: unknown[] = [participantId];
    const conditions: string[] = [];
    if (args.region) {
      params.push(args.region);
      conditions.push(`unaccent(coalesce(w.region, '')) ILIKE '%' || unaccent($${params.length}) || '%'`);
    }
    if (args.peat_level) {
      params.push(args.peat_level);
      conditions.push(`lower(coalesce(w.peat_level, '')) = lower($${params.length})`);
    }
    if (args.distillery) {
      params.push(args.distillery);
      conditions.push(`unaccent(coalesce(w.distillery, '')) ILIKE '%' || unaccent($${params.length}) || '%'`);
    }
    const whereExtra = conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";
    const limit = args.limit;
    const sql = `
      SELECT w.id, w.name, w.distillery, w.region, w.age,
             AVG(r.overall) AS avg_score,
             COUNT(r.id) AS rating_count
      FROM ratings r
      JOIN whiskies w ON w.id = r.whisky_id
      WHERE r.participant_id = $1
        ${whereExtra}
      GROUP BY w.id, w.name, w.distillery, w.region, w.age
      ORDER BY avg_score DESC NULLS LAST
      LIMIT ${limit}
    `;
    const result = await pool.query(sql, params);
    type Row = { id: string; name: string | null; distillery: string | null; region: string | null; age: string | null; avg_score: string | null; rating_count: string | null };
    const rows = result.rows as Row[];
    const sources: LabsToolSource[] = rows.map((r) => ({
      type: "whisky",
      id: String(r.id),
      title: String(r.name ?? ""),
      subtitle: [r.distillery, r.region, r.age].filter(Boolean).join(" \u2022 ") || undefined,
      route: whiskyRoute(String(r.id)),
    }));
    return {
      data: {
        whiskies: rows.map((r) => ({
          name: r.name,
          distillery: r.distillery,
          region: r.region,
          age: r.age,
          avg_score: fmtScore(Number(r.avg_score)),
          rating_count: Number(r.rating_count) || 0,
        })),
        applied_filters: {
          region: args.region ?? null,
          peat_level: args.peat_level ?? null,
          distillery: args.distillery ?? null,
        },
        total_returned: rows.length,
      },
      sources,
    };
  },
};

const getUserTopTastings: LabsToolDefinition = {
  name: "get_user_top_tastings",
  description:
    "Return the user's own tastings sorted by their personal average rating (highest first). Each tasting shows the average overall score the user gave across all whiskies in that tasting. Use this for 'best tasting' / 'top tastings' questions.",
  parameters: {
    type: "object",
    properties: {
      limit: {
        type: "integer",
        description: "How many tastings to return (1-20, default 5).",
        minimum: 1,
        maximum: 20,
      },
    },
    additionalProperties: false,
  },
  handler: async (participantId, rawArgs) => {
    const args = topTastingsSchema.parse(emptyArgs(rawArgs));
    const sql = `
      SELECT t.id, t.title, t.location, t.date::text AS date,
             AVG(r.overall) AS avg_score,
             COUNT(r.id) AS rating_count
      FROM ratings r
      JOIN tastings t ON t.id = r.tasting_id
      WHERE r.participant_id = $1
      GROUP BY t.id, t.title, t.location, t.date
      HAVING COUNT(r.id) > 0
      ORDER BY avg_score DESC NULLS LAST
      LIMIT ${args.limit}
    `;
    const result = await pool.query(sql, [participantId]);
    type Row = { id: string; title: string | null; location: string | null; date: string | null; avg_score: string | null; rating_count: string | null };
    const rows = result.rows as Row[];
    const sources: LabsToolSource[] = rows.map((r) => ({
      type: "tasting",
      id: String(r.id),
      title: String(r.title ?? ""),
      subtitle: [r.location, r.date].filter(Boolean).join(" \u2022 ") || undefined,
      route: tastingRoute(String(r.id)),
    }));
    return {
      data: {
        tastings: rows.map((r) => ({
          title: r.title,
          location: r.location,
          date: r.date,
          avg_score: fmtScore(Number(r.avg_score)),
          rating_count: Number(r.rating_count) || 0,
        })),
        total_returned: rows.length,
      },
      sources,
    };
  },
};

const getUserOverviewStats: LabsToolDefinition = {
  name: "get_user_overview_stats",
  description:
    "Return aggregate statistics about the user's whisky journey: total distinct whiskies tasted, total tastings attended, total ratings submitted, average score across all ratings, and the top 5 regions by frequency. Use this for 'how many whiskies have I tried', 'overall stats', 'how active am I' style questions.",
  parameters: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  handler: async (participantId) => {
    overviewStatsSchema.parse(undefined);
    const totalsSql = `
      WITH user_ratings AS (
        SELECT * FROM ratings WHERE participant_id = $1
      )
      SELECT
        (SELECT COUNT(DISTINCT whisky_id) FROM user_ratings)::int AS rated_whiskies,
        (SELECT COUNT(DISTINCT w.id)
         FROM whiskies w
         JOIN tasting_participants tp ON tp.tasting_id = w.tasting_id
         WHERE tp.participant_id = $1)::int AS total_whiskies,
        (SELECT COUNT(DISTINCT tasting_id) FROM tasting_participants WHERE participant_id = $1)::int AS total_tastings,
        (SELECT COUNT(*) FROM user_ratings)::int AS total_ratings,
        (SELECT AVG(overall) FROM user_ratings) AS avg_score,
        (SELECT MAX(overall) FROM user_ratings) AS max_score,
        (SELECT MIN(overall) FROM user_ratings) AS min_score
    `;
    const totalsResult = await pool.query(totalsSql, [participantId]);
    const totals = totalsResult.rows[0] as {
      rated_whiskies: number | null;
      total_whiskies: number | null;
      total_tastings: number | null;
      total_ratings: number | null;
      avg_score: string | null;
      max_score: string | null;
      min_score: string | null;
    };

    const regionsSql = `
      SELECT coalesce(w.region, 'Unknown') AS region, COUNT(DISTINCT w.id)::int AS whisky_count
      FROM whiskies w
      JOIN tasting_participants tp ON tp.tasting_id = w.tasting_id
      WHERE tp.participant_id = $1
      GROUP BY coalesce(w.region, 'Unknown')
      ORDER BY whisky_count DESC
      LIMIT 5
    `;
    const regionsResult = await pool.query(regionsSql, [participantId]);
    const regions = (regionsResult.rows as Array<{ region: string; whisky_count: number }>).map((r) => ({
      region: r.region,
      whisky_count: r.whisky_count,
    }));

    return {
      data: {
        rated_whiskies: totals.rated_whiskies ?? 0,
        total_whiskies_in_user_tastings: totals.total_whiskies ?? 0,
        total_tastings: totals.total_tastings ?? 0,
        total_ratings: totals.total_ratings ?? 0,
        avg_score: fmtScore(Number(totals.avg_score)),
        max_score: fmtScore(Number(totals.max_score)),
        min_score: fmtScore(Number(totals.min_score)),
        top_regions: regions,
      },
      sources: [],
    };
  },
};

const countUserWhiskies: LabsToolDefinition = {
  name: "count_user_whiskies",
  description:
    "Count the user's whiskies matching optional filters (region, peat_level, distillery, min_score, max_score). Returns the total count and up to 8 sample whiskies. Use this for 'how many Islay whiskies have I tasted', 'whiskies above 80 points', 'sherry casks I rated', etc. The whiskies considered are those in tastings the user participated in; min/max_score uses the user's own personal score and only counts whiskies they actually rated.",
  parameters: {
    type: "object",
    properties: {
      region: { type: "string", description: "Optional region filter (substring match)." },
      peat_level: {
        type: "string",
        description: "Optional peat level filter.",
        enum: ["none", "light", "medium", "heavy"],
      },
      distillery: { type: "string", description: "Optional distillery substring filter." },
      min_score: { type: "number", description: "Minimum personal overall score (0-100)." },
      max_score: { type: "number", description: "Maximum personal overall score (0-100)." },
    },
    additionalProperties: false,
  },
  handler: async (participantId, rawArgs) => {
    const args = countWhiskiesSchema.parse(emptyArgs(rawArgs));
    const useRatingFilter = typeof args.min_score === "number" || typeof args.max_score === "number";
    const params: unknown[] = [participantId];
    const conditions: string[] = [];
    if (args.region) {
      params.push(args.region);
      conditions.push(`unaccent(coalesce(w.region, '')) ILIKE '%' || unaccent($${params.length}) || '%'`);
    }
    if (args.peat_level) {
      params.push(args.peat_level);
      conditions.push(`lower(coalesce(w.peat_level, '')) = lower($${params.length})`);
    }
    if (args.distillery) {
      params.push(args.distillery);
      conditions.push(`unaccent(coalesce(w.distillery, '')) ILIKE '%' || unaccent($${params.length}) || '%'`);
    }
    if (typeof args.min_score === "number") {
      params.push(args.min_score);
      conditions.push(`r.overall >= $${params.length}`);
    }
    if (typeof args.max_score === "number") {
      params.push(args.max_score);
      conditions.push(`r.overall <= $${params.length}`);
    }
    const whereExtra = conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";

    const baseSql = useRatingFilter
      ? `
          SELECT DISTINCT w.id, w.name, w.distillery, w.region, w.age, r.overall AS user_score
          FROM ratings r
          JOIN whiskies w ON w.id = r.whisky_id
          WHERE r.participant_id = $1
            ${whereExtra}
        `
      : `
          SELECT DISTINCT w.id, w.name, w.distillery, w.region, w.age,
                          (SELECT AVG(rr.overall) FROM ratings rr WHERE rr.whisky_id = w.id AND rr.participant_id = $1) AS user_score
          FROM whiskies w
          JOIN tasting_participants tp ON tp.tasting_id = w.tasting_id
          WHERE tp.participant_id = $1
            ${whereExtra}
        `;

    const countSql = `SELECT COUNT(*)::int AS total FROM (${baseSql}) sub`;
    const sampleSql = `${baseSql} ORDER BY user_score DESC NULLS LAST LIMIT 8`;

    const [countResult, sampleResult] = await Promise.all([
      pool.query(countSql, params),
      pool.query(sampleSql, params),
    ]);

    const total = (countResult.rows[0] as { total: number } | undefined)?.total ?? 0;
    type Row = { id: string; name: string | null; distillery: string | null; region: string | null; age: string | null; user_score: string | null };
    const rows = sampleResult.rows as Row[];
    const sources: LabsToolSource[] = rows.map((r) => ({
      type: "whisky",
      id: String(r.id),
      title: String(r.name ?? ""),
      subtitle: [r.distillery, r.region, r.age].filter(Boolean).join(" \u2022 ") || undefined,
      route: whiskyRoute(String(r.id)),
    }));

    return {
      data: {
        total_count: total,
        applied_filters: {
          region: args.region ?? null,
          peat_level: args.peat_level ?? null,
          distillery: args.distillery ?? null,
          min_score: args.min_score ?? null,
          max_score: args.max_score ?? null,
        },
        sample: rows.map((r) => ({
          name: r.name,
          distillery: r.distillery,
          region: r.region,
          age: r.age,
          user_score: fmtScore(Number(r.user_score)),
        })),
      },
      sources,
    };
  },
};

const getUserRecentRatings: LabsToolDefinition = {
  name: "get_user_recent_ratings",
  description:
    "Return the user's most recently submitted ratings (whisky name, score, optional notes). Use this for 'last whiskies I rated', 'recent ratings'.",
  parameters: {
    type: "object",
    properties: {
      limit: {
        type: "integer",
        description: "How many ratings to return (1-20, default 5).",
        minimum: 1,
        maximum: 20,
      },
    },
    additionalProperties: false,
  },
  handler: async (participantId, rawArgs) => {
    const args = recentRatingsSchema.parse(emptyArgs(rawArgs));
    const sql = `
      SELECT w.id, w.name, w.distillery, w.region, r.overall, r.notes, r.created_at::text AS created_at
      FROM ratings r
      JOIN whiskies w ON w.id = r.whisky_id
      WHERE r.participant_id = $1
      ORDER BY r.created_at DESC NULLS LAST
      LIMIT ${args.limit}
    `;
    const result = await pool.query(sql, [participantId]);
    type Row = { id: string; name: string | null; distillery: string | null; region: string | null; overall: string | null; notes: string | null; created_at: string | null };
    const rows = result.rows as Row[];
    const sources: LabsToolSource[] = rows.map((r) => ({
      type: "whisky",
      id: String(r.id),
      title: String(r.name ?? ""),
      subtitle: [r.distillery, r.region].filter(Boolean).join(" \u2022 ") || undefined,
      route: whiskyRoute(String(r.id)),
    }));
    return {
      data: {
        ratings: rows.map((r) => ({
          name: r.name,
          distillery: r.distillery,
          region: r.region,
          score: fmtScore(Number(r.overall)),
          notes: r.notes ? r.notes.slice(0, 200) : null,
          rated_at: r.created_at,
        })),
        total_returned: rows.length,
      },
      sources,
    };
  },
};

const getUserTastingsRoleBreakdown: LabsToolDefinition = {
  name: "get_user_tastings_role_breakdown",
  description:
    "Return how many tastings the user hosted versus attended as a guest. Use this for 'how many tastings have I hosted', 'tastings as guest', 'host vs guest split'.",
  parameters: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  handler: async (participantId) => {
    tastingsRoleSchema.parse(undefined);
    const sql = `
      SELECT
        COUNT(DISTINCT CASE WHEN t.host_id = $1 THEN t.id END)::int AS as_host,
        COUNT(DISTINCT CASE WHEN t.host_id IS DISTINCT FROM $1 AND tp.participant_id = $1 THEN t.id END)::int AS as_guest
      FROM tastings t
      LEFT JOIN tasting_participants tp ON tp.tasting_id = t.id AND tp.participant_id = $1
      WHERE t.host_id = $1 OR tp.participant_id = $1
    `;
    const result = await pool.query(sql, [participantId]);
    const row = result.rows[0] as { as_host: number | null; as_guest: number | null } | undefined;
    return {
      data: {
        as_host: row?.as_host ?? 0,
        as_guest: row?.as_guest ?? 0,
        total: (row?.as_host ?? 0) + (row?.as_guest ?? 0),
      },
      sources: [],
    };
  },
};

export const labsAskTools: LabsToolDefinition[] = [
  getUserTopWhiskies,
  getUserTopTastings,
  getUserOverviewStats,
  countUserWhiskies,
  getUserRecentRatings,
  getUserTastingsRoleBreakdown,
];

export const labsAskToolMap: Map<string, LabsToolDefinition> = new Map(
  labsAskTools.map((t) => [t.name, t]),
);

export const setAnswerModeTool = {
  name: "set_answer_mode",
  description:
    "MUST be called exactly once before producing the final answer. Declares the source of your answer: 'user_data' = answer is grounded in user-specific sources or tool results, 'general' = answer is from your general whisky knowledge (not from this user's data), 'mixed' = both.",
  parameters: {
    type: "object",
    properties: {
      mode: {
        type: "string",
        enum: ["user_data", "general", "mixed"],
        description: "Source of the answer.",
      },
    },
    required: ["mode"],
    additionalProperties: false,
  },
};

export type AnswerMode = "user_data" | "general" | "mixed";

export const answerModeSchema = z.object({ mode: z.enum(["user_data", "general", "mixed"]) });

export function buildOpenAIToolList(): Array<{ type: "function"; function: { name: string; description: string; parameters: Record<string, unknown> } }> {
  const list = labsAskTools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
  list.push({
    type: "function" as const,
    function: {
      name: setAnswerModeTool.name,
      description: setAnswerModeTool.description,
      parameters: setAnswerModeTool.parameters,
    },
  });
  return list;
}

import { describe, it, expect } from "vitest";

import { vi } from "vitest";

vi.mock("../../server/db", () => ({
  pool: {
    query: async () => ({
      rows: [
        {
          rated_whiskies: 0,
          total_whiskies: 0,
          total_tastings: 0,
          total_ratings: 0,
          avg_score: null,
          as_host: 0,
          as_guest: 0,
          region: "Highland",
          n: 0,
        },
      ],
    }),
  },
}));
import {
  labsAskTools,
  labsAskToolMap,
  buildOpenAIToolList,
  answerModeSchema,
} from "../../server/labs-ask-tools";

describe("labs-ask-tools — registry shape", () => {
  it("exposes the six expected user-stat tools", () => {
    const names = labsAskTools.map((t) => t.name).sort();
    expect(names).toEqual([
      "count_user_whiskies",
      "get_user_overview_stats",
      "get_user_recent_ratings",
      "get_user_tastings_role_breakdown",
      "get_user_top_tastings",
      "get_user_top_whiskies",
    ]);
  });

  it("each tool defines name, description, parameters and handler", () => {
    for (const t of labsAskTools) {
      expect(typeof t.name).toBe("string");
      expect(t.name.length).toBeGreaterThan(0);
      expect(typeof t.description).toBe("string");
      expect(t.description.length).toBeGreaterThan(10);
      expect(typeof t.parameters).toBe("object");
      expect(typeof t.handler).toBe("function");
    }
  });

  it("labsAskToolMap mirrors the array", () => {
    expect(labsAskToolMap.size).toBe(labsAskTools.length);
    for (const t of labsAskTools) {
      expect(labsAskToolMap.get(t.name)).toBe(t);
    }
  });

  it("buildOpenAIToolList includes set_answer_mode plus all data tools", () => {
    const list = buildOpenAIToolList();
    const names = list.map((entry) => entry.function.name).sort();
    expect(names).toContain("set_answer_mode");
    for (const t of labsAskTools) {
      expect(names).toContain(t.name);
    }
    expect(list.length).toBe(labsAskTools.length + 1);
    for (const entry of list) {
      expect(entry.type).toBe("function");
      expect(entry.function.parameters).toBeTypeOf("object");
    }
  });
});

describe("labs-ask-tools — answer-mode schema", () => {
  it("accepts the three valid modes", () => {
    expect(answerModeSchema.parse({ mode: "user_data" }).mode).toBe("user_data");
    expect(answerModeSchema.parse({ mode: "general" }).mode).toBe("general");
    expect(answerModeSchema.parse({ mode: "mixed" }).mode).toBe("mixed");
  });

  it("rejects unknown mode values", () => {
    expect(() => answerModeSchema.parse({ mode: "wild" })).toThrow();
    expect(() => answerModeSchema.parse({})).toThrow();
  });
});

describe("labs-ask-tools — strict argument validation", () => {
  it("get_user_top_whiskies rejects unknown keys via strict schema", async () => {
    const tool = labsAskToolMap.get("get_user_top_whiskies");
    expect(tool).toBeDefined();
    await expect(
      tool!.handler("00000000-0000-0000-0000-000000000000", { limit: 5, bogus_key: "x" }, "en"),
    ).rejects.toThrow();
  });

  it("count_user_whiskies rejects unknown keys via strict schema", async () => {
    const tool = labsAskToolMap.get("count_user_whiskies");
    expect(tool).toBeDefined();
    await expect(
      tool!.handler("00000000-0000-0000-0000-000000000000", { region: "Islay", surprise: true }, "en"),
    ).rejects.toThrow();
  });

  it("get_user_top_tastings rejects unknown keys via strict schema", async () => {
    const tool = labsAskToolMap.get("get_user_top_tastings");
    expect(tool).toBeDefined();
    await expect(
      tool!.handler("00000000-0000-0000-0000-000000000000", { limit: 3, extra: 1 }, "en"),
    ).rejects.toThrow();
  });

  it("get_user_recent_ratings rejects unknown keys via strict schema", async () => {
    const tool = labsAskToolMap.get("get_user_recent_ratings");
    expect(tool).toBeDefined();
    await expect(
      tool!.handler("00000000-0000-0000-0000-000000000000", { limit: 5, foo: "bar" }, "en"),
    ).rejects.toThrow();
  });

  it("get_user_overview_stats rejects unknown keys (zero-arg strict schema)", async () => {
    const tool = labsAskToolMap.get("get_user_overview_stats");
    expect(tool).toBeDefined();
    await expect(
      tool!.handler("00000000-0000-0000-0000-000000000000", { unexpected: 1 }, "en"),
    ).rejects.toThrow();
  });

  it("get_user_tastings_role_breakdown rejects unknown keys (zero-arg strict schema)", async () => {
    const tool = labsAskToolMap.get("get_user_tastings_role_breakdown");
    expect(tool).toBeDefined();
    await expect(
      tool!.handler("00000000-0000-0000-0000-000000000000", { unexpected: 1 }, "en"),
    ).rejects.toThrow();
  });

  it("get_user_overview_stats accepts undefined / empty args", async () => {
    const tool = labsAskToolMap.get("get_user_overview_stats");
    expect(tool).toBeDefined();
    const r1 = await tool!.handler("00000000-0000-0000-0000-000000000000", undefined, "en");
    expect(r1).toHaveProperty("data");
    expect(r1).toHaveProperty("sources");
    const r2 = await tool!.handler("00000000-0000-0000-0000-000000000000", {}, "en");
    expect(r2).toHaveProperty("data");
    expect(r2).toHaveProperty("sources");
  });
});

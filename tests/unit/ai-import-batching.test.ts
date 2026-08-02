import { describe, it, expect } from "vitest";
import {
  buildAiImportBatches,
  mergeAiImportBatchResults,
  AI_IMPORT_IMAGE_BATCH_SIZE,
} from "../../server/ai-import-batching";

const img = (n: number) => ({ type: "image_url", image_url: { url: `data:image/jpeg;base64,IMG${n}` } });
const images = (count: number) => Array.from({ length: count }, (_, i) => img(i));

const fulfilled = (value: any): PromiseSettledResult<any> => ({ status: "fulfilled", value });
const rejected = (msg: string): PromiseSettledResult<any> => ({ status: "rejected", reason: new Error(msg) });

describe("buildAiImportBatches", () => {
  it("splits images into chunks of the batch size, preserving upload order", () => {
    const batches = buildAiImportBatches("", images(7));
    expect(batches).toHaveLength(2);
    expect(batches[0].imageCount).toBe(5);
    expect(batches[1].imageCount).toBe(2);
    // first content item is the instruction text, then the images in order
    const urls = batches.flatMap((b) => b.userContent.filter((c: any) => c.type === "image_url").map((c: any) => c.image_url.url));
    expect(urls).toEqual(images(7).map((i) => i.image_url.url));
  });

  it("puts pasted text into the first batch together with the first image chunk", () => {
    const batches = buildAiImportBatches("some pasted list", images(6));
    expect(batches).toHaveLength(2);
    expect(batches[0].userContent[0].text).toContain("some pasted list");
    expect(batches[0].imageCount).toBe(AI_IMPORT_IMAGE_BATCH_SIZE);
    expect(batches[1].imageCount).toBe(1);
  });

  it("creates a single text-only batch when there are no images", () => {
    const batches = buildAiImportBatches("text only", []);
    expect(batches).toHaveLength(1);
    expect(batches[0].imageCount).toBe(0);
    expect(batches[0].userContent).toHaveLength(1);
  });

  it("creates no batches when there is neither text nor images", () => {
    expect(buildAiImportBatches("", [])).toHaveLength(0);
  });

  it("falls back to the default batch size for invalid sizes (no infinite loop)", () => {
    expect(buildAiImportBatches("", images(7), 0)).toHaveLength(2);
    expect(buildAiImportBatches("", images(7), -3)).toHaveLength(2);
    expect(buildAiImportBatches("", images(7), NaN as any)).toHaveLength(2);
  });
});

describe("mergeAiImportBatchResults", () => {
  it("(a) all batches ok -> all whiskies in upload order with sequential sortOrder", () => {
    const batches = buildAiImportBatches("", images(7));
    const settled = [
      fulfilled({ whiskies: [{ name: "A" }, { name: "B" }, { name: "C" }] }),
      fulfilled({ whiskies: [{ name: "D" }, { name: "E" }] }),
    ];
    const merged = mergeAiImportBatchResults(settled, batches);
    expect(merged.whiskies.map((w) => w.name)).toEqual(["A", "B", "C", "D", "E"]);
    expect(merged.whiskies.map((w) => w.sortOrder)).toEqual([0, 1, 2, 3, 4]);
    expect(merged.failedImages).toBe(0);
    expect(merged.failedBatches).toBe(0);
    expect(merged.isTechnicalFailure).toBe(false);
  });

  it("(b) one batch fails -> remaining whiskies survive and failedImages counts the lost photos", () => {
    const batches = buildAiImportBatches("", images(7)); // 5 + 2
    const settled = [
      rejected("empty_ai_response"),
      fulfilled({ whiskies: [{ name: "F" }, { name: "G" }] }),
    ];
    const merged = mergeAiImportBatchResults(settled, batches);
    expect(merged.whiskies.map((w) => w.name)).toEqual(["F", "G"]);
    expect(merged.whiskies.map((w) => w.sortOrder)).toEqual([0, 1]);
    expect(merged.failedImages).toBe(5);
    expect(merged.failedBatches).toBe(1);
    expect(merged.isTechnicalFailure).toBe(false);
  });

  it("(c) failures with zero whiskies overall -> technical failure (route must 500, never empty 200)", () => {
    const batches = buildAiImportBatches("", images(10)); // 5 + 5
    const settled = [rejected("boom"), rejected("empty_ai_response")];
    const merged = mergeAiImportBatchResults(settled, batches);
    expect(merged.whiskies).toHaveLength(0);
    expect(merged.failedImages).toBe(10);
    expect(merged.isTechnicalFailure).toBe(true);
  });

  it("(c2) one batch fails and the successful one found nothing -> still a technical failure", () => {
    const batches = buildAiImportBatches("", images(7));
    const settled = [rejected("boom"), fulfilled({ whiskies: [] })];
    const merged = mergeAiImportBatchResults(settled, batches);
    expect(merged.isTechnicalFailure).toBe(true);
  });

  it("no failures and no whiskies -> NOT a technical failure (honest 'nothing recognized')", () => {
    const batches = buildAiImportBatches("", images(3));
    const merged = mergeAiImportBatchResults([fulfilled({ whiskies: [] })], batches);
    expect(merged.isTechnicalFailure).toBe(false);
    expect(merged.whiskies).toHaveLength(0);
  });

  it("tastingMeta merge follows first-non-empty-wins across batches", () => {
    const batches = buildAiImportBatches("", images(10));
    const settled = [
      fulfilled({ whiskies: [], tastingMeta: { title: "", location: "Emmerich", date: null } }),
      fulfilled({ whiskies: [], tastingMeta: { title: "Sommertasting", location: "Woanders", date: "2026-08-02" } }),
    ];
    const merged = mergeAiImportBatchResults(settled, batches);
    expect(merged.tastingMeta.location).toBe("Emmerich"); // first non-empty wins
    expect(merged.tastingMeta.title).toBe("Sommertasting"); // "" in batch 1 is skipped
    expect(merged.tastingMeta.date).toBe("2026-08-02"); // null in batch 1 is skipped
  });

  it("maps per-batch 1-based sourceImageIndex to global 0-based indices", () => {
    const batches = buildAiImportBatches("", images(7)); // batch 0: imgs 0-4, batch 1: imgs 5-6
    const settled = [
      fulfilled({ whiskies: [{ name: "A", sourceImageIndex: 1 }, { name: "B", sourceImageIndex: 5 }] }),
      fulfilled({ whiskies: [{ name: "C", sourceImageIndex: 2 }] }),
    ];
    const merged = mergeAiImportBatchResults(settled, batches);
    expect(merged.whiskies.map((w) => w.sourceImageIndex)).toEqual([0, 4, 6]);
  });

  it("drops invalid sourceImageIndex values (out of range, non-integer, null)", () => {
    const batches = buildAiImportBatches("", images(7));
    const settled = [
      fulfilled({ whiskies: [
        { name: "A", sourceImageIndex: 0 },
        { name: "B", sourceImageIndex: 6 },
        { name: "C", sourceImageIndex: 2.5 },
        { name: "D", sourceImageIndex: null },
        { name: "E" },
      ] }),
    ];
    const merged = mergeAiImportBatchResults(settled, batches);
    for (const w of merged.whiskies) expect("sourceImageIndex" in w).toBe(false);
  });

  it("keeps sourceImageIndex mapping correct when text shares the first batch", () => {
    const batches = buildAiImportBatches("pasted list", images(6)); // batch 0: text + imgs 0-4, batch 1: img 5
    const settled = [
      fulfilled({ whiskies: [{ name: "T", sourceImageIndex: null }, { name: "A", sourceImageIndex: 3 }] }),
      fulfilled({ whiskies: [{ name: "B", sourceImageIndex: 1 }] }),
    ];
    const merged = mergeAiImportBatchResults(settled, batches);
    expect("sourceImageIndex" in merged.whiskies[0]).toBe(false);
    expect(merged.whiskies[1].sourceImageIndex).toBe(2);
    expect(merged.whiskies[2].sourceImageIndex).toBe(5);
  });

  it("tolerates malformed fulfilled payloads (null / missing whiskies array)", () => {
    const batches = buildAiImportBatches("", images(10));
    const settled = [fulfilled(null), fulfilled({ whiskies: "not-an-array" })];
    const merged = mergeAiImportBatchResults(settled, batches);
    expect(merged.whiskies).toHaveLength(0);
    expect(merged.isTechnicalFailure).toBe(false);
  });
});

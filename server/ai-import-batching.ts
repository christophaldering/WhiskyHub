// Reine Batching-/Merge-Logik des Smart-Imports (Fotos -> erkannte Whiskies).
// Aus routes.ts extrahiert, damit der Vertrag testbar ist:
//  - Bilder werden in Teilpaketen analysiert (Upload-Reihenfolge bleibt erhalten)
//  - Teil-Fehlschläge verlieren keine Ergebnisse anderer Pakete (failedImages)
//  - Fehlschläge ohne jedes Ergebnis sind ein echter Fehler (kein leerer 200er)

export interface AiImportBatch {
  userContent: any[];
  imageCount: number;
}

export const AI_IMPORT_IMAGE_BATCH_SIZE = 5;

export function buildAiImportBatches(
  textContent: string,
  imageContents: any[],
  batchSize: number = AI_IMPORT_IMAGE_BATCH_SIZE,
): AiImportBatch[] {
  if (!Number.isFinite(batchSize) || batchSize <= 0) batchSize = AI_IMPORT_IMAGE_BATCH_SIZE;
  const batches: AiImportBatch[] = [];
  const imageChunkAt = (start: number): AiImportBatch => {
    const chunk = imageContents.slice(start, start + batchSize);
    return {
      userContent: [
        { type: "text", text: "Extract all whisky tasting information from these images:" },
        ...chunk,
      ],
      imageCount: chunk.length,
    };
  };

  if (textContent) {
    const first: any[] = [{
      type: "text",
      text: `Extract all whisky tasting information from this content:\n\n${textContent}`,
    }];
    const firstImages = imageContents.slice(0, batchSize);
    if (firstImages.length > 0) {
      first.push({ type: "text", text: "Also analyze these images for additional tasting information:" });
      first.push(...firstImages);
    }
    batches.push({ userContent: first, imageCount: firstImages.length });
    for (let i = batchSize; i < imageContents.length; i += batchSize) {
      batches.push(imageChunkAt(i));
    }
  } else {
    for (let i = 0; i < imageContents.length; i += batchSize) {
      batches.push(imageChunkAt(i));
    }
  }
  return batches;
}

export interface AiImportMergeResult {
  whiskies: any[];
  tastingMeta: Record<string, any>;
  failedImages: number;
  failedBatches: number;
  /** true -> Route muss 500 liefern (technische Fehlschläge ohne jedes Ergebnis) */
  isTechnicalFailure: boolean;
}

export function mergeAiImportBatchResults(
  settled: PromiseSettledResult<any>[],
  batches: AiImportBatch[],
  log: (msg: string) => void = () => {},
): AiImportMergeResult {
  const whiskies: any[] = [];
  const tastingMeta: Record<string, any> = {};
  let failedImages = 0;
  let failedBatches = 0;

  settled.forEach((result, idx) => {
    if (result.status === "fulfilled") {
      const parsed = result.value || {};
      if (Array.isArray(parsed.whiskies)) whiskies.push(...parsed.whiskies);
      if (parsed.tastingMeta && typeof parsed.tastingMeta === "object") {
        for (const [k, v] of Object.entries(parsed.tastingMeta)) {
          if (v !== null && v !== undefined && v !== "" && tastingMeta[k] === undefined) tastingMeta[k] = v;
        }
      }
    } else {
      failedBatches++;
      failedImages += batches[idx]?.imageCount || 0;
      log(`[ai-import] batch ${idx + 1}/${batches.length} failed: ${(result.reason as any)?.message}`);
    }
  });

  // Upload-Reihenfolge beibehalten: sortOrder fortlaufend neu vergeben
  whiskies.forEach((w, i) => { if (w && typeof w === "object") w.sortOrder = i; });

  return {
    whiskies,
    tastingMeta,
    failedImages,
    failedBatches,
    isTechnicalFailure: failedBatches > 0 && whiskies.length === 0,
  };
}

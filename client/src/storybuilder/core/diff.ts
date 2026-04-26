import type { StoryBlock } from "./types";

export type BlockDiffStatus = "unchanged" | "changed" | "added" | "removed";

export type BlockDiffEntry = {
  status: BlockDiffStatus;
  blockId: string;
  oldBlock?: StoryBlock;
  newBlock?: StoryBlock;
  oldIndex?: number;
  newIndex?: number;
  changedFields: string[];
};

export type DiffSummary = {
  unchanged: number;
  changed: number;
  added: number;
  removed: number;
};

export function diffStoryBlocks(oldBlocks: StoryBlock[], newBlocks: StoryBlock[]): BlockDiffEntry[] {
  const oldIndex = new Map<string, number>();
  oldBlocks.forEach((b, i) => oldIndex.set(b.id, i));
  const newIndex = new Map<string, number>();
  newBlocks.forEach((b, i) => newIndex.set(b.id, i));

  const result: BlockDiffEntry[] = [];

  newBlocks.forEach((nb, ni) => {
    const oi = oldIndex.get(nb.id);
    if (oi === undefined) {
      result.push({
        status: "added",
        blockId: nb.id,
        newBlock: nb,
        newIndex: ni,
        changedFields: [],
      });
      return;
    }
    const ob = oldBlocks[oi];
    const changedFields = diffBlockFields(ob, nb);
    if (oi !== ni) changedFields.push("position");
    if (changedFields.length === 0) {
      result.push({
        status: "unchanged",
        blockId: nb.id,
        oldBlock: ob,
        newBlock: nb,
        oldIndex: oi,
        newIndex: ni,
        changedFields: [],
      });
    } else {
      result.push({
        status: "changed",
        blockId: nb.id,
        oldBlock: ob,
        newBlock: nb,
        oldIndex: oi,
        newIndex: ni,
        changedFields,
      });
    }
  });

  oldBlocks.forEach((ob, oi) => {
    if (newIndex.has(ob.id)) return;
    result.push({
      status: "removed",
      blockId: ob.id,
      oldBlock: ob,
      oldIndex: oi,
      changedFields: [],
    });
  });

  return result;
}

export function summarizeDiff(entries: BlockDiffEntry[]): DiffSummary {
  const summary: DiffSummary = { unchanged: 0, changed: 0, added: 0, removed: 0 };
  for (const e of entries) {
    if (e.status === "unchanged") summary.unchanged += 1;
    else if (e.status === "changed") summary.changed += 1;
    else if (e.status === "added") summary.added += 1;
    else if (e.status === "removed") summary.removed += 1;
  }
  return summary;
}

function diffBlockFields(a: StoryBlock, b: StoryBlock): string[] {
  const fields: string[] = [];
  if (a.type !== b.type) fields.push("type");
  if ((a.hidden ?? false) !== (b.hidden ?? false)) fields.push("hidden");
  if ((a.locked ?? false) !== (b.locked ?? false)) fields.push("locked");
  if ((a.editedByHost ?? false) !== (b.editedByHost ?? false)) fields.push("editedByHost");
  if (!deepEqual(a.payload, b.payload)) fields.push("payload");
  return fields;
}

export function diffPayloadKeys(
  oldPayload: Record<string, unknown> | undefined,
  newPayload: Record<string, unknown> | undefined,
): string[] {
  const keys = new Set<string>();
  if (oldPayload) Object.keys(oldPayload).forEach((k) => keys.add(k));
  if (newPayload) Object.keys(newPayload).forEach((k) => keys.add(k));
  const changed: string[] = [];
  for (const k of Array.from(keys)) {
    const ov = oldPayload?.[k];
    const nv = newPayload?.[k];
    if (!deepEqual(ov, nv)) changed.push(k);
  }
  return changed;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const aKeys = Object.keys(ao);
  const bKeys = Object.keys(bo);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(bo, k)) return false;
    if (!deepEqual(ao[k], bo[k])) return false;
  }
  return true;
}

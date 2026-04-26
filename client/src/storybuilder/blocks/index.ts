import type { z } from "zod";
import type { BlockDefinition, BlockType, RendererMode, StoryBlock, StoryTheme } from "../core/types";
import { createBlockId } from "../core/types";
import { heroCoverBlock } from "./hero-cover";
import { textSectionBlock } from "./text-section";
import { fullWidthImageBlock } from "./full-width-image";
import { quoteBlock } from "./quote";
import { dividerBlock } from "./divider";
import { twoColumnBlock } from "./two-column";
import { imageGalleryBlock } from "./image-gallery";
import { statsGridBlock } from "./stats-grid";
import { ctaButtonBlock } from "./cta-button";
import { videoEmbedBlock } from "./video-embed";
import { featureCardsBlock } from "./feature-cards";
import { benchmarkBlock } from "./benchmark-block";
import { liveStatsBlock } from "./live-stats";

type RegisteredBlock = {
  type: BlockType;
  label: string;
  description: string;
  category: BlockDefinition["category"];
  defaultPayload: () => unknown;
  payloadSchema: z.ZodType<unknown>;
  Renderer: React.ComponentType<{ block: StoryBlock; payload: unknown; theme: StoryTheme; mode: RendererMode }>;
  EditorPanel?: React.ComponentType<{ payload: unknown; onChange: (payload: unknown) => void }>;
};

const registry = new Map<BlockType, RegisteredBlock>();

function register<T>(def: BlockDefinition<T>): void {
  const widened: RegisteredBlock = {
    type: def.type,
    label: def.label,
    description: def.description,
    category: def.category,
    defaultPayload: def.defaultPayload,
    payloadSchema: def.payloadSchema as unknown as z.ZodType<unknown>,
    Renderer: def.Renderer as unknown as RegisteredBlock["Renderer"],
    EditorPanel: def.EditorPanel as unknown as RegisteredBlock["EditorPanel"],
  };
  registry.set(def.type, widened);
}

register(heroCoverBlock);
register(textSectionBlock);
register(fullWidthImageBlock);
register(quoteBlock);
register(dividerBlock);
register(twoColumnBlock);
register(imageGalleryBlock);
register(statsGridBlock);
register(ctaButtonBlock);
register(videoEmbedBlock);
register(featureCardsBlock);
register(benchmarkBlock);
register(liveStatsBlock);

export function getBlockDefinition(type: BlockType): RegisteredBlock | undefined {
  return registry.get(type);
}

export function listBlockDefinitions(category?: BlockDefinition["category"]): RegisteredBlock[] {
  const all = Array.from(registry.values());
  if (!category) return all;
  return all.filter((b) => b.category === category);
}

export function createBlock(type: BlockType): StoryBlock | null {
  const def = registry.get(type);
  if (!def) return null;
  const payload = def.defaultPayload();
  return {
    id: createBlockId(),
    type,
    payload: isPlainRecord(payload) ? payload : {},
  };
}

export type ValidationResult =
  | { ok: true; payload: unknown }
  | { ok: false; payload: unknown; reason: "unknown-type" | "schema-error"; error: z.ZodError | null };

export function validatePayload(type: BlockType, raw: unknown): ValidationResult {
  const def = registry.get(type);
  if (!def) return { ok: false, payload: raw, reason: "unknown-type", error: null };
  const parsed = def.payloadSchema.safeParse(raw);
  if (parsed.success) return { ok: true, payload: parsed.data };
  const fallback = def.defaultPayload();
  return { ok: false, payload: fallback, reason: "schema-error", error: parsed.error };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type { RegisteredBlock };

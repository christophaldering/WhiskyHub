import type { StoryBlock } from "./types";
import type { StoryVersionFull, StoryVersionMeta } from "../api";

export type BlockScope = "tasting" | "cms" | "all";
export type ConsumerScope = "tasting" | "cms";
export type VersionFilter = "all" | "auto" | "manual";

export type StoryPersistenceAdapter = {
  sourceType: string;
  sourceId: string;
  consumerScope: ConsumerScope;
  isAdmin: boolean;
  load: () => Promise<{ blocks: StoryBlock[]; theme?: string }>;
  saveDraft: (blocks: StoryBlock[]) => Promise<void>;
  createVersion: (blocks: StoryBlock[], name?: string) => Promise<void>;
  listVersions: (filter: VersionFilter) => Promise<StoryVersionMeta[]>;
  getVersion: (versionId: string) => Promise<StoryVersionFull>;
  restoreVersion: (versionId: string) => Promise<{ blocks: StoryBlock[] }>;
  publish?: (blocks: StoryBlock[]) => Promise<void>;
  regenerateBlock?: (
    blockId: string,
    blockType: string,
    currentBlocks: StoryBlock[],
    extras?: { customInstructions?: string; stylePresets?: string[] },
  ) => Promise<Record<string, unknown> | null>;
  regenerateStory?: (
    currentBlocks: StoryBlock[],
    extras?: { customInstructions?: string; stylePresets?: string[] },
  ) => Promise<StoryBlock[] | null>;
};

export function blockScopeMatchesConsumer(scope: BlockScope, consumer: ConsumerScope): boolean {
  if (scope === "all") return true;
  return scope === consumer;
}

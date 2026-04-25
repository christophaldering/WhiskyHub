import { z } from "zod";

export const blockTypeSchema = z.enum([
  "hero-cover",
  "text-section",
  "full-width-image",
  "quote",
  "divider",
  "two-column",
  "image-gallery",
  "stats-grid",
  "cta-button",
  "video-embed",
  "custom-html",
  "whisky-card-grid",
  "taster-grid",
  "ranking-list",
  "blind-results",
  "winner-hero",
  "finale-card",
  "feature-cards",
  "benchmark-block",
  "live-stats",
]);

export type BlockType = z.infer<typeof blockTypeSchema>;

export const storyBlockSchema = z.object({
  id: z.string(),
  type: blockTypeSchema,
  hidden: z.boolean().optional(),
  locked: z.boolean().optional(),
  editedByHost: z.boolean().optional(),
  payload: z.record(z.unknown()),
});

export type StoryBlock = z.infer<typeof storyBlockSchema>;

export const storyDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  theme: z.string(),
  blocks: z.array(storyBlockSchema),
  metadata: z.object({
    createdAt: z.string(),
    updatedAt: z.string(),
    title: z.string().optional(),
  }),
});

export type StoryDocument = z.infer<typeof storyDocumentSchema>;

export type RendererMode = "public" | "editor-preview" | "print";

export type StoryTheme = {
  id: string;
  name: string;
  fonts: {
    serif: string;
    sans: string;
  };
  colors: {
    bg: string;
    bgLift: string;
    ink: string;
    inkDim: string;
    inkFaint: string;
    amber: string;
    amberDim: string;
  };
  effects: {
    grain: boolean;
  };
};

export type BlockDefinition<TPayload = Record<string, unknown>> = {
  type: BlockType;
  label: string;
  description: string;
  category: "generic" | "tasting" | "landing";
  defaultPayload: () => TPayload;
  payloadSchema: z.ZodType<TPayload, z.ZodTypeDef, unknown>;
  Renderer: React.ComponentType<BlockRendererProps<TPayload>>;
  EditorPanel?: React.ComponentType<BlockEditorPanelProps<TPayload>>;
};

export type BlockRendererProps<TPayload = Record<string, unknown>> = {
  block: StoryBlock;
  payload: TPayload;
  theme: StoryTheme;
  mode: RendererMode;
};

export type BlockEditorPanelProps<TPayload = Record<string, unknown>> = {
  payload: TPayload;
  onChange: (payload: TPayload) => void;
};

export function createBlockId(): string {
  return "blk_" + Math.random().toString(36).slice(2, 11);
}

export function createEmptyDocument(theme = "casksense-editorial"): StoryDocument {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    theme,
    blocks: [],
    metadata: {
      createdAt: now,
      updatedAt: now,
    },
  };
}

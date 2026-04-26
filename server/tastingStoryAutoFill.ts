import type { Rating, Tasting, Whisky } from "@shared/schema";

type StoryBlock = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  hidden?: boolean;
  locked?: boolean;
  editedByHost?: boolean;
};

type ParticipantLite = { id: string; displayName?: string | null; name?: string | null };

function blockId(): string {
  return "blk_" + Math.random().toString(36).slice(2, 11);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(input: string | Date | null | undefined): string {
  if (!input) return "";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
}

function tastingDateLabel(tasting: Tasting): string {
  if (tasting.date) {
    const formatted = formatDate(tasting.date);
    if (formatted) return formatted;
    return tasting.date;
  }
  if (tasting.createdAt) return formatDate(tasting.createdAt);
  return "";
}

export function buildInitialTastingStoryBlocks(args: {
  tasting: Tasting;
  whiskies: Whisky[];
  participantCount: number;
  participants?: ParticipantLite[];
  ratings?: Rating[];
}): StoryBlock[] {
  const { tasting, whiskies, participantCount } = args;
  const blocks: StoryBlock[] = [];

  const dateLabel = tastingDateLabel(tasting);
  const heroMeta = [dateLabel, tasting.location ?? ""].filter((p) => p && p.length > 0).join(" \u00b7 ");

  blocks.push({
    id: blockId(),
    type: "hero-cover",
    payload: {
      eyebrow: "Tasting",
      title: tasting.title || "Verkostung",
      subtitle: tasting.location || "",
      meta: heroMeta,
      imageUrl: tasting.coverImageUrl || "",
      alignment: "center",
      ctaLabel: "",
      ctaHref: "",
      ctaVariant: "primary",
      ctaSecondaryLabel: "",
      ctaSecondaryHref: "",
    },
  });

  const introParts: string[] = [];
  introParts.push(
    `<p>Willkommen zur Verkostung. Auf den n\u00e4chsten Seiten begleiten wir dich durch ${
      whiskies.length === 1 ? "einen Whisky" : `${whiskies.length} Whiskys`
    }, gemeinsam verkostet von ${participantCount === 1 ? "einer Person" : `${participantCount} Personen`}.</p>`,
  );
  if (tasting.storyPrompt) {
    introParts.push(`<p>${escapeHtml(tasting.storyPrompt)}</p>`);
  }

  blocks.push({
    id: blockId(),
    type: "text-section",
    payload: {
      eyebrow: "Begr\u00fc\u00dfung",
      heading: "Eine Reise durch das Glas",
      body: introParts.join(""),
      alignment: "left",
      variant: "act-intro",
    },
  });

  blocks.push({
    id: blockId(),
    type: "divider",
    payload: { variant: "stars" },
  });

  if (whiskies.length > 0) {
    blocks.push({
      id: blockId(),
      type: "whisky-card-grid",
      payload: {
        eyebrow: "Im Glas",
        heading: "Die Whiskys des Abends",
        columns: whiskies.length >= 4 ? "3" : "2",
        showScores: true,
        includeWhiskyIds: null,
        overrides: {},
      },
    });
  }

  if (participantCount > 0) {
    blocks.push({
      id: blockId(),
      type: "taster-grid",
      payload: {
        eyebrow: "Wer mitverkostet hat",
        heading: "Die Verkoster",
        columns: participantCount >= 4 ? "4" : "3",
        includeParticipantIds: null,
        overrides: {},
      },
    });
  }

  if (whiskies.length > 0) {
    blocks.push({
      id: blockId(),
      type: "ranking-list",
      payload: {
        eyebrow: "Ranking",
        heading: "Wie ihr gewertet habt",
        order: "countdown",
        hideUnrated: true,
        overrides: {},
      },
    });
  }

  if (tasting.blindMode && whiskies.length > 0) {
    blocks.push({
      id: blockId(),
      type: "blind-results",
      payload: {
        eyebrow: "Blindverkostung",
        heading: "Wer lag wie nah dran?",
        showAllGuesses: true,
        overrides: {},
      },
    });
  }

  if (whiskies.length > 0) {
    blocks.push({
      id: blockId(),
      type: "winner-hero",
      payload: {
        eyebrow: "Sieger des Abends",
        headingOverride: "",
        subtitleOverride: "",
        scoreOverride: "",
        closingLine: "",
        imageOverrideUrl: "",
        ctaLabel: "",
        ctaHref: "",
      },
    });
  }

  blocks.push({
    id: blockId(),
    type: "finale-card",
    payload: {
      eyebrow: "Finale",
      heading: "Auf den n\u00e4chsten Dram.",
      closingLine: "",
      signatureLine: "",
      hostPhotoUrl: "",
    },
  });

  return blocks;
}

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

export type StoryWizardTone = "festive" | "casual" | "analytical" | "poetic";

export type StoryWizardOptions = {
  tone?: StoryWizardTone | null;
  headlineOverride?: string | null;
  subtitleOverride?: string | null;
  heroImageUrl?: string | null;
  galleryImageUrls?: string[];
  spotlightParticipantIds?: string[];
  highlightContext?: string | null;
};

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

function trimString(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function ensureGalleryItems(urls: string[] | undefined): Array<{ url: string; alt: string; caption: string }> {
  if (!urls || urls.length === 0) return [];
  const seen = new Set<string>();
  const out: Array<{ url: string; alt: string; caption: string }> = [];
  for (const raw of urls) {
    const url = trimString(raw);
    if (!url) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, alt: "", caption: "" });
  }
  return out;
}

export function buildInitialTastingStoryBlocks(args: {
  tasting: Tasting;
  whiskies: Whisky[];
  participantCount: number;
  participants?: ParticipantLite[];
  ratings?: Rating[];
  wizard?: StoryWizardOptions;
}): StoryBlock[] {
  const { tasting, whiskies, participantCount, wizard } = args;
  const blocks: StoryBlock[] = [];

  const dateLabel = tastingDateLabel(tasting);
  const heroMeta = [dateLabel, tasting.location ?? ""].filter((p) => p && p.length > 0).join(" \u00b7 ");

  const heroTitle = trimString(wizard?.headlineOverride) || tasting.title || "Verkostung";
  const heroSubtitle = trimString(wizard?.subtitleOverride) || tasting.location || "";
  const heroImage = trimString(wizard?.heroImageUrl) || tasting.coverImageUrl || "";

  blocks.push({
    id: blockId(),
    type: "hero-cover",
    payload: {
      eyebrow: "Tasting",
      title: heroTitle,
      subtitle: heroSubtitle,
      meta: heroMeta,
      imageUrl: heroImage,
      alignment: "center",
      ctaLabel: "",
      ctaHref: "",
      ctaVariant: "primary",
      ctaSecondaryLabel: "",
      ctaSecondaryHref: "",
    },
  });

  const introBody = buildAutoIntroBody({
    whiskyCount: whiskies.length,
    participantCount,
    storyPrompt: tasting.storyPrompt ?? null,
  });
  const introMeta: AutoIntroMeta = {
    autoIntro: true,
    whiskyCount: whiskies.length,
    participantCount,
    storyPrompt: tasting.storyPrompt ?? null,
  };

  blocks.push({
    id: blockId(),
    type: "text-section",
    payload: {
      eyebrow: INTRO_EYEBROW,
      heading: "Eine Reise durch das Glas",
      body: introBody,
      alignment: "left",
      variant: "act-intro",
      meta: introMeta,
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
    const rawSpotlightIds = (wizard?.spotlightParticipantIds ?? []).filter(
      (id) => typeof id === "string" && id.trim().length > 0,
    );
    const knownIds = new Set((args.participants ?? []).map((p) => p.id));
    const spotlightIds = knownIds.size > 0
      ? rawSpotlightIds.filter((id) => knownIds.has(id))
      : rawSpotlightIds;
    const overrides: Record<string, { funFact: string }> = {};
    for (const id of spotlightIds) overrides[id] = { funFact: "" };

    if (spotlightIds.length > 0) {
      const spotlightNames = spotlightIds
        .map((id) => {
          const p = (args.participants ?? []).find((x) => x.id === id);
          return trimString(p?.displayName ?? p?.name ?? "");
        })
        .filter((name) => name.length > 0);
      const namesLabel = spotlightNames.length > 0
        ? spotlightNames.map((n) => escapeHtml(n)).join(spotlightNames.length === 2 ? " &amp; " : ", ")
        : "Unsere ausgew\u00e4hlten G\u00e4ste";
      blocks.push({
        id: blockId(),
        type: "text-section",
        payload: {
          eyebrow: "Im Rampenlicht",
          heading: namesLabel,
          body: `<p>Heute Abend besonders im Fokus: ${namesLabel}.</p>`,
          alignment: "left",
          variant: "act-intro",
        },
      });
    }

    blocks.push({
      id: blockId(),
      type: "taster-grid",
      payload: {
        eyebrow: "Wer mitverkostet hat",
        heading: "Die Verkoster",
        columns: participantCount >= 4 ? "4" : "3",
        includeParticipantIds: null,
        overrides,
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

  const galleryItems = ensureGalleryItems(wizard?.galleryImageUrls);
  if (galleryItems.length > 0) {
    blocks.push({
      id: blockId(),
      type: "image-gallery",
      payload: {
        items: galleryItems,
        columns: galleryItems.length >= 4 ? "4" : galleryItems.length >= 2 ? "3" : "2",
        rounded: false,
      },
    });
  }

  const finaleClosing = trimString(wizard?.highlightContext);
  blocks.push({
    id: blockId(),
    type: "finale-card",
    payload: {
      eyebrow: "Finale",
      heading: "Auf den n\u00e4chsten Dram.",
      closingLine: finaleClosing,
      signatureLine: "",
      hostPhotoUrl: "",
    },
  });

  return blocks;
}

const INTRO_EYEBROW = "Begr\u00fc\u00dfung";

type AutoIntroMeta = {
  autoIntro: true;
  whiskyCount: number;
  participantCount: number;
  storyPrompt: string | null;
};

function isAutoIntroMeta(value: unknown): value is AutoIntroMeta {
  if (!value || typeof value !== "object") return false;
  const m = value as Record<string, unknown>;
  return (
    m.autoIntro === true &&
    typeof m.whiskyCount === "number" &&
    typeof m.participantCount === "number" &&
    (m.storyPrompt === null || typeof m.storyPrompt === "string")
  );
}

function buildAutoIntroBody(args: {
  whiskyCount: number;
  participantCount: number;
  storyPrompt: string | null | undefined;
}): string {
  const parts: string[] = [];
  parts.push(
    `<p>Willkommen zur Verkostung. Auf den n\u00e4chsten Seiten begleiten wir dich durch ${
      args.whiskyCount === 1 ? "einen Whisky" : `${args.whiskyCount} Whiskys`
    }, gemeinsam verkostet von ${
      args.participantCount === 1 ? "einer Person" : `${args.participantCount} Personen`
    }.</p>`,
  );
  const prompt = typeof args.storyPrompt === "string" ? args.storyPrompt : "";
  if (prompt) {
    parts.push(`<p>${escapeHtml(prompt)}</p>`);
  }
  return parts.join("");
}

// Tolerant fallback for legacy stories that lack the structured marker.
// Catches the historical phrasing (with optional "gemeinsam") plus minor
// whitespace variations (NBSP, multiple spaces) and is case-insensitive so
// stories that ended up with capitalisation tweaks still get normalised.
const LEGACY_INTRO_COUNT_REGEX =
  /(verkostet[\s\u00a0]+von[\s\u00a0]+)(einer[\s\u00a0]+Person|\d+[\s\u00a0]+Personen)/gi;

function applyLegacyCountRewrite(body: string, includedCount: number): { body: string; changed: boolean } {
  const expected = includedCount === 1 ? "einer Person" : `${includedCount} Personen`;
  let changed = false;
  const out = body.replace(LEGACY_INTRO_COUNT_REGEX, (match, prefix: string, captured: string) => {
    if (captured === expected) return match;
    changed = true;
    return `${prefix}${expected}`;
  });
  return { body: changed ? out : body, changed };
}

export function rewriteAutoIntroParticipantCount(
  blocks: StoryBlock[],
  includedCount: number,
): StoryBlock[] {
  let mutated = false;
  const out = blocks.map((b) => {
    if (b.type !== "text-section") return b;
    if (b.editedByHost === true) return b;
    const payload = b.payload as Record<string, unknown>;
    const eyebrow = (payload as { eyebrow?: unknown }).eyebrow;
    if (typeof eyebrow !== "string" || eyebrow !== INTRO_EYEBROW) return b;
    const body = typeof payload.body === "string" ? payload.body : "";
    const meta = (payload as { meta?: unknown }).meta;

    // Path 1: structured marker present — deterministic rebuild when the body
    // still matches the originally generated template. Always keep the meta's
    // participantCount in sync with the included count.
    if (isAutoIntroMeta(meta)) {
      const expectedOldBody = buildAutoIntroBody({
        whiskyCount: meta.whiskyCount,
        participantCount: meta.participantCount,
        storyPrompt: meta.storyPrompt,
      });
      if (body === expectedOldBody) {
        if (meta.participantCount === includedCount) return b;
        const newBody = buildAutoIntroBody({
          whiskyCount: meta.whiskyCount,
          participantCount: includedCount,
          storyPrompt: meta.storyPrompt,
        });
        mutated = true;
        return {
          ...b,
          payload: {
            ...payload,
            body: newBody,
            meta: { ...meta, participantCount: includedCount },
          },
        };
      }
      // Body diverged from the template (host edited around the count).
      // Fall back to the regex rewrite so the count still gets corrected.
      const { body: rewrittenBody, changed } = applyLegacyCountRewrite(body, includedCount);
      if (!changed) return b;
      mutated = true;
      return {
        ...b,
        payload: {
          ...payload,
          body: rewrittenBody,
          meta: { ...meta, participantCount: includedCount },
        },
      };
    }

    // Path 2: legacy block without marker — rely on the broader regex.
    const { body: rewrittenBody, changed } = applyLegacyCountRewrite(body, includedCount);
    if (!changed) return b;
    mutated = true;
    return { ...b, payload: { ...payload, body: rewrittenBody } };
  });
  return mutated ? out : blocks;
}

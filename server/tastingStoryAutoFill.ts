import type { Tasting, Whisky } from "@shared/schema";

type StoryBlock = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  hidden?: boolean;
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

function whiskyDescriptor(w: Whisky): string {
  const parts: string[] = [];
  if (w.distillery) parts.push(w.distillery);
  if (w.region) parts.push(w.region);
  if (w.age) parts.push(`${w.age} Jahre`);
  if (typeof w.abv === "number") parts.push(`${w.abv}% ABV`);
  if (w.caskType) parts.push(w.caskType);
  return parts.join(" · ");
}

function whiskyBodyHtml(w: Whisky): string {
  const lines: string[] = [];
  const descriptor = whiskyDescriptor(w);
  if (descriptor) {
    lines.push(`<p><em>${escapeHtml(descriptor)}</em></p>`);
  }
  if (w.hostSummary) {
    lines.push(`<p>${escapeHtml(w.hostSummary)}</p>`);
  } else if (w.notes) {
    lines.push(`<p>${escapeHtml(w.notes)}</p>`);
  }
  if (lines.length === 0) {
    lines.push(`<p>Notizen folgen.</p>`);
  }
  return lines.join("");
}

export function buildInitialTastingStoryBlocks(args: {
  tasting: Tasting;
  whiskies: Whisky[];
  participantCount: number;
}): StoryBlock[] {
  const { tasting, whiskies, participantCount } = args;
  const blocks: StoryBlock[] = [];

  const dateLabel = tastingDateLabel(tasting);
  const heroMeta = [dateLabel, tasting.location ?? ""].filter((p) => p && p.length > 0).join(" · ");

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
  introParts.push(`<p>Willkommen zur Verkostung. Auf den nächsten Seiten begleiten wir dich durch ${whiskies.length === 1 ? "einen Whisky" : `${whiskies.length} Whiskys`}, gemeinsam verkostet von ${participantCount === 1 ? "einer Person" : `${participantCount} Personen`}.</p>`);
  if (tasting.storyPrompt) {
    introParts.push(`<p>${escapeHtml(tasting.storyPrompt)}</p>`);
  }

  blocks.push({
    id: blockId(),
    type: "text-section",
    payload: {
      eyebrow: "Begrüßung",
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

  whiskies.forEach((w, idx) => {
    blocks.push({
      id: blockId(),
      type: "text-section",
      payload: {
        eyebrow: `Whisky ${idx + 1} / ${whiskies.length}`,
        heading: w.name || `Whisky ${idx + 1}`,
        body: whiskyBodyHtml(w),
        alignment: "left",
        variant: "default",
      },
    });

    if (w.imageUrl) {
      blocks.push({
        id: blockId(),
        type: "full-width-image",
        payload: {
          imageUrl: w.imageUrl,
          alt: w.name || "",
          caption: w.distillery ? `${w.distillery}` : "",
          aspect: "wide",
        },
      });
    }

    if (idx < whiskies.length - 1) {
      blocks.push({
        id: blockId(),
        type: "divider",
        payload: { variant: "space-large" },
      });
    }
  });

  if (whiskies.length > 0) {
    blocks.push({
      id: blockId(),
      type: "divider",
      payload: { variant: "stars" },
    });
  }

  blocks.push({
    id: blockId(),
    type: "stats-grid",
    payload: {
      eyebrow: "Im Überblick",
      heading: "Diese Verkostung in Zahlen",
      items: [
        { value: String(whiskies.length), label: whiskies.length === 1 ? "Whisky" : "Whiskys", hint: "" },
        { value: String(participantCount), label: participantCount === 1 ? "Teilnehmer" : "Teilnehmer", hint: "" },
        { value: dateLabel || "—", label: "Datum", hint: tasting.location || "" },
      ],
      columns: "3",
    },
  });

  blocks.push({
    id: blockId(),
    type: "text-section",
    payload: {
      eyebrow: "Zum Abschluss",
      heading: "Danke fürs Mitverkosten",
      body: "<p>Bewahre die Erinnerung an diesen Abend — teile die Story, druck sie aus oder schick sie deinen Mitverkostenden.</p>",
      alignment: "left",
      variant: "default",
    },
  });

  return blocks;
}

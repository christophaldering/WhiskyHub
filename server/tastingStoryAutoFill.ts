import type { Rating, Tasting, Whisky } from "@shared/schema";

type StoryBlock = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  hidden?: boolean;
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

function participantLabel(p: ParticipantLite): string {
  const name = (p.displayName ?? p.name ?? "").trim();
  return name.length > 0 ? name : "Gast";
}

function whiskyLabel(w: Whisky, idx: number): string {
  if (w.name && w.name.trim().length > 0) return w.name;
  return `Whisky ${idx + 1}`;
}

function averageScore(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

function rankWhiskies(whiskies: Whisky[], ratings: Rating[]): Array<{ whisky: Whisky; index: number; avg: number | null; voters: number }> {
  return whiskies.map((w, idx) => {
    const wr = ratings.filter((r) => r.whiskyId === w.id);
    const overallScores = wr
      .map((r) => (typeof r.overall === "number" ? r.overall : null))
      .filter((v): v is number => v !== null);
    return { whisky: w, index: idx, avg: averageScore(overallScores), voters: wr.length };
  }).sort((a, b) => {
    const av = a.avg ?? -1;
    const bv = b.avg ?? -1;
    if (bv !== av) return bv - av;
    return a.index - b.index;
  });
}

export function buildInitialTastingStoryBlocks(args: {
  tasting: Tasting;
  whiskies: Whisky[];
  participantCount: number;
  participants?: ParticipantLite[];
  ratings?: Rating[];
}): StoryBlock[] {
  const { tasting, whiskies, participantCount } = args;
  const participants = args.participants ?? [];
  const ratings = args.ratings ?? [];
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

  if (participants.length > 0) {
    const participantItems = participants.slice(0, 30).map((p) => ({
      value: participantLabel(p).slice(0, 40),
      label: "",
      hint: "",
    }));
    blocks.push({
      id: blockId(),
      type: "stats-grid",
      payload: {
        eyebrow: "Im Glas",
        heading: "Wer mitverkostet hat",
        items: participantItems,
        columns: participantItems.length >= 4 ? "4" : "3",
      },
    });
  }

  const ranking = whiskies.length > 0 ? rankWhiskies(whiskies, ratings) : [];
  const ranked = ranking.filter((r) => r.avg !== null);
  if (ranked.length > 0) {
    const rows = ranked.map((entry, position) => {
      const w = entry.whisky;
      const idx = entry.index;
      const scoreLabel = entry.avg !== null ? `${entry.avg.toFixed(1)} Punkte` : "Keine Bewertung";
      const distillery = w.distillery ? ` <em>${escapeHtml(w.distillery)}</em>` : "";
      return `<li><strong>${position + 1}. ${escapeHtml(whiskyLabel(w, idx))}</strong>${distillery} — ${escapeHtml(scoreLabel)} (${entry.voters} ${entry.voters === 1 ? "Stimme" : "Stimmen"})</li>`;
    }).join("");
    blocks.push({
      id: blockId(),
      type: "text-section",
      payload: {
        eyebrow: "Ranking",
        heading: "Wie ihr gewertet habt",
        body: `<ol>${rows}</ol>`,
        alignment: "left",
        variant: "default",
      },
    });

    const winner = ranked[0];
    if (winner) {
      const winnerScore = winner.avg !== null ? winner.avg.toFixed(1) : "—";
      const winnerDescriptor = whiskyDescriptor(winner.whisky);
      const winnerBody: string[] = [
        `<p><strong>${escapeHtml(whiskyLabel(winner.whisky, winner.index))}</strong>${winnerDescriptor ? ` — <em>${escapeHtml(winnerDescriptor)}</em>` : ""}</p>`,
        `<p>Schnitt: ${escapeHtml(winnerScore)} Punkte aus ${winner.voters} ${winner.voters === 1 ? "Bewertung" : "Bewertungen"}.</p>`,
      ];
      blocks.push({
        id: blockId(),
        type: "text-section",
        payload: {
          eyebrow: "Sieger",
          heading: "Dram des Abends",
          body: winnerBody.join(""),
          alignment: "center",
          variant: "act-intro",
        },
      });
    }
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

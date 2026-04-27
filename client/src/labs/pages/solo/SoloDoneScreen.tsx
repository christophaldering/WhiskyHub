import { useMemo, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Check, FileEdit, MapPin, Sparkles, Users, Wine } from "lucide-react";
import InsightStrip from "@/labs/components/InsightStrip";
import { selectSoloInsights, type SoloEngineDna, type SoloEngineJournalEntry } from "@/labs/insights/engine";

interface TastingContextLike {
  place?: string;
  placeCustom?: string;
  placeOther?: string;
  company?: string;
  companyCustom?: string;
  companyOther?: string;
  mood?: string;
}

interface Props {
  whiskyName: string;
  score: number;
  onAnother: () => void;
  onHub: () => void;
  showAddToCollection?: boolean;
  onAddToCollection?: () => void;
  added?: boolean;
  isDraft?: boolean;
  tastingContext?: TastingContextLike | string | null;
  whiskyId?: string;
  whiskyRegion?: string | null;
  whiskyAge?: number | string | null;
  whiskyDistillery?: string | null;
  participantId?: string | null;
}

const PLACE_LABEL_KEY: Record<string, string> = {
  atHome: "v2.contextAtHome",
  fair: "v2.contextFair",
  restaurant: "v2.contextRestaurant",
  bar: "v2.contextBar",
  onTheGo: "v2.contextOnTheGo",
  other: "v2.contextOther",
};

const COMPANY_LABEL_KEY: Record<string, string> = {
  alone: "v2.contextAlone",
  withFriends: "v2.contextWithFriends",
  withFamily: "v2.contextWithFamily",
  withColleagues: "v2.contextWithColleagues",
  other: "v2.contextOther",
};

const MOOD_LABEL_KEY: Record<string, string> = {
  relaxed: "v2.contextRelaxed",
  focused: "v2.contextFocused",
  celebratory: "v2.contextCelebratory",
  curious: "v2.contextCurious",
};

function parseContext(input?: TastingContextLike | string | null): TastingContextLike | null {
  if (!input) return null;
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      return parsed && typeof parsed === "object" ? (parsed as TastingContextLike) : null;
    } catch {
      return null;
    }
  }
  return input;
}

export default function SoloDoneScreen({ whiskyName, score, onAnother, onHub, showAddToCollection, onAddToCollection, added, isDraft, tastingContext, whiskyId, whiskyRegion, whiskyAge, whiskyDistillery, participantId }: Props) {
  const { t } = useTranslation();

  const insightsEnabled = !isDraft && !!participantId;

  const dnaQuery = useQuery<SoloEngineDna | null>({
    queryKey: ["whisky-dna", participantId, "solo-recap"],
    queryFn: async () => {
      const res = await fetch(`/api/participants/${participantId}/whisky-dna`, {
        headers: { "x-participant-id": participantId || "" },
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: insightsEnabled,
    staleTime: 30000,
  });

  const journalQuery = useQuery<SoloEngineJournalEntry[]>({
    queryKey: ["journal-list", participantId, "solo-recap"],
    queryFn: async () => {
      const res = await fetch(`/api/journal/${participantId}`, {
        headers: { "x-participant-id": participantId || "" },
      });
      if (!res.ok) return [];
      const data = await res.json();
      const entries = Array.isArray(data) ? data : Array.isArray(data?.entries) ? data.entries : [];
      return entries.map((e: Record<string, unknown>) => ({
        id: String(e.id ?? ""),
        title: typeof e.title === "string" ? e.title : null,
        region: typeof e.region === "string" ? e.region : null,
        personalScore: typeof e.personalScore === "number" ? e.personalScore : (typeof e.overallScore === "number" ? e.overallScore : null),
        createdAt: typeof e.createdAt === "string" ? e.createdAt : null,
      }));
    },
    enabled: insightsEnabled,
    staleTime: 30000,
  });

  const insights = useMemo(() => {
    if (!insightsEnabled) return [];
    return selectSoloInsights({
      whisky: {
        id: whiskyId || whiskyName,
        name: whiskyName,
        region: whiskyRegion ?? null,
        age: typeof whiskyAge === "string" ? Number(whiskyAge) || whiskyAge : whiskyAge ?? null,
        distillery: whiskyDistillery ?? null,
      },
      score,
      dna: dnaQuery.data ?? null,
      journal: journalQuery.data ?? [],
      t,
    });
  }, [insightsEnabled, whiskyId, whiskyName, whiskyRegion, whiskyAge, whiskyDistillery, score, dnaQuery.data, journalQuery.data, t]);

  const ctx = parseContext(tastingContext);
  const contextItems: { icon: ReactElement; label: string }[] = [];
  if (ctx) {
    const placeFreetext = (ctx.placeCustom || ctx.placeOther || "").trim();
    if (ctx.place) {
      const label = ctx.place === "other" && placeFreetext
        ? placeFreetext
        : t(PLACE_LABEL_KEY[ctx.place] || ctx.place, ctx.place);
      contextItems.push({ icon: <MapPin size={12} />, label });
    }
    const companyFreetext = (ctx.companyCustom || ctx.companyOther || "").trim();
    if (ctx.company) {
      const label = ctx.company === "other" && companyFreetext
        ? companyFreetext
        : t(COMPANY_LABEL_KEY[ctx.company] || ctx.company, ctx.company);
      contextItems.push({ icon: <Users size={12} />, label });
    }
    if (ctx.mood) {
      contextItems.push({ icon: <Sparkles size={12} />, label: t(MOOD_LABEL_KEY[ctx.mood] || ctx.mood, ctx.mood) });
    }
  }

  const scoreBand =
    score >= 90 ? "var(--labs-success)" :
    score >= 80 ? "var(--labs-gold)" :
    "var(--labs-accent)";

  return (
    <div className="labs-fade-in" style={{
      padding: "var(--labs-space-xl) var(--labs-space-md)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "var(--labs-space-lg)",
    }}>
      <div className="labs-card" style={{
        width: "100%",
        padding: "var(--labs-space-xl)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--labs-space-lg)",
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: isDraft ? "rgba(200,134,26,0.1)" : "var(--labs-phase-overall-dim)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }} data-testid="solo-done-check">
          {isDraft ? (
            <FileEdit size={32} style={{ color: "#c8861a" }} />
          ) : (
            <Check size={32} style={{ color: "var(--labs-phase-overall)" }} />
          )}
        </div>

        <h2 className="labs-h2" style={{ margin: 0, textAlign: "center" }} data-testid="solo-done-whisky">
          {whiskyName}
        </h2>

        <div style={{
          fontSize: 48,
          fontWeight: 700,
          fontFamily: "var(--font-display)",
          color: scoreBand,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }} data-testid="solo-done-score">
          {score}
        </div>

        {contextItems.length > 0 && (
          <div
            data-testid="text-tasting-context"
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--labs-text-muted)",
              lineHeight: 1.4,
            }}
          >
            {contextItems.map((item, idx) => (
              <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {idx > 0 && <span aria-hidden style={{ opacity: 0.6 }}>·</span>}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {item.icon}
                  {item.label}
                </span>
              </span>
            ))}
          </div>
        )}

        <p style={{
          fontFamily: "var(--font-ui)",
          fontSize: 14,
          color: isDraft ? "#c8861a" : "var(--labs-text-muted)",
          margin: 0,
        }} data-testid="solo-done-saved">
          {isDraft
            ? t("v2.solo.draftSaved", "Entwurf gespeichert")
            : t("v2.solo.saved", "Saved to diary")}
        </p>

        {isDraft && (
          <p style={{
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            color: "var(--labs-text-muted)",
            margin: 0,
            textAlign: "center",
          }} data-testid="solo-done-draft-hint">
            {t("v2.solo.draftHint", "Du kannst den Entwurf jederzeit unter \"My Drams\" vervollständigen.")}
          </p>
        )}

        {insights.length > 0 && (
          <div style={{ width: "100%" }} data-testid="solo-done-insights">
            <InsightStrip
              insights={insights}
              size="standard"
              layout="scroll"
              testId="insight-strip-solo"
              title={t("insights.solo.title", "What this dram tells you")}
              maxItems={4}
            />
          </div>
        )}

        {showAddToCollection && (
          <button
            type="button"
            data-testid="solo-add-to-collection-link"
            onClick={() => { if (!added) onAddToCollection?.(); }}
            disabled={added}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: 0,
              background: "none",
              border: "none",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--labs-accent, #d4a847)",
              cursor: added ? "default" : "pointer",
              opacity: added ? 0.7 : 1,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {added ? (
              <Check size={16} style={{ color: "var(--labs-accent, #d4a847)" }} />
            ) : (
              <Wine size={16} style={{ color: "var(--labs-accent, #d4a847)" }} />
            )}
            <span>
              {added
                ? t("v2.solo.bottleAdded", "Added") + " \u2713"
                : t("v2.solo.addBottleToCollection", "Add bottle to collection")}
            </span>
          </button>
        )}
      </div>

      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--labs-space-sm)" }}>
        <button
          onClick={onAnother}
          data-testid="solo-another-btn"
          className="labs-btn-primary"
          style={{ width: "100%", minHeight: 44 }}
        >
          {t("v2.solo.another", "Log another dram")}
        </button>

        <button
          onClick={onHub}
          data-testid="solo-to-hub-btn"
          className="labs-btn-secondary"
          style={{ width: "100%", minHeight: 44 }}
        >
          {t("v2.solo.toHub", "Back to overview")}
        </button>
      </div>
    </div>
  );
}

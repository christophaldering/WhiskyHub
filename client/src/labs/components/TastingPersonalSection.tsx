import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Sparkles,
  Star,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  MessageCircle,
  Users,
  ChevronRight,
  FileText,
  Download,
  User,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  tastingApi,
  whiskyApi,
  ratingApi,
  getParticipantId,
} from "@/lib/api";
import { formatScore, stripGuestSuffix } from "@/lib/utils";
import WhiskyImage from "@/labs/components/WhiskyImage";
import type { Tasting } from "@shared/schema";

interface Props {
  tastingId: string;
  isHost: boolean;
  currentParticipant:
    | { id: string; name: string; role?: string; canAccessWhiskyDb?: boolean; photoUrl?: string }
    | null
    | undefined;
}

interface RatingRow {
  participantId: string;
  whiskyId: string;
  nose: number | null;
  taste: number | null;
  finish: number | null;
  overall: number | null;
  notes?: string | null;
}

interface WhiskyRow {
  id: string;
  name: string | null;
  distillery: string | null;
  imageUrl?: string | null;
}

interface ParticipantRow {
  id?: string;
  participantId?: string;
  excludedFromResults?: boolean;
  participant?: { name?: string; email?: string };
  name?: string;
  email?: string;
}

interface AggregatedRange {
  min: number | null;
  max: number | null;
  spread: number | null;
}

interface AggregatedRating extends RatingRow {}

interface AggregatedWhisky extends WhiskyRow {
  ratings: AggregatedRating[];
  ratingCount: number;
  avgOverall: number | null;
  myRating: AggregatedRating | null;
  myDelta: number | null;
  overallRange: AggregatedRange;
  overallStdDev: number | null;
}

interface AiIndividualReport {
  narrative?: string | null;
}

interface AiReportPayload {
  individualReports?: Record<string, AiIndividualReport | null>;
}

interface AiReportEnvelope {
  report: AiReportPayload | null;
  locked?: boolean;
  isHost?: boolean;
}

function fmt(value: number | null | undefined): string {
  if (value == null) return "\u2014";
  return formatScore(value);
}

function DeltaIndicator({ delta }: { delta: number | null }) {
  if (delta == null) return null;
  const rounded = Math.round(delta * 10) / 10;
  const absDelta = Math.abs(rounded);
  if (absDelta < 1) {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-[11px] font-medium"
        style={{ color: "var(--labs-text-muted)" }}
      >
        <Minus className="w-3 h-3" /> &plusmn;0
      </span>
    );
  }
  if (rounded > 0) {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-[11px] font-medium"
        style={{ color: "var(--labs-success)" }}
      >
        <TrendingUp className="w-3 h-3" /> +{formatScore(rounded)}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[11px] font-medium"
      style={{ color: "var(--labs-danger)" }}
    >
      <TrendingDown className="w-3 h-3" /> {formatScore(rounded)}
    </span>
  );
}

const ANCHOR_OVERVIEW = "persoenlich-overview";
const ANCHOR_AI = "persoenlich-ai";
const ANCHOR_RATINGS = "persoenlich-ratings";

export default function TastingPersonalSection({
  tastingId,
  isHost,
  currentParticipant,
}: Props) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const pid = getParticipantId();

  const { data: tasting } = useQuery<Tasting>({
    queryKey: ["tasting", tastingId],
    queryFn: () => tastingApi.get(tastingId) as Promise<Tasting>,
    enabled: !!tastingId,
  });

  const { data: whiskiesData } = useQuery({
    queryKey: ["whiskies", tastingId],
    queryFn: () => whiskyApi.getForTasting(tastingId) as Promise<WhiskyRow[]>,
    enabled: !!tastingId,
  });

  const { data: ratingsData } = useQuery({
    queryKey: ["tastingRatings", tastingId],
    queryFn: () => ratingApi.getForTasting(tastingId) as Promise<RatingRow[]>,
    enabled: !!tastingId,
  });

  const { data: participantsData } = useQuery({
    queryKey: ["tastingParticipants", tastingId],
    queryFn: () => tastingApi.getParticipants(tastingId) as Promise<ParticipantRow[]>,
    enabled: !!tastingId,
  });

  const isRevealed =
    tasting?.status === "reveal" ||
    tasting?.status === "archived" ||
    tasting?.status === "completed";

  const { data: aiReport } = useQuery<AiReportEnvelope | null>({
    queryKey: ["tasting-ai-report", tastingId, currentParticipant?.id],
    queryFn: async () => {
      const myPid = currentParticipant?.id || pid || "";
      const res = await fetch(`/api/tastings/${tastingId}/ai-report`, {
        headers: myPid ? { "x-participant-id": myPid } : undefined,
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!tastingId && !!currentParticipant?.id && isRevealed,
    staleTime: 30_000,
  });

  const blindMode = !!tasting?.blindMode;

  const whiskyResults: AggregatedWhisky[] = useMemo(() => {
    const sMax = (tasting?.ratingScale as number) || 100;
    const excludedPids = new Set<string>(
      (participantsData || [])
        .filter((p) => p.excludedFromResults)
        .map((p) => p.participantId || p.id || ""),
    );
    const includedRatings: RatingRow[] = excludedPids.size > 0
      ? (ratingsData || []).filter((r) => !excludedPids.has(r.participantId))
      : (ratingsData || []);

    const toUserScale = (v: number | null | undefined): number | null => {
      if (v == null) return null;
      if (sMax !== 100 && v > sMax) {
        return Math.round((v / 100) * sMax * 10) / 10;
      }
      return v;
    };
    const roundForScale = (v: number) =>
      sMax === 100 ? Math.round(v) : Math.round(v * 10) / 10;

    return (whiskiesData || []).map((w): AggregatedWhisky => {
      const ratings: AggregatedRating[] = includedRatings
        .filter((r) => r.whiskyId === w.id)
        .map((r) => ({
          ...r,
          nose: toUserScale(r.nose),
          taste: toUserScale(r.taste),
          finish: toUserScale(r.finish),
          overall: toUserScale(r.overall),
        }));
      const count = ratings.length;

      const avgOverall = (() => {
        const vals = ratings
          .map((r) => r.overall)
          .filter((v): v is number => v != null && v > 0);
        if (vals.length === 0) return null;
        return roundForScale(vals.reduce((a, b) => a + b, 0) / vals.length);
      })();

      const overallRange = (() => {
        const vals = ratings
          .map((r) => r.overall)
          .filter((v): v is number => v != null && v > 0);
        if (vals.length === 0) return { min: null, max: null, spread: null };
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        return { min, max, spread: max - min };
      })();

      const overallStdDev = (() => {
        const vals = ratings
          .map((r) => r.overall)
          .filter((v): v is number => v != null && v > 0);
        if (vals.length < 2) return null;
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        const variance = vals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / vals.length;
        return Math.sqrt(variance);
      })();

      const myRating = currentParticipant
        ? ratings.find((r) => r.participantId === currentParticipant.id) || null
        : null;
      const myDelta =
        myRating?.overall != null && avgOverall != null
          ? myRating.overall - avgOverall
          : null;

      return {
        ...w,
        ratings,
        ratingCount: count,
        avgOverall,
        myRating,
        myDelta,
        overallRange,
        overallStdDev,
      };
    });
  }, [whiskiesData, ratingsData, participantsData, currentParticipant, tasting?.ratingScale]);

  const sorted = useMemo(
    () => [...whiskyResults].sort((a, b) => (b.avgOverall || 0) - (a.avgOverall || 0)),
    [whiskyResults],
  );

  const summaryData = useMemo(() => {
    const rated = sorted.filter((w) => w.avgOverall != null);
    const groupAvg = rated.length > 0
      ? Math.round(rated.reduce((s, w) => s + (w.avgOverall || 0), 0) / rated.length)
      : null;

    const myRated = sorted.filter((w) => w.myRating?.overall != null);
    const userAvg = myRated.length > 0
      ? Math.round(myRated.reduce((s, w) => s + (w.myRating?.overall || 0), 0) / myRated.length)
      : null;

    const myHighlights = myRated
      .filter((w) => w.myDelta != null && w.myDelta > 5)
      .sort((a, b) => (b.myDelta || 0) - (a.myDelta || 0));

    const myLowlights = myRated
      .filter((w) => w.myDelta != null && w.myDelta < -5)
      .sort((a, b) => (a.myDelta || 0) - (b.myDelta || 0));

    return { groupAvg, userAvg, myHighlights, myLowlights };
  }, [sorted]);

  const participantStats = useMemo(() => {
    const excludedPids = new Set<string>(
      (participantsData || [])
        .filter((p) => p.excludedFromResults)
        .map((p) => p.participantId || p.id || ""),
    );
    const includedRatings: RatingRow[] = excludedPids.size > 0
      ? (ratingsData || []).filter((r) => !excludedPids.has(r.participantId))
      : (ratingsData || []);

    const ratingsByParticipant = new Map<string, Map<string, number>>();
    for (const r of includedRatings) {
      if (r.overall == null || r.overall <= 0) continue;
      let inner = ratingsByParticipant.get(r.participantId);
      if (!inner) {
        inner = new Map<string, number>();
        ratingsByParticipant.set(r.participantId, inner);
      }
      inner.set(String(r.whiskyId), r.overall);
    }

    const groupAvgByWhisky = new Map<string, number>();
    for (const w of sorted) {
      if (w.avgOverall != null) groupAvgByWhisky.set(String(w.id), w.avgOverall);
    }

    const participantNames = new Map<string, string>();
    for (const p of participantsData || []) {
      const id = p.participantId || p.id || "";
      const rawName = p.participant?.name || p.participant?.email || p.name || p.email || "";
      participantNames.set(id, stripGuestSuffix(rawName));
    }

    let closestTwinName: string | null = null;
    if (currentParticipant?.id) {
      const myRatings = ratingsByParticipant.get(currentParticipant.id);
      if (myRatings && myRatings.size > 0) {
        let bestAvg = Infinity;
        let twinId: string | null = null;
        const entries = Array.from(ratingsByParticipant.entries());
        for (const [otherPid, theirRatings] of entries) {
          if (otherPid === currentParticipant.id) continue;
          let count = 0;
          let sumDelta = 0;
          const myEntries = Array.from(myRatings.entries());
          for (const [wid, mine] of myEntries) {
            const their = theirRatings.get(wid);
            if (their == null) continue;
            sumDelta += Math.abs(mine - their);
            count++;
          }
          if (count >= 2) {
            const avgDev = sumDelta / count;
            if (avgDev < bestAvg) {
              bestAvg = avgDev;
              twinId = otherPid;
            }
          }
        }
        if (twinId) closestTwinName = participantNames.get(twinId) || null;
      }
    }

    let bestSpreadAvg = Infinity;
    let bestSpreadId: string | null = null;
    let worstSpreadAvg = -Infinity;
    let worstSpreadId: string | null = null;
    const partEntries = Array.from(ratingsByParticipant.entries());
    for (const [otherPid, theirRatings] of partEntries) {
      let count = 0;
      let sumDev = 0;
      const wEntries = Array.from(theirRatings.entries());
      for (const [wid, score] of wEntries) {
        const ga = groupAvgByWhisky.get(wid);
        if (ga == null) continue;
        sumDev += Math.abs(score - ga);
        count++;
      }
      if (count >= 2) {
        const avgDev = sumDev / count;
        if (avgDev < bestSpreadAvg) {
          bestSpreadAvg = avgDev;
          bestSpreadId = otherPid;
        }
        if (avgDev > worstSpreadAvg) {
          worstSpreadAvg = avgDev;
          worstSpreadId = otherPid;
        }
      }
    }

    return { closestTwinName, bestSpreadId, worstSpreadId };
  }, [ratingsData, participantsData, sorted, currentParticipant?.id]);

  const scrollToAnchor = (anchorId: string) => {
    const el = document.getElementById(anchorId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const flashTarget = (el: HTMLElement) => {
    const prevOutline = el.style.outline;
    const prevOffset = el.style.outlineOffset;
    const prevTransition = el.style.transition;
    const prevBoxShadow = el.style.boxShadow;
    el.style.transition = "box-shadow 0.4s ease, outline-color 0.4s ease";
    el.style.outline = "2px solid var(--labs-accent)";
    el.style.outlineOffset = "2px";
    el.style.boxShadow = "0 0 0 4px rgba(201, 169, 97, 0.15)";
    window.setTimeout(() => {
      el.style.outline = prevOutline;
      el.style.outlineOffset = prevOffset;
      el.style.boxShadow = prevBoxShadow;
      window.setTimeout(() => {
        el.style.transition = prevTransition;
      }, 500);
    }, 1100);
  };

  const scrollAndFlash = (selector: string) => {
    let attempts = 0;
    const tryScroll = () => {
      const target = document.querySelector(selector);
      if (target instanceof HTMLElement) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        flashTarget(target);
        return;
      }
      attempts += 1;
      if (attempts < 4) window.setTimeout(tryScroll, 100);
    };
    tryScroll();
  };

  const scrollToWhisky = (whiskyId: string) => {
    window.dispatchEvent(new CustomEvent("labs-tasting-detail-set-section", { detail: "auswertung" }));
    window.setTimeout(() => {
      scrollAndFlash(`[data-testid="detail-results-whisky-${whiskyId}"]`);
    }, 120);
  };

  const scrollToDownloads = (cardId?: string) => {
    window.dispatchEvent(new CustomEvent("labs-tasting-detail-set-section", { detail: "downloads" }));
    window.setTimeout(() => {
      if (cardId) {
        scrollAndFlash(`#${cardId}`);
        return;
      }
      const el = document.getElementById("section-downloads") || document.getElementById("downloads");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  };

  const subTiles: Array<{
    icon: typeof BarChart3;
    title: string;
    desc: string;
    anchor: string;
    testId: string;
  }> = [
    {
      icon: User,
      title: t("resultsUi.subsectionPersoenlichTitle", "Persönliche Auswertung"),
      desc: t(
        "resultsUi.subsectionPersoenlichTileDesc",
        "Dein Schnitt, Δ zur Gruppe & Selbst-Badges",
      ),
      anchor: ANCHOR_OVERVIEW,
      testId: "persoenlich-tile-overview",
    },
    {
      icon: Sparkles,
      title: t("resultsUi.personalAiTitle", "Persönliche KI-Analyse"),
      desc: t(
        "resultsUi.subsectionPersoenlichAiTileDesc",
        "Dein KI-Narrativ — wenn vom Host freigegeben",
      ),
      anchor: ANCHOR_AI,
      testId: "persoenlich-tile-ai",
    },
    {
      icon: Star,
      title: t("resultsUi.personalRatingsTitle", "Deine Bewertungen"),
      desc: t(
        "resultsUi.subsectionPersoenlichRatingsTileDesc",
        "Pro Whisky, Highlights & Tiefpunkte",
      ),
      anchor: ANCHOR_RATINGS,
      testId: "persoenlich-tile-ratings",
    },
  ];

  const reportPayload = aiReport?.report ?? null;
  const aiExists = !!reportPayload;
  const aiLocked = aiReport?.locked === true;
  const aiUnlocked = aiExists && !aiLocked;
  const indReport = (aiUnlocked && currentParticipant?.id)
    ? (reportPayload?.individualReports?.[currentParticipant.id] ?? null)
    : null;
  const aiStatus: "available" | "pending" | "locked" =
    aiLocked ? "locked"
    : (indReport ? "available" : "pending");
  const previewText = indReport?.narrative ? String(indReport.narrative).slice(0, 180) : "";

  const personalStrongest = useMemo(() => {
    let strongest: AggregatedWhisky | null = null;
    let strongestAbs = 0;
    for (const w of sorted) {
      const mine = w.myRating?.overall;
      const group = w.avgOverall;
      if (mine == null || group == null) continue;
      const abs = Math.abs(mine - group);
      if (abs > strongestAbs) {
        strongestAbs = abs;
        strongest = w;
      }
    }
    if (!strongest || strongestAbs < 0.5) return null;
    return strongest;
  }, [sorted]);

  const noPersonalData = summaryData.userAvg == null;

  return (
    <section id="section-persoenlich" className="mb-8 labs-fade-in labs-detail-section-anchor" data-testid="detail-section-persoenlich">
      <header style={{ marginBottom: 12 }}>
        <h2
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--labs-text)",
            margin: 0,
            letterSpacing: "0.02em",
          }}
        >
          {t("resultsUi.sectionPersoenlichTitle", "Persönliche Analyse")}
        </h2>
        <p
          style={{
            fontSize: 12,
            color: "var(--labs-text-muted)",
            margin: "2px 0 0",
            lineHeight: 1.4,
          }}
        >
          {t("resultsUi.sectionPersoenlichSubtitle", "Deine Bewertungen, dein KI-Bericht & dein Vergleich zur Gruppe")}
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
        data-testid="persoenlich-subtiles"
      >
        {subTiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.testId}
              type="button"
              onClick={() => scrollToAnchor(tile.anchor)}
              className="labs-card"
              data-testid={tile.testId}
              style={{
                padding: 14,
                background: "var(--labs-surface-elevated)",
                border: "1px solid var(--labs-border)",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                textAlign: "left",
                cursor: "pointer",
                fontFamily: "inherit",
                width: "100%",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  flexShrink: 0,
                  background: "var(--labs-accent-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)", margin: 0 }}>
                  {tile.title}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--labs-text-muted)",
                    margin: "2px 0 0",
                    lineHeight: 1.4,
                  }}
                >
                  {tile.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div
        id={ANCHOR_OVERVIEW}
        data-testid="detail-subsection-persoenlich-overview"
        style={{ scrollMarginTop: 80, marginBottom: 24 }}
      >
        <div className="labs-section-label" style={{ marginBottom: 4 }}>
          {t("resultsUi.subsectionPersoenlichTitle", "Persönliche Auswertung")}
        </div>
        <p
          style={{
            fontSize: 11,
            color: "var(--labs-text-muted)",
            margin: "0 0 12px",
            lineHeight: 1.4,
          }}
        >
          {t("resultsUi.subsectionPersoenlichSubtitle", "So passt du in dieses Tasting")}
        </p>

        {noPersonalData ? (
          <div
            className="labs-card"
            data-testid={isHost ? "results-personal-empty-host" : "results-personal-empty"}
            style={{
              padding: 16,
              textAlign: "center",
              background: "var(--labs-surface-elevated)",
              border: "1px dashed var(--labs-border)",
            }}
          >
            <p style={{ fontSize: 12, color: "var(--labs-text-muted)", margin: 0, lineHeight: 1.5 }}>
              {isHost
                ? t(
                    "resultsUi.personalNoDataHost",
                    "Persönliche Sicht — du hast als Host noch nichts bewertet. Sobald du eigene Bewertungen abgibst, erscheinen hier deine Highlights, Tiefpunkte und der Vergleich mit der Gruppe.",
                  )
                : t(
                    "resultsUi.personalNoData",
                    "Noch keine persönlichen Insights — bewerte mindestens zwei Whiskys, um deine Auswertung zu sehen.",
                  )}
            </p>
          </div>
        ) : (
          <>
            {(() => {
              const myAvg = summaryData.userAvg;
              const groupAvg = summaryData.groupAvg;
              const delta = (myAvg != null && groupAvg != null) ? (myAvg - groupAvg) : null;
              const tiles: { icon: typeof Star; value: string | number; label: string; testId: string; valueColor?: string }[] = [
                { icon: Star, value: myAvg ?? "\u2014", label: t("resultsUi.personalYourAvg", "Dein Schnitt"), testId: "personal-stat-myavg" },
                { icon: BarChart3, value: groupAvg ?? "\u2014", label: t("resultsUi.personalStatGroupAvg", "Gruppen-Ø"), testId: "personal-stat-groupavg" },
                {
                  icon: delta != null && delta > 0 ? TrendingUp : delta != null && delta < 0 ? TrendingDown : Minus,
                  value: delta == null ? "\u2014" : (delta > 0 ? `+${formatScore(delta)}` : formatScore(delta)),
                  label: t("resultsUi.personalStatDelta", "Δ Gruppe"),
                  testId: "personal-stat-delta",
                  valueColor: delta == null ? undefined : (Math.abs(delta) < 1 ? "var(--labs-text-muted)" : delta > 0 ? "var(--labs-success)" : "var(--labs-danger)"),
                },
              ];
              return (
                <div
                  className="mb-4 labs-fade-in"
                  data-testid="results-personal-stats-bar"
                  style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}
                >
                  {tiles.map((s) => {
                    const Icon = s.icon;
                    return (
                      <div
                        key={s.testId}
                        data-testid={s.testId}
                        style={{
                          padding: "12px 8px",
                          borderRadius: 12,
                          background: "var(--labs-surface-elevated)",
                          border: "1px solid var(--labs-border)",
                          textAlign: "center",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Icon className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                        <div style={{
                          fontSize: 22,
                          fontWeight: 700,
                          color: s.valueColor || "var(--labs-text)",
                          fontVariantNumeric: "tabular-nums",
                          lineHeight: 1.1,
                        }}>
                          {s.value}
                        </div>
                        <div style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: "var(--labs-text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}>
                          {s.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {(participantStats.closestTwinName
              || (currentParticipant && currentParticipant.id === participantStats.bestSpreadId)
              || (currentParticipant && currentParticipant.id === participantStats.worstSpreadId)) && (
              <div className="mb-2 labs-fade-in" data-testid="results-personal-badges" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {participantStats.closestTwinName && (
                  <div
                    className="labs-card p-3 flex items-center gap-3"
                    data-testid="results-personal-twin"
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: "var(--labs-accent-muted)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Users className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>
                        {t("resultsUi.personalTwinTitle", "Dein Geschmacks-Zwilling")}
                      </p>
                      <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                        {t("resultsUi.personalTwinDescStatic", "Am ähnlichsten zu dir bewertet:")}{" "}
                        <strong style={{ color: "var(--labs-text)" }}>{participantStats.closestTwinName}</strong>
                      </p>
                    </div>
                  </div>
                )}
                {currentParticipant && currentParticipant.id === participantStats.bestSpreadId && (
                  <div
                    className="labs-card p-3 flex items-center gap-3"
                    data-testid="results-personal-champion"
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: "var(--labs-accent-muted)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Target className="w-4 h-4" style={{ color: "var(--labs-success)" }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>
                        {t("resultsUi.personalChampionTitle", "Konsens-Champion")}
                      </p>
                      <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                        {t("resultsUi.personalChampionDescStatic", "Deine Bewertungen lagen am dichtesten am Gruppenschnitt.")}
                      </p>
                    </div>
                  </div>
                )}
                {currentParticipant && currentParticipant.id === participantStats.worstSpreadId
                  && participantStats.worstSpreadId !== participantStats.bestSpreadId && (
                  <div
                    className="labs-card p-3 flex items-center gap-3"
                    data-testid="results-personal-outlier"
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: "var(--labs-accent-muted)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <MessageCircle className="w-4 h-4" style={{ color: "var(--labs-danger)" }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>
                        {t("resultsUi.personalOutlierTitle", "Eigenwilliger Gaumen")}
                      </p>
                      <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                        {t("resultsUi.personalOutlierDesc", "Deine Bewertungen wichen am stärksten vom Gruppenschnitt ab — du hast deinen eigenen Stil.")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {personalStrongest && (() => {
              const w = personalStrongest;
              const mine = w.myRating?.overall ?? 0;
              const group = w.avgOverall ?? 0;
              const delta = mine - group;
              const above = delta > 0;
              const Icon = above ? TrendingUp : TrendingDown;
              const color = above ? "var(--labs-success)" : "var(--labs-danger)";
              return (
                <button
                  type="button"
                  className="mt-2 labs-card p-3 flex items-center gap-3 w-full text-left"
                  data-testid={`results-personal-whisky-outlier-${w.id}`}
                  onClick={() => scrollToWhisky(w.id)}
                  style={{ cursor: "pointer", fontFamily: "inherit" }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: "var(--labs-accent-muted)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>
                      {t("resultsUi.personalWhiskyOutlierTitle", "Stärkste persönliche Abweichung")}
                    </p>
                    <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                      <strong style={{ color: "var(--labs-text)" }}>
                        {w.name || `#${(sorted.indexOf(w) + 1)}`}
                      </strong>
                      {" \u2014 "}
                      {above
                        ? t("resultsUi.personalWhiskyOutlierAbove", "Du hast {{delta}} Punkte über dem Gruppenschnitt bewertet.", { delta: formatScore(Math.abs(delta)) })
                        : t("resultsUi.personalWhiskyOutlierBelow", "Du hast {{delta}} Punkte unter dem Gruppenschnitt bewertet.", { delta: formatScore(Math.abs(delta)) })}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--labs-text-muted)" }} />
                </button>
              );
            })()}
          </>
        )}
      </div>

      <div
        id={ANCHOR_AI}
        data-testid="detail-subsection-persoenlich-ai"
        style={{ scrollMarginTop: 80, marginBottom: 24 }}
      >
        <div className="labs-section-label flex items-center gap-1.5" style={{ marginBottom: 4 }}>
          <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)" }} />
          {t("resultsUi.personalAiTitle", "Persönliche KI-Analyse")}
        </div>
        <p
          style={{
            fontSize: 11,
            color: "var(--labs-text-muted)",
            margin: "0 0 12px",
            lineHeight: 1.4,
          }}
        >
          {t(
            "resultsUi.subsectionPersoenlichAiSubtitle",
            "Was die KI über dein Tasting-Verhalten erkennt",
          )}
        </p>
        <div
          className="labs-card p-3"
          data-testid={`results-personal-ai-card-${aiStatus}`}
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          {aiStatus === "locked" && (
            <p style={{ fontSize: 12, color: "var(--labs-text-muted)", margin: 0, lineHeight: 1.5 }}>
              {t("resultsUi.personalAiLocked", "Der Host hat die KI-Analyse noch nicht für Teilnehmer freigeschaltet.")}
            </p>
          )}
          {aiStatus === "pending" && (
            <p style={{ fontSize: 12, color: "var(--labs-text-muted)", margin: 0, lineHeight: 1.5 }}>
              {aiExists
                ? t("resultsUi.personalAiPending", "Deine persönliche KI-Analyse ist noch nicht verfügbar — der Host kann sie generieren.")
                : t("resultsUi.personalAiNotGenerated", "Es wurde noch keine KI-Analyse erzeugt.")}
            </p>
          )}
          {aiStatus === "available" && previewText && (
            <p style={{ fontSize: 13, color: "var(--labs-text)", margin: 0, lineHeight: 1.55, whiteSpace: "pre-line" }}>
              {previewText}{indReport?.narrative && indReport.narrative.length > 180 ? "\u2026" : ""}
            </p>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: aiStatus === "available" ? 4 : 0 }}>
            {(aiStatus === "available" || (isHost && aiExists)) && (
              <button
                type="button"
                onClick={() => navigate(`/labs/results/${tastingId}/report`)}
                className="labs-btn-ghost"
                data-testid="results-personal-ai-open"
                style={{ fontSize: 12, padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                {t("resultsUi.personalAiOpen", "KI-Analyse öffnen")}
              </button>
            )}
            {aiStatus === "available" && (
              <button
                type="button"
                onClick={() => scrollToDownloads()}
                className="labs-btn-ghost"
                data-testid="results-personal-ai-download"
                style={{ fontSize: 12, padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Download className="w-3.5 h-3.5" />
                {t("resultsUi.personalAiDownload", "Persönliches PDF")}
              </button>
            )}
          </div>
        </div>
      </div>

      <div
        id={ANCHOR_RATINGS}
        data-testid="detail-subsection-persoenlich-ratings"
        style={{ scrollMarginTop: 80 }}
      >
        <div className="labs-section-label flex items-center gap-1.5" style={{ marginBottom: 4 }}>
          <Star className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)" }} />
          {t("resultsUi.personalRatingsTitle", "Deine Bewertungen")}
        </div>
        <p
          style={{
            fontSize: 11,
            color: "var(--labs-text-muted)",
            margin: "0 0 12px",
            lineHeight: 1.4,
          }}
        >
          {t(
            "resultsUi.subsectionPersoenlichRatingsSubtitle",
            "Deine Wertungen pro Whisky, Highlights und Tiefpunkte",
          )}
        </p>

        {sorted.some((w) => w.myRating?.overall != null) ? (
          <div className="space-y-1.5 mb-4" data-testid="results-personal-ratings">
            {sorted.filter((w) => w.myRating?.overall != null).map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => scrollToWhisky(w.id)}
                className="labs-card w-full p-2.5 flex items-center gap-3 text-left"
                data-testid={`results-personal-rating-${w.id}`}
                style={{ cursor: "pointer", fontFamily: "inherit" }}
              >
                {w.imageUrl && (!blindMode || isRevealed) && (
                  <WhiskyImage
                    imageUrl={w.imageUrl}
                    name={w.name || t("resultsUi.unknown", "Unbekannt")}
                    size={28}
                    whiskyId={w.id}
                    testId={`results-personal-rating-image-${w.id}`}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate" style={{ color: "var(--labs-text)" }}>
                    {w.name || t("resultsUi.unknown", "Unbekannt")}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--labs-text-muted)" }}>
                    {t("resultsUi.personalYou", "Du")}: {fmt(w.myRating?.overall)}
                    {" \u00b7 "}
                    {t("resultsUi.personalGroup", "Gruppe")}: {fmt(w.avgOverall)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div
            className="labs-card mb-4"
            data-testid="results-personal-ratings-empty"
            style={{
              padding: 14,
              textAlign: "center",
              background: "var(--labs-surface-elevated)",
              border: "1px dashed var(--labs-border)",
            }}
          >
            <p style={{ fontSize: 12, color: "var(--labs-text-muted)", margin: 0 }}>
              {t("resultsUi.personalRatingsEmpty", "Noch keine eigenen Bewertungen vorhanden.")}
            </p>
          </div>
        )}

        {summaryData.myHighlights.length > 0 && (
          <div className="mb-4 labs-fade-in" data-testid="results-personal-highlights">
            <div className="labs-section-label flex items-center gap-1.5" style={{ marginBottom: 6 }}>
              <TrendingUp className="w-3.5 h-3.5" style={{ color: "var(--labs-success)" }} />
              {t("resultsUi.personalHighlightsTitle", "Deine Highlights")}
            </div>
            <div className="space-y-2">
              {summaryData.myHighlights.slice(0, 3).map((w) => (
                <div key={w.id} className="labs-card p-3 flex items-center gap-3" data-testid={`results-highlight-${w.id}`}>
                  {w.imageUrl && (!blindMode || isRevealed) && (
                    <WhiskyImage
                      imageUrl={w.imageUrl}
                      name={w.name || t("resultsUi.unknown", "Unbekannt")}
                      size={32}
                      whiskyId={w.id}
                      testId={`results-highlight-image-${w.id}`}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--labs-text)" }}>
                      {w.name || t("resultsUi.unknown", "Unbekannt")}
                    </p>
                    <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                      {t("resultsUi.personalYou", "Du")}: {fmt(w.myRating?.overall)}
                      {" \u00b7 "}
                      {t("resultsUi.personalGroup", "Gruppe")}: {fmt(w.avgOverall)}
                    </p>
                  </div>
                  <DeltaIndicator delta={w.myDelta} />
                </div>
              ))}
            </div>
          </div>
        )}

        {summaryData.myLowlights.length > 0 && (
          <div className="mb-4 labs-fade-in" data-testid="results-personal-lowlights">
            <div className="labs-section-label flex items-center gap-1.5" style={{ marginBottom: 6 }}>
              <TrendingDown className="w-3.5 h-3.5" style={{ color: "var(--labs-danger)" }} />
              {t("resultsUi.personalLowlightsTitle", "Deine Tiefpunkte")}
            </div>
            <div className="space-y-2">
              {summaryData.myLowlights.slice(0, 3).map((w) => (
                <div key={w.id} className="labs-card p-3 flex items-center gap-3" data-testid={`results-lowlight-${w.id}`}>
                  {w.imageUrl && (!blindMode || isRevealed) && (
                    <WhiskyImage
                      imageUrl={w.imageUrl}
                      name={w.name || t("resultsUi.unknown", "Unbekannt")}
                      size={32}
                      whiskyId={w.id}
                      testId={`results-lowlight-image-${w.id}`}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--labs-text)" }}>
                      {w.name || t("resultsUi.unknown", "Unbekannt")}
                    </p>
                    <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                      {t("resultsUi.personalYou", "Du")}: {fmt(w.myRating?.overall)}
                      {" \u00b7 "}
                      {t("resultsUi.personalGroup", "Gruppe")}: {fmt(w.avgOverall)}
                    </p>
                  </div>
                  <DeltaIndicator delta={w.myDelta} />
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => scrollToDownloads("download-card-notes-docx")}
          className="labs-card w-full p-3 flex items-center gap-3 text-left"
          data-testid="results-personal-notes-trigger"
          style={{ cursor: "pointer", fontFamily: "inherit" }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: "var(--labs-accent-muted)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <FileText className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>
              {t("resultsUi.personalNotesTitle", "Deine Bewertungen & Notizen als Dokument")}
            </p>
            <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
              {t("resultsUi.personalNotesDesc", "Bewertungen und Tasting-Notizen als Word-Dokument herunterladen.")}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--labs-text-muted)" }} />
        </button>
      </div>
    </section>
  );
}

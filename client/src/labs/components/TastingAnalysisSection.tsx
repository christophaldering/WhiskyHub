import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Trophy,
  Target,
  Star,
  Wine,
  Users,
  MessageCircle,
  Sparkles,
  Clock,
  Archive,
  Check,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  tastingApi,
  whiskyApi,
  ratingApi,
  collectionApi,
  getParticipantId,
} from "@/lib/api";
import { formatScore, stripGuestSuffix } from "@/lib/utils";
import LabsScoreRing from "@/labs/components/LabsScoreRing";
import InsightStrip from "@/labs/components/InsightStrip";
import WhiskyImage from "@/labs/components/WhiskyImage";
import { selectGroupInsights } from "@/labs/insights/engine";
import type { Tasting } from "@shared/schema";

interface Props {
  tastingId: string;
  isHost: boolean;
  currentParticipant: { id: string; name: string; role?: string; canAccessWhiskyDb?: boolean; photoUrl?: string } | null | undefined;
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
  region?: string | null;
  country?: string | null;
  age?: string | null;
  abv?: number | null;
  imageUrl?: string | null;
  caskType?: string | null;
  whiskybaseId?: string | null;
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
  avgNose: number | null;
  avgTaste: number | null;
  avgFinish: number | null;
  myRating: AggregatedRating | null;
  myDelta: number | null;
  overallRange: AggregatedRange;
  overallStdDev: number | null;
}

interface PreviousRating {
  date: string;
  tastingTitle: string;
  nose: number;
  taste: number;
  finish: number;
  overall: number;
}

interface HistoryWhisky {
  whiskybaseId?: string | null;
  name?: string | null;
  distillery?: string | null;
  myRating?: { nose: number; taste: number; finish: number; overall: number } | null;
}

interface HistoryTasting {
  id: string;
  title?: string | null;
  date?: string | null;
  whiskies?: HistoryWhisky[];
}

interface CollectionCheck {
  items?: Record<string, { id: string; status: string | null }>;
}

function fmt(value: number | null | undefined): string | null {
  return value == null ? null : formatScore(value);
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

function AgreementBadge({ stdDev, count }: { stdDev: number | null; count: number }) {
  const { t } = useTranslation();
  if (stdDev == null || count < 2) return null;
  if (stdDev <= 5) {
    return (
      <span className="labs-badge labs-badge-success" data-testid="badge-consensus">
        <Target className="w-3 h-3" /> {t("resultsUi.agreementConsensus", "Consensus")}
      </span>
    );
  }
  if (stdDev > 10) {
    return (
      <span className="labs-badge labs-badge-danger" data-testid="badge-debated">
        <MessageCircle className="w-3 h-3" /> {t("resultsUi.agreementDebated", "Debated")}
      </span>
    );
  }
  return null;
}

const ANCHOR_ALLGEMEIN = "auswertung-allgemein";
const ANCHOR_RANKINGS = "auswertung-rankings";
const ANCHOR_CONSENSUS = "auswertung-consensus";

export default function TastingAnalysisSection({
  tastingId,
  isHost,
  currentParticipant,
}: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const pid = getParticipantId();

  const [expandedWhisky, setExpandedWhisky] = useState<string | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState<Record<string, boolean>>({});
  const [previousRatingsMap, setPreviousRatingsMap] = useState<Record<string, PreviousRating[]>>({});

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

  const { data: collectionCheck } = useQuery({
    queryKey: ["collection-check", pid],
    queryFn: (): Promise<CollectionCheck> => collectionApi.check(pid!),
    enabled: !!pid,
    staleTime: 30_000,
  });

  const addToCollectionMut = useMutation({
    mutationFn: (data: { name: string; distillery?: string; whiskybaseId?: string }) =>
      collectionApi.add(pid!, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["collection-check", pid] }),
  });

  const isInCollection = (
    name: string | null,
    distillery?: string | null,
    whiskybaseId?: string | null,
  ) => {
    if (!collectionCheck?.items) return false;
    if (whiskybaseId && collectionCheck.items[`wb:${whiskybaseId}`]) return true;
    const namePart = (name || "").trim().toLowerCase();
    const distPart = (distillery || "").trim().toLowerCase();
    const compositeKey = distPart ? `${namePart}|||${distPart}` : namePart;
    return !!(collectionCheck.items[compositeKey] || collectionCheck.items[namePart]);
  };

  const { data: tastingHistoryData } = useQuery<{ tastings: HistoryTasting[] }>({
    queryKey: ["tasting-history", currentParticipant?.id],
    queryFn: async () => {
      const myPid = currentParticipant!.id;
      const res = await fetch(`/api/participants/${myPid}/tasting-history`, {
        headers: { "x-participant-id": myPid },
      });
      if (!res.ok) return { tastings: [] };
      const resp = (await res.json()) as { tastings?: HistoryTasting[] } | HistoryTasting[];
      return Array.isArray(resp) ? { tastings: resp } : { tastings: resp.tastings ?? [] };
    },
    enabled: !!currentParticipant?.id && !!isRevealed && !!whiskiesData?.length,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!tastingHistoryData?.tastings?.length || !whiskiesData?.length || !tastingId) return;
    const fingerprint = (w: HistoryWhisky | WhiskyRow) => {
      if (w.whiskybaseId) return `wb:${w.whiskybaseId}`;
      return `fp:${(w.name || "").toLowerCase().trim()}|${(w.distillery || "").toLowerCase().trim()}`;
    };
    const currentFpToId: Record<string, string> = {};
    for (const w of whiskiesData) {
      const fp = fingerprint(w);
      if (fp !== "fp:|") currentFpToId[fp] = w.id;
    }
    const map: Record<string, PreviousRating[]> = {};
    for (const ht of tastingHistoryData.tastings) {
      if (ht.id === tastingId) continue;
      for (const w of ht.whiskies || []) {
        if (!w.myRating) continue;
        const fp = fingerprint(w);
        const currentId = currentFpToId[fp];
        if (!currentId) continue;
        if (!map[currentId]) map[currentId] = [];
        map[currentId].push({
          date: ht.date || "",
          tastingTitle: ht.title || "",
          nose: w.myRating.nose,
          taste: w.myRating.taste,
          finish: w.myRating.finish,
          overall: w.myRating.overall,
        });
      }
    }
    for (const wid of Object.keys(map)) {
      map[wid].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    setPreviousRatingsMap(map);
  }, [tastingHistoryData, whiskiesData, tastingId]);

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

      const avg = (dim: "nose" | "taste" | "finish" | "overall"): number | null => {
        const vals = ratings
          .map((r) => r[dim])
          .filter((v): v is number => v != null && v > 0);
        if (vals.length === 0) return null;
        return roundForScale(vals.reduce((a, b) => a + b, 0) / vals.length);
      };

      const minMax = (dim: "overall"): AggregatedRange => {
        const vals = ratings
          .map((r) => r[dim])
          .filter((v): v is number => v != null && v > 0);
        if (vals.length === 0) return { min: null, max: null, spread: null };
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        return { min, max, spread: max - min };
      };

      const stdDev = (dim: "overall"): number | null => {
        const vals = ratings
          .map((r) => r[dim])
          .filter((v): v is number => v != null && v > 0);
        if (vals.length < 2) return null;
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        const variance = vals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / vals.length;
        return Math.sqrt(variance);
      };

      const avgOverall = avg("overall");
      const avgNose = avg("nose");
      const avgTaste = avg("taste");
      const avgFinish = avg("finish");
      const overallRange = minMax("overall");
      const overallStdDev = stdDev("overall");

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
        avgNose,
        avgTaste,
        avgFinish,
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

    const withStdDev = sorted.filter((w) => w.overallStdDev != null && w.ratingCount >= 2);
    const consensusWhiskies = withStdDev.filter((w) => (w.overallStdDev ?? 0) <= 5);
    const debatedWhiskies = withStdDev.filter((w) => (w.overallStdDev ?? 0) > 10);

    return { groupAvg, userAvg, consensusWhiskies, debatedWhiskies };
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

    const spreadChampion = bestSpreadId
      ? { participantName: participantNames.get(bestSpreadId) || "", avgDeviation: bestSpreadAvg }
      : null;
    const biggestOutlierName =
      worstSpreadId && worstSpreadId !== bestSpreadId
        ? participantNames.get(worstSpreadId) || null
        : null;

    return { closestTwinName, biggestOutlierName, spreadChampion };
  }, [ratingsData, participantsData, sorted, currentParticipant?.id]);

  const groupInsights = useMemo(() => {
    if (!tastingId || sorted.length === 0) return [];
    return selectGroupInsights({
      tastingId,
      whiskies: sorted.map((w) => ({
        id: String(w.id),
        name: w.name || "",
        region: w.region || null,
        avgOverall: w.avgOverall,
        overallStdDev: w.overallStdDev,
        ratingCount: w.ratingCount,
        myRating: w.myRating ? { overall: w.myRating.overall ?? null } : null,
        myDelta: w.myDelta,
      })),
      myParticipantId: currentParticipant?.id || null,
      closestTwinName: participantStats.closestTwinName,
      biggestOutlierName: participantStats.biggestOutlierName,
      spreadChampion: participantStats.spreadChampion,
      t,
    });
  }, [tastingId, sorted, currentParticipant?.id, participantStats, t]);

  const excludedPidsForCount = new Set<string>(
    (participantsData || [])
      .filter((p) => p.excludedFromResults)
      .map((p) => p.participantId || p.id || ""),
  );
  const includedAllRatings = excludedPidsForCount.size > 0
    ? (ratingsData || []).filter((r) => !excludedPidsForCount.has(r.participantId))
    : (ratingsData || []);
  const includedParticipantsCount = (participantsData || []).filter((p) => !p.excludedFromResults).length;
  const uniqueRaters = new Set(includedAllRatings.map((r) => r.participantId)).size;
  const totalRatings = includedAllRatings.length;
  const participantCount = Math.max(
    includedParticipantsCount,
    uniqueRaters,
    totalRatings > 0 ? 1 : 0,
  );
  const maxScore = (tasting?.ratingScale as number) || 100;
  const topWhisky = sorted[0];

  const blindMode = !!tasting?.blindMode;

  const scrollToAnchor = (anchorId: string) => {
    const el = document.getElementById(anchorId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const subTiles: Array<{
    icon: typeof BarChart3;
    title: string;
    desc: string;
    anchor: string;
    testId: string;
  }> = [
    {
      icon: BarChart3,
      title: t("resultsUi.subsectionAllgemeinTitle", "Allgemeine Statistiken"),
      desc: t(
        "resultsUi.subsectionAllgemeinTileDesc",
        "Stats, Ø-Score & Top-Whisky",
      ),
      anchor: ANCHOR_ALLGEMEIN,
      testId: "auswertung-tile-allgemein",
    },
    {
      icon: Trophy,
      title: t("resultsUi.subsectionRankingsTitle", "Rankings"),
      desc: t(
        "resultsUi.subsectionRankingsTileDesc",
        "Whisky-Rangliste mit Detail-Bewertung",
      ),
      anchor: ANCHOR_RANKINGS,
      testId: "auswertung-tile-rankings",
    },
    {
      icon: Target,
      title: t("resultsUi.subsectionConsensusTitle", "Consensus"),
      desc: t(
        "resultsUi.subsectionConsensusTileDesc",
        "Wo die Gruppe einig war und wo nicht",
      ),
      anchor: ANCHOR_CONSENSUS,
      testId: "auswertung-tile-consensus",
    },
  ];

  const toggleExpand = (id: string) => setExpandedWhisky((prev) => (prev === id ? null : id));

  return (
    <section id="section-auswertung" className="mb-8 labs-fade-in" data-testid="detail-section-auswertung" style={{ scrollMarginTop: 80 }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--labs-text)",
              margin: 0,
              letterSpacing: "0.02em",
            }}
          >
            {t("resultsUi.sectionAuswertungTitle", "Auswertung")}
          </h2>
          <p
            style={{
              fontSize: 12,
              color: "var(--labs-text-muted)",
              margin: "2px 0 0",
              lineHeight: 1.4,
            }}
          >
            {t("resultsUi.sectionAuswertungSubtitle", "Statistiken & persönliche Erkenntnisse")}
          </p>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
        data-testid="auswertung-subtiles"
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

      {totalRatings === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "3rem 1.5rem",
            textAlign: "center",
            gap: "0.75rem",
            border: "1px solid var(--labs-border)",
            borderRadius: 12,
            background: "var(--labs-surface)",
          }}
          data-testid="detail-auswertung-empty"
        >
          <div
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: "italic",
              fontSize: 18,
              color: "var(--labs-text-muted)",
            }}
          >
            {t("results.noRatingsYet", "Noch keine Bewertungen")}
          </div>
          <div style={{ fontSize: 13, color: "var(--labs-text-muted)", opacity: 0.6 }}>
            {t("results.waitingForTasters", "Wir warten auf die Taster.")}
          </div>
        </div>
      ) : (
        <>
          <div
            id={ANCHOR_ALLGEMEIN}
            data-testid="detail-subsection-allgemein"
            style={{ scrollMarginTop: 80 }}
          >
            <div className="labs-section-label" style={{ marginBottom: 4 }}>
              {t("resultsUi.subsectionAllgemeinTitle", "Allgemeine Statistiken")}
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
                "resultsUi.subsectionAllgemeinSubtitle",
                "Gruppen-Bewertungen, Übereinstimmung und Ranking",
              )}
            </p>

            {sorted.length > 0 && (
              <div
                className="mb-4 labs-fade-in"
                data-testid="detail-results-stats-bar"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 8,
                }}
              >
                {[
                  {
                    icon: Wine,
                    value: whiskyResults.length,
                    label: t("resultsUi.statsBarLabelWhiskies", "Whiskys"),
                    testId: "detail-stat-whiskies",
                  },
                  {
                    icon: Star,
                    value: totalRatings,
                    label: t("resultsUi.statsBarLabelRatings", "Bewertungen"),
                    testId: "detail-stat-ratings",
                  },
                  {
                    icon: Users,
                    value: participantCount,
                    label: t("resultsUi.statsBarLabelTasters", "Taster"),
                    testId: "detail-stat-tasters",
                  },
                  {
                    icon: BarChart3,
                    value: summaryData.groupAvg ?? "\u2014",
                    label: t("resultsUi.statsBarLabelGroupAvg", "Ø Score"),
                    testId: "detail-stat-groupavg",
                  },
                ].map((s) => {
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
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          color: "var(--labs-text)",
                          fontVariantNumeric: "tabular-nums",
                          lineHeight: 1.1,
                        }}
                      >
                        {s.value}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: "var(--labs-text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {s.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div
              className="labs-card-elevated p-5 mb-6 labs-fade-in"
              data-testid="detail-results-summary-card"
            >
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                <span className="labs-section-label" style={{ marginBottom: 0 }}>
                  {t("resultsUi.sessionSummary", "Session Summary")}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <Wine
                    className="w-4 h-4 mx-auto mb-1"
                    style={{ color: "var(--labs-accent)" }}
                  />
                  <p className="text-lg font-bold" style={{ color: "var(--labs-text)" }}>
                    {whiskiesData?.length || 0}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
                    {t("resultsUi.statsBarLabelWhiskies", "Whiskys")}
                  </p>
                </div>
                <div className="text-center">
                  <Users
                    className="w-4 h-4 mx-auto mb-1"
                    style={{ color: "var(--labs-accent)" }}
                  />
                  <p className="text-lg font-bold" style={{ color: "var(--labs-text)" }}>
                    {participantCount}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
                    {t("resultsUi.statsBarLabelTasters", "Taster")}
                  </p>
                </div>
                <div className="text-center">
                  <BarChart3
                    className="w-4 h-4 mx-auto mb-1"
                    style={{ color: "var(--labs-accent)" }}
                  />
                  <p className="text-lg font-bold" style={{ color: "var(--labs-text)" }}>
                    {summaryData.groupAvg ?? "\u2014"}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
                    {t("resultsUi.summaryGroupAvg", "Gruppen-Ø")}
                  </p>
                </div>
                <div className="text-center">
                  <Star
                    className="w-4 h-4 mx-auto mb-1"
                    style={{ color: "var(--labs-accent)" }}
                  />
                  <p className="text-lg font-bold" style={{ color: "var(--labs-text)" }}>
                    {summaryData.userAvg ?? "\u2014"}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
                    {t("resultsUi.summaryYourAvg", "Dein Ø")}
                  </p>
                </div>
              </div>

              {groupInsights.length > 0 && (
                <div
                  className="pt-3"
                  style={{ borderTop: "1px solid var(--labs-border-subtle)" }}
                  data-testid="detail-results-insights"
                >
                  <InsightStrip
                    insights={groupInsights}
                    size="standard"
                    layout="scroll"
                    testId="detail-insight-strip-group"
                    title={t("insights.groupRecap.title", "Tasting insights")}
                    maxItems={5}
                  />
                </div>
              )}
            </div>

            {maxScore !== 100 && (
              <p
                className="text-xs flex items-center gap-1 mb-4 labs-fade-in"
                style={{ color: "var(--labs-text-muted)", opacity: 0.7 }}
                data-testid="detail-results-normalized-hint"
              >
                <Info className="w-3 h-3 flex-shrink-0" />
                {t("labs.scoresNormalizedHint", "Scores normalized to 100-point scale")}
              </p>
            )}

            {topWhisky && topWhisky.avgOverall != null && (
              <div
                className="labs-card-elevated p-5 mb-2 labs-fade-in"
                data-testid="detail-results-top-whisky"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
                  <span className="labs-section-label" style={{ marginBottom: 0 }}>
                    {t("resultsUi.topRated", "Top-Whisky")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="labs-h3" style={{ color: "var(--labs-text)" }}>
                      {topWhisky.name || t("resultsUi.unknown", "Unbekannt")}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--labs-text-muted)" }}>
                      {[
                        topWhisky.distillery,
                        topWhisky.age ? `${topWhisky.age}y` : null,
                        topWhisky.abv ? `${topWhisky.abv}%` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <LabsScoreRing
                    score={topWhisky.avgOverall}
                    maxScore={maxScore}
                    size={64}
                    strokeWidth={4}
                    color="var(--labs-accent)"
                    label={t("resultsUi.avgShort", "avg")}
                  />
                </div>
              </div>
            )}
          </div>

          <div
            id={ANCHOR_RANKINGS}
            data-testid="detail-subsection-rankings"
            style={{ scrollMarginTop: 80, marginTop: 24 }}
          >
            <div className="labs-section-label" style={{ marginBottom: 4 }}>
              {t("resultsUi.subsectionRankingsTitle", "Rankings")}
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
                "resultsUi.subsectionRankingsSubtitle",
                "Tippe auf einen Whisky für Detail-Werte",
              )}
            </p>

            <div className="space-y-2 mb-4 labs-fade-in">
              {sorted.map((w, idx) => {
                const isExpanded = expandedWhisky === w.id;
                const showImage = w.imageUrl && (!blindMode || isRevealed);
                return (
                  <div
                    key={w.id}
                    className="labs-card overflow-hidden"
                    data-testid={`detail-results-whisky-${w.id}`}
                  >
                    <button
                      type="button"
                      className="flex items-center gap-3 p-4 w-full text-left"
                      onClick={() => toggleExpand(w.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                      data-testid={`detail-results-whisky-toggle-${w.id}`}
                    >
                      {showImage ? (
                        <div style={{ position: "relative", width: 36, height: 36, flexShrink: 0 }}>
                          <WhiskyImage
                            imageUrl={w.imageUrl || undefined}
                            name={w.name || `#${idx + 1}`}
                            size={36}
                            whiskyId={w.id}
                            testId={`detail-results-whisky-image-${w.id}`}
                          />
                          <div
                            style={{
                              position: "absolute",
                              top: -6,
                              left: -6,
                              minWidth: 18,
                              height: 18,
                              padding: "0 4px",
                              borderRadius: 9,
                              background: idx < 3 ? "var(--labs-accent)" : "var(--labs-surface-elevated)",
                              color: idx < 3 ? "var(--labs-bg)" : "var(--labs-text-muted)",
                              fontSize: 10,
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "1px solid var(--labs-bg)",
                              lineHeight: 1,
                            }}
                          >
                            {idx + 1}
                          </div>
                        </div>
                      ) : (
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
                          style={{
                            background: idx < 3 ? "var(--labs-accent-muted)" : "var(--labs-surface-elevated)",
                            color: idx < 3 ? "var(--labs-accent)" : "var(--labs-text-muted)",
                          }}
                        >
                          {idx + 1}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className="text-sm font-medium truncate"
                            style={{ color: "var(--labs-text)" }}
                          >
                            {w.name || t("resultsUi.unknown", "Unbekannt")}
                          </p>
                          <AgreementBadge stdDev={w.overallStdDev} count={w.ratingCount} />
                          {previousRatingsMap[w.id]?.length > 0 && isRevealed && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[11px]"
                              style={{ color: "var(--labs-accent)", opacity: 0.8 }}
                              data-testid={`detail-badge-prev-${w.id}`}
                            >
                              <Clock className="w-3 h-3" />
                              {(() => {
                                const mostRecent = previousRatingsMap[w.id][0];
                                const d = w.myRating?.overall != null
                                  ? w.myRating.overall - mostRecent.overall
                                  : null;
                                if (d == null) return null;
                                const rd = fmt(d);
                                if (rd == null) return null;
                                const numeric = Number(rd);
                                return (
                                  <span
                                    className="font-semibold"
                                    style={{
                                      color:
                                        numeric > 0
                                          ? "var(--labs-success)"
                                          : numeric < 0
                                            ? "var(--labs-danger)"
                                            : "var(--labs-text-muted)",
                                    }}
                                  >
                                    {numeric > 0 ? `+${rd}` : numeric === 0 ? "=" : rd}
                                  </span>
                                );
                              })()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <p
                            className="text-xs truncate"
                            style={{ color: "var(--labs-text-muted)" }}
                          >
                            {[w.distillery, w.region].filter(Boolean).join(" · ") || "\u2014"}
                          </p>
                          {w.myDelta != null && <DeltaIndicator delta={w.myDelta} />}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {w.avgOverall != null ? (
                          <LabsScoreRing
                            score={w.avgOverall}
                            maxScore={maxScore}
                            size={40}
                            strokeWidth={3}
                          />
                        ) : (
                          <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                            &mdash;
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp
                            className="w-4 h-4"
                            style={{ color: "var(--labs-text-muted)" }}
                          />
                        ) : (
                          <ChevronDown
                            className="w-4 h-4"
                            style={{ color: "var(--labs-text-muted)" }}
                          />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div
                        className="px-4 pb-4 pt-1"
                        style={{ borderTop: "1px solid var(--labs-border-subtle)" }}
                        data-testid={`detail-results-whisky-detail-${w.id}`}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                          {[
                            {
                              label: t("resultsUi.overall", "Overall"),
                              value: w.avgOverall,
                              isOverall: true,
                            },
                            { label: t("resultsUi.nose", "Nose"), value: w.avgNose },
                            { label: t("resultsUi.taste", "Taste"), value: w.avgTaste },
                            { label: t("resultsUi.finish", "Finish"), value: w.avgFinish },
                          ].map((dim) => (
                            <div
                              key={dim.label}
                              className="flex items-center justify-between"
                              data-testid={
                                dim.isOverall ? `detail-text-overall-results-${w.id}` : undefined
                              }
                            >
                              <span
                                className="text-xs"
                                style={{
                                  color: "var(--labs-text-muted)",
                                  fontWeight: dim.isOverall ? 600 : undefined,
                                }}
                              >
                                {dim.label}
                              </span>
                              <span
                                className="text-sm font-semibold"
                                style={{
                                  color: dim.isOverall
                                    ? "var(--labs-accent)"
                                    : "var(--labs-text-secondary)",
                                }}
                              >
                                {dim.value != null ? fmt(dim.value) : "\u2014"}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div
                          className="flex items-center justify-between text-xs mb-2"
                          style={{ color: "var(--labs-text-muted)" }}
                        >
                          <span>
                            {w.ratingCount}{" "}
                            {w.ratingCount === 1
                              ? t("resultsUi.ratingSingular", "Bewertung")
                              : t("resultsUi.ratingPlural", "Bewertungen")}
                          </span>
                          {w.abv && <span>{w.abv}% ABV</span>}
                          {w.age && (
                            <span>
                              {w.age} {t("resultsUi.years", "Jahre")}
                            </span>
                          )}
                        </div>

                        {w.overallRange.min != null &&
                          w.overallRange.max != null &&
                          w.ratingCount >= 2 && (
                            <div
                              className="p-3 rounded-lg mb-3"
                              style={{ background: "var(--labs-surface-elevated)" }}
                              data-testid={`detail-results-variance-${w.id}`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span
                                  className="text-[11px] font-medium"
                                  style={{ color: "var(--labs-text-muted)" }}
                                >
                                  {t("resultsUi.scoreRange", "Score-Bereich")}
                                </span>
                                <span
                                  className="text-[11px]"
                                  style={{ color: "var(--labs-text-muted)" }}
                                >
                                  {t("resultsUi.spread", "Spread")}: {fmt(w.overallRange.spread)}
                                </span>
                              </div>
                              <div
                                className="relative h-2 rounded-full"
                                style={{ background: "var(--labs-border)" }}
                              >
                                <div
                                  className="absolute h-full rounded-full"
                                  style={{
                                    background: "var(--labs-accent)",
                                    opacity: 0.75,
                                    left: `${w.overallRange.min}%`,
                                    width: `${Math.max(w.overallRange.max - w.overallRange.min, 2)}%`,
                                  }}
                                />
                              </div>
                              <div className="flex items-center justify-between mt-1.5">
                                <span
                                  className="text-[11px] font-semibold"
                                  style={{ color: "var(--labs-text-secondary)" }}
                                >
                                  {fmt(w.overallRange.min)}
                                </span>
                                <span
                                  className="text-[11px] font-semibold"
                                  style={{ color: "var(--labs-text-secondary)" }}
                                >
                                  {fmt(w.overallRange.max)}
                                </span>
                              </div>
                            </div>
                          )}

                        {w.caskType && (
                          <span className="labs-badge labs-badge-accent">{w.caskType}</span>
                        )}

                        {pid && (
                          <div className="mt-2">
                            {isInCollection(w.name, w.distillery, w.whiskybaseId) ? (
                              <span
                                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg"
                                style={{
                                  background: "rgba(76, 175, 80, 0.12)",
                                  color: "#4CAF50",
                                }}
                                data-testid={`detail-badge-in-collection-${w.id}`}
                              >
                                <Check className="w-3 h-3" />
                                {t("myTastePage.addedToCollection", "In Sammlung")}
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors"
                                style={{
                                  background: "var(--labs-accent-muted)",
                                  color: "var(--labs-accent)",
                                  border: "none",
                                  cursor: "pointer",
                                  fontFamily: "inherit",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCollectionMut.mutate({
                                    name: w.name || "",
                                    distillery: w.distillery || undefined,
                                    whiskybaseId: w.whiskybaseId || undefined,
                                  });
                                }}
                                disabled={addToCollectionMut.isPending}
                                data-testid={`detail-button-add-collection-${w.id}`}
                              >
                                <Archive className="w-3 h-3" />
                                {addToCollectionMut.isPending
                                  ? "..."
                                  : t("myTastePage.addToCollection", "Zur Sammlung hinzufügen")}
                              </button>
                            )}
                          </div>
                        )}

                        {w.myRating && (
                          <div
                            className="mt-3 p-3 rounded-lg"
                            style={{
                              background: "var(--labs-accent-glow)",
                              border: "1px solid var(--labs-border-subtle)",
                            }}
                            data-testid={`detail-results-myrating-${w.id}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <Star
                                  className="w-3.5 h-3.5"
                                  style={{ color: "var(--labs-accent)" }}
                                />
                                <span
                                  className="text-xs font-medium"
                                  style={{ color: "var(--labs-accent)" }}
                                >
                                  {t("resultsUi.yourRating", "Deine Bewertung")}
                                </span>
                              </div>
                              {w.myDelta != null && (
                                <div className="flex items-center gap-1">
                                  <span
                                    className="text-[11px]"
                                    style={{ color: "var(--labs-text-muted)" }}
                                  >
                                    {t("resultsUi.vsGroup", "vs Gruppe")}:
                                  </span>
                                  <DeltaIndicator delta={w.myDelta} />
                                </div>
                              )}
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-center">
                              {[
                                { label: "N", value: w.myRating.nose },
                                { label: "T", value: w.myRating.taste },
                                { label: "F", value: w.myRating.finish },
                                { label: "\u00d8", value: w.myRating.overall },
                              ].map((d) => (
                                <div key={d.label}>
                                  <p
                                    className="text-[11px]"
                                    style={{ color: "var(--labs-text-muted)" }}
                                  >
                                    {d.label}
                                  </p>
                                  <p
                                    className="text-sm font-semibold"
                                    style={{ color: "var(--labs-text)" }}
                                  >
                                    {d.value != null ? fmt(d.value) : "\u2014"}
                                  </p>
                                </div>
                              ))}
                            </div>
                            {w.myRating.notes && (
                              <p
                                className="text-xs mt-2 italic"
                                style={{ color: "var(--labs-text-secondary)" }}
                              >
                                &ldquo;{w.myRating.notes}&rdquo;
                              </p>
                            )}
                          </div>
                        )}

                        {(() => {
                          const prevList = previousRatingsMap[w.id];
                          if (!prevList || prevList.length === 0) return null;
                          if (!isRevealed) return null;
                          const isHistExpanded = historyExpanded[w.id] || false;
                          const mostRecent = prevList[0];
                          const histDelta =
                            w.myRating?.overall != null
                              ? w.myRating.overall - mostRecent.overall
                              : null;
                          return (
                            <div className="mt-3" data-testid={`detail-results-history-${w.id}`}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setHistoryExpanded((prev) => ({
                                    ...prev,
                                    [w.id]: !isHistExpanded,
                                  }));
                                }}
                                style={{
                                  background:
                                    "color-mix(in srgb, var(--labs-accent) 6%, transparent)",
                                  border: "none",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  width: "100%",
                                  padding: "8px 12px",
                                  borderRadius: 8,
                                  fontFamily: "inherit",
                                }}
                                data-testid={`detail-button-toggle-history-${w.id}`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <Clock
                                    className="w-3.5 h-3.5"
                                    style={{ color: "var(--labs-accent)" }}
                                  />
                                  <span
                                    className="text-xs font-medium"
                                    style={{ color: "var(--labs-text)" }}
                                  >
                                    {t("resultsUi.previouslyRated", "Bereits bewertet")} (
                                    {prevList.length})
                                  </span>
                                  {histDelta != null && (
                                    <span
                                      className="text-[11px] font-semibold"
                                      style={{
                                        color:
                                          histDelta > 0
                                            ? "var(--labs-success)"
                                            : histDelta < 0
                                              ? "var(--labs-danger)"
                                              : "var(--labs-text-muted)",
                                      }}
                                    >
                                      {histDelta > 0
                                        ? `\u2191+${fmt(histDelta)}`
                                        : histDelta < 0
                                          ? `\u2193${fmt(Math.abs(histDelta))}`
                                          : "="}
                                    </span>
                                  )}
                                </div>
                                <ChevronDown
                                  className="w-3.5 h-3.5"
                                  style={{
                                    color: "var(--labs-text-muted)",
                                    transform: isHistExpanded ? "rotate(180deg)" : "none",
                                    transition: "transform 0.2s",
                                  }}
                                />
                              </button>
                              {isHistExpanded && (
                                <div className="mt-2 space-y-2">
                                  {prevList.map((pr, prevIdx) => (
                                    <div
                                      key={prevIdx}
                                      className="p-3 rounded-lg"
                                      style={{
                                        background: "var(--labs-surface-elevated)",
                                        border: "1px solid var(--labs-border-subtle)",
                                      }}
                                      data-testid={`detail-prev-result-${w.id}-${prevIdx}`}
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <span
                                          className="text-[11px]"
                                          style={{ color: "var(--labs-text-muted)" }}
                                        >
                                          {pr.tastingTitle ||
                                            new Date(pr.date).toLocaleDateString()}
                                        </span>
                                        <span
                                          className="text-sm font-bold"
                                          style={{ color: "var(--labs-accent)" }}
                                        >
                                          {fmt(pr.overall)}
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-3 gap-2 text-center">
                                        {[
                                          { label: "N", value: pr.nose },
                                          { label: "T", value: pr.taste },
                                          { label: "F", value: pr.finish },
                                        ].map((d) => (
                                          <div key={d.label}>
                                            <p
                                              className="text-[11px]"
                                              style={{ color: "var(--labs-text-muted)" }}
                                            >
                                              {d.label}
                                            </p>
                                            <p
                                              className="text-xs font-semibold"
                                              style={{ color: "var(--labs-text-secondary)" }}
                                            >
                                              {d.value != null ? fmt(d.value) : "\u2014"}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                      {pr.date && (
                                        <p
                                          className="text-[11px] mt-1"
                                          style={{ color: "var(--labs-text-muted)" }}
                                        >
                                          {new Date(pr.date).toLocaleDateString()}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div
            id={ANCHOR_CONSENSUS}
            data-testid="detail-subsection-consensus"
            style={{ scrollMarginTop: 80, marginTop: 24 }}
          >
            <div className="labs-section-label" style={{ marginBottom: 4 }}>
              {t("resultsUi.subsectionConsensusTitle", "Consensus")}
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
                "resultsUi.subsectionConsensusSubtitle",
                "Wo sich die Gruppe einig war und wo nicht",
              )}
            </p>

            {summaryData.consensusWhiskies.length === 0 &&
            summaryData.debatedWhiskies.length === 0 ? (
              <div
                className="labs-card p-4"
                data-testid="detail-results-consensus-empty"
                style={{
                  textAlign: "center",
                  color: "var(--labs-text-muted)",
                  fontSize: 12,
                }}
              >
                {t(
                  "resultsUi.consensusEmpty",
                  "Noch zu wenige Bewertungen, um Übereinstimmung zu zeigen",
                )}
              </div>
            ) : (
              <>
                {summaryData.consensusWhiskies.length > 0 && (
                  <div className="mb-6 labs-fade-in">
                    <div className="labs-section-label flex items-center gap-1.5">
                      <Target
                        className="w-3.5 h-3.5"
                        style={{ color: "var(--labs-success)" }}
                      />
                      {t("resultsUi.groupConsensusTitle", "Group Consensus")}
                    </div>
                    <div className="space-y-2">
                      {summaryData.consensusWhiskies.slice(0, 3).map((w) => (
                        <div
                          key={w.id}
                          className="labs-card p-3 flex items-center gap-3"
                          data-testid={`detail-results-consensus-${w.id}`}
                        >
                          {w.imageUrl && (!blindMode || isRevealed) && (
                            <WhiskyImage
                              imageUrl={w.imageUrl}
                              name={w.name || t("resultsUi.unknown", "Unbekannt")}
                              size={32}
                              whiskyId={w.id}
                              testId={`detail-results-consensus-image-${w.id}`}
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p
                              className="text-sm font-medium truncate"
                              style={{ color: "var(--labs-text)" }}
                            >
                              {w.name || t("resultsUi.unknown", "Unbekannt")}
                            </p>
                            <p
                              className="text-xs"
                              style={{ color: "var(--labs-text-muted)" }}
                            >
                              {t("resultsUi.avgShort", "avg")}: {fmt(w.avgOverall)} ·{" "}
                              {t("resultsUi.rangeShort", "Range")}: {fmt(w.overallRange.min)}
                              &ndash;{fmt(w.overallRange.max)}
                            </p>
                          </div>
                          <AgreementBadge stdDev={w.overallStdDev} count={w.ratingCount} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {summaryData.debatedWhiskies.length > 0 && (
                  <div className="mb-2 labs-fade-in">
                    <div className="labs-section-label flex items-center gap-1.5">
                      <MessageCircle
                        className="w-3.5 h-3.5"
                        style={{ color: "var(--labs-danger)" }}
                      />
                      {t("resultsUi.mostDebatedTitle", "Am meisten diskutiert")}
                    </div>
                    <div className="space-y-2">
                      {summaryData.debatedWhiskies.slice(0, 3).map((w) => (
                        <div
                          key={w.id}
                          className="labs-card p-3 flex items-center gap-3"
                          data-testid={`detail-results-debated-${w.id}`}
                        >
                          {w.imageUrl && (!blindMode || isRevealed) && (
                            <WhiskyImage
                              imageUrl={w.imageUrl}
                              name={w.name || t("resultsUi.unknown", "Unbekannt")}
                              size={32}
                              whiskyId={w.id}
                              testId={`detail-results-debated-image-${w.id}`}
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p
                              className="text-sm font-medium truncate"
                              style={{ color: "var(--labs-text)" }}
                            >
                              {w.name || t("resultsUi.unknown", "Unbekannt")}
                            </p>
                            <p
                              className="text-xs"
                              style={{ color: "var(--labs-text-muted)" }}
                            >
                              {t("resultsUi.avgShort", "avg")}: {fmt(w.avgOverall)} ·{" "}
                              {t("resultsUi.rangeShort", "Range")}: {fmt(w.overallRange.min)}
                              &ndash;{fmt(w.overallRange.max)}
                            </p>
                          </div>
                          <AgreementBadge stdDev={w.overallStdDev} count={w.ratingCount} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}

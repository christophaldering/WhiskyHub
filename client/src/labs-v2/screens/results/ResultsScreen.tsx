import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import type { ThemeTokens } from "../../tokens";
import { SP, FONT, RADIUS } from "../../tokens";
import type { Translations } from "../../i18n";
import type { V2Lang } from "../../i18n";

const PostTastingInsights = lazy(() => import("./PostTastingInsights"));
const TastingRecap = lazy(() => import("./TastingRecap"));
const ConnoisseurReport = lazy(() => import("./ConnoisseurReport"));
const SessionNarrative = lazy(() => import("./SessionNarrative"));
const PresentationMode = lazy(() => import("./PresentationMode"));

type ResultsTab = "insights" | "recap" | "report" | "story" | "present";

interface Props {
  th: ThemeTokens;
  t: Translations;
  lang: V2Lang;
  tastingId: string;
  participantId: string;
  isHost: boolean;
  onBack: () => void;
}

interface ResultsData {
  tastingId: string;
  title: string;
  status: string;
  whiskyCount: number;
  totalRatings: number;
  results: {
    whiskyId: string;
    name: string;
    distillery: string | null;
    region: string | null;
    avgOverall: number | null;
    avgNose: number | null;
    avgTaste: number | null;
    avgFinish: number | null;
    ratingCount: number;
    ratings: { participantId: string; overall: number; nose: number; taste: number; finish: number }[];
  }[];
}

interface RecapApiData {
  tasting: { id: string; title: string; date: string; location: string; status: string; hostId: string };
  hostName: string;
  participantCount: number;
  whiskyCount: number;
  topRated: { name: string; distillery: string; avgScore: number; imageUrl: string | null }[];
  mostDivisive: { name: string; stddev: number } | null;
  overallAverages: { nose: number; taste: number; finish: number; overall: number };
  participantHighlights: { name: string; ratingsCount: number; avgScore: number }[];
}

function LoadingFallback({ th }: { th: ThemeTokens }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: SP.xxxl }}>
      <div style={{ color: th.muted, fontSize: 14, fontFamily: FONT.body }}>...</div>
    </div>
  );
}

export default function ResultsScreen({ th, t, lang, tastingId, participantId, isHost, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<ResultsTab>("insights");
  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const [recapData, setRecapData] = useState<RecapApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const [resultsRes, recapRes] = await Promise.all([
          fetch(`/api/tastings/${tastingId}/results`, {
            headers: { "x-participant-id": participantId },
          }),
          fetch(`/api/tastings/${tastingId}/recap`),
        ]);

        if (resultsRes.ok) {
          const data = await resultsRes.json();
          setResultsData(data);
        }
        if (recapRes.ok) {
          const data = await recapRes.json();
          setRecapData(data);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error loading results");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tastingId, participantId]);

  const tabs: { id: ResultsTab; label: string; hostOnly?: boolean }[] = useMemo(() => {
    const base: { id: ResultsTab; label: string; hostOnly?: boolean }[] = [
      { id: "insights", label: t.resInsightsTab },
      { id: "recap", label: t.resRecapTab },
      { id: "report", label: t.resReportTabLabel },
    ];
    if (isHost) {
      base.push({ id: "story", label: t.resStoryTab, hostOnly: true });
      base.push({ id: "present", label: t.resPresentTab, hostOnly: true });
    }
    return base;
  }, [isHost, t]);

  const recapForComponent = useMemo(() => {
    if (!recapData) return null;
    return {
      tasting: {
        id: recapData.tasting.id,
        title: recapData.tasting.title,
        date: recapData.tasting.date,
        location: recapData.tasting.location,
        hostName: recapData.hostName,
      },
      participantCount: recapData.participantCount,
      whiskyCount: recapData.whiskyCount,
      topRated: recapData.topRated.map(w => ({
        name: w.name,
        distillery: w.distillery,
        avgScore: w.avgScore,
      })),
      mostDivisive: recapData.mostDivisive,
      overallAverages: recapData.overallAverages,
      participantHighlights: recapData.participantHighlights,
    };
  }, [recapData]);

  const presentationWhiskies = useMemo(() => {
    if (!resultsData) return [];
    const sorted = [...resultsData.results].sort((a, b) => (b.avgOverall ?? 0) - (a.avgOverall ?? 0));
    return sorted.map((w, i) => ({
      name: w.name,
      distillery: w.distillery ?? undefined,
      avgOverall: w.avgOverall,
      rank: i + 1,
      totalWhiskies: sorted.length,
    }));
  }, [resultsData]);

  if (loading) {
    return (
      <div data-testid="results-loading" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", fontFamily: FONT.body }}>
        <div style={{ color: th.muted, fontSize: 14 }}>{t.resLoading}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="results-error" style={{ textAlign: "center", padding: SP.xxxl, fontFamily: FONT.body }}>
        <p style={{ color: th.amber, fontSize: 14, marginBottom: SP.md }}>{error}</p>
        <button
          data-testid="button-results-retry"
          onClick={() => window.location.reload()}
          style={{
            padding: `${SP.sm}px ${SP.md}px`,
            borderRadius: RADIUS.md,
            border: `1px solid ${th.border}`,
            background: th.bgCard,
            color: th.text,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: FONT.body,
            cursor: "pointer",
          }}
        >
          {t.resRetry}
        </button>
      </div>
    );
  }

  return (
    <div data-testid="results-screen" style={{ fontFamily: FONT.body, minHeight: "100dvh", background: th.bg }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        padding: `${SP.md}px ${SP.md}px ${SP.sm}px`,
        gap: SP.sm,
      }}>
        <button
          data-testid="button-results-back"
          onClick={onBack}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: th.muted,
            fontSize: 14,
            fontFamily: FONT.body,
            padding: `${SP.xs}px ${SP.sm}px`,
          }}
        >
          {t.back}
        </button>
        <h1
          data-testid="text-results-title"
          style={{
            fontFamily: FONT.display,
            fontSize: 20,
            fontWeight: 700,
            color: th.text,
            margin: 0,
            flex: 1,
          }}
        >
          {t.resTitle}
        </h1>
      </div>

      <div style={{
        display: "flex",
        gap: SP.sm,
        padding: `0 ${SP.md}px ${SP.md}px`,
        overflowX: "auto",
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            data-testid={`button-results-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: `${SP.sm}px ${SP.md}px`,
              borderRadius: RADIUS.full,
              border: "none",
              cursor: "pointer",
              fontFamily: FONT.body,
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
              background: activeTab === tab.id ? th.gold : th.bgCard,
              color: activeTab === tab.id ? th.bg : th.muted,
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Suspense fallback={<LoadingFallback th={th} />}>
        {activeTab === "insights" && resultsData && (
          <PostTastingInsights
            th={th}
            t={t}
            results={resultsData.results}
            participantId={participantId}
          />
        )}

        {activeTab === "recap" && recapForComponent && (
          <TastingRecap
            th={th}
            t={t}
            recap={recapForComponent}
          />
        )}

        {activeTab === "report" && (
          <ConnoisseurReport
            th={th}
            t={t}
            participantId={participantId}
            lang={lang}
          />
        )}

        {activeTab === "story" && isHost && (
          <SessionNarrative
            th={th}
            t={t}
            tastingId={tastingId}
            participantId={participantId}
            isHost={isHost}
            lang={lang}
          />
        )}

        {activeTab === "present" && isHost && (
          <PresentationMode
            th={th}
            t={t}
            tastingId={tastingId}
            participantId={participantId}
            isHost={isHost}
            whiskies={presentationWhiskies}
          />
        )}
      </Suspense>
    </div>
  );
}

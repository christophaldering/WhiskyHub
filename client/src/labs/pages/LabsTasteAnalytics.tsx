import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import MeineWeltActionBar from "@/labs/components/MeineWeltActionBar";
import { useSession } from "@/lib/session";
import { statsApi, flavorProfileApi, journalApi, ratingNotesApi } from "@/lib/api";
import { ChevronLeft, Lock, TrendingUp, TrendingDown, Minus, PenLine, Sparkles, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import { useAppleTheme, SP, withAlpha } from "@/labs/hooks/useAppleTheme";

interface RatingNote {
  id: string;
  normalizedScore?: number | null;
  overall?: number | null;
  createdAt?: string | null;
  notes?: string | null;
}

interface JournalEntry {
  id: string;
  personalScore?: number | null;
  createdAt?: string | null;
}

interface ParticipantStats {
  totalRatings?: number;
  totalTastingWhiskies?: number;
  totalJournalEntries?: number;
}

interface ParticipantDetail {
  ratingStabilityScore?: number | null;
}

interface WhiskyProfileResponse {
  ratingStyle?: {
    meanScore: number;
    stdDev: number;
    scaleRange: { min: number; max: number };
    nRatings: number;
  } | null;
  confidence?: Record<string, { n: number }>;
}

const THRESHOLD = 10;

function TasteEvolutionCard({ pid }: { pid: string }) {
  const th = useAppleTheme();
  const { t } = useTranslation();
  const { data: journal } = useQuery({
    queryKey: ["labs-journal-evolution", pid],
    queryFn: () => journalApi.getAll(pid),
    enabled: !!pid,
    staleTime: 120000,
  });

  const { data: notes } = useQuery({
    queryKey: ["labs-rating-notes-evolution", pid],
    queryFn: () => ratingNotesApi.get(pid),
    enabled: !!pid,
    staleTime: 120000,
  });

  const dataPoints: { date: string; score: number }[] = [];
  if (Array.isArray(notes)) {
    for (const n of notes as RatingNote[]) {
      const rawScore = n.normalizedScore ?? n.overall;
      if (rawScore && n.createdAt) {
        const score = Math.max(0, Math.min(100, Number(rawScore)));
        dataPoints.push({ date: n.createdAt, score });
      }
    }
  }
  if (Array.isArray(journal)) {
    for (const j of journal as JournalEntry[]) {
      if (j.personalScore && j.createdAt) dataPoints.push({ date: j.createdAt, score: Number(j.personalScore) });
    }
  }
  dataPoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const grouped: { label: string; avg: number; count: number }[] = [];
  if (dataPoints.length > 0) {
    const monthMap = new Map<string, number[]>();
    for (const dp of dataPoints) {
      const d = new Date(dp.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthMap.has(key)) monthMap.set(key, []);
      monthMap.get(key)!.push(dp.score);
    }
    const months = t("labs.analytics.months", "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec").split(",");
    for (const key of Array.from(monthMap.keys()).sort()) {
      const scores = monthMap.get(key)!;
      const [y, m] = key.split("-");
      grouped.push({ label: `${months[parseInt(m) - 1]} ${y.slice(2)}`, avg: scores.reduce((a, b) => a + b, 0) / scores.length, count: scores.length });
    }
  }

  if (grouped.length < 2) {
    return (
      <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.lg }} data-testid="card-taste-evolution">
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: th.muted, marginBottom: SP.sm }}>{t("labs.analytics.evolution", "Taste Evolution")}</p>
        <p style={{ fontSize: 13, color: th.faint }}>
          {dataPoints.length === 0
            ? t("labs.analytics.evolutionEmpty", "Start rating whiskies to see how your taste evolves.")
            : t("labs.analytics.evolutionNeedMore", "Keep tasting — your evolution chart appears after 2+ months of data.")}
        </p>
      </div>
    );
  }

  const minScore = Math.max(0, Math.min(...grouped.map(g => g.avg)) - 10);
  const maxScore = Math.min(100, Math.max(...grouped.map(g => g.avg)) + 10);
  const range = maxScore - minScore || 1;
  const chartW = 280, chartH = 120, padL = 0, padR = 10, padT = 10, padB = 24;
  const plotW = chartW - padL - padR, plotH = chartH - padT - padB;

  const linePoints = grouped.map((g, i) => ({
    x: padL + (i / (grouped.length - 1)) * plotW,
    y: padT + plotH - ((g.avg - minScore) / range) * plotH,
    ...g,
  }));
  const pathD = linePoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const delta = grouped[grouped.length - 1].avg - grouped[0].avg;
  const TrendIcon = delta > 0.5 ? TrendingUp : delta < -0.5 ? TrendingDown : Minus;
  const trendColor = delta > 0.5 ? th.green : delta < -0.5 ? "#e06060" : th.muted;

  return (
    <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.lg }} data-testid="card-taste-evolution">
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: th.muted, marginBottom: SP.xs }}>{t("labs.analytics.evolution", "Taste Evolution")}</p>
      <p style={{ fontSize: 13, color: th.faint, marginBottom: SP.md }}>{t("labs.analytics.evolutionDesc", "How your average rating has developed over time")}</p>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} style={{ maxWidth: "100%" }}>
          <path d={pathD} fill="none" stroke={th.gold} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          {linePoints.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={3} fill={th.gold} />
              <text x={p.x} y={chartH - 4} textAnchor="middle" fill={th.faint} fontSize={8} fontFamily="sans-serif">{p.label}</text>
            </g>
          ))}
        </svg>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: SP.sm }}>
        <span style={{ fontSize: 11, color: th.faint }}>{grouped[0].label}: {t("labs.analytics.avg", "avg")} {Math.round(grouped[0].avg)}/100</span>
        <span style={{ fontSize: 11, color: th.faint }}>{grouped[grouped.length - 1].label}: {t("labs.analytics.avg", "avg")} {Math.round(grouped[grouped.length - 1].avg)}/100</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: SP.md, fontSize: 12, color: trendColor }}>
        <TrendIcon style={{ width: 14, height: 14 }} />
        <span>
          {delta > 0.5
            ? t("labs.analytics.risen", "Your average has risen by {{pts}} pts", { pts: Math.round(delta) })
            : delta < -0.5
              ? t("labs.analytics.dropped", "Your average has shifted down by {{pts}} pts", { pts: Math.round(Math.abs(delta)) })
              : t("labs.analytics.consistent", "Your average has stayed consistent")}
        </span>
      </div>
    </div>
  );
}

function RatingConsistencyCard({ pid }: { pid: string }) {
  const th = useAppleTheme();
  const { t } = useTranslation();
  const { data: profile } = useQuery({
    queryKey: ["labs-whisky-profile-analytics", pid],
    queryFn: () => flavorProfileApi.getWhiskyProfile(pid, "all_incl_imported"),
    enabled: !!pid,
    staleTime: 120000,
  });

  const { data: statsData } = useQuery({
    queryKey: ["labs-participant-stats-analytics", pid],
    queryFn: () => statsApi.get(pid!),
    enabled: !!pid,
  });

  const typedStats = statsData as { ratingStabilityScore?: number | null } | undefined;
  const typedProfile = profile as WhiskyProfileResponse | undefined;
  const stability = typedStats?.ratingStabilityScore ?? null;
  const ratingStyle = typedProfile?.ratingStyle;
  const stdDev = ratingStyle?.stdDev ?? null;
  const mean = ratingStyle?.meanScore ?? null;
  const min = ratingStyle?.scaleRange?.min ?? null;
  const max = ratingStyle?.scaleRange?.max ?? null;
  const n = ratingStyle?.nRatings ?? typedProfile?.confidence?.overall?.n ?? null;
  const hasData = stability != null || stdDev != null;

  let consistencyLabel = "—";
  let consistencyColor = th.muted;
  if (stability != null) {
    if (stability >= 8) { consistencyLabel = t("labs.analytics.veryConsistent", "Very Consistent"); consistencyColor = th.green; }
    else if (stability >= 6) { consistencyLabel = t("labs.analytics.consistentLabel", "Consistent"); consistencyColor = th.gold; }
    else if (stability >= 4) { consistencyLabel = t("labs.analytics.variable", "Variable"); consistencyColor = th.gold; }
    else { consistencyLabel = t("labs.analytics.highlyVariable", "Highly Variable"); consistencyColor = "#e06060"; }
  }

  return (
    <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.lg }} data-testid="card-rating-consistency">
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: th.muted, marginBottom: SP.xs }}>{t("labs.analytics.consistency", "Rating Consistency")}</p>
      <p style={{ fontSize: 13, color: th.faint, marginBottom: SP.md }}>{t("labs.analytics.consistencyDesc", "How stable and predictable your scoring pattern is")}</p>
      {!hasData ? (
        <p style={{ fontSize: 13, color: th.faint }}>{t("labs.analytics.consistencyEmpty", "Rate more whiskies to see your consistency score.")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {stability != null && (
            <div style={{ display: "flex", alignItems: "center", gap: SP.md }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%", border: `3px solid ${consistencyColor}`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <span style={{ fontFamily: "Playfair Display, serif", fontSize: 17, fontWeight: 700, color: consistencyColor }}>{stability.toFixed(1)}</span>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: consistencyColor }}>{consistencyLabel}</div>
                <div style={{ fontSize: 13, marginTop: 2, color: th.faint }}>
                  {t("labs.analytics.patternIs", "Your scoring pattern is {{label}}", { label: consistencyLabel.toLowerCase() })}
                </div>
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP.sm }}>
            {mean != null && <StatMini value={mean.toFixed(1)} label={t("labs.analytics.avgScore", "Avg Score")} />}
            {stdDev != null && <StatMini value={stdDev.toFixed(1)} label={t("labs.analytics.spread", "Spread (StdDev)")} />}
            {min != null && max != null && <StatMini value={`${min.toFixed(0)}–${max.toFixed(0)}`} label={t("labs.analytics.range", "Range")} />}
            {n != null && <StatMini value={String(n)} label={t("labs.analytics.ratings", "Ratings")} />}
          </div>
          {stdDev != null && (
            <p style={{ fontSize: 13, color: th.faint, lineHeight: 1.5 }}>
              {stdDev < 8
                ? t("labs.analytics.spreadLow", "You tend to rate quite consistently — your scores stay close together.")
                : stdDev < 15
                  ? t("labs.analytics.spreadMedium", "You have a healthy spread in your ratings, showing nuanced preferences.")
                  : t("labs.analytics.spreadHigh", "Your ratings vary a lot — you clearly distinguish between whiskies you love and those you don't.")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function AIInsightCard({ pid }: { pid: string }) {
  const th = useAppleTheme();
  const { t } = useTranslation();
  const { data: insightData, isLoading } = useQuery({
    queryKey: ["labs-participant-insights", pid],
    queryFn: () => fetch(`/api/participants/${pid}/insights`, { headers: { "x-participant-id": pid } }).then(r => r.ok ? r.json() : null),
    enabled: !!pid,
    staleTime: 300000,
  });

  const insight = insightData?.insight;
  if (isLoading) return null;
  if (!insight) return null;

  return (
    <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.lg }} data-testid="card-ai-insight">
      <div style={{ display: "flex", alignItems: "center", gap: SP.sm, marginBottom: SP.md }}>
        <Sparkles style={{ width: 16, height: 16, color: th.gold }} />
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: th.muted, margin: 0 }}>{t("labs.analytics.aiInsight", "AI Insight")}</p>
      </div>
      <p style={{ fontSize: 14, color: th.text, lineHeight: 1.7 }} data-testid="text-ai-insight-message">
        {insight.message}
      </p>
      {insight.type && (
        <span style={{
          fontSize: 11, display: "inline-block", marginTop: SP.md,
          padding: "3px 10px", borderRadius: 8,
          background: withAlpha(th.gold, 0.09), color: th.gold, fontWeight: 600,
        }}>
          {insight.type}
        </span>
      )}
    </div>
  );
}

function StatMini({ value, label }: { value: string; label: string }) {
  const th = useAppleTheme();
  return (
    <div style={{ background: th.inputBg, borderRadius: 12, padding: "8px 10px", textAlign: "center" }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: th.gold }}>{value}</div>
      <div style={{ fontSize: 11, color: th.faint }}>{label}</div>
    </div>
  );
}

function UnlockBanner() {
  const th = useAppleTheme();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(true);
  useEffect(() => { const t = setTimeout(() => setVisible(false), 6000); return () => clearTimeout(t); }, []);
  if (!visible) return null;
  return (
    <div data-testid="banner-unlocked" style={{
      background: withAlpha(th.gold, 0.08),
      border: `1px solid ${th.gold}`, borderRadius: 20, padding: `${SP.md}px ${SP.lg}px`, textAlign: "center",
    }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: th.gold }}>{t("labs.analytics.unlocked", "Your Analytics are ready.")}</span>
    </div>
  );
}

export default function LabsTasteAnalytics() {
  const th = useAppleTheme();
  const session = useSession();
  const pid = session.pid;
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["labs-participant-stats-threshold", pid],
    queryFn: () => statsApi.get(pid!),
    enabled: !!pid,
    staleTime: 60000,
  });

  const { data: scaleInfo } = useQuery<{ hasMultipleScales?: boolean }>({
    queryKey: ["labs-whisky-profile-scale-info", pid],
    queryFn: () => flavorProfileApi.getWhiskyProfile(pid, "all_incl_imported"),
    enabled: !!pid,
    staleTime: 120000,
  });

  const typedStats = stats as ParticipantStats | undefined;
  const totalRatings = (typedStats?.totalTastingWhiskies ?? 0) + (typedStats?.totalJournalEntries ?? 0);
  const isUnlocked = totalRatings >= THRESHOLD;
  const justUnlocked = isUnlocked && totalRatings < THRESHOLD + 3;
  const pct = Math.min((totalRatings / THRESHOLD) * 100, 100);

  return (
    <div className="labs-page" data-testid="labs-taste-analytics">
      <MeineWeltActionBar active="analytics" />

      <h1 className="labs-h2" style={{ color: th.text, marginBottom: SP.xs }} data-testid="text-analytics-title">
        {t("labs.analytics.title", "Analytics")}
      </h1>
      <p style={{ fontSize: 14, color: th.muted, marginBottom: SP.md }}>
        {t("labs.analytics.subtitle", "Your taste evolution & rating consistency")}
      </p>
      {scaleInfo?.hasMultipleScales && (
        <p style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 4, marginBottom: SP.lg, color: th.faint }} data-testid="analytics-normalized-hint">
          <Info style={{ width: 12, height: 12, flexShrink: 0 }} />
          {t("labs.scoresNormalizedMultiScale", "Contains ratings from different scales, normalized to 100 points")}
        </p>
      )}

      {!session.signedIn || !pid ? (
        <AuthGateMessage
          title={t("authGate.analytics.title")}
          bullets={[t("authGate.analytics.bullet1"), t("authGate.analytics.bullet2"), t("authGate.analytics.bullet3")]}
          className="labs-card p-6 text-center labs-fade-in"
          compact
        />
      ) : isLoading ? (
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.xl, textAlign: "center" }}>
          <div className="labs-spinner" style={{ margin: "0 auto" }} />
        </div>
      ) : !isUnlocked ? (
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.lg, textAlign: "center" }} data-testid="card-analytics-locked">
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            background: withAlpha(th.gold, 0.09),
            display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: SP.md,
          }}>
            <Lock style={{ width: 22, height: 22, color: th.gold }} />
          </div>
          <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 16, fontWeight: 600, color: th.text, marginBottom: SP.sm }}>
            {t("labs.analytics.lockedTitle", "Your Analytics unlock after {{n}} whiskies", { n: THRESHOLD })}
          </h3>
          <p style={{ fontSize: 14, color: th.muted, marginBottom: SP.lg }}>{t("labs.analytics.lockedDesc", "Build your tasting history to unlock deeper insights.")}</p>
          <div style={{ maxWidth: 220, margin: `0 auto ${SP.sm}px` }}>
            <div style={{ height: 6, background: th.border, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${th.amber}, ${th.gold})`, borderRadius: 3, transition: "width 0.5s ease" }} />
            </div>
            <div style={{ fontSize: 13, marginTop: 6, fontWeight: 600, color: th.gold }} data-testid="text-progress">
              {totalRatings} / {THRESHOLD} {t("labs.analytics.whiskiesLogged", "whiskies logged")}
            </div>
          </div>
          <button
            onClick={() => navigate("/labs/solo")}
            className="labs-btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, marginTop: SP.md }}
            data-testid="button-log-whisky"
          >
            <PenLine style={{ width: 14, height: 14 }} />
            {t("labs.analytics.logAnother", "Log another whisky")}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: SP.md }}>
          {justUnlocked && <UnlockBanner />}
          <TasteEvolutionCard pid={pid} />
          <RatingConsistencyCard pid={pid} />
          <AIInsightCard pid={pid} />
        </div>
      )}
    </div>
  );
}

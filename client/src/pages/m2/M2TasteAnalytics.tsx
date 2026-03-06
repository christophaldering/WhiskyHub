import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { M2Loading, M2Error } from "@/components/m2/M2Feedback";
import { getSession } from "@/lib/session";
import { useQuery } from "@tanstack/react-query";
import { statsApi, flavorProfileApi, journalApi, ratingNotesApi, participantApi } from "@/lib/api";
import { Lock, PenLine, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useLocation } from "wouter";

const THRESHOLD = 10;

function TasteEvolutionCard({ pid }: { pid: string }) {
  const { t } = useTranslation();

  const { data: journal } = useQuery({
    queryKey: ["m2-journal-evolution", pid],
    queryFn: () => journalApi.getAll(pid),
    enabled: !!pid,
    staleTime: 120000,
  });

  const { data: notes } = useQuery({
    queryKey: ["m2-rating-notes-evolution", pid],
    queryFn: () => ratingNotesApi.get(pid),
    enabled: !!pid,
    staleTime: 120000,
  });

  const dataPoints: { date: string; score: number }[] = [];

  if (Array.isArray(notes)) {
    for (const n of notes) {
      if (n.overall && n.createdAt) {
        dataPoints.push({ date: n.createdAt, score: Number(n.overall) });
      }
    }
  }

  if (Array.isArray(journal)) {
    for (const j of journal) {
      if (j.personalScore && j.createdAt) {
        dataPoints.push({ date: j.createdAt, score: Number(j.personalScore) });
      }
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
    const sortedKeys = [...monthMap.keys()].sort();
    for (const key of sortedKeys) {
      const scores = monthMap.get(key)!;
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const [y, m] = key.split("-");
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      grouped.push({ label: `${monthNames[parseInt(m) - 1]} ${y.slice(2)}`, avg, count: scores.length });
    }
  }

  if (grouped.length < 2) {
    return (
      <div style={cardStyle} data-testid="card-taste-evolution">
        <h2 style={sectionTitle}>
          {t("m2.analytics.evolution", "Taste Evolution")}
        </h2>
        <p style={{ fontSize: 13, color: v.muted, margin: 0 }}>
          {dataPoints.length === 0
            ? t("m2.analytics.evolutionEmpty", "Start rating whiskies to see how your taste evolves.")
            : t("m2.analytics.evolutionNeedMore", "Keep tasting — your evolution chart appears after 2+ months of data.")}
        </p>
      </div>
    );
  }

  const minScore = Math.max(0, Math.min(...grouped.map(g => g.avg)) - 10);
  const maxScore = Math.min(100, Math.max(...grouped.map(g => g.avg)) + 10);
  const range = maxScore - minScore || 1;

  const chartW = 280, chartH = 120, padL = 0, padR = 10, padT = 10, padB = 24;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const linePoints = grouped.map((g, i) => {
    const x = padL + (i / (grouped.length - 1)) * plotW;
    const y = padT + plotH - ((g.avg - minScore) / range) * plotH;
    return { x, y, ...g };
  });

  const pathD = linePoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  const delta = grouped[grouped.length - 1].avg - grouped[0].avg;
  const TrendIcon = delta > 0.5 ? TrendingUp : delta < -0.5 ? TrendingDown : Minus;
  const trendColor = delta > 0.5 ? v.success : delta < -0.5 ? v.danger : v.muted;

  return (
    <div style={cardStyle} data-testid="card-taste-evolution">
      <h2 style={sectionTitle}>
        {t("m2.analytics.evolution", "Taste Evolution")}
      </h2>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} style={{ maxWidth: "100%" }}>
          <path d={pathD} fill="none" stroke={v.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          {linePoints.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={3} fill={v.accent} />
              <text x={p.x} y={chartH - 4} textAnchor="middle" fill={v.muted} fontSize={9} fontFamily="sans-serif">
                {p.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <span style={{ fontSize: 11, color: v.muted }}>
          {grouped[0].label}: {t("m2.analytics.avg", "avg")} {grouped[0].avg.toFixed(1)}
        </span>
        <span style={{ fontSize: 11, color: v.muted }}>
          {grouped[grouped.length - 1].label}: {t("m2.analytics.avg", "avg")} {grouped[grouped.length - 1].avg.toFixed(1)}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10, fontSize: 13, color: trendColor }}>
        <TrendIcon style={{ width: 16, height: 16 }} />
        <span>
          {delta > 0.5
            ? t("m2.analytics.risen", "Your average has risen by {{pts}} pts", { pts: delta.toFixed(1) })
            : delta < -0.5
            ? t("m2.analytics.dropped", "Your average has shifted down by {{pts}} pts", { pts: Math.abs(delta).toFixed(1) })
            : t("m2.analytics.consistent", "Your average has stayed consistent")}
        </span>
      </div>
    </div>
  );
}

function RatingConsistencyCard({ pid }: { pid: string }) {
  const { t } = useTranslation();

  const { data: profile } = useQuery({
    queryKey: ["m2-whisky-profile-analytics", pid],
    queryFn: () => flavorProfileApi.getWhiskyProfile(pid, "all_incl_imported"),
    enabled: !!pid,
    staleTime: 120000,
  });

  const { data: participant } = useQuery({
    queryKey: ["m2-participant-detail-analytics", pid],
    queryFn: () => participantApi.get(pid),
    enabled: !!pid,
  });

  const stability = participant?.ratingStabilityScore ?? null;
  const ratingStyle = profile?.ratingStyle;
  const stdDev = ratingStyle?.stdDev ?? null;
  const mean = ratingStyle?.mean ?? null;
  const min = ratingStyle?.min ?? null;
  const max = ratingStyle?.max ?? null;
  const n = ratingStyle?.n ?? profile?.confidence?.overall?.n ?? null;

  const hasData = stability != null || stdDev != null;

  let consistencyLabel = "—";
  let consistencyColor = v.muted;
  if (stability != null) {
    if (stability >= 8) { consistencyLabel = t("m2.analytics.veryConsistent", "Very Consistent"); consistencyColor = v.success; }
    else if (stability >= 6) { consistencyLabel = t("m2.analytics.consistent", "Consistent"); consistencyColor = v.accent; }
    else if (stability >= 4) { consistencyLabel = t("m2.analytics.variable", "Variable"); consistencyColor = v.medium; }
    else { consistencyLabel = t("m2.analytics.highlyVariable", "Highly Variable"); consistencyColor = v.danger; }
  }

  return (
    <div style={cardStyle} data-testid="card-rating-consistency">
      <h2 style={sectionTitle}>
        {t("m2.analytics.consistency", "Rating Consistency")}
      </h2>

      {!hasData ? (
        <p style={{ fontSize: 13, color: v.muted, margin: 0 }}>
          {t("m2.analytics.consistencyEmpty", "Rate more whiskies to see your consistency score.")}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {stability != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                border: `3px solid ${consistencyColor}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: consistencyColor, fontFamily: "'Playfair Display', serif" }}>
                  {stability.toFixed(1)}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: consistencyColor }}>{consistencyLabel}</div>
                <div style={{ fontSize: 12, color: v.muted, marginTop: 2 }}>
                  {t("m2.analytics.patternIs", "Your scoring pattern is {{label}}", { label: consistencyLabel.toLowerCase() })}
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {mean != null && (
              <StatBox value={mean.toFixed(1)} label={t("m2.analytics.avgScore", "Avg Score")} />
            )}
            {stdDev != null && (
              <StatBox value={stdDev.toFixed(1)} label={t("m2.analytics.spread", "Spread (StdDev)")} />
            )}
            {min != null && max != null && (
              <StatBox value={`${min.toFixed(0)}–${max.toFixed(0)}`} label={t("m2.analytics.range", "Range")} />
            )}
            {n != null && (
              <StatBox value={String(n)} label={t("m2.analytics.ratings", "Ratings")} />
            )}
          </div>

          {stdDev != null && (
            <div style={{ fontSize: 12, color: v.muted, lineHeight: 1.5 }}>
              {stdDev < 8
                ? t("m2.analytics.spreadLow", "You tend to rate quite consistently — your scores stay close together.")
                : stdDev < 15
                ? t("m2.analytics.spreadMedium", "You have a healthy spread in your ratings, showing nuanced preferences.")
                : t("m2.analytics.spreadHigh", "Your ratings vary a lot — you clearly distinguish between whiskies you love and those you don't.")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ background: v.bg, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: v.accent }}>{value}</div>
      <div style={{ fontSize: 10, color: v.muted }}>{label}</div>
    </div>
  );
}

function LockedState({ count }: { count: number }) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const pct = Math.min((count / THRESHOLD) * 100, 100);

  return (
    <div style={cardStyle} data-testid="card-analytics-locked">
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: `color-mix(in srgb, ${v.accent} 10%, transparent)`,
          display: "inline-flex",
          alignItems: "center", justifyContent: "center", marginBottom: 16,
        }}>
          <Lock style={{ width: 22, height: 22, color: v.accentDim }} />
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 600, color: v.text, margin: "0 0 8px" }}>
          {t("m2.analytics.lockedTitle", "Your Analytics unlock after {{n}} whiskies", { n: THRESHOLD })}
        </h3>

        <p style={{ fontSize: 14, color: v.muted, margin: "0 0 20px" }}>
          {t("m2.analytics.lockedDesc", "Build your tasting history to unlock deeper insights.")}
        </p>

        <div style={{ maxWidth: 220, margin: "0 auto 8px" }}>
          <div style={{ height: 8, background: v.bg, borderRadius: 4, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${pct}%`,
              background: `linear-gradient(90deg, ${v.accentDim}, ${v.accent})`,
              borderRadius: 4, transition: "width 0.5s ease",
            }} />
          </div>
          <div style={{ fontSize: 13, color: v.accent, fontWeight: 600, marginTop: 6 }} data-testid="text-progress">
            {count} / {THRESHOLD} {t("m2.analytics.whiskiesLogged", "whiskies logged")}
          </div>
        </div>

        <button
          onClick={() => navigate("/m2/tastings/solo")}
          data-testid="button-log-whisky"
          style={{
            marginTop: 20, display: "inline-flex", alignItems: "center", gap: 6,
            background: v.accent, color: v.bg, border: "none", borderRadius: 8,
            padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}
        >
          <PenLine style={{ width: 14, height: 14 }} />
          {t("m2.analytics.logAnother", "Log another whisky")}
        </button>
      </div>
    </div>
  );
}

function UnlockBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return (
    <div
      data-testid="banner-unlocked"
      style={{
        background: `linear-gradient(135deg, color-mix(in srgb, ${v.accent} 15%, transparent), color-mix(in srgb, ${v.accent} 6%, transparent))`,
        border: `1px solid color-mix(in srgb, ${v.accent} 25%, transparent)`,
        borderRadius: 10, padding: "12px 16px",
        textAlign: "center", animation: "fadeIn 0.4s ease",
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600, color: v.accent }}>
        {t("m2.analytics.unlocked", "Your Analytics are ready.")}
      </span>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: v.elevated,
  borderRadius: 14,
  padding: "20px 16px",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 1.2,
  color: v.muted,
  margin: "0 0 14px",
};

export default function M2TasteAnalytics() {
  const { t } = useTranslation();
  const session = getSession();
  const pid = session.pid;

  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useQuery({
    queryKey: ["m2-participant-stats-threshold", pid],
    queryFn: () => statsApi.get(pid!),
    enabled: !!pid,
    staleTime: 60000,
  });

  const totalRatings = (stats?.totalRatings ?? 0) + (stats?.totalJournalEntries ?? 0);
  const isUnlocked = totalRatings >= THRESHOLD;
  const justUnlocked = isUnlocked && totalRatings < THRESHOLD + 3;

  return (
    <div style={{ padding: "16px" }} data-testid="m2-taste-analytics">
      <M2BackButton />
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0 16px" }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 700, color: v.text, margin: 0 }}>
            {t("m2.taste.analytics", "Analytics")}
          </h1>
          <p style={{ fontSize: 12, color: v.muted, marginTop: 2, margin: 0 }}>
            {t("m2.analytics.subtitle", "Your taste evolution & rating consistency")}
          </p>
        </div>
      </div>

      {statsLoading && pid && <M2Loading />}
      {statsError && pid && <M2Error onRetry={refetchStats} />}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {!session.signedIn || !pid ? (
          <div style={{ background: v.elevated, borderRadius: 12, padding: "24px 16px", textAlign: "center", color: v.textSecondary, fontSize: 14 }}>
            {t("m2.taste.signInPrompt", "Sign in to access your taste profile")}
          </div>
        ) : !isUnlocked ? (
          <LockedState count={totalRatings} />
        ) : (
          <>
            {justUnlocked && <UnlockBanner />}
            <TasteEvolutionCard pid={pid} />
            <RatingConsistencyCard pid={pid} />
          </>
        )}
      </div>
    </div>
  );
}

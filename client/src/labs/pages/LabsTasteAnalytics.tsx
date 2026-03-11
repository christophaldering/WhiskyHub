import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useSession } from "@/lib/session";
import { statsApi, flavorProfileApi, journalApi, ratingNotesApi, participantApi } from "@/lib/api";
import { ChevronLeft, Lock, TrendingUp, TrendingDown, Minus, PenLine } from "lucide-react";

const THRESHOLD = 10;

function TasteEvolutionCard({ pid }: { pid: string }) {
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
    for (const n of notes) {
      const score = (n as any).normalizedScore ?? (n as any).overall;
      if (score && (n as any).createdAt) dataPoints.push({ date: (n as any).createdAt, score: Number(score) });
    }
  }
  if (Array.isArray(journal)) {
    for (const j of journal as any[]) {
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
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (const key of Array.from(monthMap.keys()).sort()) {
      const scores = monthMap.get(key)!;
      const [y, m] = key.split("-");
      grouped.push({ label: `${months[parseInt(m) - 1]} ${y.slice(2)}`, avg: scores.reduce((a, b) => a + b, 0) / scores.length, count: scores.length });
    }
  }

  if (grouped.length < 2) {
    return (
      <div className="labs-card p-5" data-testid="card-taste-evolution">
        <p className="labs-section-label mb-2">Taste Evolution</p>
        <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
          {dataPoints.length === 0
            ? "Start rating whiskies to see how your taste evolves."
            : "Keep tasting — your evolution chart appears after 2+ months of data."}
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
  const trendColor = delta > 0.5 ? "var(--labs-success)" : delta < -0.5 ? "var(--labs-danger)" : "var(--labs-text-muted)";

  return (
    <div className="labs-card p-5" data-testid="card-taste-evolution">
      <p className="labs-section-label mb-1">Taste Evolution</p>
      <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)" }}>How your average rating has developed over time</p>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} style={{ maxWidth: "100%" }}>
          <path d={pathD} fill="none" stroke="var(--labs-accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          {linePoints.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={3} fill="var(--labs-accent)" />
              <text x={p.x} y={chartH - 4} textAnchor="middle" fill="var(--labs-text-muted)" fontSize={8} fontFamily="sans-serif">{p.label}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-[10px]" style={{ color: "var(--labs-text-muted)" }}>{grouped[0].label}: avg {Math.round(grouped[0].avg)}/100</span>
        <span className="text-[10px]" style={{ color: "var(--labs-text-muted)" }}>{grouped[grouped.length - 1].label}: avg {Math.round(grouped[grouped.length - 1].avg)}/100</span>
      </div>
      <div className="flex items-center justify-center gap-1.5 mt-3" style={{ fontSize: 12, color: trendColor }}>
        <TrendIcon style={{ width: 14, height: 14 }} />
        <span>
          {delta > 0.5
            ? `Your average has risen by ${Math.round(delta)} pts`
            : delta < -0.5
              ? `Your average has shifted down by ${Math.round(Math.abs(delta))} pts`
              : "Your average has stayed consistent"}
        </span>
      </div>
    </div>
  );
}

function RatingConsistencyCard({ pid }: { pid: string }) {
  const { data: profile } = useQuery({
    queryKey: ["labs-whisky-profile-analytics", pid],
    queryFn: () => flavorProfileApi.getWhiskyProfile(pid, "all_incl_imported"),
    enabled: !!pid,
    staleTime: 120000,
  });

  const { data: participant } = useQuery({
    queryKey: ["labs-participant-detail-analytics", pid],
    queryFn: () => participantApi.get(pid),
    enabled: !!pid,
  });

  const stability = (participant as any)?.ratingStabilityScore ?? null;
  const ratingStyle = (profile as any)?.ratingStyle;
  const stdDev = ratingStyle?.stdDev ?? null;
  const mean = ratingStyle?.meanScore ?? ratingStyle?.mean ?? null;
  const min = ratingStyle?.scaleRange?.min ?? ratingStyle?.min ?? null;
  const max = ratingStyle?.scaleRange?.max ?? ratingStyle?.max ?? null;
  const n = ratingStyle?.nRatings ?? ratingStyle?.n ?? (profile as any)?.confidence?.overall?.n ?? null;
  const hasData = stability != null || stdDev != null;

  let consistencyLabel = "—";
  let consistencyColor = "var(--labs-text-muted)";
  if (stability != null) {
    if (stability >= 8) { consistencyLabel = "Very Consistent"; consistencyColor = "var(--labs-success)"; }
    else if (stability >= 6) { consistencyLabel = "Consistent"; consistencyColor = "var(--labs-accent)"; }
    else if (stability >= 4) { consistencyLabel = "Variable"; consistencyColor = "var(--labs-accent)"; }
    else { consistencyLabel = "Highly Variable"; consistencyColor = "var(--labs-danger)"; }
  }

  return (
    <div className="labs-card p-5" data-testid="card-rating-consistency">
      <p className="labs-section-label mb-1">Rating Consistency</p>
      <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)" }}>How stable and predictable your scoring pattern is</p>
      {!hasData ? (
        <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>Rate more whiskies to see your consistency score.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {stability != null && (
            <div className="flex items-center gap-4">
              <div style={{
                width: 52, height: 52, borderRadius: "50%", border: `3px solid ${consistencyColor}`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <span className="labs-serif" style={{ fontSize: 17, fontWeight: 700, color: consistencyColor }}>{stability.toFixed(1)}</span>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: consistencyColor }}>{consistencyLabel}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--labs-text-muted)" }}>
                  Your scoring pattern is {consistencyLabel.toLowerCase()}
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {mean != null && <StatMini value={mean.toFixed(1)} label="Avg Score" />}
            {stdDev != null && <StatMini value={stdDev.toFixed(1)} label="Spread (StdDev)" />}
            {min != null && max != null && <StatMini value={`${min.toFixed(0)}–${max.toFixed(0)}`} label="Range" />}
            {n != null && <StatMini value={String(n)} label="Ratings" />}
          </div>
          {stdDev != null && (
            <p className="text-xs" style={{ color: "var(--labs-text-muted)", lineHeight: 1.5 }}>
              {stdDev < 8
                ? "You tend to rate quite consistently — your scores stay close together."
                : stdDev < 15
                  ? "You have a healthy spread in your ratings, showing nuanced preferences."
                  : "Your ratings vary a lot — you clearly distinguish between whiskies you love and those you don't."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function StatMini({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ background: "var(--labs-bg)", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-accent)" }}>{value}</div>
      <div style={{ fontSize: 10, color: "var(--labs-text-muted)" }}>{label}</div>
    </div>
  );
}

function UnlockBanner() {
  const [visible, setVisible] = useState(true);
  useEffect(() => { const t = setTimeout(() => setVisible(false), 6000); return () => clearTimeout(t); }, []);
  if (!visible) return null;
  return (
    <div data-testid="banner-unlocked" style={{
      background: "linear-gradient(135deg, color-mix(in srgb, var(--labs-accent) 15%, transparent), var(--labs-surface))",
      border: "1px solid var(--labs-accent)", borderRadius: 10, padding: "12px 16px", textAlign: "center",
    }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-accent)" }}>Your Analytics are ready.</span>
    </div>
  );
}

export default function LabsTasteAnalytics() {
  const session = useSession();
  const pid = session.pid;
  const [, navigate] = useLocation();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["labs-participant-stats-threshold", pid],
    queryFn: () => statsApi.get(pid!),
    enabled: !!pid,
    staleTime: 60000,
  });

  const totalRatings = ((stats as any)?.totalRatings ?? 0) + ((stats as any)?.totalJournalEntries ?? 0);
  const isUnlocked = totalRatings >= THRESHOLD;
  const justUnlocked = isUnlocked && totalRatings < THRESHOLD + 3;
  const pct = Math.min((totalRatings / THRESHOLD) * 100, 100);

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto" data-testid="labs-taste-analytics">
      <Link href="/labs/taste" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-analytics">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
      </Link>

      <h1 className="labs-serif text-xl font-semibold mb-1 labs-fade-in" style={{ color: "var(--labs-text)" }} data-testid="text-analytics-title">
        Analytics
      </h1>
      <p className="text-sm mb-6 labs-fade-in" style={{ color: "var(--labs-text-muted)" }}>
        Your taste evolution & rating consistency
      </p>

      {!session.signedIn || !pid ? (
        <div className="labs-card p-6 text-center labs-fade-in">
          <p style={{ color: "var(--labs-text-secondary)", fontSize: 13 }}>Sign in to access your taste analytics</p>
        </div>
      ) : isLoading ? (
        <div className="labs-card p-8 text-center"><div className="labs-spinner mx-auto" /></div>
      ) : !isUnlocked ? (
        <div className="labs-card p-6 text-center labs-fade-in" data-testid="card-analytics-locked">
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            background: "color-mix(in srgb, var(--labs-accent) 10%, transparent)",
            display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
          }}>
            <Lock style={{ width: 22, height: 22, color: "var(--labs-accent)" }} />
          </div>
          <h3 className="labs-serif" style={{ fontSize: 16, fontWeight: 600, color: "var(--labs-text)", marginBottom: 8 }}>
            Analytics unlock after {THRESHOLD} whiskies
          </h3>
          <p className="text-sm mb-5" style={{ color: "var(--labs-text-muted)" }}>Build your tasting history to unlock deeper insights.</p>
          <div style={{ maxWidth: 220, margin: "0 auto 8px" }}>
            <div style={{ height: 6, background: "var(--labs-border)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, var(--labs-accent-dark), var(--labs-accent))", borderRadius: 3, transition: "width 0.5s ease" }} />
            </div>
            <div className="text-xs mt-1.5 font-semibold" style={{ color: "var(--labs-accent)" }} data-testid="text-progress">
              {totalRatings} / {THRESHOLD} whiskies logged
            </div>
          </div>
          <button
            onClick={() => navigate("/labs/solo")}
            className="labs-btn-primary mt-4"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}
            data-testid="button-log-whisky"
          >
            <PenLine style={{ width: 14, height: 14 }} />
            Log another whisky
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {justUnlocked && <UnlockBanner />}
          <TasteEvolutionCard pid={pid} />
          <RatingConsistencyCard pid={pid} />
        </div>
      )}
    </div>
  );
}

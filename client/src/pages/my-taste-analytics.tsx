import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { participantApi, statsApi, flavorProfileApi, journalApi, ratingNotesApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import SimpleShell from "@/components/simple/simple-shell";
import { Lock, PenLine } from "lucide-react";
import { Link, useLocation } from "wouter";
import BackButton from "@/components/back-button";
import { c, cardStyle } from "@/lib/theme";

function TasteEvolutionCard({ pid }: { pid: string }) {
  const { data: journal } = useQuery({
    queryKey: ["journal-evolution", pid],
    queryFn: () => journalApi.getAll(pid),
    enabled: !!pid,
    staleTime: 120000,
  });

  const { data: notes } = useQuery({
    queryKey: ["rating-notes-evolution", pid],
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
        <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: c.muted, margin: "0 0 12px" }}>
          Your Taste Evolution
        </h2>
        <p style={{ fontSize: 13, color: c.muted, margin: 0 }}>
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
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const linePoints = grouped.map((g, i) => {
    const x = padL + (i / (grouped.length - 1)) * plotW;
    const y = padT + plotH - ((g.avg - minScore) / range) * plotH;
    return { x, y, ...g };
  });

  const pathD = linePoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div style={cardStyle} data-testid="card-taste-evolution">
      <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: c.muted, margin: "0 0 12px" }}>
        Your Taste Evolution
      </h2>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} style={{ maxWidth: "100%" }}>
          <path d={pathD} fill="none" stroke={c.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          {linePoints.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={3} fill={c.accent} />
              <text x={p.x} y={chartH - 4} textAnchor="middle" fill={c.muted} fontSize={9} fontFamily="sans-serif">
                {p.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <span style={{ fontSize: 11, color: c.muted }}>
          {grouped[0].label}: avg {grouped[0].avg.toFixed(1)}
        </span>
        <span style={{ fontSize: 11, color: c.muted }}>
          {grouped[grouped.length - 1].label}: avg {grouped[grouped.length - 1].avg.toFixed(1)}
        </span>
      </div>
      {grouped.length >= 2 && (
        <div style={{ fontSize: 12, color: c.text, marginTop: 8, textAlign: "center" }}>
          {grouped[grouped.length - 1].avg > grouped[0].avg
            ? `Your average score has risen by ${(grouped[grouped.length - 1].avg - grouped[0].avg).toFixed(1)} points.`
            : grouped[grouped.length - 1].avg < grouped[0].avg
            ? `Your average score has shifted down by ${(grouped[0].avg - grouped[grouped.length - 1].avg).toFixed(1)} points.`
            : "Your average score has stayed consistent."}
        </div>
      )}
    </div>
  );
}

function RatingConsistencyCard({ pid }: { pid: string }) {
  const { data: profile } = useQuery({
    queryKey: ["whisky-profile-analytics", pid],
    queryFn: () => flavorProfileApi.getWhiskyProfile(pid, "all_incl_imported"),
    enabled: !!pid,
    staleTime: 120000,
  });

  const { data: participant } = useQuery({
    queryKey: ["participant-detail-analytics", pid],
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
  let consistencyColor = c.muted;
  if (stability != null) {
    if (stability >= 8) { consistencyLabel = "Very Consistent"; consistencyColor = "#7ea87e"; }
    else if (stability >= 6) { consistencyLabel = "Consistent"; consistencyColor = "#c8a864"; }
    else if (stability >= 4) { consistencyLabel = "Variable"; consistencyColor = "#d97c5a"; }
    else { consistencyLabel = "Highly Variable"; consistencyColor = "#c44"; }
  }

  return (
    <div style={cardStyle} data-testid="card-rating-consistency">
      <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: c.muted, margin: "0 0 16px" }}>
        Your Rating Consistency
      </h2>

      {!hasData ? (
        <p style={{ fontSize: 13, color: c.muted, margin: 0 }}>Rate more whiskies to see your consistency score.</p>
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
                <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>Your scoring pattern is {consistencyLabel.toLowerCase()}</div>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {mean != null && (
              <div style={{ background: c.bg, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: c.accent }}>{mean.toFixed(1)}</div>
                <div style={{ fontSize: 10, color: c.muted }}>Avg Score</div>
              </div>
            )}
            {stdDev != null && (
              <div style={{ background: c.bg, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: c.accent }}>{stdDev.toFixed(1)}</div>
                <div style={{ fontSize: 10, color: c.muted }}>Spread</div>
              </div>
            )}
            {min != null && max != null && (
              <div style={{ background: c.bg, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: c.accent }}>{min.toFixed(0)}–{max.toFixed(0)}</div>
                <div style={{ fontSize: 10, color: c.muted }}>Range</div>
              </div>
            )}
            {n != null && (
              <div style={{ background: c.bg, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: c.accent }}>{n}</div>
                <div style={{ fontSize: 10, color: c.muted }}>Ratings</div>
              </div>
            )}
          </div>

          {stdDev != null && (
            <div style={{ fontSize: 12, color: c.muted, lineHeight: 1.5 }}>
              {stdDev < 8
                ? "You tend to rate quite consistently — your scores stay close together."
                : stdDev < 15
                ? "You have a healthy spread in your ratings, showing nuanced preferences."
                : "Your ratings vary a lot — you clearly distinguish between whiskies you love and those you don't."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const THRESHOLD = 10;

function LockedState({ count }: { count: number }) {
  const [, navigate] = useLocation();
  const pct = Math.min((count / THRESHOLD) * 100, 100);

  return (
    <div style={cardStyle} data-testid="card-analytics-locked">
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: `${c.accent}15`, display: "inline-flex",
          alignItems: "center", justifyContent: "center", marginBottom: 16,
        }}>
          <Lock style={{ width: 22, height: 22, color: c.accentDim }} />
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 600, color: c.text, margin: "0 0 8px" }}>
          Your Taste Profile will appear after you log {THRESHOLD} whiskies.
        </h3>

        <p style={{ fontSize: 14, color: c.muted, margin: "0 0 20px" }}>
          Build your tasting history to unlock deeper insights.
        </p>

        <div style={{ maxWidth: 220, margin: "0 auto 8px" }}>
          <div style={{ height: 8, background: c.bg, borderRadius: 4, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${pct}%`,
              background: `linear-gradient(90deg, ${c.accentDim}, ${c.accent})`,
              borderRadius: 4, transition: "width 0.5s ease",
            }} />
          </div>
          <div style={{ fontSize: 13, color: c.accent, fontWeight: 600, marginTop: 6 }} data-testid="text-progress">
            {count} / {THRESHOLD} whiskies logged
          </div>
        </div>

        <button
          onClick={() => navigate("/log-simple")}
          data-testid="button-log-whisky"
          style={{
            marginTop: 20, display: "inline-flex", alignItems: "center", gap: 6,
            background: c.accent, color: c.bg, border: "none", borderRadius: 8,
            padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}
        >
          <PenLine style={{ width: 14, height: 14 }} />
          Log another whisky
        </button>
      </div>
    </div>
  );
}

function UnlockBanner() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div
      data-testid="banner-unlocked"
      style={{
        background: `linear-gradient(135deg, ${c.accent}25, ${c.accent}10)`,
        border: `1px solid ${c.accent}40`,
        borderRadius: 10, padding: "12px 16px",
        textAlign: "center", animation: "fadeIn 0.4s ease",
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600, color: c.accent }}>
        Your Taste Profile is ready.
      </span>
    </div>
  );
}

export default function MyTasteAnalyticsPage() {
  const { currentParticipant } = useAppStore();
  const pid = currentParticipant?.id;

  const { data: stats } = useQuery({
    queryKey: ["participant-stats-threshold", pid],
    queryFn: () => statsApi.get(pid!),
    enabled: !!pid,
    staleTime: 60000,
  });

  const totalRatings = (stats?.totalRatings ?? 0) + (stats?.totalJournalEntries ?? 0);
  const isUnlocked = totalRatings >= THRESHOLD;
  const justUnlocked = isUnlocked && totalRatings < THRESHOLD + 3;

  return (
    <SimpleShell>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
        <BackButton />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700, color: c.accent, margin: 0 }} data-testid="text-analytics-title">
              Analytics
            </h1>
            <p style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>
              Your taste evolution & rating consistency
            </p>
          </div>
        </div>

        {!pid ? (
          <div style={cardStyle}>
            <p style={{ fontSize: 14, color: c.muted, margin: 0, textAlign: "center" }} data-testid="text-analytics-login">
              Sign in from My Taste to see your analytics.
            </p>
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
    </SimpleShell>
  );
}

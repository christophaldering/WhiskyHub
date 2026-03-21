import { useState, useEffect, useMemo } from "react";
import type { ThemeTokens } from "../../tokens";
import type { Translations } from "../../i18n";
import { SP, FONT, RADIUS } from "../../tokens";
import SubScreenHeader from "./SubScreenHeader";

interface Props {
  th: ThemeTokens;
  t: Translations;
  participantId: string;
  onBack: () => void;
}

interface CompItem {
  whiskyName: string;
  userScore: number;
  platformMedian: number;
  delta: number;
  ratedAt: string | null;
}

export default function TasteAnalytics({ th, t, participantId, onBack }: Props) {
  const [items, setItems] = useState<CompItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/participants/${participantId}/whisky-profile`, {
          headers: { "x-participant-id": participantId },
        });
        if (!cancelled && res.ok) {
          const d = await res.json();
          setItems(d.whiskyComparison || []);
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [participantId]);

  const isLocked = items.length < 10;

  const monthlyData = useMemo(() => {
    const byMonth: Record<string, { total: number; count: number }> = {};
    for (const item of items) {
      const date = item.ratedAt ? new Date(item.ratedAt) : null;
      if (!date) continue;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!byMonth[key]) byMonth[key] = { total: 0, count: 0 };
      byMonth[key].total += item.userScore;
      byMonth[key].count += 1;
    }
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { total, count }]) => ({ month, avg: total / count, count }));
  }, [items]);

  const trend = useMemo(() => {
    if (monthlyData.length < 3) return "stable";
    const last3 = monthlyData.slice(-3);
    const first = last3[0].avg;
    const last = last3[last3.length - 1].avg;
    if (last - first > 2) return "rising";
    if (first - last > 2) return "dropping";
    return "stable";
  }, [monthlyData]);

  const overalls = items.map((i) => i.userScore);
  const mean = overalls.length > 0 ? overalls.reduce((a, b) => a + b, 0) / overalls.length : 0;
  const stdDev = overalls.length > 1 ? Math.sqrt(overalls.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / overalls.length) : 0;
  const stability = Math.max(0, Math.min(100, 100 - stdDev * 5));

  const svgW = 320;
  const svgH = 160;
  const pad = { top: 20, right: 16, bottom: 30, left: 36 };
  const chartW = svgW - pad.left - pad.right;
  const chartH = svgH - pad.top - pad.bottom;

  const yMin = monthlyData.length > 0 ? Math.floor(Math.min(...monthlyData.map((d) => d.avg)) - 5) : 0;
  const yMax = monthlyData.length > 0 ? Math.ceil(Math.max(...monthlyData.map((d) => d.avg)) + 5) : 100;
  const yRange = yMax - yMin || 1;

  const points = monthlyData.map((d, i) => {
    const x = pad.left + (monthlyData.length > 1 ? (i / (monthlyData.length - 1)) * chartW : chartW / 2);
    const y = pad.top + chartH - ((d.avg - yMin) / yRange) * chartH;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  const trendLabel = trend === "rising" ? t.mwTrendRising : trend === "dropping" ? t.mwTrendDropping : t.mwTrendStable;
  const trendColor = trend === "rising" ? th.green : trend === "dropping" ? th.amber : th.muted;

  return (
    <div className="v2-fade-up" style={{ padding: `${SP.lg}px ${SP.md}px` }}>
      <SubScreenHeader th={th} title={t.mwAnalytics} onBack={onBack} />

      {loading ? (
        <div style={{ textAlign: "center", padding: SP.xxl, color: th.muted }}>...</div>
      ) : isLocked ? (
        <div
          style={{
            background: th.bgCard,
            border: `1px solid ${th.border}`,
            borderRadius: RADIUS.lg,
            padding: SP.xl,
            textAlign: "center",
          }}
          data-testid="mw-analytics-locked"
        >
          <div style={{ fontSize: 40, marginBottom: SP.md }}>\ud83d\udd12</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: th.text, marginBottom: SP.sm }}>{t.mwLocked}</div>
          <p style={{ fontSize: 13, color: th.muted, marginBottom: SP.lg }}>{t.mwLockedHint}</p>
          <div style={{ background: th.border, borderRadius: RADIUS.full, height: 8, overflow: "hidden", maxWidth: 200, margin: "0 auto" }}>
            <div style={{
              width: `${Math.min(100, (items.length / 10) * 100)}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${th.gold}, ${th.amber})`,
              borderRadius: RADIUS.full,
            }} />
          </div>
          <div style={{ fontSize: 11, color: th.muted, marginTop: SP.xs }}>{items.length} / 10</div>
        </div>
      ) : (
        <>
          <div
            style={{
              background: th.bgCard,
              border: `1px solid ${th.border}`,
              borderRadius: RADIUS.lg,
              padding: SP.md,
              marginBottom: SP.lg,
              overflow: "hidden",
            }}
            data-testid="mw-analytics-chart"
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: th.muted, marginBottom: SP.sm, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {t.mwMonthlyAvg}
            </div>
            <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: "100%", height: "auto" }}>
              {[0, 0.25, 0.5, 0.75, 1].map((f) => {
                const y = pad.top + chartH * (1 - f);
                const val = (yMin + yRange * f).toFixed(0);
                return (
                  <g key={f}>
                    <line x1={pad.left} y1={y} x2={svgW - pad.right} y2={y} stroke={th.border} strokeWidth={0.5} />
                    <text x={pad.left - 6} y={y + 4} textAnchor="end" fill={th.muted} fontSize={9}>{val}</text>
                  </g>
                );
              })}
              {linePath && <path d={linePath} fill="none" stroke={th.gold} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={th.gold} stroke={th.bg} strokeWidth={1.5} />
              ))}
              {points.map((p, i) => (
                <text key={`l-${i}`} x={p.x} y={svgH - 6} textAnchor="middle" fill={th.muted} fontSize={8}>
                  {p.month.slice(5)}
                </text>
              ))}
            </svg>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP.sm }} data-testid="mw-analytics-cards">
            <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, padding: SP.md, textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: trendColor }}>{trendLabel}</div>
              <div style={{ fontSize: 11, color: th.muted, marginTop: SP.xs }}>{t.mwTrend}</div>
            </div>
            <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, padding: SP.md, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: FONT.display, color: stability > 70 ? th.green : stability > 40 ? th.gold : th.amber }}>
                {stability.toFixed(0)}%
              </div>
              <div style={{ fontSize: 11, color: th.muted, marginTop: SP.xs }}>{t.mwConsistency}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

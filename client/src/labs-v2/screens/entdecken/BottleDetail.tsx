import { useState, useEffect } from "react";
import { useV2Theme, useV2Lang } from "../../LabsV2Layout";
import { Back, Spinner, Nose, Palate, Finish, Overall } from "../../icons";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";
import type { ThemeTokens } from "../../tokens";

function BottlePlaceholderLarge({ color }: { color: string }) {
  return (
    <svg width="80" height="120" viewBox="0 0 80 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="28" y="6" width="24" height="12" rx="3" fill={color} opacity="0.25" />
      <rect x="32" y="18" width="16" height="8" fill={color} opacity="0.2" />
      <path d="M24 34C24 30 28 26 32 26H48C52 26 56 30 56 34V104C56 108.4 52.4 112 48 112H32C27.6 112 24 108.4 24 104V34Z" fill={color} fillOpacity="0.12" stroke={color} strokeWidth="1.5" strokeOpacity="0.25" />
      <rect x="30" y="52" width="20" height="16" rx="2" fill={color} opacity="0.1" />
    </svg>
  );
}

function BottleHeroImage({ imageUrl, th }: { imageUrl: string | null; th: ThemeTokens }) {
  const [imgError, setImgError] = useState(false);

  if (!imageUrl || imgError) {
    return (
      <div
        style={{
          width: "100%", display: "flex", justifyContent: "center",
          padding: `${SP.md}px 0`, marginBottom: SP.md,
        }}
        data-testid="img-bottle-hero-placeholder"
      >
        <BottlePlaceholderLarge color={th.muted} />
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%", display: "flex", justifyContent: "center",
        marginBottom: SP.md,
      }}
      data-testid="img-bottle-hero"
    >
      <img
        src={imageUrl}
        alt=""
        onError={() => setImgError(true)}
        style={{
          maxWidth: 200, maxHeight: 280, objectFit: "contain",
          borderRadius: RADIUS.md,
        }}
      />
    </div>
  );
}
interface AggregatedData {
  avgNose: number | null;
  avgTaste: number | null;
  avgFinish: number | null;
  avgOverall: number | null;
  ratingCount: number;
  overallRange: { min: number; max: number } | null;
}

interface RelatedTasting {
  id: string;
  title: string;
  date: string | null;
  status: string;
}

interface BottleData {
  id: string;
  name: string;
  distillery: string | null;
  region: string | null;
  caskType: string | null;
  age: string | null;
  abv: string | null;
  imageUrl: string | null;
  aggregated: AggregatedData;
  relatedTastings: RelatedTasting[];
  ratings: Array<{
    id: string;
    participantId: string;
    nose: number;
    taste: number;
    finish: number;
    overall: number;
  }>;
  scoreDistribution?: number[];
  tastingContext: { id: string; title: string; date: string | null } | null;
  hasNonStandardScale: boolean;
}

interface BottleDetailProps {
  bottleId: string;
  onBack: () => void;
}

function getParticipantId(): string {
  try {
    return (
      sessionStorage.getItem("session_pid") ||
      localStorage.getItem("casksense_participant_id") ||
      "demo"
    );
  } catch { return "demo"; }
}

interface DescriptiveStats {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  count: number;
  q1: number;
  q3: number;
  iqr: number;
}

function computeStats(sorted: number[]): DescriptiveStats {
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const variance = sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
  const q1Idx = (n - 1) * 0.25;
  const q3Idx = (n - 1) * 0.75;
  const q1 = sorted[Math.floor(q1Idx)] + (q1Idx % 1) * ((sorted[Math.ceil(q1Idx)] ?? sorted[Math.floor(q1Idx)]) - sorted[Math.floor(q1Idx)]);
  const q3 = sorted[Math.floor(q3Idx)] + (q3Idx % 1) * ((sorted[Math.ceil(q3Idx)] ?? sorted[Math.floor(q3Idx)]) - sorted[Math.floor(q3Idx)]);
  return { mean, median, stdDev, min: sorted[0], max: sorted[n - 1], count: n, q1, q3, iqr: q3 - q1 };
}

function gaussianPdf(x: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return x === mean ? 1 : 0;
  const exp = -0.5 * ((x - mean) / stdDev) ** 2;
  return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exp);
}

function DimensionBar({ label, value, icon: Icon, th }: { label: string; value: number | null; icon: (p: any) => React.JSX.Element; th: ThemeTokens }) {
  const pct = value != null ? Math.max(0, Math.min(100, value)) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: SP.sm, marginBottom: SP.sm }}>
      <Icon color={th.gold} size={16} />
      <div style={{ width: 60, fontSize: 12, color: th.muted, fontFamily: FONT.body }}>{label}</div>
      <div style={{ flex: 1, height: 6, background: th.bgCard, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: th.gold, borderRadius: 3, transition: "width 0.4s" }} />
      </div>
      <div style={{ width: 32, textAlign: "right", fontSize: 13, fontWeight: 600, color: th.text, fontVariantNumeric: "tabular-nums" }}>
        {value != null ? Math.round(value) : "\u2014"}
      </div>
    </div>
  );
}

function RatingDistributionChart({ values, th, hintText }: { values: number[]; th: ThemeTokens; hintText?: string }) {
  const [showStats, setShowStats] = useState(false);

  if (values.length < 3) {
    const distribution: Record<number, number> = {};
    for (let i = 1; i <= 10; i++) distribution[i] = 0;
    for (const v of values) {
      const bucket = Math.min(Math.max(Math.ceil(v / 10), 1), 10);
      distribution[bucket]++;
    }
    const maxBucket = Math.max(...Object.values(distribution), 1);
    return (
      <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, padding: SP.md }} data-testid="v2-distribution-chart">
        <div style={{ display: "flex", flexDirection: "column", gap: SP.sm }}>
          {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((bucket) => {
            const bucketLabel = bucket === 1 ? "1\u201310" : `${(bucket - 1) * 10 + 1}\u2013${bucket * 10}`;
            const count = distribution[bucket] || 0;
            const pct = (count / maxBucket) * 100;
            return (
              <div key={bucket} style={{ display: "flex", alignItems: "center", gap: SP.sm }}>
                <span style={{ width: 48, textAlign: "right", fontSize: 11, fontWeight: 500, color: th.muted }}>{bucketLabel}</span>
                <div style={{ flex: 1, height: 14, borderRadius: RADIUS.full, overflow: "hidden", background: th.border }}>
                  <div style={{ width: `${pct}%`, height: "100%", borderRadius: RADIUS.full, background: th.gold, transition: "width 0.5s", minWidth: count > 0 ? 4 : 0 }} />
                </div>
                <span style={{ width: 20, fontSize: 11, fontWeight: 500, color: th.muted }}>{count}</span>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: 11, color: th.muted, textAlign: "center", marginTop: SP.sm }}>{hintText || "Need 3+ ratings for distribution curve"}</p>
      </div>
    );
  }

  const stats = computeStats(values);
  const { mean, stdDev, min, max } = stats;

  const W = 320;
  const H = 140;
  const PAD_L = 5;
  const PAD_R = 5;
  const PAD_T = 12;
  const PAD_B = 28;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const isDegenerate = stdDev < 0.5;
  const rangeMin = 0;
  const rangeMax = 100;
  const steps = 100;
  const dx = (rangeMax - rangeMin) / steps;

  const points: [number, number][] = [];
  let peakY = 0;
  const effectiveStdDev = isDegenerate ? 2 : stdDev;
  for (let i = 0; i <= steps; i++) {
    const x = rangeMin + i * dx;
    const y = gaussianPdf(x, mean, effectiveStdDev);
    if (y > peakY) peakY = y;
    points.push([x, y]);
  }

  const toSvgX = (x: number) => PAD_L + ((x - rangeMin) / (rangeMax - rangeMin)) * plotW;
  const toSvgY = (y: number) => PAD_T + plotH - (y / peakY) * plotH;

  const pathD = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${toSvgX(x).toFixed(1)},${toSvgY(y).toFixed(1)}`).join(" ");
  const fillD = `${pathD} L${toSvgX(rangeMax).toFixed(1)},${(PAD_T + plotH).toFixed(1)} L${toSvgX(rangeMin).toFixed(1)},${(PAD_T + plotH).toFixed(1)} Z`;

  const dotPositions = values.map((v, i) => ({
    x: toSvgX(v),
    y: PAD_T + plotH + 2 + ((((v * 7 + i * 13) % 17) / 17) * 4),
  }));

  const meanX = toSvgX(mean);
  const medianX = toSvgX(stats.median);
  const q1X = toSvgX(stats.q1);
  const q3X = toSvgX(stats.q3);

  const xLabels = [0, 20, 40, 60, 80, 100];

  return (
    <div
      style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, overflow: "hidden" }}
      data-testid="v2-distribution-chart"
    >
      <div
        style={{ padding: SP.md, cursor: "pointer" }}
        onClick={() => setShowStats(!showStats)}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setShowStats(!showStats); }}
        data-testid="v2-distribution-toggle"
      >
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }} preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="v2CurveFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={th.gold} stopOpacity="0.35" />
              <stop offset="100%" stopColor={th.gold} stopOpacity="0.05" />
            </linearGradient>
          </defs>

          <line x1={PAD_L} y1={PAD_T + plotH} x2={PAD_L + plotW} y2={PAD_T + plotH} stroke={th.border} strokeWidth="1" />

          {xLabels.map(v => (
            <g key={v}>
              <line x1={toSvgX(v)} y1={PAD_T + plotH} x2={toSvgX(v)} y2={PAD_T + plotH + 4} stroke={th.border} strokeWidth="0.5" />
              <text x={toSvgX(v)} y={H - 6} textAnchor="middle" fill={th.muted} fontSize="9" fontFamily="inherit">{v}</text>
            </g>
          ))}

          <rect x={q1X} y={PAD_T} width={q3X - q1X} height={plotH} fill={th.gold} opacity="0.06" rx="2" />

          <path d={fillD} fill="url(#v2CurveFill)" />
          <path d={pathD} fill="none" stroke={th.gold} strokeWidth="2" strokeLinejoin="round" />

          <line x1={meanX} y1={PAD_T} x2={meanX} y2={PAD_T + plotH} stroke={th.gold} strokeWidth={isDegenerate ? 2.5 : 1.5} strokeDasharray={isDegenerate ? undefined : "4 3"} opacity="0.8" />
          <text x={meanX} y={PAD_T - 2} textAnchor="middle" fill={th.gold} fontSize="9" fontWeight="600" fontFamily="inherit">
            {isDegenerate ? `\u2248 ${mean.toFixed(1)}` : `\u03BC ${mean.toFixed(1)}`}
          </text>

          {Math.abs(medianX - meanX) > 6 && (
            <>
              <line x1={medianX} y1={PAD_T + plotH * 0.3} x2={medianX} y2={PAD_T + plotH} stroke={th.muted} strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
              <text x={medianX} y={PAD_T + plotH * 0.25} textAnchor="middle" fill={th.muted} fontSize="8" fontFamily="inherit">Med</text>
            </>
          )}

          {dotPositions.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r="2.5" fill={th.gold} opacity="0.5" />
          ))}

          <line x1={toSvgX(min)} y1={PAD_T + plotH + 10} x2={toSvgX(max)} y2={PAD_T + plotH + 10} stroke={th.muted} strokeWidth="0.5" opacity="0.4" />
          <circle cx={toSvgX(min)} cy={PAD_T + plotH + 10} r="2" fill={th.muted} opacity="0.4" />
          <circle cx={toSvgX(max)} cy={PAD_T + plotH + 10} r="2" fill={th.muted} opacity="0.4" />
        </svg>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: SP.xs }}>
          <span style={{ fontSize: 11, color: th.muted }}>{showStats ? "Hide statistics" : "Tap for statistics"}</span>
          <span style={{ fontSize: 10, color: th.muted, transition: "transform 0.2s", display: "inline-block", transform: showStats ? "rotate(180deg)" : "rotate(0deg)" }}>{"\u25BC"}</span>
        </div>
      </div>

      {showStats && (
        <div style={{ padding: `0 ${SP.md}px ${SP.md}px`, borderTop: `1px solid ${th.border}`, paddingTop: SP.sm }} data-testid="v2-distribution-stats">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: `${SP.sm}px ${SP.lg}px` }}>
            <StatItem label="Mean" value={stats.mean.toFixed(1)} accent th={th} />
            <StatItem label="Median" value={stats.median.toFixed(1)} accent th={th} />
            <StatItem label="Std Dev" value={stats.stdDev.toFixed(2)} th={th} />
            <StatItem label="Count" value={String(stats.count)} th={th} />
            <StatItem label="Min" value={stats.min.toFixed(1)} th={th} />
            <StatItem label="Max" value={stats.max.toFixed(1)} th={th} />
            <StatItem label="Q1 (25%)" value={stats.q1.toFixed(1)} th={th} />
            <StatItem label="Q3 (75%)" value={stats.q3.toFixed(1)} th={th} />
          </div>
          <div style={{ marginTop: SP.sm, paddingTop: SP.xs, borderTop: `1px solid ${th.border}`, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: th.muted }}>IQR (Q3 \u2212 Q1)</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: th.text }}>{stats.iqr.toFixed(1)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function StatItem({ label, value, accent, th }: { label: string; value: string; accent?: boolean; th: ThemeTokens }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: th.muted }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: accent ? th.gold : th.text }}>{value}</div>
    </div>
  );
}

export default function BottleDetail({ bottleId, onBack }: BottleDetailProps) {
  const { th } = useV2Theme();
  const { t } = useV2Lang();
  const [bottle, setBottle] = useState<BottleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const pid = getParticipantId();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch(`/api/labs/explore/whiskies/${bottleId}`, { headers: { "x-participant-id": pid } })
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setBottle(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [bottleId]);

  const overallValues = bottle?.ratings
    ?.map(r => r.overall)
    .filter((v): v is number => v != null && v > 0)
    .sort((a, b) => a - b) ?? [];

  return (
    <div className="v2-fade-up" style={{ padding: `${SP.lg}px ${SP.md}px` }}>
      <button
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: SP.xs,
          background: "none",
          border: "none",
          color: th.muted,
          fontSize: 14,
          fontFamily: FONT.body,
          cursor: "pointer",
          marginBottom: SP.md,
          minHeight: TOUCH_MIN,
          padding: 0,
        }}
        data-testid="button-back-bottle"
      >
        <Back color={th.muted} size={18} />
        {t.entExplore}
      </button>

      {loading && (
        <div style={{ textAlign: "center", padding: SP.xxl }}>
          <Spinner color={th.muted} size={24} />
        </div>
      )}

      {error && !loading && (
        <div style={{ textAlign: "center", padding: SP.xxl, color: th.muted, fontSize: 14 }} data-testid="text-bottle-error">
          Could not load bottle details
        </div>
      )}

      {!loading && !error && bottle && (
        <>
          <BottleHeroImage imageUrl={bottle.imageUrl} th={th} />

          <div style={{ marginBottom: SP.lg }}>
            <h1
              style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 600, color: th.text, marginBottom: SP.xs }}
              data-testid="text-bottle-name"
            >
              {bottle.name}
            </h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: SP.sm, fontSize: 13, color: th.muted }}>
              {bottle.distillery && <span>{bottle.distillery}</span>}
              {bottle.region && <span>{bottle.region}</span>}
              {bottle.caskType && <span>{bottle.caskType}</span>}
              {bottle.age && <span>{bottle.age}y</span>}
              {bottle.abv && <span>{bottle.abv}%</span>}
            </div>
          </div>

          <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, padding: SP.md, marginBottom: SP.md }}>
            <h2 style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 600, color: th.text, marginBottom: SP.md }} data-testid="text-bottle-ratings-title">
              {t.entBottleRatings}
            </h2>

            {bottle.aggregated.avgOverall != null && (
              <div style={{ textAlign: "center", marginBottom: SP.md }}>
                <div style={{ fontSize: 36, fontWeight: 700, color: th.gold, fontVariantNumeric: "tabular-nums" }} data-testid="text-bottle-avg-score">
                  {Math.round(bottle.aggregated.avgOverall * 10) / 10}
                </div>
                <div style={{ fontSize: 12, color: th.muted }}>{bottle.aggregated.ratingCount} ratings</div>
              </div>
            )}

            <DimensionBar label={t.ratingNose} value={bottle.aggregated.avgNose} icon={Nose} th={th} />
            <DimensionBar label={t.ratingPalate} value={bottle.aggregated.avgTaste} icon={Palate} th={th} />
            <DimensionBar label={t.ratingFinish} value={bottle.aggregated.avgFinish} icon={Finish} th={th} />
            <DimensionBar label={t.ratingOverall} value={bottle.aggregated.avgOverall} icon={Overall} th={th} />

            {bottle.aggregated.overallRange && (
              <div style={{ marginTop: SP.md, fontSize: 12, color: th.muted, textAlign: "center" }}>
                Range: {bottle.aggregated.overallRange.min} \u2013 {bottle.aggregated.overallRange.max}
              </div>
            )}
          </div>

          {bottle.aggregated.ratingCount > 0 && (
            <div style={{ marginBottom: SP.md }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: th.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: SP.sm }}>
                {t.ratingDistribution}
              </div>
              {overallValues.length > 0 ? (
                <RatingDistributionChart values={overallValues} th={th} hintText={t.ratingDistributionHint} />
              ) : bottle.scoreDistribution && bottle.scoreDistribution.some((c: number) => c > 0) ? (
                <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, padding: SP.md }} data-testid="v2-distribution-histogram">
                  <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 48 }}>
                    {bottle.scoreDistribution.map((count: number, i: number) => {
                      const max = Math.max(...bottle.scoreDistribution!, 1);
                      return (
                        <div key={i} style={{ flex: 1, background: th.gold, borderRadius: "2px 2px 0 0", height: `${(count / max) * 100}%`, opacity: 0.6 + i * 0.04, minHeight: count > 0 ? 2 : 0 }} />
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: SP.xs }}>
                    <span style={{ fontSize: 10, color: th.muted }}>0</span>
                    <span style={{ fontSize: 10, color: th.muted }}>50</span>
                    <span style={{ fontSize: 10, color: th.muted }}>100</span>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {bottle.relatedTastings && bottle.relatedTastings.length > 0 && (
            <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, padding: SP.md }}>
              <h2 style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 600, color: th.text, marginBottom: SP.md }} data-testid="text-bottle-history-title">
                {t.entBottleHistory}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: SP.sm }}>
                {bottle.relatedTastings.map((rt) => (
                  <div key={rt.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${SP.sm}px 0`, borderBottom: `1px solid ${th.border}` }}>
                    <span style={{ fontSize: 13, color: th.text }}>{rt.title}</span>
                    <span style={{ fontSize: 12, color: th.muted }}>{rt.date ?? "\u2014"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

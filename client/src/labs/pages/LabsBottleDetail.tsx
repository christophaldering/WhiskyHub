import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ChevronLeft,
  Wine,
  Star,
  MapPin,
  Droplets,
  Clock,
  BarChart3,
  Users,
  User,
  ChevronDown,
} from "lucide-react";
import WhiskyImage from "@/labs/components/WhiskyImage";
import { useAppStore } from "@/lib/store";
import { exploreApi } from "@/lib/api";

interface LabsBottleDetailProps {
  params: { id: string };
}

export default function LabsBottleDetail({ params }: LabsBottleDetailProps) {
  const whiskyId = params.id;
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();

  const { data: whisky, isLoading, isError } = useQuery({
    queryKey: ["labs-explore-whisky", whiskyId],
    queryFn: () => exploreApi.getWhisky(whiskyId, currentParticipant?.id),
    enabled: !!whiskyId,
  });

  if (isError) {
    return (
      <div className="labs-empty labs-fade-in" style={{ minHeight: "60vh" }}>
        <Wine className="w-10 h-10 mb-4" style={{ color: "var(--labs-text-muted)" }} />
        <p className="text-base font-medium mb-2" style={{ color: "var(--labs-text)" }} data-testid="labs-bottle-not-found">
          Bottle not found
        </p>
        <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)" }}>
          This whisky may have been removed or the link is incorrect.
        </p>
        <button
          className="labs-btn-secondary"
          onClick={() => navigate("/labs/explore")}
          data-testid="labs-bottle-back-btn"
        >
          Explore
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="labs-empty labs-fade-in" style={{ minHeight: "60vh" }}>
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin mb-4"
          style={{ borderColor: "var(--labs-border)", borderTopColor: "var(--labs-accent)" }}
        />
        <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>Loading bottle…</p>
      </div>
    );
  }

  if (!whisky) return null;

  const agg = whisky.aggregated || {};
  const avgOverall = agg.avgOverall != null ? Number(agg.avgOverall).toFixed(1) : null;
  const avgNose = agg.avgNose != null ? Number(agg.avgNose).toFixed(1) : null;
  const avgTaste = agg.avgTaste != null ? Number(agg.avgTaste).toFixed(1) : null;
  const avgFinish = agg.avgFinish != null ? Number(agg.avgFinish).toFixed(1) : null;
  const avgBalance = agg.avgBalance != null ? Number(agg.avgBalance).toFixed(1) : null;
  const ratingCount = agg.ratingCount || 0;
  const tastingCount = (whisky.relatedTastings || []).length || 0;

  const ratings: any[] = whisky.ratings || [];
  const myRatings = currentParticipant
    ? ratings.filter((r: any) => r.participantId === currentParticipant.id)
    : [];
  const tastings: any[] = whisky.relatedTastings || [];

  const overallValues = extractOverallValues(ratings);

  const infoItems = [
    whisky.distillery && { label: "Distillery", value: whisky.distillery },
    whisky.region && { label: "Region", value: whisky.region },
    whisky.country && { label: "Country", value: whisky.country },
    whisky.category && { label: "Category", value: whisky.category },
    whisky.age && { label: "Age", value: `${whisky.age} years` },
    whisky.abv && { label: "ABV", value: `${whisky.abv}%` },
    whisky.caskType && { label: "Cask Type", value: whisky.caskType },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto">
      <button
        className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4 labs-fade-in"
        onClick={() => navigate("/labs/explore")}
        data-testid="labs-bottle-back"
      >
        <ChevronLeft className="w-4 h-4" />
        Explore
      </button>

      <div className="labs-fade-in labs-stagger-1">
        <div className="flex items-start gap-4 mb-6">
          <WhiskyImage imageUrl={whisky.imageUrl} name={whisky.name || ""} size={56} testId="labs-bottle-image" />
          <div className="flex-1 min-w-0">
            <h1
              className="labs-h2 leading-tight"
              style={{ color: "var(--labs-text)" }}
              data-testid="labs-bottle-name"
            >
              {whisky.name}
            </h1>
            {whisky.distillery && (
              <p className="text-sm mt-1" style={{ color: "var(--labs-text-secondary)" }} data-testid="labs-bottle-distillery">
                {whisky.distillery}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {whisky.region && (
                <span className="text-xs flex items-center gap-1" style={{ color: "var(--labs-text-muted)" }}>
                  <MapPin className="w-3 h-3" />
                  {whisky.region}
                </span>
              )}
              {whisky.abv && (
                <span className="text-xs flex items-center gap-1" style={{ color: "var(--labs-text-muted)" }}>
                  <Droplets className="w-3 h-3" />
                  {whisky.abv}%
                </span>
              )}
              {whisky.age && (
                <span className="text-xs flex items-center gap-1" style={{ color: "var(--labs-text-muted)" }}>
                  <Clock className="w-3 h-3" />
                  {whisky.age}y
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {infoItems.length > 0 && (
        <div className="labs-card p-4 mb-6 labs-fade-in labs-stagger-2" data-testid="labs-bottle-info">
          <p className="labs-section-label">Bottle Info</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {infoItems.map((item) => (
              <div key={item.label}>
                <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{item.label}</p>
                <p className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {ratingCount > 0 && (
        <div className="mb-6 labs-fade-in labs-stagger-2">
          <p className="labs-section-label">Community Ratings</p>
          <div className="labs-card p-4" data-testid="labs-bottle-community-ratings">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-center">
                <p className="text-3xl font-bold" style={{ color: "var(--labs-accent)" }}>{avgOverall}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Users className="w-3 h-3" style={{ color: "var(--labs-text-muted)" }} />
                  <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                    {ratingCount} rating{ratingCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2">
                {avgNose && <DimensionBar label="Nose" value={avgNose} />}
                {avgTaste && <DimensionBar label="Taste" value={avgTaste} />}
                {avgFinish && <DimensionBar label="Finish" value={avgFinish} />}
                {avgBalance && <DimensionBar label="Balance" value={avgBalance} />}
              </div>
            </div>
            {tastingCount > 0 && (
              <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                Featured in {tastingCount} tasting{tastingCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
      )}

      {ratingCount > 0 && (
        <div className="mb-6 labs-fade-in labs-stagger-3">
          <p className="labs-section-label">Rating Distribution</p>
          <RatingDistributionChart values={overallValues} data-testid="labs-bottle-distribution" />
        </div>
      )}

      {myRatings.length > 0 && (
        <div className="mb-6 labs-fade-in labs-stagger-3">
          <p className="labs-section-label">Your Ratings</p>
          <div className="space-y-2" data-testid="labs-bottle-my-ratings">
            {myRatings.map((r: any, i: number) => (
              <div key={i} className="labs-card p-4" data-testid={`labs-bottle-my-rating-${i}`}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--labs-accent-muted)" }}
                  >
                    <User className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                      <span className="text-sm font-bold" style={{ color: "var(--labs-accent)" }}>
                        {r.overall != null ? Number(r.overall).toFixed(1) : "–"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {r.nose != null && (
                        <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>N: {r.nose}</span>
                      )}
                      {r.taste != null && (
                        <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>T: {r.taste}</span>
                      )}
                      {r.finish != null && (
                        <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>F: {r.finish}</span>
                      )}
                      {r.balance != null && (
                        <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>B: {r.balance}</span>
                      )}
                    </div>
                  </div>
                  {r.tastingTitle && (
                    <span className="text-xs truncate max-w-[120px]" style={{ color: "var(--labs-text-muted)" }}>
                      {r.tastingTitle}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tastings.length > 0 && (
        <div className="mb-6 labs-fade-in labs-stagger-4">
          <p className="labs-section-label">Tasting History</p>
          <div className="space-y-2" data-testid="labs-bottle-tastings">
            {tastings.map((t: any) => (
              <div
                key={t.id}
                className="labs-card labs-card-interactive flex items-center gap-3 p-4"
                onClick={() => navigate(`/labs/tastings/${t.id}`)}
                data-testid={`labs-bottle-tasting-${t.id}`}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--labs-info-muted)" }}
                >
                  <BarChart3 className="w-4 h-4" style={{ color: "var(--labs-info)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--labs-text)" }}>
                    {t.title || "Untitled Tasting"}
                  </p>
                  {t.date && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--labs-text-muted)" }}>
                      {t.date}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {ratingCount === 0 && (
        <div className="labs-empty labs-fade-in labs-stagger-2" data-testid="labs-bottle-no-ratings">
          <Star className="w-10 h-10 mb-3" style={{ color: "var(--labs-text-muted)" }} />
          <p className="text-sm font-medium mb-1" style={{ color: "var(--labs-text-secondary)" }}>
            No community ratings yet
          </p>
          <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
            Ratings will appear here once this bottle is tasted in a session
          </p>
        </div>
      )}
    </div>
  );
}

function DimensionBar({ label, value }: { label: string; value: string }) {
  const numVal = parseFloat(value);
  const pct = Math.min((numVal / 100) * 100, 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{label}</span>
        <span className="text-xs font-semibold" style={{ color: "var(--labs-text-secondary)" }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--labs-border)" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: "var(--labs-accent)", transition: "width 600ms ease" }}
        />
      </div>
    </div>
  );
}

function extractOverallValues(ratings: any[]): number[] {
  const vals: number[] = [];
  for (const r of ratings) {
    if (r.overall != null) {
      const v = Number(r.overall);
      if (!isNaN(v) && v > 0) vals.push(v);
    }
  }
  return vals.sort((a, b) => a - b);
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

function RatingDistributionChart({ values, ...rest }: { values: number[]; "data-testid"?: string }) {
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
      <div className="labs-card p-4" data-testid={rest["data-testid"]}>
        <div className="space-y-2">
          {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((bucket) => {
            const bucketLabel = bucket === 1 ? "1–10" : `${(bucket - 1) * 10 + 1}–${bucket * 10}`;
            const count = distribution[bucket] || 0;
            const pct = (count / maxBucket) * 100;
            return (
              <div key={bucket} className="flex items-center gap-3">
                <span className="text-xs w-14 text-right font-medium" style={{ color: "var(--labs-text-secondary)" }}>
                  {bucketLabel}
                </span>
                <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: "var(--labs-border)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: "var(--labs-accent)", minWidth: count > 0 ? "4px" : "0" }}
                  />
                </div>
                <span className="text-xs w-6 font-medium" style={{ color: "var(--labs-text-muted)" }}>{count}</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs mt-3 text-center" style={{ color: "var(--labs-text-muted)" }}>
          Need 3+ ratings for distribution curve
        </p>
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
    <div className="labs-card overflow-hidden" data-testid={rest["data-testid"]}>
      <div
        className="p-4 cursor-pointer"
        onClick={() => setShowStats(!showStats)}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setShowStats(!showStats); }}
        data-testid="labs-distribution-chart-toggle"
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ display: "block" }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--labs-accent)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--labs-accent)" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          <line x1={PAD_L} y1={PAD_T + plotH} x2={PAD_L + plotW} y2={PAD_T + plotH} stroke="var(--labs-border)" strokeWidth="1" />

          {xLabels.map(v => (
            <g key={v}>
              <line x1={toSvgX(v)} y1={PAD_T + plotH} x2={toSvgX(v)} y2={PAD_T + plotH + 4} stroke="var(--labs-border)" strokeWidth="0.5" />
              <text x={toSvgX(v)} y={H - 6} textAnchor="middle" fill="var(--labs-text-muted)" fontSize="9" fontFamily="inherit">
                {v}
              </text>
            </g>
          ))}

          <rect x={q1X} y={PAD_T} width={q3X - q1X} height={plotH} fill="var(--labs-accent)" opacity="0.06" rx="2" />

          <path d={fillD} fill="url(#curveFill)" />
          <path d={pathD} fill="none" stroke="var(--labs-accent)" strokeWidth="2" strokeLinejoin="round" />

          <line x1={meanX} y1={PAD_T} x2={meanX} y2={PAD_T + plotH} stroke="var(--labs-accent)" strokeWidth={isDegenerate ? 2.5 : 1.5} strokeDasharray={isDegenerate ? undefined : "4 3"} opacity="0.8" />
          <text x={meanX} y={PAD_T - 2} textAnchor="middle" fill="var(--labs-accent)" fontSize="9" fontWeight="600" fontFamily="inherit">
            {isDegenerate ? `≈ ${mean.toFixed(1)}` : `μ ${mean.toFixed(1)}`}
          </text>

          {Math.abs(medianX - meanX) > 6 && (
            <>
              <line x1={medianX} y1={PAD_T + plotH * 0.3} x2={medianX} y2={PAD_T + plotH} stroke="var(--labs-text-muted)" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
              <text x={medianX} y={PAD_T + plotH * 0.25} textAnchor="middle" fill="var(--labs-text-muted)" fontSize="8" fontFamily="inherit">
                Med
              </text>
            </>
          )}

          {dotPositions.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r="2.5" fill="var(--labs-accent)" opacity="0.5" />
          ))}

          <line x1={toSvgX(min)} y1={PAD_T + plotH + 10} x2={toSvgX(max)} y2={PAD_T + plotH + 10} stroke="var(--labs-text-muted)" strokeWidth="0.5" opacity="0.4" />
          <circle cx={toSvgX(min)} cy={PAD_T + plotH + 10} r="2" fill="var(--labs-text-muted)" opacity="0.4" />
          <circle cx={toSvgX(max)} cy={PAD_T + plotH + 10} r="2" fill="var(--labs-text-muted)" opacity="0.4" />
        </svg>

        <div className="flex items-center justify-center gap-1 mt-1">
          <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
            {showStats ? "Hide statistics" : "Tap for statistics"}
          </span>
          <ChevronDown
            className="w-3 h-3 transition-transform"
            style={{
              color: "var(--labs-text-muted)",
              transform: showStats ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </div>
      </div>

      {showStats && (
        <div
          className="px-4 pb-4 pt-0"
          style={{ borderTop: "1px solid var(--labs-border)", paddingTop: 12 }}
          data-testid="labs-distribution-stats"
        >
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <StatItem label="Mean" value={stats.mean.toFixed(1)} accent />
            <StatItem label="Median" value={stats.median.toFixed(1)} accent />
            <StatItem label="Std Dev" value={stats.stdDev.toFixed(2)} />
            <StatItem label="Count" value={String(stats.count)} />
            <StatItem label="Min" value={stats.min.toFixed(1)} />
            <StatItem label="Max" value={stats.max.toFixed(1)} />
            <StatItem label="Q1 (25%)" value={stats.q1.toFixed(1)} />
            <StatItem label="Q3 (75%)" value={stats.q3.toFixed(1)} />
          </div>
          <div className="mt-3 pt-2" style={{ borderTop: "1px solid var(--labs-border)" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>IQR (Q3 − Q1)</span>
              <span className="text-xs font-semibold" style={{ color: "var(--labs-text-secondary)" }}>{stats.iqr.toFixed(1)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatItem({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{label}</p>
      <p className="text-sm font-semibold" style={{ color: accent ? "var(--labs-accent)" : "var(--labs-text)" }}>{value}</p>
    </div>
  );
}

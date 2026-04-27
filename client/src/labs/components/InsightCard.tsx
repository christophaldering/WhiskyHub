import { useLocation } from "wouter";
import { Flame, Trophy, Sparkles, Target, TrendingUp, TrendingDown, Wine, Users, Heart, Star, Compass, Zap, ChevronRight } from "lucide-react";
import type { Insight, InsightSize, InsightTone, InsightVisual } from "@/labs/insights/types";

const ICONS: Record<string, typeof Flame> = {
  flame: Flame,
  trophy: Trophy,
  sparkles: Sparkles,
  target: Target,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  wine: Wine,
  users: Users,
  heart: Heart,
  star: Star,
  compass: Compass,
  zap: Zap,
};

function toneColor(tone: InsightTone | undefined): string {
  switch (tone) {
    case "success": return "var(--labs-success)";
    case "danger": return "var(--labs-danger)";
    case "neutral": return "var(--labs-text-muted)";
    default: return "var(--labs-accent)";
  }
}

function Sparkline({ values, maxValue, color }: { values: number[]; maxValue?: number; color: string }) {
  if (!values || values.length === 0) {
    return <div style={{ width: 64, height: 28, opacity: 0.3 }} />;
  }
  const max = maxValue ?? Math.max(...values, 1);
  const width = 64;
  const height = 28;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((v, i) => `${i * step},${height - (v / max) * height}`).join(" ");
  const last = values[values.length - 1];
  const lastY = height - (last / max) * height;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <polyline fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" points={points} />
      <circle cx={(values.length - 1) * step} cy={lastY} r={2.4} fill={color} />
    </svg>
  );
}

function MiniRadar({ axes, highlightIndex, color }: { axes: { label: string; value: number }[]; highlightIndex?: number; color: string }) {
  if (!axes || axes.length < 3) {
    return <div style={{ width: 56, height: 56 }} />;
  }
  const size = 56;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) - 4;
  const points = axes.map((a, i) => {
    const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
    const v = Math.max(0, Math.min(100, a.value)) / 100;
    return [cx + Math.cos(angle) * r * v, cy + Math.sin(angle) * r * v];
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + "Z";
  const ringPath = axes.map((_, i) => {
    const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
    return `${i === 0 ? "M" : "L"}${(cx + Math.cos(angle) * r).toFixed(1)},${(cy + Math.sin(angle) * r).toFixed(1)}`;
  }).join(" ") + "Z";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <path d={ringPath} fill="none" stroke="var(--labs-border)" strokeWidth={0.6} opacity={0.6} />
      <path d={path} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={1} />
      {highlightIndex != null && points[highlightIndex] && (
        <circle cx={points[highlightIndex][0]} cy={points[highlightIndex][1]} r={2.6} fill={color} />
      )}
    </svg>
  );
}

function ScoreRing({ value, max, color }: { value: number; max: number; color: string }) {
  const size = 56;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, value / max));
  const dash = circumference * pct;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--labs-border)" strokeWidth={stroke} opacity={0.5} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2}
        y={size / 2 + 4}
        textAnchor="middle"
        fontSize={15}
        fontWeight={700}
        fill="var(--labs-text)"
        style={{ fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-display, inherit)" }}
      >
        {Math.round(value)}
      </text>
    </svg>
  );
}

function DiffBar({ you, other, max, youLabel, otherLabel, color }: { you: number; other: number; max: number; youLabel?: string; otherLabel?: string; color: string }) {
  const youPct = Math.max(0, Math.min(100, (you / max) * 100));
  const otherPct = Math.max(0, Math.min(100, (other / max) * 100));
  return (
    <div style={{ width: 80, display: "flex", flexDirection: "column", gap: 4 }} aria-hidden>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--labs-text-muted)", lineHeight: 1 }}>
          <span>{youLabel ?? "A"}</span>
          <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--labs-text)", fontWeight: 600 }}>{Math.round(you)}</span>
        </div>
        <div style={{ height: 5, background: "var(--labs-border)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${youPct}%`, background: color, borderRadius: 3 }} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--labs-text-muted)", lineHeight: 1 }}>
          <span>{otherLabel ?? "B"}</span>
          <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--labs-text)", fontWeight: 600 }}>{Math.round(other)}</span>
        </div>
        <div style={{ height: 5, background: "var(--labs-border)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${otherPct}%`, background: "var(--labs-text-muted)", borderRadius: 3, opacity: 0.6 }} />
        </div>
      </div>
    </div>
  );
}

function IconVisual({ iconName, badge, color }: { iconName: string; badge?: string | number; color: string }) {
  const Icon = ICONS[iconName] ?? Sparkles;
  return (
    <div style={{
      width: 48,
      height: 48,
      borderRadius: 14,
      background: `color-mix(in srgb, ${color} 14%, transparent)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      flexShrink: 0,
    }} aria-hidden>
      <Icon style={{ width: 22, height: 22, color }} />
      {badge != null && (
        <span style={{
          position: "absolute",
          top: -4,
          right: -6,
          minWidth: 18,
          height: 18,
          borderRadius: 9,
          padding: "0 5px",
          background: color,
          color: "var(--labs-bg)",
          fontSize: 10,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontVariantNumeric: "tabular-nums",
        }}>
          {badge}
        </span>
      )}
    </div>
  );
}

function Visual({ visual, color }: { visual: InsightVisual; color: string }) {
  switch (visual.kind) {
    case "sparkline":
      return <Sparkline values={visual.values} maxValue={visual.maxValue} color={color} />;
    case "miniRadar":
      return <MiniRadar axes={visual.axes} highlightIndex={visual.highlightIndex} color={color} />;
    case "scoreRing":
      return <ScoreRing value={visual.value} max={visual.max} color={color} />;
    case "diffBar":
      return <DiffBar you={visual.you} other={visual.other} max={visual.max} youLabel={visual.youLabel} otherLabel={visual.otherLabel} color={color} />;
    case "icon":
      return <IconVisual iconName={visual.iconName} badge={visual.badge} color={color} />;
    default:
      return null;
  }
}

export interface InsightCardProps {
  insight: Insight;
  size?: InsightSize;
  onClick?: (insight: Insight) => void;
}

export default function InsightCard({ insight, size = "standard", onClick }: InsightCardProps) {
  const [, navigate] = useLocation();
  const color = toneColor(insight.tone);

  const handleClick = () => {
    if (onClick) {
      onClick(insight);
      return;
    }
    if (insight.deepLink) navigate(insight.deepLink);
  };

  if (size === "compact") {
    return (
      <button
        type="button"
        onClick={handleClick}
        data-testid={insight.testId}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderRadius: 999,
          background: "var(--labs-surface)",
          border: `1px solid color-mix(in srgb, ${color} 25%, var(--labs-border))`,
          color: "var(--labs-text)",
          fontSize: 12,
          fontWeight: 500,
          cursor: insight.deepLink ? "pointer" : "default",
          fontFamily: "var(--font-ui, inherit)",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        <span style={{ display: "inline-flex", width: 14, height: 14, color }} aria-hidden>
          <Sparkles style={{ width: 14, height: 14 }} />
        </span>
        <span>{insight.headline}</span>
      </button>
    );
  }

  if (size === "feature") {
    return (
      <button
        type="button"
        onClick={handleClick}
        data-testid={insight.testId}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: "20px 22px",
          borderRadius: 18,
          background: `linear-gradient(135deg, color-mix(in srgb, ${color} 12%, var(--labs-surface)), var(--labs-surface))`,
          border: `1px solid color-mix(in srgb, ${color} 30%, var(--labs-border))`,
          color: "var(--labs-text)",
          textAlign: "left",
          cursor: insight.deepLink ? "pointer" : "default",
          fontFamily: "var(--font-ui, inherit)",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              {insight.kind.split(".")[1]?.replace(/-/g, " ") || "insight"}
            </div>
            <div className="labs-serif" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.25, marginBottom: 4 }}>
              {insight.headline}
            </div>
            {insight.subline && (
              <div style={{ fontSize: 13, color: "var(--labs-text-muted)", lineHeight: 1.4 }}>
                {insight.subline}
              </div>
            )}
          </div>
          <Visual visual={insight.visual} color={color} />
        </div>
        {insight.deepLink && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color }}>
            <span>{"\u2192"}</span>
          </div>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid={insight.testId}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 14,
        background: "var(--labs-surface)",
        border: "1px solid var(--labs-border)",
        color: "var(--labs-text)",
        textAlign: "left",
        cursor: insight.deepLink ? "pointer" : "default",
        fontFamily: "var(--font-ui, inherit)",
        width: "100%",
        minHeight: 76,
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1 }}>
          {insight.kind.startsWith("solo.") ? "Solo" : insight.kind.startsWith("group.") ? "Group" : "Feed"}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {insight.headline}
        </div>
        {insight.subline && (
          <div style={{ fontSize: 11, color: "var(--labs-text-muted)", lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
            {insight.subline}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
        <Visual visual={insight.visual} color={color} />
        {insight.deepLink && <ChevronRight style={{ width: 14, height: 14, color: "var(--labs-text-muted)" }} />}
      </div>
    </button>
  );
}

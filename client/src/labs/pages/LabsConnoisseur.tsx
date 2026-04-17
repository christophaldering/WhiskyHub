import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import BackLink from "@/labs/components/BackLink";
import { useSession } from "@/lib/session";
import { pidHeaders, profileApi } from "@/lib/api";
import { wishlistKey, useWishlistKeys } from "@/lib/wishlistKey";
import WishlistBadge from "@/labs/components/WishlistBadge";
import { stripGuestSuffix, formatScore } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft, Sparkles, Copy, Check, Download,
  FileText, Trash2, Globe, Share2, TrendingUp, TrendingDown,
  Award, BarChart3, Wine, Droplets, Info, Activity, ChevronRight,
} from "lucide-react";

interface DimensionScores {
  nose?: number | null;
  taste?: number | null;
  finish?: number | null;
  overall?: number | null;
}

interface WhiskySummary {
  name: string;
  distillery?: string;
  country?: string;
  region?: string;
  scores: DimensionScores;
  flavors?: string[];
  vsGroupOverall?: number | null;
}

interface DataSnapshot {
  totalRatings?: number;
  totalTastings?: number;
  totalJournalEntries?: number;
  collectionSize?: number;
  avgScores?: DimensionScores;
  groupAvgOverall?: number | null;
  groupAvgScores?: DimensionScores;
  vsGroupDelta?: number | null;
  highestWhisky?: { name: string; score?: number | null } | null;
  lowestWhisky?: { name: string; score?: number | null } | null;
  whiskySummaries?: WhiskySummary[];
  regionBreakdown?: { region: string; count: number; avgScore: number }[];
  topRegion?: string | null;
  smokeAffinityIndex?: number | null;
  sweetnessBias?: number | null;
  ratingStabilityScore?: number | null;
  explorationIndex?: number | null;
  tasteTwinsCount?: number;
  reportEn?: string;
  reportDe?: string;
  summaryEn?: string;
  summaryDe?: string;
  palateProfileEn?: string;
  palateProfileDe?: string;
  tastingHighlightsEn?: string;
  tastingHighlightsDe?: string;
  recommendationEn?: string;
  recommendationDe?: string;
  quoteEn?: string;
  quoteDe?: string;
  tastingId?: string;
}

interface ConnoisseurReport {
  id: string;
  participantId: string;
  generatedAt: string;
  reportContent: string;
  summary: string;
  dataSnapshot: DataSnapshot | null;
  language: string;
  liveWhiskySummaries?: WhiskySummary[];
}

function RadarChart({ userScores, groupScores, size = 240, legendYou, legendCommunity }: {
  userScores: DimensionScores;
  groupScores?: DimensionScores | null;
  size?: number;
  legendYou?: string;
  legendCommunity?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dims: { key: keyof DimensionScores; label: string }[] = [];
  if (userScores.nose != null) dims.push({ key: "nose", label: "Nose" });
  if (userScores.taste != null) dims.push({ key: "taste", label: "Taste" });
  if (userScores.finish != null) dims.push({ key: "finish", label: "Finish" });
  if (userScores.overall != null) dims.push({ key: "overall", label: "Overall" });
  const dimCount = dims.length || 3;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dims.length === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.36;
    const angles = dims.map((_, i) => (Math.PI * 2 * i) / dimCount - Math.PI / 2);

    for (let ring = 1; ring <= 4; ring++) {
      const r = (radius * ring) / 4;
      ctx.beginPath();
      angles.forEach((a, i) => {
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.strokeStyle = ring === 4 ? "rgba(201,167,108,0.25)" : "rgba(201,167,108,0.1)";
      ctx.lineWidth = ring === 4 ? 1.2 : 0.7;
      ctx.stroke();
    }

    angles.forEach((a) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + radius * Math.cos(a), cy + radius * Math.sin(a));
      ctx.strokeStyle = "rgba(201,167,108,0.15)";
      ctx.lineWidth = 0.7;
      ctx.stroke();
    });

    dims.forEach((dim, i) => {
      const a = angles[i];
      const labelR = radius + 18;
      const lx = cx + labelR * Math.cos(a);
      const ly = cy + labelR * Math.sin(a);
      ctx.font = "600 11px 'DM Sans', Inter, sans-serif";
      ctx.fillStyle = "rgba(203,187,163,0.85)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(dim.label, lx, ly);
    });

    const drawPolygon = (scores: (number | null | undefined)[], color: string, fillColor: string, lw: number) => {
      ctx.beginPath();
      scores.forEach((val, i) => {
        const norm = Math.min(val || 50, 100) / 100;
        const x = cx + radius * norm * Math.cos(angles[i]);
        const y = cy + radius * norm * Math.sin(angles[i]);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.stroke();

      scores.forEach((val, i) => {
        const norm = Math.min(val || 50, 100) / 100;
        const x = cx + radius * norm * Math.cos(angles[i]);
        const y = cy + radius * norm * Math.sin(angles[i]);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });
    };

    if (groupScores) {
      drawPolygon(
        dims.map(d => groupScores[d.key] ?? 50),
        "rgba(122,175,201,0.7)", "rgba(122,175,201,0.08)", 1.5
      );
    }

    drawPolygon(
      dims.map(d => userScores[d.key] ?? 50),
      "rgba(201,167,108,0.9)", "rgba(201,167,108,0.15)", 2
    );
  }, [userScores, groupScores, size, dimCount]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <canvas ref={canvasRef} data-testid="canvas-radar-chart" />
      <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--labs-text-muted)" }}>
          <span style={{ width: 10, height: 3, borderRadius: 2, background: "rgba(201,167,108,0.9)" }} /> {legendYou || "You"}
        </span>
        {groupScores && (
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--labs-text-muted)" }}>
            <span style={{ width: 10, height: 3, borderRadius: 2, background: "rgba(122,175,201,0.7)" }} /> {legendCommunity || "Community"}
          </span>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, suffix, icon: Icon, trend, infoText, infoOpen, onToggleInfo, testId }: {
  label: string;
  value: string | number;
  suffix?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  infoText?: string;
  infoOpen?: boolean;
  onToggleInfo?: () => void;
  testId?: string;
}) {
  return (
    <div style={{
      background: "var(--labs-surface)", borderRadius: 14, padding: "14px 12px",
      display: "flex", flexDirection: "column", gap: 4, minWidth: 0, position: "relative",
    }}>
      {infoText && onToggleInfo && (
        <button
          type="button"
          onClick={onToggleInfo}
          aria-label={`${label} info`}
          aria-expanded={!!infoOpen}
          data-testid={testId ? `button-info-${testId}` : undefined}
          style={{
            position: "absolute", top: 8, right: 8, padding: 2, background: "transparent",
            border: "none", cursor: "pointer", color: "var(--labs-text-muted)", opacity: 0.7,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Info className="w-3.5 h-3.5" style={{ width: 14, height: 14 }} />
        </button>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 6, paddingRight: infoText ? 18 : 0 }}>
        <Icon className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)", flexShrink: 0, opacity: 0.8 }} />
        <span style={{ fontSize: 10, fontWeight: 600, color: "var(--labs-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: "var(--labs-text)", fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-display)" }}>
          {value}
        </span>
        {suffix && <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{suffix}</span>}
        {trend === "up" && <TrendingUp className="w-3 h-3" style={{ color: "var(--labs-success)" }} />}
        {trend === "down" && <TrendingDown className="w-3 h-3" style={{ color: "var(--labs-danger)" }} />}
      </div>
      {infoOpen && infoText && (
        <p
          data-testid={testId ? `text-info-${testId}` : undefined}
          style={{
            fontSize: 11, lineHeight: 1.4, color: "var(--labs-text-muted)", margin: "6px 0 0 0",
            animation: "labsFadeIn 150ms ease-out both",
          }}
        >
          {infoText}
        </p>
      )}
    </div>
  );
}

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} style={{ margin: "8px 0 16px 0", paddingLeft: 20 }}>
          {listItems.map((item, i) => (
            <li key={i} style={{ fontSize: 14, lineHeight: 1.7, color: "var(--labs-text)", marginBottom: 4 }}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const renderInline = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    const boldRegex = /\*\*(.+?)\*\*/g;
    let match;
    let lastIndex = 0;
    let idx = 0;
    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
      parts.push(<strong key={idx++} style={{ fontWeight: 600, color: "var(--labs-text)" }}>{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return parts.length > 0 ? parts : text;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^---+$/)) { flushList(); elements.push(<hr key={`hr-${i}`} style={{ border: "none", borderTop: "1px solid var(--labs-border)", margin: "24px 0" }} />); continue; }
    if (line.startsWith("### ")) { flushList(); elements.push(<h3 key={`h3-${i}`} className="labs-serif" style={{ fontSize: 16, fontWeight: 700, color: "var(--labs-text)", margin: "20px 0 8px" }}>{line.slice(4)}</h3>); continue; }
    if (line.startsWith("## ")) { flushList(); elements.push(<h2 key={`h2-${i}`} className="labs-serif" style={{ fontSize: 20, fontWeight: 700, color: "var(--labs-text)", margin: "24px 0 10px" }}>{line.slice(3)}</h2>); continue; }
    if (line.startsWith("# ")) { flushList(); elements.push(<h1 key={`h1-${i}`} className="labs-serif" style={{ fontSize: 24, fontWeight: 700, color: "var(--labs-text)", margin: "28px 0 12px" }}>{line.slice(2)}</h1>); continue; }
    if (line.match(/^[-*]\s/)) { listItems.push(line.replace(/^[-*]\s/, "")); continue; }
    flushList();
    if (line.trim() === "") continue;
    elements.push(<p key={`p-${i}`} style={{ fontSize: 14, lineHeight: 1.7, color: "var(--labs-text)", margin: "0 0 12px" }}>{renderInline(line)}</p>);
  }
  flushList();
  return <div>{elements}</div>;
}

function SkeletonLoader({ message, onSkip, skipLabel }: { message: string; onSkip?: () => void; skipLabel?: string }) {
  const [showSkip, setShowSkip] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShowSkip(true), 2000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div style={{ padding: "32px 0" }} data-testid="connoisseur-generating">
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ position: "relative", display: "inline-block" }}>
          <Sparkles className="w-8 h-8" style={{ color: "var(--labs-accent)", animation: "connoisseur-pulse 2s ease-in-out infinite" }} />
          <span style={{
            position: "absolute", top: -2, right: -6, width: 8, height: 8, borderRadius: "50%",
            background: "var(--labs-accent)", animation: "connoisseur-dot-pulse 1.5s ease-in-out infinite",
          }} />
        </div>
        <p className="text-sm mt-3 font-medium" style={{ color: "var(--labs-accent)" }}>{message}</p>
        {showSkip && onSkip && (
          <button
            onClick={onSkip}
            className="labs-btn-ghost mt-2"
            style={{ fontSize: 12, color: "var(--labs-text-muted)", textDecoration: "underline", cursor: "pointer", border: "none", background: "none", fontFamily: "inherit" }}
            data-testid="button-skip-generating"
          >
            {skipLabel || "Show immediately"}
          </button>
        )}
      </div>
      {[100, 85, 92, 70, 88, 95, 60].map((w, i) => (
        <div key={i} style={{ height: i === 0 ? 24 : 14, width: `${w}%`, background: "color-mix(in srgb, var(--labs-accent) 10%, transparent)", borderRadius: 6, marginBottom: i === 0 ? 16 : 10, animation: "connoisseur-pulse 2s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
      ))}
      <style>{`
        @keyframes connoisseur-pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        @keyframes connoisseur-dot-pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
      `}</style>
    </div>
  );
}

type TabKey = "report" | "whiskys" | "aromas" | "history";

function TabBar({ active, onChange, historyCount, t }: {
  active: TabKey;
  onChange: (t: TabKey) => void;
  historyCount: number;
  t: (key: string, fallback: string) => string;
}) {
  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "report", label: t("labs.connoisseur.tabReport", "Report"), icon: FileText },
    { key: "whiskys", label: t("labs.connoisseur.tabWhiskys", "Whiskys"), icon: Wine },
    { key: "aromas", label: t("labs.connoisseur.tabAromas", "Aromas"), icon: Droplets },
    { key: "history", label: `${t("labs.connoisseur.tabHistory", "History")}${historyCount > 0 ? ` (${historyCount})` : ""}`, icon: BarChart3 },
  ];

  return (
    <div style={{
      display: "flex", gap: 0, borderRadius: 12, overflow: "hidden",
      background: "var(--labs-surface)", border: "1px solid var(--labs-border)",
      marginBottom: 20,
    }} data-testid="connoisseur-tabs">
      {tabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          data-testid={`tab-${key}`}
          style={{
            flex: 1, padding: "10px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            background: active === key ? "color-mix(in srgb, var(--labs-accent) 12%, transparent)" : "transparent",
            border: "none", cursor: "pointer", fontFamily: "inherit",
            borderBottom: active === key ? "2px solid var(--labs-accent)" : "2px solid transparent",
            transition: "all 0.2s",
          }}
        >
          <Icon className="w-4 h-4" style={{ color: active === key ? "var(--labs-accent)" : "var(--labs-text-muted)" }} />
          <span style={{ fontSize: 11, fontWeight: active === key ? 600 : 500, color: active === key ? "var(--labs-accent)" : "var(--labs-text-muted)" }}>{label}</span>
        </button>
      ))}
    </div>
  );
}

function WhiskysTab({ snapshot, fallback, savedKeys, t }: { snapshot: DataSnapshot; fallback?: WhiskySummary[]; savedKeys: Set<string>; t: (key: string, fallback: string) => string }) {
  const snapshotSummaries = snapshot.whiskySummaries || [];
  const whiskySummaries = snapshotSummaries.length > 0 ? snapshotSummaries : (fallback || []);
  const sorted = [...whiskySummaries].sort((a, b) => (b.scores?.overall || 0) - (a.scores?.overall || 0));

  if (sorted.length === 0) {
    return (
      <div style={{ padding: "32px 16px", textAlign: "center" }}>
        <Wine className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--labs-accent)", opacity: 0.5 }} />
        <p style={{ color: "var(--labs-text-muted)", fontSize: 13 }}>{t("labs.connoisseur.noWhiskys", "No whiskies rated yet.")}</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }} data-testid="connoisseur-whiskys-tab">
      {sorted.map((w, i) => (
        <div key={i} style={{
          background: "var(--labs-surface)", borderRadius: 12, padding: "12px 14px",
          borderLeft: i === 0 ? "3px solid var(--labs-accent)" : i === sorted.length - 1 ? "3px solid var(--labs-danger)" : "3px solid transparent",
        }} data-testid={`whisky-row-${i}`}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: i < 3 ? "var(--labs-accent)" : "var(--labs-text-muted)", width: 20, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
              {i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0 }}>{w.name}</p>
                {savedKeys.has(wishlistKey(w.name, w.distillery)) && (
                  <WishlistBadge size="xs" testId={`badge-wishlist-whisky-${i}`} />
                )}
              </div>
              {(w.distillery || w.country || w.region) && <p style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 1 }}>{[w.distillery, w.country, w.region].filter(Boolean).join(" · ")}</p>}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {w.vsGroupOverall != null && (
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "2px 6px", borderRadius: 6,
                  color: w.vsGroupOverall > 0 ? "var(--labs-success)" : w.vsGroupOverall < 0 ? "var(--labs-danger)" : "var(--labs-text-muted)",
                  background: w.vsGroupOverall > 0 ? "color-mix(in srgb, var(--labs-success) 10%, transparent)" : w.vsGroupOverall < 0 ? "color-mix(in srgb, var(--labs-danger) 10%, transparent)" : "transparent",
                }}>
                  {Number(w.vsGroupOverall) > 0 ? "+" : ""}{Number(w.vsGroupOverall).toFixed(1)}
                </span>
              )}
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--labs-text)", fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-display)" }}>
                {w.scores?.overall != null ? Math.round(w.scores.overall) : "—"}
              </span>
            </div>
          </div>
          {w.flavors && w.flavors.length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8, paddingLeft: 32 }}>
              {w.flavors.slice(0, 5).map((f, fi) => (
                <span key={fi} style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 10,
                  background: "color-mix(in srgb, var(--labs-accent) 8%, transparent)", color: "var(--labs-text-muted)",
                }}>{f}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AromasTab({ snapshot, t }: { snapshot: DataSnapshot; t: (key: string, fallback: string) => string }) {
  const regionBreakdown = snapshot.regionBreakdown || [];
  const avgScores = snapshot.avgScores || {};
  const dims: { key: keyof DimensionScores; label: string; color: string }[] = [
    { key: "nose", label: t("labs.connoisseur.dimNose", "Nose"), color: "var(--labs-dim-nose)" },
    { key: "taste", label: t("labs.connoisseur.dimTaste", "Taste"), color: "var(--labs-dim-taste)" },
    { key: "finish", label: t("labs.connoisseur.dimFinish", "Finish"), color: "var(--labs-dim-finish)" },
    { key: "overall", label: t("labs.connoisseur.dimOverall", "Overall"), color: "var(--labs-accent)" },
  ].filter(d => avgScores[d.key] != null);

  const allFlavors: Record<string, number> = {};
  for (const ws of (snapshot.whiskySummaries || [])) {
    for (const f of (ws.flavors || [])) {
      allFlavors[f] = (allFlavors[f] || 0) + 1;
    }
  }
  const flavorCloud = Object.entries(allFlavors).sort((a, b) => b[1] - a[1]).slice(0, 20);

  return (
    <div data-testid="connoisseur-aromas-tab">
      {flavorCloud.length > 0 && (
        <>
          <p className="labs-section-label mb-3">{t("labs.connoisseur.flavorCloud", "Flavor Cloud")}</p>
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24,
            padding: "16px 14px", background: "var(--labs-surface)", borderRadius: 14,
          }} data-testid="flavor-cloud">
            {flavorCloud.map(([flavor, count]) => {
              const maxCount = flavorCloud[0][1];
              const scale = 0.7 + (count / maxCount) * 0.6;
              return (
                <span key={flavor} style={{
                  fontSize: Math.round(11 * scale), fontWeight: count >= maxCount * 0.5 ? 600 : 400,
                  padding: `${Math.round(3 * scale)}px ${Math.round(10 * scale)}px`,
                  borderRadius: 12, color: "var(--labs-text)",
                  background: `color-mix(in srgb, var(--labs-accent) ${Math.round(6 + (count / maxCount) * 14)}%, transparent)`,
                  border: count >= maxCount * 0.7 ? "1px solid color-mix(in srgb, var(--labs-accent) 25%, transparent)" : "1px solid transparent",
                }}>{flavor}</span>
              );
            })}
          </div>
        </>
      )}

      <p className="labs-section-label mb-3">{t("labs.connoisseur.dimensionAvg", "Dimension Averages")}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 24 }}>
        {dims.map(d => {
          const val = avgScores[d.key];
          return (
            <div key={d.key} style={{ background: "var(--labs-surface)", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "var(--labs-text-muted)", fontWeight: 500 }}>{d.label}</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: d.color, fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-display)" }}>
                  {val != null ? Math.round(val) : "—"}
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "rgba(201,167,108,0.1)" }}>
                <div style={{ height: 4, borderRadius: 2, background: d.color, width: `${Math.min(val || 0, 100)}%`, transition: "width 0.5s ease" }} />
              </div>
            </div>
          );
        })}
      </div>

      {(() => {
        const countryCounts: Record<string, number> = {};
        for (const ws of (snapshot.whiskySummaries || [])) {
          if (ws.country) countryCounts[ws.country] = (countryCounts[ws.country] || 0) + 1;
        }
        const countryEntries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
        const maxCount = countryEntries.length > 0 ? countryEntries[0][1] : 0;
        if (countryEntries.length === 0) return null;
        return (
          <>
            <p className="labs-section-label mb-3">{t("labs.connoisseur.countryDistribution", "Country Distribution")}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
              {countryEntries.map(([country, count], i) => (
                <div key={country} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                  background: "var(--labs-surface)", borderRadius: 10,
                }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: i === 0 ? "var(--labs-accent)" : "var(--labs-text-muted)", opacity: i === 0 ? 1 : 0.6, width: 24, fontFamily: "var(--font-display)" }}>
                    {i + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)" }}>{country}</span>
                    <span style={{ fontSize: 11, color: "var(--labs-text-muted)", marginLeft: 8 }}>{count} {t("labs.connoisseur.rated", "rated")}</span>
                  </div>
                  <div style={{ flex: 1, maxWidth: 80 }}>
                    <div style={{ height: 4, borderRadius: 2, background: "rgba(201,167,108,0.1)" }}>
                      <div style={{ height: 4, borderRadius: 2, background: "var(--labs-accent)", width: `${(count / maxCount) * 100}%`, transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      })()}

      {regionBreakdown.length > 0 && (
        <>
          <p className="labs-section-label mb-3">{t("labs.connoisseur.regionPreferences", "Region Preferences")}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {regionBreakdown.slice(0, 6).map((r, i) => (
              <div key={r.region} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                background: "var(--labs-surface)", borderRadius: 10,
              }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: i === 0 ? "var(--labs-accent)" : "var(--labs-text-muted)", opacity: i === 0 ? 1 : 0.6, width: 24, fontFamily: "var(--font-display)" }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)" }}>{r.region}</span>
                  <span style={{ fontSize: 11, color: "var(--labs-text-muted)", marginLeft: 8 }}>{r.count} {t("labs.connoisseur.rated", "rated")}</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-accent)", fontVariantNumeric: "tabular-nums" }}>
                  {r.avgScore != null ? Number(r.avgScore).toFixed(1) : "—"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {(snapshot.smokeAffinityIndex != null || snapshot.sweetnessBias != null) && (
        <>
          <p className="labs-section-label mt-5 mb-3">{t("labs.connoisseur.palateIndices", "Palate Indices")}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {snapshot.smokeAffinityIndex != null && (
              <div style={{ background: "var(--labs-surface)", borderRadius: 12, padding: "12px 14px" }}>
                <span style={{ fontSize: 10, color: "var(--labs-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{t("labs.connoisseur.smokeAffinity", "Smoke Affinity")}</span>
                <p style={{ fontSize: 20, fontWeight: 700, color: "var(--labs-text)", marginTop: 4, fontFamily: "var(--font-display)" }}>
                  {(Number(snapshot.smokeAffinityIndex) * 100).toFixed(0)}%
                </p>
              </div>
            )}
            {snapshot.sweetnessBias != null && (
              <div style={{ background: "var(--labs-surface)", borderRadius: 12, padding: "12px 14px" }}>
                <span style={{ fontSize: 10, color: "var(--labs-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{t("labs.connoisseur.sweetnessBias", "Sweetness Bias")}</span>
                <p style={{ fontSize: 20, fontWeight: 700, color: "var(--labs-text)", marginTop: 4, fontFamily: "var(--font-display)" }}>
                  {(Number(snapshot.sweetnessBias) * 100).toFixed(0)}%
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function HistoryBarChart({ reports }: { reports: ConnoisseurReport[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const last5 = reports.slice(0, 5).reverse();
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || last5.length === 0) return;
    const w = 280, h = 120;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const scores = last5.map(r => r.dataSnapshot?.avgScores?.overall ?? 0);
    const maxScore = Math.max(...scores, 50);
    const barW = Math.min(36, (w - 20) / last5.length - 8);
    const gap = (w - last5.length * barW) / (last5.length + 1);

    const avgAll = scores.reduce((s, v) => s + v, 0) / scores.length;
    const avgY = h - 20 - ((avgAll / maxScore) * (h - 36));
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, avgY);
    ctx.lineTo(w, avgY);
    ctx.strokeStyle = "rgba(201,167,108,0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);

    last5.forEach((r, i) => {
      const score = r.dataSnapshot?.avgScores?.overall ?? 0;
      const barH = (score / maxScore) * (h - 36);
      const x = gap + i * (barW + gap);
      const y = h - 20 - barH;
      const grad = ctx.createLinearGradient(x, y, x, h - 20);
      grad.addColorStop(0, "rgba(201,167,108,0.8)");
      grad.addColorStop(1, "rgba(201,167,108,0.3)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
      ctx.fill();

      ctx.font = "600 10px 'DM Sans', Inter, sans-serif";
      ctx.fillStyle = "rgba(203,187,163,0.7)";
      ctx.textAlign = "center";
      const date = new Date(r.generatedAt);
      ctx.fillText(`${date.getMonth() + 1}/${date.getDate()}`, x + barW / 2, h - 6);

      if (score > 0) {
        ctx.fillStyle = "rgba(201,167,108,0.9)";
        ctx.fillText(Math.round(score).toString(), x + barW / 2, y - 6);
      }

      if (i > 0) {
        const prevScore = scores[i - 1];
        const delta = score - prevScore;
        if (delta !== 0) {
          const prevX = gap + (i - 1) * (barW + gap);
          const midX = (prevX + barW / 2 + x + barW / 2) / 2;
          const midY = Math.min(y, h - 20 - ((prevScore / maxScore) * (h - 36))) - 2;
          ctx.font = "600 9px 'DM Sans', Inter, sans-serif";
          ctx.fillStyle = delta > 0 ? "rgba(76,175,80,0.8)" : "rgba(239,83,80,0.8)";
          ctx.textAlign = "center";
          ctx.fillText(`${delta > 0 ? "+" : ""}${delta.toFixed(1)}`, midX, midY);
        }
      }
    });
  }, [last5]);

  if (last5.length === 0) return null;
  return <canvas ref={canvasRef} data-testid="canvas-history-chart" style={{ display: "block", margin: "0 auto 16px" }} />;
}

function HistoryTab({ reports, allReports, onDelete, expandedId, onToggleExpand, t }: {
  reports: ConnoisseurReport[];
  allReports: ConnoisseurReport[];
  onDelete: (id: string) => void;
  expandedId: string | null;
  onToggleExpand: (id: string | null) => void;
  t: (key: string, fallback: string) => string;
}) {
  if (reports.length === 0) {
    return (
      <div style={{ padding: "32px 16px", textAlign: "center" }} data-testid="connoisseur-history-empty">
        <FileText className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--labs-accent)", opacity: 0.5 }} />
        <p style={{ color: "var(--labs-text-muted)", fontSize: 13 }}>{t("labs.connoisseur.noHistory", "No previous reports yet.")}</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }} data-testid="connoisseur-history-tab">
      {allReports.length >= 2 && (
        <div style={{ background: "var(--labs-surface)", borderRadius: 14, padding: "16px 12px", marginBottom: 8 }}>
          <p className="labs-section-label mb-3" style={{ textAlign: "center" }}>{t("labs.connoisseur.avgTrend", "Avg Score Trend")}</p>
          <HistoryBarChart reports={allReports} />
        </div>
      )}
      {reports.map(report => (
        <div key={report.id} className="labs-card" style={{ overflow: "hidden" }} data-testid={`card-report-${report.id}`}>
          <button
            onClick={() => onToggleExpand(expandedId === report.id ? null : report.id)}
            className="w-full labs-btn-ghost"
            style={{ display: "flex", alignItems: "center", padding: "14px 16px", gap: 12, textAlign: "left" }}
            data-testid={`button-expand-report-${report.id}`}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: "color-mix(in srgb, var(--labs-accent) 10%, transparent)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Globe className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, color: "var(--labs-text-muted)", marginBottom: 2 }}>
                {new Date(report.generatedAt).toLocaleDateString(report.language === "de" ? "de-DE" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
              <p style={{ fontSize: 12, color: "var(--labs-text-secondary)", lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {report.summary}
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
                background: "color-mix(in srgb, var(--labs-accent) 8%, transparent)", color: "var(--labs-accent)",
                textTransform: "uppercase",
              }}>
                {report.language?.toUpperCase() || "EN"}
              </span>
              {report.dataSnapshot?.avgScores?.overall != null && (
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--labs-text)", fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-display)" }}>
                  {Math.round(report.dataSnapshot.avgScores.overall)}
                </span>
              )}
            </div>
          </button>
          {expandedId === report.id && (
            <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--labs-border)" }}>
              <div style={{ paddingTop: 16 }}>
                <MarkdownRenderer content={report.reportContent} />
              </div>
              <button
                onClick={e => { e.stopPropagation(); onDelete(report.id); }}
                className="labs-btn-ghost mt-3"
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, border: "1px solid var(--labs-border)", borderRadius: 8, padding: "8px 12px", color: "var(--labs-danger)" }}
                data-testid={`button-delete-report-${report.id}`}
              >
                <Trash2 className="w-3 h-3" /> {t("labs.connoisseur.delete", "Delete")}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function LabsConnoisseur() {
  const { t } = useTranslation();
  const session = useSession();
  const pid = session.pid;
  const queryClient = useQueryClient();
  const savedKeys = useWishlistKeys(pid);
  const urlParams = useMemo(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      return { tastingId: p.get("tastingId") || undefined, generating: p.get("generating") === "1" };
    } catch { return { tastingId: undefined, generating: false }; }
  }, []);
  const urlTastingId = urlParams.tastingId;
  const [externalGenPending, setExternalGenPending] = useState(urlParams.generating);
  const externalGenStartTime = useRef(Date.now());
  const externalGenPollCount = useRef(0);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("report");
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showHighestInfo, setShowHighestInfo] = useState(false);
  const [showLowestInfo, setShowLowestInfo] = useState(false);
  const [aiLang, setAiLang] = useState<"de" | "en">("en");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [promptOpen, setPromptOpen] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [skipAnimation, setSkipAnimation] = useState(false);

  const { data: reports = [], isLoading, isError: reportsError } = useQuery<ConnoisseurReport[]>({
    queryKey: ["connoisseur-reports", pid],
    queryFn: async () => {
      if (!pid) return [];
      const res = await fetch(`/api/participants/${pid}/connoisseur-reports`, { headers: pidHeaders() });
      if (!res.ok) throw new Error("Failed to load reports");
      const data = await res.json();
      if (externalGenPending) {
        externalGenPollCount.current += 1;
        const hasRecentReport = data.length > 0 && new Date(data[0].generatedAt).getTime() > externalGenStartTime.current - 30000;
        const timedOut = Date.now() - externalGenStartTime.current > 45000;
        const enoughPolls = externalGenPollCount.current >= 10;
        if (hasRecentReport || timedOut || enoughPolls) {
          setExternalGenPending(false);
        }
      }
      return data;
    },
    enabled: !!pid,
    retry: 2,
    refetchInterval: externalGenPending ? 3000 : false,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      let res: Response;
      try {
        res = await fetch(`/api/participants/${pid}/connoisseur-report`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...pidHeaders() },
          body: JSON.stringify({ language: aiLang, ...(customPrompt.trim() ? { customPrompt: customPrompt.trim() } : {}), ...(urlTastingId ? { tastingId: urlTastingId } : {}) }),
        });
      } catch {
        throw new Error(t("labs.connoisseur.networkError", "Connection lost. Please check your connection and try again."));
      }
      if (!res.ok) {
        const err: Record<string, string> = await res.json().catch(() => ({}));
        throw new Error(err.message || t("labs.connoisseur.generationFailed", "Generation failed. Please try again."));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connoisseur-reports", pid] });
      setActiveTab("report");
      setSkipAnimation(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const res = await fetch(`/api/participants/${pid}/connoisseur-reports/${reportId}`, { method: "DELETE", headers: pidHeaders() });
      if (!res.ok) {
        const err: Record<string, string> = await res.json().catch(() => ({}));
        throw new Error(err.message || "Delete failed");
      }
    },
    onSuccess: () => { setConfirmDeleteId(null); queryClient.invalidateQueries({ queryKey: ["connoisseur-reports", pid] }); },
  });

  const [viewLang, setViewLang] = useState<"de" | "en">(aiLang);

  const latestReport = reports.length > 0 ? reports[0] : null;
  const previousReports = reports.slice(1);
  const snap: DataSnapshot = latestReport?.dataSnapshot || {};

  const displaySections = useMemo(() => {
    if (!latestReport) return null;
    const s = latestReport.dataSnapshot;
    const lang = viewLang;
    const profile = lang === "de" ? s?.palateProfileDe : s?.palateProfileEn;
    const highlights = lang === "de" ? s?.tastingHighlightsDe : s?.tastingHighlightsEn;
    const recommendation = lang === "de" ? s?.recommendationDe : s?.recommendationEn;
    const quote = lang === "de" ? s?.quoteDe : s?.quoteEn;
    if (profile || highlights || recommendation) {
      return { profile: profile || null, highlights: highlights || null, recommendation: recommendation || null, quote: quote || null };
    }
    return null;
  }, [latestReport, viewLang]);

  const displayReport = useMemo(() => {
    if (!latestReport) return null;
    const s = latestReport.dataSnapshot;
    if (viewLang === "de" && s?.reportDe) return s.reportDe;
    if (viewLang === "en" && s?.reportEn) return s.reportEn;
    return latestReport.reportContent;
  }, [latestReport, viewLang]);

  const displayQuote = useMemo(() => {
    if (!latestReport) return null;
    const s = latestReport.dataSnapshot;
    return (viewLang === "de" ? s?.quoteDe : s?.quoteEn) || null;
  }, [latestReport, viewLang]);

  const displaySummary = useMemo(() => {
    if (!latestReport) return null;
    const s = latestReport.dataSnapshot;
    if (viewLang === "de" && s?.summaryDe) return s.summaryDe;
    if (viewLang === "en" && s?.summaryEn) return s.summaryEn;
    return latestReport.summary;
  }, [latestReport, viewLang]);

  const hasDualLang = !!(latestReport?.dataSnapshot?.reportEn && latestReport?.dataSnapshot?.reportDe);

  const avgScores = useMemo(() => snap.avgScores || {}, [snap]);
  const userAvg = useMemo(() => avgScores.overall != null ? formatScore(avgScores.overall) : null, [avgScores]);
  const vsGroup = useMemo(() => snap.vsGroupDelta != null ? snap.vsGroupDelta : null, [snap]);
  const highest = useMemo(() => snap.highestWhisky || null, [snap]);
  const lowest = useMemo(() => snap.lowestWhisky || null, [snap]);

  const copySummary = useCallback(async () => {
    if (!latestReport?.summary) return;
    try { await navigator.clipboard.writeText(latestReport.summary); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }, [latestReport]);

  const downloadPdf = useCallback(async () => {
    if (!latestReport) return;
    try {
      let participantPhotoUrl: string | undefined;
      if (pid) {
        try {
          const profile = await profileApi.get(pid);
          if (profile?.photoUrl) participantPhotoUrl = profile.photoUrl;
        } catch {}
      }
      const mod = await import("@/components/connoisseur-report-pdf");
      await mod.generateConnoisseurReportPdf({
        report: latestReport as Parameters<typeof mod.generateConnoisseurReportPdf>[0]["report"],
        participantName: stripGuestSuffix(session.name || "Participant"),
        language: latestReport.language || "en",
        participantPhotoUrl,
      });
    } catch (e) {
      console.error("PDF generation failed:", e);
      setErrorToast("PDF generation failed. Please try again.");
      setTimeout(() => setErrorToast(null), 4000);
    }
  }, [latestReport, pid, session.name]);

  const shareReport = useCallback(async () => {
    if (!latestReport?.summary) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: "CaskSense Connoisseur Report", text: latestReport.summary });
      } else {
        await navigator.clipboard.writeText(latestReport.summary);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (e) {
      console.error("Share failed:", e);
    }
  }, [latestReport]);

  if (!session.signedIn || !pid) {
    return (
      <div className="labs-empty" style={{ minHeight: "60vh" }}>
        <Sparkles className="w-12 h-12 mb-4" style={{ color: "var(--labs-accent)" }} />
        <p style={{ color: "var(--labs-text)", fontSize: 16, fontWeight: 600 }}>{t("labs.connoisseur.title", "Connoisseur Report")}</p>
        <p style={{ color: "var(--labs-text-muted)", fontSize: 13 }}>{t("labs.connoisseur.subtitle", "Your personal whisky profile, analyzed by AI")}</p>
      </div>
    );
  }

  return (
    <div className="labs-page" data-testid="labs-connoisseur">
      <BackLink href="/labs/taste" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-connoisseur">
          <ChevronLeft className="w-4 h-4" /> {t("common.back", "Back")}
        </button>
      </BackLink>

      {/* Cover Section */}
      <div className="labs-fade-in" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, var(--labs-accent), var(--labs-gold))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Sparkles className="w-5 h-5" style={{ color: "#fff" }} />
          </div>
          <div>
            <h1 className="labs-h2" style={{ color: "var(--labs-text)", margin: 0 }} data-testid="text-connoisseur-title">
              {t("labs.connoisseur.title", "Connoisseur Report")}
            </h1>
            <p style={{ color: "var(--labs-text-muted)", fontSize: 12, margin: 0 }}>
              {t("labs.connoisseur.subtitle", "Your personal whisky profile, analyzed by AI")}
            </p>
          </div>
        </div>

        {/* Context Subtitle */}
        {latestReport && (
          <p style={{ color: "var(--labs-text-muted)", fontSize: 12, margin: "4px 0 0", lineHeight: 1.4 }}>
            {snap.totalRatings != null ? `${snap.totalRatings} ${t("labs.connoisseur.ratings", "ratings")}` : ""}
            {snap.totalRatings != null && snap.whiskySummaries?.length ? ` · ${snap.whiskySummaries.length} ${t("labs.connoisseur.whiskies", "whiskies")}` : ""}
            {snap.avgScores?.overall != null ? ` · ${t("labs.connoisseur.avg", "Avg")} ${Number(snap.avgScores.overall).toFixed(1)}` : ""}
          </p>
        )}

        {/* Meta pills */}
        {latestReport && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <span style={{
              fontSize: 11, padding: "4px 10px", borderRadius: 20, fontWeight: 500,
              background: "color-mix(in srgb, var(--labs-accent) 10%, transparent)", color: "var(--labs-accent)",
            }}>
              {new Date(latestReport.generatedAt).toLocaleDateString(latestReport.language === "de" ? "de-DE" : "en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            {snap.totalRatings != null && (
              <span style={{
                fontSize: 11, padding: "4px 10px", borderRadius: 20, fontWeight: 500,
                background: "color-mix(in srgb, var(--labs-info) 10%, transparent)", color: "var(--labs-info)",
              }}>
                {snap.totalRatings} {t("labs.connoisseur.ratings", "ratings")}
              </span>
            )}
            {snap.totalTastings != null && snap.totalTastings > 0 && (
              <span style={{
                fontSize: 11, padding: "4px 10px", borderRadius: 20, fontWeight: 500,
                background: "color-mix(in srgb, var(--labs-info) 10%, transparent)", color: "var(--labs-info)",
              }}>
                {snap.totalTastings} {t("labs.connoisseur.tastings", "tastings")}
              </span>
            )}
            <span style={{
              fontSize: 11, padding: "4px 10px", borderRadius: 20, fontWeight: 500,
              background: "color-mix(in srgb, var(--labs-accent) 10%, transparent)", color: "var(--labs-accent)",
            }}>
              {(latestReport.language || "en").toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Language Toggle + Custom Prompt */}
      <div className="labs-card p-4 mb-4 labs-fade-in">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: promptOpen ? 12 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Globe className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{t("labs.connoisseur.language", "Language")}</span>
          </div>
          <div style={{
            display: "flex", borderRadius: 8, overflow: "hidden",
            border: "1px solid var(--labs-border)",
          }}>
            {(["en", "de"] as const).map(lang => {
              const isActive = hasDualLang ? viewLang === lang : aiLang === lang;
              return (
                <button
                  key={lang}
                  onClick={() => { if (hasDualLang) setViewLang(lang); setAiLang(lang); }}
                  data-testid={`button-lang-${lang}`}
                  style={{
                    padding: "6px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    border: "none",
                    background: isActive ? "var(--labs-accent)" : "transparent",
                    color: isActive ? "var(--labs-bg)" : "var(--labs-text-muted)",
                    transition: "all 0.2s",
                  }}
                >
                  {lang.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>

        {promptOpen && (
          <textarea
            value={customPrompt}
            onChange={e => setCustomPrompt(e.target.value)}
            placeholder={t("labs.customPrompt.connoisseurPlaceholder", "e.g. 'Focus on smoky whiskies' or 'Compare with my last tasting'")}
            data-testid="input-custom-prompt"
            style={{
              width: "100%", padding: 12, background: "var(--labs-bg)", border: "1px solid var(--labs-border)",
              borderRadius: 8, color: "var(--labs-text)", fontSize: 13, resize: "none", fontFamily: "inherit", outline: "none", minHeight: 60,
            }}
            rows={3}
          />
        )}

        <button
          onClick={() => setPromptOpen(!promptOpen)}
          className="labs-btn-ghost"
          style={{ fontSize: 11, color: "var(--labs-text-muted)", padding: "4px 0", marginTop: promptOpen ? 8 : 8 }}
          data-testid="button-toggle-prompt"
        >
          {promptOpen ? t("labs.connoisseur.hideHint", "Hide focus hint") : t("labs.connoisseur.addHint", "Add focus hint...")}
        </button>
      </div>

      {/* Generate Button */}
      <button
        onClick={() => generateMutation.mutate()}
        disabled={generateMutation.isPending}
        className="labs-btn-primary w-full mb-6 labs-fade-in"
        style={{
          padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          opacity: generateMutation.isPending ? 0.6 : 1,
          background: "linear-gradient(135deg, var(--labs-accent), var(--labs-gold))",
        }}
        data-testid="button-generate-report"
      >
        <Sparkles className="w-4 h-4" />
        {generateMutation.isPending
          ? t("labs.connoisseur.generating", "Analyzing your whisky journey...")
          : latestReport
            ? t("labs.connoisseur.generate", "Generate Report")
            : t("labs.connoisseur.generate", "Generate Report")}
      </button>

      {(generateMutation.isPending || externalGenPending) && !skipAnimation && (
        <SkeletonLoader
          message={t("labs.connoisseur.generating", "Analyzing your whisky journey...")}
          onSkip={() => { setSkipAnimation(true); }}
          skipLabel={t("labs.connoisseur.showImmediately", "Show immediately")}
        />
      )}
      {(generateMutation.isPending || externalGenPending) && skipAnimation && (
        <div style={{ textAlign: "center", padding: "24px 0" }} data-testid="connoisseur-waiting">
          <Sparkles className="w-5 h-5 mx-auto mb-2" style={{ color: "var(--labs-accent)", opacity: 0.6 }} />
          <p style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>{t("labs.connoisseur.waitingResult", "Waiting for result...")}</p>
        </div>
      )}

      {generateMutation.isError && (
        <div className="labs-card mb-4" style={{ borderColor: "var(--labs-danger)", padding: 16 }} data-testid="text-connoisseur-error">
          <p className="text-sm mb-3" style={{ color: "var(--labs-danger)" }}>
            {generateMutation.error?.message || t("labs.connoisseur.generationFailed", "Generation failed. Please try again.")}
          </p>
          <button onClick={() => generateMutation.mutate()} className="labs-btn-primary" style={{ padding: "8px 16px", fontSize: 13 }} data-testid="button-retry-generate">
            {t("labs.connoisseur.retry", "Try again")}
          </button>
        </div>
      )}

      {/* Report Content */}
      {!generateMutation.isPending && !externalGenPending && latestReport && (
        <>
          {/* AI Headline / Summary */}
          {displaySummary && (
            <div className="labs-fade-in" style={{
              padding: "20px 24px", marginBottom: 20, borderRadius: 16,
              background: "linear-gradient(135deg, color-mix(in srgb, var(--labs-accent) 6%, var(--labs-bg)), color-mix(in srgb, var(--labs-gold) 4%, var(--labs-bg)))",
              borderLeft: "3px solid var(--labs-accent)",
            }} data-testid="card-ai-headline">
              <p className="labs-serif" style={{
                fontSize: 16, lineHeight: 1.6, fontWeight: 400, fontStyle: "italic",
                color: "var(--labs-text)", margin: 0,
              }} data-testid="text-connoisseur-summary">
                "{displaySummary}"
              </p>
            </div>
          )}

          {/* Stat Cards Row */}
          <div className="labs-fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }} data-testid="stat-cards-row">
            <StatCard
              label={t("labs.connoisseur.avgScore", "Avg Score")}
              value={userAvg != null ? userAvg : "—"}
              icon={BarChart3}
              infoText={t("labs.connoisseur.connoisseurScoreDesc", "Your average score across all rated whiskies.")}
              infoOpen={showScoreInfo}
              onToggleInfo={() => setShowScoreInfo(v => !v)}
              testId="avg-score"
            />
            <StatCard
              label={t("labs.connoisseur.vsGroup", "vs Group")}
              value={vsGroup != null ? `${Number(vsGroup) > 0 ? "+" : ""}${Number(vsGroup).toFixed(1)}` : "—"}
              icon={TrendingUp}
              trend={vsGroup != null ? (vsGroup > 0 ? "up" : vsGroup < 0 ? "down" : "neutral") : undefined}
              infoText={t("labs.connoisseur.connoisseurGroupDesc", "How your average compares to the community average. Positive values mean you rate higher than the group.")}
              infoOpen={showGroupInfo}
              onToggleInfo={() => setShowGroupInfo(v => !v)}
              testId="vs-group"
            />
            <StatCard
              label={t("labs.connoisseur.highest", "Highest")}
              value={highest?.score != null ? Math.round(highest.score).toString() : "—"}
              suffix={highest?.name ? highest.name.slice(0, 16) : (highest?.score == null ? t("labs.connoisseur.regenerateToDisplay", "Regenerate the report to display.") : undefined)}
              icon={Award}
              infoText={t("labs.connoisseur.connoisseurHighestDesc", "The highest-rated whisky from your tastings and journal entries.")}
              infoOpen={showHighestInfo}
              onToggleInfo={() => setShowHighestInfo(v => !v)}
              testId="highest"
            />
            <StatCard
              label={t("labs.connoisseur.lowest", "Lowest")}
              value={lowest?.score != null ? Math.round(lowest.score).toString() : "—"}
              suffix={lowest?.name ? lowest.name.slice(0, 16) : (lowest?.score == null ? t("labs.connoisseur.regenerateToDisplay", "Regenerate the report to display.") : undefined)}
              icon={Wine}
              infoText={t("labs.connoisseur.connoisseurLowestDesc", "The lowest-rated whisky from your tastings and journal entries.")}
              infoOpen={showLowestInfo}
              onToggleInfo={() => setShowLowestInfo(v => !v)}
              testId="lowest"
            />
          </div>

          {/* Radar Chart */}
          {avgScores.nose != null && (
            <div className="labs-card labs-fade-in" style={{ padding: "20px 16px", marginBottom: 20, display: "flex", justifyContent: "center" }}>
              <RadarChart
                userScores={avgScores}
                groupScores={snap.groupAvgScores?.nose != null ? snap.groupAvgScores : null}
                size={240}
                legendYou={t("labs.connoisseur.legendYou", "You")}
                legendCommunity={t("labs.connoisseur.legendCommunity", "Community")}
              />
            </div>
          )}

          {/* Tab Bar */}
          <TabBar active={activeTab} onChange={setActiveTab} historyCount={previousReports.length} t={t} />

          {/* Tab Content */}
          <div className="labs-fade-in">
            {activeTab === "report" && (
              <div data-testid="connoisseur-report-tab" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {displaySections ? (
                  <>
                    {displaySections.profile && (
                      <div style={{
                        padding: "20px 20px", borderRadius: 16,
                        background: "color-mix(in srgb, var(--labs-accent) 3%, var(--labs-bg))",
                        border: "1px solid color-mix(in srgb, var(--labs-accent) 12%, transparent)",
                      }} data-testid="section-palate-profile">
                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--labs-accent)", marginBottom: 10 }}>
                          {t("labs.connoisseur.sectionProfile", "Palate Profile")}
                        </p>
                        <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--labs-text)", margin: 0 }}>{displaySections.profile}</p>
                      </div>
                    )}
                    {displaySections.highlights && (
                      <div style={{
                        padding: "20px 20px", borderRadius: 16,
                        background: "color-mix(in srgb, var(--labs-accent) 3%, var(--labs-bg))",
                        border: "1px solid color-mix(in srgb, var(--labs-accent) 12%, transparent)",
                      }} data-testid="section-tasting-highlights">
                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--labs-accent)", marginBottom: 10 }}>
                          {t("labs.connoisseur.sectionHighlights", "Tasting Highlights")}
                        </p>
                        <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--labs-text)", margin: 0 }}>{displaySections.highlights}</p>
                      </div>
                    )}
                    {displaySections.recommendation && (
                      <div style={{
                        padding: "20px 20px", borderRadius: 16,
                        background: "color-mix(in srgb, var(--labs-accent) 3%, var(--labs-bg))",
                        border: "1px solid color-mix(in srgb, var(--labs-accent) 12%, transparent)",
                      }} data-testid="section-recommendation">
                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--labs-accent)", marginBottom: 10 }}>
                          {t("labs.connoisseur.sectionRecommendation", "Recommendation")}
                        </p>
                        <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--labs-text)", margin: 0 }}>{displaySections.recommendation}</p>
                      </div>
                    )}
                    {displaySections.quote && (
                      <div style={{
                        padding: "20px 24px", borderRadius: 16, textAlign: "center",
                        background: "linear-gradient(135deg, color-mix(in srgb, var(--labs-accent) 8%, var(--labs-bg)), color-mix(in srgb, var(--labs-gold) 5%, var(--labs-bg)))",
                        borderLeft: "3px solid var(--labs-accent)",
                      }} data-testid="section-quote">
                        <p className="labs-serif" style={{
                          fontSize: 16, lineHeight: 1.6, fontWeight: 400, fontStyle: "italic",
                          color: "var(--labs-text)", margin: 0,
                        }}>
                          "{displaySections.quote}"
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{
                    padding: "24px 20px", borderRadius: 16,
                    background: "color-mix(in srgb, var(--labs-accent) 3%, var(--labs-bg))",
                    border: "1px solid color-mix(in srgb, var(--labs-accent) 12%, transparent)",
                  }} data-testid="card-palate-letter">
                    <MarkdownRenderer content={displayReport || latestReport.reportContent} />
                  </div>
                )}
              </div>
            )}

            {activeTab === "whiskys" && <WhiskysTab snapshot={snap} fallback={latestReport?.liveWhiskySummaries} savedKeys={savedKeys} t={t} />}
            {activeTab === "aromas" && <AromasTab snapshot={snap} t={t} />}
            {activeTab === "history" && (
              <HistoryTab
                reports={previousReports}
                allReports={reports}
                onDelete={id => setConfirmDeleteId(id)}
                expandedId={expandedReport}
                onToggleExpand={setExpandedReport}
                t={t}
              />
            )}
          </div>

          {/* Quote Preview for Share */}
          {displayQuote && (
            <div className="labs-fade-in" style={{
              padding: "16px 20px", marginTop: 16, borderRadius: 14, textAlign: "center",
              background: "linear-gradient(135deg, color-mix(in srgb, var(--labs-accent) 6%, var(--labs-bg)), color-mix(in srgb, var(--labs-gold) 4%, var(--labs-bg)))",
              border: "1px solid color-mix(in srgb, var(--labs-accent) 12%, transparent)",
            }} data-testid="share-quote-preview">
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--labs-accent)", marginBottom: 8 }}>
                {t("labs.connoisseur.shareQuote", "Your Whisky Quote")}
              </p>
              <p className="labs-serif" style={{ fontSize: 15, fontStyle: "italic", color: "var(--labs-text)", margin: 0, lineHeight: 1.5 }}>
                "{displayQuote}"
              </p>
            </div>
          )}

          {/* Share Card */}
          <div className="labs-card labs-fade-in" style={{ padding: "16px 20px", marginTop: 12, display: "flex", gap: 8 }} data-testid="share-card">
            <button onClick={downloadPdf} className="labs-btn-secondary" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 12px" }} data-testid="button-download-pdf">
              <Download className="w-4 h-4" /> PDF
            </button>
            <button onClick={copySummary} className="labs-btn-secondary" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 12px" }} data-testid="button-copy-summary">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? t("labs.connoisseur.copied", "Copied!") : t("labs.connoisseur.copySummary", "Copy")}
            </button>
            <button onClick={shareReport} className="labs-btn-secondary" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 12px" }} data-testid="button-share-report">
              <Share2 className="w-4 h-4" /> {t("labs.connoisseur.share", "Share")}
            </button>
            <button
              onClick={() => setConfirmDeleteId(latestReport.id)}
              className="labs-btn-ghost"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, color: "var(--labs-text-muted)", padding: "12px 12px", border: "1px solid var(--labs-border)", borderRadius: 10 }}
              data-testid="button-delete-latest-report"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}

      {/* Empty State */}
      {!generateMutation.isPending && !externalGenPending && !latestReport && !isLoading && (
        <div className="labs-card p-8 text-center labs-fade-in" data-testid="connoisseur-empty-state">
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
            background: "linear-gradient(135deg, color-mix(in srgb, var(--labs-accent) 15%, transparent), color-mix(in srgb, var(--labs-gold) 10%, transparent))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Sparkles className="w-7 h-7" style={{ color: "var(--labs-accent)" }} />
          </div>
          <p style={{ color: "var(--labs-text)", fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
            {t("labs.connoisseur.title", "Connoisseur Report")}
          </p>
          <p style={{ color: "var(--labs-text-muted)", fontSize: 13, lineHeight: 1.5 }}>
            {t("labs.connoisseur.emptyState", "Generate your first report to discover your whisky personality.")}
          </p>
        </div>
      )}

      {/* Reports Error */}
      {reportsError && !isLoading && (
        <div className="labs-card mb-4 labs-fade-in" style={{ borderColor: "var(--labs-danger)", padding: 16 }} data-testid="text-reports-load-error">
          <p className="text-sm" style={{ color: "var(--labs-danger)" }}>{t("labs.connoisseur.loadError", "Could not load your reports. Please try again later.")}</p>
        </div>
      )}

      {/* Error Toast */}
      {errorToast && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", zIndex: 9999,
          background: "var(--labs-danger)", color: "#fff", padding: "10px 20px", borderRadius: 12,
          fontSize: 13, fontWeight: 500, boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          animation: "connoisseur-pulse 0.3s ease",
        }} data-testid="toast-error">
          {errorToast}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDeleteId && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: "var(--z-overlay)", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--overlay-backdrop)", backdropFilter: "var(--overlay-blur)", WebkitBackdropFilter: "var(--overlay-blur)", padding: 24 }}
          onClick={() => setConfirmDeleteId(null)}
          data-testid="dialog-confirm-delete"
        >
          <div className="labs-card" style={{ padding: "24px 20px", maxWidth: 340, width: "100%", textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <Trash2 className="w-7 h-7 mx-auto mb-3" style={{ color: "var(--labs-danger)" }} />
            <h3 className="labs-h3 mb-2" style={{ color: "var(--labs-text)" }}>{t("labs.connoisseur.deleteConfirmTitle", "Delete Report?")}</h3>
            <p className="text-xs mb-5" style={{ color: "var(--labs-text-muted)", lineHeight: 1.5 }}>
              {t("labs.connoisseur.deleteConfirmText", "This action cannot be undone.")}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="labs-btn-secondary flex-1" data-testid="button-cancel-delete">
                {t("labs.connoisseur.cancel", "Cancel")}
              </button>
              <button
                onClick={() => deleteMutation.mutate(confirmDeleteId)}
                disabled={deleteMutation.isPending}
                data-testid="button-confirm-delete"
                style={{
                  flex: 1, padding: "10px 16px", background: "var(--labs-danger)", color: "var(--labs-bg)", border: "none",
                  borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: deleteMutation.isPending ? "wait" : "pointer",
                  opacity: deleteMutation.isPending ? 0.7 : 1, fontFamily: "inherit",
                }}
              >
                {deleteMutation.isPending ? t("labs.connoisseur.deleting", "Deleting...") : t("labs.connoisseur.delete", "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Whisky-DNA Link Card */}
      <Link
        href="/labs/taste/dna"
        data-testid="link-card-whisky-dna"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginTop: 16,
          padding: "16px 18px",
          borderRadius: 16,
          textDecoration: "none",
          background: "linear-gradient(135deg, color-mix(in srgb, var(--labs-gold) 8%, var(--labs-bg)), color-mix(in srgb, var(--labs-accent) 5%, var(--labs-bg)))",
          border: "1px solid color-mix(in srgb, var(--labs-gold) 22%, transparent)",
          color: "var(--labs-text)",
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "color-mix(in srgb, var(--labs-gold) 18%, transparent)",
        }}>
          <Activity className="w-5 h-5" style={{ color: "var(--labs-gold)" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }} data-testid="text-dna-card-title">
            {t("whiskyDna", "Your Whisky DNA")}
          </div>
          <div style={{ fontSize: 12, color: "var(--labs-text-muted)", lineHeight: 1.4 }}>
            {t("whiskyDnaDesc", "A 12-axis aroma radar with a 95% confidence band that shrinks as you log more drams.")}
          </div>
        </div>
        <ChevronRight className="w-4 h-4" style={{ color: "var(--labs-text-muted)", flexShrink: 0 }} />
      </Link>
    </div>
  );
}

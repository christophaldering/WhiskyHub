import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import {
  Trophy, MapPin, Flame, BarChart3, Wine,
  Droplets, TrendingUp, RefreshCw,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

interface AnalyticsData {
  totalTastings: number;
  totalEntries: number;
  topWhiskies: Array<{ distillery: string | null; name: string | null; totalScore: number | null; tastingNumber: number }>;
  regionBreakdown: Record<string, number>;
  smokyBreakdown: { smoky: number; nonSmoky: number; unknown: number };
  caskBreakdown: Record<string, number>;
  scoreDistribution: Array<{ range: string; count: number }>;
}

const CHART_COLORS = ["#d4a256", "#a8834a", "#6a9a5b", "#e57373", "#60a5fa", "#c084fc", "#f59e0b", "#4ade80", "#f472b6", "#34d399"];

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, marginTop: 28 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: `color-mix(in srgb, ${v.accent} 15%, transparent)`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={16} color={v.accent} />
      </div>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: v.text, margin: 0 }}>{title}</h2>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ElementType }) {
  return (
    <div style={{
      flex: "1 1 100px", minWidth: 90,
      background: v.card, border: `1px solid ${v.border}`, borderRadius: 12,
      padding: "16px 12px", textAlign: "center",
    }}>
      <Icon size={18} color={v.accent} style={{ marginBottom: 6 }} />
      <div style={{ fontSize: 22, fontWeight: 700, color: v.accent, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 11, color: v.muted, marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function M2HistoricalInsights() {
  const { t } = useTranslation();

  const { data: analytics, isLoading, isError, refetch } = useQuery<AnalyticsData>({
    queryKey: ["historical-analytics"],
    queryFn: async () => {
      const res = await fetch("/api/historical/analytics");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div style={{ padding: "16px 16px 100px", maxWidth: 800, margin: "0 auto" }}>
        <M2BackButton />
        <div style={{ textAlign: "center", padding: "60px 16px" }} data-testid="insights-loading">
          <div style={{
            width: 28,
            height: 28,
            border: `2px solid ${v.border}`,
            borderTopColor: v.accent,
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 12px",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ color: v.muted, fontSize: 14 }}>
            {t("m2.historical.loading", "Loading...")}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !analytics) {
    return (
      <div style={{ padding: "16px 16px 100px", maxWidth: 800, margin: "0 auto" }}>
        <M2BackButton />
        <div style={{
          textAlign: "center",
          padding: "60px 16px",
          background: v.card,
          border: `1px solid ${v.border}`,
          borderRadius: 12,
          marginTop: 16,
        }} data-testid="insights-error">
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div style={{ color: "var(--cs-danger)", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
            {t("m2.historical.loadError", "Could not load historical tastings.")}
          </div>
          <button
            onClick={() => refetch()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              background: v.accent,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              marginTop: 12,
            }}
            data-testid="insights-retry"
          >
            <RefreshCw size={13} />
            {t("common.retry", "Retry")}
          </button>
        </div>
      </div>
    );
  }

  const topWhiskies = analytics.topWhiskies.slice(0, 20);

  const regionData = Object.entries(analytics.regionBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  const caskData = Object.entries(analytics.caskBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  const smokyTotal = analytics.smokyBreakdown.smoky + analytics.smokyBreakdown.nonSmoky + analytics.smokyBreakdown.unknown;
  const smokyPieData = [
    { name: t("m2.historical.smoky", "Smoky"), value: analytics.smokyBreakdown.smoky },
    { name: t("m2.historical.nonSmoky", "Non-Smoky"), value: analytics.smokyBreakdown.nonSmoky },
    ...(analytics.smokyBreakdown.unknown > 0 ? [{ name: t("m2.insights.unknown", "Unknown"), value: analytics.smokyBreakdown.unknown }] : []),
  ].filter(d => d.value > 0);
  const smokyColors = ["#f59e0b", "#60a5fa", "#888"];

  const scoreData = analytics.scoreDistribution.filter(d => d.count > 0);

  const topRegions = Object.entries(analytics.regionBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topCasks = Object.entries(analytics.caskBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const smokyPct = smokyTotal > 0 ? Math.round((analytics.smokyBreakdown.smoky / smokyTotal) * 100) : 0;

  const avgScore = analytics.totalEntries > 0 && topWhiskies.length > 0
    ? (topWhiskies.reduce((sum, w) => sum + (w.totalScore ?? 0), 0) / topWhiskies.length).toFixed(1)
    : "—";

  const profileData = [
    { subject: t("m2.insights.profileRegionDiversity", "Region Diversity"), value: Math.min(Object.keys(analytics.regionBreakdown).length * 10, 100) },
    { subject: t("m2.insights.profilePeat", "Peat"), value: smokyPct },
    { subject: t("m2.insights.profileCaskVariety", "Cask Variety"), value: Math.min(Object.keys(analytics.caskBreakdown).length * 12, 100) },
    { subject: t("m2.insights.profileVolume", "Volume"), value: Math.min(analytics.totalEntries * 2, 100) },
    { subject: t("m2.insights.profileQuality", "Quality"), value: Number(avgScore) * 10 || 50 },
  ];

  return (
    <div style={{ padding: "16px 16px 100px", maxWidth: 800, margin: "0 auto" }} data-testid="historical-insights-page">
      <M2BackButton />
      <h1 style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: 22,
        fontWeight: 700,
        color: v.text,
        marginTop: 12,
      }} data-testid="insights-title">
        {t("m2.insights.title", "Historical Insights")}
      </h1>
      <p style={{ fontSize: 13, color: v.muted, marginTop: 4, marginBottom: 20 }}>
        {t("m2.insights.subtitle", "Cross-tasting analytics and group taste profile")}
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }} data-testid="insights-stats">
        <StatCard label={t("m2.historical.statTastings", "Tastings")} value={analytics.totalTastings} icon={Wine} />
        <StatCard label={t("m2.historical.statWhiskies", "Whiskies")} value={analytics.totalEntries} icon={Droplets} />
        <StatCard label={t("m2.insights.avgScore", "Avg Score")} value={avgScore} icon={TrendingUp} />
      </div>

      <SectionHeader icon={Trophy} title={t("m2.insights.topWhiskiesTitle", "Top 20 Whiskies")} />
      <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: 16 }} data-testid="insights-top-whiskies">
        {topWhiskies.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {topWhiskies.map((w, i) => {
              const isTop3 = i < 3;
              const medalColor = i === 0 ? v.gold : i === 1 ? v.silver : i === 2 ? v.bronze : v.muted;
              const whiskyLabel = [w.distillery, w.name].filter(Boolean).join(" — ") || "—";
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10, fontSize: 13,
                  padding: "8px 6px",
                  background: isTop3 ? `color-mix(in srgb, ${v.accent} 5%, transparent)` : "transparent",
                  borderRadius: 8,
                }} data-testid={`insights-top-whisky-${i}`}>
                  <span style={{
                    width: 26, textAlign: "right",
                    color: medalColor,
                    fontWeight: isTop3 ? 700 : 400,
                    fontVariantNumeric: "tabular-nums",
                    fontSize: isTop3 ? 15 : 13,
                    flexShrink: 0,
                  }}>
                    {i + 1}.
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      color: v.text,
                      fontWeight: isTop3 ? 600 : 400,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {whiskyLabel}
                    </div>
                  </div>
                  <span style={{ color: v.accent, fontWeight: 600, fontVariantNumeric: "tabular-nums", fontSize: 13, flexShrink: 0 }}>
                    {w.totalScore != null ? w.totalScore.toFixed(1) : "—"}
                  </span>
                  <span style={{
                    fontSize: 10, color: v.muted,
                    background: `color-mix(in srgb, ${v.accent} 10%, transparent)`,
                    padding: "2px 6px", borderRadius: 8, flexShrink: 0,
                  }}>
                    #{w.tastingNumber}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: 24, color: v.muted, fontSize: 13 }}>
            {t("m2.insights.noData", "No data available")}
          </div>
        )}
      </div>

      <SectionHeader icon={MapPin} title={t("m2.insights.regionsTitle", "Best-Performing Regions")} />
      <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: 16 }} data-testid="insights-regions">
        {regionData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={regionData} layout="vertical" margin={{ left: 80, right: 16, top: 4, bottom: 4 }}>
              <XAxis type="number" tick={{ fill: v.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: v.text, fontSize: 12 }} axisLine={false} tickLine={false} width={76} />
              <Tooltip
                contentStyle={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: v.text }}
                itemStyle={{ color: v.accent }}
              />
              <Bar dataKey="value" fill={v.accent} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: "center", padding: 24, color: v.muted, fontSize: 13 }}>
            {t("m2.insights.noData", "No data available")}
          </div>
        )}
      </div>

      <SectionHeader icon={Flame} title={t("m2.insights.smokyTitle", "Smoky vs. Non-Smoky")} />
      <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: 16 }} data-testid="insights-smoky">
        {smokyPieData.length > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            <div style={{ width: 180, height: 180, flexShrink: 0, margin: "0 auto" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={smokyPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    dataKey="value"
                    stroke="none"
                  >
                    {smokyPieData.map((_, i) => (
                      <Cell key={i} fill={smokyColors[i % smokyColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 8, fontSize: 12 }}
                    itemStyle={{ color: v.text }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              {smokyPieData.map((d, i) => (
                <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: smokyColors[i], flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: v.text, flex: 1 }}>{d.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: v.accent, fontVariantNumeric: "tabular-nums" }}>{d.value}</span>
                  <span style={{ fontSize: 11, color: v.muted }}>
                    ({smokyTotal > 0 ? Math.round((d.value / smokyTotal) * 100) : 0}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: 24, color: v.muted, fontSize: 13 }}>
            {t("m2.insights.noData", "No data available")}
          </div>
        )}
      </div>

      <SectionHeader icon={Wine} title={t("m2.insights.caskTitle", "Cask Type Comparison")} />
      <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: 16 }} data-testid="insights-cask">
        {caskData.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {caskData.map((c, i) => {
              const maxVal = caskData[0]?.value || 1;
              const pct = (c.value / maxVal) * 100;
              return (
                <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    width: 90, fontSize: 12, color: v.text, textAlign: "right",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0,
                  }}>
                    {c.name}
                  </span>
                  <div style={{ flex: 1, height: 8, background: v.border, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length], borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 12, color: v.muted, fontVariantNumeric: "tabular-nums", width: 28, textAlign: "right" }}>{c.value}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: 24, color: v.muted, fontSize: 13 }}>
            {t("m2.insights.noData", "No data available")}
          </div>
        )}
      </div>

      <SectionHeader icon={BarChart3} title={t("m2.insights.scoreDistTitle", "Score Distribution")} />
      <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: 16 }} data-testid="insights-score-dist">
        {scoreData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analytics.scoreDistribution} margin={{ left: 0, right: 0, top: 4, bottom: 4 }}>
              <XAxis dataKey="range" tick={{ fill: v.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: v.muted, fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: v.text }}
                itemStyle={{ color: v.accent }}
              />
              <Bar dataKey="count" fill={v.accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: "center", padding: 24, color: v.muted, fontSize: 13 }}>
            {t("m2.insights.noData", "No data available")}
          </div>
        )}
      </div>

      <SectionHeader icon={Droplets} title={t("m2.insights.groupProfileTitle", "Group Taste Profile")} />
      <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: 16 }} data-testid="insights-group-profile">
        <p style={{ fontSize: 13, color: v.muted, marginTop: 0, marginBottom: 16 }}>
          {t("m2.insights.groupProfileDesc", "An aggregate view of taste tendencies across all historical tastings.")}
        </p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={profileData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke={v.border} />
              <PolarAngleAxis dataKey="subject" tick={{ fill: v.text, fontSize: 11 }} />
              <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
              <Radar dataKey="value" stroke={v.accent} fill={v.accent} fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <div style={{
            flex: "1 1 140px", minWidth: 120,
            background: `color-mix(in srgb, ${v.accent} 8%, transparent)`,
            borderRadius: 10, padding: "12px 14px",
          }}>
            <div style={{ fontSize: 11, color: v.muted, marginBottom: 4 }}>{t("m2.insights.topRegion", "Top Region")}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: v.text }}>{topRegions[0]?.[0] ?? "—"}</div>
          </div>
          <div style={{
            flex: "1 1 140px", minWidth: 120,
            background: `color-mix(in srgb, ${v.accent} 8%, transparent)`,
            borderRadius: 10, padding: "12px 14px",
          }}>
            <div style={{ fontSize: 11, color: v.muted, marginBottom: 4 }}>{t("m2.insights.topCask", "Top Cask")}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: v.text }}>{topCasks[0]?.[0] ?? "—"}</div>
          </div>
          <div style={{
            flex: "1 1 140px", minWidth: 120,
            background: `color-mix(in srgb, ${v.accent} 8%, transparent)`,
            borderRadius: 10, padding: "12px 14px",
          }}>
            <div style={{ fontSize: 11, color: v.muted, marginBottom: 4 }}>{t("m2.insights.peatLevel", "Peat Level")}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: v.text }}>{smokyPct}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

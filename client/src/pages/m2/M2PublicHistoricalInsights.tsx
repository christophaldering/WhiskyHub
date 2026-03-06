import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import {
  Trophy, MapPin, Flame, BarChart3, Wine,
  Droplets, TrendingUp, RefreshCw, Eye,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

interface PublicInsightsData {
  totalEntries: number;
  topDistilleries: Array<{ distillery: string; avgScore: number; appearances: number }>;
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
    }} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <Icon size={18} color={v.accent} style={{ marginBottom: 6 }} />
      <div style={{ fontSize: 22, fontWeight: 700, color: v.accent, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 11, color: v.muted, marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function M2PublicHistoricalInsights() {
  const { t } = useTranslation();

  const { data, isLoading, isError, refetch } = useQuery<PublicInsightsData>({
    queryKey: ["public-historical-insights"],
    queryFn: async () => {
      const res = await fetch("/api/historical/public-insights");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div style={{ padding: "16px 16px 100px", maxWidth: 800, margin: "0 auto" }}>
        <M2BackButton />
        <div style={{ textAlign: "center", padding: "60px 16px" }} data-testid="public-insights-loading">
          <div style={{
            width: 28, height: 28,
            border: `2px solid ${v.border}`, borderTopColor: v.accent,
            borderRadius: "50%", animation: "spin 0.8s linear infinite",
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

  if (isError || !data) {
    return (
      <div style={{ padding: "16px 16px 100px", maxWidth: 800, margin: "0 auto" }}>
        <M2BackButton />
        <div style={{
          textAlign: "center", padding: "60px 16px",
          background: v.card, border: `1px solid ${v.border}`,
          borderRadius: 12, marginTop: 16,
        }} data-testid="public-insights-error">
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div style={{ color: "var(--cs-danger)", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
            {t("m2.historical.loadError", "Could not load historical tastings.")}
          </div>
          <button
            onClick={() => refetch()}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 16px", background: v.accent, color: "#fff",
              border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: "pointer", marginTop: 12,
            }}
            data-testid="public-insights-retry"
          >
            <RefreshCw size={13} />
            {t("common.retry", "Retry")}
          </button>
        </div>
      </div>
    );
  }

  if (data.totalEntries === 0) {
    return (
      <div style={{ padding: "16px 16px 100px", maxWidth: 800, margin: "0 auto" }} data-testid="public-historical-insights-page">
        <M2BackButton />
        <div style={{
          textAlign: "center", padding: "60px 20px", marginTop: 24,
          background: v.card, border: `1px solid ${v.border}`, borderRadius: 16,
        }} data-testid="public-insights-empty">
          <Eye size={36} color={v.muted} style={{ marginBottom: 12, opacity: 0.5 }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: v.text, margin: "0 0 8px" }}>
            {t("m2.publicInsights.emptyTitle", "No public tasting data available")}
          </h2>
          <p style={{ fontSize: 13, color: v.muted, lineHeight: 1.6, maxWidth: 360, margin: "0 auto" }}>
            {t("m2.publicInsights.emptyDescription", "Community tasting insights will appear here once tasting data is shared publicly.")}
          </p>
        </div>
      </div>
    );
  }

  const regionData = Object.entries(data.regionBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  const caskData = Object.entries(data.caskBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  const smokyTotal = data.smokyBreakdown.smoky + data.smokyBreakdown.nonSmoky + data.smokyBreakdown.unknown;
  const smokyPieData = [
    { name: t("m2.historical.smoky", "Smoky"), value: data.smokyBreakdown.smoky },
    { name: t("m2.historical.nonSmoky", "Non-Smoky"), value: data.smokyBreakdown.nonSmoky },
    ...(data.smokyBreakdown.unknown > 0 ? [{ name: t("m2.insights.unknown", "Unknown"), value: data.smokyBreakdown.unknown }] : []),
  ].filter(d => d.value > 0);
  const smokyColors = ["#f59e0b", "#60a5fa", "#888"];

  const scoreData = data.scoreDistribution.filter(d => d.count > 0);

  const topDistilleries = data.topDistilleries.slice(0, 15);

  const uniqueRegions = Object.keys(data.regionBreakdown).length;
  const uniqueCasks = Object.keys(data.caskBreakdown).length;

  return (
    <div style={{ padding: "16px 16px 100px", maxWidth: 800, margin: "0 auto" }} data-testid="public-historical-insights-page">
      <M2BackButton />

      <div style={{ textAlign: "center", marginTop: 12, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8 }}>
          <Eye style={{ width: 22, height: 22, color: v.accent }} strokeWidth={1.8} />
          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 22, fontWeight: 700, color: v.text, margin: 0,
            }}
            data-testid="text-public-insights-title"
          >
            {t("m2.publicInsights.title", "Tasting Insights")}
          </h1>
        </div>
        <p style={{ fontSize: 13, color: v.muted, margin: "0 auto", maxWidth: 420, lineHeight: 1.5 }}>
          {t("m2.publicInsights.intro", "Aggregated data from blind whisky tastings — anonymized trends, top-performing distilleries, and flavor profiles across sessions.")}
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }} data-testid="public-insights-stats">
        <StatCard label={t("m2.historical.statWhiskies", "Whiskies")} value={data.totalEntries} icon={Droplets} />
        <StatCard label={t("m2.publicInsights.regions", "Regions")} value={uniqueRegions} icon={MapPin} />
        <StatCard label={t("m2.publicInsights.caskTypes", "Cask Types")} value={uniqueCasks} icon={Wine} />
      </div>

      <SectionHeader icon={Trophy} title={t("m2.publicInsights.topDistilleries", "Top Distilleries")} />
      <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: 16 }} data-testid="public-insights-top-distilleries">
        {topDistilleries.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {topDistilleries.map((d, i) => {
              const isTop3 = i < 3;
              const medalColor = i === 0 ? v.gold : i === 1 ? v.silver : i === 2 ? v.bronze : v.muted;
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10, fontSize: 13,
                  padding: "8px 6px",
                  background: isTop3 ? `color-mix(in srgb, ${v.accent} 5%, transparent)` : "transparent",
                  borderRadius: 8,
                }} data-testid={`public-insights-distillery-${i}`}>
                  <span style={{
                    width: 26, textAlign: "right", color: medalColor,
                    fontWeight: isTop3 ? 700 : 400, fontVariantNumeric: "tabular-nums",
                    fontSize: isTop3 ? 15 : 13, flexShrink: 0,
                  }}>
                    {i + 1}.
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      color: v.text, fontWeight: isTop3 ? 600 : 400,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {d.distillery}
                    </div>
                  </div>
                  <span style={{ color: v.accent, fontWeight: 600, fontVariantNumeric: "tabular-nums", fontSize: 13, flexShrink: 0 }}>
                    {d.avgScore.toFixed(1)}
                  </span>
                  <span style={{
                    fontSize: 10, color: v.muted,
                    background: `color-mix(in srgb, ${v.accent} 10%, transparent)`,
                    padding: "2px 6px", borderRadius: 8, flexShrink: 0,
                  }}>
                    {d.appearances}x
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
      <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: 16 }} data-testid="public-insights-regions">
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
      <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: 16 }} data-testid="public-insights-smoky">
        {smokyPieData.length > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            <div style={{ width: 180, height: 180, flexShrink: 0, margin: "0 auto" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={smokyPieData} cx="50%" cy="50%"
                    innerRadius={45} outerRadius={75}
                    dataKey="value" stroke="none"
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
      <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: 16 }} data-testid="public-insights-cask">
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
      <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: 16 }} data-testid="public-insights-score-dist">
        {scoreData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.scoreDistribution} margin={{ left: 0, right: 0, top: 4, bottom: 4 }}>
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
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { publicInsightsApi } from "@/lib/api";
import { Star, TrendingUp, BarChart3, Flame, Users, Zap } from "lucide-react";
import { Link } from "wouter";
import WhiskyImage from "./WhiskyImage";
import { useSession } from "@/lib/session";

interface InsightsData {
  communityPulse: { totalRatings: number; totalWhiskies: number; totalTasters: number; avgOverall: number };
  topRated: Array<{ name: string; distillery: string | null; region: string | null; avgOverall: number; ratingCount: number; imageUrl: string | null }>;
  mostExplored: Array<{ name: string; distillery: string | null; region: string | null; avgOverall: number; ratingCount: number; imageUrl: string | null }>;
  regionalHighlights: Array<{ region: string; avgOverall: number; count: number }>;
  flavorTrends: { peatLevels: Record<string, number>; caskInfluences: Record<string, number> };
  divisiveDrams: Array<{ name: string; distillery: string | null; region: string | null; avgOverall: number; variance: number; ratingCount: number; imageUrl: string | null }>;
}

function AnimatedNumber({ value, suffix }: { value: number; suffix?: string }) {
  return (
    <span style={{ fontSize: 28, fontWeight: 700, color: "var(--labs-text)", fontVariantNumeric: "tabular-nums" }} data-testid={`text-stat-${value}`}>
      {value.toLocaleString()}{suffix || ""}
    </span>
  );
}

function InsightCard({ children, style, testId }: { children: React.ReactNode; style?: React.CSSProperties; testId?: string }) {
  return (
    <div
      className="labs-card labs-fade-in"
      style={{
        padding: 20,
        borderRadius: 16,
        background: "var(--labs-surface-elevated)",
        border: "1px solid var(--labs-border)",
        minWidth: 280,
        flex: "0 0 auto",
        ...style,
      }}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Icon style={{ width: 16, height: 16, color: "var(--labs-accent)" }} />
        <h3 className="labs-serif" style={{ fontSize: 16, fontWeight: 700, color: "var(--labs-text)", margin: 0 }}>{title}</h3>
      </div>
      <p style={{ fontSize: 12, color: "var(--labs-text-muted)", margin: 0 }}>{subtitle}</p>
    </div>
  );
}

function CtaBadge({ text }: { text: string }) {
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      marginTop: 12,
      padding: "5px 10px",
      borderRadius: 20,
      background: "var(--labs-accent-muted)",
      color: "var(--labs-accent)",
      fontSize: 11,
      fontWeight: 600,
    }} data-testid="text-cta-badge">
      <Zap style={{ width: 11, height: 11 }} />
      {text}
    </div>
  );
}

function DonutChart({ data, size = 80 }: { data: Record<string, number>; size?: number }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total === 0) return null;

  const colors = [
    "var(--labs-accent)",
    "#8b5cf6",
    "#f59e0b",
    "#10b981",
    "#ef4444",
    "#6366f1",
  ];

  const r = size / 2;
  const cx = r;
  const cy = r;
  const innerR = r * 0.55;
  let currentAngle = -Math.PI / 2;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {entries.map(([label, value], i) => {
          const angle = (value / total) * 2 * Math.PI;
          const startX = cx + r * Math.cos(currentAngle);
          const startY = cy + r * Math.sin(currentAngle);
          const endAngle = currentAngle + angle;
          const endX = cx + r * Math.cos(endAngle);
          const endY = cy + r * Math.sin(endAngle);
          const innerStartX = cx + innerR * Math.cos(endAngle);
          const innerStartY = cy + innerR * Math.sin(endAngle);
          const innerEndX = cx + innerR * Math.cos(currentAngle);
          const innerEndY = cy + innerR * Math.sin(currentAngle);
          const largeArc = angle > Math.PI ? 1 : 0;
          const d = `M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY} L ${innerStartX} ${innerStartY} A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerEndX} ${innerEndY} Z`;
          currentAngle = endAngle;
          return <path key={label} d={d} fill={colors[i % colors.length]} opacity={0.85} />;
        })}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {entries.slice(0, 5).map(([label, value], i) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[i % colors.length], flexShrink: 0 }} />
            <span style={{ color: "var(--labs-text-secondary)" }}>{label}</span>
            <span style={{ color: "var(--labs-text-muted)", marginLeft: "auto" }}>{Math.round((value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CommunityInsights() {
  const { t } = useTranslation();
  const { signedIn } = useSession();

  const { data: insights, isLoading } = useQuery<InsightsData>({
    queryKey: ["public-insights"],
    queryFn: publicInsightsApi.get,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div style={{ marginBottom: 24 }}>
        <div className="labs-skeleton" style={{ height: 20, width: 180, borderRadius: 8, marginBottom: 12 }} />
        <div style={{ display: "flex", gap: 12, overflowX: "hidden" }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="labs-skeleton" style={{ height: 180, minWidth: 280, borderRadius: 16, flex: "0 0 auto" }} />
          ))}
        </div>
      </div>
    );
  }

  if (!insights || insights.communityPulse.totalRatings === 0) return null;

  const { communityPulse, topRated, mostExplored, regionalHighlights, flavorTrends, divisiveDrams } = insights;
  const maxRegionScore = Math.max(...regionalHighlights.map(r => r.avgOverall), 1);

  return (
    <div style={{ marginBottom: 28 }} data-testid="section-community-insights">
      <div style={{ marginBottom: 16 }}>
        <h2 className="labs-serif labs-fade-in" style={{ fontSize: 20, fontWeight: 700, color: "var(--labs-text)", margin: "0 0 2px" }} data-testid="text-insights-title">
          {t("insights.sectionTitle")}
        </h2>
        <p className="labs-fade-in labs-stagger-1" style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: 0 }} data-testid="text-insights-subtitle">
          {t("insights.sectionSubtitle")}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          paddingBottom: 8,
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          scrollSnapType: "x mandatory",
        }}
        data-testid="insights-scroll-container"
      >
        <InsightCard testId="card-community-pulse" style={{ scrollSnapAlign: "start" }}>
          <SectionHeader icon={Users} title={t("insights.pulseTitle")} subtitle={t("insights.sectionSubtitle")} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <AnimatedNumber value={communityPulse.totalRatings} />
              <p style={{ fontSize: 11, color: "var(--labs-text-muted)", margin: "2px 0 0" }}>{t("insights.totalRatings")}</p>
            </div>
            <div>
              <AnimatedNumber value={communityPulse.totalWhiskies} />
              <p style={{ fontSize: 11, color: "var(--labs-text-muted)", margin: "2px 0 0" }}>{t("insights.totalWhiskies")}</p>
            </div>
            <div>
              <AnimatedNumber value={communityPulse.totalTasters} />
              <p style={{ fontSize: 11, color: "var(--labs-text-muted)", margin: "2px 0 0" }}>{t("insights.totalTasters")}</p>
            </div>
            <div>
              <AnimatedNumber value={communityPulse.avgOverall} />
              <p style={{ fontSize: 11, color: "var(--labs-text-muted)", margin: "2px 0 0" }}>{t("insights.avgScore")}</p>
            </div>
          </div>
          <CtaBadge text={signedIn ? t("insights.ctaJoinLoggedIn") : t("insights.ctaJoin")} />
        </InsightCard>

        {topRated.length > 0 && (
          <InsightCard testId="card-top-rated" style={{ minWidth: 300, scrollSnapAlign: "start" }}>
            <SectionHeader icon={Star} title={t("insights.topRatedTitle")} subtitle={t("insights.topRatedSubtitle")} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {topRated.map((w, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }} data-testid={`card-top-rated-${i}`}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--labs-text-muted)", width: 18, textAlign: "center" }}>{i + 1}</span>
                  <WhiskyImage imageUrl={w.imageUrl} name={w.name} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</p>
                    <p style={{ fontSize: 11, color: "var(--labs-text-muted)", margin: 0 }}>{w.distillery || w.region}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <Star style={{ width: 12, height: 12, color: "var(--labs-accent)", fill: "var(--labs-accent)" }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--labs-accent)" }}>{w.avgOverall.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
            <CtaBadge text={signedIn ? t("insights.ctaVoteLoggedIn") : t("insights.ctaVote")} />
          </InsightCard>
        )}

        {mostExplored.length > 0 && (
          <InsightCard testId="card-most-explored" style={{ minWidth: 300, scrollSnapAlign: "start" }}>
            <SectionHeader icon={TrendingUp} title={t("insights.mostExploredTitle")} subtitle={t("insights.mostExploredSubtitle")} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {mostExplored.map((w, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }} data-testid={`card-most-explored-${i}`}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--labs-text-muted)", width: 18, textAlign: "center" }}>{i + 1}</span>
                  <WhiskyImage imageUrl={w.imageUrl} name={w.name} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</p>
                    <p style={{ fontSize: 11, color: "var(--labs-text-muted)", margin: 0 }}>{w.distillery || w.region}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--labs-text)" }}>{w.ratingCount}</span>
                    <p style={{ fontSize: 10, color: "var(--labs-text-muted)", margin: 0 }}>{t("explore.ratings")}</p>
                  </div>
                </div>
              ))}
            </div>
            <CtaBadge text={signedIn ? t("insights.ctaStartLoggedIn") : t("insights.ctaStart")} />
          </InsightCard>
        )}

        {regionalHighlights.length > 0 && (
          <InsightCard testId="card-regional-highlights" style={{ minWidth: 280, scrollSnapAlign: "start" }}>
            <SectionHeader icon={BarChart3} title={t("insights.regionalTitle")} subtitle={t("insights.regionalSubtitle")} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {regionalHighlights.slice(0, 8).map((r, i) => (
                <div key={i} data-testid={`card-region-${i}`}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text)" }}>{r.region}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-accent)" }}>{r.avgOverall.toFixed(1)}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: "var(--labs-border)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      borderRadius: 3,
                      background: "var(--labs-accent)",
                      width: `${(r.avgOverall / maxRegionScore) * 100}%`,
                      transition: "width 0.6s ease-out",
                    }} />
                  </div>
                  <span style={{ fontSize: 10, color: "var(--labs-text-muted)" }}>{r.count} {t("insights.whiskies")}</span>
                </div>
              ))}
            </div>
            <CtaBadge text={t("insights.ctaExplore")} />
          </InsightCard>
        )}

        {(Object.keys(flavorTrends.peatLevels).length > 0 || Object.keys(flavorTrends.caskInfluences).length > 0) && (
          <InsightCard testId="card-flavor-trends" style={{ minWidth: 300, scrollSnapAlign: "start" }}>
            <SectionHeader icon={Flame} title={t("insights.flavorTitle")} subtitle={t("insights.flavorSubtitle")} />
            {Object.keys(flavorTrends.peatLevels).length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text-secondary)", margin: "0 0 8px" }}>{t("insights.peatLevels")}</p>
                <DonutChart data={flavorTrends.peatLevels} size={80} />
              </div>
            )}
            {Object.keys(flavorTrends.caskInfluences).length > 0 && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text-secondary)", margin: "0 0 8px" }}>{t("insights.caskInfluence")}</p>
                <DonutChart data={flavorTrends.caskInfluences} size={80} />
              </div>
            )}
            <CtaBadge text={signedIn ? t("insights.ctaVoteLoggedIn") : t("insights.ctaVote")} />
          </InsightCard>
        )}

        {divisiveDrams.length > 0 && (
          <InsightCard testId="card-divisive-drams" style={{ minWidth: 280, scrollSnapAlign: "start" }}>
            <SectionHeader icon={Zap} title={t("insights.divisiveTitle")} subtitle={t("insights.divisiveSubtitle")} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {divisiveDrams.map((w, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }} data-testid={`card-divisive-${i}`}>
                  <WhiskyImage imageUrl={w.imageUrl} name={w.name} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</p>
                    <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                      <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>
                        <Star style={{ width: 10, height: 10, display: "inline", verticalAlign: "middle", marginRight: 2 }} />{w.avgOverall.toFixed(1)}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--labs-accent)", fontWeight: 600 }}>
                        {t("insights.varianceLabel")}: {w.variance.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <CtaBadge text={signedIn ? t("insights.ctaStartLoggedIn") : t("insights.ctaStart")} />
          </InsightCard>
        )}

        <div
          style={{
            minWidth: 220,
            flex: "0 0 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            borderRadius: 16,
            background: "linear-gradient(135deg, var(--labs-accent-muted), transparent)",
            border: "1px solid var(--labs-accent)",
            scrollSnapAlign: "start",
            textAlign: "center",
          }}
          data-testid="card-insights-cta"
        >
          <Zap style={{ width: 24, height: 24, color: "var(--labs-accent)", marginBottom: 8 }} />
          <p className="labs-serif" style={{ fontSize: 16, fontWeight: 700, color: "var(--labs-text)", margin: "0 0 4px" }}>
            {signedIn ? t("insights.ctaVoteHeadline") : t("insights.ctaVote")}
          </p>
          <p style={{ fontSize: 12, color: "var(--labs-text-muted)", margin: "0 0 14px" }}>
            {signedIn ? t("insights.ctaVoteSubline") : t("insights.ctaStart")}
          </p>
          <Link href={signedIn ? "/labs/search" : "/labs/onboarding"}>
            <button
              className="labs-btn-primary"
              style={{ fontSize: 13, padding: "8px 20px", borderRadius: 20 }}
              data-testid={signedIn ? "button-insights-find-whisky" : "button-insights-signup"}
            >
              {signedIn ? t("insights.ctaVoteButton") : t("insights.signUpFree")}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

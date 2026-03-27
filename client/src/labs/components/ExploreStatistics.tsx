import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Star, TrendingUp, BarChart3, Gem, DollarSign, Users, Zap,
  Eye, Wine, Flame, Calendar, Percent, ChevronDown, ChevronUp,
  Award
} from "lucide-react";
import WhiskyImage from "./WhiskyImage";

interface ExploreWhisky {
  id: string;
  name: string;
  distillery: string | null;
  region: string | null;
  country: string | null;
  category: string | null;
  age: string | null;
  abv: number | null;
  caskType: string | null;
  imageUrl: string | null;
  avgOverall: number | null;
  ratingCount: number;
  peatLevel: string | null;
  ageBand: string | null;
  abvBand: string | null;
  price: number | null;
  wbScore: number | null;
  distilledYear: string | null;
  avgNose: number | null;
  avgTaste: number | null;
  avgFinish: number | null;
  scoreVariance: number | null;
}

type StatTab = "rankings" | "comparisons" | "analysis";

function StatCard({ children, title, subtitle, icon: Icon, testId }: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  icon: any;
  testId: string;
}) {
  return (
    <div
      className="labs-card labs-fade-in"
      style={{
        padding: 24,
        borderRadius: 16,
        background: "var(--labs-surface-elevated)",
        border: "1px solid var(--labs-border)",
        width: "100%",
      }}
      data-testid={testId}
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Icon style={{ width: 18, height: 18, color: "var(--labs-accent)" }} />
          <h3 className="labs-serif" style={{ fontSize: 17, fontWeight: 700, color: "var(--labs-text)", margin: 0 }}>{title}</h3>
        </div>
        <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: 0 }}>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function NoData({ message }: { message: string }) {
  return (
    <p style={{ fontSize: 13, color: "var(--labs-text-muted)", textAlign: "center", padding: "20px 0", margin: 0 }}>
      {message}
    </p>
  );
}

const RANK_COLORS: Record<number, string> = {
  1: "#FFD700",
  2: "#C0C0C0",
  3: "#CD7F32",
};

function WhiskyRow({ w, rank, extra }: { w: ExploreWhisky; rank?: number; extra?: React.ReactNode }) {
  const isTopThree = rank != null && rank <= 3;
  const rankColor = rank != null ? RANK_COLORS[rank] : undefined;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: isTopThree ? "8px 10px" : "4px 0",
      borderRadius: isTopThree ? 10 : 0,
      background: isTopThree ? "var(--labs-surface-elevated)" : "transparent",
      border: isTopThree ? `1px solid ${rankColor}22` : "none",
    }}>
      {rank != null && (
        <span style={{
          fontSize: 14,
          fontWeight: 800,
          color: rankColor || "var(--labs-text-muted)",
          width: 22,
          textAlign: "center",
          flexShrink: 0,
          textShadow: isTopThree ? `0 0 8px ${rankColor}44` : "none",
        }}>{rank}</span>
      )}
      <WhiskyImage imageUrl={w.imageUrl} name={w.name} size={isTopThree ? 36 : 32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: isTopThree ? 14 : 13,
          fontWeight: 600,
          color: "var(--labs-text)",
          margin: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>{w.name}</p>
        <p style={{ fontSize: 11, color: "var(--labs-text-muted)", margin: 0 }}>{w.distillery || w.region || ""}</p>
      </div>
      {extra}
    </div>
  );
}

function BarRow({ label, value, maxValue, count }: { label: string; value: number; maxValue: number; count?: number }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)" }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-accent)" }}>{value.toFixed(1)}</span>
      </div>
      <div style={{ height: 7, borderRadius: 4, background: "var(--labs-border)", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          borderRadius: 4,
          background: "var(--labs-accent)",
          width: `${Math.max(5, (value / maxValue) * 100)}%`,
          transition: "width 0.4s ease-out",
        }} />
      </div>
      {count != null && (
        <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{count} whiskies</span>
      )}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <Star style={{ width: 13, height: 13, color: "var(--labs-accent)", fill: "var(--labs-accent)" }} />
      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--labs-accent)" }}>{score.toFixed(1)}</span>
    </div>
  );
}

function TabNavigation({ activeTab, onTabChange, tabs }: {
  activeTab: StatTab;
  onTabChange: (tab: StatTab) => void;
  tabs: { key: StatTab; label: string }[];
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        overflowX: "auto",
        scrollbarWidth: "none",
        paddingBottom: 4,
        marginBottom: 16,
      }}
      data-testid="statistics-tab-navigation"
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          style={{
            padding: "8px 18px",
            borderRadius: 20,
            border: activeTab === tab.key ? "1px solid var(--labs-accent)" : "1px solid var(--labs-border)",
            background: activeTab === tab.key ? "var(--labs-accent)" : "transparent",
            color: activeTab === tab.key ? "#fff" : "var(--labs-text-muted)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
            transition: "all 0.2s ease",
            fontFamily: "inherit",
          }}
          data-testid={`tab-${tab.key}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default function ExploreStatistics({ whiskies }: { whiskies: ExploreWhisky[] }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<StatTab>("rankings");

  const MIN_RATINGS = 3;
  const rated = useMemo(() => whiskies.filter(w => w.avgOverall != null && w.avgOverall > 0 && w.ratingCount >= MIN_RATINGS), [whiskies]);
  const hasEnoughData = rated.length >= 3;

  const noDataMsg = t("exploreStats.notEnoughData", "Not enough data yet");

  const topRated = useMemo(() => {
    return [...rated].sort((a, b) => (b.avgOverall || 0) - (a.avgOverall || 0)).slice(0, 10);
  }, [rated]);

  const hiddenGems = useMemo(() => {
    return whiskies
      .filter(w => w.avgOverall != null && w.avgOverall > 0 && w.ratingCount >= 1 && w.ratingCount <= 5)
      .sort((a, b) => (b.avgOverall || 0) - (a.avgOverall || 0))
      .slice(0, 10);
  }, [whiskies]);

  const priceValue = useMemo(() => {
    return whiskies
      .filter(w => w.avgOverall != null && w.avgOverall > 0 && w.price != null && w.price > 0 && w.ratingCount >= 1)
      .map(w => ({ ...w, ratio: (w.avgOverall || 0) / (w.price || 1) }))
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 10);
  }, [whiskies]);

  const mostTasted = useMemo(() => {
    return [...whiskies].filter(w => w.ratingCount > 0).sort((a, b) => b.ratingCount - a.ratingCount).slice(0, 10);
  }, [whiskies]);

  const divisiveDrams = useMemo(() => {
    return rated
      .filter(w => w.ratingCount >= 3 && w.scoreVariance != null && w.scoreVariance > 0)
      .sort((a, b) => (b.scoreVariance || 0) - (a.scoreVariance || 0))
      .slice(0, 10);
  }, [rated]);

  const distilleryRanking = useMemo(() => {
    const map = new Map<string, { scores: number[]; count: number }>();
    for (const w of whiskies) {
      if (!w.distillery || w.avgOverall == null || w.avgOverall <= 0) continue;
      const d = w.distillery;
      const existing = map.get(d);
      if (existing) {
        existing.scores.push(w.avgOverall);
        existing.count++;
      } else {
        map.set(d, { scores: [w.avgOverall], count: 1 });
      }
    }
    return Array.from(map.entries())
      .filter(([, v]) => v.count >= 3)
      .map(([name, v]) => ({
        name,
        avgScore: parseFloat((v.scores.reduce((a, b) => a + b, 0) / v.scores.length).toFixed(1)),
        count: v.count,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 10);
  }, [whiskies]);

  const regionRanking = useMemo(() => {
    const map = new Map<string, { scores: number[]; count: number }>();
    for (const w of rated) {
      if (!w.region) continue;
      const existing = map.get(w.region);
      if (existing) {
        existing.scores.push(w.avgOverall!);
        existing.count++;
      } else {
        map.set(w.region, { scores: [w.avgOverall!], count: 1 });
      }
    }
    return Array.from(map.entries())
      .map(([region, v]) => ({
        region,
        avgScore: parseFloat((v.scores.reduce((a, b) => a + b, 0) / v.scores.length).toFixed(1)),
        count: v.count,
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [rated]);

  const caskTypeRanking = useMemo(() => {
    const map = new Map<string, { scores: number[]; count: number }>();
    for (const w of rated) {
      const cask = w.caskType || w.caskType;
      if (!cask) continue;
      const existing = map.get(cask);
      if (existing) {
        existing.scores.push(w.avgOverall!);
        existing.count++;
      } else {
        map.set(cask, { scores: [w.avgOverall!], count: 1 });
      }
    }
    return Array.from(map.entries())
      .map(([cask, v]) => ({
        cask,
        avgScore: parseFloat((v.scores.reduce((a, b) => a + b, 0) / v.scores.length).toFixed(1)),
        count: v.count,
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [rated]);

  const peatVsScore = useMemo(() => {
    const map = new Map<string, { scores: number[]; count: number }>();
    for (const w of rated) {
      if (!w.peatLevel) continue;
      const existing = map.get(w.peatLevel);
      if (existing) {
        existing.scores.push(w.avgOverall!);
        existing.count++;
      } else {
        map.set(w.peatLevel, { scores: [w.avgOverall!], count: 1 });
      }
    }
    return Array.from(map.entries())
      .map(([level, v]) => ({
        level,
        avgScore: parseFloat((v.scores.reduce((a, b) => a + b, 0) / v.scores.length).toFixed(1)),
        count: v.count,
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [rated]);

  const ageVsScore = useMemo(() => {
    const map = new Map<string, { scores: number[]; count: number }>();
    for (const w of rated) {
      if (!w.ageBand) continue;
      const existing = map.get(w.ageBand);
      if (existing) {
        existing.scores.push(w.avgOverall!);
        existing.count++;
      } else {
        map.set(w.ageBand, { scores: [w.avgOverall!], count: 1 });
      }
    }
    const order = ["NAS", "Young (3-9)", "Classic (10-17)", "Mature (18-25)", "Old (25+)"];
    return Array.from(map.entries())
      .map(([band, v]) => ({
        band,
        avgScore: parseFloat((v.scores.reduce((a, b) => a + b, 0) / v.scores.length).toFixed(1)),
        count: v.count,
      }))
      .sort((a, b) => {
        const ai = order.indexOf(a.band);
        const bi = order.indexOf(b.band);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
  }, [rated]);

  const abvVsScore = useMemo(() => {
    const map = new Map<string, { scores: number[]; count: number }>();
    for (const w of rated) {
      if (!w.abvBand) continue;
      const existing = map.get(w.abvBand);
      if (existing) {
        existing.scores.push(w.avgOverall!);
        existing.count++;
      } else {
        map.set(w.abvBand, { scores: [w.avgOverall!], count: 1 });
      }
    }
    const order = ["Low (<40%)", "Standard (40-46%)", "High (46-55%)", "Cask Strength (>55%)"];
    return Array.from(map.entries())
      .map(([band, v]) => ({
        band,
        avgScore: parseFloat((v.scores.reduce((a, b) => a + b, 0) / v.scores.length).toFixed(1)),
        count: v.count,
      }))
      .sort((a, b) => {
        const ai = order.indexOf(a.band);
        const bi = order.indexOf(b.band);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
  }, [rated]);

  const noseTopWhiskies = useMemo(() => {
    return whiskies
      .filter(w => w.avgNose != null && w.avgNose > 0 && w.ratingCount >= MIN_RATINGS)
      .sort((a, b) => (b.avgNose || 0) - (a.avgNose || 0))
      .slice(0, 5);
  }, [whiskies]);

  const tasteTopWhiskies = useMemo(() => {
    return whiskies
      .filter(w => w.avgTaste != null && w.avgTaste > 0 && w.ratingCount >= MIN_RATINGS)
      .sort((a, b) => (b.avgTaste || 0) - (a.avgTaste || 0))
      .slice(0, 5);
  }, [whiskies]);

  const finishTopWhiskies = useMemo(() => {
    return whiskies
      .filter(w => w.avgFinish != null && w.avgFinish > 0 && w.ratingCount >= MIN_RATINGS)
      .sort((a, b) => (b.avgFinish || 0) - (a.avgFinish || 0))
      .slice(0, 5);
  }, [whiskies]);

  const wbVsCommunity = useMemo(() => {
    return whiskies
      .filter(w => w.wbScore != null && w.wbScore > 0 && w.avgOverall != null && w.avgOverall > 0 && w.ratingCount >= MIN_RATINGS)
      .map(w => ({ ...w, delta: (w.avgOverall || 0) - (w.wbScore || 0) }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 10);
  }, [whiskies]);

  const vintageAnalysis = useMemo(() => {
    const map = new Map<string, { scores: number[]; count: number }>();
    for (const w of rated) {
      if (!w.distilledYear) continue;
      const existing = map.get(w.distilledYear);
      if (existing) {
        existing.scores.push(w.avgOverall!);
        existing.count++;
      } else {
        map.set(w.distilledYear, { scores: [w.avgOverall!], count: 1 });
      }
    }
    return Array.from(map.entries())
      .filter(([, v]) => v.count >= 2)
      .map(([year, v]) => ({
        year,
        avgScore: parseFloat((v.scores.reduce((a, b) => a + b, 0) / v.scores.length).toFixed(1)),
        count: v.count,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 10);
  }, [rated]);

  const ToggleIcon = expanded ? ChevronUp : ChevronDown;

  const tabs: { key: StatTab; label: string }[] = [
    { key: "rankings", label: t("exploreStats.tabRankings", "Rankings") },
    { key: "comparisons", label: t("exploreStats.tabComparisons", "Comparisons") },
    { key: "analysis", label: t("exploreStats.tabAnalysis", "Analysis") },
  ];

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))",
    gap: 16,
  };

  return (
    <div style={{ marginBottom: 20 }} data-testid="section-explore-statistics">
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "10px 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
        data-testid="button-toggle-statistics"
      >
        <BarChart3 style={{ width: 18, height: 18, color: "var(--labs-accent)" }} />
        <h2 className="labs-serif" style={{ fontSize: 18, fontWeight: 700, color: "var(--labs-text)", margin: 0, flex: 1, textAlign: "left" }}>
          {t("exploreStats.title", "Statistics & Rankings")}
        </h2>
        <ToggleIcon style={{ width: 18, height: 18, color: "var(--labs-text-muted)" }} />
      </button>

      {expanded && (
        <div style={{ marginTop: 8 }} data-testid="statistics-scroll-container">
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />

          {activeTab === "rankings" && (
            <div style={gridStyle} data-testid="statistics-grid-rankings">
              <StatCard title={t("exploreStats.topRated", "Top Rated")} subtitle={t("exploreStats.topRatedSub", "Highest rated whiskies (min. 3 ratings)")} icon={Star} testId="stat-card-top-rated">
                {!hasEnoughData ? <NoData message={noDataMsg} /> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {topRated.map((w, i) => (
                      <WhiskyRow key={w.id} w={w} rank={i + 1} extra={
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <ScoreBadge score={w.avgOverall!} />
                          <p style={{ fontSize: 11, color: "var(--labs-text-muted)", margin: 0 }}>{w.ratingCount} ratings</p>
                        </div>
                      } />
                    ))}
                  </div>
                )}
              </StatCard>

              <StatCard title={t("exploreStats.hiddenGems", "Hidden Gems")} subtitle={t("exploreStats.hiddenGemsSub", "High scores, few ratings (≤5)")} icon={Gem} testId="stat-card-hidden-gems">
                {hiddenGems.length === 0 ? <NoData message={noDataMsg} /> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {hiddenGems.map((w, i) => (
                      <WhiskyRow key={w.id} w={w} rank={i + 1} extra={
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <ScoreBadge score={w.avgOverall!} />
                          <p style={{ fontSize: 11, color: "var(--labs-text-muted)", margin: 0 }}>{w.ratingCount} ratings</p>
                        </div>
                      } />
                    ))}
                  </div>
                )}
              </StatCard>

              <StatCard title={t("exploreStats.priceValue", "Best Value")} subtitle={t("exploreStats.priceValueSub", "Best score-to-price ratio")} icon={DollarSign} testId="stat-card-price-value">
                {priceValue.length === 0 ? <NoData message={noDataMsg} /> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {priceValue.map((w, i) => (
                      <WhiskyRow key={w.id} w={w} rank={i + 1} extra={
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <ScoreBadge score={w.avgOverall!} />
                          <p style={{ fontSize: 11, color: "var(--labs-text-muted)", margin: 0 }}>€{w.price?.toFixed(0)}</p>
                        </div>
                      } />
                    ))}
                  </div>
                )}
              </StatCard>

              <StatCard title={t("exploreStats.mostTasted", "Most Tasted")} subtitle={t("exploreStats.mostTastedSub", "Whiskies with most ratings")} icon={Users} testId="stat-card-most-tasted">
                {mostTasted.length === 0 ? <NoData message={noDataMsg} /> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {mostTasted.map((w, i) => (
                      <WhiskyRow key={w.id} w={w} rank={i + 1} extra={
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--labs-text)" }}>{w.ratingCount}</span>
                          <p style={{ fontSize: 11, color: "var(--labs-text-muted)", margin: 0 }}>ratings</p>
                        </div>
                      } />
                    ))}
                  </div>
                )}
              </StatCard>

              <StatCard title={t("exploreStats.divisive", "Divisive Drams")} subtitle={t("exploreStats.divisiveSub", "Most polarizing whiskies")} icon={Zap} testId="stat-card-divisive">
                {divisiveDrams.length === 0 ? <NoData message={noDataMsg} /> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {divisiveDrams.map((w, i) => (
                      <WhiskyRow key={w.id} w={w} rank={i + 1} extra={
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <ScoreBadge score={w.avgOverall!} />
                          <p style={{ fontSize: 11, color: "var(--labs-accent)", fontWeight: 600, margin: 0 }}>
                            Var: {w.scoreVariance?.toFixed(1)}
                          </p>
                        </div>
                      } />
                    ))}
                  </div>
                )}
              </StatCard>
            </div>
          )}

          {activeTab === "comparisons" && (
            <div style={gridStyle} data-testid="statistics-grid-comparisons">
              <StatCard title={t("exploreStats.distilleryRanking", "Distillery Ranking")} subtitle={t("exploreStats.distilleryRankingSub", "By average score (min. 3 whiskies)")} icon={Award} testId="stat-card-distillery-ranking">
                {distilleryRanking.length === 0 ? <NoData message={noDataMsg} /> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {distilleryRanking.map((d, i) => {
                      const maxScore = Math.max(...distilleryRanking.map(x => x.avgScore), 1);
                      return <BarRow key={d.name} label={`${i + 1}. ${d.name}`} value={d.avgScore} maxValue={maxScore} count={d.count} />;
                    })}
                  </div>
                )}
              </StatCard>

              <StatCard title={t("exploreStats.regionRanking", "Region Ranking")} subtitle={t("exploreStats.regionRankingSub", "Average score by region")} icon={BarChart3} testId="stat-card-region-ranking">
                {regionRanking.length === 0 ? <NoData message={noDataMsg} /> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {regionRanking.map((r) => {
                      const maxScore = Math.max(...regionRanking.map(x => x.avgScore), 1);
                      return <BarRow key={r.region} label={r.region} value={r.avgScore} maxValue={maxScore} count={r.count} />;
                    })}
                  </div>
                )}
              </StatCard>

              <StatCard title={t("exploreStats.caskTypeRanking", "Cask Type Ranking")} subtitle={t("exploreStats.caskTypeRankingSub", "Average score by cask type")} icon={Wine} testId="stat-card-cask-ranking">
                {caskTypeRanking.length === 0 ? <NoData message={noDataMsg} /> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {caskTypeRanking.map((c) => {
                      const maxScore = Math.max(...caskTypeRanking.map(x => x.avgScore), 1);
                      return <BarRow key={c.cask} label={c.cask} value={c.avgScore} maxValue={maxScore} count={c.count} />;
                    })}
                  </div>
                )}
              </StatCard>
            </div>
          )}

          {activeTab === "analysis" && (
            <div style={gridStyle} data-testid="statistics-grid-analysis">
              <StatCard title={t("exploreStats.peatVsScore", "Peat Level vs. Score")} subtitle={t("exploreStats.peatVsScoreSub", "Scores by peat level")} icon={Flame} testId="stat-card-peat-score">
                {peatVsScore.length === 0 ? <NoData message={noDataMsg} /> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {peatVsScore.map((p) => {
                      const maxScore = Math.max(...peatVsScore.map(x => x.avgScore), 1);
                      return <BarRow key={p.level} label={p.level} value={p.avgScore} maxValue={maxScore} count={p.count} />;
                    })}
                  </div>
                )}
              </StatCard>

              <StatCard title={t("exploreStats.ageVsScore", "Age vs. Score")} subtitle={t("exploreStats.ageVsScoreSub", "Scores by age band")} icon={Calendar} testId="stat-card-age-score">
                {ageVsScore.length === 0 ? <NoData message={noDataMsg} /> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {ageVsScore.map((a) => {
                      const maxScore = Math.max(...ageVsScore.map(x => x.avgScore), 1);
                      return <BarRow key={a.band} label={a.band} value={a.avgScore} maxValue={maxScore} count={a.count} />;
                    })}
                  </div>
                )}
              </StatCard>

              <StatCard title={t("exploreStats.abvVsScore", "ABV vs. Score")} subtitle={t("exploreStats.abvVsScoreSub", "Scores by ABV band")} icon={Percent} testId="stat-card-abv-score">
                {abvVsScore.length === 0 ? <NoData message={noDataMsg} /> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {abvVsScore.map((a) => {
                      const maxScore = Math.max(...abvVsScore.map(x => x.avgScore), 1);
                      return <BarRow key={a.band} label={a.band} value={a.avgScore} maxValue={maxScore} count={a.count} />;
                    })}
                  </div>
                )}
              </StatCard>

              <StatCard title={t("exploreStats.noseTasteFinish", "Nose / Taste / Finish")} subtitle={t("exploreStats.noseTasteFinishSub", "Top whiskies per dimension")} icon={Eye} testId="stat-card-dimension-breakdown">
                {noseTopWhiskies.length === 0 && tasteTopWhiskies.length === 0 && finishTopWhiskies.length === 0 ? (
                  <NoData message={noDataMsg} />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {noseTopWhiskies.length > 0 && (
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text-secondary)", margin: "0 0 8px" }}>👃 {t("exploreStats.bestNose", "Best Nose")}</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {noseTopWhiskies.slice(0, 3).map((w) => (
                            <WhiskyRow key={w.id} w={w} extra={
                              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--labs-accent)" }}>{w.avgNose?.toFixed(1)}</span>
                            } />
                          ))}
                        </div>
                      </div>
                    )}
                    {tasteTopWhiskies.length > 0 && (
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text-secondary)", margin: "0 0 8px" }}>👅 {t("exploreStats.bestTaste", "Best Taste")}</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {tasteTopWhiskies.slice(0, 3).map((w) => (
                            <WhiskyRow key={w.id} w={w} extra={
                              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--labs-accent)" }}>{w.avgTaste?.toFixed(1)}</span>
                            } />
                          ))}
                        </div>
                      </div>
                    )}
                    {finishTopWhiskies.length > 0 && (
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text-secondary)", margin: "0 0 8px" }}>✨ {t("exploreStats.bestFinish", "Best Finish")}</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {finishTopWhiskies.slice(0, 3).map((w) => (
                            <WhiskyRow key={w.id} w={w} extra={
                              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--labs-accent)" }}>{w.avgFinish?.toFixed(1)}</span>
                            } />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </StatCard>

              <StatCard title={t("exploreStats.wbVsCommunity", "Whiskybase vs. Community")} subtitle={t("exploreStats.wbVsCommunitySub", "External vs. community scores")} icon={TrendingUp} testId="stat-card-wb-community">
                {wbVsCommunity.length === 0 ? <NoData message={noDataMsg} /> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {wbVsCommunity.map((w, i) => (
                      <WhiskyRow key={w.id} w={w} rank={i + 1} extra={
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>WB: {w.wbScore?.toFixed(0)}</div>
                          <div style={{ fontSize: 12, color: w.delta > 0 ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                            {w.delta > 0 ? "+" : ""}{w.delta.toFixed(1)}
                          </div>
                        </div>
                      } />
                    ))}
                  </div>
                )}
              </StatCard>

              <StatCard title={t("exploreStats.vintageAnalysis", "Vintage Analysis")} subtitle={t("exploreStats.vintageAnalysisSub", "Best distillation years")} icon={Calendar} testId="stat-card-vintage">
                {vintageAnalysis.length === 0 ? <NoData message={noDataMsg} /> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {vintageAnalysis.map((v) => {
                      const maxScore = Math.max(...vintageAnalysis.map(x => x.avgScore), 1);
                      return <BarRow key={v.year} label={v.year} value={v.avgScore} maxValue={maxScore} count={v.count} />;
                    })}
                  </div>
                )}
              </StatCard>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
import { useState, useMemo } from "react";
import type { ThemeTokens } from "../../tokens";
import { SP, FONT, RADIUS } from "../../tokens";
import type { Translations } from "../../i18n";
import type { WhiskyResult } from "./InsightsEngine";
import { computeInsights } from "./InsightsEngine";

type InsightTab = "overview" | "vsGroup" | "price" | "profile";

interface Props {
  th: ThemeTokens;
  t: Translations;
  results: WhiskyResult[];
  participantId: string;
  prices?: Record<string, number>;
}

function DeltaBadge({ value, th }: { value: number; th: ThemeTokens }) {
  const positive = value >= 0;
  const color = positive ? th.green : th.amber;
  return (
    <span
      data-testid="badge-delta"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        padding: "2px 8px",
        borderRadius: RADIUS.full,
        fontSize: 12,
        fontWeight: 700,
        fontFamily: FONT.body,
        color,
        background: positive ? "rgba(134,198,120,0.12)" : "rgba(196,122,58,0.12)",
      }}
    >
      {positive ? "+" : ""}{value.toFixed(1)}
    </span>
  );
}

function StatCard({ label, value, sub, th }: { label: string; value: string; sub?: string; th: ThemeTokens }) {
  return (
    <div
      data-testid={`card-stat-${label.toLowerCase().replace(/\s/g, "-")}`}
      style={{
        background: th.bgCard,
        borderRadius: RADIUS.lg,
        padding: SP.md,
        border: `1px solid ${th.border}`,
      }}
    >
      <div style={{ fontSize: 11, fontFamily: FONT.body, color: th.muted, marginBottom: SP.xs, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, fontFamily: FONT.display, color: th.gold }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, fontFamily: FONT.body, color: th.muted, marginTop: SP.xs }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export default function PostTastingInsights({ th, t, results, participantId, prices }: Props) {
  const [activeTab, setActiveTab] = useState<InsightTab>("overview");

  const insights = useMemo(
    () => computeInsights(results, participantId, prices),
    [results, participantId, prices]
  );

  const tabs: { id: InsightTab; label: string }[] = [
    { id: "overview", label: t.resOverview },
    { id: "vsGroup", label: t.resVsGroup },
    { id: "price", label: t.resPriceReveal },
    { id: "profile", label: t.resProfile },
  ];

  const ranked = useMemo(
    () => [...results].filter(r => r.avgOverall != null).sort((a, b) => (b.avgOverall ?? 0) - (a.avgOverall ?? 0)),
    [results]
  );

  return (
    <div data-testid="post-tasting-insights" style={{ fontFamily: FONT.body }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: th.headerBg,
          backdropFilter: "blur(12px)",
          padding: `${SP.md}px ${SP.md}px ${SP.sm}px`,
        }}
      >
        <h2
          data-testid="text-insights-title"
          style={{
            fontFamily: FONT.display,
            fontSize: 22,
            fontWeight: 700,
            color: th.text,
            margin: `0 0 ${SP.md}px`,
          }}
        >
          {t.resInsightsTitle}
        </h2>
        <div
          style={{
            display: "flex",
            gap: SP.sm,
            overflowX: "auto",
            paddingBottom: SP.xs,
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              data-testid={`button-insight-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: `${SP.sm}px ${SP.md}px`,
                borderRadius: RADIUS.full,
                border: "none",
                cursor: "pointer",
                fontFamily: FONT.body,
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: "nowrap",
                transition: "all 0.2s",
                background: activeTab === tab.id ? th.gold : th.bgCard,
                color: activeTab === tab.id ? th.bg : th.muted,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: SP.md }}>
        <div
          key={activeTab}
          style={{
            animation: "v2FadeIn 0.3s ease",
          }}
        >
          {activeTab === "overview" && (
            <div
              data-testid="panel-overview"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: SP.md,
              }}
            >
              <StatCard
                th={th}
                label={t.resYourAvg}
                value={insights.userAvg.toFixed(1)}
                sub={`${insights.userRatingsCount} ${t.resRatings}`}
              />
              <StatCard
                th={th}
                label={t.resGroupAvg}
                value={insights.groupAvg.toFixed(1)}
              />
              {insights.topWhisky && (
                <StatCard
                  th={th}
                  label={t.resTopWhisky}
                  value={insights.topWhisky.score.toFixed(1)}
                  sub={insights.topWhisky.name}
                />
              )}
              {insights.dimensionStrength && (
                <StatCard
                  th={th}
                  label={t.resStrongestDim}
                  value={insights.dimensionStrength.dimension === "nose" ? t.ratingNose : insights.dimensionStrength.dimension === "palate" ? t.ratingPalate : t.ratingFinish}
                  sub={`${insights.dimensionStrength.delta >= 0 ? "+" : ""}${insights.dimensionStrength.delta.toFixed(1)} ${t.resVsGroup}`}
                />
              )}
            </div>
          )}

          {activeTab === "vsGroup" && (
            <div data-testid="panel-vs-group">
              <div
                style={{
                  background: th.bgCard,
                  borderRadius: RADIUS.lg,
                  padding: SP.lg,
                  border: `1px solid ${th.border}`,
                  marginBottom: SP.md,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 13, color: th.muted, marginBottom: SP.sm }}>{t.resYourAvg} vs. {t.resGroupAvg}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: SP.md }}>
                  <div>
                    <div style={{ fontSize: 32, fontWeight: 700, fontFamily: FONT.display, color: th.text }}>{insights.userAvg.toFixed(1)}</div>
                    <div style={{ fontSize: 11, color: th.muted }}>{t.youLabel}</div>
                  </div>
                  <DeltaBadge value={insights.delta} th={th} />
                  <div>
                    <div style={{ fontSize: 32, fontWeight: 700, fontFamily: FONT.display, color: th.muted }}>{insights.groupAvg.toFixed(1)}</div>
                    <div style={{ fontSize: 11, color: th.muted }}>{t.resGroup}</div>
                  </div>
                </div>
              </div>

              {insights.biggestOutlier && (
                <div
                  data-testid="card-biggest-outlier"
                  style={{
                    background: th.bgCard,
                    borderRadius: RADIUS.lg,
                    padding: SP.md,
                    border: `1px solid ${th.border}`,
                  }}
                >
                  <div style={{ fontSize: 11, color: th.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: SP.sm }}>{t.resBiggestOutlier}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: th.text, marginBottom: SP.xs }}>{insights.biggestOutlier.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: SP.sm }}>
                    <span style={{ fontSize: 13, color: th.muted }}>{t.youLabel}: {insights.biggestOutlier.userScore.toFixed(1)}</span>
                    <DeltaBadge value={insights.biggestOutlier.delta} th={th} />
                    <span style={{ fontSize: 13, color: th.muted }}>{t.resGroup}: {insights.biggestOutlier.groupScore.toFixed(1)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "price" && (
            <div data-testid="panel-price-reveal">
              {ranked.map((w, i) => {
                const pct = w.avgOverall != null ? Math.min((w.avgOverall / 100) * 100, 100) : 0;
                return (
                  <div
                    key={w.whiskyId}
                    data-testid={`card-price-rank-${i}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: SP.md,
                      padding: `${SP.sm}px 0`,
                      borderBottom: i < ranked.length - 1 ? `1px solid ${th.border}` : "none",
                    }}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: RADIUS.full,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        background: i < 3 ? th.gold : th.bgCard,
                        color: i < 3 ? th.bg : th.muted,
                      }}
                    >
                      {i + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: th.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</div>
                      <div style={{ height: 4, borderRadius: 2, background: th.bgHover, marginTop: SP.xs, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: th.gold, borderRadius: 2, transition: "width 0.6s ease" }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 700, fontFamily: FONT.display, color: th.gold, minWidth: 36, textAlign: "right" }}>
                      {w.avgOverall?.toFixed(1) ?? "--"}
                    </span>
                  </div>
                );
              })}
              {insights.priceSurprise.isSurprise && insights.priceSurprise.cheapestName && (
                <div
                  data-testid="card-price-surprise"
                  style={{
                    marginTop: SP.md,
                    padding: SP.md,
                    borderRadius: RADIUS.lg,
                    background: "rgba(212,168,71,0.08)",
                    border: `1px solid rgba(212,168,71,0.2)`,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: th.gold }}>
                    {t.resPriceSurprise}
                  </div>
                  <div style={{ fontSize: 12, color: th.muted, marginTop: SP.xs }}>
                    {insights.priceSurprise.cheapestName} - #{insights.priceSurprise.cheapestRank}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "profile" && (
            <div data-testid="panel-profile">
              {insights.caskPattern.preferred && (
                <div
                  data-testid="card-cask-preference"
                  style={{
                    background: th.bgCard,
                    borderRadius: RADIUS.lg,
                    padding: SP.lg,
                    border: `1px solid ${th.border}`,
                    marginBottom: SP.md,
                  }}
                >
                  <div style={{ fontSize: 11, color: th.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: SP.sm }}>{t.resCaskPreference}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: FONT.display, color: th.gold, textTransform: "capitalize" }}>
                    {insights.caskPattern.preferred}
                  </div>
                  <div style={{ display: "flex", gap: SP.lg, marginTop: SP.md }}>
                    {insights.caskPattern.sherryAvg != null && (
                      <div>
                        <div style={{ fontSize: 11, color: th.muted }}>Sherry</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: th.text }}>{insights.caskPattern.sherryAvg.toFixed(1)}</div>
                      </div>
                    )}
                    {insights.caskPattern.bourbonAvg != null && (
                      <div>
                        <div style={{ fontSize: 11, color: th.muted }}>Bourbon</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: th.text }}>{insights.caskPattern.bourbonAvg.toFixed(1)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {insights.lowestWhisky && insights.topWhisky && (
                <div
                  style={{
                    background: th.bgCard,
                    borderRadius: RADIUS.lg,
                    padding: SP.md,
                    border: `1px solid ${th.border}`,
                  }}
                >
                  <div style={{ fontSize: 11, color: th.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: SP.md }}>{t.resYourRange}</div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 12, color: th.green }}>{t.resTopWhisky}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: th.text }}>{insights.topWhisky.name}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: FONT.display, color: th.green }}>{insights.topWhisky.score.toFixed(1)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, color: th.amber }}>{t.resLowestWhisky}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: th.text }}>{insights.lowestWhisky.name}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: FONT.display, color: th.amber }}>{insights.lowestWhisky.score.toFixed(1)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        data-testid="dots-navigation"
        style={{
          display: "flex",
          justifyContent: "center",
          gap: SP.sm,
          padding: `${SP.md}px 0`,
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            data-testid={`button-dot-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            style={{
              width: activeTab === tab.id ? 20 : 8,
              height: 8,
              borderRadius: RADIUS.full,
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s",
              background: activeTab === tab.id ? th.gold : th.faint,
              padding: 0,
            }}
            aria-label={tab.label}
          />
        ))}
      </div>

      <style>{`
        @keyframes v2FadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

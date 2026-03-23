import { useState, useEffect, useRef } from "react";
import type { ThemeTokens } from "../../tokens";
import type { Translations } from "../../i18n";
import { SP, FONT, RADIUS } from "../../tokens";
import type { V2Lang } from "../../i18n";
import type { MeineWeltSub } from "./MeineWeltScreen";

interface Props {
  th: ThemeTokens;
  t: Translations;
  lang: V2Lang;
  participantId: string;
  onNavigate: (sub: MeineWeltSub) => void;
}

interface Stats {
  totalTastings: number;
  totalRatings: number;
  avgScore: number;
  activeSince: string | null;
}

interface TimelinePeriod {
  month: string;
  count: number;
  avgScores: { nose: number; taste: number; finish: number; overall: number };
  topRegion: string | null;
  topCask: string | null;
  regionCount: number;
  delta: { overall: number; finish: number } | null;
}

interface Milestone {
  key: string;
  icon: string;
  unlocked: boolean;
  category: string;
}

interface MonthlyReviewData {
  hasData: boolean;
  month: string;
  monthLabel?: { de: string; en: string };
  ratingsCount?: number;
  avgScore?: number;
  newRegions?: string[];
  scoreDelta?: number | null;
}

export default function MeineWeltHub({ th, t, lang, participantId, onNavigate }: Props) {
  const [stats, setStats] = useState<Stats>({ totalTastings: 0, totalRatings: 0, avgScore: 0, activeSince: null });
  const [insightText, setInsightText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<TimelinePeriod[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [monthlyReview, setMonthlyReview] = useState<MonthlyReviewData | null>(null);
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers = { "x-participant-id": participantId };
        const [statsRes, insightRes, timelineRes, milestonesRes, reviewRes] = await Promise.all([
          fetch(`/api/participants/${participantId}/stats`, { headers }),
          fetch(`/api/participants/${participantId}/insights`, { headers }),
          fetch(`/api/participants/${participantId}/palate-timeline`, { headers }),
          fetch(`/api/participants/${participantId}/milestones`, { headers }),
          fetch(`/api/participants/${participantId}/monthly-review`, { headers }),
        ]);
        if (cancelled) return;
        if (statsRes.ok) {
          const s = await statsRes.json();
          setStats({
            totalTastings: s.totalTastings ?? s.tastingCount ?? 0,
            totalRatings: s.totalRatings ?? s.ratingCount ?? 0,
            avgScore: s.avgScore ?? s.averageScore ?? 0,
            activeSince: s.activeSince ?? s.firstTastingDate ?? null,
          });
        }
        if (insightRes.ok) {
          const d = await insightRes.json();
          if (d.insight) {
            setInsightText(typeof d.insight === "string" ? d.insight : d.insight.text || d.insight.content || "");
          }
        }
        if (timelineRes.ok) {
          const d = await timelineRes.json();
          if (d.hasData && d.periods) setTimeline(d.periods);
        }
        if (milestonesRes.ok) {
          const d = await milestonesRes.json();
          if (d.milestones) setMilestones(d.milestones);
        }
        if (reviewRes.ok) {
          const d = await reviewRes.json();
          setMonthlyReview(d);
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [participantId]);

  const statCards = [
    { label: t.mwTastings, value: stats.totalTastings },
    { label: t.mwRatings, value: stats.totalRatings },
    { label: t.mwAvgScore, value: stats.avgScore > 0 ? stats.avgScore.toFixed(1) : "\u2013" },
    { label: t.mwActiveSince, value: stats.activeSince ? new Date(stats.activeSince).getFullYear().toString() : "\u2013" },
  ];

  const navCards: { key: NonNullable<MeineWeltSub>; icon: string; label: string; desc: string }[] = [
    { key: "profile", icon: "\ud83d\udc64", label: t.mwProfile, desc: t.mwProfileDesc },
    { key: "analytics", icon: "\ud83d\udcca", label: t.mwAnalytics, desc: t.mwAnalyticsDesc },
    { key: "connoisseur", icon: "\ud83c\udfaf", label: t.mwConnoisseur, desc: t.mwConnoisseurDesc },
    { key: "journal", icon: "\ud83d\udcd3", label: t.mwJournal, desc: t.mwJournalDesc },
    { key: "compare", icon: "\u2696\ufe0f", label: t.mwCompare, desc: t.mwCompareDesc },
    { key: "calendar", icon: "\ud83d\udcc5", label: t.mwCalendar, desc: t.mwCalendarDesc },
    { key: "tasteprofile", icon: "\ud83c\udf1f", label: t.mwTasteProfile, desc: t.mwStyleSnapshot },
    { key: "recommendations", icon: "\ud83d\udca1", label: t.mwRecommendations, desc: t.mwMatchScore },
    { key: "collection", icon: "\ud83d\udce6", label: t.mwCollection, desc: t.mwCollectionDesc },
  ];

  const whiskyCount = stats.totalRatings;
  const showProgress = whiskyCount < 10;

  const milestoneLabels: Record<string, string> = {
    rating10: t.mwMilestone10,
    rating25: t.mwMilestone25,
    rating50: t.mwMilestone50,
    rating100: t.mwMilestone100,
    regions5: t.mwMilestone5Regions,
    tastings3: t.mwMilestone3Tastings,
    consistency: t.mwMilestoneConsistency,
    tasteTwin: t.mwMilestoneTasteTwin,
    explorer: t.mwMilestoneExplorer,
    confidenceUp: t.mwMilestoneConfidenceUp,
  };

  const unlockedMilestones = milestones.filter(m => m.unlocked);
  const hasTimelineData = timeline.length > 0;
  const hasMilestoneData = milestones.length > 0;

  return (
    <div className="v2-fade-up" style={{ padding: `${SP.lg}px ${SP.md}px` }}>
      <h1
        style={{ fontFamily: FONT.display, fontSize: 24, fontWeight: 600, color: th.text, marginBottom: SP.xs }}
        data-testid="mw-hub-title"
      >
        {t.mwTitle}
      </h1>
      <p style={{ fontSize: 14, color: th.muted, marginBottom: SP.lg }} data-testid="mw-hub-sub">
        {t.mwSub}
      </p>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP.sm, marginBottom: SP.lg }}
        data-testid="mw-stat-grid"
      >
        {statCards.map((s, i) => (
          <div
            key={i}
            style={{
              background: th.bgCard,
              border: `1px solid ${th.border}`,
              borderRadius: RADIUS.lg,
              padding: SP.md,
              textAlign: "center",
            }}
            data-testid={`mw-stat-${i}`}
          >
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT.display, color: th.gold }}>
              {loading ? "\u2026" : s.value}
            </div>
            <div style={{ fontSize: 11, color: th.muted, marginTop: SP.xs, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Monthly Review Card ("Dein Monat") */}
      {!loading && monthlyReview && (
        monthlyReview.hasData ? (
          <MonthlyReviewCard th={th} t={t} data={monthlyReview} lang={lang} />
        ) : (
          <div
            style={{
              background: th.bgCard,
              border: `1px solid ${th.border}`,
              borderRadius: RADIUS.lg,
              padding: SP.md,
              marginBottom: SP.lg,
              textAlign: "center",
            }}
            data-testid="mw-monthly-review-empty"
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: th.muted, marginBottom: SP.xs, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {t.mwMonthlyReview}
            </div>
            <p style={{ fontSize: 13, color: th.faint, margin: 0 }}>{t.mwMonthlyReviewEmpty}</p>
          </div>
        )
      )}

      {/* Palate Timeline */}
      {!loading && (
        hasTimelineData ? (
          <PalateTimeline th={th} t={t} periods={timeline} />
        ) : stats.totalRatings > 0 ? (
          <div
            style={{
              background: th.bgCard,
              border: `1px solid ${th.border}`,
              borderRadius: RADIUS.lg,
              padding: SP.md,
              marginBottom: SP.lg,
              textAlign: "center",
            }}
            data-testid="mw-timeline-empty"
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: th.muted, marginBottom: SP.xs, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {t.mwPalateTimeline}
            </div>
            <p style={{ fontSize: 13, color: th.faint, margin: 0 }}>{t.mwPalateTimelineEmpty}</p>
          </div>
        ) : null
      )}

      {/* Milestone Badges */}
      {!loading && hasMilestoneData && (
        unlockedMilestones.length > 0 ? (
          <MilestoneBadges
            th={th}
            t={t}
            milestones={milestones}
            milestoneLabels={milestoneLabels}
            expandedMilestone={expandedMilestone}
            setExpandedMilestone={setExpandedMilestone}
          />
        ) : (
          <div
            style={{
              background: th.bgCard,
              border: `1px solid ${th.border}`,
              borderRadius: RADIUS.lg,
              padding: SP.md,
              marginBottom: SP.lg,
              textAlign: "center",
            }}
            data-testid="mw-milestones-empty"
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: th.muted, marginBottom: SP.xs, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {t.mwMilestones}
            </div>
            <p style={{ fontSize: 13, color: th.faint, margin: 0 }}>{t.mwMilestonesEmpty}</p>
          </div>
        )
      )}

      {insightText && (
        <div
          style={{
            background: `linear-gradient(135deg, ${th.phases.palate.dim}, ${th.phases.nose.dim})`,
            border: `1px solid ${th.border}`,
            borderRadius: RADIUS.lg,
            padding: SP.md,
            marginBottom: SP.lg,
          }}
          data-testid="mw-insight-card"
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: th.gold, marginBottom: SP.xs, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            \u2726 {t.mwAiInsight}
          </div>
          <p style={{ fontSize: 14, color: th.text, lineHeight: 1.5, margin: 0 }}>
            {insightText}
          </p>
        </div>
      )}

      {showProgress ? (
        <div
          style={{
            background: th.bgCard,
            border: `1px solid ${th.border}`,
            borderRadius: RADIUS.lg,
            padding: SP.md,
            marginBottom: SP.lg,
          }}
          data-testid="mw-progress-tracker"
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: th.text, marginBottom: SP.sm }}>
            {t.mwProgress}
          </div>
          <div style={{ fontSize: 12, color: th.muted, marginBottom: SP.sm }}>
            {whiskyCount} / 10 {t.mwWhiskies}
          </div>
          <div style={{ background: th.border, borderRadius: RADIUS.full, height: 8, overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.min(100, (whiskyCount / 10) * 100)}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${th.gold}, ${th.amber})`,
                borderRadius: RADIUS.full,
                transition: "width 0.5s ease",
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: th.muted, marginTop: SP.xs }}>
            {t.mwProgressHint}
          </div>
        </div>
      ) : (
        <div
          style={{
            background: th.bgCard,
            border: `1px solid ${th.border}`,
            borderRadius: RADIUS.lg,
            padding: SP.md,
            marginBottom: SP.lg,
          }}
          data-testid="mw-palate-bars"
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: th.text, marginBottom: SP.sm }}>
            {t.mwPalateDimensions}
          </div>
          {(["nose", "palate", "finish", "overall"] as const).map((dim, dimIdx) => {
            const phase = th.phases[dim];
            const labels: Record<string, string> = {
              nose: t.ratingNose,
              palate: t.ratingPalate,
              finish: t.ratingFinish,
              overall: t.ratingOverall,
            };
            const offsets = [0.95, 1.05, 0.9, 1.0];
            const val = dim === "overall" ? stats.avgScore : (stats.avgScore * offsets[dimIdx]);
            const clamped = Math.min(100, Math.max(0, val));
            return (
              <div key={dim} style={{ marginBottom: SP.sm }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: th.muted, marginBottom: 2 }}>
                  <span>{labels[dim]}</span>
                  <span style={{ color: phase.accent }}>{clamped.toFixed(0)}</span>
                </div>
                <div style={{ background: phase.dim, borderRadius: RADIUS.full, height: 6, overflow: "hidden" }}>
                  <div style={{ width: `${clamped}%`, height: "100%", background: phase.accent, borderRadius: RADIUS.full, transition: "width 0.5s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP.sm }}
        data-testid="mw-nav-grid"
      >
        {navCards.map((c) => (
          <button
            key={c.key}
            onClick={() => onNavigate(c.key)}
            data-testid={`mw-nav-${c.key}`}
            style={{
              background: th.bgCard,
              border: `1px solid ${th.border}`,
              borderRadius: RADIUS.lg,
              padding: SP.md,
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.2s, transform 0.15s",
              fontFamily: FONT.body,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = th.bgHover; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = th.bgCard; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <div style={{ fontSize: 24, marginBottom: SP.xs }}>{c.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: th.text, marginBottom: 2 }}>{c.label}</div>
            <div style={{ fontSize: 11, color: th.muted, lineHeight: 1.4 }}>{c.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function MiniSparkline({ data, color, width = 60, height = 24 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={parseFloat(points[points.length - 1].split(",")[0])} cy={parseFloat(points[points.length - 1].split(",")[1])} r={2.5} fill={color} />
    </svg>
  );
}

function PalateTimeline({ th, t, periods }: { th: ThemeTokens; t: Translations; periods: TimelinePeriod[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [periods]);

  const monthNames: Record<string, string> = {
    "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun",
    "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
  };

  const overallScores = periods.map(p => p.avgScores.overall);
  const finishScores = periods.map(p => p.avgScores.finish);

  return (
    <div style={{ marginBottom: SP.lg }} data-testid="mw-palate-timeline">
      <div style={{ fontSize: 12, fontWeight: 600, color: th.muted, marginBottom: SP.sm, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {t.mwPalateTimeline}
      </div>
      <div
        ref={scrollRef}
        style={{
          display: "flex",
          gap: SP.sm,
          overflowX: "auto",
          paddingBottom: SP.sm,
          scrollBehavior: "smooth",
          WebkitOverflowScrolling: "touch",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        }}
      >
        {periods.map((p, i) => {
          const [year, monthNum] = p.month.split("-");
          const monthLabel = monthNames[monthNum] || monthNum;
          const deltaText = p.delta
            ? p.delta.overall > 0
              ? `+${p.delta.overall.toFixed(0)}`
              : p.delta.overall < 0
                ? `${p.delta.overall.toFixed(0)}`
                : "±0"
            : null;
          const deltaColor = p.delta
            ? p.delta.overall > 0 ? th.green : p.delta.overall < 0 ? th.amber : th.muted
            : th.muted;

          const trendParts: string[] = [];
          if (p.delta) {
            if (p.delta.overall > 2) {
              trendParts.push(`${t.mwTimelineTrendUp} ${p.topCask || p.topRegion || t.mwTimelineCaskTrend}.`);
            } else if (p.delta.overall < -2) {
              trendParts.push(`${t.mwTimelineTrendDown} ${p.topCask || t.mwTimelineCaskTrend}.`);
            } else {
              trendParts.push(`${t.mwTimelineTrendStable}.`);
            }
            if (Math.abs(p.delta.finish) > 3) {
              trendParts.push(`${t.mwTimelineFinishScore} ${p.delta.finish > 0 ? "+" : ""}${p.delta.finish.toFixed(0)}.`);
            }
          } else if (p.topRegion) {
            trendParts.push(`${p.topRegion} – ${p.regionCount} ${t.mwTimelineRegionTrend}.`);
          }
          const trendText = trendParts.join(" ");

          return (
            <div
              key={p.month}
              style={{
                minWidth: 200,
                maxWidth: 220,
                background: th.bgCard,
                border: `1px solid ${th.border}`,
                borderRadius: RADIUS.lg,
                padding: SP.md,
                flexShrink: 0,
              }}
              data-testid={`mw-timeline-card-${i}`}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: SP.sm }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: th.text }}>
                  {monthLabel} {year}
                </div>
                {deltaText && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: deltaColor }}>
                    {deltaText}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: SP.md, marginBottom: SP.sm }}>
                <div>
                  <div style={{ fontSize: 10, color: th.muted, textTransform: "uppercase" }}>{t.mwTimelineAvgScore}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: FONT.display, color: th.gold }}>
                    {p.avgScores.overall.toFixed(0)}
                  </div>
                </div>
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                  <MiniSparkline
                    data={overallScores.slice(0, i + 1)}
                    color={th.gold}
                    width={80}
                    height={28}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: SP.sm, marginBottom: SP.sm }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: th.muted }}>{t.ratingFinish}</div>
                  <MiniSparkline
                    data={finishScores.slice(0, i + 1)}
                    color={th.phases.finish.accent}
                    width={60}
                    height={20}
                  />
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: th.muted }}>{t.mwTimelineRatings}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: th.text }}>{p.count}</div>
                </div>
              </div>

              {trendText && (
                <p style={{ fontSize: 11, color: th.muted, lineHeight: 1.4, margin: 0 }}>
                  {trendText}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MilestoneBadges({
  th, t, milestones, milestoneLabels, expandedMilestone, setExpandedMilestone,
}: {
  th: ThemeTokens;
  t: Translations;
  milestones: Milestone[];
  milestoneLabels: Record<string, string>;
  expandedMilestone: string | null;
  setExpandedMilestone: (key: string | null) => void;
}) {
  const unlocked = milestones.filter(m => m.unlocked);
  const locked = milestones.filter(m => !m.unlocked);

  return (
    <div style={{ marginBottom: SP.lg }} data-testid="mw-milestones">
      <div style={{ fontSize: 12, fontWeight: 600, color: th.muted, marginBottom: SP.sm, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {t.mwMilestones}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: SP.sm }}>
        {unlocked.map((m) => (
          <div key={m.key} style={{ position: "relative" }}>
            <button
              onClick={() => setExpandedMilestone(expandedMilestone === m.key ? null : m.key)}
              data-testid={`mw-milestone-${m.key}`}
              className="v2-fade-up"
              style={{
                width: 48,
                height: 48,
                borderRadius: RADIUS.lg,
                background: `linear-gradient(135deg, ${th.phases.palate.dim}, ${th.phases.overall.dim})`,
                border: `1px solid ${th.gold}33`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                cursor: "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
                boxShadow: expandedMilestone === m.key ? `0 0 12px ${th.gold}44` : "none",
                fontFamily: FONT.body,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              {m.icon}
            </button>
            {expandedMilestone === m.key && (
              <div
                style={{
                  position: "absolute",
                  bottom: -36,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: th.bgCard,
                  border: `1px solid ${th.border}`,
                  borderRadius: RADIUS.md,
                  padding: `${SP.xs}px ${SP.sm}px`,
                  whiteSpace: "nowrap",
                  fontSize: 11,
                  color: th.text,
                  zIndex: 10,
                  boxShadow: `0 4px 12px rgba(0,0,0,0.3)`,
                }}
              >
                {milestoneLabels[m.key] || m.key}
              </div>
            )}
          </div>
        ))}
        {locked.slice(0, 3).map((m) => (
          <div
            key={m.key}
            style={{
              width: 48,
              height: 48,
              borderRadius: RADIUS.lg,
              background: th.bgCard,
              border: `1px solid ${th.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              opacity: 0.3,
              filter: "grayscale(1)",
            }}
            data-testid={`mw-milestone-locked-${m.key}`}
          >
            {m.icon}
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlyReviewCard({ th, t, data, lang }: { th: ThemeTokens; t: Translations; data: MonthlyReviewData; lang: string }) {
  const monthName = data.monthLabel ? (lang === "de" ? data.monthLabel.de : data.monthLabel.en) : data.month;

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${th.phases.palate.dim}, ${th.phases.finish.dim})`,
        border: `1px solid ${th.gold}33`,
        borderRadius: RADIUS.lg,
        padding: SP.md,
        marginBottom: SP.lg,
      }}
      data-testid="mw-monthly-review"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: SP.sm }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: th.gold, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {t.mwMonthlyReview}
        </div>
        <div style={{ fontSize: 12, color: th.muted }}>
          {monthName}
        </div>
      </div>

      <div style={{ display: "flex", gap: SP.md, marginBottom: SP.sm }}>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: FONT.display, color: th.gold }}>
            {data.ratingsCount}
          </div>
          <div style={{ fontSize: 10, color: th.muted, textTransform: "uppercase" }}>
            {t.mwMonthlyReviewRated}
          </div>
        </div>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: FONT.display, color: th.phases.nose.accent }}>
            {data.avgScore?.toFixed(1) || "\u2013"}
          </div>
          <div style={{ fontSize: 10, color: th.muted, textTransform: "uppercase" }}>
            {t.mwTimelineAvgScore}
          </div>
        </div>
        {data.newRegions && data.newRegions.length > 0 && (
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: FONT.display, color: th.green }}>
              {data.newRegions.length}
            </div>
            <div style={{ fontSize: 10, color: th.muted, textTransform: "uppercase" }}>
              {t.mwMonthlyReviewNewRegions}
            </div>
          </div>
        )}
      </div>

      {data.scoreDelta != null && (
        <div style={{ fontSize: 12, color: th.muted, display: "flex", alignItems: "center", gap: SP.xs }}>
          <span style={{
            color: data.scoreDelta > 0 ? th.green : data.scoreDelta < 0 ? th.amber : th.muted,
            fontWeight: 600,
          }}>
            {data.scoreDelta > 0 ? "\u25b2" : data.scoreDelta < 0 ? "\u25bc" : "\u25cf"}
            {" "}
            {data.scoreDelta > 0
              ? `${data.scoreDelta.toFixed(1)} ${t.mwMonthlyReviewUp}`
              : data.scoreDelta < 0
                ? `${Math.abs(data.scoreDelta).toFixed(1)} ${t.mwMonthlyReviewDown}`
                : t.mwMonthlyReviewSame
            }
          </span>
          <span style={{ color: th.faint }}>{t.mwMonthlyReviewVsPrev}</span>
        </div>
      )}

      {data.newRegions && data.newRegions.length > 0 && (
        <div style={{ marginTop: SP.xs, display: "flex", flexWrap: "wrap", gap: SP.xs }}>
          {data.newRegions.map(r => (
            <span
              key={r}
              style={{
                fontSize: 10,
                padding: `2px ${SP.sm}px`,
                borderRadius: RADIUS.full,
                background: `${th.green}22`,
                color: th.green,
                fontWeight: 600,
              }}
            >
              {r}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

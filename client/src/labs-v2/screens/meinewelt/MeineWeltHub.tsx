import { useState, useEffect } from "react";
import type { ThemeTokens } from "../../tokens";
import type { Translations } from "../../i18n";
import { SP, FONT, RADIUS } from "../../tokens";
import type { MeineWeltSub } from "./MeineWeltScreen";

interface Props {
  th: ThemeTokens;
  t: Translations;
  participantId: string;
  onNavigate: (sub: MeineWeltSub) => void;
}

interface Stats {
  totalTastings: number;
  totalRatings: number;
  avgScore: number;
  activeSince: string | null;
}

export default function MeineWeltHub({ th, t, participantId, onNavigate }: Props) {
  const [stats, setStats] = useState<Stats>({ totalTastings: 0, totalRatings: 0, avgScore: 0, activeSince: null });
  const [insightText, setInsightText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers = { "x-participant-id": participantId };
        const [statsRes, insightRes] = await Promise.all([
          fetch(`/api/participants/${participantId}/stats`, { headers }),
          fetch(`/api/participants/${participantId}/insights`, { headers }),
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
  ];

  const whiskyCount = stats.totalRatings;
  const showProgress = whiskyCount < 10;

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

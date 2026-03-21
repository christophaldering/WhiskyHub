import { useState, useEffect } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";
import type { ThemeTokens } from "../../tokens";
import type { Translations } from "../../i18n";
import { SP, FONT, RADIUS } from "../../tokens";
import SubScreenHeader from "./SubScreenHeader";

interface Props {
  th: ThemeTokens;
  t: Translations;
  participantId: string;
  onBack: () => void;
}

type CompareMode = "me" | "friends" | "global";

interface ProfileData {
  tasteStructure: Record<string, number> | null;
  ratingStyle: { meanScore: number; stdDev: number; nRatings: number; scaleRange: { min: number; max: number } } | null;
  confidence: Record<string, { level: string; percent: number; n: number }>;
  comparisonData: { medians: Record<string, number> } | null;
}

export default function TasteProfile({ th, t, participantId, onBack }: Props) {
  const [mode, setMode] = useState<CompareMode>("me");
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const compare = mode === "friends" ? "friends" : mode === "global" ? "platform" : "none";
        const res = await fetch(`/api/participants/${participantId}/whisky-profile?compare=${compare}`, {
          headers: { "x-participant-id": participantId },
        });
        if (!cancelled && res.ok) {
          setData(await res.json());
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [participantId, mode]);

  const dims = [
    { key: "nose", label: t.ratingNose },
    { key: "taste", label: t.ratingPalate },
    { key: "finish", label: t.ratingFinish },
    { key: "overall", label: t.ratingOverall },
  ];

  const chartData = dims.map((d) => ({
    dimension: d.label,
    user: data?.tasteStructure?.[d.key] ?? 0,
    comparison: data?.comparisonData?.medians?.[d.key] ?? 0,
  }));

  const modes: { key: CompareMode; label: string }[] = [
    { key: "me", label: t.mwJustMe },
    { key: "friends", label: t.mwFriends },
    { key: "global", label: t.mwGlobal },
  ];

  const confidenceBadge = (key: string) => {
    const c = data?.confidence?.[key];
    if (!c) return null;
    const colors: Record<string, string> = { stable: th.green, tendency: th.gold, preliminary: th.muted };
    return (
      <span style={{
        fontSize: 10, fontWeight: 600, padding: `2px ${SP.sm}px`,
        borderRadius: RADIUS.full, background: `${colors[c.level] || th.muted}22`,
        color: colors[c.level] || th.muted,
      }}>
        {c.percent}% ({c.n})
      </span>
    );
  };

  return (
    <div className="v2-fade-up" style={{ padding: `${SP.lg}px ${SP.md}px` }}>
      <SubScreenHeader th={th} title={t.mwTasteProfile} onBack={onBack} />

      <div style={{ display: "flex", gap: SP.xs, marginBottom: SP.lg }} data-testid="mw-tp-modes">
        {modes.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            data-testid={`mw-tp-mode-${m.key}`}
            style={{
              flex: 1,
              padding: `${SP.sm}px ${SP.md}px`,
              fontSize: 13,
              fontWeight: mode === m.key ? 600 : 400,
              fontFamily: FONT.body,
              background: mode === m.key ? th.bgCard : "transparent",
              color: mode === m.key ? th.gold : th.muted,
              border: `1px solid ${mode === m.key ? th.gold : th.border}`,
              borderRadius: RADIUS.full,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: SP.xxl, color: th.muted }}>...</div>
      ) : (
        <>
          <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, padding: SP.md, marginBottom: SP.lg }} data-testid="mw-tp-radar">
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={chartData}>
                <PolarGrid stroke={th.border} />
                <PolarAngleAxis dataKey="dimension" tick={{ fill: th.muted, fontSize: 12 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="You" dataKey="user" stroke={th.gold} fill={th.gold} fillOpacity={0.25} strokeWidth={2} />
                {mode !== "me" && data?.comparisonData && (
                  <Radar name={mode === "friends" ? t.mwFriends : t.mwGlobal} dataKey="comparison" stroke={th.phases.nose.accent} fill={th.phases.nose.accent} fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 4" />
                )}
                {mode !== "me" && data?.comparisonData && <Legend wrapperStyle={{ fontSize: 11, color: th.muted }} />}
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ marginBottom: SP.lg }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: th.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: SP.sm }}>
              {t.mwConfidence}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: SP.sm }}>
              {dims.map((d) => (
                <div key={d.key} style={{ display: "flex", alignItems: "center", gap: SP.xs }}>
                  <span style={{ fontSize: 12, color: th.text }}>{d.label}</span>
                  {confidenceBadge(d.key)}
                </div>
              ))}
            </div>
          </div>

          {data?.ratingStyle && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP.sm }} data-testid="mw-tp-style">
              <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, padding: SP.md, textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: FONT.display, color: th.gold }}>{data.ratingStyle.meanScore.toFixed(1)}</div>
                <div style={{ fontSize: 11, color: th.muted, marginTop: SP.xs }}>{t.mwMeanScore}</div>
              </div>
              <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, padding: SP.md, textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: FONT.display, color: th.amber }}>
                  {data.ratingStyle.scaleRange.min.toFixed(0)}\u2013{data.ratingStyle.scaleRange.max.toFixed(0)}
                </div>
                <div style={{ fontSize: 11, color: th.muted, marginTop: SP.xs }}>{t.mwSpread}</div>
              </div>
              <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, padding: SP.md, textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: FONT.display, color: th.phases.nose.accent }}>\u00b1{data.ratingStyle.stdDev.toFixed(1)}</div>
                <div style={{ fontSize: 11, color: th.muted, marginTop: SP.xs }}>{t.mwConsistency}</div>
              </div>
              <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, padding: SP.md, textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: FONT.display, color: th.green }}>{data.ratingStyle.nRatings}</div>
                <div style={{ fontSize: 11, color: th.muted, marginTop: SP.xs }}>{t.mwNRatings}</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

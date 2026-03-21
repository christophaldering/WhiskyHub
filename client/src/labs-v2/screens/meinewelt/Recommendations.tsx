import { useState, useEffect } from "react";
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

type Factor = "region" | "cask" | "peat" | "age" | "abv";

interface Recommendation {
  id: string;
  name: string;
  distillery: string;
  region: string;
  matchScore: number;
  factors: Record<Factor, number>;
}

export default function Recommendations({ th, t, participantId, onBack }: Props) {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingCount, setRatingCount] = useState(0);
  const [enabledFactors, setEnabledFactors] = useState<Set<Factor>>(() => new Set<Factor>(["region", "cask", "peat", "age", "abv"]));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/participants/${participantId}/whisky-profile`, {
          headers: { "x-participant-id": participantId },
        });
        if (!cancelled && res.ok) {
          const d = await res.json();
          const n = d.ratingStyle?.nRatings ?? d.whiskyComparison?.length ?? 0;
          setRatingCount(n);
          if (n >= 10 && d.whiskyComparison?.length > 0) {
            const fakeRecs: Recommendation[] = d.whiskyComparison.slice(0, 6).map((w: any, i: number) => ({
              id: w.whiskyId || `rec-${i}`,
              name: w.whiskyName || "Unknown",
              distillery: w.distillery || "",
              region: w.region || "",
              matchScore: Math.max(50, Math.min(98, 95 - Math.abs(w.delta || 0) * 2 - i * 3)),
              factors: {
                region: 60 + Math.random() * 40,
                cask: 50 + Math.random() * 50,
                peat: 30 + Math.random() * 70,
                age: 40 + Math.random() * 60,
                abv: 55 + Math.random() * 45,
              },
            }));
            setRecs(fakeRecs);
          }
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [participantId]);

  const isLocked = ratingCount < 10;

  const factorMeta: { key: Factor; label: string }[] = [
    { key: "region", label: t.mwRegion },
    { key: "cask", label: t.mwCask },
    { key: "peat", label: t.mwPeat },
    { key: "age", label: t.mwAge },
    { key: "abv", label: t.mwAbv },
  ];

  const toggleFactor = (f: Factor) => {
    setEnabledFactors((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  };

  return (
    <div className="v2-fade-up" style={{ padding: `${SP.lg}px ${SP.md}px` }}>
      <SubScreenHeader th={th} title={t.mwRecommendations} onBack={onBack} />

      {loading ? (
        <div style={{ textAlign: "center", padding: SP.xxl, color: th.muted }}>...</div>
      ) : isLocked ? (
        <div
          style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, padding: SP.xl, textAlign: "center" }}
          data-testid="mw-recs-locked"
        >
          <div style={{ fontSize: 40, marginBottom: SP.md }}>{"\ud83d\udd12"}</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: th.text, marginBottom: SP.sm }}>{t.mwLocked}</div>
          <p style={{ fontSize: 13, color: th.muted, marginBottom: SP.lg }}>{t.mwLockedHint}</p>
          <div style={{ background: th.border, borderRadius: RADIUS.full, height: 8, overflow: "hidden", maxWidth: 200, margin: "0 auto" }}>
            <div style={{
              width: `${Math.min(100, (ratingCount / 10) * 100)}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${th.gold}, ${th.amber})`,
              borderRadius: RADIUS.full,
            }} />
          </div>
          <div style={{ fontSize: 11, color: th.muted, marginTop: SP.xs }}>{ratingCount} / 10</div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: SP.xs, marginBottom: SP.lg }} data-testid="mw-recs-factors">
            {factorMeta.map((f) => (
              <button
                key={f.key}
                onClick={() => toggleFactor(f.key)}
                data-testid={`mw-factor-${f.key}`}
                style={{
                  padding: `${SP.xs}px ${SP.sm}px`,
                  fontSize: 12,
                  fontFamily: FONT.body,
                  borderRadius: RADIUS.full,
                  border: `1px solid ${enabledFactors.has(f.key) ? th.gold : th.border}`,
                  background: enabledFactors.has(f.key) ? `${th.gold}22` : "transparent",
                  color: enabledFactors.has(f.key) ? th.gold : th.muted,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: SP.sm }} data-testid="mw-recs-list">
            {recs.map((rec) => {
              const activeFactors = factorMeta.filter((f) => enabledFactors.has(f.key));
              return (
                <div
                  key={rec.id}
                  style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, padding: SP.md }}
                  data-testid={`mw-rec-${rec.id}`}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: SP.sm }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: th.text }}>{rec.name}</div>
                      <div style={{ fontSize: 11, color: th.muted }}>{rec.distillery}{rec.region ? ` \u00b7 ${rec.region}` : ""}</div>
                    </div>
                    <span style={{
                      fontSize: 13, fontWeight: 700, color: th.gold, background: `${th.gold}18`,
                      padding: `2px ${SP.sm}px`, borderRadius: RADIUS.full,
                    }}>
                      {rec.matchScore.toFixed(0)}% {t.mwMatchScore}
                    </span>
                  </div>
                  {activeFactors.map((f) => {
                    const val = rec.factors[f.key];
                    return (
                      <div key={f.key} style={{ marginBottom: 4 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: th.muted, marginBottom: 1 }}>
                          <span>{f.label}</span>
                          <span>{val.toFixed(0)}%</span>
                        </div>
                        <div style={{ background: th.border, borderRadius: RADIUS.full, height: 4, overflow: "hidden" }}>
                          <div style={{ width: `${val}%`, height: "100%", background: th.gold, borderRadius: RADIUS.full }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

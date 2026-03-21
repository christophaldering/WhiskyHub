import type { ThemeTokens } from "../../tokens";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";
import type { Translations } from "../../i18n";
import type { RatingData, PhaseId } from "../../types/rating";
import PhaseSignature from "../../components/PhaseSignature";
import { Whisky } from "../../icons";

interface RatingSummaryProps {
  th: ThemeTokens;
  t: Translations;
  data: RatingData;
  whisky: { name?: string; blind: boolean };
  dramIdx: number;
  onNext: () => void;
  onEdit: () => void;
}

const PHASES: PhaseId[] = ["nose", "palate", "finish", "overall"];

function phaseLabelKey(id: PhaseId): keyof Translations {
  const map: Record<PhaseId, keyof Translations> = {
    nose: "ratingNose", palate: "ratingPalate", finish: "ratingFinish", overall: "ratingOverall",
  };
  return map[id];
}

function getBandColor(score: number): string {
  if (score >= 90) return "#d4a847";
  if (score >= 85) return "#c4a040";
  if (score >= 80) return "#86c678";
  if (score >= 70) return "#7ab8c4";
  return "rgba(200,180,160,0.5)";
}

export default function RatingSummary({ th, t, data, whisky, dramIdx, onNext, onEdit }: RatingSummaryProps) {
  const avg = Math.round(
    (data.scores.nose + data.scores.palate + data.scores.finish + data.scores.overall) / 4
  );

  return (
    <div className="v2-fade-up" style={{ padding: `${SP.xl}px ${SP.md}px` }}>
      <div style={{ textAlign: "center", marginBottom: SP.xl }} className="v2-fade-up">
        <div style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${th.gold}, ${th.amber})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto",
          marginBottom: SP.md,
          border: `2px solid ${th.gold}`,
        }}>
          <Whisky color="#0e0b05" size={32} />
        </div>
        <h2
          data-testid="summary-whisky-name"
          style={{
            fontFamily: FONT.display,
            fontSize: 22,
            fontWeight: 600,
            color: th.text,
            marginBottom: SP.xs,
          }}
        >
          {whisky.blind ? `Blind Sample #${dramIdx}` : (whisky.name || `Dram #${dramIdx}`)}
        </h2>
        <p style={{ fontSize: 14, color: th.muted, fontFamily: FONT.body }}>{t.ratingDone}.</p>
      </div>

      <div
        className="v2-fade-up"
        style={{
          background: th.bgCard,
          border: `1px solid ${th.border}`,
          borderRadius: RADIUS.xl,
          padding: SP.lg,
          marginBottom: SP.lg,
          animationDelay: "0.1s",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: SP.md }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: th.text, fontFamily: FONT.body }}>
            {t.ratingMyRating}
          </span>
          <span
            data-testid="summary-avg-score"
            style={{ fontSize: 48, fontWeight: 700, color: getBandColor(avg), fontFamily: FONT.body, lineHeight: 1 }}
          >
            {avg}
          </span>
        </div>

        {PHASES.map((pid) => {
          const pPhase = th.phases[pid];
          const score = data.scores[pid];
          const pct = ((score - 60) / 40) * 100;
          const pTags = data.tags[pid];

          return (
            <div key={pid} style={{ marginBottom: SP.md }}>
              <div style={{ display: "flex", alignItems: "center", gap: SP.sm, marginBottom: SP.xs }}>
                <PhaseSignature phaseId={pid} th={th} size="normal" />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: th.text, fontFamily: FONT.body }}>
                  {String(t[phaseLabelKey(pid)])}
                </span>
                <span
                  data-testid={`summary-score-${pid}`}
                  style={{ fontSize: 18, fontWeight: 700, color: getBandColor(score), fontFamily: FONT.body }}
                >
                  {score}
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: th.border, marginBottom: SP.xs }}>
                <div style={{
                  height: "100%",
                  borderRadius: 3,
                  background: pPhase.accent,
                  width: `${pct}%`,
                  transition: "width 0.3s",
                }} />
              </div>
              {pTags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: SP.xs }}>
                  {pTags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: 11,
                        padding: `2px ${SP.sm}px`,
                        borderRadius: 10,
                        background: pPhase.dim,
                        color: pPhase.accent,
                        fontFamily: FONT.body,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        data-testid="summary-next-btn"
        onClick={onNext}
        className="v2-fade-up"
        style={{
          width: "100%",
          height: 56,
          background: `linear-gradient(135deg, ${th.gold}, ${th.amber})`,
          color: "#0e0b05",
          border: "none",
          borderRadius: RADIUS.full,
          fontSize: 17,
          fontWeight: 700,
          fontFamily: FONT.body,
          cursor: "pointer",
          marginBottom: SP.sm,
          animationDelay: "0.2s",
        }}
      >
        {t.ratingNext} #{dramIdx + 1} \u2192
      </button>

      <button
        data-testid="summary-edit-btn"
        onClick={onEdit}
        style={{
          width: "100%",
          minHeight: TOUCH_MIN,
          background: "none",
          color: th.muted,
          border: "none",
          fontSize: 15,
          fontFamily: FONT.body,
          cursor: "pointer",
        }}
      >
        {t.ratingEdit}
      </button>
    </div>
  );
}

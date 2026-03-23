import type { ThemeTokens } from "./theme";
import { SP, FONT, RADIUS, TOUCH_MIN } from "./theme";
import { BackIcon } from "./icons";
import PhaseSignature from "./PhaseSignature";

interface RatingLabels {
  modeQ: string;
  modeSub: string;
  guided: string;
  guidedD: string;
  guidedH: string;
  compact: string;
  compactD: string;
  compactH: string;
  quick?: string;
  quickD?: string;
  quickH?: string;
  back: string;
}

interface RatingModeSelectProps {
  th: ThemeTokens;
  labels: RatingLabels;
  onSelect: (mode: "guided" | "compact" | "quick") => void;
  onBack: () => void;
}

export default function RatingModeSelect({ th, labels, onSelect, onBack }: RatingModeSelectProps) {
  const cards: Array<{
    mode: "guided" | "compact" | "quick";
    title: string;
    desc: string;
    hint: string;
    phaseId: "nose" | "palate" | "overall";
  }> = [
    { mode: "guided", title: labels.guided, desc: labels.guidedD, hint: labels.guidedH, phaseId: "nose" },
    { mode: "compact", title: labels.compact, desc: labels.compactD, hint: labels.compactH, phaseId: "palate" },
    { mode: "quick", title: labels.quick || "Quick", desc: labels.quickD || "Overall score only — two taps and done.", hint: labels.quickH || "When time is short.", phaseId: "overall" },
  ];

  return (
    <div className="labs-fade-in" style={{ padding: `${SP.xl}px ${SP.md}px` }}>
      <button
        onClick={onBack}
        data-testid="rating-mode-back"
        style={{
          display: "flex",
          alignItems: "center",
          gap: SP.sm,
          minHeight: TOUCH_MIN,
          background: "none",
          border: "none",
          color: th.text,
          cursor: "pointer",
          padding: 0,
          fontFamily: FONT.body,
          fontSize: 15,
          marginBottom: SP.lg,
        }}
      >
        <BackIcon color={th.text} size={20} />
        <span>{labels.back}</span>
      </button>

      <h1
        data-testid="rating-mode-title"
        style={{
          fontFamily: FONT.display,
          fontSize: 28,
          fontWeight: 600,
          color: th.text,
          marginBottom: SP.sm,
        }}
      >
        {labels.modeQ}
      </h1>

      <p style={{
        fontFamily: FONT.body,
        fontSize: 14,
        color: th.muted,
        marginBottom: SP.xl,
        lineHeight: 1.5,
      }}>
        {labels.modeSub}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: SP.md }}>
        {cards.map(({ mode, title, desc, hint, phaseId }) => {
          const phase = th.phases[phaseId];
          return (
            <button
              key={mode}
              data-testid={`rating-mode-${mode}`}
              onClick={() => onSelect(mode)}
              style={{
                display: "flex",
                gap: SP.md,
                padding: SP.lg,
                background: th.bgCard,
                border: `1px solid ${th.border}`,
                borderRadius: RADIUS.lg,
                cursor: "pointer",
                textAlign: "left",
                transition: "border-color 0.2s, background 0.2s",
                minHeight: TOUCH_MIN,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `${phase.accent}66`;
                e.currentTarget.style.background = phase.dim;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = th.border;
                e.currentTarget.style.background = th.bgCard;
              }}
            >
              <PhaseSignature phaseId={phaseId} th={th} size="large" />
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: FONT.display,
                  fontSize: 20,
                  fontWeight: 600,
                  color: th.text,
                  marginBottom: SP.xs,
                }}>
                  {title}
                </div>
                <div style={{
                  fontFamily: FONT.body,
                  fontSize: 14,
                  color: th.muted,
                  marginBottom: SP.sm,
                  lineHeight: 1.5,
                }}>
                  {desc}
                </div>
                <div style={{
                  fontFamily: FONT.serif,
                  fontSize: 13,
                  fontStyle: "italic",
                  color: th.faint,
                }}>
                  {hint}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

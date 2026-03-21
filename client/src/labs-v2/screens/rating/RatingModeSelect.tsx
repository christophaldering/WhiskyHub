import type { ThemeTokens } from "../../tokens";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";
import type { Translations } from "../../i18n";
import { Back } from "../../icons";
import PhaseSignature from "../../components/PhaseSignature";

interface RatingModeSelectProps {
  th: ThemeTokens;
  t: Translations;
  whisky: { name?: string; blind: boolean };
  dramIdx: number;
  total: number;
  onSelect: (mode: "guided" | "compact") => void;
  onBack: () => void;
}

export default function RatingModeSelect({ th, t, dramIdx, total, onSelect, onBack }: RatingModeSelectProps) {
  const cards: Array<{
    mode: "guided" | "compact";
    title: string;
    desc: string;
    hint: string;
    phaseId: "nose" | "palate";
  }> = [
    { mode: "guided", title: t.ratingGuided, desc: t.ratingGuidedD, hint: t.ratingGuidedH, phaseId: "nose" },
    { mode: "compact", title: t.ratingCompact, desc: t.ratingCompactD, hint: t.ratingCompactH, phaseId: "palate" },
  ];

  return (
    <div className="v2-fade-up" style={{ padding: `${SP.xl}px ${SP.md}px` }}>
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
        <Back color={th.text} size={20} />
        <span>{t.back}</span>
      </button>

      <div style={{ display: "flex", gap: SP.xs, marginBottom: SP.lg }}>
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            data-testid={`dram-progress-${i}`}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: i < dramIdx ? th.gold : i === dramIdx - 1 ? th.gold : th.border,
              opacity: i < dramIdx ? 1 : 0.4,
            }}
          />
        ))}
      </div>

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
        {t.ratingModeQ}
      </h1>
      <p
        data-testid="rating-mode-subtitle"
        style={{
          fontSize: 15,
          fontFamily: FONT.body,
          color: th.muted,
          marginBottom: SP.xl,
        }}
      >
        {t.ratingModeSub}
      </p>

      {cards.map((card, i) => (
        <button
          key={card.mode}
          data-testid={`rating-mode-${card.mode}`}
          onClick={() => onSelect(card.mode)}
          className="v2-fade-up"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "flex-start",
            gap: SP.md,
            padding: SP.lg,
            background: th.bgCard,
            border: `1px solid ${th.border}`,
            borderRadius: RADIUS.xl,
            cursor: "pointer",
            textAlign: "left",
            marginBottom: SP.md,
            animationDelay: `${i * 80}ms`,
            transition: "border-color 0.2s, background 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = th.phases[card.phaseId].dim;
            e.currentTarget.style.borderColor = th.phases[card.phaseId].accent;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = th.bgCard;
            e.currentTarget.style.borderColor = th.border;
          }}
        >
          <PhaseSignature phaseId={card.phaseId} th={th} size="large" />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT.display, fontSize: 19, fontWeight: 700, color: th.text, marginBottom: SP.xs }}>
              {card.title}
            </div>
            <div style={{ fontFamily: FONT.body, fontSize: 14, color: th.muted, lineHeight: 1.5, marginBottom: SP.xs }}>
              {card.desc}
            </div>
            <div style={{ fontFamily: FONT.body, fontSize: 13, color: th.faint, fontStyle: "italic" }}>
              {card.hint}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

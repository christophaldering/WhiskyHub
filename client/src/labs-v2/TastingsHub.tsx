import { useV2Theme, useV2Lang } from "./LabsV2Layout";
import { Join, Solo, Host, ChevronRight, Whisky, type IconProps } from "./icons";
import { SP, FONT, RADIUS, TOUCH_MIN, type ThemeTokens, type PhaseTokens } from "./tokens";
import type { Translations } from "./i18n";

interface HubProps {
  onJoin: () => void;
  onSolo: () => void;
  onHost: () => void;
}

interface CardDef {
  getTitle: (t: Translations) => string;
  getDesc: (t: Translations) => string;
  icon: (p: IconProps) => React.JSX.Element;
  phase: (th: ThemeTokens) => PhaseTokens;
  action: () => void;
  testId: string;
}

export default function TastingsHub({ onJoin, onSolo, onHost }: HubProps) {
  const { th } = useV2Theme();
  const { t } = useV2Lang();

  const cards: CardDef[] = [
    { getTitle: (t) => t.hubJoin, getDesc: (t) => t.hubJoinDesc, icon: Join, phase: (th) => th.phases.nose, action: onJoin, testId: "v2-card-join" },
    { getTitle: (t) => t.hubSolo, getDesc: (t) => t.hubSoloDesc, icon: Solo, phase: (th) => th.phases.palate, action: onSolo, testId: "v2-card-solo" },
    { getTitle: (t) => t.hubHost, getDesc: (t) => t.hubHostDesc, icon: Host, phase: (th) => th.phases.finish, action: onHost, testId: "v2-card-host" },
  ];

  return (
    <div className="v2-fade-up" style={{ padding: `${SP.xl}px ${SP.md}px` }}>
      <h1
        style={{
          fontFamily: FONT.display,
          fontSize: 28,
          fontWeight: 600,
          marginBottom: SP.sm,
          color: th.text,
        }}
        data-testid="v2-hub-greeting"
      >
        {t.hubGreeting}
      </h1>
      <p
        style={{
          fontFamily: FONT.body,
          fontSize: 15,
          color: th.muted,
          marginBottom: SP.xl,
        }}
        data-testid="v2-hub-sub"
      >
        {t.hubSub}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: SP.md }}>
        {cards.map((card, idx) => {
          const CardIcon = card.icon;
          const phase = card.phase(th);
          return (
            <button
              key={card.testId}
              onClick={card.action}
              data-testid={card.testId}
              className="v2-fade-up"
              style={{
                display: "flex",
                alignItems: "center",
                gap: SP.lg,
                padding: `${SP.lg}px`,
                minHeight: TOUCH_MIN + SP.md,
                background: th.bgCard,
                border: `1px solid ${th.border}`,
                borderRadius: 20,
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.2s, border-color 0.2s",
                width: "100%",
                animationDelay: `${idx * 70}ms`,
                animationFillMode: "both",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = phase.dim;
                e.currentTarget.style.borderColor = phase.accent;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = th.bgCard;
                e.currentTarget.style.borderColor = th.border;
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: phase.dim,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <CardIcon color={phase.accent} size={28} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: FONT.display,
                    fontSize: 17,
                    fontWeight: 700,
                    color: th.text,
                    marginBottom: SP.xs,
                  }}
                >
                  {card.getTitle(t)}
                </div>
                <div style={{ fontSize: 14, color: th.muted, fontFamily: FONT.body }}>
                  {card.getDesc(t)}
                </div>
              </div>
              <ChevronRight color={th.faint} size={20} />
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: SP.xxl }}>
        <h2
          style={{
            fontFamily: FONT.body,
            fontSize: 11,
            fontWeight: 500,
            color: th.faint,
            marginBottom: SP.md,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
          data-testid="v2-recent-title"
        >
          {t.hubRecent}
        </h2>

        {[
          { name: "Highland Malt 18y", date: "15.03.2026", score: 87 },
          { name: "Islay Single Cask", date: "12.03.2026", score: 91 },
        ].map((item, idx) => (
          <div
            key={idx}
            data-testid={`v2-recent-${idx}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: SP.md,
              padding: `${SP.sm}px 0`,
              borderBottom: idx === 0 ? `1px solid ${th.border}` : "none",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: RADIUS.md,
                background: th.phases.palate.dim,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Whisky color={th.phases.palate.accent} size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT.serif, fontSize: 15, color: th.text }}>
                {item.name}
              </div>
              <div style={{ fontSize: 12, color: th.faint }}>
                {item.date}
              </div>
            </div>
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: item.score >= 90 ? th.green : th.gold,
                fontFamily: FONT.body,
              }}
            >
              {item.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

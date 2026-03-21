import type { ThemeTokens } from "../../tokens";
import type { Translations } from "../../i18n";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";
import { Back } from "../../icons";

interface Participant {
  id: string;
  name: string;
  role?: string;
  status?: string;
}

interface LiveLobbyProps {
  th: ThemeTokens;
  t: Translations;
  tastingName: string;
  participantName: string;
  participants: Participant[];
  participantId: string;
  onBack: () => void;
}

export default function LiveLobby({
  th, t, tastingName, participantName, participants, participantId, onBack,
}: LiveLobbyProps) {
  return (
    <div className="v2-fade-up" style={{ padding: `${SP.xl}px ${SP.md}px` }}>
      <button
        onClick={onBack}
        data-testid="live-lobby-back"
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

      <div style={{ textAlign: "center", marginBottom: SP.xl }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: RADIUS.full,
            background: `linear-gradient(135deg, ${th.gold}, ${th.amber})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            fontWeight: 700,
            color: "#0e0b05",
            margin: "0 auto",
            marginBottom: SP.md,
            fontFamily: FONT.display,
          }}
          data-testid="live-lobby-avatar"
        >
          {participantName.charAt(0).toUpperCase()}
        </div>

        {tastingName && (
          <h2
            style={{
              fontFamily: FONT.display,
              fontSize: 22,
              fontWeight: 600,
              color: th.gold,
              marginBottom: SP.sm,
            }}
            data-testid="live-lobby-tasting-name"
          >
            {tastingName}
          </h2>
        )}

        <h1
          style={{
            fontFamily: FONT.display,
            fontSize: 26,
            fontWeight: 600,
            color: th.text,
            marginBottom: SP.md,
          }}
          data-testid="live-lobby-title"
        >
          {t.liveLobbyTitle}
        </h1>
      </div>

      <div
        style={{
          textAlign: "center",
          marginBottom: SP.xl,
          padding: `${SP.lg}px`,
          background: th.bgCard,
          borderRadius: RADIUS.lg,
          border: `1px solid ${th.border}`,
        }}
        data-testid="live-lobby-waiting"
      >
        <div style={{ position: "relative", display: "inline-block", marginBottom: SP.md }}>
          <div
            className="v2-lobby-pulse"
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: th.gold,
            }}
          />
        </div>
        <p
          style={{
            fontFamily: FONT.display,
            fontSize: 18,
            fontWeight: 500,
            color: th.text,
            margin: 0,
          }}
          data-testid="live-lobby-waiting-text"
        >
          {t.liveWaitingHost}
        </p>
        <p
          style={{
            fontFamily: FONT.body,
            fontSize: 14,
            color: th.muted,
            marginTop: SP.sm,
            margin: `${SP.sm}px 0 0`,
          }}
          data-testid="live-lobby-pour-hint"
        >
          {t.livePourHint}
        </p>
      </div>

      <div style={{ marginBottom: SP.xl }}>
        <h3
          style={{
            fontFamily: FONT.body,
            fontSize: 11,
            fontWeight: 500,
            color: th.faint,
            marginBottom: SP.md,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
          data-testid="live-lobby-participants-label"
        >
          {t.participantsLabel}
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: SP.sm }}>
          {participants.map((p, idx) => {
            const isMe = p.id === participantId;
            const isHost = p.role === "host";
            return (
              <div
                key={p.id || idx}
                data-testid={`live-lobby-participant-${idx}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: SP.md,
                  padding: `${SP.sm}px ${SP.md}px`,
                  background: th.bgCard,
                  border: `1px solid ${th.border}`,
                  borderRadius: RADIUS.md,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: RADIUS.full,
                    background: th.bgHover,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: th.muted,
                    fontSize: 14,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {(p.name || "?").charAt(0).toUpperCase()}
                </div>
                <span
                  style={{
                    flex: 1,
                    fontSize: 15,
                    fontWeight: isMe ? 600 : 400,
                    color: th.text,
                  }}
                >
                  {p.name || `Guest ${idx + 1}`}
                </span>
                {isHost && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: th.amber,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {t.hostLabel}
                  </span>
                )}
                {isMe && !isHost && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: th.gold,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {t.youLabel}
                  </span>
                )}
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: th.green,
                    flexShrink: 0,
                  }}
                  data-testid={`live-lobby-ready-${idx}`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

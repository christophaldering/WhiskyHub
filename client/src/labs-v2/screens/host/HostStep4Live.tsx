import { useState, useEffect, useCallback, useRef } from "react";
import type { ThemeTokens } from "../../tokens";
import type { Translations } from "../../i18n";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";
import { Users, Reveal, Stop } from "../../icons";
import type { WhiskyEntry } from "../../types/host";

interface Props {
  th: ThemeTokens;
  t: Translations;
  tastingId: string;
  hostId: string;
  whiskies: WhiskyEntry[];
  onBack: () => void;
}

interface TastingState {
  status: string;
  guidedWhiskyIndex?: number;
  guidedRevealStep?: number;
  title: string;
  blindMode?: boolean;
}

interface Participant {
  id: string;
  participantId: string;
  name?: string;
}

interface Rating {
  participantId: string;
  whiskyId: string;
}

export default function HostStep4Live({ th, t, tastingId, hostId, whiskies, onBack }: Props) {
  const [tasting, setTasting] = useState<TastingState | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const [tRes, pRes, rRes] = await Promise.all([
        fetch(`/api/tastings/${tastingId}`, { headers: { "x-participant-id": hostId } }),
        fetch(`/api/tastings/${tastingId}/participants`),
        fetch(`/api/tastings/${tastingId}/ratings`),
      ]);
      if (tRes.ok) setTasting(await tRes.json());
      if (pRes.ok) setParticipants(await pRes.json());
      if (rRes.ok) setRatings(await rRes.json());
    } catch {}
  }, [tastingId, hostId]);

  useEffect(() => {
    fetchState();
    pollRef.current = setInterval(fetchState, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchState]);

  const currentIdx = tasting?.guidedWhiskyIndex ?? -1;
  const totalWhiskies = whiskies.length;

  const advanceDram = useCallback(async () => {
    try {
      await fetch(`/api/tastings/${tastingId}/guided-advance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId }),
      });
      fetchState();
    } catch {}
  }, [tastingId, hostId, fetchState]);

  const endTasting = useCallback(async () => {
    try {
      await fetch(`/api/tastings/${tastingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed", hostId }),
      });
      setShowEndConfirm(false);
      fetchState();
    } catch {}
  }, [tastingId, hostId, fetchState]);

  const getParticipantRatingCount = (pId: string) =>
    ratings.filter(r => r.participantId === pId).length;

  const groupedParticipants = {
    allRated: participants.filter(p => getParticipantRatingCount(p.participantId) >= totalWhiskies && totalWhiskies > 0),
    inProgress: participants.filter(p => {
      const count = getParticipantRatingCount(p.participantId);
      return count > 0 && count < totalWhiskies;
    }),
    notStarted: participants.filter(p => getParticipantRatingCount(p.participantId) === 0),
  };

  const isClosed = tasting?.status === "closed" || tasting?.status === "reveal";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SP.lg }}>
      <div
        data-testid="host-live-status"
        style={{
          display: "flex",
          alignItems: "center",
          gap: SP.sm,
          padding: SP.md,
          background: th.bgCard,
          borderRadius: RADIUS.lg,
          border: `1px solid ${th.border}`,
        }}
      >
        {!isClosed && (
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: RADIUS.full,
              background: th.green,
              animation: "pulse 2s ease-in-out infinite",
            }}
          />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: th.text, fontFamily: FONT.body }}>
            {isClosed ? t.hostEndTasting : t.hostLiveRunning}
          </div>
          <div style={{ fontSize: 12, color: th.muted, fontFamily: FONT.body }}>
            {tasting?.title || ""} · {participants.length} {t.participantsLabel}
          </div>
        </div>
      </div>

      {!isClosed && (
        <div
          data-testid="host-live-actions"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: SP.sm,
            padding: SP.md,
            background: th.bgCard,
            borderRadius: RADIUS.lg,
            border: `1px solid ${th.border}`,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 500, color: th.muted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {t.hostCurrentDram}
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, color: th.gold, fontFamily: FONT.display }}>
            {currentIdx >= 0 && currentIdx < totalWhiskies
              ? `${t.ratingDram} ${currentIdx + 1} ${t.ratingOf} ${totalWhiskies}`
              : `— ${t.ratingOf} ${totalWhiskies}`}
          </div>
          {currentIdx >= 0 && currentIdx < totalWhiskies && whiskies[currentIdx] && (
            <div style={{ fontSize: 14, color: th.text, fontFamily: FONT.body }}>
              {whiskies[currentIdx].name || `${t.hostSampleN} ${currentIdx + 1}`}
            </div>
          )}
          <div style={{ display: "flex", gap: SP.sm, marginTop: SP.sm }}>
            <button
              data-testid="host-next-dram-btn"
              onClick={advanceDram}
              style={{
                flex: 1,
                minHeight: TOUCH_MIN,
                background: th.gold,
                color: "#fff",
                border: "none",
                borderRadius: RADIUS.md,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: FONT.body,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: SP.xs,
              }}
            >
              <Reveal color="#fff" size={18} />
              {currentIdx < totalWhiskies - 1 ? t.hostNextDram : t.hostReveal}
            </button>
            <button
              data-testid="host-end-tasting-btn"
              onClick={() => setShowEndConfirm(true)}
              style={{
                minHeight: TOUCH_MIN,
                padding: `0 ${SP.md}px`,
                background: "rgba(220,50,50,0.1)",
                color: "#e55",
                border: `1px solid rgba(220,50,50,0.3)`,
                borderRadius: RADIUS.md,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: FONT.body,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: SP.xs,
              }}
            >
              <Stop color="#e55" size={18} />
              {t.hostEndTasting}
            </button>
          </div>
        </div>
      )}

      <div
        data-testid="host-participants-section"
        style={{
          padding: SP.md,
          background: th.bgCard,
          borderRadius: RADIUS.lg,
          border: `1px solid ${th.border}`,
          display: "flex",
          flexDirection: "column",
          gap: SP.md,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: SP.sm }}>
          <Users color={th.gold} size={20} />
          <span style={{ fontSize: 14, fontWeight: 600, color: th.text, fontFamily: FONT.body }}>
            {t.participantsLabel} ({participants.length})
          </span>
        </div>

        {participants.length === 0 && (
          <div style={{ fontSize: 13, color: th.muted, fontFamily: FONT.body, textAlign: "center", padding: SP.md }}>
            {t.hostNoParticipants}
          </div>
        )}

        {groupedParticipants.allRated.length > 0 && (
          <ParticipantGroup th={th} t={t} label={t.hostAllRated} participants={groupedParticipants.allRated} color={th.green} />
        )}
        {groupedParticipants.inProgress.length > 0 && (
          <ParticipantGroup th={th} t={t} label={t.hostInProgress} participants={groupedParticipants.inProgress} color={th.amber} />
        )}
        {groupedParticipants.notStarted.length > 0 && (
          <ParticipantGroup th={th} t={t} label={t.hostNotStarted} participants={groupedParticipants.notStarted} color={th.faint} />
        )}
      </div>

      <div
        data-testid="host-whisky-lineup"
        style={{
          padding: SP.md,
          background: th.bgCard,
          borderRadius: RADIUS.lg,
          border: `1px solid ${th.border}`,
          display: "flex",
          flexDirection: "column",
          gap: SP.sm,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: th.text, fontFamily: FONT.body }}>
          {t.hostWhiskyLineup}
        </div>
        {whiskies.map((w, idx) => {
          const isActive = idx === currentIdx;
          return (
            <div
              key={w.localId}
              data-testid={`host-lineup-item-${idx}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: SP.sm,
                padding: `${SP.sm}px ${SP.md}px`,
                background: isActive ? th.bgHover : "transparent",
                borderRadius: RADIUS.md,
                border: isActive ? `1px solid ${th.gold}` : `1px solid transparent`,
                transition: "all 0.2s ease",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: isActive ? th.gold : th.faint, fontFamily: FONT.body, width: 24 }}>
                {idx + 1}
              </span>
              <span style={{ fontSize: 14, color: th.text, fontFamily: FONT.body, flex: 1 }}>
                {w.name || `${t.hostSampleN} ${idx + 1}`}
              </span>
              {isActive && (
                <span style={{ fontSize: 10, fontWeight: 600, color: th.gold, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {t.hostActiveDram}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {showEndConfirm && (
        <div
          data-testid="host-end-confirm-modal"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(8px)",
            padding: SP.md,
          }}
          onClick={() => setShowEndConfirm(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: th.bg,
              borderRadius: RADIUS.xl,
              border: `1px solid ${th.border}`,
              padding: SP.xl,
              maxWidth: 340,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: SP.md,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 600, color: th.text, fontFamily: FONT.display }}>
              {t.hostEndConfirm}
            </div>
            <div style={{ fontSize: 14, color: th.muted, fontFamily: FONT.body }}>
              {t.hostEndConfirmMsg}
            </div>
            <div style={{ display: "flex", gap: SP.sm }}>
              <button
                data-testid="host-end-cancel-btn"
                onClick={() => setShowEndConfirm(false)}
                style={{
                  flex: 1,
                  minHeight: TOUCH_MIN,
                  background: th.bgCard,
                  color: th.text,
                  border: `1px solid ${th.border}`,
                  borderRadius: RADIUS.md,
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: FONT.body,
                  cursor: "pointer",
                }}
              >
                {t.hostEndCancel}
              </button>
              <button
                data-testid="host-end-confirm-btn"
                onClick={endTasting}
                style={{
                  flex: 1,
                  minHeight: TOUCH_MIN,
                  background: "#e55",
                  color: "#fff",
                  border: "none",
                  borderRadius: RADIUS.md,
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: FONT.body,
                  cursor: "pointer",
                }}
              >
                {t.hostEndYes}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

function ParticipantGroup({ th, label, participants, color }: {
  th: ThemeTokens;
  t: Translations;
  label: string;
  participants: Participant[];
  color: string;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: SP.xs, marginBottom: SP.xs }}>
        <div style={{ width: 8, height: 8, borderRadius: RADIUS.full, background: color }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: th.muted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label} ({participants.length})
        </span>
      </div>
      {participants.map(p => (
        <div
          key={p.id || p.participantId}
          style={{
            padding: `${SP.xs}px ${SP.sm}px`,
            fontSize: 13,
            color: th.text,
            fontFamily: FONT.body,
          }}
        >
          {p.name || p.participantId}
        </div>
      ))}
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useV2Theme, useV2Lang } from "./LabsV2Layout";
import { Back, Check, Live, ChevronRight } from "./icons";
import { SP, FONT, RADIUS, TOUCH_MIN } from "./tokens";
import { tastingApi, participantApi } from "@/lib/api";
import { useTastingEvents } from "@/labs/hooks/useTastingEvents";
import { useAppStore } from "@/lib/store";

interface Participant {
  id: string;
  name: string;
  role?: string;
  status?: string;
}

interface TastingInfo {
  id: string;
  title?: string;
  name?: string;
  status?: string;
  hostId?: string;
}

interface StatusEventData {
  status?: string;
}

interface JoinFlowProps {
  onBack: () => void;
  onEnterLive: (tastingId: string) => void;
}

type Step = "code" | "name" | "lobby";

function classifyApiError(err: Error): "not_found" | "conflict" | "server" | "unknown" {
  const msg = err.message.toLowerCase();
  if (msg.includes("not found") || msg.includes("404") || msg.includes("no tasting") || msg.includes("invalid code")) {
    return "not_found";
  }
  if (msg.includes("conflict") || msg.includes("409") || msg.includes("already joined") || msg.includes("already a participant")) {
    return "conflict";
  }
  if (msg.includes("500") || msg.includes("internal server") || msg.includes("server error")) {
    return "server";
  }
  return "unknown";
}

export default function JoinFlow({ onBack, onEnterLive }: JoinFlowProps) {
  const { th } = useV2Theme();
  const { t, lang } = useV2Lang();

  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [tastingId, setTastingId] = useState("");
  const [tastingName, setTastingName] = useState("");
  const [tastingStatus, setTastingStatus] = useState("");

  const [name, setName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState("");
  const [participantId, setParticipantIdLocal] = useState("");

  const [participants, setParticipants] = useState<Participant[]>([]);

  const setParticipant = useAppStore((s) => s.setParticipant);

  const handleCodeSubmit = useCallback(async () => {
    if (!code.trim() || code.trim().length < 4) return;
    setCodeLoading(true);
    setCodeError("");
    try {
      const tasting: TastingInfo = await tastingApi.getByCode(code.trim().toUpperCase());
      if (!tasting || !tasting.id) {
        setCodeError(t.joinNotFound);
        return;
      }
      setTastingId(tasting.id);
      setTastingName(tasting.title || tasting.name || "");
      setTastingStatus(tasting.status || "");
      setStep("name");
    } catch (err: unknown) {
      if (err instanceof Error) {
        const kind = classifyApiError(err);
        if (kind === "server") {
          setCodeError(t.joinServerErr);
        } else {
          setCodeError(t.joinNotFound);
        }
      } else {
        setCodeError(t.joinNotFound);
      }
    } finally {
      setCodeLoading(false);
    }
  }, [code, t]);

  const handleNameSubmit = useCallback(async () => {
    if (!name.trim() || !tastingId) return;
    setNameLoading(true);
    setNameError("");
    try {
      const guestResult = await participantApi.guestJoin(name.trim(), "guest");
      const pid: string = guestResult?.id || guestResult?.participantId || "";
      if (!pid) {
        setNameError(t.joinFailed);
        return;
      }
      setParticipant({ id: pid, name: name.trim() });
      sessionStorage.setItem("session_pid", pid);

      await tastingApi.join(tastingId, pid, code.trim().toUpperCase());
      setParticipantIdLocal(pid);
      setStep("lobby");
    } catch (err: unknown) {
      if (!(err instanceof Error)) {
        setNameError(t.joinFailed);
        return;
      }
      const kind = classifyApiError(err);
      if (kind === "not_found") {
        setNameError(t.joinNotFound);
      } else if (kind === "conflict") {
        setNameError(t.joinAlready);
      } else if (kind === "server") {
        setNameError(t.joinServerErr);
      } else {
        setNameError(err.message || t.joinFailed);
      }
    } finally {
      setNameLoading(false);
    }
  }, [name, tastingId, code, setParticipant, t]);

  useEffect(() => {
    if (step !== "lobby" || !tastingId) return;
    let cancelled = false;
    const fetchParticipants = async () => {
      try {
        const data = await tastingApi.getParticipants(tastingId);
        if (!cancelled && Array.isArray(data)) {
          setParticipants(data as Participant[]);
        }
      } catch (_e: unknown) {
        // retry handled by interval
      }
    };
    fetchParticipants();
    const interval = setInterval(fetchParticipants, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [step, tastingId]);

  useTastingEvents({
    tastingId,
    enabled: step === "lobby" && !!tastingId && !!participantId,
    onStatusChange: (data: Record<string, unknown>) => {
      const eventData = data as StatusEventData;
      const newStatus = eventData.status;
      if (newStatus === "open" || newStatus === "active" || newStatus === "live") {
        setTastingStatus(newStatus);
        onEnterLive(tastingId);
      }
      tastingApi.getParticipants(tastingId).then((d) => {
        if (Array.isArray(d)) setParticipants(d as Participant[]);
      }).catch((_e: unknown) => {});
    },
  });

  const isLive = tastingStatus === "open" || tastingStatus === "active" || tastingStatus === "live";

  if (step === "code") {
    return (
      <div className="v2-fade-up" style={{ padding: `${SP.xl}px ${SP.md}px` }}>
        <button
          onClick={onBack}
          data-testid="v2-join-back"
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

        <h1
          style={{ fontFamily: FONT.display, fontSize: 28, fontWeight: 600, color: th.text, marginBottom: SP.sm }}
          data-testid="v2-join-title"
        >
          {t.joinTitle}
        </h1>
        <p style={{ fontSize: 15, color: th.muted, marginBottom: SP.xl, fontFamily: FONT.body }} data-testid="v2-join-code-label">
          {t.joinCodeLabel}
        </p>

        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setCodeError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleCodeSubmit()}
          placeholder={t.joinCodePH}
          maxLength={8}
          autoFocus
          data-testid="v2-join-code-input"
          style={{
            width: "100%",
            padding: `${SP.md}px`,
            fontSize: 26,
            fontFamily: FONT.serif,
            background: th.inputBg,
            border: `1px solid ${code.trim() ? th.gold : th.border}`,
            borderRadius: RADIUS.md,
            color: th.text,
            outline: "none",
            boxSizing: "border-box",
            minHeight: TOUCH_MIN,
            textAlign: "center",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            transition: "border-color 0.2s",
          }}
        />

        {codeError && (
          <p style={{ color: th.amber, fontSize: 13, marginTop: SP.sm, textAlign: "center" }} data-testid="v2-join-code-error">
            {codeError}
          </p>
        )}

        <button
          onClick={handleCodeSubmit}
          disabled={code.trim().length < 4 || codeLoading}
          data-testid="v2-join-code-submit"
          style={{
            width: "100%",
            padding: `${SP.md}px`,
            fontSize: 16,
            fontWeight: 600,
            fontFamily: FONT.body,
            background: th.gold,
            color: "#0e0b05",
            border: "none",
            borderRadius: RADIUS.full,
            cursor: code.trim().length < 4 || codeLoading ? "not-allowed" : "pointer",
            minHeight: TOUCH_MIN,
            marginTop: SP.md,
            opacity: code.trim().length < 4 || codeLoading ? 0.5 : 1,
            transition: "opacity 0.2s",
          }}
        >
          {codeLoading ? "..." : t.joinCTA}
        </button>

        <p style={{ fontSize: 13, color: th.faint, textAlign: "center", marginTop: SP.md }} data-testid="v2-join-no-acc">
          {t.joinNoAcc}
        </p>
      </div>
    );
  }

  if (step === "name") {
    return (
      <div className="v2-fade-up" style={{ padding: `${SP.xl}px ${SP.md}px` }}>
        <button
          onClick={() => setStep("code")}
          data-testid="v2-join-name-back"
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

        <h1
          style={{ fontFamily: FONT.display, fontSize: 28, fontWeight: 600, color: th.text, marginBottom: SP.sm }}
          data-testid="v2-join-name-title"
        >
          {t.joinNameQ}
        </h1>
        <p style={{ fontSize: 15, color: th.muted, marginBottom: SP.xl, fontFamily: FONT.body }} data-testid="v2-join-name-sub">
          {t.joinNameSub}
        </p>

        {tastingName && (
          <div
            style={{
              padding: `${SP.sm}px ${SP.md}px`,
              background: th.bgCard,
              borderRadius: RADIUS.md,
              marginBottom: SP.lg,
              textAlign: "center",
            }}
            data-testid="v2-join-tasting-name"
          >
            <span style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 600, color: th.gold }}>
              {tastingName}
            </span>
          </div>
        )}

        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setNameError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
          placeholder={t.joinNamePH}
          maxLength={40}
          autoFocus
          data-testid="v2-join-name-input"
          style={{
            width: "100%",
            padding: `${SP.md}px`,
            fontSize: 22,
            fontFamily: FONT.serif,
            background: th.inputBg,
            border: `1px solid ${th.border}`,
            borderRadius: RADIUS.md,
            color: th.text,
            outline: "none",
            boxSizing: "border-box",
            minHeight: TOUCH_MIN,
          }}
        />

        <button
          onClick={handleNameSubmit}
          disabled={!name.trim() || nameLoading}
          data-testid="v2-join-name-submit"
          style={{
            width: "100%",
            padding: `${SP.md}px`,
            fontSize: 16,
            fontWeight: 600,
            fontFamily: FONT.body,
            background: th.gold,
            color: "#0e0b05",
            border: "none",
            borderRadius: RADIUS.full,
            cursor: !name.trim() || nameLoading ? "not-allowed" : "pointer",
            minHeight: TOUCH_MIN,
            marginTop: SP.md,
            opacity: !name.trim() || nameLoading ? 0.5 : 1,
          }}
        >
          {nameLoading ? "..." : t.joinEnter}
        </button>

        <button
          onClick={() => setStep("code")}
          data-testid="v2-join-name-ghost-back"
          style={{
            width: "100%",
            padding: `${SP.sm}px`,
            fontSize: 15,
            fontFamily: FONT.body,
            background: "none",
            color: th.muted,
            border: "none",
            cursor: "pointer",
            minHeight: TOUCH_MIN,
            marginTop: SP.sm,
          }}
        >
          {t.back}
        </button>

        {nameError && (
          <p style={{ color: th.amber, fontSize: 13, marginTop: SP.sm, textAlign: "center" }} data-testid="v2-join-name-error">
            {nameError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="v2-fade-up" style={{ padding: `${SP.xl}px ${SP.md}px` }}>
      <div style={{ textAlign: "center", marginBottom: SP.xl }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: RADIUS.full,
            background: `linear-gradient(135deg, ${th.gold}, ${th.amber})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            fontWeight: 700,
            color: "#0e0b05",
            margin: "0 auto",
            marginBottom: SP.md,
            fontFamily: FONT.display,
          }}
          data-testid="v2-lobby-avatar"
        >
          {name.charAt(0).toUpperCase()}
        </div>
        <h1
          style={{ fontFamily: FONT.display, fontSize: 26, fontWeight: 600, color: th.text }}
          data-testid="v2-lobby-welcome"
        >
          {`${lang === "de" ? "Willkommen" : "Welcome"}, ${name}!`}
        </h1>
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
          data-testid="v2-lobby-participants-label"
        >
          {t.participantsLabel}
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: SP.sm }}>
          {participants.map((p: Participant, idx: number) => {
            const isMe = p.id === participantId;
            const isHost = p.role === "host";
            return (
              <div
                key={p.id || idx}
                data-testid={`v2-lobby-participant-${idx}`}
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
                  data-testid={`v2-lobby-avatar-${idx}`}
                >
                  {(p.name || "?").charAt(0).toUpperCase()}
                </div>
                <span style={{ flex: 1, fontSize: 15, fontWeight: isMe ? 600 : 400, color: th.text }} data-testid={`v2-lobby-name-${idx}`}>
                  {p.name || `Guest ${idx + 1}`}
                </span>
                {isHost && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: th.amber,
                      background: `${th.amber}28`,
                      padding: `${SP.xs}px ${SP.sm}px`,
                      borderRadius: RADIUS.full,
                    }}
                    data-testid={`v2-lobby-badge-host-${idx}`}
                  >
                    {t.hostLabel}
                  </span>
                )}
                {isMe && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: th.gold,
                      background: `${th.gold}28`,
                      padding: `${SP.xs}px ${SP.sm}px`,
                      borderRadius: RADIUS.full,
                    }}
                    data-testid={`v2-lobby-badge-you-${idx}`}
                  >
                    {t.youLabel}
                  </span>
                )}
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: p.status === "ready" || p.status === "online" || p.status === "active" ? th.green : th.faint,
                    flexShrink: 0,
                  }}
                  data-testid={`v2-lobby-status-${idx}`}
                  title={p.status === "ready" || p.status === "online" || p.status === "active" ? t.readyLabel : t.waitingLabel}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          padding: `${SP.lg}px`,
          background: `${th.gold}1A`,
          border: `1px solid ${th.gold}44`,
          borderRadius: RADIUS.lg,
          textAlign: "center",
          marginBottom: SP.lg,
        }}
        data-testid="v2-lobby-waiting-card"
      >
        <Live color={th.gold} size={28} style={{ marginBottom: SP.sm }} />
        <p style={{ fontSize: 15, fontWeight: 600, color: th.text, marginBottom: SP.xs }}>
          {t.joinWaiting}
        </p>
        <p style={{ fontSize: 13, color: th.muted, fontStyle: "italic", fontFamily: FONT.serif }}>
          {t.joinPour}
        </p>
      </div>

      <button
        onClick={() => onEnterLive(tastingId)}
        data-testid="v2-lobby-enter-live"
        style={{
          width: "100%",
          padding: `${SP.md}px`,
          fontSize: 16,
          fontWeight: 600,
          fontFamily: FONT.body,
          background: isLive ? th.gold : th.bgCard,
          color: isLive ? "#0e0b05" : th.muted,
          border: isLive ? "none" : `1px solid ${th.border}`,
          borderRadius: RADIUS.full,
          cursor: "pointer",
          minHeight: TOUCH_MIN,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: SP.sm,
          opacity: isLive ? 1 : 0.6,
          transition: "all 0.3s",
        }}
      >
        <span>{lang === "de" ? "Zur Bewertung" : "To rating"} →</span>
      </button>
    </div>
  );
}

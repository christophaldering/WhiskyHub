import { useState, useRef, useCallback, useEffect } from "react";
import { useSession } from "@/lib/session";
import { pidHeaders } from "@/lib/api";
import { FONT, SP, RADIUS, TOUCH_MIN, LABS_THEME } from "@/labs/components/rating/theme";

type Status = "idle" | "token" | "connecting" | "connected" | "error";

const VOICES = ["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse", "marin", "cedar"];

export default function LabsVoiceProbe() {
  const session = useSession();
  const [status, setStatus] = useState<Status>("idle");
  const [statusText, setStatusText] = useState("Bereit.");
  const [model, setModel] = useState<string>("");
  const [voice, setVoice] = useState<string>("cedar");
  const [busy, setBusy] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const statusRef = useRef<Status>("idle");
  statusRef.current = status;

  const cleanup = useCallback(() => {
    try { pcRef.current?.close(); } catch { /* noop */ }
    pcRef.current = null;
    try { micRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
    micRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const fail = useCallback((msg: string, err?: unknown) => {
    console.error("[voice-probe]", msg, err);
    setStatus("error");
    setStatusText("Fehler: " + msg);
    setBusy(false);
    cleanup();
  }, [cleanup]);

  const connect = useCallback(async () => {
    setBusy(true);
    setStatus("token");
    setStatusText("fordere Token an …");
    try {
      const tokenRes = await fetch("/api/voice-probe/token", { method: "POST", headers: { "Content-Type": "application/json", ...pidHeaders() }, body: JSON.stringify({ voice }) });
      const tokenText = await tokenRes.text();
      if (!tokenRes.ok) { fail(`Token ${tokenRes.status}: ${tokenText.slice(0, 300)}`); return; }
      let tokenData: any = {}; try { tokenData = JSON.parse(tokenText); } catch { /* noop */ }
      const EPHEMERAL_KEY = tokenData?.value;
      const usedModel = tokenData?.model || "gpt-realtime";
      setModel(usedModel);
      if (tokenData?.voice) setVoice(tokenData.voice);
      if (!EPHEMERAL_KEY) { fail("Kein ephemeraler Key in der Token-Antwort."); return; }

      setStatus("connecting");
      setStatusText("verbinde …");
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioRef.current = audioEl;
      pc.ontrack = (e) => { audioEl.srcObject = e.streams[0]; };

      pc.onconnectionstatechange = () => {
        const st = pc.connectionState;
        console.log("[voice-probe] connectionState", st);
        if (st === "connected") { setStatus("connected"); setStatusText("verbunden — sprich jetzt"); setBusy(false); }
        else if ((st === "failed" || st === "disconnected" || st === "closed") && statusRef.current !== "error") {
          setStatusText("Verbindung " + st);
        }
      };

      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      micRef.current = ms;
      pc.addTrack(ms.getTracks()[0], ms);

      const dc = pc.createDataChannel("oai-events");
      dc.onopen = () => console.log("[voice-probe] datachannel open");
      dc.onmessage = (e) => { console.log("[voice-probe] event", e.data); };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch(`https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(usedModel)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${EPHEMERAL_KEY}`, "Content-Type": "application/sdp" },
        body: offer.sdp,
      });
      const answerSdp = await sdpRes.text();
      if (!sdpRes.ok) { fail(`SDP ${sdpRes.status}: ${answerSdp.slice(0, 300)}`); return; }
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      setStatusText("Handshake gesendet, warte auf Verbindung …");
    } catch (e: any) {
      fail(e?.message || String(e), e);
    }
  }, [fail, voice]);

  const disconnect = useCallback(() => {
    cleanup();
    setStatus("idle");
    setStatusText("Getrennt.");
    setBusy(false);
  }, [cleanup]);

  if (session.role !== "admin") {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", background: LABS_THEME.bg, color: LABS_THEME.muted, fontFamily: FONT.body }}>
        <div data-testid="text-no-access">Kein Zugriff.</div>
      </div>
    );
  }

  const statusColor = status === "connected" ? LABS_THEME.gold : status === "error" ? "#d66" : LABS_THEME.muted;

  return (
    <div style={{ minHeight: "100vh", background: LABS_THEME.bg, color: LABS_THEME.text, fontFamily: FONT.body, padding: SP.lg, display: "flex", flexDirection: "column", gap: SP.lg, maxWidth: 560, margin: "0 auto" }}>
      <div style={{ fontFamily: FONT.serif, fontSize: 24, color: LABS_THEME.gold }}>Realtime-Sprach-Durchstich</div>
      <div style={{ fontSize: 13, color: LABS_THEME.faint, lineHeight: 1.5 }}>
        Isolierter Admin-Test. Kein Bezug zum Eindruck-/Cooper-Flow. Beim Verbinden wird die Mikrofon-Erlaubnis abgefragt.
      </div>

      <div
        data-testid="status-voice-probe"
        style={{ fontSize: 16, color: statusColor, padding: SP.md, border: `1px solid ${LABS_THEME.border}`, borderRadius: RADIUS.md, background: LABS_THEME.bgCard, minHeight: 56, display: "flex", alignItems: "center", lineHeight: 1.4 }}
      >
        {statusText}{model ? `  ·  Modell: ${model}` : ""}{`  ·  Stimme: ${voice}`}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: SP.sm }}>
        {VOICES.map((v) => {
          const active = voice === v;
          const locked = status === "connected";
          return (
            <button
              key={v}
              data-testid={`chip-voice-${v}`}
              onClick={() => setVoice(v)}
              disabled={locked}
              style={{ minHeight: 36, padding: `0 ${SP.md}px`, borderRadius: RADIUS.full, border: `1px solid ${active ? LABS_THEME.gold : LABS_THEME.border}`, background: active ? "rgba(212,168,71,0.14)" : "transparent", color: active ? LABS_THEME.gold : LABS_THEME.muted, fontFamily: FONT.body, fontSize: 14, cursor: locked ? "default" : "pointer", opacity: locked && !active ? 0.5 : 1 }}
            >
              {v}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: SP.md }}>
        <button
          data-testid="button-connect"
          onClick={connect}
          disabled={busy || status === "connected"}
          style={{ flex: 1, minHeight: TOUCH_MIN, background: LABS_THEME.gold, color: "#1a1408", border: "none", borderRadius: RADIUS.md, fontFamily: FONT.body, fontSize: 16, fontWeight: 600, cursor: busy || status === "connected" ? "default" : "pointer", opacity: busy || status === "connected" ? 0.5 : 1 }}
        >
          Verbinden
        </button>
        <button
          data-testid="button-disconnect"
          onClick={disconnect}
          disabled={status === "idle"}
          style={{ flex: 1, minHeight: TOUCH_MIN, background: "transparent", color: LABS_THEME.muted, border: `1px solid ${LABS_THEME.border}`, borderRadius: RADIUS.md, fontFamily: FONT.body, fontSize: 16, cursor: status === "idle" ? "default" : "pointer", opacity: status === "idle" ? 0.5 : 1 }}
        >
          Trennen
        </button>
      </div>
    </div>
  );
}

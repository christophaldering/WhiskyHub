import { useState, useRef, useCallback, useEffect } from "react";
import { useSession } from "@/lib/session";
import { pidHeaders } from "@/lib/api";
import { FONT, SP, RADIUS, TOUCH_MIN, LABS_THEME } from "@/labs/components/rating/theme";

type Status = "idle" | "token" | "connecting" | "connected" | "error";

const VOICES = ["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse", "marin", "cedar"];

type Corner = "untouched" | "touched" | "sharpened";
interface Ledger { nose: Corner; palate: Corner; finish: Corner; body: Corner; intensity: Corner; affect: Corner; vagueResolved: boolean; }
const LEDGER_CORNERS = ["nose", "palate", "finish", "body", "intensity", "affect"] as const;
const EMPTY_LEDGER: Ledger = { nose: "untouched", palate: "untouched", finish: "untouched", body: "untouched", intensity: "untouched", affect: "untouched", vagueResolved: false };
const CORNER_LABELS: Record<(typeof LEDGER_CORNERS)[number], string> = { nose: "Nase", palate: "Gaumen", finish: "Abgang", body: "Körper", intensity: "Intensität", affect: "Wertung" };

export default function LabsVoiceProbe() {
  const session = useSession();
  const [status, setStatus] = useState<Status>("idle");
  const [statusText, setStatusText] = useState("Bereit.");
  const [model, setModel] = useState<string>("");
  const [voice, setVoice] = useState<string>("cedar");
  const [mode, setMode] = useState<"fluessig" | "tiefsinnig">("tiefsinnig");
  const [ledger, setLedger] = useState<Ledger>(EMPTY_LEDGER);
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
    setLedger(EMPTY_LEDGER);
    try {
      const tokenRes = await fetch("/api/voice-probe/token", { method: "POST", headers: { "Content-Type": "application/json", ...pidHeaders() }, body: JSON.stringify({ voice, mode }) });
      const tokenText = await tokenRes.text();
      if (!tokenRes.ok) { fail(`Token ${tokenRes.status}: ${tokenText.slice(0, 300)}`); return; }
      let tokenData: any = {}; try { tokenData = JSON.parse(tokenText); } catch { /* noop */ }
      const EPHEMERAL_KEY = tokenData?.value;
      const usedModel = tokenData?.model || "gpt-realtime";
      setModel(usedModel);
      if (tokenData?.voice) setVoice(tokenData.voice);
      if (tokenData?.mode) setMode(tokenData.mode);
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

      let responseActive = false;
      let pendingToolResponse = false;
      const dc = pc.createDataChannel("oai-events");
      dc.onopen = () => {
        console.log("[voice-probe] datachannel open");
        try { dc.send(JSON.stringify({ type: "response.create" })); } catch (err) { console.error("[voice-probe] greeting trigger failed", err); }
      };
      dc.onmessage = (e) => {
        let msg: any = null;
        try { msg = JSON.parse(e.data); } catch { return; }
        if (msg?.type === "response.created") { responseActive = true; }
        if (msg?.type === "response.done") {
          responseActive = false;
          if (pendingToolResponse) {
            pendingToolResponse = false;
            try { dc.send(JSON.stringify({ type: "response.create" })); } catch (err) { console.error("[voice-probe] pending response trigger failed", err); }
          }
        }
        if (msg?.type === "response.function_call_arguments.done" && msg?.name === "update_ledger") {
          console.log("[voice-probe] tool-call update_ledger", msg.arguments);
          let args: any = {};
          try { args = JSON.parse(msg.arguments); } catch { /* noop */ }
          setLedger((prev) => {
            const next: Ledger = { ...prev };
            for (const k of LEDGER_CORNERS) { if (typeof args[k] === "string") next[k] = args[k] as Corner; }
            if (typeof args.vagueResolved === "boolean") next.vagueResolved = args.vagueResolved;
            return next;
          });
          try {
            dc.send(JSON.stringify({ type: "conversation.item.create", item: { type: "function_call_output", call_id: msg.call_id, output: JSON.stringify({ ok: true }) } }));
          } catch (err) { console.error("[voice-probe] ledger-ack failed", err); }
          if (responseActive) { pendingToolResponse = true; } else {
            try { dc.send(JSON.stringify({ type: "response.create" })); } catch (err) { console.error("[voice-probe] tool response trigger failed", err); }
          }
        }
      };

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
  }, [fail, voice, mode]);

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
        {statusText}{model ? `  ·  Modell: ${model}` : ""}{`  ·  Stimme: ${voice}`}{`  ·  Modus: ${mode === "tiefsinnig" ? "Tiefsinnig" : "Flüssig"}`}
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

      <div style={{ display: "flex", flexWrap: "wrap", gap: SP.sm }}>
        {([["fluessig", "Flüssig"], ["tiefsinnig", "Tiefsinnig"]] as const).map(([m, label]) => {
          const active = mode === m;
          const locked = status === "connected";
          return (
            <button
              key={m}
              data-testid={`chip-mode-${m}`}
              onClick={() => setMode(m)}
              disabled={locked}
              style={{ minHeight: 36, padding: `0 ${SP.md}px`, borderRadius: RADIUS.full, border: `1px solid ${active ? LABS_THEME.gold : LABS_THEME.border}`, background: active ? "rgba(212,168,71,0.14)" : "transparent", color: active ? LABS_THEME.gold : LABS_THEME.muted, fontFamily: FONT.body, fontSize: 14, cursor: locked ? "default" : "pointer", opacity: locked && !active ? 0.5 : 1 }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {status === "connected" && (
        <div
          data-testid="ledger-constellation"
          style={{ display: "flex", flexWrap: "wrap", gap: SP.md, justifyContent: "center", padding: SP.md, border: `1px solid ${LABS_THEME.border}`, borderRadius: RADIUS.md, background: LABS_THEME.bgCard }}
        >
          {LEDGER_CORNERS.map((c) => {
            const st = ledger[c];
            const color = st === "sharpened" ? LABS_THEME.gold : st === "touched" ? LABS_THEME.muted : LABS_THEME.faint;
            return (
              <div key={c} data-testid={`ledger-corner-${c}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: SP.xs, minWidth: 64 }}>
                <div style={{ width: 14, height: 14, borderRadius: RADIUS.full, background: color, boxShadow: st === "sharpened" ? `0 0 8px ${LABS_THEME.gold}` : "none", transition: "background 600ms ease, box-shadow 600ms ease" }} />
                <div style={{ fontFamily: FONT.body, fontSize: 12, color, transition: "color 600ms ease" }}>{CORNER_LABELS[c]}</div>
              </div>
            );
          })}
        </div>
      )}

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

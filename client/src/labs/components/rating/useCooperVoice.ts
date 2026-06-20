import { useState, useRef, useCallback, useEffect } from "react";
import { pidHeaders } from "@/lib/api";
import type { ConverseTurn } from "./impressionApi";

type Status = "idle" | "token" | "connecting" | "connected" | "error";

export const VOICES = ["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse", "marin", "cedar"];

export type Corner = "untouched" | "touched" | "sharpened";
export interface Ledger { nose: Corner; palate: Corner; finish: Corner; body: Corner; intensity: Corner; affect: Corner; vagueResolved: boolean; }
export const LEDGER_CORNERS = ["nose", "palate", "finish", "body", "intensity", "affect"] as const;
export const EMPTY_LEDGER: Ledger = { nose: "untouched", palate: "untouched", finish: "untouched", body: "untouched", intensity: "untouched", affect: "untouched", vagueResolved: false };

export function useCooperVoice(opts?: { initialVoice?: string; initialMode?: "fluessig" | "tiefsinnig" }) {
  const [status, setStatus] = useState<Status>("idle");
  const [statusText, setStatusText] = useState("Bereit.");
  const [model, setModel] = useState<string>("");
  const [voice, setVoice] = useState<string>(opts?.initialVoice ?? "cedar");
  const [mode, setMode] = useState<"fluessig" | "tiefsinnig">(opts?.initialMode ?? "tiefsinnig");
  const [ledger, setLedger] = useState<Ledger>(EMPTY_LEDGER);
  const [transcript, setTranscript] = useState<ConverseTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mentorTimeoutRef = useRef<any>(null);
  const statusRef = useRef<Status>("idle");
  statusRef.current = status;

  const cleanup = useCallback(() => {
    try { pcRef.current?.close(); } catch { /* noop */ }
    pcRef.current = null;
    try { micRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
    micRef.current = null;
    if (mentorTimeoutRef.current) { clearTimeout(mentorTimeoutRef.current); mentorTimeoutRef.current = null; }
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
    setTranscript([]);
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
      let pendingMentor: string | null = null;
      const flushMentor = () => { if (mentorTimeoutRef.current) { clearTimeout(mentorTimeoutRef.current); mentorTimeoutRef.current = null; } if (pendingMentor) { const t = pendingMentor; pendingMentor = null; setTranscript((prev) => [...prev, { role: "mentor", text: t }]); } };
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
        if (msg?.type === "conversation.item.input_audio_transcription.completed" && msg?.transcript) { const t = String(msg.transcript).trim(); if (t) setTranscript((prev) => [...prev, { role: "taster", text: t }]); }
        if ((msg?.type === "response.output_audio_transcript.done" || msg?.type === "response.audio_transcript.done") && msg?.transcript) { const t = String(msg.transcript).trim(); if (t) { pendingMentor = t; if (mentorTimeoutRef.current) clearTimeout(mentorTimeoutRef.current); mentorTimeoutRef.current = setTimeout(flushMentor, 15000); } }
        if (msg?.type === "output_audio_buffer.stopped") { flushMentor(); }
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

  return { status, statusText, model, voice, setVoice, mode, setMode, ledger, transcript, busy, connect, disconnect };
}

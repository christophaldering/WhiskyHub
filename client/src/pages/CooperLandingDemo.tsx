// client/src/pages/CooperLandingDemo.tsx
//
// Schwebender Schnupper-Demo-Button fuer die oeffentliche Startseite: nach
// Erklaer-Screen + Mikro-Freigabe startet ein kurzer, kostengedeckelter
// Realtime-Voice-Moment mit Cooper. Eigenstaendig — kein participantId, kein
// Ledger, keine Tools, kein Zugriff auf echte Daten. Kosten-Deckel: serverseitig
// DB-Tageslimit pro IP (429), zusaetzlich client-seitiger Hard-Timer + Countdown.

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Mic } from "lucide-react";
import { v } from "@/lib/themeVars";
import CooperBarrel from "@/labs/components/rating/CooperBarrel";

const ACCENT = "#C9A961";
const font = {
  display: "'Playfair Display', 'EB Garamond', Georgia, serif",
  voice: "'Cormorant Garamond', Georgia, serif",
  body: "'DM Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
};

type Phase = "idle" | "explain" | "starting" | "live" | "ended" | "limit" | "error";

export default function CooperLandingDemo() {
  const { t, i18n } = useTranslation();
  const isDE = (i18n.language || "de").toLowerCase().startsWith("de");
  const tx = (de: string, en: string) => (isDE ? de : en);

  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const hardTimerRef = useRef<any>(null);
  const tickRef = useRef<any>(null);

  const cleanup = useCallback(() => {
    if (hardTimerRef.current) { clearTimeout(hardTimerRef.current); hardTimerRef.current = null; }
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    try { pcRef.current?.close(); } catch { /* noop */ }
    pcRef.current = null;
    try { micRef.current?.getTracks().forEach((tr) => tr.stop()); } catch { /* noop */ }
    micRef.current = null;
    dcRef.current = null;
    if (audioRef.current) { try { audioRef.current.srcObject = null; } catch { /* noop */ } audioRef.current = null; }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const stop = useCallback((next: Phase = "ended") => {
    cleanup();
    setPhase(next);
  }, [cleanup]);

  const start = useCallback(async () => {
    setErrorMsg("");
    setPhase("starting");
    try {
      const res = await fetch("/api/public/cooper-demo/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const text = await res.text();
      if (res.status === 429) {
        let m = ""; try { m = JSON.parse(text)?.message || ""; } catch { /* noop */ }
        setErrorMsg(m || tx("Komm später wieder oder probiere CaskSense direkt aus.", "Come back later or just try CaskSense yourself."));
        setPhase("limit");
        return;
      }
      if (!res.ok) {
        setErrorMsg(tx("Der Demo-Start hat nicht geklappt. Bitte versuche es später noch einmal.", "The demo could not start. Please try again later."));
        setPhase("error");
        return;
      }
      let data: any = {}; try { data = JSON.parse(text); } catch { /* noop */ }
      const ephemeralKey = data?.value;
      const model = data?.model || "gpt-realtime";
      const maxSeconds = Number(data?.maxSeconds) || 75;
      if (!ephemeralKey) { setErrorMsg(tx("Kein Zugang erhalten.", "No access received.")); setPhase("error"); return; }

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioRef.current = audioEl;
      pc.ontrack = (e) => { audioEl.srcObject = e.streams[0]; };

      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      micRef.current = ms;
      pc.addTrack(ms.getTracks()[0], ms);

      let responseActive = false;
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      const trigger = () => { if (responseActive) return; try { dc.send(JSON.stringify({ type: "response.create" })); } catch { /* noop */ } };
      dc.onopen = () => { try { dc.send(JSON.stringify({ type: "response.create" })); } catch { /* noop */ } };
      dc.onmessage = (e) => {
        let msg: any = null; try { msg = JSON.parse(e.data); } catch { return; }
        if (msg?.type === "response.created") responseActive = true;
        if (msg?.type === "response.done") responseActive = false;
        if (msg?.type === "input_audio_buffer.speech_stopped") trigger();
      };

      pc.onconnectionstatechange = () => {
        const st = pc.connectionState;
        if (st === "connected") {
          setPhase("live");
          setSecondsLeft(maxSeconds);
          if (tickRef.current) clearInterval(tickRef.current);
          tickRef.current = setInterval(() => {
            setSecondsLeft((s) => (s > 1 ? s - 1 : 0));
          }, 1000);
          if (hardTimerRef.current) clearTimeout(hardTimerRef.current);
          hardTimerRef.current = setTimeout(() => stop("ended"), maxSeconds * 1000);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const sdpRes = await fetch(`https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(model)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${ephemeralKey}`, "Content-Type": "application/sdp" },
        body: offer.sdp,
      });
      const answerSdp = await sdpRes.text();
      if (!sdpRes.ok) { setErrorMsg(tx("Verbindung fehlgeschlagen.", "Connection failed.")); setPhase("error"); cleanup(); return; }
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (err: any) {
      const denied = err?.name === "NotAllowedError" || err?.name === "NotFoundError";
      setErrorMsg(denied
        ? tx("Ohne Mikrofon-Freigabe kann Cooper nicht sprechen.", "Without microphone access Cooper can't speak.")
        : (err?.message || tx("Etwas ist schiefgelaufen.", "Something went wrong.")));
      setPhase("error");
      cleanup();
    }
  }, [cleanup, stop, isDE]);

  const closeOverlay = useCallback(() => { stop("idle"); setErrorMsg(""); }, [stop]);

  const overlayOpen = phase !== "idle";

  return (
    <>
      {/* Schwebender Fass-Button */}
      <button
        type="button"
        onClick={() => setPhase("explain")}
        data-testid="button-cooper-demo"
        aria-label={tx("Mit Cooper sprechen — kurze Demo", "Talk to Cooper — short demo")}
        style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 998,
          display: "inline-flex", alignItems: "center", gap: 10,
          padding: "12px 18px 12px 14px", borderRadius: 999,
          background: ACCENT, color: "#1a1408", border: "none",
          boxShadow: "0 8px 28px rgba(0,0,0,0.32)", cursor: "pointer",
          fontFamily: font.body, fontSize: 14, fontWeight: 700, letterSpacing: "0.01em",
        }}
      >
        <CooperBarrel size={26} mono glow />
        {tx("Cooper testen", "Try Cooper")}
      </button>

      {/* Erklaer-/Live-Overlay */}
      {overlayOpen && (
        <div
          data-testid="overlay-cooper-demo"
          style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(8,6,3,0.72)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget && phase !== "starting") closeOverlay(); }}
        >
          <div style={{ position: "relative", width: "100%", maxWidth: 440, background: v.card, border: `1px solid ${v.border}`, borderRadius: 24, padding: "28px 26px", boxShadow: "0 24px 64px rgba(0,0,0,0.45)" }}>
            <button
              type="button"
              onClick={closeOverlay}
              data-testid="button-cooper-demo-close"
              aria-label={tx("Schließen", "Close")}
              style={{ position: "absolute", top: 14, right: 14, width: 32, height: 32, borderRadius: 999, border: `1px solid ${v.border}`, background: "transparent", color: v.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <X size={16} />
            </button>

            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <CooperBarrel size={56} glow live={phase === "live"} />
            </div>

            {/* Erklaer-Screen */}
            {(phase === "explain" || phase === "starting") && (
              <>
                <h3 style={{ fontFamily: font.display, fontSize: 24, fontWeight: 500, color: v.text, textAlign: "center", margin: "0 0 10px" }}>
                  {tx("Sprich kurz mit Cooper", "A short word with Cooper")}
                </h3>
                <p style={{ fontFamily: font.body, fontSize: 14.5, lineHeight: 1.6, color: v.muted, textAlign: "center", margin: "0 0 18px" }}>
                  {tx(
                    "Cooper ist dein ruhiger Begleiter beim Verkosten — er sagt nie vor, was du schmeckst, sondern hilft dir, deinen eigenen Eindruck in Worte zu fassen. Hier hörst du an einem Beispiel, wie sich das anfühlt.",
                    "Cooper is your quiet tasting companion — he never tells you what you taste, he helps you put your own impression into words. Here's a short example of how that feels.",
                  )}
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <li style={{ fontFamily: font.body, fontSize: 13.5, color: v.muted, display: "flex", gap: 8 }}>
                    <span style={{ color: ACCENT }}>•</span>{tx("Coopers Stimme ist KI-generiert.", t("v2.voiceAiNote", "Coopers Stimme ist KI-generiert."))}
                  </li>
                  <li style={{ fontFamily: font.body, fontSize: 13.5, color: v.muted, display: "flex", gap: 8 }}>
                    <span style={{ color: ACCENT }}>•</span>{tx("Die Demo ist auf etwa eine Minute begrenzt.", "The demo is limited to about one minute.")}
                  </li>
                  <li style={{ fontFamily: font.body, fontSize: 13.5, color: v.muted, display: "flex", gap: 8 }}>
                    <span style={{ color: ACCENT }}>•</span>{tx("Dein Mikrofon wird gebraucht — es wird nichts aufgezeichnet oder gespeichert.", "Your microphone is needed — nothing is recorded or stored.")}
                  </li>
                </ul>
                <button
                  type="button"
                  onClick={start}
                  disabled={phase === "starting"}
                  data-testid="button-cooper-demo-start"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, width: "100%", padding: "15px 24px", background: ACCENT, color: "#1a1408", border: "none", borderRadius: 50, fontFamily: font.body, fontSize: 15, fontWeight: 700, cursor: phase === "starting" ? "default" : "pointer", opacity: phase === "starting" ? 0.7 : 1 }}
                >
                  <Mic size={17} />
                  {phase === "starting" ? tx("Verbinde …", "Connecting …") : tx("Mikro freigeben & starten", "Allow mic & start")}
                </button>
              </>
            )}

            {/* Live-Demo mit Countdown */}
            {phase === "live" && (
              <>
                <h3 style={{ fontFamily: font.display, fontSize: 24, fontWeight: 500, color: v.text, textAlign: "center", margin: "0 0 8px" }}>
                  {tx("Cooper hört zu — sprich einfach", "Cooper is listening — just speak")}
                </h3>
                <p style={{ fontFamily: font.voice, fontStyle: "italic", fontSize: 18, color: ACCENT, textAlign: "center", margin: "0 0 18px" }} data-testid="text-cooper-demo-countdown">
                  {tx("Noch", "")} {secondsLeft}{tx(" Sekunden", "s left")}
                </p>
                <button
                  type="button"
                  onClick={() => stop("ended")}
                  data-testid="button-cooper-demo-stop"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, width: "100%", padding: "14px 24px", background: "transparent", color: v.muted, border: `1px solid ${v.border}`, borderRadius: 50, fontFamily: font.body, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  {tx("Beenden", "End")}
                </button>
              </>
            )}

            {/* Ende / Limit / Fehler */}
            {(phase === "ended" || phase === "limit" || phase === "error") && (
              <>
                <h3 style={{ fontFamily: font.display, fontSize: 23, fontWeight: 500, color: v.text, textAlign: "center", margin: "0 0 10px" }}>
                  {phase === "ended"
                    ? tx("Das war Cooper", "That was Cooper")
                    : phase === "limit"
                      ? tx("Genug geschnuppert für heute", "Enough of a taste for today")
                      : tx("Hat nicht geklappt", "That didn't work")}
                </h3>
                <p style={{ fontFamily: font.body, fontSize: 14.5, lineHeight: 1.6, color: v.muted, textAlign: "center", margin: "0 0 20px" }} data-testid="text-cooper-demo-result">
                  {phase === "ended"
                    ? tx("Mit deinem eigenen Glas wird es richtig — probier es direkt in CaskSense aus.", "It comes alive with your own glass — try it right inside CaskSense.")
                    : errorMsg}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <a
                    href="/labs/tastings?tab=solo"
                    data-testid="link-cooper-demo-app"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, width: "100%", padding: "15px 24px", background: ACCENT, color: "#1a1408", textDecoration: "none", borderRadius: 50, fontFamily: font.body, fontSize: 15, fontWeight: 700 }}
                  >
                    {tx("Mit eigenem Glas verkosten", "Taste with your own glass")}
                  </a>
                  <button
                    type="button"
                    onClick={closeOverlay}
                    data-testid="button-cooper-demo-dismiss"
                    style={{ width: "100%", padding: "12px 24px", background: "transparent", color: v.muted, border: "none", fontFamily: font.body, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                  >
                    {tx("Schließen", "Close")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

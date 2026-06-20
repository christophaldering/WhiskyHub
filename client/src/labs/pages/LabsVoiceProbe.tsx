import { useRef, useEffect } from "react";
import { useSession } from "@/lib/session";
import { FONT, SP, RADIUS, TOUCH_MIN, LABS_THEME } from "@/labs/components/rating/theme";
import { useCooperVoice, VOICES, LEDGER_CORNERS } from "@/labs/components/rating/useCooperVoice";

const CORNER_LABELS: Record<(typeof LEDGER_CORNERS)[number], string> = { nose: "Nase", palate: "Gaumen", finish: "Abgang", body: "Körper", intensity: "Intensität", affect: "Wertung" };

export default function LabsVoiceProbe() {
  const session = useSession();
  const { status, statusText, model, voice, setVoice, mode, setMode, ledger, transcript, busy, connect, disconnect } = useCooperVoice();
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [transcript.length]);

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

      {transcript.length > 0 && (
        <div
          data-testid="transcript-debug"
          style={{ display: "flex", flexDirection: "column", gap: SP.xs, maxHeight: 240, overflowY: "auto", padding: SP.md, border: `1px dashed ${LABS_THEME.border}`, borderRadius: RADIUS.md, background: LABS_THEME.bgCard }}
        >
          <div style={{ fontFamily: FONT.body, fontSize: 11, color: LABS_THEME.faint, textTransform: "uppercase", letterSpacing: 1, marginBottom: SP.xs }}>Transkript (Test)</div>
          {transcript.map((t, i) => (
            <div key={i} data-testid={`transcript-line-${i}`} style={{ fontFamily: FONT.body, fontSize: 13, lineHeight: 1.5, color: t.role === "mentor" ? LABS_THEME.gold : LABS_THEME.muted }}>
              <span style={{ fontWeight: 600 }}>{t.role === "mentor" ? "Cooper:" : "Du:"}</span> {t.text}
            </div>
          ))}
          <div ref={transcriptEndRef} />
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

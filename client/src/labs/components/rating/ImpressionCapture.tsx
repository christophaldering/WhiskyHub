import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FONT, SP, RADIUS, TOUCH_MIN, LABS_THEME } from "./theme";
import {
  type ImpressionResult,
  type Ledger,
  type Intensity,
  type ConverseTurn,
  type ConverseResult,
  converseImpression,
  finalizeImpression,
  proseImpression,
  EMPTY_LEDGER,
} from "./impressionApi";
import { recordVocabularyEvents } from "@/lib/vocabulary";
import { useCooperVoice } from "./useCooperVoice";

interface ImpressionCaptureProps {
  whiskyName?: string;
  onApply: (result: ImpressionResult) => void;
  onSkip: () => void;
  onIdentifyFirst?: () => void;
  participantId?: string;
  autoSpeak?: boolean;
}

type Phase = "input" | "converse" | "handoff";

const INTENSITIES: { key: Intensity; label: string }[] = [
  { key: "schnell", label: "Schnell" },
  { key: "neugierig", label: "Neugierig" },
  { key: "rabbithole", label: "Rabbit Hole" },
];

const LEDGER_SLOTS: { key: keyof Omit<Ledger, "vagueResolved">; label: string }[] = [
  { key: "nose", label: "Nase" },
  { key: "palate", label: "Gaumen" },
  { key: "finish", label: "Abgang" },
  { key: "body", label: "Körper" },
  { key: "intensity", label: "Intensität" },
  { key: "affect", label: "Wertung" },
];

export default function ImpressionCapture({ whiskyName, onApply, onSkip, onIdentifyFirst, participantId, autoSpeak = false }: ImpressionCaptureProps) {
  const { t, i18n } = useTranslation();
  const voice = useCooperVoice();
  const [muted, setMuted] = useState(false);

  const [phase, setPhase] = useState<Phase>("input");
  const [text, setText] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const [intensity, setIntensity] = useState<Intensity>("neugierig");
  const [transcript, setTranscript] = useState<ConverseTurn[]>([]);
  const [ledger, setLedger] = useState<Ledger>(EMPTY_LEDGER);
  const [chips, setChips] = useState<string[]>([]);
  const [proposeClose, setProposeClose] = useState(false);
  const [result, setResult] = useState<ImpressionResult | null>(null);
  const [narrative, setNarrative] = useState("");
  const [narrativeLoading, setNarrativeLoading] = useState(false);

  const [offeredTerms, setOfferedTerms] = useState<Set<string>>(new Set());
  const [adoptedTerms, setAdoptedTerms] = useState<Set<string>>(new Set());
  const rawImpressionRef = useRef("");

  const threadRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript, loading]);

  useEffect(() => {
    if (phase !== "converse") voice.stop();
  }, [phase]);

  const vocabLocale = (): "de" | "en" => (i18n.language?.startsWith("de") ? "de" : "en");
  const canStart = text.trim().length >= 2 && !loading;

  const noteOffered = (cs: string[]) => {
    if (!cs.length) return;
    setOfferedTerms((prev) => {
      const n = new Set(prev);
      cs.forEach((c) => n.add(c));
      return n;
    });
  };

  const applyConverse = (baseTurns: ConverseTurn[], r: ConverseResult) => {
    const withMentor: ConverseTurn[] = r.mentorTurn ? [...baseTurns, { role: "mentor", text: r.mentorTurn }] : baseTurns;
    setTranscript(withMentor);
    if (r.mentorTurn && autoSpeak && !muted) voice.speak(r.mentorTurn);
    setLedger(r.ledger);
    setChips(r.chips || []);
    noteOffered(r.chips || []);
    setProposeClose(!!r.proposeClose);
  };

  const handleStart = async () => {
    if (!canStart) return;
    const raw = text.trim();
    rawImpressionRef.current = raw;
    const firstTurns: ConverseTurn[] = [{ role: "taster", text: raw }];
    setTranscript(firstTurns);
    setText("");
    setPhase("converse");
    setLoading(true);
    setError(false);
    try {
      const r = await converseImpression({ whiskyName, intensity, transcript: firstTurns, ledger: EMPTY_LEDGER });
      applyConverse(firstTurns, r);
    } catch {
      setError(true);
    }
    setLoading(false);
  };

  const handleReply = async () => {
    const ans = reply.trim();
    if (ans.length < 1 || loading) return;
    const nextTurns: ConverseTurn[] = [...transcript, { role: "taster", text: ans }];
    setTranscript(nextTurns);
    setReply("");
    setChips([]);
    setLoading(true);
    setError(false);
    try {
      const r = await converseImpression({ whiskyName, intensity, transcript: nextTurns, ledger });
      applyConverse(nextTurns, r);
    } catch {
      setError(true);
    }
    setLoading(false);
  };

  const tapChip = (c: string) => {
    setAdoptedTerms((prev) => new Set(prev).add(c));
    setReply((prev) => {
      const tr = prev.trim();
      if (!tr) return c;
      if (tr.toLowerCase().includes(c.toLowerCase())) return tr;
      return `${tr}, ${c}`;
    });
  };

  const handleFinish = async () => {
    if (loading || transcript.length === 0) return;
    setLoading(true);
    setError(false);
    try {
      const r = await finalizeImpression({ whiskyName, intensity, transcript });
      setResult({ ...r, rawImpression: rawImpressionRef.current || r.rawImpression });
      setPhase("handoff");
    } catch {
      setError(true);
    }
    setLoading(false);
  };

  const handleProse = async () => {
    if (narrativeLoading || transcript.length === 0) return;
    setNarrativeLoading(true);
    try { const r = await proseImpression({ whiskyName, intensity, transcript }); setNarrative(r.narrative || ""); } catch {}
    setNarrativeLoading(false);
  };

  const handleConfirm = () => {
    if (!result) {
      onSkip();
      return;
    }
    if (participantId) {
      const loc = vocabLocale();
      const finalTags = result.flavorTags ?? [];
      const events = [
        ...finalTags.map((tg) => ({ term: tg, status: (adoptedTerms.has(tg) ? "adopted" : "self") as "adopted" | "self", source: "impression" as const, locale: loc })),
        ...[...offeredTerms].filter((tg) => !finalTags.includes(tg)).map((tg) => ({ term: tg, status: "offered" as const, source: "impression" as const, locale: loc })),
      ];
      recordVocabularyEvents(participantId, events);
    }
    onApply({ ...result, narrative: narrative.trim() || undefined });
  };

  const renderMirror = (r: ImpressionResult) => {
    const dims = [
      { label: t("v2.dimNose", "Nase"), text: r.nose },
      { label: t("v2.dimPalate", "Gaumen"), text: r.taste },
      { label: t("v2.dimFinish", "Abgang"), text: r.finish },
    ].filter((d) => d.text);
    return (
      <>
        {r.flavorTags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: SP.xs, marginBottom: dims.length ? SP.sm : SP.md }}>
            {r.flavorTags.map((tag, i) => (
              <span key={i} style={{ fontFamily: FONT.body, fontSize: 14, color: LABS_THEME.text, background: LABS_THEME.bgCard, border: `1px solid ${LABS_THEME.border}`, borderRadius: RADIUS.full, padding: "6px 12px" }}>
                {tag}
              </span>
            ))}
          </div>
        )}
        {dims.length > 0 && (
          <div style={{ marginBottom: SP.md }}>
            {dims.map((d, i) => (
              <div key={i} style={{ fontFamily: FONT.body, fontSize: 15, color: LABS_THEME.text, lineHeight: 1.5, marginBottom: 2 }}>
                <span style={{ color: LABS_THEME.gold }}>{d.label}:</span> {d.text}
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  const scoreParts = result?.scoreSuggestion
    ? [
        result.scoreSuggestion.overall != null ? `${t("v2.dimOverall", "Gesamt")} ${result.scoreSuggestion.overall}` : null,
        result.scoreSuggestion.nose != null ? `${t("v2.dimNose", "Nase")} ${result.scoreSuggestion.nose}` : null,
        result.scoreSuggestion.taste != null ? `${t("v2.dimPalate", "Gaumen")} ${result.scoreSuggestion.taste}` : null,
        result.scoreSuggestion.finish != null ? `${t("v2.dimFinish", "Abgang")} ${result.scoreSuggestion.finish}` : null,
      ].filter(Boolean)
    : [];

  const LedgerConstellation = () => (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: SP.xs, marginBottom: SP.md, padding: `0 ${SP.xs}px` }}>
      {LEDGER_SLOTS.map((slot) => {
        const status = ledger[slot.key];
        const dot =
          status === "sharpened"
            ? { background: LABS_THEME.gold, border: `1px solid ${LABS_THEME.gold}`, boxShadow: "0 0 8px rgba(212,168,71,0.6)" }
            : status === "touched"
            ? { background: "rgba(212,168,71,0.18)", border: `1px solid ${LABS_THEME.gold}`, boxShadow: "none" }
            : { background: "transparent", border: `1px solid ${LABS_THEME.faint}`, boxShadow: "none" };
        return (
          <div key={slot.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 }}>
            <div style={{ width: 10, height: 10, borderRadius: RADIUS.full, transition: "all 280ms ease", ...dot }} />
            <span style={{ fontFamily: FONT.body, fontSize: 9, letterSpacing: 0.2, color: status === "untouched" ? LABS_THEME.faint : LABS_THEME.muted, textAlign: "center" }}>
              {slot.label}
            </span>
          </div>
        );
      })}
    </div>
  );

  const chipStyle = {
    padding: "8px 14px",
    borderRadius: 999,
    border: `1px solid ${LABS_THEME.border}`,
    background: "transparent",
    color: LABS_THEME.text,
    fontFamily: FONT.body,
    fontSize: 14,
    cursor: "pointer",
    minHeight: 36,
  } as const;

  return (
    <div style={{ padding: SP.md }}>
      <div style={{ fontFamily: FONT.display, fontSize: 22, color: LABS_THEME.text, marginBottom: SP.xs }}>
        {t("v2.impressionTitle", "Erster Eindruck")}
      </div>

      {phase === "input" && (
        <>
          <div style={{ fontFamily: FONT.serif, fontSize: 16, color: LABS_THEME.muted, marginBottom: SP.md, lineHeight: 1.45 }}>
            {t("v2.impressionHint", "Was nimmst du wahr? Tippe oder sprich frei \u2014 ein, zwei S\u00e4tze gen\u00fcgen. Den Rest ordnen wir gemeinsam.")}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("v2.impressionPlaceholder", "z.B. warm und weich, Vanille und etwas Rauch im Abgang \u2026")}
            rows={4}
            style={{ width: "100%", boxSizing: "border-box", background: LABS_THEME.inputBg, border: `1px solid ${LABS_THEME.border}`, borderRadius: RADIUS.md, color: LABS_THEME.text, fontFamily: FONT.body, fontSize: 16, lineHeight: 1.5, padding: SP.md, resize: "vertical", minHeight: 96, outline: "none" }}
          />

          <div style={{ marginTop: SP.md }}>
            <div style={{ fontFamily: FONT.body, fontSize: 12, color: LABS_THEME.faint, marginBottom: SP.xs }}>
              {t("v2.impressionDepth", "Wie tief soll Cooper nachfragen?")}
            </div>
            <div style={{ display: "flex", gap: SP.xs }}>
              {INTENSITIES.map((opt) => {
                const active = intensity === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setIntensity(opt.key)}
                    style={{ flex: 1, minHeight: 36, borderRadius: RADIUS.md, border: `1px solid ${active ? LABS_THEME.gold : LABS_THEME.border}`, background: active ? "rgba(212,168,71,0.14)" : "transparent", color: active ? LABS_THEME.gold : LABS_THEME.muted, fontFamily: FONT.body, fontSize: 13, cursor: "pointer", transition: "all 180ms ease" }}
                  >
                    {t(`v2.impressionDepth_${opt.key}`, opt.label)}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div style={{ fontFamily: FONT.body, fontSize: 14, color: LABS_THEME.amber, marginTop: SP.sm, lineHeight: 1.4 }}>
              {t("v2.impressionError", "Konnte den Eindruck gerade nicht verarbeiten. Versuch es nochmal \u2014 oder \u00fcberspringe und bewerte direkt.")}
            </div>
          )}
          <div style={{ display: "flex", gap: SP.sm, marginTop: SP.md }}>
            <button
              onClick={handleStart}
              disabled={!canStart}
              style={{ flex: 1, minHeight: TOUCH_MIN, background: LABS_THEME.gold, color: "#1a1408", border: "none", borderRadius: RADIUS.md, fontFamily: FONT.body, fontSize: 16, fontWeight: 600, opacity: canStart ? 1 : 0.45, cursor: canStart ? "pointer" : "default", transition: "opacity 200ms ease" }}
            >
              {loading ? t("v2.impressionParsing", "Einen Moment \u2026") : t("v2.impressionApply", "Eindruck \u00fcbernehmen")}
            </button>
            <button
              onClick={onSkip}
              disabled={loading}
              style={{ minHeight: TOUCH_MIN, padding: `0 ${SP.md}px`, background: "transparent", color: LABS_THEME.muted, border: `1px solid ${LABS_THEME.border}`, borderRadius: RADIUS.md, fontFamily: FONT.body, fontSize: 16, cursor: loading ? "default" : "pointer" }}
            >
              {t("v2.impressionSkip", "\u00dcberspringen")}
            </button>
          </div>
          {onIdentifyFirst && (
            <button
              type="button"
              onClick={onIdentifyFirst}
              style={{ width: "100%", marginTop: SP.md, background: "transparent", border: "none", color: LABS_THEME.muted, fontFamily: FONT.body, fontSize: 14, textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer", padding: SP.sm }}
            >
              {t("v2.impressionIdentifyFirst", "Lieber erst den Whisky bestimmen")}
            </button>
          )}
        </>
      )}

      {phase === "converse" && (
        <>
          {autoSpeak && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: SP.sm }}>
              <button
                type="button"
                onClick={() => { const next = !muted; setMuted(next); if (next) voice.stop(); }}
                style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 32, padding: "4px 10px", background: "transparent", border: `1px solid ${LABS_THEME.border}`, borderRadius: RADIUS.md, color: muted ? LABS_THEME.muted : LABS_THEME.gold, fontFamily: FONT.body, fontSize: 12, cursor: "pointer" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  {muted ? (
                    <>
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </>
                  ) : (
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  )}
                </svg>
                {muted ? t("v2.cooperVoiceMuteOff", "Stimme an") : t("v2.cooperVoiceMuteOn", "Stimme aus")}
              </button>
            </div>
          )}
          <LedgerConstellation />

          <div ref={threadRef} style={{ maxHeight: 320, overflowY: "auto", marginBottom: SP.md, paddingRight: 2 }}>
            {transcript.map((turn, i) =>
              turn.role === "mentor" ? (
                <div key={i} style={{ display: "flex", gap: SP.sm, marginBottom: SP.md }}>
                  <span style={{ color: LABS_THEME.gold, fontSize: 12, lineHeight: "26px" }}>{"\u2726"}</span>
                  <div style={{ fontFamily: FONT.serif, fontSize: 17, color: LABS_THEME.text, lineHeight: 1.45 }}>{turn.text}</div>
                  <button
                    type="button"
                    onClick={() => voice.speak(turn.text)}
                    aria-label={t("v2.cooperVoicePlay", "Vorlesen")}
                    title={t("v2.cooperVoicePlay", "Vorlesen")}
                    style={{ marginLeft: "auto", flexShrink: 0, alignSelf: "flex-start", background: "transparent", border: "none", padding: 4, lineHeight: 0, cursor: "pointer", color: voice.speaking ? LABS_THEME.gold : LABS_THEME.muted }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div key={i} style={{ display: "flex", justifyContent: "flex-end", marginBottom: SP.md }}>
                  <div style={{ maxWidth: "85%", fontFamily: FONT.body, fontSize: 15, color: LABS_THEME.muted, background: LABS_THEME.bgCard, border: `1px solid ${LABS_THEME.border}`, borderRadius: RADIUS.md, padding: `${SP.sm}px ${SP.md}px`, lineHeight: 1.45 }}>
                    {turn.text}
                  </div>
                </div>
              )
            )}
            {loading && (
              <div style={{ display: "flex", gap: SP.sm, marginBottom: SP.md }}>
                <span style={{ color: LABS_THEME.gold, fontSize: 12, lineHeight: "26px" }}>{"\u2726"}</span>
                <div style={{ fontFamily: FONT.serif, fontSize: 17, color: LABS_THEME.faint, lineHeight: 1.45 }}>{t("v2.impressionThinking", "Cooper denkt nach \u2026")}</div>
              </div>
            )}
          </div>

          {chips.length > 0 && !loading && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: SP.sm, marginBottom: SP.md }}>
              {chips.map((c) => (
                <button key={c} type="button" onClick={() => tapChip(c)} style={chipStyle}>
                  {c}
                </button>
              ))}
            </div>
          )}

          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={t("v2.impressionAnswerPlaceholder", "Deine Antwort \u2014 ein paar Worte gen\u00fcgen \u2026")}
            rows={2}
            style={{ width: "100%", boxSizing: "border-box", background: LABS_THEME.inputBg, border: `1px solid ${LABS_THEME.border}`, borderRadius: RADIUS.md, color: LABS_THEME.text, fontFamily: FONT.body, fontSize: 16, lineHeight: 1.5, padding: SP.md, resize: "vertical", minHeight: 64, outline: "none" }}
          />

          {error && (
            <div style={{ fontFamily: FONT.body, fontSize: 14, color: LABS_THEME.amber, marginTop: SP.sm, lineHeight: 1.4 }}>
              {t("v2.impressionError", "Konnte den Eindruck gerade nicht verarbeiten. Versuch es nochmal \u2014 oder \u00fcberspringe und bewerte direkt.")}
            </div>
          )}

          {proposeClose && !loading && (
            <div style={{ fontFamily: FONT.serif, fontSize: 15, color: LABS_THEME.gold, margin: `${SP.sm}px 0`, lineHeight: 1.4 }}>
              {t("v2.impressionProposeClose", "Cooper: Ich glaube, ich habe jetzt ein reiches Bild. Sollen wir die Zahlen setzen?")}
            </div>
          )}

          <div style={{ display: "flex", gap: SP.sm, marginTop: SP.md }}>
            <button
              onClick={handleReply}
              disabled={loading || reply.trim().length < 1}
              style={{ flex: 1, minHeight: TOUCH_MIN, background: proposeClose ? "transparent" : LABS_THEME.gold, color: proposeClose ? LABS_THEME.text : "#1a1408", border: proposeClose ? `1px solid ${LABS_THEME.border}` : "none", borderRadius: RADIUS.md, fontFamily: FONT.body, fontSize: 16, fontWeight: 600, opacity: loading || reply.trim().length < 1 ? 0.45 : 1, cursor: loading || reply.trim().length < 1 ? "default" : "pointer", transition: "opacity 200ms ease" }}
            >
              {t("v2.impressionAnswer", "Antworten")}
            </button>
            <button
              onClick={handleFinish}
              disabled={loading}
              style={{ flex: proposeClose ? 1 : "0 0 auto", minHeight: TOUCH_MIN, padding: `0 ${SP.md}px`, background: proposeClose ? LABS_THEME.gold : "transparent", color: proposeClose ? "#1a1408" : LABS_THEME.muted, border: proposeClose ? "none" : `1px solid ${LABS_THEME.border}`, borderRadius: RADIUS.md, fontFamily: FONT.body, fontSize: 16, fontWeight: proposeClose ? 600 : 400, cursor: loading ? "default" : "pointer" }}
            >
              {proposeClose ? t("v2.impressionHandoffConfirm", "Zur Bewertung") : t("v2.impressionFinish", "Ich bin fertig")}
            </button>
          </div>
        </>
      )}

      {phase === "handoff" && result && (
        <>
          <div style={{ fontFamily: FONT.serif, fontSize: 16, color: LABS_THEME.muted, marginBottom: SP.md, lineHeight: 1.45 }}>
            {t("v2.impressionHandoffIntro", "Das nehme ich aus deinem Eindruck in die Bewertung mit:")}
          </div>
          {renderMirror(result)}
          {scoreParts.length > 0 ? (
            <div style={{ fontFamily: FONT.body, fontSize: 14, color: LABS_THEME.muted, marginBottom: SP.md, lineHeight: 1.5 }}>
              {t("v2.impressionHandoffScore", "Wertungs-Vorschlag")}: {scoreParts.join(" \u00b7 ")}
            </div>
          ) : (
            <div style={{ fontFamily: FONT.body, fontSize: 14, color: LABS_THEME.muted, marginBottom: SP.md, lineHeight: 1.5 }}>
              {t("v2.impressionHandoffNoScore", "Die Wertung startet neutral \u2014 die Zahlen setzt du selbst.")}
            </div>
          )}
          <div style={{ height: 1, background: LABS_THEME.border, margin: `0 0 ${SP.md}px` }} />
          <div style={{ fontFamily: FONT.serif, fontSize: 15, color: LABS_THEME.faint, marginBottom: SP.md, lineHeight: 1.45 }}>
            {t("v2.impressionHandoffNote", "Nur ein Ausgangspunkt \u2014 in der Bewertung kannst du jeden Wert anpassen.")}
          </div>
          {!narrative ? (
            <button type="button" onClick={handleProse} disabled={narrativeLoading} style={{ width: "100%", minHeight: TOUCH_MIN, marginBottom: SP.md, background: "transparent", color: LABS_THEME.gold, border: `1px solid ${LABS_THEME.gold}`, borderRadius: RADIUS.md, fontFamily: FONT.body, fontSize: 15, cursor: narrativeLoading ? "default" : "pointer" }}>
              {narrativeLoading ? t("v2.proseLoading", "Cooper formuliert \u2026") : t("v2.proseButton", "Cooper, fass es in Worte")}
            </button>
          ) : (
            <div style={{ marginBottom: SP.md }}>
              <div style={{ fontFamily: FONT.serif, fontSize: 15, color: LABS_THEME.muted, marginBottom: SP.xs }}>{t("v2.proseLabel", "Deine Verkostungsnotiz (bearbeitbar):")}</div>
              <textarea value={narrative} onChange={(e) => setNarrative(e.target.value)} rows={8} style={{ width: "100%", boxSizing: "border-box", background: LABS_THEME.inputBg, border: `1px solid ${LABS_THEME.border}`, borderRadius: RADIUS.md, color: LABS_THEME.text, fontFamily: FONT.serif, fontSize: 16, lineHeight: 1.6, padding: SP.md, resize: "vertical", minHeight: 160, outline: "none" }} />
            </div>
          )}
          <button
            onClick={handleConfirm}
            style={{ width: "100%", minHeight: TOUCH_MIN, background: LABS_THEME.gold, color: "#1a1408", border: "none", borderRadius: RADIUS.md, fontFamily: FONT.body, fontSize: 16, fontWeight: 600, cursor: "pointer" }}
          >
            {t("v2.impressionHandoffConfirm", "Zur Bewertung")}
          </button>
        </>
      )}
    </div>
  );
}

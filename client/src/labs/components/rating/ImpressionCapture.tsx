import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FONT, SP, RADIUS, TOUCH_MIN, LABS_THEME } from "./theme";
import { parseImpression, type ImpressionResult } from "./impressionApi";

interface ImpressionCaptureProps {
  whiskyName?: string;
  onApply: (result: ImpressionResult) => void;
  onSkip: () => void;
  onIdentifyFirst?: () => void;
}

const MAX_ROUNDS = 3;
const confLevel = (c: "high" | "medium" | "low") => (c === "high" ? 2 : c === "medium" ? 1 : 0);

function shouldAskNext(round: number, result: ImpressionResult, prev: ImpressionResult | null): boolean {
  if (round >= MAX_ROUNDS) return false;            // harte Notbremse
  if (!result.followUpQuestion) return false;       // kein Ansatzpunkt -> keine Frage moeglich
  // Solange kein tragfaehiger Score ableitbar ist, integrativ weiterfragen
  // (ueberspringt Konfidenz-Decke + Plateau): vager Eindruck ist NICHT gesaettigt.
  if (result.scoreSuggestion === null) return true;
  if (result.confidence === "high") return false;
  if (prev) {
    const confGain = confLevel(result.confidence) > confLevel(prev.confidence);
    const newAspect =
      result.flavorTags.length > prev.flavorTags.length ||
      (!!result.nose && !prev.nose) ||
      (!!result.taste && !prev.taste) ||
      (!!result.finish && !prev.finish);
    if (!confGain && !newAspect) return false;
  }
  return true;
}

export default function ImpressionCapture({ whiskyName, onApply, onSkip, onIdentifyFirst }: ImpressionCaptureProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<"input" | "reflect" | "handoff">("input");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const [result, setResult] = useState<ImpressionResult | null>(null);
  const [prevResult, setPrevResult] = useState<ImpressionResult | null>(null);
  const [enrichedText, setEnrichedText] = useState("");
  const [asked, setAsked] = useState<string[]>([]);
  const [round, setRound] = useState(0);

  const canSubmit = text.trim().length >= 2 && !loading;

  const handleInitial = async () => {
    if (text.trim().length < 2 || loading) return;
    setLoading(true);
    setError(false);
    try {
      const base = text.trim();
      const r = await parseImpression(base, whiskyName, []);
      setEnrichedText(base);
      setResult(r);
      if (shouldAskNext(0, r, null)) {
        setPrevResult(null);
        setAsked([r.followUpQuestion]);
        setRound(0);
        setText("");
        setPhase("reflect");
      } else {
        setPhase("handoff");
      }
      setLoading(false);
    } catch {
      setError(true);
      setLoading(false);
    }
  };

  const handleAnswer = async () => {
    if (text.trim().length < 1 || loading || !result) return;
    setLoading(true);
    setError(false);
    try {
      const newEnriched = `${enrichedText}. ${text.trim()}`;
      const nextRound = round + 1;
      const r = await parseImpression(newEnriched, whiskyName, asked);
      setEnrichedText(newEnriched);
      if (shouldAskNext(nextRound, r, result)) {
        setPrevResult(result);
        setResult(r);
        setAsked((prev) => [...prev, r.followUpQuestion]);
        setRound(nextRound);
        setText("");
      } else {
        setResult(r);
        setPhase("handoff");
      }
      setLoading(false);
    } catch {
      setError(true);
      setLoading(false);
    }
  };

  const handleProceed = () => setPhase("handoff");

  const handleConfirm = () => {
    if (result) onApply({ ...result, rawImpression: enrichedText });
    else onSkip();
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
              <span
                key={i}
                style={{
                  fontFamily: FONT.body,
                  fontSize: 14,
                  color: LABS_THEME.text,
                  background: LABS_THEME.bgCard,
                  border: `1px solid ${LABS_THEME.border}`,
                  borderRadius: RADIUS.full,
                  padding: "6px 12px",
                }}
              >
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

  return (
    <div style={{ padding: SP.md }}>
      <div style={{ fontFamily: FONT.display, fontSize: 22, color: LABS_THEME.text, marginBottom: SP.xs }}>
        {t("v2.impressionTitle", "Erster Eindruck")}
      </div>

      {phase === "input" && (
        <>
          <div style={{ fontFamily: FONT.serif, fontSize: 16, color: LABS_THEME.muted, marginBottom: SP.md, lineHeight: 1.45 }}>
            {t("v2.impressionHint", "Was nimmst du wahr? Tippe oder sprich frei \u2014 ein, zwei Saetze genuegen. Den Rest ordnen wir gemeinsam.")}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("v2.impressionPlaceholder", "z.B. warm und weich, Vanille und etwas Rauch im Abgang \u2026")}
            rows={4}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: LABS_THEME.inputBg,
              border: `1px solid ${LABS_THEME.border}`,
              borderRadius: RADIUS.md,
              color: LABS_THEME.text,
              fontFamily: FONT.body,
              fontSize: 16,
              lineHeight: 1.5,
              padding: SP.md,
              resize: "vertical",
              minHeight: 96,
              outline: "none",
            }}
          />
          {error && (
            <div style={{ fontFamily: FONT.body, fontSize: 14, color: LABS_THEME.amber, marginTop: SP.sm, lineHeight: 1.4 }}>
              {t("v2.impressionError", "Konnte den Eindruck gerade nicht verarbeiten. Versuch es nochmal \u2014 oder ueberspringe und bewerte direkt.")}
            </div>
          )}
          <div style={{ display: "flex", gap: SP.sm, marginTop: SP.md }}>
            <button
              onClick={handleInitial}
              disabled={!canSubmit}
              style={{
                flex: 1,
                minHeight: TOUCH_MIN,
                background: LABS_THEME.gold,
                color: "#1a1408",
                border: "none",
                borderRadius: RADIUS.md,
                fontFamily: FONT.body,
                fontSize: 16,
                fontWeight: 600,
                opacity: canSubmit ? 1 : 0.45,
                cursor: canSubmit ? "pointer" : "default",
                transition: "opacity 200ms ease",
              }}
            >
              {loading ? t("v2.impressionParsing", "Einen Moment \u2026") : t("v2.impressionApply", "Eindruck \u00fcbernehmen")}
            </button>
            <button
              onClick={onSkip}
              disabled={loading}
              style={{
                minHeight: TOUCH_MIN,
                padding: `0 ${SP.md}px`,
                background: "transparent",
                color: LABS_THEME.muted,
                border: `1px solid ${LABS_THEME.border}`,
                borderRadius: RADIUS.md,
                fontFamily: FONT.body,
                fontSize: 16,
                cursor: loading ? "default" : "pointer",
              }}
            >
              {t("v2.impressionSkip", "\u00dcberspringen")}
            </button>
          </div>
          {onIdentifyFirst && (
            <button
              type="button"
              onClick={onIdentifyFirst}
              style={{
                width: "100%",
                marginTop: SP.md,
                background: "transparent",
                border: "none",
                color: LABS_THEME.muted,
                fontFamily: FONT.body,
                fontSize: 14,
                textDecoration: "underline",
                textUnderlineOffset: 3,
                cursor: "pointer",
                padding: SP.sm,
              }}
            >
              {t("v2.impressionIdentifyFirst", "Lieber erst den Whisky bestimmen")}
            </button>
          )}
        </>
      )}

      {phase === "reflect" && result && (
        <>
          <div style={{ fontFamily: FONT.serif, fontSize: 15, color: LABS_THEME.muted, marginBottom: SP.sm, lineHeight: 1.4 }}>
            {t("v2.impressionMirror", "Das habe ich herausgeh\u00f6rt:")}
          </div>
          {renderMirror(result)}

          <div style={{ height: 1, background: LABS_THEME.border, margin: `${SP.sm}px 0 ${SP.md}px` }} />

          <div style={{ fontFamily: FONT.serif, fontSize: 18, color: LABS_THEME.text, marginBottom: SP.sm, lineHeight: 1.4 }}>
            {result.followUpQuestion}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("v2.impressionAnswerPlaceholder", "Deine Antwort \u2014 ein paar Worte gen\u00fcgen \u2026")}
            rows={2}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: LABS_THEME.inputBg,
              border: `1px solid ${LABS_THEME.border}`,
              borderRadius: RADIUS.md,
              color: LABS_THEME.text,
              fontFamily: FONT.body,
              fontSize: 16,
              lineHeight: 1.5,
              padding: SP.md,
              resize: "vertical",
              minHeight: 64,
              outline: "none",
            }}
          />
          {error && (
            <div style={{ fontFamily: FONT.body, fontSize: 14, color: LABS_THEME.amber, marginTop: SP.sm, lineHeight: 1.4 }}>
              {t("v2.impressionError", "Konnte den Eindruck gerade nicht verarbeiten. Versuch es nochmal \u2014 oder ueberspringe und bewerte direkt.")}
            </div>
          )}
          <div style={{ display: "flex", gap: SP.sm, marginTop: SP.md }}>
            <button
              onClick={handleAnswer}
              disabled={loading || text.trim().length < 1}
              style={{
                flex: 1,
                minHeight: TOUCH_MIN,
                background: LABS_THEME.gold,
                color: "#1a1408",
                border: "none",
                borderRadius: RADIUS.md,
                fontFamily: FONT.body,
                fontSize: 16,
                fontWeight: 600,
                opacity: loading || text.trim().length < 1 ? 0.45 : 1,
                cursor: loading || text.trim().length < 1 ? "default" : "pointer",
                transition: "opacity 200ms ease",
              }}
            >
              {loading ? t("v2.impressionParsing", "Einen Moment \u2026") : t("v2.impressionAnswer", "Antworten")}
            </button>
            <button
              onClick={handleProceed}
              disabled={loading}
              style={{
                minHeight: TOUCH_MIN,
                padding: `0 ${SP.md}px`,
                background: "transparent",
                color: LABS_THEME.muted,
                border: `1px solid ${LABS_THEME.border}`,
                borderRadius: RADIUS.md,
                fontFamily: FONT.body,
                fontSize: 16,
                cursor: loading ? "default" : "pointer",
              }}
            >
              {t("v2.impressionProceed", "Weiter")}
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
          <button
            onClick={handleConfirm}
            style={{
              width: "100%",
              minHeight: TOUCH_MIN,
              background: LABS_THEME.gold,
              color: "#1a1408",
              border: "none",
              borderRadius: RADIUS.md,
              fontFamily: FONT.body,
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("v2.impressionHandoffConfirm", "Zur Bewertung")}
          </button>
        </>
      )}
    </div>
  );
}

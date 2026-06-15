import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FONT, SP, RADIUS, TOUCH_MIN, LABS_THEME } from "./theme";
import { parseImpression, type ImpressionResult } from "./impressionApi";
import { chipsForFollowUp, type EvaluationLevel } from "./impressionChips";
import { recordVocabularyEvents } from "@/lib/vocabulary";

interface ImpressionCaptureProps {
  whiskyName?: string;
  onApply: (result: ImpressionResult) => void;
  onSkip: () => void;
  onIdentifyFirst?: () => void;
  participantId?: string;
}

const MAX_ROUNDS = 4;

function shouldAskNext(round: number, result: ImpressionResult): boolean {
  if (round >= MAX_ROUNDS) return false;       // harte Notbremse
  if (!result.followUpQuestion) return false;  // Server signalisiert: nichts mehr offen
  if (!result.followUpKind) return false;      // kein konkreter Fragetyp -> nicht weiterbohren
  return true;
}

export default function ImpressionCapture({ whiskyName, onApply, onSkip, onIdentifyFirst, participantId }: ImpressionCaptureProps) {
  const { t, i18n } = useTranslation();
  const [phase, setPhase] = useState<"input" | "reflect" | "handoff">("input");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const [result, setResult] = useState<ImpressionResult | null>(null);
  const [prevResult, setPrevResult] = useState<ImpressionResult | null>(null);
  const [enrichedText, setEnrichedText] = useState("");
  const [asked, setAsked] = useState<string[]>([]);
  const [round, setRound] = useState(0);
  const [overrideOverall, setOverrideOverall] = useState<number | null>(null);
  const [offeredTerms, setOfferedTerms] = useState<Set<string>>(new Set());
  const [adoptedTerms, setAdoptedTerms] = useState<Set<string>>(new Set());

  // offeredTerms: Vereinigung ALLER je in Reflect gerenderten Chip-Labels (additive Telemetrie).
  useEffect(() => {
    if (phase !== "reflect" || !result) return;
    const chips = chipsForFollowUp(result.followUpKind, result.followUpTerm);
    const labels = chips.evaluation ? chips.evaluation.map((lvl) => lvl.label) : chips.options;
    if (!labels.length) return;
    setOfferedTerms((prev) => {
      const next = new Set(prev);
      labels.forEach((l) => next.add(l));
      return next;
    });
  }, [phase, result?.followUpKind, result?.followUpTerm]);

  const canSubmit = text.trim().length >= 2 && !loading;

  const appendChip = (label: string) => {
    setAdoptedTerms((prev) => new Set(prev).add(label));
    setText((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return label;
      if (trimmed.toLowerCase().includes(label.toLowerCase())) return trimmed;
      return `${trimmed}, ${label}`;
    });
  };
  const pickEvaluation = (level: EvaluationLevel) => {
    setOverrideOverall(level.score);
    appendChip(level.label);
  };

  const handleInitial = async () => {
    if (text.trim().length < 2 || loading) return;
    setLoading(true);
    setError(false);
    try {
      const base = text.trim();
      const r = await parseImpression(base, whiskyName, []);
      setEnrichedText(base);
      setResult(r);
      if (shouldAskNext(0, r)) {
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
      if (shouldAskNext(nextRound, r)) {
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
    if (!result) { onSkip(); return; }
    const score = overrideOverall !== null
      ? {
          overall: overrideOverall,
          nose: result.scoreSuggestion?.nose ?? null,
          taste: result.scoreSuggestion?.taste ?? null,
          finish: result.scoreSuggestion?.finish ?? null,
        }
      : result.scoreSuggestion;
    if (participantId) {
      const vocabLocale: "de" | "en" = i18n.language?.startsWith("de") ? "de" : "en";
      const finalTags = result.flavorTags ?? [];
      const events = [
        ...finalTags.map((tg) => ({ term: tg, status: (adoptedTerms.has(tg) ? "adopted" : "self") as "adopted" | "self", source: "impression" as const, locale: vocabLocale })),
        ...[...offeredTerms].filter((tg) => !finalTags.includes(tg)).map((tg) => ({ term: tg, status: "offered" as const, source: "impression" as const, locale: vocabLocale })),
      ];
      recordVocabularyEvents(participantId, events);
    }
    onApply({ ...result, scoreSuggestion: score, rawImpression: enrichedText });
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
          {(() => {
            const chips = chipsForFollowUp(result.followUpKind, result.followUpTerm);
            const chipStyle = (active: boolean) => ({
              padding: "8px 14px",
              borderRadius: 999,
              border: `1px solid ${active ? LABS_THEME.gold : LABS_THEME.border}`,
              background: active ? "rgba(212,168,71,0.16)" : "transparent",
              color: active ? LABS_THEME.gold : LABS_THEME.text,
              fontFamily: FONT.body,
              fontSize: 14,
              cursor: "pointer",
              minHeight: 36,
            } as const);
            if (chips.evaluation) {
              return (
                <div style={{ display: "flex", flexWrap: "wrap", gap: SP.sm, marginBottom: SP.md }}>
                  {chips.evaluation.map((lvl) => (
                    <button key={lvl.label} type="button" onClick={() => pickEvaluation(lvl)} style={chipStyle(overrideOverall === lvl.score)}>
                      {lvl.label}
                    </button>
                  ))}
                </div>
              );
            }
            if (chips.options.length > 0) {
              return (
                <div style={{ display: "flex", flexWrap: "wrap", gap: SP.sm, marginBottom: SP.md }}>
                  {chips.options.map((opt) => (
                    <button key={opt} type="button" onClick={() => appendChip(opt)} style={chipStyle(text.toLowerCase().includes(opt.toLowerCase()))}>
                      {opt}
                    </button>
                  ))}
                </div>
              );
            }
            return null;
          })()}
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

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FONT, SP, RADIUS, TOUCH_MIN, LABS_THEME } from "./theme";
import { parseImpression, type ImpressionResult } from "./impressionApi";

interface ImpressionCaptureProps {
  whiskyName?: string;
  onApply: (result: ImpressionResult) => void;
  onSkip: () => void;
}

export default function ImpressionCapture({ whiskyName, onApply, onSkip }: ImpressionCaptureProps) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const canSubmit = text.trim().length >= 2 && !loading;

  const handleApply = async () => {
    if (text.trim().length < 2 || loading) return;
    setLoading(true);
    setError(false);
    try {
      const result = await parseImpression(text.trim(), whiskyName);
      onApply(result);
    } catch {
      setError(true);
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: SP.md }}>
      <div style={{ fontFamily: FONT.display, fontSize: 22, color: LABS_THEME.text, marginBottom: SP.xs }}>
        {t("v2.impressionTitle", "Erster Eindruck")}
      </div>
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
          onClick={handleApply}
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
    </div>
  );
}

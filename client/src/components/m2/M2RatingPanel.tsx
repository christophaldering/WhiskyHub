import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { v, alpha } from "@/lib/themeVars";
import { ChevronDown, Mic } from "lucide-react";

export const ATTRIBUTES = {
  nose: ["Fruity", "Floral", "Spicy", "Smoky", "Woody", "Sweet", "Malty", "Sherry", "Citrus", "Peaty"],
  taste: ["Sweet", "Dry", "Oily", "Spicy", "Fruity", "Nutty", "Chocolate", "Vanilla", "Salty", "Peaty"],
  finish: ["Short", "Medium", "Long", "Warm", "Dry", "Spicy", "Smoky", "Sweet", "Bitter"],
  balance: ["Harmonious", "Complex", "Rough", "Elegant", "Powerful", "Thin"],
} as const;

export type DimKey = "nose" | "taste" | "finish" | "balance";

const DIM_KEYS: DimKey[] = ["nose", "taste", "finish", "balance"];

const DIM_COLORS: Record<DimKey, string> = {
  nose: "#D9A15B",
  taste: "#C97845",
  finish: "#9C6A5E",
  balance: "#7F8C5A",
};

const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

function chipStyle(selected: boolean, dimColor: string): React.CSSProperties {
  return {
    padding: "6px 14px",
    fontSize: 12,
    fontWeight: 500,
    borderRadius: 20,
    border: `1px solid ${selected ? dimColor : v.border}`,
    background: selected ? `${dimColor}24` : "transparent",
    color: selected ? dimColor : v.mutedLight,
    cursor: "pointer",
    fontFamily: "system-ui, sans-serif",
    transition: "all 0.15s",
    whiteSpace: "nowrap" as const,
  };
}

export interface M2RatingPanelProps {
  scores: Record<DimKey, number>;
  onScoreChange: (dim: DimKey, value: number) => void;
  chips: Record<DimKey, string[]>;
  onChipToggle: (dim: DimKey, chip: string) => void;
  texts: Record<DimKey, string>;
  onTextChange: (dim: DimKey, text: string) => void;
  overall: number;
  onOverallChange: (value: number) => void;
  overallAuto: number;
  overrideActive: boolean;
  onResetOverride: () => void;
  scale?: number;
  disabled?: boolean;
  showToggle?: boolean;
  defaultOpen?: boolean;
  compact?: boolean;
}

export default function M2RatingPanel({
  scores,
  onScoreChange,
  chips,
  onChipToggle,
  texts,
  onTextChange,
  overall,
  onOverallChange,
  overallAuto,
  overrideActive,
  onResetOverride,
  scale = 100,
  disabled = false,
  showToggle = false,
  defaultOpen = true,
  compact = false,
}: M2RatingPanelProps) {
  const { t, i18n } = useTranslation();

  const [showDetailed, setShowDetailed] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Record<DimKey, boolean>>({
    nose: defaultOpen,
    taste: false,
    finish: false,
    balance: false,
  });

  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceTarget, setVoiceTarget] = useState<DimKey | null>(null);
  const recognitionRef = useRef<any>(null);
  const hasSpeechAPI = !!SpeechRecognitionAPI;

  const stopVoice = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setVoiceListening(false);
    setVoiceTarget(null);
  }, []);

  const startVoice = useCallback((target: DimKey) => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (!SpeechRecognitionAPI) return;
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = i18n.language === "de" ? "de-DE" : "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }
      if (transcript) {
        onTextChange(target, (texts[target] ? texts[target] + " " : "") + transcript.trim());
      }
    };
    recognition.onerror = () => { setVoiceListening(false); setVoiceTarget(null); };
    recognition.onend = () => { setVoiceListening(false); setVoiceTarget(null); };
    recognitionRef.current = recognition;
    recognition.start();
    setVoiceListening(true);
    setVoiceTarget(target);
  }, [texts, onTextChange]);

  const toggleVoice = useCallback((target: DimKey) => {
    if (voiceListening && voiceTarget === target) {
      stopVoice();
    } else {
      startVoice(target);
    }
  }, [voiceListening, voiceTarget, stopVoice, startVoice]);

  const toggleModule = (dim: DimKey) => {
    setExpandedModules((prev) => ({ ...prev, [dim]: !prev[dim] }));
  };

  const detailTouched = DIM_KEYS.some((k) => scores[k] !== Math.round(scale / 2));

  const dimLabels: Record<DimKey, string> = {
    nose: t("m2.rating.nose", "Nose"),
    taste: t("m2.rating.taste", "Taste"),
    finish: t("m2.rating.finish", "Finish"),
    balance: t("m2.rating.balance", "Balance"),
  };

  const chipLabel = (attr: string) => t(`m2.chips.${attr}`, attr);

  const fontSize = compact ? { label: 11, chip: 11, score: 12, overall: 22, section: 10 } : { label: 13, chip: 12, score: 14, overall: 28, section: 12 };
  const spacing = compact ? { dimPad: "8px 0", chipGap: 4, chipPad: "4px 10px", textRows: 1, sliderMb: 8 } : { dimPad: "12px 0", chipGap: 6, chipPad: "6px 14px", textRows: 2, sliderMb: 14 };

  const inputBaseStyle: React.CSSProperties = {
    width: "100%",
    background: v.inputBg,
    border: `1px solid ${v.inputBorder}`,
    borderRadius: 10,
    color: v.inputText,
    padding: compact ? "6px 10px" : "10px 14px",
    fontSize: compact ? 12 : 14,
    fontFamily: "system-ui, sans-serif",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  const renderDimensions = () => (
    <div style={{ paddingTop: 8, marginTop: 4 }} data-testid="section-detailed-scoring">
      {DIM_KEYS.map((key) => {
        const attrs = ATTRIBUTES[key];
        const expanded = expandedModules[key];
        const dc = DIM_COLORS[key];
        return (
          <div key={key} style={{
            borderBottom: `1px solid ${v.border}`,
            borderLeft: `3px solid ${dc}`,
            marginLeft: -16,
            paddingLeft: 13,
            background: expanded ? `${dc}14` : "transparent",
            transition: "background 0.2s",
          }}>
            <button
              type="button"
              onClick={() => toggleModule(key)}
              data-testid={`button-expand-${key}`}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: spacing.dimPad,
                background: "none",
                border: "none",
                cursor: disabled ? "default" : "pointer",
                fontFamily: "system-ui, sans-serif",
                opacity: disabled ? 0.5 : 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: fontSize.label, fontWeight: 600, color: v.text }}>{dimLabels[key]}</span>
                {chips[key].length > 0 && (
                  <span style={{ fontSize: 10, color: dc, background: `${dc}26`, padding: "2px 8px", borderRadius: 10 }}>
                    {chips[key].length}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: fontSize.score, fontWeight: 600, color: dc, fontVariantNumeric: "tabular-nums", width: 24, textAlign: "right" as const }}>{scores[key]}</span>
                <ChevronDown style={{ width: 16, height: 16, color: v.mutedLight, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }} />
              </div>
            </button>

            {expanded && (
              <div style={{ paddingTop: compact ? 8 : 12, paddingBottom: compact ? 10 : 16 }}>
                <input
                  type="range"
                  min={0}
                  max={scale}
                  value={scores[key]}
                  onChange={(e) => onScoreChange(key, Number(e.target.value))}
                  disabled={disabled}
                  data-testid={`input-score-${key}`}
                  style={{ width: "100%", accentColor: dc, display: "block", marginBottom: spacing.sliderMb, cursor: disabled ? "not-allowed" : "pointer" }}
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.chipGap, marginBottom: compact ? 8 : 12 }} data-testid={`chips-${key}`}>
                  {attrs.map((attr) => {
                    const sel = chips[key].includes(attr);
                    return (
                      <button
                        key={attr}
                        type="button"
                        onClick={() => !disabled && onChipToggle(key, attr)}
                        data-testid={`chip-${key}-${attr.toLowerCase()}`}
                        style={{
                          ...chipStyle(sel, dc),
                          padding: spacing.chipPad,
                          fontSize: fontSize.chip,
                          opacity: disabled ? 0.5 : 1,
                          cursor: disabled ? "default" : "pointer",
                        }}
                      >
                        {chipLabel(attr)}
                      </button>
                    );
                  })}
                </div>
                <div style={{ position: "relative" }}>
                  <textarea
                    value={texts[key]}
                    onChange={(e) => onTextChange(key, e.target.value)}
                    placeholder={t("m2.rating.describePlaceholder", "Describe the {{dim}}...", { dim: dimLabels[key].toLowerCase() })}
                    rows={spacing.textRows}
                    disabled={disabled}
                    data-testid={`input-text-${key}`}
                    style={{
                      ...inputBaseStyle,
                      resize: "vertical" as const,
                      minHeight: compact ? 36 : 56,
                      paddingRight: hasSpeechAPI && !compact ? 40 : (compact ? 10 : 14),
                      borderColor: (voiceListening && voiceTarget === key) ? v.danger : v.inputBorder,
                      opacity: disabled ? 0.5 : 1,
                    }}
                  />
                  {hasSpeechAPI && !compact && (
                    <button
                      type="button"
                      onClick={() => !disabled && toggleVoice(key)}
                      data-testid={`button-voice-${key}`}
                      style={{
                        position: "absolute",
                        right: 8,
                        top: 8,
                        background: (voiceListening && voiceTarget === key) ? v.danger : "transparent",
                        border: "none",
                        borderRadius: "50%",
                        cursor: disabled ? "default" : "pointer",
                        width: 28,
                        height: 28,
                        padding: 0,
                        color: (voiceListening && voiceTarget === key) ? v.bg : v.mutedLight,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Mic style={{ width: 14, height: 14 }} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderOverall = () => (
    <div style={{ marginTop: showToggle && showDetailed ? 8 : 16 }}>
      {detailTouched && (
        <div style={{ marginBottom: compact ? 8 : 14, borderTop: `1px solid ${v.border}`, paddingTop: compact ? 8 : 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: fontSize.section, fontWeight: 600, color: v.mutedLight }}>{t("m2.rating.suggestedScore", "Suggested Score")}</span>
            <span style={{ fontSize: compact ? 16 : 22, fontWeight: 700, color: v.mutedLight, fontVariantNumeric: "tabular-nums", fontFamily: "'Playfair Display', serif" }} data-testid="text-suggested-score">
              {overallAuto}
            </span>
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: fontSize.section, fontWeight: 600, color: v.text }}>
          {t("m2.rating.overall", "Overall")}
          {overrideActive && (
            <span style={{ fontSize: 10, color: v.accent, background: alpha(v.accent, "15"), padding: "2px 8px", borderRadius: 20, marginLeft: 8 }} data-testid="badge-override">
              {t("m2.rating.manual", "Manual")}
            </span>
          )}
        </span>
        <span style={{ fontSize: fontSize.overall, fontWeight: 700, color: v.text, fontVariantNumeric: "tabular-nums", fontFamily: "'Playfair Display', serif" }} data-testid="text-score-value">
          {overall}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={scale}
        value={overall}
        onChange={(e) => onOverallChange(Number(e.target.value))}
        disabled={disabled}
        data-testid="m2-rating-overall"
        style={{ width: "100%", accentColor: v.accent, display: "block", cursor: disabled ? "not-allowed" : "pointer" }}
      />
      {overrideActive && (
        <button
          type="button"
          onClick={onResetOverride}
          data-testid="button-reset-override"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: v.accent,
            fontSize: 11,
            fontFamily: "system-ui, sans-serif",
            padding: "6px 0 0",
            textDecoration: "underline",
            display: "block",
            margin: "0 auto",
          }}
        >
          {t("m2.rating.resetToCalc", "Reset to calculated")}
        </button>
      )}
    </div>
  );

  return (
    <div data-testid="m2-rating-panel">
      {showToggle && (
        <button
          type="button"
          onClick={() => setShowDetailed(!showDetailed)}
          data-testid="button-toggle-detailed"
          style={{
            width: "100%",
            background: showDetailed ? alpha(v.accent, "10") : v.inputBg,
            border: `1px solid ${showDetailed ? v.accent : v.inputBorder}`,
            borderRadius: 12,
            cursor: "pointer",
            color: v.text,
            fontSize: 13,
            fontFamily: "system-ui, sans-serif",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            textAlign: "left" as const,
          }}
        >
          <span style={{ fontWeight: 600 }}>{t("m2.rating.rateDetail", "Rate in detail")}</span>
          <ChevronDown style={{ width: 16, height: 16, color: v.accent, transition: "transform 0.2s", transform: showDetailed ? "rotate(180deg)" : "rotate(0deg)" }} />
        </button>
      )}

      {(!showToggle || showDetailed) && renderDimensions()}
      {renderOverall()}
    </div>
  );
}

import { useState, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Mic, Plus } from "lucide-react";
import { FLAVOR_CATEGORIES, type FlavorCategory } from "@/labs/data/flavor-data";

export type DimKey = "nose" | "taste" | "finish" | "balance";

const LEGACY_CHIP_MAP: Record<string, string> = {
  "Peaty": "Peat",
  "Smoky": "Campfire",
  "Salty": "Sea Salt",
  "Nutty": "Walnut",
  "Malty": "Cereal",
  "Woody": "Oak",
  "Fruity": "Apple",
  "Floral": "Rose",
  "Spicy": "Pepper",
  "Sweet": "Honey",
};

function normalizeLegacyChip(chip: string): string {
  return LEGACY_CHIP_MAP[chip] || chip;
}


const DIM_KEYS: DimKey[] = ["nose", "taste", "finish", "balance"];

const DIM_COLORS: Record<DimKey, string> = {
  nose: "var(--labs-dim-nose)",
  taste: "var(--labs-dim-taste)",
  finish: "var(--labs-dim-finish)",
  balance: "var(--labs-dim-balance)",
};

const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export interface LabsRatingPanelProps {
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

export default function LabsRatingPanel({
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
}: LabsRatingPanelProps) {
  const { t, i18n } = useTranslation();

  const [showDetailed, setShowDetailed] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<DimKey>("nose");
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [showFlavors, setShowFlavors] = useState(false);
  const isDE = i18n.language === "de";
  const [customInput, setCustomInput] = useState("");

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

  const toggleCat = (catId: string) => {
    setExpandedCats((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const addCustomTag = () => {
    const tag = customInput.trim();
    if (!tag) return;
    if (!chips[activeTab].some((c) => c.toLowerCase() === tag.toLowerCase())) {
      onChipToggle(activeTab, tag);
    }
    setCustomInput("");
  };

  const detailTouched = DIM_KEYS.some((k) => scores[k] !== Math.round(scale / 2));

  const dimLabels: Record<DimKey, string> = {
    nose: t("m2.rating.nose", "Nose"),
    taste: t("m2.rating.taste", "Taste"),
    finish: t("m2.rating.finish", "Finish"),
    balance: t("m2.rating.balance", "Balance"),
  };

  const activeChips = chips[activeTab];

  const normalizedActiveSet = useMemo(() => {
    return new Set(activeChips.map((c) => normalizeLegacyChip(c).toLowerCase()));
  }, [activeChips]);

  const isChipSelected = useCallback((subEn: string) => {
    return normalizedActiveSet.has(subEn.toLowerCase());
  }, [normalizedActiveSet]);

  const renderTabBar = () => (
    <div style={{ display: "flex", gap: 0, marginBottom: 16, borderRadius: 8, overflow: "hidden", border: "1px solid var(--labs-border)" }} data-testid="rating-tab-bar">
      {DIM_KEYS.map((key) => {
        const isActive = activeTab === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => { if (disabled) return; setActiveTab(key); setExpandedCats({}); setCustomInput(""); }}
            data-testid={`tab-${key}`}
            style={{
              flex: 1,
              padding: compact ? "7px 0" : "10px 0",
              background: isActive ? "var(--labs-accent)" : "transparent",
              border: "none",
              color: isActive ? "var(--labs-bg)" : "var(--labs-text-muted)",
              fontSize: compact ? 12 : 13,
              fontWeight: isActive ? 700 : 500,
              fontFamily: "inherit",
              cursor: disabled ? "default" : "pointer",
              transition: "all 0.15s",
              opacity: disabled ? 0.5 : 1,
              borderRight: key !== "balance" ? "1px solid var(--labs-border)" : "none",
            }}
          >
            {dimLabels[key]}
          </button>
        );
      })}
    </div>
  );

  const renderSliderWithMarkers = (key: DimKey) => {
    const dc = DIM_COLORS[key];
    return (
      <div style={{ marginBottom: compact ? 10 : 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: compact ? 14 : 16, fontWeight: 600, color: "var(--labs-text)" }}>{dimLabels[key]}</span>
          <span className="labs-serif" style={{ fontSize: compact ? 22 : 28, fontWeight: 700, color: "var(--labs-text)", fontVariantNumeric: "tabular-nums" }} data-testid={`text-score-${key}`}>
            {scores[key]}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={scale}
          value={scores[key]}
          onChange={(e) => onScoreChange(key, Number(e.target.value))}
          disabled={disabled}
          data-testid={`input-score-${key}`}
          style={{ width: "100%", accentColor: dc, display: "block", cursor: disabled ? "not-allowed" : "pointer" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
          <span style={{ fontSize: 10, color: "var(--labs-text-muted)" }}>0</span>
          <span style={{ fontSize: 10, color: "var(--labs-text-muted)" }}>{Math.round(scale / 2)}</span>
          <span style={{ fontSize: 10, color: "var(--labs-text-muted)" }}>{scale}</span>
        </div>
      </div>
    );
  };

  const renderFlavorCategories = () => {
    const categories: FlavorCategory[] = FLAVOR_CATEGORIES;
    return (
      <div style={{ marginBottom: compact ? 8 : 14 }}>
        <button
          type="button"
          onClick={() => {
            if (disabled) return;
            setShowFlavors((prev) => !prev);
            if (showFlavors) setExpandedCats({});
          }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: disabled ? "default" : "pointer",
            color: "var(--labs-text-muted)", fontSize: 12, fontFamily: "inherit",
            opacity: disabled ? 0.5 : 1,
            padding: "4px 0", marginBottom: 6,
          }}
          data-testid="button-toggle-flavors"
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            {showFlavors ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
            {t("m2.rating.addFlavors", "Add flavors")}
          </span>
          {activeChips.length > 0 && (
            <span style={{ fontSize: 10, background: "var(--labs-accent-muted)", color: "var(--labs-accent)", padding: "1px 7px", borderRadius: 10, fontWeight: 600 }}>
              {activeChips.length}
            </span>
          )}
        </button>

        {activeChips.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }} data-testid={`selected-chips-${activeTab}`}>
            {activeChips.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => !disabled && onChipToggle(activeTab, tag)}
                data-testid={`chip-selected-${tag.toLowerCase().replace(/\s+/g, "-")}`}
                style={{
                  padding: "3px 10px",
                  borderRadius: 9999,
                  fontSize: 11,
                  fontWeight: 500,
                  fontFamily: "inherit",
                  cursor: disabled ? "default" : "pointer",
                  border: "none",
                  background: "var(--labs-accent)",
                  color: "var(--labs-bg)",
                  transition: "all 150ms",
                  display: "flex", alignItems: "center", gap: 4,
                }}
              >
                {tag}
                <span style={{ fontSize: 10, opacity: 0.7 }}>×</span>
              </button>
            ))}
          </div>
        )}

        {showFlavors && (
        <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--labs-border-subtle)" }}>
          {categories.map((cat) => {
            const isExpanded = expandedCats[cat.id] || false;
            const catTagCount = cat.subcategories.filter((sub) =>
              isChipSelected(sub.en)
            ).length;

            return (
              <div key={cat.id} style={{ borderBottom: "1px solid var(--labs-border-subtle)" }}>
                <button
                  type="button"
                  onClick={() => !disabled && toggleCat(cat.id)}
                  data-testid={`cat-toggle-${cat.id}`}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: compact ? "8px 10px" : "10px 12px",
                    background: "none",
                    border: "none",
                    cursor: disabled ? "default" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: cat.color, flexShrink: 0 }} />
                    <span style={{ fontSize: compact ? 12 : 13, fontWeight: 500, color: "var(--labs-text)" }}>{isDE ? cat.de : cat.en}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {catTagCount > 0 && (
                      <span style={{
                        fontSize: 10, padding: "1px 7px", borderRadius: 10,
                        background: `${cat.color}26`, color: cat.color, fontWeight: 600,
                      }}>
                        {catTagCount}
                      </span>
                    )}
                    {isExpanded
                      ? <ChevronUp style={{ width: 14, height: 14, color: "var(--labs-text-muted)" }} />
                      : <ChevronDown style={{ width: 14, height: 14, color: "var(--labs-text-muted)" }} />}
                  </div>
                </button>

                {isExpanded && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: "8px 10px" }}>
                    {cat.subcategories.map((sub) => {
                      const isSelected = isChipSelected(sub.en);
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            if (disabled) return;
                            if (isSelected) {
                              const legacyMatch = activeChips.find((c) => normalizeLegacyChip(c).toLowerCase() === sub.en.toLowerCase());
                              onChipToggle(activeTab, legacyMatch || sub.en);
                            } else {
                              onChipToggle(activeTab, sub.en);
                            }
                          }}
                          data-testid={`flavor-tag-${activeTab}-${sub.id}`}
                          style={{
                            padding: compact ? "3px 8px" : "4px 10px",
                            borderRadius: 9999,
                            fontSize: compact ? 10 : 11,
                            fontWeight: 500,
                            fontFamily: "inherit",
                            cursor: disabled ? "default" : "pointer",
                            border: isSelected ? "none" : `1px solid ${cat.color}44`,
                            background: isSelected ? cat.color : `${cat.color}18`,
                            color: isSelected ? "var(--labs-bg)" : "var(--labs-text)",
                            transition: "all 150ms",
                          }}
                        >
                          {isDE ? sub.de : sub.en}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <input
            className="labs-input"
            placeholder={t("m2.rating.customDescriptor", "Custom descriptor...")}
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }}
            disabled={disabled}
            style={{ flex: 1, fontSize: 12, padding: "6px 10px" }}
            data-testid={`custom-input-${activeTab}`}
          />
          <button
            type="button"
            onClick={addCustomTag}
            disabled={!customInput.trim() || disabled}
            data-testid={`custom-add-${activeTab}`}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 32, height: 32, borderRadius: 8,
              border: "1px solid var(--labs-border)",
              background: customInput.trim() ? "var(--labs-accent)" : "var(--labs-surface)",
              color: customInput.trim() ? "var(--labs-bg)" : "var(--labs-text-muted)",
              cursor: customInput.trim() && !disabled ? "pointer" : "default",
              fontFamily: "inherit",
            }}
          >
            <Plus style={{ width: 16, height: 16 }} />
          </button>
        </div>
        )}
      </div>
    );
  };

  const renderTextArea = (key: DimKey) => (
    <div style={{ position: "relative", marginTop: compact ? 4 : 8 }}>
      <textarea
        value={texts[key]}
        onChange={(e) => onTextChange(key, e.target.value)}
        placeholder={t("m2.rating.describePlaceholder", "Describe the {{dim}}...", { dim: dimLabels[key].toLowerCase() })}
        rows={compact ? 1 : 2}
        disabled={disabled}
        data-testid={`input-text-${key}`}
        className="labs-input"
        style={{
          resize: "vertical" as const,
          minHeight: compact ? 36 : 56,
          paddingRight: hasSpeechAPI && !compact ? 44 : (compact ? 10 : 14),
          borderColor: (voiceListening && voiceTarget === key) ? "var(--labs-danger)" : undefined,
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
            background: (voiceListening && voiceTarget === key) ? "var(--labs-danger)" : "var(--labs-accent-muted)",
            border: `1px solid ${(voiceListening && voiceTarget === key) ? "var(--labs-danger)" : "color-mix(in srgb, var(--labs-accent) 42%, transparent)"}`,
            borderRadius: 999,
            cursor: disabled ? "default" : "pointer",
            width: 30,
            height: 30,
            padding: 0,
            color: (voiceListening && voiceTarget === key) ? "var(--labs-bg)" : "var(--labs-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: (voiceListening && voiceTarget === key) ? "0 0 0 4px color-mix(in srgb, var(--labs-danger) 25%, transparent)" : "0 2px 8px rgba(0,0,0,0.22)",
            transition: "all 200ms ease",
          }}
        >
          <Mic style={{ width: 14, height: 14 }} />
        </button>
      )}
    </div>
  );

  const renderActiveTabContent = () => (
    <div style={{
      padding: compact ? 12 : 16,
      background: "var(--labs-surface-alt, rgba(255,255,255,0.03))",
      borderRadius: 10,
      border: "1px solid var(--labs-border-subtle)",
    }} data-testid="section-detailed-scoring">
      {renderSliderWithMarkers(activeTab)}
      {renderFlavorCategories()}
      {renderTextArea(activeTab)}
    </div>
  );

  const renderOverall = () => (
    <div style={{ marginTop: showToggle && showDetailed ? 8 : 16 }}>
      {detailTouched && (
        <div style={{ marginBottom: compact ? 8 : 14, borderTop: "1px solid var(--labs-border-subtle)", paddingTop: compact ? 8 : 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: compact ? 10 : 12, fontWeight: 600, color: "var(--labs-text-muted)" }}>{t("m2.rating.suggestedScore", "Suggested Score")}</span>
            <span className="labs-serif" style={{ fontSize: compact ? 16 : 22, fontWeight: 700, color: "var(--labs-text-muted)", fontVariantNumeric: "tabular-nums" }} data-testid="text-suggested-score">
              {overallAuto}
            </span>
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: compact ? 10 : 12, fontWeight: 600, color: "var(--labs-text)" }}>
          {t("m2.rating.overall", "Overall")}
          {overrideActive && (
            <span className="labs-badge labs-badge-accent" style={{ marginLeft: 8, fontSize: 10 }} data-testid="badge-override">
              {t("m2.rating.manual", "Manual")}
            </span>
          )}
        </span>
        <span className="labs-serif" style={{ fontSize: compact ? 18 : 28, fontWeight: 700, color: "var(--labs-text)", fontVariantNumeric: "tabular-nums" }} data-testid="text-score-value">
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
        style={{ width: "100%", accentColor: "var(--labs-accent)", display: "block", cursor: disabled ? "not-allowed" : "pointer" }}
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
            color: "var(--labs-accent)",
            fontSize: 11,
            fontFamily: "inherit",
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
    <div data-testid="labs-rating-panel">
      {showToggle && (
        <button
          type="button"
          onClick={() => setShowDetailed(!showDetailed)}
          data-testid="button-toggle-detailed"
          style={{
            width: "100%",
            background: showDetailed ? "var(--labs-accent-muted)" : "var(--labs-surface)",
            border: `1px solid ${showDetailed ? "var(--labs-accent)" : "var(--labs-border)"}`,
            borderRadius: "var(--labs-radius-sm)",
            cursor: "pointer",
            color: "var(--labs-text)",
            fontSize: 13,
            fontFamily: "inherit",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            textAlign: "left" as const,
          }}
        >
          <span style={{ fontWeight: 600 }}>{t("m2.rating.rateDetail", "Rate in detail")}</span>
          <ChevronDown style={{ width: 16, height: 16, color: "var(--labs-accent)", transition: "transform 0.2s", transform: showDetailed ? "rotate(180deg)" : "rotate(0deg)" }} />
        </button>
      )}

      {(!showToggle || showDetailed) && (
        <div style={{ paddingTop: 8, marginTop: 4 }}>
          {renderTabBar()}
          {renderActiveTabContent()}
        </div>
      )}
      {renderOverall()}
    </div>
  );
}

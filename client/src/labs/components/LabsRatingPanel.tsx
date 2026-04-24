import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Mic, Plus, Lock, Sparkles } from "lucide-react";
import { FLAVOR_CATEGORIES, type FlavorCategory } from "@/labs/data/flavor-data";
import { triggerHaptic } from "@/labs/hooks/useHaptic";
import { buildScale } from "@/labs/hooks/useRatingScale";
import ScaleBadge from "./ScaleBadge";
import FlavourStudioSheet from "./FlavourStudioSheet";

export type DimKey = "nose" | "taste" | "finish";
export type TabKey = DimKey | "overall";

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


const DIM_KEYS: DimKey[] = ["nose", "taste", "finish"];

const DIM_COLORS: Record<DimKey, string> = {
  nose: "var(--labs-dim-nose)",
  taste: "var(--labs-dim-taste)",
  finish: "var(--labs-dim-finish)",
};

const DIM_HINTS: Record<DimKey, { en: string; de: string }> = {
  nose: { en: "How does the whisky smell?", de: "Wie riecht der Whisky?" },
  taste: { en: "How does it taste on your palate?", de: "Wie schmeckt er am Gaumen?" },
  finish: { en: "How is the finish?", de: "Wie ist der Abgang?" },
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
  wizard?: boolean;
  onActiveTabChange?: (dim: DimKey) => void;
  onDetailedToggle?: (open: boolean) => void;
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
  wizard = false,
  onActiveTabChange,
  onDetailedToggle,
}: LabsRatingPanelProps) {
  const { t, i18n } = useTranslation();
  const scaleInfo = useMemo(() => buildScale(scale), [scale]);

  const [showDetailed, setShowDetailed] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<TabKey>("nose");
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [showFlavors, setShowFlavors] = useState(false);
  const isDE = i18n.language === "de";
  const [customInput, setCustomInput] = useState("");

  const [wizardStep, setWizardStep] = useState(0);
  const [wizardRevealed, setWizardRevealed] = useState(false);
  const [wizardTransition, setWizardTransition] = useState(false);
  const wizardContentRef = useRef<HTMLDivElement>(null);

  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceTarget, setVoiceTarget] = useState<DimKey | null>(null);
  const recognitionRef = useRef<any>(null);
  const hasSpeechAPI = !!SpeechRecognitionAPI;
  const prevSliderVals = useRef<Record<string, number>>({});
  const [studioOpen, setStudioOpen] = useState(false);

  const totalWizardSteps = 4;
  const isWizardOverallStep = wizardStep === 3;

  useEffect(() => {
    if (wizard && wizardStep < 3) {
      setActiveTab(DIM_KEYS[wizardStep]);
      setExpandedCats({});
      setShowFlavors(false);
      setCustomInput("");
      onActiveTabChange?.(DIM_KEYS[wizardStep]);
    }
  }, [wizard, wizardStep, onActiveTabChange]);

  const wizardNavigate = useCallback((dir: "next" | "prev") => {
    setWizardTransition(true);
    setTimeout(() => {
      if (dir === "next" && wizardStep < 3) {
        setWizardStep(wizardStep + 1);
        if (wizardStep + 1 === 3) {
          setWizardRevealed(false);
          setTimeout(() => setWizardRevealed(true), 300);
        }
      } else if (dir === "prev" && wizardStep > 0) {
        setWizardStep(wizardStep - 1);
      }
      setWizardTransition(false);
    }, 150);
  }, [wizardStep]);

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
    if (activeTab === "overall") return;
    const tag = customInput.trim();
    if (!tag) return;
    if (!chips[activeTab].some((c) => c.toLowerCase() === tag.toLowerCase())) {
      onChipToggle(activeTab, tag);
    }
    setCustomInput("");
  };

  const detailTouched = DIM_KEYS.some((k) => scores[k] > 0);

  const dimLabels: Record<DimKey, string> = {
    nose: t("m2.rating.nose", "Nose"),
    taste: t("m2.rating.taste", "Taste"),
    finish: t("m2.rating.finish", "Finish"),
  };

  const activeChips = activeTab !== "overall" ? chips[activeTab] : [];

  const normalizedActiveSet = useMemo(() => {
    return new Set(activeChips.map((c) => normalizeLegacyChip(c).toLowerCase()));
  }, [activeChips]);

  const isChipSelected = useCallback((subEn: string) => {
    return normalizedActiveSet.has(subEn.toLowerCase());
  }, [normalizedActiveSet]);

  const missingDims = DIM_KEYS.filter((k) => scores[k] <= 0);
  const allDimsScored = missingDims.length === 0;
  const overallGated = !allDimsScored;

  const ALL_TABS: TabKey[] = [...DIM_KEYS, "overall"];
  const overallTabLabel = t("m2.rating.overall", "Overall");

  const renderTabBar = () => (
    <div style={{ display: "flex", gap: 0, marginBottom: 16, borderRadius: 8, overflow: "hidden", border: "1px solid var(--labs-border)" }} data-testid="rating-tab-bar">
      {ALL_TABS.map((key) => {
        const isActive = activeTab === key;
        const isOverall = key === "overall";
        const tabDisabled = disabled || (isOverall && overallGated);
        return (
          <button
            key={key}
            type="button"
            onClick={() => {
              if (tabDisabled) return;
              setActiveTab(key);
              setExpandedCats({});
              setCustomInput("");
            }}
            data-testid={`tab-${key}`}
            style={{
              flex: 1,
              padding: compact ? "7px 0" : "10px 0",
              background: isActive ? "var(--labs-accent)" : "transparent",
              border: "none",
              color: isActive ? "var(--labs-bg)" : "var(--labs-text-secondary)",
              fontSize: compact ? 11 : 12,
              fontWeight: isActive ? 700 : 500,
              fontFamily: "inherit",
              cursor: tabDisabled ? "default" : "pointer",
              transition: "all 0.15s",
              opacity: tabDisabled && !isActive ? 0.35 : 1,
              borderRight: key !== "overall" ? "1px solid var(--labs-border)" : "none",
            }}
          >
            {isOverall ? overallTabLabel : dimLabels[key]}
          </button>
        );
      })}
    </div>
  );

  const sliderMin = scaleInfo.max === 100 ? 60 : 0;
  const sliderMax = scaleInfo.max;
  const sliderTickLow = sliderMin;
  const sliderTickMid = scaleInfo.max === 100 ? 80 : Math.round((scaleInfo.max / 2) * 10) / 10;
  const sliderTickHigh = sliderMax;
  const fmtScore = (v: number): string => {
    if (scaleInfo.max === 100) return String(v);
    return v % 1 === 0 ? String(v) : v.toFixed(1);
  };

  const renderSliderWithMarkers = (key: DimKey) => {
    const dc = DIM_COLORS[key];
    return (
      <div style={{ marginBottom: compact ? 10 : 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: compact ? 14 : 16, fontWeight: 600, color: "var(--labs-text)" }}>{dimLabels[key]}</span>
          <span className="labs-serif" style={{ fontSize: compact ? 22 : 28, fontWeight: 700, color: "var(--labs-text)", fontVariantNumeric: "tabular-nums" }} data-testid={`text-score-${key}`}>
            {fmtScore(scores[key])}
          </span>
        </div>
        <input
          type="range"
          min={sliderMin}
          max={sliderMax}
          step={scaleInfo.step}
          value={scores[key]}
          onChange={(e) => {
            const val = Number(e.target.value);
            const prev = prevSliderVals.current[key];
            if ((val === sliderMin || val === sliderMax) && prev !== val) {
              triggerHaptic("boundary");
            }
            prevSliderVals.current[key] = val;
            onScoreChange(key, val);
          }}
          disabled={disabled}
          data-testid={`input-score-${key}`}
          style={{ width: "100%", accentColor: dc, display: "block", cursor: disabled ? "not-allowed" : "pointer" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
          <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{fmtScore(sliderTickLow)}</span>
          <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{fmtScore(sliderTickMid)}</span>
          <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{fmtScore(sliderTickHigh)}</span>
        </div>
      </div>
    );
  };

  const handleStudioChipsChange = useCallback((newChips: string[]) => {
    if (activeTab === "overall") return;
    const currentChips = chips[activeTab] || [];
    const currentSet = new Set(currentChips.map((c) => c.toLowerCase()));
    const newSet = new Set(newChips.map((c) => c.toLowerCase()));
    for (const chip of currentChips) {
      if (!newSet.has(chip.toLowerCase())) {
        onChipToggle(activeTab, chip);
      }
    }
    for (const chip of newChips) {
      if (!currentSet.has(chip.toLowerCase())) {
        onChipToggle(activeTab, chip);
      }
    }
  }, [activeTab, chips, onChipToggle]);

  const renderFlavorCategories = () => {
    const categories: FlavorCategory[] = FLAVOR_CATEGORIES;
    return (
      <div style={{ marginBottom: compact ? 8 : 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          {(
            <button
              type="button"
              onClick={() => {
                if (disabled) return;
                setStudioOpen(true);
                triggerHaptic("light");
              }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "linear-gradient(135deg, var(--labs-accent), color-mix(in srgb, var(--labs-accent) 80%, var(--labs-surface)))",
                border: "1px solid var(--labs-accent)",
                borderRadius: 12, cursor: disabled ? "default" : "pointer",
                color: "var(--labs-bg)", fontSize: 13, fontFamily: "inherit",
                fontWeight: 700, opacity: disabled ? 0.5 : 1,
                padding: "10px 16px",
                transition: "all 0.2s ease",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
              data-testid="button-open-flavour-studio"
            >
              <Sparkles style={{ width: 16, height: 16 }} />
              {t("m2.rating.flavourStudio", "Flavour Studio")}
              {activeChips.length > 0 && (
                <span style={{ fontSize: 11, background: "var(--labs-bg)", color: "var(--labs-accent)", padding: "2px 8px", borderRadius: 10, fontWeight: 700, marginLeft: 2 }}>
                  {activeChips.length}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (disabled) return;
              setShowFlavors((prev) => !prev);
              if (showFlavors) setExpandedCats({});
            }}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "none", border: "none", cursor: disabled ? "default" : "pointer",
              color: "var(--labs-text-secondary)", fontSize: 11, fontFamily: "inherit",
              opacity: disabled ? 0.5 : 1, padding: "4px 0",
            }}
            data-testid="button-toggle-flavors"
          >
            {showFlavors ? <ChevronUp style={{ width: 13, height: 13 }} /> : <ChevronDown style={{ width: 13, height: 13 }} />}
            {t("m2.rating.quickList", "List")}
          </button>
        </div>

        {activeChips.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }} data-testid={`selected-chips-${activeTab}`}>
            {activeChips.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => !disabled && onChipToggle(activeTab as DimKey, tag)}
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
                <span style={{ fontSize: 11, opacity: 0.75 }}>×</span>
              </button>
            ))}
          </div>
        )}

        {showFlavors && (<>
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
                        fontSize: 11, padding: "1px 7px", borderRadius: 10,
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
                              onChipToggle(activeTab as DimKey, legacyMatch || sub.en);
                            } else {
                              onChipToggle(activeTab as DimKey, sub.en);
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
        </>)}
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

  const renderActiveTabContent = () => {
    if (activeTab === "overall") {
      return (
        <div style={{
          padding: compact ? 12 : 16,
          background: "var(--labs-surface-alt, rgba(255,255,255,0.03))",
          borderRadius: 10,
          border: "1px solid var(--labs-border-subtle)",
        }} data-testid="section-overall-tab">
          <div style={{
            display: "flex",
            justifyContent: "space-around",
            marginBottom: 16,
            paddingBottom: 14,
            borderBottom: "1px solid var(--labs-border-subtle)",
          }}>
            {DIM_KEYS.map((k) => (
              <div key={k} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--labs-text-muted)", marginBottom: 4 }}>
                  {dimLabels[k]}
                </div>
                <div
                  className="labs-serif tabular-nums"
                  style={{ fontSize: compact ? 18 : 22, fontWeight: 700, color: DIM_COLORS[k] }}
                  data-testid={`overall-tab-dim-${k}`}
                >
                  {fmtScore(scores[k])}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: compact ? 4 : 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: compact ? 10 : 12, fontWeight: 600, color: "var(--labs-text)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                {t("m2.rating.overall", "Overall")}
                {scale !== 100 && <ScaleBadge max={scaleInfo.max} />}
                {overrideActive && !overallGated && (
                  <span className="labs-badge labs-badge-accent" style={{ marginLeft: 2 }} data-testid="badge-override">
                    {t("m2.rating.manual", "Manual")}
                  </span>
                )}
              </span>
              <span className="labs-serif" style={{ fontSize: compact ? 18 : 28, fontWeight: 700, color: "var(--labs-text)", fontVariantNumeric: "tabular-nums" }} data-testid="text-score-value">
                {fmtScore(overall)}
              </span>
            </div>
            <input
              type="range"
              min={sliderMin}
              max={sliderMax}
              step={scaleInfo.step}
              value={overall}
              onChange={(e) => {
                const val = Number(e.target.value);
                const prev = prevSliderVals.current["overall"];
                if ((val === sliderMin || val === sliderMax) && prev !== val) {
                  triggerHaptic("boundary");
                }
                prevSliderVals.current["overall"] = val;
                onOverallChange(val);
              }}
              disabled={disabled || overallGated}
              data-testid="m2-rating-overall"
              style={{ width: "100%", accentColor: "var(--labs-accent)", display: "block", cursor: (disabled || overallGated) ? "not-allowed" : "pointer", opacity: overallGated ? 0.35 : 1, transition: "opacity 0.2s" }}
            />
            {overrideActive && !overallGated && (
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
        </div>
      );
    }
    return (
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
  };

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

      {overallGated && (
        <div
          data-testid="overall-gated-message"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: compact ? "10px 12px" : "12px 14px",
            background: "var(--labs-surface-alt, rgba(255,255,255,0.03))",
            border: "1px solid var(--labs-border-subtle)",
            borderRadius: 10,
            marginBottom: 8,
          }}
        >
          <Lock style={{ width: 16, height: 16, color: "var(--labs-text-muted)", flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: compact ? 11 : 12, fontWeight: 600, color: "var(--labs-text-muted)", display: "block", marginBottom: 4 }}>
              {t("m2.rating.overallLocked", "Rate each dimension to unlock Overall")}
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {missingDims.map((dim) => (
                <button
                  key={dim}
                  type="button"
                  onClick={() => {
                    if (wizard) {
                      setWizardStep(DIM_KEYS.indexOf(dim));
                    } else {
                      setActiveTab(dim);
                    }
                  }}
                  data-testid={`gated-dim-${dim}`}
                  style={{
                    padding: "2px 10px",
                    borderRadius: 9999,
                    fontSize: 11,
                    fontWeight: 500,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    border: "1px solid var(--labs-border)",
                    background: "var(--labs-surface)",
                    color: DIM_COLORS[dim],
                    transition: "all 150ms",
                  }}
                >
                  {dimLabels[dim]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, opacity: overallGated ? 0.35 : 1, transition: "opacity 0.2s" }}>
        <span style={{ fontSize: compact ? 10 : 12, fontWeight: 600, color: "var(--labs-text)", display: "inline-flex", alignItems: "center", gap: 6 }}>
          {t("m2.rating.overall", "Overall")}
          {scale !== 100 && <ScaleBadge max={scaleInfo.max} />}
          {overrideActive && !overallGated && (
            <span className="labs-badge labs-badge-accent" style={{ marginLeft: 2 }} data-testid="badge-override">
              {t("m2.rating.manual", "Manual")}
            </span>
          )}
        </span>
        <span className="labs-serif" style={{ fontSize: compact ? 18 : 28, fontWeight: 700, color: "var(--labs-text)", fontVariantNumeric: "tabular-nums" }} data-testid="text-score-value">
          {fmtScore(overall)}
        </span>
      </div>
      <input
        type="range"
        min={sliderMin}
        max={sliderMax}
        step={scaleInfo.step}
        value={overall}
        onChange={(e) => {
          const val = Number(e.target.value);
          const prev = prevSliderVals.current["overall"];
          if ((val === sliderMin || val === sliderMax) && prev !== val) {
            triggerHaptic("boundary");
          }
          prevSliderVals.current["overall"] = val;
          onOverallChange(val);
        }}
        disabled={disabled || overallGated}
        data-testid="m2-rating-overall"
        style={{ width: "100%", accentColor: "var(--labs-accent)", display: "block", cursor: (disabled || overallGated) ? "not-allowed" : "pointer", opacity: overallGated ? 0.35 : 1, transition: "opacity 0.2s" }}
      />
      {overrideActive && !overallGated && (
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

  const renderWizardProgressDots = () => (
    <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 20 }} data-testid="wizard-progress">
      {Array.from({ length: totalWizardSteps }).map((_, i) => {
        const isActive = i === wizardStep;
        const isCompleted = i < 3 ? scores[DIM_KEYS[i]] > 0 : !overallGated;
        const dimColor = i < 3 ? DIM_COLORS[DIM_KEYS[i]] : "var(--labs-accent)";
        return (
          <button
            key={i}
            type="button"
            onClick={() => {
              if (!disabled) {
                setWizardTransition(true);
                setTimeout(() => {
                  setWizardStep(i);
                  if (i === 4 && !wizardRevealed) {
                    setTimeout(() => setWizardRevealed(true), 300);
                  }
                  setWizardTransition(false);
                }, 150);
              }
            }}
            data-testid={`wizard-dot-${i}`}
            style={{
              width: isActive ? 28 : 10,
              height: 10,
              borderRadius: 5,
              border: "none",
              background: isActive ? dimColor : isCompleted ? dimColor : "var(--labs-border)",
              opacity: isActive ? 1 : isCompleted ? 0.5 : 0.25,
              cursor: disabled ? "default" : "pointer",
              transition: "all 250ms cubic-bezier(0.2, 0.8, 0.4, 1)",
              padding: 0,
            }}
          />
        );
      })}
    </div>
  );

  const renderWizardStepHeader = () => {
    if (isWizardOverallStep) return null;
    const currentDim = DIM_KEYS[wizardStep];
    const dimColor = DIM_COLORS[currentDim];
    const hint = DIM_HINTS[currentDim];
    return (
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div
          className="labs-h2"
          style={{ color: dimColor, marginBottom: 6, letterSpacing: "0.04em" }}
          data-testid="wizard-step-title"
        >
          {dimLabels[currentDim]}
        </div>
        <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: 0 }} data-testid="wizard-step-hint">
          {isDE ? hint.de : hint.en}
        </p>
      </div>
    );
  };

  const renderWizardOverallReveal = () => {
    const scoreCircleSize = 120;
    const circumference = 2 * Math.PI * 52;
    const progress = allDimsScored ? (overall / scale) : 0;
    const offset = circumference * (1 - progress);

    return (
      <div style={{ textAlign: "center", paddingTop: 8 }} data-testid="wizard-overall-reveal">
        <div
          className="labs-h2"
          style={{ color: "var(--labs-text)", marginBottom: 16 }}
        >
          {t("m2.rating.overall", "Overall")}
        </div>

        {allDimsScored && wizardRevealed && (
          <div style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 20,
            animation: "labsFadeIn 600ms cubic-bezier(0.2, 0.8, 0.4, 1) both",
          }}>
            <div style={{ position: "relative", width: scoreCircleSize, height: scoreCircleSize }}>
              <svg width={scoreCircleSize} height={scoreCircleSize} style={{ transform: "rotate(-90deg)" }}>
                <circle
                  cx={scoreCircleSize / 2}
                  cy={scoreCircleSize / 2}
                  r={52}
                  fill="none"
                  stroke="var(--labs-border)"
                  strokeWidth={6}
                />
                <circle
                  cx={scoreCircleSize / 2}
                  cy={scoreCircleSize / 2}
                  r={52}
                  fill="none"
                  stroke="var(--labs-accent)"
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  style={{
                    transition: "stroke-dashoffset 800ms cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                />
              </svg>
              <div style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <span
                  className="labs-serif"
                  style={{
                    fontSize: 36,
                    fontWeight: 700,
                    color: "var(--labs-text)",
                    fontVariantNumeric: "tabular-nums",
                    animation: "labsFadeIn 500ms cubic-bezier(0.2, 0.8, 0.4, 1) both",
                    animationDelay: "400ms",
                  }}
                  data-testid="wizard-overall-score"
                >
                  {overall}
                </span>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 16 }}>
          {DIM_KEYS.map((k) => (
            <div key={k} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginBottom: 2 }}>{dimLabels[k]}</div>
              <div className="labs-serif" style={{ fontSize: 18, fontWeight: 700, color: DIM_COLORS[k] }}>{fmtScore(scores[k])}</div>
            </div>
          ))}
        </div>

        {renderOverall()}
      </div>
    );
  };

  const renderWizardNavigation = () => {
    const canGoBack = wizardStep > 0;
    const canGoForward = wizardStep < 3;
    const stepLabel = isWizardOverallStep
      ? `${t("m2.rating.overall", "Overall")}`
      : `${wizardStep + 1} / 3`;

    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 20,
        paddingTop: 16,
        borderTop: "1px solid var(--labs-border-subtle)",
      }} data-testid="wizard-navigation">
        <button
          type="button"
          onClick={() => wizardNavigate("prev")}
          disabled={!canGoBack || disabled}
          className="labs-btn-ghost"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            opacity: canGoBack ? 1 : 0.3,
            padding: "8px 12px",
          }}
          data-testid="wizard-prev"
        >
          <ChevronLeft style={{ width: 16, height: 16 }} />
          {isDE ? "Zurück" : "Back"}
        </button>

        <span style={{ fontSize: 12, color: "var(--labs-text-muted)", fontWeight: 500 }}>
          {stepLabel}
        </span>

        {canGoForward ? (
          <button
            type="button"
            onClick={() => wizardNavigate("next")}
            disabled={disabled}
            className="labs-btn-primary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "8px 16px",
              fontSize: 14,
            }}
            data-testid="wizard-next"
          >
            {isDE ? "Weiter" : "Next"}
            <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        ) : (
          <div style={{ width: 80 }} />
        )}
      </div>
    );
  };

  const renderDetailedToggle = () => (
    <button
      type="button"
      onClick={() => {
        const next = !showDetailed;
        setShowDetailed(next);
        onDetailedToggle?.(next);
      }}
      data-testid="button-toggle-detailed"
      style={{
        width: "100%",
        marginTop: 16,
        background: showDetailed
          ? "linear-gradient(135deg, var(--labs-accent-muted), color-mix(in srgb, var(--labs-accent-muted) 60%, var(--labs-surface)))"
          : "transparent",
        border: `1px solid ${showDetailed ? "var(--labs-accent)" : "var(--labs-border-subtle)"}`,
        borderRadius: 12,
        cursor: "pointer",
        color: "var(--labs-text)",
        fontSize: 14,
        fontFamily: "inherit",
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        textAlign: "left" as const,
        transition: "all 0.2s ease",
        boxShadow: showDetailed ? "0 0 0 1px var(--labs-accent), 0 2px 8px rgba(0,0,0,0.1)" : "none",
        opacity: showDetailed ? 1 : 0.75,
      }}
    >
      <span style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 30,
        height: 30,
        borderRadius: 8,
        background: showDetailed ? "var(--labs-accent)" : "color-mix(in srgb, var(--labs-accent) 10%, transparent)",
        flexShrink: 0,
        transition: "all 0.2s",
      }}>
        <Sparkles style={{ width: 16, height: 16, color: showDetailed ? "var(--labs-bg)" : "var(--labs-accent)" }} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>
            {t("m2.rating.detailedTasting", "Detailed Tasting Notes")}
          </span>
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            color: "var(--labs-text-muted)",
            background: "color-mix(in srgb, var(--labs-text-muted) 12%, transparent)",
            padding: "1px 6px",
            borderRadius: 4,
            textTransform: "uppercase" as const,
            letterSpacing: "0.04em",
          }}>
            {t("m2.rating.optionalLabel", "Optional")}
          </span>
        </span>
        <span style={{ fontSize: 11, color: "var(--labs-text-muted)", display: "block", marginTop: 2, lineHeight: 1.3 }}>
          {t("m2.rating.detailedTastingDesc", "Score nose, taste & finish individually")}
        </span>
      </div>
      <ChevronDown style={{ width: 16, height: 16, color: "var(--labs-text-muted)", transition: "transform 0.2s", transform: showDetailed ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }} />
    </button>
  );

  if (wizard) {
    return (
      <div data-testid="labs-rating-panel">
        <div
          aria-hidden={showToggle && !showDetailed}
          style={{
            overflow: "hidden",
            maxHeight: (!showToggle || showDetailed) ? 2000 : 0,
            opacity: (!showToggle || showDetailed) ? 1 : 0,
            transition: "max-height 350ms cubic-bezier(0.4, 0, 0.2, 1), opacity 250ms ease",
            pointerEvents: (showToggle && !showDetailed) ? "none" : "auto",
          }}
        >
          <div style={{ paddingTop: 8, marginTop: 4 }}>
            {renderWizardProgressDots()}

            <div
              ref={wizardContentRef}
              style={{
                opacity: wizardTransition ? 0 : 1,
                transform: wizardTransition ? "translateX(8px)" : "translateX(0)",
                transition: "opacity 150ms ease, transform 150ms ease",
              }}
            >
              {isWizardOverallStep ? (
                renderWizardOverallReveal()
              ) : (
                <>
                  {renderWizardStepHeader()}
                  {renderActiveTabContent()}
                </>
              )}
            </div>

            {renderWizardNavigation()}
          </div>
        </div>

        {showToggle && renderDetailedToggle()}

        <FlavourStudioSheet
          open={studioOpen}
          onOpenChange={setStudioOpen}
          dimension={activeTab !== "overall" ? activeTab : "finish"}
          existingChips={activeChips}
          onChipsChange={handleStudioChipsChange}
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div data-testid="labs-rating-panel">
      {(!showToggle || showDetailed) && (
        <div style={{ paddingTop: 8, marginTop: 4 }}>
          {renderTabBar()}
          {renderActiveTabContent()}
        </div>
      )}

      {showToggle && renderDetailedToggle()}

      <FlavourStudioSheet
        open={studioOpen}
        onOpenChange={setStudioOpen}
        dimension={activeTab !== "overall" ? activeTab : "finish"}
        existingChips={activeChips}
        onChipsChange={handleStudioChipsChange}
        disabled={disabled}
      />
    </div>
  );
}

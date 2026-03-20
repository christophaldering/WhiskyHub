import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import RatingDial from "./RatingDial";
import OverallCircle from "./OverallCircle";
import FlavourPicker from "./FlavourPicker";
import type { RatingScale } from "@/labs/hooks/useRatingScale";
import type { FlavorProfileId } from "@/labs/data/flavor-data";
import { triggerHaptic } from "@/labs/hooks/useHaptic";

export type DimKey = "nose" | "taste" | "finish";

interface RatingFlowProps {
  scale: RatingScale;
  scores: Record<DimKey, number>;
  onScoreChange: (dim: DimKey, value: number) => void;
  overall: number;
  onOverallChange: (value: number) => void;
  overrideActive: boolean;
  onOverrideToggle: () => void;
  onResetOverride: () => void;
  chips: string[];
  onChipToggle: (chip: string) => void;
  notes: string;
  onNotesChange: (text: string) => void;
  onSave: () => Promise<void> | void;
  whiskyName?: string;
  flavorProfileId?: FlavorProfileId | null;
  isBlind?: boolean;
  disabled?: boolean;
  initialStep?: number;
  onStepChange?: (step: number) => void;
  onAfterSaveCorrect?: () => void;
  onAfterSaveNewDram?: () => void;
  onAfterSaveOverview?: () => void;
  waitingMessage?: string | null;
  externalSavedOverlay?: boolean;
  onExternalSavedDismiss?: () => void;
}

const DIMS: DimKey[] = ["nose", "taste", "finish"];

const GOLD = "#c8861a";

function FlavourAccordion({ chips, onChipToggle, scale, flavorProfileId, isBlind, disabled, dimension }: {
  chips: string[];
  onChipToggle: (chip: string) => void;
  scale: RatingScale;
  flavorProfileId?: FlavorProfileId | null;
  isBlind?: boolean;
  disabled?: boolean;
  dimension?: DimKey;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const count = chips.length;

  const handleToggle = () => {
    setOpen(p => !p);
    triggerHaptic("light");
  };

  return (
    <div
      data-testid="flavour-accordion"
      style={{
        background: "rgba(255,255,255,0.04)",
        borderRadius: 12,
        overflow: "hidden",
        width: "100%",
      }}
    >
      <button
        onClick={handleToggle}
        disabled={disabled}
        className="flavour-accordion-btn"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "14px 16px",
          background: "none",
          border: "none",
          cursor: disabled ? "default" : "pointer",
          fontFamily: "inherit",
          WebkitTapHighlightColor: "transparent",
          transition: "transform 120ms cubic-bezier(0.25, 0.1, 0.25, 1)",
        }}
        data-testid="flavour-accordion-toggle"
      >
        <span style={{
          fontSize: 14,
          fontWeight: 500,
          color: "var(--labs-text)",
          letterSpacing: "0.01em",
        }}>
          {t("m2.taste.rating.addFlavors", "Add flavors")}
        </span>
        {count > 0 && (
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            minWidth: 20,
            height: 20,
            borderRadius: 10,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: GOLD,
            color: "#1a1a1a",
            padding: "0 6px",
          }} data-testid="flavour-accordion-count">
            {count}
          </span>
        )}
        <ChevronRight style={{
          width: 16,
          height: 16,
          marginLeft: "auto",
          color: "var(--labs-text-muted)",
          transition: "transform 250ms cubic-bezier(0.25, 0.1, 0.25, 1)",
          transform: open ? "rotate(90deg)" : "rotate(0deg)",
          flexShrink: 0,
        }} />
      </button>
      {open && (
        <div style={{ padding: "0 16px 14px", animation: "labsFadeIn 200ms ease both" }}>
          <FlavourPicker
            activeChips={chips}
            onToggle={onChipToggle}
            scale={scale}
            flavorProfileId={flavorProfileId}
            isBlind={isBlind}
            disabled={disabled}
            dimension={dimension}
          />
        </div>
      )}
    </div>
  );
}

export default function RatingFlow({
  scale,
  scores,
  onScoreChange,
  overall,
  onOverallChange,
  overrideActive,
  onOverrideToggle,
  onResetOverride,
  chips,
  onChipToggle,
  notes,
  onNotesChange,
  onSave,
  whiskyName,
  flavorProfileId,
  isBlind = false,
  disabled = false,
  initialStep = 0,
  onStepChange,
  onAfterSaveCorrect,
  onAfterSaveNewDram,
  onAfterSaveOverview,
  waitingMessage,
  externalSavedOverlay,
  onExternalSavedDismiss,
}: RatingFlowProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(initialStep);
  const [returnToSummary, setReturnToSummary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSavedOverlay, setShowSavedOverlay] = useState(false);
  const [savedScore, setSavedScore] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const prevInitialStepRef = useRef(initialStep);
  useEffect(() => {
    if (initialStep !== prevInitialStepRef.current) {
      prevInitialStepRef.current = initialStep;
      setStep(initialStep);
      setReturnToSummary(false);
      setSaving(false);
      setShowSavedOverlay(false);
    }
  }, [initialStep]);

  const calculatedAvg = useMemo(
    () => Math.round((scores.nose + scores.taste + scores.finish) / 3),
    [scores.nose, scores.taste, scores.finish]
  );
  const effectiveOverall = overrideActive ? overall : calculatedAvg;

  const dimLabels: Record<DimKey, string> = {
    nose: t("m2.taste.rating.nose", "Nose"),
    taste: t("m2.taste.rating.taste", "Taste"),
    finish: t("m2.taste.rating.finish", "Finish"),
  };

  const dimHints: Record<DimKey, string> = {
    nose: t("m2.taste.rating.hintNose", "How does the whisky smell?"),
    taste: t("m2.taste.rating.hintTaste", "How does it taste on your palate?"),
    finish: t("m2.taste.rating.hintFinish", "How is the finish?"),
  };

  const nextLabels: string[] = [
    t("m2.taste.rating.nextToTaste", "Continue to Taste"),
    t("m2.taste.rating.nextToFinish", "Continue to Finish"),
    t("m2.taste.rating.nextToSummary", "Continue to Summary"),
    t("m2.taste.rating.save", "Save Rating"),
  ];

  const goTo = useCallback(
    (s: number) => {
      setStep(s);
      onStepChange?.(s);
      triggerHaptic("light");
      contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    },
    [onStepChange]
  );

  const handleNext = useCallback(() => {
    if (step < 3) {
      if (returnToSummary) {
        setReturnToSummary(false);
        goTo(3);
      } else {
        goTo(step + 1);
      }
    }
  }, [step, returnToSummary, goTo]);

  const handleBack = useCallback(() => {
    if (returnToSummary) {
      setReturnToSummary(false);
      goTo(3);
    } else if (step > 0) {
      goTo(step - 1);
    }
  }, [step, returnToSummary, goTo]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave();
      setSavedScore(effectiveOverall);
      setShowSavedOverlay(true);
      triggerHaptic("success");
    } catch {
      setSaving(false);
    }
  }, [saving, onSave, effectiveOverall]);

  const handleRecapClick = useCallback(
    (dim: DimKey) => {
      const idx = DIMS.indexOf(dim);
      setReturnToSummary(true);
      goTo(idx);
    },
    [goTo]
  );

  const renderDots = () => (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: 6,
        padding: "12px 0 8px",
      }}
      data-testid="rating-flow-dots"
    >
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          style={{
            width: i === step ? 20 : 6,
            height: 6,
            borderRadius: 3,
            background: i === step ? GOLD : "rgba(255,255,255,0.15)",
            transition: "all 200ms",
          }}
        />
      ))}
    </div>
  );

  const renderDimStep = (dim: DimKey) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        animation: "labsFadeIn 200ms ease both",
      }}
      data-testid={`rating-step-${dim}`}
    >
      <div style={{ textAlign: "center" }}>
        <h3
          className="labs-serif"
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "var(--labs-text)",
            margin: "0 0 4px",
          }}
        >
          {dimLabels[dim]}
        </h3>
        <p
          style={{
            fontSize: 13,
            color: "var(--labs-text-muted)",
            margin: 0,
          }}
        >
          {dimHints[dim]}
        </p>
      </div>

      <RatingDial
        value={scores[dim]}
        onChange={(v) => onScoreChange(dim, v)}
        scale={scale}
        label={dimLabels[dim]}
        disabled={disabled}
        size={200}
      />

      <FlavourAccordion
        chips={chips}
        onChipToggle={onChipToggle}
        scale={scale}
        flavorProfileId={flavorProfileId}
        isBlind={isBlind}
        disabled={disabled}
        dimension={dim}
      />
    </div>
  );

  const renderSummary = () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        animation: "labsFadeIn 200ms ease both",
      }}
      data-testid="rating-step-summary"
    >
      <div style={{ textAlign: "center", marginBottom: 4 }}>
        <h3
          className="labs-serif"
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "var(--labs-text)",
            margin: 0,
          }}
        >
          {t("m2.taste.rating.summary", "Summary")}
        </h3>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
        data-testid="summary-recap-pills"
      >
        {DIMS.map((dim) => (
          <button
            key={dim}
            onClick={() => handleRecapClick(dim)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 9999,
              border: "1px solid var(--labs-border)",
              background: "var(--labs-surface)",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--labs-text)",
              transition: "all 150ms",
            }}
            data-testid={`recap-pill-${dim}`}
          >
            <span style={{ color: "var(--labs-text-muted)" }}>
              {dimLabels[dim]}
            </span>
            <span
              className="labs-serif"
              style={{ fontWeight: 700, fontSize: 15, fontVariantNumeric: "tabular-nums" }}
            >
              {scores[dim]}
            </span>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <OverallCircle
          noseScore={scores.nose}
          tasteScore={scores.taste}
          finishScore={scores.finish}
          value={overall}
          onChange={onOverallChange}
          overrideActive={overrideActive}
          onOverrideToggle={onOverrideToggle}
          onReset={onResetOverride}
          scale={scale}
          size={140}
          disabled={disabled}
        />
      </div>

      <FlavourAccordion
        chips={chips}
        onChipToggle={onChipToggle}
        scale={scale}
        flavorProfileId={flavorProfileId}
        isBlind={isBlind}
        disabled={disabled}
        dimension="nose"
      />

      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--labs-text-muted)",
            marginBottom: 8,
          }}
        >
          {t("m2.taste.rating.notesLabel", "Notes")}
        </div>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={t("m2.taste.rating.notesPlaceholder", "Anything you want to remember...")}
          rows={3}
          disabled={disabled}
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: 14,
            borderRadius: 12,
            background: "rgba(255,255,255,0.035)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "var(--labs-text)",
            outline: "none",
            resize: "vertical",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
          data-testid="rating-flow-notes"
        />
      </div>
    </div>
  );

  const renderSavedOverlay = () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        padding: "40px 20px",
        animation: "labsFadeIn 300ms ease both",
        minHeight: 300,
      }}
      data-testid="rating-saved-overlay"
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          background: `linear-gradient(135deg, ${GOLD}, color-mix(in srgb, ${GOLD} 70%, #fff))`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "labsScaleIn 400ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
        }}
      >
        <Check style={{ width: 36, height: 36, color: "#1a1714" }} />
      </div>

      <div style={{ textAlign: "center" }}>
        <h3
          className="labs-serif"
          style={{ fontSize: 24, fontWeight: 700, color: "var(--labs-text)", margin: "0 0 4px" }}
        >
          {t("m2.taste.rating.saved", "Saved!")}
        </h3>
        {whiskyName && (
          <p style={{ fontSize: 14, color: "var(--labs-text-muted)", margin: "0 0 8px" }}>
            {whiskyName}
          </p>
        )}
        <span
          className="labs-serif"
          style={{ fontSize: 36, fontWeight: 700, color: GOLD, fontVariantNumeric: "tabular-nums" }}
        >
          {savedScore}
        </span>
        <span style={{ fontSize: 14, color: "var(--labs-text-muted)", marginLeft: 4 }}>
          / {scale.max}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 300 }}>
        {onAfterSaveCorrect && (
          <button
            onClick={() => {
              setShowSavedOverlay(false);
              setSaving(false);
              goTo(3);
              onAfterSaveCorrect();
            }}
            className="labs-btn-ghost"
            style={{
              width: "100%",
              padding: "12px 20px",
              fontSize: 14,
              borderRadius: 50,
            }}
            data-testid="saved-action-correct"
          >
            {t("m2.taste.rating.correct", "Correct Rating")}
          </button>
        )}
        {onAfterSaveNewDram && (
          <button
            onClick={onAfterSaveNewDram}
            className="labs-btn-primary"
            style={{
              width: "100%",
              padding: "12px 20px",
              fontSize: 14,
              borderRadius: 50,
            }}
            data-testid="saved-action-new-dram"
          >
            {t("m2.taste.rating.newDram", "New Dram")}
          </button>
        )}
        {onAfterSaveOverview && (
          <button
            onClick={onAfterSaveOverview}
            className="labs-btn-ghost"
            style={{
              width: "100%",
              padding: "12px 20px",
              fontSize: 14,
              borderRadius: 50,
            }}
            data-testid="saved-action-overview"
          >
            {t("m2.taste.rating.toOverview", "Overview")}
          </button>
        )}
      </div>
    </div>
  );

  useEffect(() => {
    if (externalSavedOverlay) {
      setShowSavedOverlay(false);
    }
  }, [externalSavedOverlay]);

  if (showSavedOverlay || externalSavedOverlay) {
    return (
      <div data-testid="rating-flow" style={{ maxWidth: 480, margin: "0 auto" }}>
        {renderSavedOverlay()}
        {waitingMessage && (
          <div
            style={{
              textAlign: "center",
              padding: "16px 24px",
              animation: "labsFadeIn 400ms ease both",
            }}
            data-testid="rating-flow-waiting"
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                borderRadius: 12,
                background: "rgba(200,134,26,0.08)",
                border: "1px solid rgba(200,134,26,0.15)",
                fontSize: 13,
                color: "var(--labs-text-muted)",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: GOLD,
                  animation: "pulse 2s infinite",
                }}
              />
              {waitingMessage}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      data-testid="rating-flow"
      style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", minHeight: 400 }}
    >
      {renderDots()}

      <div ref={contentRef} style={{ flex: 1, padding: "12px 0 80px", overflow: "auto" }}>
        {step === 0 && renderDimStep("nose")}
        {step === 1 && renderDimStep("taste")}
        {step === 2 && renderDimStep("finish")}
        {step === 3 && renderSummary()}
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          padding: "12px 0",
          borderTop: "1px solid var(--labs-border)",
        }}
        data-testid="rating-flow-nav"
      >
        <button
          onClick={handleBack}
          disabled={step === 0 && !returnToSummary}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "12px 16px",
            borderRadius: 50,
            border: "1px solid var(--labs-border)",
            background: "transparent",
            color: (step === 0 && !returnToSummary) ? "var(--labs-text-muted)" : "var(--labs-text)",
            fontSize: 14,
            fontWeight: 500,
            fontFamily: "inherit",
            cursor: (step === 0 && !returnToSummary) ? "default" : "pointer",
            opacity: (step === 0 && !returnToSummary) ? 0.35 : 1,
            transition: "all 150ms",
          }}
          data-testid="rating-flow-back"
        >
          <ChevronLeft style={{ width: 16, height: 16 }} />
          {returnToSummary
            ? t("m2.taste.rating.backToSummary", "Back to Summary")
            : t("m2.common.back", "Back")}
        </button>

        <button
          onClick={step === 3 ? handleSave : handleNext}
          disabled={disabled || saving}
          style={{
            flex: 1,
            padding: "12px 20px",
            borderRadius: 50,
            border: "none",
            background: step === 3
              ? `linear-gradient(135deg, ${GOLD}, color-mix(in srgb, ${GOLD} 80%, #fff))`
              : GOLD,
            color: "#1a1714",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: disabled || saving ? "default" : "pointer",
            opacity: disabled || saving ? 0.5 : 1,
            transition: "all 150ms",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
          data-testid="rating-flow-next"
        >
          {saving && (
            <span
              style={{
                width: 16,
                height: 16,
                border: "2px solid rgba(26,23,20,0.3)",
                borderTopColor: "#1a1714",
                borderRadius: "50%",
                display: "inline-block",
                animation: "spin 0.8s linear infinite",
              }}
            />
          )}
          {returnToSummary && step < 3
            ? t("m2.taste.rating.backToSummary", "Back to Summary")
            : nextLabels[step]}
        </button>
      </div>
    </div>
  );
}

import { useMemo, useRef, useState } from "react";
import { SP, FONT, RADIUS, TOUCH_MIN } from "./theme";
import type { RatingData, PhaseId } from "./types";
import type { RatingScale } from "@/labs/hooks/useRatingScale";
import { BackIcon } from "./icons";
import PhaseSignature from "./PhaseSignature";
import { TISCH_ANCHORS, anchorToScale, nearestAnchorIndex } from "./tischAnchors";
import ScoreInput from "./ScoreInput";

interface TischLabels {
  tisch: string;
  tischTapHint: string;
  tapEdit: string;
  of: string;
  preciseToggle: string;
  preciseToggleClose: string;
  next: string;
  done: string;
  band90: string;
  band85: string;
  band80: string;
  band75: string;
  band70: string;
  band0: string;
  nose: string;
  palate: string;
  finishLabel: string;
  overall: string;
  qNose: string;
  qPalate: string;
  qFinish: string;
  qOverall: string;
  back: string;
}

interface TischRatingProps {
  labels: TischLabels;
  whisky: {
    name?: string;
    region?: string;
    cask?: string;
    blind?: boolean;
  };
  initialData?: RatingData;
  onDone: (data: RatingData) => void;
  onBack: () => void;
  onChange?: (phaseIndex: number, data: Partial<RatingData>) => void;
  scale?: RatingScale;
}

const PHASE_ORDER: PhaseId[] = ["nose", "palate", "finish", "overall"];

export default function TischRating({ labels, whisky, initialData, onDone, onBack, onChange, scale }: TischRatingProps) {
  const scaleMax = scale?.max ?? 100;
  const scaleStep = scale?.step ?? 0.5;

  const phaseMeta: Record<PhaseId, { name: string; question: string }> = {
    nose: { name: labels.nose, question: labels.qNose },
    palate: { name: labels.palate, question: labels.qPalate },
    finish: { name: labels.finishLabel, question: labels.qFinish },
    overall: { name: labels.overall, question: labels.qOverall },
  };

  const bandWord = (key: (typeof TISCH_ANCHORS)[number]["bandKey"]): string => labels[key];

  // Bei Re-Rating: vorhandene Scores auf nächstliegende Anker abbilden.
  // Feine Scores pro Phase (null = noch nicht bewertet). Buttons und Slider schreiben in dasselbe Array.
  const initialScores = useMemo<(number | null)[]>(() => {
    if (!initialData?.scores) return [null, null, null, null];
    const s = initialData.scores;
    const vals = [s.nose, s.palate, s.finish, s.overall];
    return vals.map((v) => (typeof v === "number" && v > 0 ? v : null));
  }, [initialData]);

  const [scores, setScores] = useState<(number | null)[]>(initialScores);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [flashIdx, setFlashIdx] = useState<number | null>(null);
  const [precise, setPrecise] = useState(false);
  const transitioningRef = useRef(false);

  const phaseId = PHASE_ORDER[phaseIdx];
  const accent = `var(--labs-phase-${phaseId})`;
  const defaultScore = anchorToScale(TISCH_ANCHORS[2].value100, scaleMax, scaleStep);

  // Welcher Anker-Button ist für eine Phase aktiv (Highlight folgt dem feinen Score).
  const activeAnchor = (phase: number): number | null =>
    scores[phase] != null ? nearestAnchorIndex(scores[phase] as number, scaleMax, scaleStep) : null;

  const buildData = (finalScores: (number | null)[]): RatingData => {
    const toScore = (v: number | null): number => v ?? defaultScore;
    return {
      scores: {
        nose: toScore(finalScores[0]),
        palate: toScore(finalScores[1]),
        finish: toScore(finalScores[2]),
        overall: toScore(finalScores[3]),
      },
      tags: {
        nose: initialData?.tags?.nose ?? [],
        palate: initialData?.tags?.palate ?? [],
        finish: initialData?.tags?.finish ?? [],
        overall: initialData?.tags?.overall ?? [],
      },
      notes: {
        nose: initialData?.notes?.nose ?? "",
        palate: initialData?.notes?.palate ?? "",
        finish: initialData?.notes?.finish ?? "",
        overall: initialData?.notes?.overall ?? "",
      },
      overallExplicit: true,
    };
  };

  const advance = (finalScores: (number | null)[]) => {
    if (phaseIdx < PHASE_ORDER.length - 1) {
      setPhaseIdx(phaseIdx + 1);
    } else {
      onDone(buildData(finalScores));
    }
  };

  // Wortstufe antippen. Im schnellen Modus (precise=false) springt es nach kurzem Flash zur nächsten Phase.
  const handlePick = (anchorIdx: number) => {
    if (transitioningRef.current) return;
    const score = anchorToScale(TISCH_ANCHORS[anchorIdx].value100, scaleMax, scaleStep);
    const next = [...scores];
    next[phaseIdx] = score;
    setScores(next);
    setFlashIdx(anchorIdx);
    onChange?.(phaseIdx, { scores: buildData(next).scores });

    if (precise) {
      window.setTimeout(() => setFlashIdx(null), 180);
    } else {
      transitioningRef.current = true;
      window.setTimeout(() => {
        setFlashIdx(null);
        transitioningRef.current = false;
        advance(next);
      }, 180);
    }
  };

  // Slider-Feinjustage (nur im präzisen Modus sichtbar). Kein Auto-Advance.
  const handleSlider = (v: number) => {
    const next = [...scores];
    next[phaseIdx] = v;
    setScores(next);
    onChange?.(phaseIdx, { scores: buildData(next).scores });
  };

  // Manuelles Weiter im präzisen Modus.
  const handleNext = () => {
    if (transitioningRef.current) return;
    const next = scores[phaseIdx] == null ? (() => { const n = [...scores]; n[phaseIdx] = defaultScore; setScores(n); return n; })() : scores;
    advance(next);
  };

  const handleStepBack = () => {
    if (transitioningRef.current) return;
    if (phaseIdx === 0) {
      onBack();
    } else {
      setPhaseIdx(phaseIdx - 1);
    }
  };

  return (
    <div className="labs-fade-in" style={{ padding: `${SP.lg}px ${SP.md}px`, paddingBottom: 96 }}>
      <button
        onClick={handleStepBack}
        data-testid="tisch-rating-back"
        style={{
          display: "flex",
          alignItems: "center",
          gap: SP.sm,
          minHeight: TOUCH_MIN,
          background: "none",
          border: "none",
          color: "var(--labs-text)",
          cursor: "pointer",
          padding: 0,
          fontFamily: FONT.body,
          fontSize: 15,
          marginBottom: SP.sm,
        }}
      >
        <BackIcon color="var(--labs-text)" size={20} />
        <span>{labels.back}</span>
      </button>

      {!whisky.blind && whisky.name && (
        <div style={{ marginBottom: SP.sm }}>
          <div style={{ fontFamily: FONT.serif, fontSize: 18, fontStyle: "italic", color: "var(--labs-text)" }}>
            {whisky.name}
          </div>
          {whisky.region && (
            <div style={{ fontSize: 12, color: "var(--labs-text-secondary)" }}>
              {whisky.region}{whisky.cask ? ` · ${whisky.cask}` : ""}
            </div>
          )}
        </div>
      )}

      <div
        data-testid="tisch-phase-dots"
        style={{ display: "flex", gap: SP.xs + 2, marginBottom: SP.md }}
      >
        {PHASE_ORDER.map((p, i) => (
          <div
            key={p}
            style={{
              height: 3,
              flex: 1,
              borderRadius: 2,
              background:
                i < phaseIdx || scores[i] != null
                  ? `var(--labs-phase-${p})`
                  : i === phaseIdx
                    ? `var(--labs-phase-${p})`
                    : "var(--labs-border)",
              opacity: i === phaseIdx ? 1 : i < phaseIdx || scores[i] != null ? 0.55 : 1,
            }}
          />
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: SP.sm, marginBottom: SP.md }}>
        <PhaseSignature phaseId={phaseId} size="large" />
        <div>
          <div style={{ fontFamily: FONT.display, fontSize: 24, color: "var(--labs-text)", lineHeight: 1.15 }} data-testid="tisch-phase-name">
            {phaseMeta[phaseId].name}
          </div>
          <div style={{ fontSize: 13, color: "var(--labs-text-muted)", fontFamily: FONT.serif, fontStyle: "italic" }}>
            {phaseMeta[phaseId].question}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: SP.sm }}>
        {TISCH_ANCHORS.map((a, i) => {
          const picked = activeAnchor(phaseIdx) === i;
          const flashing = flashIdx === i;
          const display = anchorToScale(a.value100, scaleMax, scaleStep);
          return (
            <button
              key={a.bandKey}
              data-testid={`tisch-anchor-${phaseId}-${a.bandKey}`}
              onClick={() => handlePick(i)}
              style={{
                minHeight: TOUCH_MIN + 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: `0 ${SP.md}px`,
                borderRadius: RADIUS.md,
                cursor: "pointer",
                background: flashing || picked ? "var(--labs-bg-hover, rgba(255,255,255,0.08))" : "var(--labs-surface)",
                border: flashing || picked ? `2px solid ${accent}` : "1px solid var(--labs-border)",
                color: "var(--labs-text)",
                transition: "border-color 120ms ease, background 120ms ease",
                fontFamily: FONT.serif,
                fontSize: 19,
                textAlign: "left",
              }}
            >
              <span>{bandWord(a.bandKey)}</span>
              <span style={{ fontFamily: FONT.body, fontSize: 12, color: flashing || picked ? accent : "var(--labs-text-muted)" }}>
                ≈ {display}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => setPrecise((p) => !p)}
        data-testid="tisch-precise-toggle"
        style={{
          marginTop: SP.md,
          width: "100%",
          minHeight: TOUCH_MIN,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: SP.xs,
          background: "none",
          border: "none",
          color: "var(--labs-text-muted)",
          cursor: "pointer",
          fontFamily: FONT.body,
          fontSize: 13,
        }}
      >
        <span>{precise ? labels.preciseToggleClose : labels.preciseToggle}</span>
        <span style={{ fontSize: 11 }}>{precise ? "▴" : "▾"}</span>
      </button>

      {precise && (
        <div data-testid="tisch-precise-panel" style={{ marginTop: SP.sm }}>
          <ScoreInput
            value={scores[phaseIdx] ?? defaultScore}
            onChange={handleSlider}
            phaseId={phaseId}
            labels={{
              tapEdit: labels.tapEdit,
              of: labels.of,
              band90: labels.band90,
              band85: labels.band85,
              band80: labels.band80,
              band75: labels.band75,
              band70: labels.band70,
              band0: labels.band0,
            }}
            scale={scale}
          />
          <button
            onClick={handleNext}
            data-testid="tisch-precise-next"
            style={{
              marginTop: SP.md,
              width: "100%",
              minHeight: TOUCH_MIN + 8,
              borderRadius: RADIUS.md,
              border: "none",
              background: accent,
              color: "var(--labs-bg, #0B0906)",
              cursor: "pointer",
              fontFamily: FONT.body,
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            {phaseIdx < PHASE_ORDER.length - 1 ? labels.next : labels.done}
          </button>
        </div>
      )}

      {!precise && (
        <div style={{ marginTop: SP.md, fontSize: 12, color: "var(--labs-text-muted)", textAlign: "center", fontFamily: FONT.body }} data-testid="tisch-tap-hint">
          {labels.tischTapHint}
        </div>
      )}
    </div>
  );
}

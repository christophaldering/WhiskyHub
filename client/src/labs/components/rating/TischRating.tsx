import { useMemo, useRef, useState } from "react";
import { SP, FONT, RADIUS, TOUCH_MIN } from "./theme";
import type { RatingData, PhaseId } from "./types";
import type { RatingScale } from "@/labs/hooks/useRatingScale";
import { BackIcon } from "./icons";
import PhaseSignature from "./PhaseSignature";
import { TISCH_ANCHORS, anchorToScale, nearestAnchorIndex } from "./tischAnchors";

interface TischLabels {
  tisch: string;
  tischTapHint: string;
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
  const initialPicks = useMemo<(number | null)[]>(() => {
    if (!initialData?.scores) return [null, null, null, null];
    const s = initialData.scores;
    const vals = [s.nose, s.palate, s.finish, s.overall];
    return vals.map((v) => (typeof v === "number" && v > 0 ? nearestAnchorIndex(v, scaleMax, scaleStep) : null));
  }, [initialData, scaleMax, scaleStep]);

  const [picks, setPicks] = useState<(number | null)[]>(initialPicks);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [flashIdx, setFlashIdx] = useState<number | null>(null);
  const transitioningRef = useRef(false);

  const phaseId = PHASE_ORDER[phaseIdx];
  const accent = `var(--labs-phase-${phaseId})`;

  const buildData = (finalPicks: (number | null)[]): RatingData => {
    const toScore = (idx: number | null): number =>
      anchorToScale(TISCH_ANCHORS[idx ?? 2].value100, scaleMax, scaleStep);
    return {
      scores: {
        nose: toScore(finalPicks[0]),
        palate: toScore(finalPicks[1]),
        finish: toScore(finalPicks[2]),
        overall: toScore(finalPicks[3]),
      },
      tags: { nose: [], palate: [], finish: [], overall: [] },
      notes: {
        nose: initialData?.notes?.nose ?? "",
        palate: initialData?.notes?.palate ?? "",
        finish: initialData?.notes?.finish ?? "",
        overall: initialData?.notes?.overall ?? "",
      },
      overallExplicit: true,
    };
  };

  const handlePick = (anchorIdx: number) => {
    if (transitioningRef.current) return;
    transitioningRef.current = true;
    const next = [...picks];
    next[phaseIdx] = anchorIdx;
    setPicks(next);
    setFlashIdx(anchorIdx);
    onChange?.(phaseIdx, { scores: buildData(next).scores });

    window.setTimeout(() => {
      setFlashIdx(null);
      transitioningRef.current = false;
      if (phaseIdx < PHASE_ORDER.length - 1) {
        setPhaseIdx(phaseIdx + 1);
      } else {
        onDone(buildData(next));
      }
    }, 180);
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
                i < phaseIdx || picks[i] != null
                  ? `var(--labs-phase-${p})`
                  : i === phaseIdx
                    ? `var(--labs-phase-${p})`
                    : "var(--labs-border)",
              opacity: i === phaseIdx ? 1 : i < phaseIdx || picks[i] != null ? 0.55 : 1,
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
          const picked = picks[phaseIdx] === i;
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

      <div style={{ marginTop: SP.md, fontSize: 12, color: "var(--labs-text-muted)", textAlign: "center", fontFamily: FONT.body }} data-testid="tisch-tap-hint">
        {labels.tischTapHint}
      </div>
    </div>
  );
}

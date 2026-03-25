import { useState, useRef, useCallback, useEffect } from "react";
import { SP, FONT, RADIUS, TOUCH_MIN } from "./theme";
import type { PhaseId, PhaseScores, PhaseTags, PhaseNotes, RatingData } from "./types";
import ScoreInput from "./ScoreInput";
import FlavorTags from "./FlavorTags";
import PhaseSignature from "./PhaseSignature";
import SaveConfirm from "./SaveConfirm";
import { CheckIcon, AlertTriangleIcon } from "./icons";

interface GuidedLabels {
  tapEdit: string;
  of: string;
  band90: string;
  band85: string;
  band80: string;
  band75: string;
  band70: string;
  band0: string;
  aromen: string;
  aromenSub: string;
  blindLabel: string;
  profileLabel: string;
  note: string;
  noteSub: string;
  notePH: string;
  save: string;
  finish2: string;
  error: string;
  nose: string;
  palate: string;
  finishLabel: string;
  overall: string;
  qNose: string;
  qPalate: string;
  qFinish: string;
  qOverall: string;
  hintNose: string;
  hintPalate: string;
  hintFinish: string;
  hintOverall: string;
}

interface GuidedRatingProps {
  labels: GuidedLabels;
  whisky: {
    name?: string;
    region?: string;
    cask?: string;
    blind: boolean;
    flavorProfile?: string;
  };
  initialData?: RatingData;
  initialPhaseIndex?: number;
  onDone: (data: RatingData) => void;
  onBack: () => void;
  onChange?: (phaseIndex: number, data: Partial<RatingData>) => void;
}

const PHASES: PhaseId[] = ["nose", "palate", "finish", "overall"];

function phaseLabel(id: PhaseId, l: GuidedLabels): string {
  const map: Record<PhaseId, string> = {
    nose: l.nose, palate: l.palate, finish: l.finishLabel, overall: l.overall,
  };
  return map[id];
}

function phaseQuestion(id: PhaseId, l: GuidedLabels): string {
  const map: Record<PhaseId, string> = {
    nose: l.qNose, palate: l.qPalate, finish: l.qFinish, overall: l.qOverall,
  };
  return map[id];
}

function phaseHint(id: PhaseId, l: GuidedLabels): string {
  const map: Record<PhaseId, string> = {
    nose: l.hintNose, palate: l.hintPalate, finish: l.hintFinish, overall: l.hintOverall,
  };
  return map[id];
}

export default function GuidedRating({ labels, whisky, initialData, initialPhaseIndex, onDone, onBack, onChange }: GuidedRatingProps) {
  const [phaseIndex, setPhaseIndex] = useState(initialPhaseIndex ?? 0);
  const [scores, setScores] = useState<PhaseScores>(initialData?.scores ?? { nose: 75, palate: 75, finish: 75, overall: 75 });
  const [tags, setTags] = useState<PhaseTags>(initialData?.tags ?? { nose: [], palate: [], finish: [], overall: [] });
  const [notes, setNotes] = useState<PhaseNotes>(initialData?.notes ?? { nose: "", palate: "", finish: "", overall: "" });
  const [showFlash, setShowFlash] = useState(false);
  const [visibleContent, setVisibleContent] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentPhase = PHASES[phaseIndex];
  const accent = `var(--labs-phase-${currentPhase})`;
  const glow = `var(--labs-phase-${currentPhase}-glow)`;

  useEffect(() => {
    setSaveError(null);
  }, [phaseIndex]);

  useEffect(() => {
    if (saveError) {
      errorTimerRef.current = setTimeout(() => setSaveError(null), 5000);
      return () => { if (errorTimerRef.current) clearTimeout(errorTimerRef.current); };
    }
  }, [saveError]);

  const handleNext = useCallback(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      if (phaseIndex < 3) {
        const nextIdx = phaseIndex + 1;
        setPhaseIndex(nextIdx);
        onChange?.(nextIdx, { scores, tags, notes });
      } else {
        onDone({ scores, tags, notes });
      }
      return;
    }

    setShowFlash(true);
    setTimeout(() => {
      setShowFlash(false);
      setVisibleContent(false);
      setTimeout(() => {
        if (phaseIndex < 3) {
          const nextIdx = phaseIndex + 1;
          setPhaseIndex(nextIdx);
          setVisibleContent(true);
          onChange?.(nextIdx, { scores, tags, notes });
        } else {
          onDone({ scores, tags, notes });
        }
      }, 100);
    }, 300);
  }, [phaseIndex, scores, tags, notes, onDone, onChange]);

  const goTo = useCallback((i: number) => {
    setVisibleContent(false);
    setTimeout(() => {
      setPhaseIndex(i);
      setVisibleContent(true);
      onChange?.(i, { scores, tags, notes });
    }, 120);
  }, [scores, tags, notes, onChange]);

  const handleScoreChange = useCallback((v: number) => {
    setScores((prev) => {
      const next = { ...prev, [currentPhase]: v };
      onChange?.(phaseIndex, { scores: next, tags, notes });
      return next;
    });
  }, [currentPhase, phaseIndex, tags, notes, onChange]);

  const handleTagToggle = useCallback((tag: string) => {
    setTags((prev) => {
      const curr = prev[currentPhase];
      const next = curr.includes(tag) ? curr.filter((t) => t !== tag) : [...curr, tag];
      const updated = { ...prev, [currentPhase]: next };
      onChange?.(phaseIndex, { scores, tags: updated, notes });
      return updated;
    });
  }, [currentPhase, phaseIndex, scores, notes, onChange]);

  const handleNoteChange = useCallback((val: string) => {
    setNotes((prev) => {
      const next = { ...prev, [currentPhase]: val };
      onChange?.(phaseIndex, { scores, tags, notes: next });
      return next;
    });
  }, [currentPhase, phaseIndex, scores, tags, onChange]);

  const nextPhaseLabel = phaseIndex < 3 ? phaseLabel(PHASES[phaseIndex + 1], labels) : "";

  const scoreLabels = {
    tapEdit: labels.tapEdit,
    of: labels.of,
    band90: labels.band90,
    band85: labels.band85,
    band80: labels.band80,
    band75: labels.band75,
    band70: labels.band70,
    band0: labels.band0,
  };

  const flavorLabels = {
    aromen: labels.aromen,
    aromenSub: labels.aromenSub,
    blindLabel: labels.blindLabel,
    profileLabel: labels.profileLabel,
  };

  return (
    <div style={{ position: "relative", minHeight: "100dvh", paddingBottom: 200 }}>
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: 200,
          background: `radial-gradient(ellipse at center bottom, ${glow}, transparent 70%)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <SaveConfirm show={showFlash} color={accent} />

      <div style={{
        position: "sticky",
        top: 52,
        zIndex: 10,
        background: "var(--labs-header-bg)",
        backdropFilter: "blur(24px)",
        padding: `${SP.sm}px ${SP.md}px`,
        borderBottom: "1px solid var(--labs-border)",
      }}>
        <div style={{ display: "flex", gap: SP.xs }}>
          {PHASES.map((pid, i) => {
            const pAccent = `var(--labs-phase-${pid})`;
            const pDim = `var(--labs-phase-${pid}-dim)`;
            const isActive = i === phaseIndex;
            const isDone = i < phaseIndex;
            return (
              <button
                key={pid}
                data-testid={`phase-tab-${pid}`}
                onClick={() => goTo(i)}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  padding: `${SP.sm}px ${SP.xs}px`,
                  background: isActive ? pDim : "transparent",
                  border: isActive ? `1px solid color-mix(in srgb, ${pAccent} 27%, transparent)` : "1px solid transparent",
                  borderRadius: RADIUS.md,
                  cursor: "pointer",
                  minHeight: TOUCH_MIN,
                  transition: "all 0.2s",
                }}
              >
                <PhaseSignature phaseId={pid} size="normal" />
                <span style={{
                  fontSize: 10,
                  fontFamily: FONT.body,
                  color: isActive ? pAccent : "var(--labs-text-secondary)",
                  fontWeight: isActive ? 600 : 400,
                }}>
                  {phaseLabel(pid, labels)}
                </span>
                {isDone && (
                  <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <CheckIcon color={pAccent} size={10} />
                    <span style={{ fontSize: 10, color: pAccent, fontWeight: 600 }}>
                      {scores[pid]}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          padding: `${SP.lg}px ${SP.md}px`,
          opacity: visibleContent ? 1 : 0,
          transform: visibleContent ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 0.2s, transform 0.2s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: SP.md, marginBottom: SP.sm }}>
          <PhaseSignature phaseId={currentPhase} size="large" />
          <span style={{
            fontSize: 11,
            fontFamily: FONT.body,
            fontWeight: 600,
            color: accent,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}>
            {phaseLabel(currentPhase, labels)}
          </span>
        </div>

        <h2
          data-testid={`phase-question-${currentPhase}`}
          style={{
            fontFamily: FONT.display,
            fontSize: 24,
            fontWeight: 600,
            color: "var(--labs-text)",
            marginBottom: SP.xs,
          }}
        >
          {phaseQuestion(currentPhase, labels)}
        </h2>

        <p style={{
          fontFamily: FONT.serif,
          fontSize: 15,
          fontStyle: "italic",
          color: "var(--labs-text-muted)",
          marginBottom: SP.lg,
        }}>
          {phaseHint(currentPhase, labels)}
        </p>

        <div style={{
          background: "var(--labs-surface)",
          border: "1px solid var(--labs-border)",
          borderRadius: RADIUS.lg,
          padding: SP.lg,
          marginBottom: SP.lg,
        }}>
          <ScoreInput
            value={scores[currentPhase]}
            onChange={handleScoreChange}
            phaseId={currentPhase}
            labels={scoreLabels}
          />
        </div>

        {currentPhase !== "overall" && (
          <FlavorTags
            phaseId={currentPhase}
            whiskyRegion={whisky.region}
            whiskyCask={whisky.cask}
            whiskyFlavorProfile={whisky.flavorProfile}
            blind={whisky.blind}
            selected={tags[currentPhase]}
            onToggle={handleTagToggle}
            labels={flavorLabels}
          />
        )}

        <div style={{ marginTop: SP.lg }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)", marginBottom: SP.xs, fontFamily: FONT.body }}>
            {labels.note}
          </div>
          <div style={{ fontSize: 14, color: "var(--labs-text-muted)", marginBottom: SP.sm, fontFamily: FONT.body }}>
            {labels.noteSub}
          </div>
          <textarea
            data-testid={`phase-notes-${currentPhase}`}
            value={notes[currentPhase]}
            onChange={(e) => handleNoteChange(e.target.value)}
            placeholder={`${phaseLabel(currentPhase, labels)}: ${labels.notePH}`}
            rows={3}
            style={{
              width: "100%",
              padding: SP.md,
              fontFamily: FONT.serif,
              fontStyle: "italic",
              fontSize: 16,
              color: "var(--labs-text)",
              background: "var(--labs-input-bg)",
              border: "1px solid var(--labs-border)",
              borderRadius: RADIUS.md,
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
              minHeight: TOUCH_MIN,
            }}
          />
        </div>
      </div>

      {saveError && (
        <div
          data-testid="rating-error-banner"
          style={{
            position: "fixed",
            bottom: "calc(140px + env(safe-area-inset-bottom, 8px))",
            left: SP.md,
            right: SP.md,
            padding: `${SP.sm}px ${SP.md}px`,
            background: "color-mix(in srgb, var(--labs-amber) 9%, transparent)",
            border: "1px solid color-mix(in srgb, var(--labs-amber) 27%, transparent)",
            borderRadius: RADIUS.md,
            display: "flex",
            alignItems: "center",
            gap: SP.sm,
            zIndex: 20,
          }}
        >
          <AlertTriangleIcon color="var(--labs-amber)" size={18} />
          <span style={{ fontSize: 13, color: "var(--labs-amber)", fontFamily: FONT.body }}>{saveError}</span>
        </div>
      )}

      <div style={{
        position: "fixed",
        bottom: "calc(72px + env(safe-area-inset-bottom, 8px))",
        left: 0,
        right: 0,
        zIndex: 15,
        display: "flex",
        justifyContent: "center",
        padding: `0 ${SP.md}px`,
        boxSizing: "border-box",
      }}>
        <div style={{ display: "flex", gap: SP.sm, width: "100%", maxWidth: 672, minWidth: 0 }}>
          <button
            data-testid="rating-back-btn"
            onClick={() => {
              if (phaseIndex > 0) goTo(phaseIndex - 1);
              else onBack();
            }}
            style={{
              height: 56,
              paddingLeft: 20,
              paddingRight: 20,
              borderRadius: RADIUS.full,
              border: "1px solid var(--labs-border)",
              background: "var(--labs-surface)",
              color: "var(--labs-text)",
              fontFamily: FONT.body,
              fontSize: 15,
              cursor: "pointer",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            {phaseIndex > 0 ? phaseLabel(PHASES[phaseIndex - 1], labels) : "\u2190"}
          </button>
          <button
            data-testid="rating-next-btn"
            onClick={handleNext}
            style={{
              flex: 1,
              minWidth: 0,
              height: 56,
              background: accent,
              color: "#1a1a1a",
              border: "none",
              borderRadius: RADIUS.full,
              fontSize: 17,
              fontWeight: 700,
              fontFamily: FONT.body,
              cursor: "pointer",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {phaseIndex < 3
              ? `${phaseLabel(currentPhase, labels)} ${labels.save} \u2192 ${nextPhaseLabel}`
              : labels.finish2
            }
          </button>
        </div>
      </div>
    </div>
  );
}

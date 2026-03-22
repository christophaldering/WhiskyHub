import { useState, useRef, useCallback, useEffect } from "react";
import type { ThemeTokens } from "./theme";
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
  th: ThemeTokens;
  labels: GuidedLabels;
  whisky: {
    name?: string;
    region?: string;
    cask?: string;
    blind: boolean;
  };
  initialData?: RatingData;
  onDone: (data: RatingData) => void;
  onBack: () => void;
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

export default function GuidedRating({ th, labels, whisky, initialData, onDone, onBack }: GuidedRatingProps) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [scores, setScores] = useState<PhaseScores>(initialData?.scores ?? { nose: 75, palate: 75, finish: 75, overall: 75 });
  const [tags, setTags] = useState<PhaseTags>(initialData?.tags ?? { nose: [], palate: [], finish: [], overall: [] });
  const [notes, setNotes] = useState<PhaseNotes>(initialData?.notes ?? { nose: "", palate: "", finish: "", overall: "" });
  const [showFlash, setShowFlash] = useState(false);
  const [visibleContent, setVisibleContent] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentPhase = PHASES[phaseIndex];
  const phase = th.phases[currentPhase];

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
        setPhaseIndex((p) => p + 1);
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
          setPhaseIndex((p) => p + 1);
          setVisibleContent(true);
        } else {
          onDone({ scores, tags, notes });
        }
      }, 100);
    }, 300);
  }, [phaseIndex, scores, tags, notes, onDone]);

  const goTo = useCallback((i: number) => {
    setVisibleContent(false);
    setTimeout(() => {
      setPhaseIndex(i);
      setVisibleContent(true);
    }, 120);
  }, []);

  const handleScoreChange = useCallback((v: number) => {
    setScores((prev) => ({ ...prev, [currentPhase]: v }));
  }, [currentPhase]);

  const handleTagToggle = useCallback((tag: string) => {
    setTags((prev) => {
      const curr = prev[currentPhase];
      const next = curr.includes(tag) ? curr.filter((t) => t !== tag) : [...curr, tag];
      return { ...prev, [currentPhase]: next };
    });
  }, [currentPhase]);

  const handleNoteChange = useCallback((val: string) => {
    setNotes((prev) => ({ ...prev, [currentPhase]: val }));
  }, [currentPhase]);

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
    <div style={{ position: "relative", minHeight: "100dvh", paddingBottom: 140 }}>
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: 200,
          background: `radial-gradient(ellipse at center bottom, ${phase.glow}, transparent 70%)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <SaveConfirm show={showFlash} color={phase.accent} />

      <div style={{
        position: "sticky",
        top: 52,
        zIndex: 10,
        background: th.headerBg,
        backdropFilter: "blur(24px)",
        padding: `${SP.sm}px ${SP.md}px`,
        borderBottom: `1px solid ${th.border}`,
      }}>
        <div style={{ display: "flex", gap: SP.xs }}>
          {PHASES.map((pid, i) => {
            const pPhase = th.phases[pid];
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
                  background: isActive ? pPhase.dim : "transparent",
                  border: isActive ? `1px solid ${pPhase.accent}44` : "1px solid transparent",
                  borderRadius: RADIUS.md,
                  cursor: "pointer",
                  minHeight: TOUCH_MIN,
                  transition: "all 0.2s",
                }}
              >
                <PhaseSignature phaseId={pid} th={th} size="normal" />
                <span style={{
                  fontSize: 10,
                  fontFamily: FONT.body,
                  color: isActive ? pPhase.accent : th.faint,
                  fontWeight: isActive ? 600 : 400,
                }}>
                  {phaseLabel(pid, labels)}
                </span>
                {isDone && (
                  <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <CheckIcon color={pPhase.accent} size={10} />
                    <span style={{ fontSize: 10, color: pPhase.accent, fontWeight: 600 }}>
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
          <PhaseSignature phaseId={currentPhase} th={th} size="large" />
          <span style={{
            fontSize: 11,
            fontFamily: FONT.body,
            fontWeight: 600,
            color: phase.accent,
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
            color: th.text,
            marginBottom: SP.xs,
          }}
        >
          {phaseQuestion(currentPhase, labels)}
        </h2>

        <p style={{
          fontFamily: FONT.serif,
          fontSize: 15,
          fontStyle: "italic",
          color: th.muted,
          marginBottom: SP.lg,
        }}>
          {phaseHint(currentPhase, labels)}
        </p>

        <div style={{
          background: th.bgCard,
          border: `1px solid ${th.border}`,
          borderRadius: RADIUS.lg,
          padding: SP.lg,
          marginBottom: SP.lg,
        }}>
          <ScoreInput
            value={scores[currentPhase]}
            onChange={handleScoreChange}
            phaseId={currentPhase}
            th={th}
            labels={scoreLabels}
          />
        </div>

        {currentPhase !== "overall" && (
          <FlavorTags
            phaseId={currentPhase}
            whiskyRegion={whisky.region}
            whiskyCask={whisky.cask}
            blind={whisky.blind}
            selected={tags[currentPhase]}
            onToggle={handleTagToggle}
            th={th}
            labels={flavorLabels}
          />
        )}

        <div style={{ marginTop: SP.lg }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: th.text, marginBottom: SP.xs, fontFamily: FONT.body }}>
            {labels.note}
          </div>
          <div style={{ fontSize: 14, color: th.muted, marginBottom: SP.sm, fontFamily: FONT.body }}>
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
              color: th.text,
              background: th.inputBg,
              border: `1px solid ${th.border}`,
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
            bottom: 70,
            left: SP.md,
            right: SP.md,
            padding: `${SP.sm}px ${SP.md}px`,
            background: `${th.amber}18`,
            border: `1px solid ${th.amber}44`,
            borderRadius: RADIUS.md,
            display: "flex",
            alignItems: "center",
            gap: SP.sm,
            zIndex: 20,
          }}
        >
          <AlertTriangleIcon color={th.amber} size={18} />
          <span style={{ fontSize: 13, color: th.amber, fontFamily: FONT.body }}>{saveError}</span>
        </div>
      )}

      <div style={{
        position: "fixed",
        bottom: 8,
        left: SP.md,
        right: SP.md,
        zIndex: 15,
      }}>
        <div style={{ display: "flex", gap: SP.sm }}>
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
              border: `1px solid ${th.border}`,
              background: th.bgCard,
              color: th.text,
              fontFamily: FONT.body,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            {phaseIndex > 0 ? phaseLabel(PHASES[phaseIndex - 1], labels) : labels.save === labels.save ? "\u2190" : "\u2190"}
          </button>
          <button
            data-testid="rating-next-btn"
            onClick={handleNext}
            style={{
              flex: 1,
              height: 56,
              background: `linear-gradient(135deg, ${th.gold}, ${th.amber})`,
              color: "#0e0b05",
              border: "none",
              borderRadius: RADIUS.full,
              fontSize: 17,
              fontWeight: 700,
              fontFamily: FONT.body,
              cursor: "pointer",
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

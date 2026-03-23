import { useState, useEffect, useRef, useCallback } from "react";
import type { ThemeTokens } from "../../tokens";
import { SP, FONT, RADIUS, TAB_BAR_H, TOUCH_MIN } from "../../tokens";
import type { Translations } from "../../i18n";
import type { PhaseId, RatingData, PhaseScores, PhaseTags, PhaseNotes } from "../../types/rating";
import ScoreInput from "../../components/ScoreInput";
import FlavorTags from "../../components/FlavorTags";
import PhaseSignature from "../../components/PhaseSignature";
import SaveConfirm from "../../components/SaveConfirm";
import { AlertTriangle, Check } from "../../icons";

interface GuidedRatingProps {
  th: ThemeTokens;
  t: Translations;
  whisky: {
    id?: string;
    name?: string;
    region?: string;
    cask?: string;
    blind: boolean;
    flavorProfile?: string;
  };
  tastingId: string;
  dramIdx: number;
  total: number;
  tastingStatus: string;
  participantId: string;
  existingRating?: RatingData | null;
  onDone: (data: RatingData) => void;
  onBack: () => void;
}

const PHASES: PhaseId[] = ["nose", "palate", "finish", "overall"];

function phaseLabelKey(id: PhaseId): keyof Translations {
  const map: Record<PhaseId, keyof Translations> = {
    nose: "ratingNose",
    palate: "ratingPalate",
    finish: "ratingFinish",
    overall: "ratingOverall",
  };
  return map[id];
}

function phaseQKey(id: PhaseId): keyof Translations {
  const map: Record<PhaseId, keyof Translations> = {
    nose: "ratingQ_nose",
    palate: "ratingQ_palate",
    finish: "ratingQ_finish",
    overall: "ratingQ_overall",
  };
  return map[id];
}

function phaseHintKey(id: PhaseId): keyof Translations {
  const map: Record<PhaseId, keyof Translations> = {
    nose: "ratingHint_nose",
    palate: "ratingHint_palate",
    finish: "ratingHint_finish",
    overall: "ratingHint_overall",
  };
  return map[id];
}

export default function GuidedRating({
  th, t, whisky, tastingId, dramIdx, total, tastingStatus, participantId, existingRating, onDone, onBack,
}: GuidedRatingProps) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [scores, setScores] = useState<PhaseScores>(
    existingRating ? { ...existingRating.scores } : { nose: 75, palate: 75, finish: 75, overall: 75 }
  );
  const [tags, setTags] = useState<PhaseTags>(
    existingRating ? { nose: [...existingRating.tags.nose], palate: [...existingRating.tags.palate], finish: [...existingRating.tags.finish], overall: [...existingRating.tags.overall] } : { nose: [], palate: [], finish: [], overall: [] }
  );
  const [notes, setNotes] = useState<PhaseNotes>(
    existingRating ? { ...existingRating.notes } : { nose: "", palate: "", finish: "", overall: "" }
  );
  const [showFlash, setShowFlash] = useState(false);
  const [visibleContent, setVisibleContent] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentPhase = PHASES[phaseIndex];
  const phase = th.phases[currentPhase];

  const doSave = useCallback(async () => {
    if (tastingStatus !== "open" && tastingStatus !== "draft") return;
    try {
      const body: Record<string, unknown> = {
        tastingId,
        whiskyId: whisky.id || "unknown",
        participantId,
        nose: scores.nose,
        taste: scores.palate,
        finish: scores.finish,
        overall: scores.overall,
        notes: Object.values(notes).filter(Boolean).join(" | "),
      };
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-participant-id": participantId },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Error" }));
        throw new Error(err.message || "Save failed");
      }
      setSaveError(null);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : t.ratingError);
    }
  }, [tastingId, whisky.id, participantId, scores, notes, tastingStatus, t.ratingError]);

  useEffect(() => {
    if (!isDirty) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { doSave(); }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [scores, notes, doSave, isDirty]);

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
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); doSave(); }

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
  }, [phaseIndex, scores, tags, notes, onDone, doSave]);

  const goTo = useCallback((i: number) => {
    setVisibleContent(false);
    setTimeout(() => {
      setPhaseIndex(i);
      setVisibleContent(true);
    }, 120);
  }, []);

  const handleScoreChange = useCallback((v: number) => {
    setScores((prev) => ({ ...prev, [currentPhase]: v }));
    setIsDirty(true);
  }, [currentPhase]);

  const handleTagToggle = useCallback((tag: string) => {
    setTags((prev) => {
      const curr = prev[currentPhase];
      const next = curr.includes(tag) ? curr.filter((t) => t !== tag) : [...curr, tag];
      return { ...prev, [currentPhase]: next };
    });
    setIsDirty(true);
  }, [currentPhase]);

  const handleNoteChange = useCallback((val: string) => {
    setNotes((prev) => ({ ...prev, [currentPhase]: val }));
    setIsDirty(true);
  }, [currentPhase]);

  const nextPhaseLabel = phaseIndex < 3 ? String(t[phaseLabelKey(PHASES[phaseIndex + 1])]) : "";

  return (
    <div style={{ position: "relative", minHeight: "100dvh", paddingBottom: TAB_BAR_H + 80 }}>
      <div
        style={{
          position: "fixed",
          bottom: TAB_BAR_H - 16,
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
        top: 56,
        zIndex: 10,
        background: th.headerBg,
        backdropFilter: "blur(24px)",
        padding: `${SP.sm}px ${SP.md}px`,
        borderBottom: `1px solid ${th.border}`,
      }}>
        <div style={{ display: "flex", gap: SP.xs, marginBottom: SP.sm }}>
          {Array.from({ length: total }, (_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: i < dramIdx ? th.gold : th.border,
                opacity: i < dramIdx ? 1 : 0.4,
              }}
            />
          ))}
        </div>

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
                  {String(t[phaseLabelKey(pid)])}
                </span>
                {isDone && (
                  <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Check color={pPhase.accent} size={10} />
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
            {String(t[phaseLabelKey(currentPhase)])}
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
          {String(t[phaseQKey(currentPhase)])}
        </h2>

        <p style={{
          fontFamily: FONT.serif,
          fontSize: 15,
          fontStyle: "italic",
          color: th.muted,
          marginBottom: SP.lg,
        }}>
          {String(t[phaseHintKey(currentPhase)])}
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
            t={t}
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
            th={th}
            t={t}
          />
        )}

        <div style={{ marginTop: SP.lg }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: th.text, marginBottom: SP.xs, fontFamily: FONT.body }}>
            {t.ratingNote}
          </div>
          <div style={{ fontSize: 14, color: th.muted, marginBottom: SP.sm, fontFamily: FONT.body }}>
            {t.ratingNoteSub}
          </div>
          <textarea
            data-testid={`phase-notes-${currentPhase}`}
            value={notes[currentPhase]}
            onChange={(e) => handleNoteChange(e.target.value)}
            placeholder={`${String(t[phaseLabelKey(currentPhase)])}: ${t.ratingNotePH}`}
            rows={3}
            style={{
              width: "100%",
              padding: SP.md,
              fontFamily: FONT.body,
              fontSize: 14,
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
            bottom: TAB_BAR_H + 70,
            left: SP.md,
            right: SP.md,
            padding: `${SP.sm}px ${SP.md}px`,
            background: `${th.amber}28`,
            border: `1px solid ${th.amber}44`,
            borderRadius: RADIUS.md,
            display: "flex",
            alignItems: "center",
            gap: SP.sm,
            zIndex: 20,
          }}
        >
          <AlertTriangle color={th.amber} size={18} />
          <span style={{ fontSize: 13, color: th.amber, fontFamily: FONT.body }}>{saveError}</span>
        </div>
      )}

      <div style={{
        position: "fixed",
        bottom: TAB_BAR_H + 8,
        left: SP.md,
        right: SP.md,
        zIndex: 15,
      }}>
        <button
          data-testid="rating-next-btn"
          onClick={handleNext}
          style={{
            width: "100%",
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
            ? `${String(t[phaseLabelKey(currentPhase)])} ${t.ratingSave} \u2192 ${nextPhaseLabel}`
            : t.ratingFinish2
          }
        </button>
      </div>
    </div>
  );
}

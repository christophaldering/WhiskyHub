import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SP, FONT, RADIUS, TOUCH_MIN } from "./theme";
import type { PhaseId, PhaseScores, PhaseTags, PhaseNotes, RatingData } from "./types";
import type { RatingScale } from "@/labs/hooks/useRatingScale";
import ScoreInput from "./ScoreInput";
import FlavorTags from "./FlavorTags";
import PhaseSignature from "./PhaseSignature";
import { ChevronDownIcon, AlertTriangleIcon, CheckIcon } from "./icons";

interface CompactLabels {
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
  nose: string;
  palate: string;
  finishLabel: string;
  overall: string;
  note: string;
  noteSub: string;
  notePH: string;
  save: string;
  done: string;
  error: string;
  finish2: string;
}

interface CompactRatingProps {
  labels: CompactLabels;
  whisky: {
    name?: string;
    region?: string;
    cask?: string;
    blind: boolean;
    flavorProfile?: string;
  };
  initialData?: RatingData;
  onDone: (data: RatingData) => void;
  onBack: () => void;
  onChange?: (phaseIndex: number, data: Partial<RatingData>) => void;
  onSaveAsDraft?: (data: RatingData) => void;
  scale?: RatingScale;
}

const PHASES: PhaseId[] = ["nose", "palate", "finish", "overall"];

function phaseLbl(id: PhaseId, l: CompactLabels): string {
  const map: Record<PhaseId, string> = {
    nose: l.nose, palate: l.palate, finish: l.finishLabel, overall: l.overall,
  };
  return map[id];
}

function getBandColor(score: number, scaleMax: number): string {
  const pctValue = scaleMax > 0 ? (score / scaleMax) * 100 : 0;
  if (pctValue >= 90) return "#d4a847";
  if (pctValue >= 85) return "#c4a040";
  if (pctValue >= 80) return "#86c678";
  if (pctValue >= 70) return "#7ab8c4";
  return "rgba(200,180,160,0.5)";
}

export default function CompactRating({ labels, whisky, initialData, onDone, onBack, onChange, onSaveAsDraft, scale }: CompactRatingProps) {
  const { t } = useTranslation();
  const scaleMax = scale?.max ?? 100;
  const scaleStep = scale?.step ?? 0.5;
  const defaultScore = scaleMax === 100 ? 75 : Math.round((scaleMax * 0.75) / scaleStep) * scaleStep;
  const overallInv = scaleStep > 0 ? 1 / scaleStep : 2;
  const [scores, setScores] = useState<PhaseScores>(() => {
    const init = initialData?.scores ?? { nose: defaultScore, palate: defaultScore, finish: defaultScore, overall: defaultScore };
    if (!initialData?.scores) {
      return { ...init, overall: Math.round(((init.nose + init.palate + init.finish) / 3) * overallInv) / overallInv };
    }
    return init;
  });
  const [tags, setTags] = useState<PhaseTags>(initialData?.tags ?? { nose: [], palate: [], finish: [], overall: [] });
  const [notes, setNotes] = useState<PhaseNotes>(initialData?.notes ?? { nose: "", palate: "", finish: "", overall: "" });
  const [openPhase, setOpenPhase] = useState<PhaseId | null>("nose");
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [saving, setSaving] = useState(false);
  const [submitHover, setSubmitHover] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [overallManuallySet, setOverallManuallySet] = useState(() => {
    if (!initialData?.scores) return false;
    const s = initialData.scores;
    return s.overall !== Math.round(((s.nose + s.palate + s.finish) / 3) * overallInv) / overallInv;
  });
  const [overallRated, setOverallRated] = useState(() => {
    if (!initialData?.scores) return false;
    if (initialData.overallExplicit === true) return true;
    const s = initialData.scores;
    const hasAllDims =
      typeof s.nose === "number" &&
      typeof s.palate === "number" &&
      typeof s.finish === "number" &&
      typeof s.overall === "number";
    return hasAllDims;
  });
  const autoDraftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  const computeAutoOverall = (s: PhaseScores) =>
    Math.round(((s.nose + s.palate + s.finish) / 3) * overallInv) / overallInv;

  const overallAvg = Math.round(((scores.nose + scores.palate + scores.finish + scores.overall) / 4) * overallInv) / overallInv;

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

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!onSaveAsDraft) return;
    if (autoDraftTimer.current) clearTimeout(autoDraftTimer.current);
    autoDraftTimer.current = setTimeout(() => {
      onSaveAsDraft({ scores, tags, notes, overallExplicit: overallRated });
    }, 2000);
    return () => {
      if (autoDraftTimer.current) clearTimeout(autoDraftTimer.current);
    };
  }, [scores, tags, notes, onSaveAsDraft, overallRated]);

  const handleSubmit = useCallback(async () => {
    if (autoDraftTimer.current) {
      clearTimeout(autoDraftTimer.current);
      autoDraftTimer.current = null;
    }
    setSaving(true);
    setTimeout(() => {
      onDone({ scores, tags, notes, overallExplicit: true });
    }, 400);
  }, [scores, tags, notes, onDone]);

  const canFinalize = overallRated;

  return (
    <div style={{ padding: `${SP.md}px`, paddingBottom: 200 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: SP.lg }}>
        <div>
          {!whisky.blind && whisky.name && (
            <div style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 600, color: "var(--labs-text)" }}>
              {whisky.name}
            </div>
          )}
          {!whisky.blind && whisky.region && (
            <div style={{ fontSize: 13, color: "var(--labs-text-muted)", fontFamily: FONT.body }}>{whisky.region}</div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            data-testid="compact-overall-avg"
            style={{
              fontSize: 42,
              fontWeight: 700,
              fontFamily: FONT.body,
              color: getBandColor(overallAvg, scaleMax),
              lineHeight: 1,
              display: "flex",
              alignItems: "baseline",
              gap: 1,
            }}
          >
            {scaleMax === 100 || overallAvg % 1 === 0 ? overallAvg : overallAvg.toFixed(1)}
            <span style={{ fontSize: 16, fontWeight: 400, color: "var(--labs-text-secondary)", opacity: 0.55, marginLeft: 2 }}>/{scaleMax}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--labs-text-secondary)", fontFamily: FONT.body }}>{t("ratingUi.avg")}</div>
        </div>
      </div>

      {PHASES.map((pid) => {
        const pAccent = `var(--labs-phase-${pid})`;
        const pDim = `var(--labs-phase-${pid}-dim)`;
        const isOpen = openPhase === pid;
        const pctMin = scaleMax === 100 ? 60 : 0;
        const pctRange = scaleMax - pctMin;
        const pct = pctRange > 0 ? Math.max(0, Math.min(100, ((scores[pid] - pctMin) / pctRange) * 100)) : 0;
        const tagCount = tags[pid].length;

        return (
          <div
            key={pid}
            ref={(el) => { sectionRefs.current[pid] = el; }}
            data-testid={`compact-card-${pid}`}
            style={{
              background: "var(--labs-surface)",
              border: "1px solid var(--labs-border)",
              borderRadius: 18,
              marginBottom: SP.sm + 4,
              overflow: "hidden",
            }}
          >
            <button
              data-testid={`compact-header-${pid}`}
              onClick={() => {
                const next = isOpen ? null : pid;
                setOpenPhase(next);
                if (next) {
                  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                  setTimeout(() => {
                    sectionRefs.current[pid]?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
                  }, 50);
                }
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: SP.sm,
                padding: `${SP.sm}px ${SP.md}px`,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                minHeight: TOUCH_MIN,
              }}
            >
              <PhaseSignature phaseId={pid} size="normal" />
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)", fontFamily: FONT.body }}>
                {phaseLbl(pid, labels)}
              </span>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--labs-border)", marginLeft: SP.sm, marginRight: SP.sm }}>
                <div style={{ height: "100%", borderRadius: 2, background: pAccent, width: `${pct}%`, transition: "width 0.2s" }} />
              </div>
              {tagCount > 0 && (
                <span style={{ fontSize: 10, color: "var(--labs-text-secondary)", fontFamily: FONT.body }}>{tagCount}</span>
              )}
              <ChevronDownIcon
                color="var(--labs-text-secondary)"
                size={18}
                style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}
              />
            </button>

            {isOpen && (
              <div style={{ borderTop: "1px solid var(--labs-border)", padding: `${SP.md}px ${SP.md}px ${SP.lg}px` }}>
                <ScoreInput scale={scale} value={scores[pid]} onChange={(v) => {
                  if (pid === "overall") {
                    setOverallManuallySet(true);
                    setOverallRated(true);
                  }
                  setScores((p) => {
                    const next = { ...p, [pid]: v };
                    if (pid !== "overall" && !overallManuallySet) {
                      next.overall = computeAutoOverall(next);
                    }
                    onChange?.(0, { scores: next, tags, notes });
                    return next;
                  });
                }} phaseId={pid} labels={scoreLabels} />
                {pid === "overall" && (
                  <div
                    data-testid="compact-overall-auto-hint"
                    style={{
                      marginTop: SP.sm,
                      fontSize: 12,
                      fontFamily: FONT.body,
                      color: overallManuallySet ? "var(--labs-text-secondary)" : "var(--labs-text-muted)",
                      textAlign: "center",
                    }}
                  >
                    {overallManuallySet
                      ? t("ratingUi.overallManual", "Manual override")
                      : t("ratingUi.overallAuto", "Average of sub-scores")}
                    {overallManuallySet && (
                      <button
                        data-testid="compact-overall-reset-btn"
                        onClick={() => {
                          setOverallManuallySet(false);
                          const auto = computeAutoOverall(scores);
                          setScores((prev) => {
                            const next = { ...prev, overall: auto };
                            onChange?.(0, { scores: next, tags, notes });
                            return next;
                          });
                        }}
                        style={{
                          marginLeft: SP.sm,
                          fontSize: 12,
                          fontFamily: FONT.body,
                          color: "var(--labs-phase-overall)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          textDecoration: "underline",
                          padding: 0,
                        }}
                      >
                        {t("ratingUi.overallReset", "Reset to average")}
                      </button>
                    )}
                  </div>
                )}
                {pid !== "overall" && (
                  <FlavorTags
                    phaseId={pid}
                    whiskyRegion={whisky.region}
                    whiskyCask={whisky.cask}
                    whiskyFlavorProfile={whisky.flavorProfile}
                    blind={whisky.blind}
                    selected={tags[pid]}
                    onToggle={(tag) => {
                      setTags((prev) => {
                        const curr = prev[pid];
                        const next = curr.includes(tag) ? curr.filter((t) => t !== tag) : [...curr, tag];
                        const updated = { ...prev, [pid]: next };
                        onChange?.(0, { scores, tags: updated, notes });
                        return updated;
                      });
                    }}
                    labels={flavorLabels}
                  />
                )}
                <div style={{ marginTop: SP.md }}>
                  <div style={{ fontSize: 13, color: "var(--labs-text-muted)", marginBottom: SP.xs, fontFamily: FONT.body }}>
                    {labels.noteSub}
                  </div>
                  <textarea
                    data-testid={`compact-notes-${pid}`}
                    value={notes[pid]}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNotes((prev) => {
                        const next = { ...prev, [pid]: val };
                        onChange?.(0, { scores, tags, notes: next });
                        return next;
                      });
                    }}
                    placeholder={`${phaseLbl(pid, labels)}: ${labels.notePH}`}
                    rows={2}
                    style={{
                      width: "100%",
                      padding: SP.md,
                      fontFamily: FONT.serif,
                      fontStyle: "italic",
                      fontSize: 15,
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
            )}
          </div>
        );
      })}

      <div style={{
        background: "var(--labs-surface)",
        border: "1px solid var(--labs-border)",
        borderRadius: RADIUS.lg,
        padding: SP.md,
        marginTop: SP.md,
      }}>
        {PHASES.map((pid) => (
          <div key={pid} style={{ display: "flex", alignItems: "center", gap: SP.sm, marginBottom: SP.xs }}>
            <PhaseSignature phaseId={pid} size="normal" />
            <span style={{ fontSize: 13, color: "var(--labs-text)", fontFamily: FONT.body, flex: 1 }}>
              {phaseLbl(pid, labels)}
            </span>
            <span style={{ fontSize: 15, fontWeight: 600, color: getBandColor(scores[pid], scaleMax), fontFamily: FONT.body }}>
              {scaleMax === 100 || scores[pid] % 1 === 0 ? scores[pid] : scores[pid].toFixed(1)}
            </span>
          </div>
        ))}
        {PHASES.filter((pid) => tags[pid].length > 0).map((pid) => (
          <div key={`tags-${pid}`} style={{ display: "flex", flexWrap: "wrap", gap: SP.xs, marginTop: SP.xs }}>
            {tags[pid].map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 11,
                  padding: `2px ${SP.sm}px`,
                  borderRadius: 10,
                  background: `var(--labs-phase-${pid}-dim)`,
                  color: `var(--labs-phase-${pid})`,
                  fontFamily: FONT.body,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        ))}
      </div>

      {saveError && (
        <div
          data-testid="compact-error-banner"
          style={{
            marginTop: SP.md,
            padding: `${SP.sm}px ${SP.md}px`,
            background: "color-mix(in srgb, var(--labs-amber) 9%, transparent)",
            border: "1px solid color-mix(in srgb, var(--labs-amber) 27%, transparent)",
            borderRadius: RADIUS.md,
            display: "flex",
            alignItems: "center",
            gap: SP.sm,
          }}
        >
          <AlertTriangleIcon color="var(--labs-amber)" size={18} />
          <span style={{ fontSize: 13, color: "var(--labs-amber)", fontFamily: FONT.body }}>{saveError}</span>
        </div>
      )}

      <div style={{
        position: "fixed",
        bottom: "calc(72px + env(safe-area-inset-bottom, 8px))",
        left: SP.md,
        right: SP.md,
        zIndex: 15,
      }}>
        <div style={{ display: "flex", gap: SP.sm }}>
          <button
            data-testid="compact-submit-btn"
            onClick={handleSubmit}
            onMouseEnter={() => setSubmitHover(true)}
            onMouseLeave={() => setSubmitHover(false)}
            disabled={saving || !canFinalize}
            style={
              !saving && !canFinalize
                ? {
                    flex: 1,
                    height: 56,
                    background: "transparent",
                    color: "var(--color-text-muted)",
                    border: "none",
                    borderRadius: 0,
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: FONT.body,
                    cursor: "default",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: SP.sm,
                    textAlign: "center",
                    padding: 0,
                  }
                : {
                    flex: 1,
                    height: 56,
                    background: saving
                      ? "color-mix(in srgb, var(--labs-success) 13%, transparent)"
                      : submitHover
                        ? "color-mix(in srgb, var(--labs-gold) 12%, var(--labs-surface-elevated))"
                        : "var(--labs-surface-elevated)",
                    color: saving
                      ? "var(--labs-success)"
                      : "var(--labs-gold)",
                    border: saving
                      ? "1px solid color-mix(in srgb, var(--labs-success) 27%, transparent)"
                      : `1px solid color-mix(in srgb, var(--labs-gold) ${submitHover ? 65 : 38}%, transparent)`,
                    transition: "background 0.15s, border-color 0.15s",
                    borderRadius: RADIUS.full,
                    fontSize: 15,
                    fontWeight: 600,
                    fontFamily: FONT.body,
                    cursor: saving ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: SP.sm,
                    opacity: 1,
                  }
            }
          >
            {saving ? (
              <>
                <CheckIcon color="var(--labs-success)" size={20} />
                {labels.done}
              </>
            ) : canFinalize ? (
              labels.finish2
            ) : (
              t("v2.rateOverallFirst", "Bewerte Overall um abzuschließen")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

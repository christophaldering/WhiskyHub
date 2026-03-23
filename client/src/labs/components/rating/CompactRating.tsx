import { useState, useCallback } from "react";
import { SP, FONT, RADIUS, TOUCH_MIN } from "./theme";
import type { PhaseId, PhaseScores, PhaseTags, PhaseNotes, RatingData } from "./types";
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
}

const PHASES: PhaseId[] = ["nose", "palate", "finish", "overall"];

function phaseLbl(id: PhaseId, l: CompactLabels): string {
  const map: Record<PhaseId, string> = {
    nose: l.nose, palate: l.palate, finish: l.finishLabel, overall: l.overall,
  };
  return map[id];
}

function getBandColor(score: number): string {
  if (score >= 90) return "#d4a847";
  if (score >= 85) return "#c4a040";
  if (score >= 80) return "#86c678";
  if (score >= 70) return "#7ab8c4";
  return "rgba(200,180,160,0.5)";
}

export default function CompactRating({ labels, whisky, initialData, onDone, onBack }: CompactRatingProps) {
  const [scores, setScores] = useState<PhaseScores>(initialData?.scores ?? { nose: 75, palate: 75, finish: 75, overall: 75 });
  const [tags, setTags] = useState<PhaseTags>(initialData?.tags ?? { nose: [], palate: [], finish: [], overall: [] });
  const [notes, setNotes] = useState<PhaseNotes>(initialData?.notes ?? { nose: "", palate: "", finish: "", overall: "" });
  const [openPhase, setOpenPhase] = useState<PhaseId | null>("nose");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const overallAvg = Math.round((scores.nose + scores.palate + scores.finish + scores.overall) / 4);

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

  const handleSubmit = useCallback(async () => {
    setSaving(true);
    setTimeout(() => {
      onDone({ scores, tags, notes });
    }, 400);
  }, [scores, tags, notes, onDone]);

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
              color: getBandColor(overallAvg),
              lineHeight: 1,
            }}
          >
            {overallAvg}
          </div>
          <div style={{ fontSize: 11, color: "var(--labs-text-secondary)", fontFamily: FONT.body }}>avg</div>
        </div>
      </div>

      {PHASES.map((pid) => {
        const pAccent = `var(--labs-phase-${pid})`;
        const pDim = `var(--labs-phase-${pid}-dim)`;
        const isOpen = openPhase === pid;
        const pct = ((scores[pid] - 60) / 40) * 100;
        const tagCount = tags[pid].length;

        return (
          <div
            key={pid}
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
              onClick={() => setOpenPhase(isOpen ? null : pid)}
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
              <span style={{ fontSize: 28, fontWeight: 700, color: getBandColor(scores[pid]), fontFamily: FONT.body, minWidth: 36, textAlign: "right" }}>
                {scores[pid]}
              </span>
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
                <ScoreInput value={scores[pid]} onChange={(v) => setScores((p) => ({ ...p, [pid]: v }))} phaseId={pid} labels={scoreLabels} />
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
                        return { ...prev, [pid]: next };
                      });
                    }}
                    labels={flavorLabels}
                  />
                )}
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
            <span style={{ fontSize: 15, fontWeight: 600, color: getBandColor(scores[pid]), fontFamily: FONT.body }}>
              {scores[pid]}
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
            data-testid="compact-back-btn"
            onClick={onBack}
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
            }}
          >
            {"\u2190"}
          </button>
          <button
            data-testid="compact-submit-btn"
            onClick={handleSubmit}
            disabled={saving}
            style={{
              flex: 1,
              height: 56,
              background: saving
                ? "color-mix(in srgb, var(--labs-success) 13%, transparent)"
                : "linear-gradient(135deg, var(--labs-gold), var(--labs-amber))",
              color: saving ? "var(--labs-success)" : "var(--labs-accent-dark)",
              border: saving ? "1px solid color-mix(in srgb, var(--labs-success) 27%, transparent)" : "none",
              borderRadius: RADIUS.full,
              fontSize: 17,
              fontWeight: 700,
              fontFamily: FONT.body,
              cursor: saving ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: SP.sm,
            }}
          >
            {saving ? (
              <>
                <CheckIcon color="var(--labs-success)" size={20} />
                {labels.done}
              </>
            ) : (
              labels.finish2
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";
import type { ThemeTokens } from "../../tokens";
import { SP, FONT, RADIUS, TAB_BAR_H, TOUCH_MIN } from "../../tokens";
import type { Translations } from "../../i18n";
import type { PhaseId, RatingData, PhaseScores, PhaseTags, PhaseNotes } from "../../types/rating";
import ScoreInput from "../../components/ScoreInput";
import FlavorTags from "../../components/FlavorTags";
import PhaseSignature from "../../components/PhaseSignature";
import { ChevronDown, AlertTriangle, Check } from "../../icons";

interface CompactRatingProps {
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
  onDone: (data: RatingData) => void;
  onBack: () => void;
}

const PHASES: PhaseId[] = ["nose", "palate", "finish", "overall"];

function phaseLabelKey(id: PhaseId): keyof Translations {
  const map: Record<PhaseId, keyof Translations> = {
    nose: "ratingNose", palate: "ratingPalate", finish: "ratingFinish", overall: "ratingOverall",
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

export default function CompactRating({
  th, t, whisky, tastingId, dramIdx, total, tastingStatus, participantId, onDone,
}: CompactRatingProps) {
  const [scores, setScores] = useState<PhaseScores>({ nose: 75, palate: 75, finish: 75, overall: 75 });
  const [tags, setTags] = useState<PhaseTags>({ nose: [], palate: [], finish: [], overall: [] });
  const [notes, setNotes] = useState<PhaseNotes>({ nose: "", palate: "", finish: "", overall: "" });
  const [openPhase, setOpenPhase] = useState<PhaseId | null>("nose");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const overallAvg = Math.round((scores.nose + scores.palate + scores.finish + scores.overall) / 4);

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
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { doSave(); }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [scores, notes, doSave]);

  const handleSubmit = useCallback(async () => {
    setSaving(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    await doSave();
    setTimeout(() => {
      onDone({ scores, tags, notes });
    }, 400);
  }, [scores, tags, notes, onDone, doSave]);

  return (
    <div style={{ padding: `${SP.md}px`, paddingBottom: TAB_BAR_H + 80 }}>
      <div style={{ display: "flex", gap: SP.xs, marginBottom: SP.md }}>
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            style={{
              flex: 1, height: 4, borderRadius: 2,
              background: i < dramIdx ? th.gold : th.border,
              opacity: i < dramIdx ? 1 : 0.4,
            }}
          />
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: SP.lg }}>
        <div>
          {!whisky.blind && whisky.name && (
            <div style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 600, color: th.text }}>
              {whisky.name}
            </div>
          )}
          {!whisky.blind && whisky.region && (
            <div style={{ fontSize: 13, color: th.muted, fontFamily: FONT.body }}>{whisky.region}</div>
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
          <div style={{ fontSize: 11, color: th.faint, fontFamily: FONT.body }}>avg</div>
        </div>
      </div>

      {PHASES.map((pid) => {
        const pPhase = th.phases[pid];
        const isOpen = openPhase === pid;
        const pct = ((scores[pid] - 60) / 40) * 100;
        const tagCount = tags[pid].length;

        return (
          <div
            key={pid}
            data-testid={`compact-card-${pid}`}
            style={{
              background: th.bgCard,
              border: `1px solid ${th.border}`,
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
              <PhaseSignature phaseId={pid} th={th} size="normal" />
              <span style={{ fontSize: 14, fontWeight: 600, color: th.text, fontFamily: FONT.body }}>
                {String(t[phaseLabelKey(pid)])}
              </span>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: th.border, marginLeft: SP.sm, marginRight: SP.sm }}>
                <div style={{ height: "100%", borderRadius: 2, background: pPhase.accent, width: `${pct}%`, transition: "width 0.2s" }} />
              </div>
              <span style={{ fontSize: 28, fontWeight: 700, color: getBandColor(scores[pid]), fontFamily: FONT.body, minWidth: 36, textAlign: "right" }}>
                {scores[pid]}
              </span>
              {tagCount > 0 && (
                <span style={{ fontSize: 10, color: th.faint, fontFamily: FONT.body }}>{tagCount}</span>
              )}
              <ChevronDown
                color={th.faint}
                size={18}
                style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}
              />
            </button>

            {isOpen && (
              <div style={{ borderTop: `1px solid ${th.border}`, padding: `${SP.md}px ${SP.md}px ${SP.lg}px` }}>
                <ScoreInput value={scores[pid]} onChange={(v) => setScores((p) => ({ ...p, [pid]: v }))} phaseId={pid} th={th} t={t} />
                {pid !== "overall" && (
                  <FlavorTags
                    phaseId={pid}
                    whiskyRegion={whisky.region}
                    whiskyCask={whisky.cask}
                    blind={whisky.blind}
                    selected={tags[pid]}
                    onToggle={(tag) => {
                      setTags((prev) => {
                        const curr = prev[pid];
                        const next = curr.includes(tag) ? curr.filter((t) => t !== tag) : [...curr, tag];
                        return { ...prev, [pid]: next };
                      });
                    }}
                    th={th}
                    t={t}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}

      <div style={{
        background: th.bgCard,
        border: `1px solid ${th.border}`,
        borderRadius: RADIUS.lg,
        padding: SP.md,
        marginTop: SP.md,
      }}>
        {PHASES.map((pid) => (
          <div key={pid} style={{ display: "flex", alignItems: "center", gap: SP.sm, marginBottom: SP.xs }}>
            <PhaseSignature phaseId={pid} th={th} size="normal" />
            <span style={{ fontSize: 13, color: th.text, fontFamily: FONT.body, flex: 1 }}>
              {String(t[phaseLabelKey(pid)])}
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
                  background: th.phases[pid].dim,
                  color: th.phases[pid].accent,
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
            background: `${th.amber}18`,
            border: `1px solid ${th.amber}44`,
            borderRadius: RADIUS.md,
            display: "flex",
            alignItems: "center",
            gap: SP.sm,
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
          data-testid="compact-submit-btn"
          onClick={handleSubmit}
          disabled={saving}
          style={{
            width: "100%",
            height: 56,
            background: saving
              ? `${th.green}22`
              : `linear-gradient(135deg, ${th.gold}, ${th.amber})`,
            color: saving ? th.green : "#0e0b05",
            border: saving ? `1px solid ${th.green}44` : "none",
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
              <Check color={th.green} size={20} />
              {t.ratingDone}
            </>
          ) : (
            `${t.ratingDram} ${dramIdx} ${t.ratingSave} \u2192`
          )}
        </button>
      </div>
    </div>
  );
}

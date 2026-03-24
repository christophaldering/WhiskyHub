import { useState } from "react";
import { SP, FONT, RADIUS, TOUCH_MIN } from "./theme";
import type { RatingData } from "./types";
import { BackIcon } from "./icons";
import PhaseSignature from "./PhaseSignature";
import ScoreInput from "./ScoreInput";

interface QuickLabels {
  tapEdit: string;
  of: string;
  band90: string;
  band85: string;
  band80: string;
  band75: string;
  band70: string;
  band0: string;
  quick: string;
  quickD: string;
  note: string;
  notePH: string;
  save: string;
  back: string;
}

interface QuickRatingProps {
  labels: QuickLabels;
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
}

export default function QuickRating({ labels, whisky, initialData, onDone, onBack, onChange }: QuickRatingProps) {
  const [score, setScore] = useState(initialData?.scores?.overall ?? 75);
  const [note, setNote] = useState(initialData?.notes?.overall ?? "");

  const handleSave = () => {
    const defaultScore = 75;
    onDone({
      scores: { nose: defaultScore, palate: defaultScore, finish: defaultScore, overall: score },
      tags: { nose: [], palate: [], finish: [], overall: [] },
      notes: { nose: "", palate: "", finish: "", overall: note },
    });
  };

  const accent = "var(--labs-phase-overall)";

  return (
    <div className="labs-fade-in" style={{ padding: `${SP.xl}px ${SP.md}px`, paddingBottom: 130 }}>
      <button
        onClick={onBack}
        data-testid="quick-rating-back"
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
          marginBottom: SP.lg,
        }}
      >
        <BackIcon color="var(--labs-text)" size={20} />
        <span>{labels.back}</span>
      </button>

      {!whisky.blind && whisky.name && (
        <div style={{ marginBottom: SP.md }}>
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

      <div style={{ display: "flex", alignItems: "center", gap: SP.sm, marginBottom: SP.md }}>
        <PhaseSignature phaseId="overall" size="large" />
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: accent, fontWeight: 600 }}>
            {labels.quick}
          </div>
          <div style={{ fontSize: 13, color: "var(--labs-text-muted)" }}>
            {labels.quickD}
          </div>
        </div>
      </div>

      <div style={{
        background: "var(--labs-surface)",
        border: "1px solid var(--labs-border)",
        borderRadius: RADIUS.xl,
        padding: SP.lg,
        marginBottom: SP.lg,
      }}>
        <ScoreInput
          value={score}
          onChange={(v) => {
            setScore(v);
            onChange?.(0, { scores: { nose: 75, palate: 75, finish: 75, overall: v }, notes: { nose: "", palate: "", finish: "", overall: note } });
          }}
          phaseId="overall"
          labels={labels}
        />
      </div>

      <div style={{ marginBottom: SP.lg }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)", marginBottom: 4, fontFamily: FONT.body }}>
          {labels.note}
        </div>
        <input
          data-testid="input-quick-note"
          type="text"
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            onChange?.(0, { scores: { nose: 75, palate: 75, finish: 75, overall: score }, notes: { nose: "", palate: "", finish: "", overall: e.target.value } });
          }}
          placeholder={labels.notePH}
          style={{
            width: "100%",
            height: 48,
            borderRadius: RADIUS.lg,
            border: "1px solid var(--labs-border)",
            background: "var(--labs-input-bg)",
            color: "var(--labs-text)",
            fontSize: 15,
            fontFamily: FONT.serif,
            fontStyle: "italic",
            padding: "0 14px",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      <button
        data-testid="button-quick-save"
        onClick={handleSave}
        style={{
          width: "100%",
          height: 56,
          borderRadius: RADIUS.lg,
          border: "none",
          cursor: "pointer",
          background: "linear-gradient(135deg, var(--labs-gold), var(--labs-amber))",
          color: "var(--labs-accent-dark)",
          fontSize: 17,
          fontWeight: 700,
          fontFamily: FONT.body,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: SP.sm,
        }}
      >
        {labels.save}
      </button>
    </div>
  );
}

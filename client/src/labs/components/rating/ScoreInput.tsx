import { useState, useRef, useCallback, useEffect } from "react";
import { SP, FONT } from "./theme";
import type { PhaseId } from "./types";

function getBandColor(score: number): string {
  if (score >= 90) return "#d4a847";
  if (score >= 85) return "#c4a040";
  if (score >= 80) return "#86c678";
  if (score >= 70) return "#7ab8c4";
  return "rgba(200,180,160,0.5)";
}

interface RatingLabels {
  tapEdit: string;
  of: string;
  band90: string;
  band85: string;
  band80: string;
  band75: string;
  band70: string;
  band0: string;
}

function getBandLabel(score: number, labels: RatingLabels): string {
  if (score >= 90) return labels.band90;
  if (score >= 85) return labels.band85;
  if (score >= 80) return labels.band80;
  if (score >= 75) return labels.band75;
  if (score >= 70) return labels.band70;
  return labels.band0;
}

interface ScoreInputProps {
  value: number;
  onChange: (v: number) => void;
  phaseId: PhaseId;
  labels: RatingLabels;
}

const TICKS = [60, 65, 70, 75, 80, 85, 90, 95, 100];
const QUICK_PICKS = [70, 75, 80, 85, 90];

export default function ScoreInput({ value, onChange, phaseId, labels }: ScoreInputProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const dragging = useRef(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const accent = `var(--labs-phase-${phaseId})`;
  const dim = `var(--labs-phase-${phaseId}-dim)`;
  const bandColor = getBandColor(value);
  const pct = ((value - 60) / 40) * 100;

  const fromX = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const score = Math.round((60 + ratio * 40) * 2) / 2;
    onChange(Math.max(60, Math.min(100, score)));
  }, [onChange]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => { if (dragging.current) fromX(e.clientX); };
    const onMouseUp = () => { dragging.current = false; };
    const onTouchMove = (e: TouchEvent) => { if (dragging.current) fromX(e.touches[0].clientX); };
    const onTouchEnd = () => { dragging.current = false; };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [fromX]);

  const commitEdit = useCallback(() => {
    const v = parseFloat(draft);
    if (!isNaN(v) && v >= 60 && v <= 100) {
      onChange(Math.round(v * 2) / 2);
    }
    setEditing(false);
  }, [draft, onChange]);

  return (
    <div data-testid={`score-input-${phaseId}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: SP.md }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--labs-text-secondary)", marginBottom: SP.xs, fontFamily: FONT.body }}>
            {labels.tapEdit}
          </div>
          {editing ? (
            <input
              data-testid={`score-edit-input-${phaseId}`}
              type="number"
              min={60}
              max={100}
              step={0.5}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); }}
              autoFocus
              onFocus={(e) => e.target.select()}
              style={{
                width: 80,
                fontSize: 52,
                fontWeight: 700,
                fontFamily: FONT.body,
                color: bandColor,
                background: "transparent",
                border: `2px solid ${bandColor}`,
                borderRadius: 8,
                outline: "none",
                textAlign: "center",
                padding: 0,
              }}
            />
          ) : (
            <div
              data-testid={`score-value-${phaseId}`}
              onClick={() => { setDraft(String(value)); setEditing(true); }}
              style={{
                fontSize: 52,
                fontWeight: 700,
                fontFamily: FONT.body,
                color: bandColor,
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              {value % 1 !== 0 ? value.toFixed(1) : value}
            </div>
          )}
        </div>
        <div style={{ paddingBottom: 8, textAlign: "right" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: bandColor, fontFamily: FONT.body }}>
            {getBandLabel(value, labels)}
          </div>
          <div style={{ fontSize: 12, color: "var(--labs-text-secondary)", fontFamily: FONT.body }}>
            {labels.of} 100
          </div>
        </div>
      </div>

      <div
        ref={trackRef}
        data-testid={`score-track-${phaseId}`}
        onMouseDown={(e) => { dragging.current = true; fromX(e.clientX); }}
        onTouchStart={(e) => { dragging.current = true; fromX(e.touches[0].clientX); }}
        style={{
          position: "relative",
          height: 44,
          cursor: "pointer",
          touchAction: "none",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "50%",
          transform: "translateY(-50%)",
          height: 6,
          borderRadius: 3,
          background: "var(--labs-border)",
        }} />
        <div style={{
          position: "absolute",
          left: 0,
          top: "50%",
          transform: "translateY(-50%)",
          height: 6,
          borderRadius: 3,
          width: `${pct}%`,
          background: accent,
        }} />
        <div
          data-testid={`score-thumb-${phaseId}`}
          style={{
            position: "absolute",
            left: `calc(${pct}% - 22px)`,
            width: 44,
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            background: "linear-gradient(135deg, var(--labs-gold), var(--labs-amber))",
            boxShadow: "0 0 12px color-mix(in srgb, var(--labs-gold) 38%, transparent)",
          }} />
        </div>
      </div>

      <div style={{
        display: "flex",
        justifyContent: "space-between",
        marginTop: SP.xs,
        marginBottom: SP.md,
      }}>
        {TICKS.map((tick) => (
          <span
            key={tick}
            data-testid={`score-tick-${tick}`}
            style={{
              fontSize: 10,
              fontFamily: FONT.body,
              color: tick === value ? bandColor : "var(--labs-text-secondary)",
              fontWeight: tick === value ? 700 : 400,
              minWidth: 20,
              textAlign: "center",
            }}
          >
            {tick}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", gap: SP.sm }}>
        {QUICK_PICKS.map((qp) => (
          <button
            key={qp}
            data-testid={`score-quick-${qp}`}
            onClick={() => onChange(qp)}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 10,
              fontFamily: FONT.body,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              border: qp === value
                ? `1.5px solid ${accent}`
                : "1px solid var(--labs-border)",
              background: qp === value ? dim : "var(--labs-surface)",
              color: qp === value ? accent : "var(--labs-text-muted)",
              transition: "all 0.15s",
            }}
          >
            {qp}
          </button>
        ))}
      </div>
    </div>
  );
}

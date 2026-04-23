import { useState, useRef, useCallback, useEffect } from "react";
import { SP, FONT } from "./theme";
import type { PhaseId } from "./types";
import type { RatingScale } from "@/labs/hooks/useRatingScale";

function getBandColor(score: number, scaleMax: number): string {
  const pctValue = scaleMax > 0 ? (score / scaleMax) * 100 : 0;
  if (pctValue >= 90) return "#d4a847";
  if (pctValue >= 85) return "#c4a040";
  if (pctValue >= 80) return "#86c678";
  if (pctValue >= 70) return "#7ab8c4";
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

function getBandLabel(score: number, scaleMax: number, labels: RatingLabels): string {
  const pctValue = scaleMax > 0 ? (score / scaleMax) * 100 : 0;
  if (pctValue >= 90) return labels.band90;
  if (pctValue >= 85) return labels.band85;
  if (pctValue >= 80) return labels.band80;
  if (pctValue >= 75) return labels.band75;
  if (pctValue >= 70) return labels.band70;
  return labels.band0;
}

interface ScoreInputProps {
  value: number;
  onChange: (v: number) => void;
  phaseId: PhaseId;
  labels: RatingLabels;
  scale?: RatingScale;
}

interface ScaleConfig {
  min: number;
  max: number;
  step: number;
  ticks: number[];
  quickPicks: number[];
}

function buildConfig(scale?: RatingScale): ScaleConfig {
  const max = scale?.max ?? 100;
  const step = scale?.step ?? 0.5;
  if (max === 100) {
    return {
      min: 60,
      max: 100,
      step,
      ticks: [60, 65, 70, 75, 80, 85, 90, 95, 100],
      quickPicks: [70, 75, 80, 85, 90],
    };
  }
  if (max === 20) {
    return {
      min: 0,
      max: 20,
      step,
      ticks: [0, 4, 8, 10, 12, 14, 16, 18, 20],
      quickPicks: [12, 14, 16, 18, 19],
    };
  }
  if (max === 10) {
    return {
      min: 0,
      max: 10,
      step,
      ticks: [0, 2, 4, 5, 6, 7, 8, 9, 10],
      quickPicks: [6, 7, 8, 9, 9.5],
    };
  }
  if (max === 5) {
    return {
      min: 0,
      max: 5,
      step,
      ticks: [0, 1, 2, 3, 4, 5],
      quickPicks: [3, 3.5, 4, 4.5, 5],
    };
  }
  return {
    min: 0,
    max,
    step,
    ticks: [0, max * 0.25, max * 0.5, max * 0.75, max],
    quickPicks: [max * 0.6, max * 0.7, max * 0.8, max * 0.9, max],
  };
}

function snap(value: number, step: number): number {
  if (step <= 0) return value;
  const inv = 1 / step;
  return Math.round(value * inv) / inv;
}

export default function ScoreInput({ value, onChange, phaseId, labels, scale }: ScoreInputProps) {
  const cfg = buildConfig(scale);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const dragging = useRef(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const accent = `var(--labs-phase-${phaseId})`;
  const dim = `var(--labs-phase-${phaseId}-dim)`;
  const bandColor = getBandColor(value, cfg.max);
  const range = cfg.max - cfg.min;
  const pct = range > 0 ? Math.max(0, Math.min(100, ((value - cfg.min) / range) * 100)) : 0;

  const fromX = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = cfg.min + ratio * range;
    const snapped = snap(raw, cfg.step);
    onChange(Math.max(cfg.min, Math.min(cfg.max, snapped)));
  }, [onChange, cfg.min, cfg.max, cfg.step, range]);

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
    if (!isNaN(v) && v >= cfg.min && v <= cfg.max) {
      onChange(snap(v, cfg.step));
    }
    setEditing(false);
  }, [draft, onChange, cfg.min, cfg.max, cfg.step]);

  const formatScore = (n: number) => {
    if (cfg.max === 100) return n % 1 !== 0 ? n.toFixed(1) : String(n);
    return cfg.step < 1 ? n.toFixed(1) : String(Math.round(n));
  };

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
              min={cfg.min}
              max={cfg.max}
              step={cfg.step}
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
              {formatScore(value)}
            </div>
          )}
        </div>
        <div style={{ paddingBottom: 8, textAlign: "right" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: bandColor, fontFamily: FONT.body }}>
            {getBandLabel(value, cfg.max, labels)}
          </div>
          <div style={{ fontSize: 12, color: "var(--labs-text-secondary)", fontFamily: FONT.body }}>
            {labels.of} {cfg.max}
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
        {cfg.ticks.map((tick) => (
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
            {formatScore(tick)}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", gap: SP.sm }}>
        {cfg.quickPicks.map((qp) => (
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
            {formatScore(qp)}
          </button>
        ))}
      </div>
    </div>
  );
}

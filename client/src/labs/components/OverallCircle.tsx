import { useRef, useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { RatingScale } from "@/labs/hooks/useRatingScale";
import { triggerHaptic } from "@/labs/hooks/useHaptic";

interface OverallCircleProps {
  noseScore: number;
  tasteScore: number;
  finishScore: number;
  value: number;
  onChange: (value: number) => void;
  overrideActive: boolean;
  onOverrideToggle: () => void;
  onReset: () => void;
  scale: RatingScale;
  size?: number;
  disabled?: boolean;
}

const GOLD = "#c8861a";
const ARC_DEGREES = 300;
const ARC_START_DEG = 120;
const ANIM_DURATION = 600;

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export default function OverallCircle({
  noseScore,
  tasteScore,
  finishScore,
  value,
  onChange,
  overrideActive,
  onOverrideToggle,
  onReset,
  scale,
  size = 140,
  disabled = false,
}: OverallCircleProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [displayValue, setDisplayValue] = useState(0);
  const prevTarget = useRef(0);
  const [editing, setEditing] = useState(false);
  const [editInput, setEditInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const calculatedAvg = (() => {
    const raw = (noseScore + tasteScore + finishScore) / 3;
    return Math.round(raw / scale.step) * scale.step;
  })();
  const target = overrideActive ? value : calculatedAvg;

  useEffect(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const from = prevTarget.current;
    const to = target;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / ANIM_DURATION, 1);
      const eased = easeOutCubic(progress);
      const current = from + (to - from) * eased;
      setDisplayValue(Math.round(current / scale.step) * scale.step);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        prevTarget.current = to;
        animRef.current = 0;
      }
    };
    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [target]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const strokeWidth = size > 120 ? 8 : 6;
    const radius = (size - strokeWidth * 2) / 2;

    const startRad = (ARC_START_DEG * Math.PI) / 180;
    const endRad = ((ARC_START_DEG + ARC_DEGREES) * Math.PI) / 180;
    const pct = scale.max > 0 ? Math.min(displayValue / scale.max, 1) : 0;
    const valueRad = startRad + pct * (endRad - startRad);

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startRad, endRad);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "round";
    ctx.stroke();

    if (displayValue > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startRad, valueRad);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";
      ctx.stroke();
    }
  }, [displayValue, scale.max, size]);

  const startEdit = useCallback(() => {
    if (disabled) return;
    if (!overrideActive) onOverrideToggle();
    setEditInput(String(overrideActive ? value : calculatedAvg));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 50);
  }, [disabled, overrideActive, onOverrideToggle, value, calculatedAvg]);

  const commitEdit = useCallback(() => {
    const num = parseFloat(editInput);
    if (!isNaN(num) && num >= 60 && num <= 100) {
      const clamped = Math.max(60, Math.min(100, num));
      const snapped = Math.round(clamped / scale.step) * scale.step;
      onChange(snapped);
      triggerHaptic("light");
    }
    setEditing(false);
  }, [editInput, scale.step, onChange]);

  const handleReset = useCallback(() => {
    onReset();
    setEditing(false);
    triggerHaptic("light");
  }, [onReset]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: disabled ? 0.4 : 1, transition: "opacity 0.2s" }} data-testid="overall-circle">
      <div style={{ position: "relative", width: size, height: size }}>
        <canvas
          ref={canvasRef}
          style={{ width: size, height: size, display: "block" }}
          data-testid="overall-circle-canvas"
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          {editing ? (
            <input
              ref={inputRef}
              type="number"
              value={editInput}
              onChange={(e) => setEditInput(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") setEditing(false);
              }}
              min={60}
              max={100}
              style={{
                width: size * 0.4,
                textAlign: "center",
                fontSize: size * 0.2,
                fontWeight: 700,
                background: "transparent",
                border: `1px solid ${GOLD}`,
                borderRadius: 8,
                color: "var(--labs-text)",
                fontFamily: "inherit",
                outline: "none",
                pointerEvents: "auto",
                padding: "2px 4px",
              }}
              data-testid="overall-circle-input"
            />
          ) : (
            <span
              className="labs-serif"
              style={{
                fontSize: size * 0.25,
                fontWeight: 700,
                color: "var(--labs-text)",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
                cursor: disabled ? "default" : "pointer",
                pointerEvents: disabled ? "none" : "auto",
              }}
              onClick={startEdit}
              data-testid="overall-circle-value"
            >
              {displayValue}
            </span>
          )}
          <span
            style={{
              fontSize: 10,
              color: "var(--labs-text-muted)",
              marginTop: 2,
              pointerEvents: "none",
            }}
          >
            / {scale.max}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
        {!overrideActive ? (
          <button
            onClick={() => {
              if (disabled) return;
              onOverrideToggle();
              setEditInput(String(calculatedAvg));
              setEditing(true);
              setTimeout(() => inputRef.current?.select(), 50);
              triggerHaptic("light");
            }}
            disabled={disabled}
            style={{
              padding: "5px 12px",
              borderRadius: 9999,
              border: "1px solid var(--labs-border)",
              background: "var(--labs-surface)",
              color: "var(--labs-text-muted)",
              fontSize: 11,
              fontWeight: 500,
              fontFamily: "inherit",
              cursor: disabled ? "default" : "pointer",
              opacity: disabled ? 0.4 : 1,
            }}
            data-testid="overall-override-btn"
          >
            {t("m2.taste.rating.override", "Override")}
          </button>
        ) : (
          <button
            onClick={handleReset}
            disabled={disabled}
            style={{
              padding: "5px 12px",
              borderRadius: 9999,
              border: `1px solid ${GOLD}`,
              background: "rgba(200,134,26,0.1)",
              color: GOLD,
              fontSize: 11,
              fontWeight: 500,
              fontFamily: "inherit",
              cursor: disabled ? "default" : "pointer",
              opacity: disabled ? 0.4 : 1,
            }}
            data-testid="overall-reset-btn"
          >
            {t("m2.taste.rating.reset", "Reset")}
          </button>
        )}
      </div>

      {overrideActive && (
        <span style={{ fontSize: 10, color: GOLD, fontWeight: 500 }} data-testid="overall-override-badge">
          {t("m2.taste.rating.manualOverride", "Manual override")}
        </span>
      )}
    </div>
  );
}

import { useRef, useEffect, useCallback, useState } from "react";
import type { RatingScale } from "@/labs/hooks/useRatingScale";
import { triggerHaptic } from "@/labs/hooks/useHaptic";

interface RatingDialProps {
  value: number;
  onChange: (value: number) => void;
  scale: RatingScale;
  label?: string;
  disabled?: boolean;
  size?: number;
  color?: string;
}

const ARC_DEGREES = 270;
const ARC_START = 135;
const ARC_END = ARC_START + ARC_DEGREES;
const GOLD = "#c8861a";
const TRACK_COLOR = "rgba(255,255,255,0.08)";
const THUMB_RADIUS = 14;
const DPR = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 3) : 1;

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function snap(value: number, step: number, max: number) {
  const snapped = Math.round(value / step) * step;
  return clamp(snapped, 0, max);
}

function valueToAngle(value: number, max: number) {
  const pct = max > 0 ? value / max : 0;
  return ARC_START + pct * ARC_DEGREES;
}


function angleToValue(angle: number, max: number) {
  const a = clamp(angle, ARC_START, ARC_END);
  const pct = (a - ARC_START) / ARC_DEGREES;
  return pct * max;
}

function pointToAngle(cx: number, cy: number, px: number, py: number) {
  const dx = px - cx;
  const dy = py - cy;
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  if (angle < 0) angle += 360;

  if (angle >= ARC_START) return angle;

  if (angle + 360 <= ARC_END) return angle + 360;

  const distToStart = ARC_START - angle;
  const distToEnd = angle + 360 - ARC_END;
  return distToStart <= distToEnd ? ARC_START : ARC_END;
}

export default function RatingDial({
  value,
  onChange,
  scale,
  label,
  disabled = false,
  size = 200,
  color = GOLD,
}: RatingDialProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [bumpAnim, setBumpAnim] = useState(false);
  const bumpTimer = useRef<ReturnType<typeof setTimeout>>();
  const prevValue = useRef(value);

  const discreteSnap = scale.max <= 20;
  const trackWidth = size > 160 ? 12 : 8;
  const radius = (size - trackWidth - THUMB_RADIUS * 2) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const triggerBump = useCallback(() => {
    if (bumpTimer.current) clearTimeout(bumpTimer.current);
    setBumpAnim(true);
    bumpTimer.current = setTimeout(() => setBumpAnim(false), 200);
  }, []);

  const setValueFromAngle = useCallback(
    (angle: number) => {
      if (disabled) return;
      let raw = angleToValue(angle, scale.max);
      raw = snap(raw, scale.step, scale.max);
      if (raw !== prevValue.current) {
        prevValue.current = raw;
        onChange(raw);
        triggerBump();
        triggerHaptic("light");
      }
    },
    [disabled, scale.max, scale.step, onChange, triggerBump]
  );

  const getPointerAngle = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      return pointToAngle(cx, cy, px, py);
    },
    [cx, cy]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el || disabled) return;

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      dragging.current = true;
      el.setPointerCapture(e.pointerId);
      const angle = getPointerAngle(e.clientX, e.clientY);
      if (angle !== null) setValueFromAngle(angle);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const angle = getPointerAngle(e.clientX, e.clientY);
      if (angle !== null) setValueFromAngle(angle);
    };

    const onPointerUp = () => {
      dragging.current = false;
    };

    el.addEventListener("pointerdown", onPointerDown, { passive: false });
    el.addEventListener("pointermove", onPointerMove, { passive: false });
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
    };
  }, [disabled, getPointerAngle, setValueFromAngle]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = size * DPR;
    canvas.width = w;
    canvas.height = w;
    ctx.clearRect(0, 0, w, w);
    ctx.scale(DPR, DPR);

    const startRad = degToRad(ARC_START - 90);
    const endRad = degToRad(ARC_END - 90);
    const valueAngle = valueToAngle(value, scale.max);
    const valueRad = degToRad(valueAngle - 90);

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startRad, endRad);
    ctx.strokeStyle = TRACK_COLOR;
    ctx.lineWidth = trackWidth;
    ctx.lineCap = "round";
    ctx.stroke();

    if (value > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startRad, valueRad);
      ctx.strokeStyle = color;
      ctx.lineWidth = trackWidth;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    if (discreteSnap && scale.max <= 20) {
      for (let i = 0; i <= scale.max; i += scale.step) {
        const tickAngle = valueToAngle(i, scale.max);
        const tickRad = degToRad(tickAngle - 90);
        const inner = radius - trackWidth / 2 - 3;
        const outer = radius - trackWidth / 2 - 8;
        ctx.beginPath();
        ctx.moveTo(cx + inner * Math.cos(tickRad), cy + inner * Math.sin(tickRad));
        ctx.lineTo(cx + outer * Math.cos(tickRad), cy + outer * Math.sin(tickRad));
        ctx.strokeStyle = i <= value ? color : "rgba(255,255,255,0.15)";
        ctx.lineWidth = i % scale.bigStep === 0 ? 2 : 1;
        ctx.stroke();
      }
    }

    const thumbX = cx + radius * Math.cos(valueRad);
    const thumbY = cy + radius * Math.sin(valueRad);

    ctx.beginPath();
    ctx.arc(thumbX, thumbY, THUMB_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = disabled ? "rgba(255,255,255,0.15)" : color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(thumbX, thumbY, THUMB_RADIUS - 3, 0, Math.PI * 2);
    ctx.fillStyle = "#1a1714";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(thumbX, thumbY, 4, 0, Math.PI * 2);
    ctx.fillStyle = disabled ? "rgba(255,255,255,0.15)" : color;
    ctx.fill();
  }, [value, scale.max, size, color, radius, cx, cy, trackWidth, discreteSnap, scale.step, scale.bigStep, disabled]);

  const adjustValue = useCallback(
    (delta: number) => {
      if (disabled) return;
      const next = snap(clamp(value + delta, 0, scale.max), scale.step, scale.max);
      if (next !== value) {
        onChange(next);
        triggerBump();
        triggerHaptic("light");
      }
    },
    [value, scale.max, scale.step, disabled, onChange, triggerBump]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: disabled ? 0.4 : 1, transition: "opacity 0.2s" }} data-testid="rating-dial">
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: size,
          height: size,
          touchAction: "none",
          cursor: disabled ? "default" : "pointer",
          transform: bumpAnim ? "scale(1.03)" : "scale(1)",
          transition: "transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: size, height: size, display: "block" }}
          data-testid="rating-dial-canvas"
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
          <span
            className="labs-serif"
            style={{
              fontSize: size * 0.22,
              fontWeight: 700,
              color: "var(--labs-text)",
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}
            data-testid="dial-score-display"
          >
            {value}
          </span>
          {label && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "var(--labs-text-muted)",
                marginTop: 2,
              }}
            >
              {label}
            </span>
          )}
          <span
            style={{
              fontSize: 9,
              color: "var(--labs-text-muted)",
              opacity: 0.6,
              marginTop: 2,
            }}
          >
            / {scale.max}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 2 }} data-testid="dial-buttons">
        <button
          onClick={() => adjustValue(-scale.bigStep)}
          disabled={disabled || value <= 0}
          style={pillStyle(disabled || value <= 0)}
          data-testid="dial-btn-big-minus"
        >
          −{scale.bigStep}
        </button>
        <button
          onClick={() => adjustValue(-scale.step)}
          disabled={disabled || value <= 0}
          style={pillStyle(disabled || value <= 0)}
          data-testid="dial-btn-minus"
        >
          −{scale.step}
        </button>
        <button
          onClick={() => adjustValue(scale.step)}
          disabled={disabled || value >= scale.max}
          style={pillStyle(disabled || value >= scale.max)}
          data-testid="dial-btn-plus"
        >
          +{scale.step}
        </button>
        <button
          onClick={() => adjustValue(scale.bigStep)}
          disabled={disabled || value >= scale.max}
          style={pillStyle(disabled || value >= scale.max)}
          data-testid="dial-btn-big-plus"
        >
          +{scale.bigStep}
        </button>
      </div>
    </div>
  );
}

function pillStyle(isDisabled: boolean): React.CSSProperties {
  return {
    padding: "6px 14px",
    borderRadius: 9999,
    border: "1px solid var(--labs-border)",
    background: isDisabled ? "transparent" : "var(--labs-surface)",
    color: isDisabled ? "var(--labs-text-muted)" : "var(--labs-text)",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "inherit",
    cursor: isDisabled ? "default" : "pointer",
    opacity: isDisabled ? 0.35 : 1,
    transition: "all 150ms",
    fontVariantNumeric: "tabular-nums",
  };
}

import { useEffect, useRef, useState } from "react";

interface ScoreRingProps {
  score: number;
  maxScore?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  showValue?: boolean;
  className?: string;
}

export default function LabsScoreRing({
  score,
  maxScore = 100,
  size = 80,
  strokeWidth = 5,
  color,
  label,
  showValue = true,
  className = "",
}: ScoreRingProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [displayValue, setDisplayValue] = useState(0);
  const currentAnimatedRef = useRef(0);
  const animFrameRef = useRef<number>(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(score / maxScore, 1);
  const offset = circumference * (1 - pct);

  const ringColor = color || (pct >= 0.75 ? "var(--labs-success)" : pct >= 0.5 ? "var(--labs-accent)" : "var(--labs-danger)");
  const roundedScore = Math.round(score * 10) / 10;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !showValue) return;

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    const fromValue = currentAnimatedRef.current;
    const toValue = roundedScore;
    const duration = 400;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = fromValue + (toValue - fromValue) * eased;
      const rounded = Math.round(current * 10) / 10;
      currentAnimatedRef.current = current;
      setDisplayValue(rounded);
      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        currentAnimatedRef.current = toValue;
        animFrameRef.current = 0;
      }
    };
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [visible, roundedScore, showValue]);

  return (
    <div ref={ref} className={`flex flex-col items-center gap-1 ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--labs-border)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={visible ? offset : circumference}
            style={{
              transition: visible ? "stroke-dashoffset 500ms cubic-bezier(0.34, 1.56, 0.64, 1), stroke 300ms ease" : "none",
            }}
          />
        </svg>
        {showValue && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ color: "var(--labs-text)" }}
          >
            <span
              className="labs-serif font-semibold"
              style={{ fontSize: size * 0.28, lineHeight: 1 }}
            >
              {visible ? displayValue : 0}
            </span>
          </div>
        )}
      </div>
      {label && (
        <span
          className="text-[11px] font-medium"
          style={{ color: "var(--labs-text-secondary)", letterSpacing: "0.03em" }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

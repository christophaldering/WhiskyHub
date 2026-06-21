import { ChevronDown, Lock } from "lucide-react";
import type { ReactNode } from "react";

export function LiveRatingRow({
  index,
  label,
  overall,
  maxScore,
  isActive,
  isExpanded,
  locked = false,
  onToggle,
  testIdPrefix = "calibration",
  children,
}: {
  index: number;
  label: string;
  overall: number | null | undefined;
  maxScore: number;
  isActive: boolean;
  isExpanded: boolean;
  locked?: boolean;
  onToggle: () => void;
  testIdPrefix?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ borderRadius: 8, overflow: "hidden", border: isActive ? "1px solid var(--labs-accent)" : "1px solid var(--labs-border-subtle, var(--labs-border))", transition: "border-color 0.15s" }}>
      <button
        type="button"
        onClick={locked ? undefined : onToggle}
        disabled={locked}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "8px 10px", cursor: locked ? "default" : "pointer", fontFamily: "inherit",
          background: isActive ? "var(--labs-accent-muted)" : "transparent",
          border: "none",
          opacity: locked ? 0.55 : 1,
          transition: "all 0.15s",
        }}
        data-testid={`${testIdPrefix}-row-${index}`}
      >
        <span className="text-[11px] font-bold tabular-nums" style={{ color: "var(--labs-text-muted)", width: 18, textAlign: "center", flexShrink: 0 }}>
          {index + 1}
        </span>
        <span className="text-xs font-medium truncate flex-1 text-left" style={{ color: isActive ? "var(--labs-accent)" : "var(--labs-text)" }}>
          {label}
        </span>
        <div style={{ width: 60, height: 6, borderRadius: 3, background: "var(--labs-border)", flexShrink: 0, overflow: "hidden" }}>
          {overall != null && (
            <div style={{ width: `${(overall / maxScore) * 100}%`, height: "100%", borderRadius: 3, background: isActive ? "var(--labs-accent)" : "var(--labs-text-muted)", transition: "width 0.3s" }} />
          )}
        </div>
        <span className="text-xs font-bold tabular-nums" style={{ color: overall != null ? (isActive ? "var(--labs-accent)" : "var(--labs-text)") : "var(--labs-text-muted)", width: 28, textAlign: "right", flexShrink: 0 }}>
          {overall != null ? overall : "—"}
        </span>
        {locked ? (
          <Lock style={{ width: 13, height: 13, flexShrink: 0, color: "var(--labs-text-muted)" }} />
        ) : (
          <ChevronDown style={{ width: 13, height: 13, flexShrink: 0, color: "var(--labs-text-muted)", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }} />
        )}
      </button>
      <div
        aria-hidden={!isExpanded}
        {...(!isExpanded ? { inert: "" as any } : {})}
        style={{
          maxHeight: isExpanded ? 999 : 0,
          opacity: isExpanded ? 1 : 0,
          overflow: "hidden",
          transition: "max-height 200ms ease, opacity 200ms ease",
          pointerEvents: isExpanded ? "auto" : "none",
        }}
      >
        <div style={{ padding: "10px 10px 12px", borderTop: "1px solid var(--labs-border-subtle, var(--labs-border))", background: "var(--labs-surface-alt, rgba(255,255,255,0.02))" }} data-testid={`${testIdPrefix}-detail-${index}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

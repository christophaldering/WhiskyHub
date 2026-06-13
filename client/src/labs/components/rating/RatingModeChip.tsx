import { useState, useEffect, useRef } from "react";
import { SP, FONT, RADIUS } from "./theme";

type Mode = "guided" | "compact" | "quick" | "tisch";

interface ChipLabels {
  current: string;
  title: string;
  guided: string;
  compact: string;
  quick: string;
  tisch: string;
  setDefault: string;
  cancel: string;
}

interface RatingModeChipProps {
  mode: Mode;
  hideQuick?: boolean;
  showTisch?: boolean;
  labels: ChipLabels;
  allowSetDefault: boolean;
  onSwitch: (next: Mode, makeDefault?: boolean) => void;
}

export default function RatingModeChip({ mode, hideQuick, showTisch, labels, allowSetDefault, onSwitch }: RatingModeChipProps) {
  const [open, setOpen] = useState(false);
  const [makeDefault, setMakeDefault] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const labelFor = (m: Mode): string => {
    if (m === "guided") return labels.guided;
    if (m === "compact") return labels.compact;
    if (m === "tisch") return labels.tisch;
    return labels.quick;
  };

  const allModes: Mode[] = [
    ...(hideQuick ? [] : ["quick" as Mode]),
    ...(showTisch ? ["tisch" as Mode] : []),
    "compact",
    "guided",
  ];

  const handlePick = (m: Mode) => {
    setOpen(false);
    onSwitch(m, allowSetDefault ? makeDefault : undefined);
  };

  return (
    <div
      ref={popoverRef}
      style={{
        position: "relative",
        display: "flex",
        justifyContent: "flex-end",
        marginBottom: SP.sm,
      }}
    >
      <button
        data-testid="chip-rating-mode"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: RADIUS.full,
          background: "var(--labs-surface-elevated)",
          border: "1px solid var(--labs-border)",
          color: "var(--labs-text-secondary)",
          fontFamily: FONT.body,
          fontSize: 11,
          cursor: "pointer",
          minHeight: 28,
          whiteSpace: "nowrap",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span style={{ opacity: 0.7 }}>{labels.current}:</span>
        <span style={{ color: "var(--labs-text)", fontWeight: 600 }}>{labelFor(mode)}</span>
        <span style={{ fontSize: 9, opacity: 0.5 }}>▾</span>
      </button>

      {open && (
        <div
          role="menu"
          data-testid="popover-rating-mode"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 31,
            minWidth: 220,
            background: "var(--labs-surface-elevated)",
            border: "1px solid var(--labs-border)",
            borderRadius: RADIUS.md,
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            padding: SP.sm,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <div style={{
            fontFamily: FONT.body,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--labs-text-muted)",
            padding: `4px ${SP.sm}px 6px`,
          }}>
            {labels.title}
          </div>

          {allModes.map((m) => {
            const active = m === mode;
            return (
              <button
                key={m}
                data-testid={`button-switch-mode-${m}`}
                onClick={() => handlePick(m)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: `8px ${SP.sm}px`,
                  background: active ? "var(--labs-accent-muted)" : "transparent",
                  border: "none",
                  borderRadius: RADIUS.sm,
                  cursor: active ? "default" : "pointer",
                  color: active ? "var(--labs-accent)" : "var(--labs-text)",
                  fontFamily: FONT.body,
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  textAlign: "left",
                  width: "100%",
                }}
                disabled={active}
              >
                <span>{labelFor(m)}</span>
                {active && <span style={{ fontSize: 11, opacity: 0.7 }}>✓</span>}
              </button>
            );
          })}

          {allowSetDefault && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: SP.sm,
                marginTop: 6,
                padding: `8px ${SP.sm}px`,
                borderTop: "1px solid var(--labs-border)",
                cursor: "pointer",
                fontFamily: FONT.body,
                fontSize: 12,
                color: "var(--labs-text-muted)",
              }}
            >
              <input
                type="checkbox"
                checked={makeDefault}
                onChange={(e) => setMakeDefault(e.target.checked)}
                style={{ accentColor: "var(--labs-accent)" }}
                data-testid="checkbox-set-default-mode"
              />
              <span>{labels.setDefault}</span>
            </label>
          )}
        </div>
      )}
    </div>
  );
}

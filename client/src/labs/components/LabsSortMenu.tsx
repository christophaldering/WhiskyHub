import { useState } from "react";
import { SlidersHorizontal, ChevronDown, Check } from "lucide-react";

export type LabsSortOption = { value: string; label: string };

export default function LabsSortMenu({
  options,
  value,
  onChange,
  label,
  testIdPrefix = "sort",
}: {
  options: LabsSortOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  testIdPrefix?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <div>
      {label && (
        <div style={{ fontSize: 11, fontWeight: 500, color: "var(--labs-text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {label}
        </div>
      )}
      <div style={{ position: "relative", display: "inline-block" }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          data-testid={`${testIdPrefix}-dropdown-trigger`}
          style={{
            minHeight: 44, padding: "0 16px", borderRadius: 22,
            border: "1px solid var(--labs-border)", cursor: "pointer",
            background: "var(--labs-surface)", color: "var(--labs-text)",
            fontSize: 14, fontWeight: 500, fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
          }}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" style={{ opacity: 0.7 }} />
          {current?.label}
          <ChevronDown className="w-3.5 h-3.5" style={{ opacity: 0.6, transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
        </button>
        {open && (
          <>
            <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
            <div
              data-testid={`${testIdPrefix}-dropdown-menu`}
              style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 41,
                minWidth: 220, background: "var(--labs-surface-elevated)",
                border: "1px solid var(--labs-border)", borderRadius: 12,
                boxShadow: "0 8px 24px rgba(0,0,0,0.18)", overflow: "hidden",
              }}
            >
              {options.map((opt, idx) => {
                const isCurrent = opt.value === current?.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { onChange(opt.value); setOpen(false); }}
                    data-testid={`${testIdPrefix}-option-${opt.value}`}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                      gap: 10, padding: "12px 16px",
                      background: isCurrent ? "color-mix(in srgb, var(--labs-accent) 12%, transparent)" : "transparent",
                      color: "var(--labs-text)", border: "none",
                      borderBottom: idx < options.length - 1 ? "1px solid var(--labs-border)" : "none",
                      fontSize: 14, fontWeight: isCurrent ? 600 : 500, fontFamily: "inherit",
                      cursor: "pointer", textAlign: "left",
                    }}
                  >
                    {opt.label}
                    {isCurrent && <Check className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

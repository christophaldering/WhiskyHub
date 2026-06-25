import { useState, useMemo } from "react";
import { ChevronDown, Check, Search } from "lucide-react";

export type LabsFilterOption = { value: string; label: string; count?: number };

export default function LabsFilterChips({
  label,
  options,
  value,
  onChange,
  multiple = false,
  searchable = false,
  neutralValue,
  searchPlaceholder = "Suchen\u2026",
  align = "left",
  testIdPrefix = "filter",
}: {
  label: string;
  options: LabsFilterOption[];
  value: string[];
  onChange: (values: string[]) => void;
  multiple?: boolean;
  searchable?: boolean;
  neutralValue?: string;
  searchPlaceholder?: string;
  align?: "left" | "right";
  testIdPrefix?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedNonNeutral = options.filter((o) => value.includes(o.value) && o.value !== neutralValue);
  const active = selectedNonNeutral.length > 0;
  const chipText = selectedNonNeutral.length === 1 ? selectedNonNeutral[0].label : label;

  const filtered = useMemo(
    () => (query ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : options),
    [options, query]
  );

  const close = () => { setOpen(false); setQuery(""); };
  const pick = (v: string) => {
    if (multiple) {
      onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
    } else {
      onChange([v]);
      close();
    }
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        data-testid={`${testIdPrefix}-trigger`}
        style={{
          minHeight: 44, padding: "0 16px", borderRadius: 22,
          border: active ? "1.5px solid var(--labs-accent)" : "1px solid var(--labs-border)",
          cursor: "pointer",
          background: active ? "var(--labs-accent)" : "var(--labs-surface)",
          color: active ? "var(--labs-on-accent)" : "var(--labs-text)",
          fontSize: 14, fontWeight: active ? 600 : 500, fontFamily: "inherit",
          display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
        }}
      >
        {chipText}
        {multiple && selectedNonNeutral.length > 1 && (
          <span style={{ fontSize: 11, opacity: 0.9, fontWeight: 700, background: "rgba(255,255,255,0.25)", borderRadius: 10, padding: "2px 7px" }}>
            {selectedNonNeutral.length}
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5" style={{ opacity: 0.6, transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
      </button>
      {open && (
        <>
          <div onClick={close} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div
            data-testid={`${testIdPrefix}-menu`}
            style={{
              position: "absolute", top: "calc(100% + 6px)", zIndex: 41,
              ...(align === "right" ? { right: 0 } : { left: 0 }),
              minWidth: 220, maxHeight: "60vh", overflowY: "auto",
              background: "var(--labs-surface-elevated)",
              border: "1px solid var(--labs-border)", borderRadius: 12,
              boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            }}
          >
            {searchable && (
              <div style={{ position: "sticky", top: 0, background: "var(--labs-surface-elevated)", padding: 8, borderBottom: "1px solid var(--labs-border)" }}>
                <div style={{ position: "relative" }}>
                  <Search className="w-3.5 h-3.5" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", opacity: 0.5 }} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    data-testid={`${testIdPrefix}-search`}
                    style={{ width: "100%", height: 36, borderRadius: 8, border: "1px solid var(--labs-border)", background: "var(--labs-bg)", color: "var(--labs-text)", fontSize: 14, padding: "0 10px 0 30px", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                  />
                </div>
              </div>
            )}
            {filtered.map((opt) => {
              const isSel = value.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => pick(opt.value)}
                  data-testid={`${testIdPrefix}-option-${opt.value}`}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 10, padding: "12px 16px",
                    background: isSel ? "color-mix(in srgb, var(--labs-accent) 12%, transparent)" : "transparent",
                    color: "var(--labs-text)", border: "none",
                    fontSize: 14, fontWeight: isSel ? 600 : 500, fontFamily: "inherit",
                    cursor: "pointer", textAlign: "left",
                  }}
                >
                  <span>{opt.label}{opt.count !== undefined ? ` (${opt.count})` : ""}</span>
                  {isSel && <Check className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: 16, fontSize: 14, color: "var(--labs-text-muted)", textAlign: "center" }}>—</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

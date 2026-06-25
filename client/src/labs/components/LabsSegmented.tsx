import type { CSSProperties } from "react";

export type LabsSegmentedOption = { value: string; label: string; count?: number };

export default function LabsSegmented({
  options,
  value,
  onChange,
  testIdPrefix = "seg",
  style,
}: {
  options: LabsSegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  testIdPrefix?: string;
  style?: CSSProperties;
}) {
  return (
    <div className="labs-segmented" style={style}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`labs-segmented-btn ${value === opt.value ? "labs-segmented-btn-active" : ""}`}
          style={{ fontSize: 12, padding: "7px 5px" }}
          data-testid={`${testIdPrefix}-${opt.value}`}
        >
          {opt.label}
          {opt.count !== undefined && (
            <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.6, fontVariantNumeric: "tabular-nums" }}>
              {opt.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

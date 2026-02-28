interface SegmentedControlV2Props {
  items: { key: string; label: string }[];
  activeKey: string;
  onChange: (key: string) => void;
}

export default function SegmentedControlV2({ items, activeKey, onChange }: SegmentedControlV2Props) {
  return (
    <div
      className="flex p-1 gap-1 rounded-xl"
      style={{ background: "var(--v2-surface)" }}
      data-testid="segmented-control"
    >
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className="flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer"
            style={{
              background: active ? "var(--v2-accent)" : "transparent",
              color: active ? "var(--v2-bg)" : "var(--v2-text-muted)",
            }}
            data-testid={`segment-${item.key}`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

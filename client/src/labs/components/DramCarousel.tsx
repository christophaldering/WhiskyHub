import { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle } from "lucide-react";

const GOLD = "#c8861a";

export interface DramChip {
  index: number;
  name: string;
  score?: number | null;
  status: "done" | "active" | "locked";
}

interface DramCarouselProps {
  chips: DramChip[];
  activeIndex: number;
  onChipTap: (index: number) => void;
  scaleMax: number;
  isBlind?: boolean;
}

export default function DramCarousel({
  chips,
  activeIndex,
  onChipTap,
  scaleMax,
  isBlind = false,
}: DramCarouselProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const el = activeRef.current;
      const left = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;
      container.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
    }
  }, [activeIndex]);

  return (
    <div
      ref={scrollRef}
      style={{
        display: "flex",
        gap: 8,
        overflowX: "auto",
        padding: "8px 4px",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        WebkitOverflowScrolling: "touch",
      }}
      data-testid="dram-carousel"
    >
      {chips.map((chip) => {
        const isDone = chip.status === "done";
        const isActive = chip.status === "active";
        const isLocked = chip.status === "locked";
        const isUnrated = !isDone && !isLocked && chip.score == null;
        const displayName = isBlind
          ? t("m2.taste.rating.sampleX", { n: chip.index + 1, defaultValue: `Sample ${chip.index + 1}` })
          : chip.name;

        return (
          <button
            key={chip.index}
            ref={chip.index === activeIndex ? activeRef : undefined}
            onClick={() => {
              if (!isLocked) onChipTap(chip.index);
            }}
            disabled={isLocked}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 9999,
              border: isActive
                ? `2px solid ${GOLD}`
                : isDone
                  ? "1px solid rgba(200,134,26,0.3)"
                  : "1px solid var(--labs-border)",
              background: isActive
                ? `rgba(200,134,26,0.12)`
                : isDone
                  ? "rgba(200,134,26,0.06)"
                  : "transparent",
              cursor: isLocked ? "default" : "pointer",
              opacity: isLocked ? 0.35 : 1,
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 600,
              color: isActive ? GOLD : isDone ? "var(--labs-text-muted)" : "var(--labs-text)",
              whiteSpace: "nowrap",
              flexShrink: 0,
              position: "relative",
              transition: "all 150ms",
            }}
            data-testid={`dram-chip-${chip.index}`}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
                background: isActive ? GOLD : isDone ? "rgba(200,134,26,0.2)" : "var(--labs-surface)",
                color: isActive ? "#1a1714" : isDone ? GOLD : "var(--labs-text-muted)",
              }}
            >
              {chip.index + 1}
            </span>

            <span style={{ maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis" }}>
              {displayName}
            </span>

            {isDone && chip.score != null && (
              <span
                className="labs-serif"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: GOLD,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {chip.score}/{scaleMax}
              </span>
            )}

            {isUnrated && isActive && (
              <AlertCircle
                style={{
                  width: 12,
                  height: 12,
                  color: "var(--labs-warning, #f59e0b)",
                  position: "absolute",
                  top: -4,
                  right: -4,
                }}
                data-testid={`dram-chip-unrated-${chip.index}`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

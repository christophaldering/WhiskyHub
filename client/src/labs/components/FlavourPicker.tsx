import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import {
  FLAVOR_CATEGORIES,
  getSortedCategories,
  type FlavorCategory,
  type FlavorProfileId,
} from "@/labs/data/flavor-data";
import { triggerHaptic } from "@/labs/hooks/useHaptic";
import type { RatingScale } from "@/labs/hooks/useRatingScale";

interface FlavourPickerProps {
  activeChips: string[];
  onToggle: (chip: string) => void;
  scale: RatingScale;
  flavorProfileId?: FlavorProfileId | null;
  isBlind?: boolean;
  disabled?: boolean;
}

const GOLD = "#c8861a";
const DEFAULT_VISIBLE_COUNT = 3;
const DEFAULT_CATEGORY_ORDER = ["fruity", "sweet", "woody"];

export default function FlavourPicker({
  activeChips,
  onToggle,
  scale,
  flavorProfileId,
  isBlind = false,
  disabled = false,
}: FlavourPickerProps) {
  const { t, i18n } = useTranslation();
  const isDE = i18n.language === "de";
  const [expanded, setExpanded] = useState(false);

  const activeSet = useMemo(() => new Set(activeChips.map((c) => c.toLowerCase())), [activeChips]);

  const sortedCategories = useMemo(() => {
    if (isBlind || !flavorProfileId) {
      const defaultFirst = DEFAULT_CATEGORY_ORDER
        .map((id) => FLAVOR_CATEGORIES.find((c) => c.id === id))
        .filter(Boolean) as FlavorCategory[];
      const rest = FLAVOR_CATEGORIES.filter((c) => !DEFAULT_CATEGORY_ORDER.includes(c.id));
      return [...defaultFirst, ...rest];
    }
    return getSortedCategories(flavorProfileId);
  }, [isBlind, flavorProfileId]);

  const visibleCategories = sortedCategories.slice(0, DEFAULT_VISIBLE_COUNT);
  const hiddenCategories = sortedCategories.slice(DEFAULT_VISIBLE_COUNT);

  const countActive = useCallback(
    (cat: FlavorCategory) => {
      return cat.subcategories.filter(
        (sub) => activeSet.has(sub.en.toLowerCase()) || activeSet.has(sub.de.toLowerCase())
      ).length;
    },
    [activeSet]
  );

  const isChipActive = useCallback(
    (en: string, de: string) => activeSet.has(en.toLowerCase()) || activeSet.has(de.toLowerCase()),
    [activeSet]
  );

  const handleToggle = useCallback(
    (chip: string) => {
      if (disabled) return;
      onToggle(chip);
      triggerHaptic("light");
    },
    [disabled, onToggle]
  );

  const renderCategory = (cat: FlavorCategory) => {
    const count = countActive(cat);
    const catLabel = isDE ? cat.de : cat.en;

    return (
      <div
        key={cat.id}
        style={{ marginBottom: 12 }}
        data-testid={`flavour-category-${cat.id}`}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 6,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: cat.color,
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--labs-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {catLabel}
          </span>
          {count > 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: GOLD,
                background: "rgba(200,134,26,0.12)",
                borderRadius: 9999,
                padding: "1px 7px",
                minWidth: 18,
                textAlign: "center",
              }}
              data-testid={`flavour-count-${cat.id}`}
            >
              {count}
            </span>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {cat.subcategories.map((sub) => {
            const active = isChipActive(sub.en, sub.de);
            const label = isDE ? sub.de : sub.en;
            return (
              <button
                key={sub.id}
                onClick={() => handleToggle(sub.en)}
                disabled={disabled}
                style={{
                  padding: "6px 12px",
                  borderRadius: 9999,
                  border: active
                    ? `1.5px solid ${GOLD}`
                    : "1px solid var(--labs-border)",
                  background: active
                    ? "rgba(200,134,26,0.12)"
                    : "transparent",
                  color: active ? GOLD : "var(--labs-text-secondary)",
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  fontFamily: "inherit",
                  cursor: disabled ? "default" : "pointer",
                  opacity: disabled ? 0.4 : 1,
                  transition: "all 150ms",
                  whiteSpace: "nowrap",
                }}
                data-testid={`chip-${sub.id}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div data-testid="flavour-picker" style={{ opacity: disabled ? 0.5 : 1, transition: "opacity 0.2s" }}>
      {visibleCategories.map(renderCategory)}

      {hiddenCategories.length > 0 && (
        <>
          <button
            onClick={() => { setExpanded((p) => !p); triggerHaptic("light"); }}
            disabled={disabled}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "8px 0",
              background: "none",
              border: "none",
              cursor: disabled ? "default" : "pointer",
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--labs-text-muted)",
              width: "100%",
            }}
            data-testid="flavour-more-toggle"
          >
            {expanded
              ? t("m2.taste.rating.flavourLess", "Fewer aromas")
              : t("m2.taste.rating.flavourMore", "More aromas")}
            <ChevronDown
              style={{
                width: 14,
                height: 14,
                transition: "transform 200ms",
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </button>

          {expanded && (
            <div
              style={{ animation: "labsFadeIn 200ms ease both" }}
            >
              {hiddenCategories.map(renderCategory)}

              {scale.max >= 20 && (
              <div
                style={{
                  borderTop: "1px solid var(--labs-border)",
                  paddingTop: 10,
                  marginTop: 4,
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                }}
                data-testid="flavour-expert-tools"
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--labs-text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    width: "100%",
                    marginBottom: 4,
                  }}
                >
                  {t("m2.taste.rating.expertTools", "Expert Tools")}
                </span>
                {[
                  { id: "wheel", label: t("m2.taste.rating.toolWheel", "Wheel"), icon: "◎" },
                  { id: "compass", label: t("m2.taste.rating.toolCompass", "Compass"), icon: "◇" },
                  { id: "regions", label: t("m2.taste.rating.toolRegions", "Regions"), icon: "🌍" },
                ].map((tool) => (
                  <span
                    key={tool.id}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      padding: "4px 10px",
                      borderRadius: 9999,
                      border: "1px solid var(--labs-border)",
                      background: "var(--labs-surface)",
                      color: "var(--labs-text-muted)",
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: "default",
                      opacity: 0.6,
                    }}
                    data-testid={`expert-tool-${tool.id}`}
                  >
                    <span style={{ fontSize: 11 }}>{tool.icon}</span>
                    {tool.label}
                  </span>
                ))}
              </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  FLAVOR_CATEGORIES,
  getSortedCategories,
  type FlavorCategory,
  type FlavorDescriptor,
  type FlavorProfileId,
} from "@/labs/data/flavor-data";
import { triggerHaptic } from "@/labs/hooks/useHaptic";
import type { RatingScale } from "@/labs/hooks/useRatingScale";
import { lazy, Suspense } from "react";

type DimKey = "nose" | "taste" | "finish";
type StudioView = "guide" | "journey" | "wheel" | "compass" | "radar" | "describe";

const FlavourStudioSheet = lazy(() => import("./FlavourStudioSheet"));

interface PickerGroup {
  id: string;
  en: string;
  de: string;
  color: string;
  chips: FlavorDescriptor[];
  sourceIds: string[];
}

interface FlavourPickerProps {
  activeChips: string[];
  onToggle: (chip: string) => void;
  scale: RatingScale;
  flavorProfileId?: FlavorProfileId | null;
  isBlind?: boolean;
  disabled?: boolean;
  dimension?: DimKey;
}

const GOLD = "#c8861a";

const COMBINED_GROUPS: { id: string; en: string; de: string; color: string; merge: string[] }[] = [
  { id: "fruity", en: "Fruity", de: "Fruchtig", color: "#e07b4c", merge: ["fruity", "floral"] },
  { id: "sweet-spicy", en: "Sweet & Spicy", de: "Süß & Würzig", color: "#d4a853", merge: ["sweet", "spicy"] },
  { id: "wood-leather", en: "Wood & Leather", de: "Holz & Leder", color: "#8b6f47", merge: ["woody", "earthy"] },
  { id: "smoky-maritime", en: "Smoky & Maritime", de: "Rauchig & Maritim", color: "#6b7280", merge: ["smoky", "maritime", "mineral"] },
  { id: "malty-nutty", en: "Malty & Nutty", de: "Malzig & Nussig", color: "#b8934a", merge: ["malty", "nutty"] },
  { id: "herbal-creamy", en: "Herbal & Creamy", de: "Kräuter & Cremig", color: "#6b8e5a", merge: ["herbal", "creamy"] },
];

function buildGroups(orderedCats: FlavorCategory[]): PickerGroup[] {
  const catMap = new Map(orderedCats.map((c) => [c.id, c]));
  const usedIds = new Set<string>();
  const groups: PickerGroup[] = [];

  for (const grp of COMBINED_GROUPS) {
    const cats = grp.merge.map((id) => catMap.get(id)).filter(Boolean) as FlavorCategory[];
    if (cats.length === 0) continue;
    const chips: FlavorDescriptor[] = [];
    const sourceIds: string[] = [];
    for (const cat of cats) {
      chips.push(...cat.subcategories);
      sourceIds.push(cat.id);
      usedIds.add(cat.id);
    }
    groups.push({
      id: grp.id,
      en: grp.en,
      de: grp.de,
      color: grp.color,
      chips,
      sourceIds,
    });
  }

  for (const cat of orderedCats) {
    if (usedIds.has(cat.id)) continue;
    groups.push({
      id: cat.id,
      en: cat.en,
      de: cat.de,
      color: cat.color,
      chips: [...cat.subcategories],
      sourceIds: [cat.id],
    });
  }

  return groups;
}

function sortGroupsByProfile(groups: PickerGroup[], profileCats: FlavorCategory[]): PickerGroup[] {
  const orderMap = new Map(profileCats.map((c, i) => [c.id, i]));
  return [...groups].sort((a, b) => {
    const aMin = Math.min(...a.sourceIds.map((id) => orderMap.get(id) ?? 999));
    const bMin = Math.min(...b.sourceIds.map((id) => orderMap.get(id) ?? 999));
    return aMin - bMin;
  });
}

function useFlavorCategoriesFromAPI(): FlavorCategory[] {
  const { data } = useQuery<Array<{ id: string; en: string; de: string; color: string; sortOrder: number; descriptors: Array<{ id: string; en: string; de: string; keywords: string[]; sortOrder: number }> }>>({
    queryKey: ["/api/flavour-categories"],
    queryFn: async () => {
      const res = await fetch("/api/flavour-categories");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return useMemo(() => {
    if (!data || data.length === 0) return FLAVOR_CATEGORIES;
    return data.map(cat => ({
      id: cat.id,
      en: cat.en,
      de: cat.de,
      color: cat.color,
      subcategories: cat.descriptors.map(d => ({
        id: d.id,
        en: d.en,
        de: d.de,
        keywords: d.keywords,
      })),
    }));
  }, [data]);
}

const VISIBLE_COUNT = 3;

export default function FlavourPicker({
  activeChips,
  onToggle,
  scale,
  flavorProfileId,
  isBlind = false,
  disabled = false,
  dimension,
}: FlavourPickerProps) {
  const { t, i18n } = useTranslation();
  const isDE = i18n.language === "de";
  const [expanded, setExpanded] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioInitialView, setStudioInitialView] = useState<StudioView>("wheel");
  const apiCategories = useFlavorCategoriesFromAPI();

  const handleExpertToolClick = useCallback((view: StudioView) => {
    setStudioInitialView(view);
    setStudioOpen(true);
    triggerHaptic("light");
  }, []);

  const handleStudioChipsChange = useCallback((newChips: string[]) => {
    const currentSet = new Set(activeChips.map(c => c.toLowerCase()));
    const newSet = new Set(newChips.map(c => c.toLowerCase()));
    for (const chip of newChips) {
      if (!currentSet.has(chip.toLowerCase())) {
        onToggle(chip);
      }
    }
    for (const chip of activeChips) {
      if (!newSet.has(chip.toLowerCase())) {
        onToggle(chip);
      }
    }
  }, [activeChips, onToggle]);

  const activeSet = useMemo(() => new Set(activeChips.map((c) => c.toLowerCase())), [activeChips]);

  const { visibleGroups, hiddenGroups } = useMemo(() => {
    const baseCats = apiCategories;
    let orderedCats: FlavorCategory[];
    if (isBlind || !flavorProfileId) {
      orderedCats = baseCats;
    } else {
      const profileOrder = getSortedCategories(flavorProfileId);
      const profileIdOrder = profileOrder.map(c => c.id);
      const catMap = new Map(baseCats.map(c => [c.id, c]));
      const ordered: FlavorCategory[] = [];
      const seen = new Set<string>();
      for (const pid of profileIdOrder) {
        const cat = catMap.get(pid);
        if (cat) { ordered.push(cat); seen.add(pid); }
      }
      for (const cat of baseCats) {
        if (!seen.has(cat.id)) ordered.push(cat);
      }
      orderedCats = ordered;
    }
    const allGroups = buildGroups(orderedCats);
    const visible = allGroups.slice(0, VISIBLE_COUNT);
    let hidden = allGroups.slice(VISIBLE_COUNT);
    if (!isBlind && flavorProfileId) {
      hidden = sortGroupsByProfile(hidden, getSortedCategories(flavorProfileId));
    }
    return { visibleGroups: visible, hiddenGroups: hidden };
  }, [isBlind, flavorProfileId, apiCategories]);

  const countActive = useCallback(
    (grp: PickerGroup) =>
      grp.chips.filter(
        (sub) => activeSet.has(sub.en.toLowerCase()) || activeSet.has(sub.de.toLowerCase())
      ).length,
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

  const renderGroup = (grp: PickerGroup) => {
    const count = countActive(grp);
    const label = isDE ? grp.de : grp.en;

    return (
      <div
        key={grp.id}
        style={{ marginBottom: 12 }}
        data-testid={`flavour-category-${grp.id}`}
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
              background: grp.color,
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
            {label}
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
              data-testid={`flavour-count-${grp.id}`}
            >
              {count}
            </span>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {grp.chips.map((sub) => {
            const active = isChipActive(sub.en, sub.de);
            const chipLabel = isDE ? sub.de : sub.en;
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
                  background: active ? "rgba(200,134,26,0.12)" : "transparent",
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
                {chipLabel}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div data-testid="flavour-picker" style={{ opacity: disabled ? 0.5 : 1, transition: "opacity 0.2s" }}>
      {visibleGroups.map(renderGroup)}

      {hiddenGroups.length > 0 && (
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
            <div style={{ animation: "labsFadeIn 200ms ease both" }}>
              {hiddenGroups.map(renderGroup)}
            </div>
          )}
        </>
      )}

      {scale.max >= 20 && (
        <ExpertToolsCollapsible
          disabled={disabled}
          onToolClick={dimension ? handleExpertToolClick : undefined}
        />
      )}

      {dimension && (
        <Suspense fallback={null}>
          <FlavourStudioSheet
            open={studioOpen}
            onOpenChange={setStudioOpen}
            dimension={dimension}
            existingChips={activeChips}
            onChipsChange={handleStudioChipsChange}
            disabled={disabled}
            initialView={studioInitialView}
          />
        </Suspense>
      )}
    </div>
  );
}

function ExpertToolsCollapsible({ disabled, onToolClick }: {
  disabled?: boolean;
  onToolClick?: (view: StudioView) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const tools: { id: string; view: StudioView | null; label: string; icon: string; comingSoon?: boolean }[] = [
    { id: "wheel", view: "wheel", label: t("m2.taste.rating.toolWheel", "Wheel"), icon: "◎" },
    { id: "compass", view: "compass", label: t("m2.taste.rating.toolCompass", "Compass"), icon: "◇" },
    { id: "regions", view: null, label: t("m2.taste.rating.toolRegions", "Regions"), icon: "🌍", comingSoon: true },
  ];

  return (
    <div style={{ borderTop: "1px solid var(--labs-border)", marginTop: 6, paddingTop: 6 }}>
      <button
        onClick={() => setOpen(p => !p)}
        disabled={disabled}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 0",
          background: "none",
          border: "none",
          cursor: disabled ? "default" : "pointer",
          fontFamily: "inherit",
          fontSize: 10,
          fontWeight: 600,
          color: "var(--labs-text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          width: "100%",
        }}
        data-testid="expert-tools-toggle"
      >
        {t("m2.taste.rating.expertTools", "Expert Tools")}
        <ChevronRight style={{
          width: 12,
          height: 12,
          transition: "transform 200ms",
          transform: open ? "rotate(90deg)" : "rotate(0deg)",
        }} />
      </button>
      {open && (
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            paddingTop: 6,
            animation: "labsFadeIn 200ms ease both",
          }}
          data-testid="flavour-expert-tools"
        >
          {tools.map((tool) => {
            const isClickable = !tool.comingSoon && !!onToolClick && !!tool.view;
            return (
              <button
                key={tool.id}
                onClick={() => {
                  if (isClickable && tool.view) {
                    onToolClick(tool.view);
                  }
                }}
                disabled={disabled || tool.comingSoon || !isClickable}
                title={tool.comingSoon ? t("m2.taste.rating.comingSoon", "Coming soon") : undefined}
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
                  fontFamily: "inherit",
                  cursor: isClickable ? "pointer" : "default",
                  opacity: tool.comingSoon ? 0.4 : (isClickable ? 1 : 0.6),
                  transition: "all 150ms",
                }}
                data-testid={`expert-tool-${tool.id}`}
              >
                <span style={{ fontSize: 11 }}>{tool.icon}</span>
                {tool.label}
                {tool.comingSoon && (
                  <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 2 }}>
                    ({t("m2.taste.rating.comingSoon", "Coming soon")})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

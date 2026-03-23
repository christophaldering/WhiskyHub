import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
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

function CollapsiblePickerPanel({
  title,
  subtitle,
  isOpen,
  onToggle,
  disabled,
  badge,
  children,
  testId,
}: {
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: () => void;
  disabled?: boolean;
  badge?: number;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <div
      data-testid={testId}
      style={{
        marginBottom: 8,
        border: "1px solid var(--labs-border)",
        borderRadius: 12,
        overflow: "hidden",
        background: "rgba(255,255,255,0.03)",
        transition: "all 0.2s ease",
      }}
    >
      <button
        data-testid={`${testId}-toggle`}
        onClick={onToggle}
        disabled={disabled}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px",
          background: "none",
          border: "none",
          cursor: disabled ? "default" : "pointer",
          fontFamily: "inherit",
          minHeight: 44,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)" }}>{title}</span>
          {subtitle && !isOpen && (
            <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{subtitle}</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {badge !== undefined && badge > 0 && (
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: GOLD,
              background: "rgba(200,134,26,0.12)",
              borderRadius: 9999,
              padding: "2px 7px",
              minWidth: 18,
              textAlign: "center",
            }}>
              {badge}
            </span>
          )}
          <ChevronDown style={{
            width: 14,
            height: 14,
            transition: "transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            color: "var(--labs-text-muted)",
          }} />
        </div>
      </button>
      <div style={{
        maxHeight: isOpen ? 2000 : 0,
        overflow: "hidden",
        transition: "max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <div style={{ padding: "0 14px 12px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

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

  const [panel1Open, setPanel1Open] = useState(false);
  const [panel2Open, setPanel2Open] = useState(false);

  const visibleActiveCount = visibleGroups.reduce((sum, grp) => sum + countActive(grp), 0);
  const hiddenActiveCount = hiddenGroups.reduce((sum, grp) => sum + countActive(grp), 0);

  const studioTools: { id: StudioView; label: string; icon: string }[] = [
    { id: "guide", label: t("m2.taste.rating.toolGuide", "Guide"), icon: "📋" },
    { id: "journey", label: t("m2.taste.rating.toolJourney", "Journey"), icon: "🔄" },
    { id: "wheel", label: t("m2.taste.rating.toolWheel", "Wheel"), icon: "◎" },
    { id: "compass", label: t("m2.taste.rating.toolCompass", "Compass"), icon: "◇" },
    { id: "radar", label: "Radar", icon: "⬡" },
    { id: "describe", label: t("m2.taste.rating.toolDescribe", "Describe"), icon: "✏️" },
  ];

  return (
    <div data-testid="flavour-picker" style={{ opacity: disabled ? 0.5 : 1, transition: "opacity 0.2s" }}>
      <CollapsiblePickerPanel
        title={t("m2.taste.rating.chooseAromas", "Choose aromas ▾")}
        subtitle={t("m2.taste.rating.chooseAromasSub", "Tap what you recognise")}
        isOpen={panel1Open}
        onToggle={() => { setPanel1Open(p => !p); triggerHaptic("light"); }}
        disabled={disabled}
        badge={visibleActiveCount}
        testId="flavour-panel-primary"
      >
        {visibleGroups.map(renderGroup)}
      </CollapsiblePickerPanel>

      <CollapsiblePickerPanel
        title={t("m2.taste.rating.moreAromasModels", "More aromas & rating models ▾")}
        subtitle={t("m2.taste.rating.moreAromasModelsSub", "All categories and advanced tools")}
        isOpen={panel2Open}
        onToggle={() => { setPanel2Open(p => !p); triggerHaptic("light"); }}
        disabled={disabled}
        badge={hiddenActiveCount}
        testId="flavour-panel-secondary"
      >
        {hiddenGroups.map(renderGroup)}

        <div style={{
          borderTop: "1px solid var(--labs-border)",
          marginTop: 8,
          paddingTop: 8,
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: "var(--labs-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 6,
          }}>
            {t("m2.taste.rating.ratingModels", "Rating models")}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {studioTools.map((tool) => {
              const isClickable = !!dimension && !!handleExpertToolClick;
              return (
                <button
                  key={tool.id}
                  onClick={() => {
                    if (isClickable) handleExpertToolClick(tool.id);
                  }}
                  disabled={disabled || !isClickable}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "6px 12px",
                    borderRadius: 9999,
                    border: "1px solid var(--labs-border)",
                    background: "var(--labs-surface, transparent)",
                    color: "var(--labs-text-muted)",
                    fontSize: 11,
                    fontWeight: 500,
                    fontFamily: "inherit",
                    cursor: isClickable && !disabled ? "pointer" : "default",
                    opacity: isClickable ? 1 : 0.5,
                    transition: "all 150ms",
                  }}
                  data-testid={`studio-view-btn-${tool.id}`}
                >
                  <span style={{ fontSize: 12 }}>{tool.icon}</span>
                  {tool.label}
                </button>
              );
            })}
          </div>
        </div>
      </CollapsiblePickerPanel>

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


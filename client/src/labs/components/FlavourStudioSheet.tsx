import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Plus, Sparkles, Search, ChevronRight } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { FLAVOR_CATEGORIES, type FlavorCategory, type FlavorSubGroup } from "@/labs/data/flavor-data";
import { triggerHaptic } from "@/labs/hooks/useHaptic";
import type { DimKey } from "./LabsRatingPanel";

export type StudioView = "guide" | "wheel" | "compass" | "radar" | "describe" | "discover";
type CategoryId = "islay" | "speyside" | "sherry" | "bourbon" | "highland" | "japanese";
type TermSection = "nose" | "palate" | "finish";

const CATEGORY_COLORS: Record<CategoryId, string> = {
  islay: "#6B9EAE", speyside: "#8EAF5A", sherry: "#C06868",
  bourbon: "#D4A05A", highland: "#9B7DB8", japanese: "#E8A0B4",
};

const CATEGORY_ICONS: Record<CategoryId, string> = {
  islay: "\uD83D\uDD25", speyside: "\uD83C\uDF4E", sherry: "\uD83C\uDF77",
  bourbon: "\uD83C\uDF3D", highland: "\u26F0\uFE0F", japanese: "\uD83C\uDDEF\uD83C\uDDF5",
};

const COMPASS_POSITIONS: Record<CategoryId, { x: number; y: number }> = {
  islay: { x: 0.78, y: 0.18 }, speyside: { x: 0.22, y: 0.75 },
  sherry: { x: 0.72, y: 0.68 }, bourbon: { x: 0.45, y: 0.78 },
  highland: { x: 0.68, y: 0.42 }, japanese: { x: 0.28, y: 0.35 },
};

const RADAR_AXES = ["Smoke", "Fruit", "Spice", "Sweet", "Floral", "Maritime"] as const;

const RADAR_PROFILES: Record<CategoryId, number[]> = {
  islay: [0.95, 0.2, 0.4, 0.15, 0.05, 0.9],
  speyside: [0.05, 0.9, 0.2, 0.8, 0.7, 0.05],
  sherry: [0.1, 0.7, 0.85, 0.6, 0.15, 0.05],
  bourbon: [0.15, 0.5, 0.7, 0.9, 0.1, 0.05],
  highland: [0.3, 0.5, 0.6, 0.5, 0.4, 0.2],
  japanese: [0.15, 0.6, 0.3, 0.5, 0.8, 0.1],
};

const AXIS_KEYWORDS: Record<string, string[]> = {
  Smoke: ["smoke", "peat", "ash", "campfire", "charcoal", "bonfire", "smoky", "charred", "char", "tar"],
  Fruit: ["fruit", "apple", "pear", "cherry", "citrus", "peach", "apricot", "plum", "melon", "orange", "berries", "banana", "tropical", "berry"],
  Spice: ["spice", "pepper", "cinnamon", "clove", "ginger", "nutmeg", "spicy"],
  Sweet: ["sweet", "honey", "vanilla", "caramel", "toffee", "sugar", "butterscotch", "chocolate", "marzipan", "treacle", "molasses"],
  Floral: ["floral", "flower", "heather", "blossom", "rose", "lavender", "herbs", "herbal", "tea", "mint", "incense"],
  Maritime: ["salt", "brine", "sea", "maritime", "coastal", "iodine", "seaweed", "marine", "mineral"],
};

const COMPANION_MAP: Record<string, string[]> = {
  "Vanilla": ["Honey", "Caramel", "Toffee", "Oak", "Butterscotch"],
  "Honey": ["Vanilla", "Heather", "Malt", "Floral", "Butterscotch"],
  "Peat": ["Campfire", "Sea Salt", "Iodine", "Brine", "Ash"],
  "Campfire": ["Peat", "Charcoal", "Ash", "Tar", "Leather"],
  "Apple": ["Pear", "Citrus", "Honey", "Vanilla", "Heather"],
  "Caramel": ["Vanilla", "Toffee", "Brown Sugar", "Butterscotch", "Oak"],
  "Oak": ["Vanilla", "Spice", "Tannin", "Cedar", "Pepper"],
  "Cinnamon": ["Clove", "Nutmeg", "Ginger", "Pepper", "Oak"],
  "Chocolate": ["Espresso", "Dried Fruit", "Clove", "Cherry", "Vanilla"],
  "Citrus": ["Apple", "Pear", "Ginger", "Honey", "Floral"],
  "Sea Salt": ["Brine", "Iodine", "Seaweed", "Peat", "Mineral"],
  "Dried Fruit": ["Raisins", "Cinnamon", "Clove", "Walnut", "Brown Sugar"],
  "Pepper": ["Cinnamon", "Clove", "Oak", "Ginger", "Nutmeg"],
  "Rose": ["Lavender", "Heather", "Jasmine", "Elderflower", "Honey"],
  "Leather": ["Tobacco", "Oak", "Peat", "Charcoal", "Mushroom"],
  "Butter": ["Cream", "Custard", "Vanilla", "Toffee", "Malt"],
};

const CATEGORY_IDS: CategoryId[] = ["islay", "speyside", "sherry", "bourbon", "highland", "japanese"];

const DIM_TO_SECTION: Record<string, TermSection> = {
  nose: "nose", taste: "palate", finish: "finish",
};

interface FlavourStudioSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dimension: DimKey;
  existingChips: string[];
  onChipsChange: (chips: string[]) => void;
  disabled?: boolean;
  initialView?: StudioView;
}

interface VocabCategory {
  id: CategoryId;
  name: string;
  nose: string[];
  palate: string[];
  finish: string[];
}

function useVocabCategories(): VocabCategory[] {
  const { t } = useTranslation();
  return useMemo(() => CATEGORY_IDS.map((id) => ({
    id,
    name: t(`vocabCategories.${id}.name`, id),
    nose: t(`vocabCategories.${id}.nose`, { returnObjects: true, defaultValue: [] }) as string[],
    palate: t(`vocabCategories.${id}.palate`, { returnObjects: true, defaultValue: [] }) as string[],
    finish: t(`vocabCategories.${id}.finish`, { returnObjects: true, defaultValue: [] }) as string[],
  })), [t]);
}

function getAllTermsForSection(categories: VocabCategory[], section: TermSection): string[] {
  const terms = new Set<string>();
  for (const cat of categories) {
    for (const term of cat[section]) {
      terms.add(term);
    }
  }
  return Array.from(terms);
}

function getQuickAddTerms(categories: VocabCategory[], section: TermSection): string[] {
  const popular = [
    "Vanilla", "Honey", "Caramel", "Oak", "Peat", "Apple", "Citrus",
    "Cinnamon", "Chocolate", "Smoke", "Sea Salt", "Dried Fruit",
  ];
  const allTerms = getAllTermsForSection(categories, section);
  const matched = popular.filter((p) => allTerms.some((t) => t.toLowerCase().includes(p.toLowerCase())));
  if (matched.length >= 8) return matched.slice(0, 10);
  return allTerms.slice(0, 10);
}

function findTermCategory(term: string, categories: VocabCategory[]): CategoryId | null {
  const lower = term.toLowerCase();
  for (const cat of categories) {
    for (const section of ["nose", "palate", "finish"] as TermSection[]) {
      if (cat[section].some((t) => t.toLowerCase() === lower)) return cat.id;
    }
  }
  return null;
}

function SegmentedControl({ value, onChange }: { value: StudioView; onChange: (v: StudioView) => void }) {
  const { t } = useTranslation();
  const options: { key: StudioView; label: string }[] = [
    { key: "guide", label: t("m2.rating.studioGuide", "Guide") },
    { key: "wheel", label: t("m2.rating.studioWheel", "Wheel") },
    { key: "compass", label: t("m2.rating.studioCompass", "Compass") },
    { key: "radar", label: "Radar" },
    { key: "describe", label: t("m2.rating.studioDescribe", "Describe") },
    { key: "discover", label: t("m2.rating.studioDiscover", "Discover") },
  ];

  return (
    <div style={{
      display: "flex", gap: 2, padding: 3, borderRadius: 10,
      background: "var(--labs-surface)", border: "1px solid var(--labs-border-subtle)",
      marginBottom: 16,
    }} data-testid="studio-segmented-control">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => { onChange(opt.key); triggerHaptic("light"); }}
          data-testid={`studio-view-${opt.key}`}
          style={{
            flex: 1, padding: "7px 4px", borderRadius: 8,
            border: "none", cursor: "pointer", fontFamily: "inherit",
            fontSize: 11, fontWeight: value === opt.key ? 700 : 500,
            background: value === opt.key ? "var(--labs-accent)" : "transparent",
            color: value === opt.key ? "var(--labs-bg)" : "var(--labs-text-muted)",
            transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

interface GuidedBreadcrumb {
  label: string;
  level: number;
  categoryId?: string;
  subgroupId?: string;
}

interface DescriptorHierarchyPath {
  categoryId: string;
  categoryLabel: string;
  categoryColor: string;
  subgroupLabel?: string;
  descriptorLabel: string;
  descriptorKey: string;
}

function findDescriptorHierarchy(termLower: string, isDE: boolean): DescriptorHierarchyPath | null {
  for (const cat of FLAVOR_CATEGORIES) {
    for (const sub of cat.subcategories) {
      if (sub.en.toLowerCase() === termLower || sub.de.toLowerCase() === termLower) {
        let subgroupLabel: string | undefined;
        if (cat.subgroups) {
          for (const sg of cat.subgroups) {
            if (sg.descriptors.some((d) => d.en.toLowerCase() === termLower || d.de.toLowerCase() === termLower)) {
              subgroupLabel = isDE ? sg.de : sg.en;
              break;
            }
          }
        }
        return {
          categoryId: cat.id,
          categoryLabel: isDE ? cat.de : cat.en,
          categoryColor: cat.color,
          subgroupLabel,
          descriptorLabel: isDE ? sub.de : sub.en,
          descriptorKey: sub.en,
        };
      }
    }
  }
  return null;
}

const GUIDE_CATEGORY_ICONS: Record<string, string> = {
  fruity: "🍎", floral: "🌸", sweet: "🍯", spicy: "🌶️", woody: "🪵",
  smoky: "🔥", malty: "🌾", maritime: "🌊", nutty: "🥜", herbal: "🌿",
  earthy: "🍂", creamy: "🧈", mineral: "💎",
};

function GuidedView({
  selected, onToggle, isDE,
}: {
  selected: Set<string>;
  onToggle: (term: string) => void;
  isDE: boolean;
}) {
  const { t } = useTranslation();
  const [navCategoryId, setNavCategoryId] = useState<string | null>(null);
  const [navSubgroupId, setNavSubgroupId] = useState<string | null>(null);
  const [animDir, setAnimDir] = useState<"forward" | "back" | null>(null);

  const navCategory = navCategoryId ? FLAVOR_CATEGORIES.find((c) => c.id === navCategoryId) || null : null;
  const navSubgroup = navCategory?.subgroups && navSubgroupId
    ? navCategory.subgroups.find((sg) => sg.id === navSubgroupId) || null
    : null;

  const level = navSubgroup ? 3 : navCategory ? 2 : 1;

  const drillDown = useCallback((categoryId: string, subgroupId?: string) => {
    setAnimDir("forward");
    if (subgroupId) {
      setNavSubgroupId(subgroupId);
    } else {
      setNavCategoryId(categoryId);
      setNavSubgroupId(null);
    }
    triggerHaptic("light");
  }, []);

  const goBack = useCallback((toLevel: number) => {
    setAnimDir("back");
    if (toLevel <= 1) {
      setNavCategoryId(null);
      setNavSubgroupId(null);
    } else if (toLevel <= 2) {
      setNavSubgroupId(null);
    }
    triggerHaptic("light");
  }, []);

  const isTermSelected = useCallback((desc: { en: string; de: string }): boolean => {
    return selected.has(desc.en.toLowerCase()) || selected.has(desc.de.toLowerCase());
  }, [selected]);

  const countSelectedInCategory = useCallback((cat: FlavorCategory): number => {
    return cat.subcategories.filter((sub) => isTermSelected(sub)).length;
  }, [isTermSelected]);

  const countSelectedInSubgroup = useCallback((sg: FlavorSubGroup): number => {
    return sg.descriptors.filter((d) => isTermSelected(d)).length;
  }, [isTermSelected]);

  const breadcrumbs = useMemo((): GuidedBreadcrumb[] => {
    const crumbs: GuidedBreadcrumb[] = [
      { label: t("m2.rating.studioGuideAll", "All Categories"), level: 1 },
    ];
    if (navCategory) {
      crumbs.push({
        label: isDE ? navCategory.de : navCategory.en,
        level: 2,
        categoryId: navCategory.id,
      });
    }
    if (navSubgroup && navCategory) {
      crumbs.push({
        label: isDE ? navSubgroup.de : navSubgroup.en,
        level: 3,
        categoryId: navCategory.id,
        subgroupId: navSubgroup.id,
      });
    }
    return crumbs;
  }, [navCategory, navSubgroup, isDE, t]);

  const selectedPaths = useMemo((): DescriptorHierarchyPath[] => {
    const paths: DescriptorHierarchyPath[] = [];
    for (const termLower of selected) {
      const path = findDescriptorHierarchy(termLower, isDE);
      if (path) paths.push(path);
    }
    return paths;
  }, [selected, isDE]);

  const selectedByCategory = useMemo(() => {
    const map = new Map<string, DescriptorHierarchyPath[]>();
    for (const p of selectedPaths) {
      const existing = map.get(p.categoryId) || [];
      existing.push(p);
      map.set(p.categoryId, existing);
    }
    return map;
  }, [selectedPaths]);

  const animClass = animDir === "forward" ? "guideSlideIn" : animDir === "back" ? "guideSlideBack" : "";

  return (
    <div data-testid="studio-guide-view">
      <style>{`
        @keyframes guideSlideIn {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes guideSlideBack {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .guideSlideIn { animation: guideSlideIn 250ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        .guideSlideBack { animation: guideSlideBack 250ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }
      `}</style>

      {level > 1 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 4, marginBottom: 12,
          fontSize: 11, color: "var(--labs-text-muted)", flexWrap: "wrap",
        }} data-testid="guide-breadcrumbs">
          {breadcrumbs.map((crumb, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {i > 0 && <ChevronRight style={{ width: 12, height: 12, opacity: 0.5 }} />}
                <button
                  onClick={() => { if (!isLast) goBack(crumb.level); }}
                  data-testid={`guide-breadcrumb-${i}`}
                  style={{
                    background: "none", border: "none", cursor: isLast ? "default" : "pointer",
                    fontFamily: "inherit", fontSize: 11, padding: "2px 4px", borderRadius: 4,
                    color: isLast
                      ? (navCategory ? navCategory.color : "var(--labs-text)")
                      : "var(--labs-text-muted)",
                    fontWeight: isLast ? 600 : 400,
                    textDecoration: isLast ? "none" : "underline",
                    textDecorationColor: "var(--labs-border)",
                    textUnderlineOffset: 2,
                  }}
                >
                  {crumb.label}
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className={animClass} key={`${navCategoryId}-${navSubgroupId}`}>
        {level === 1 && (
          <div>
            {selectedByCategory.size > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  fontSize: 9, fontWeight: 600, color: "var(--labs-accent)",
                  textTransform: "uppercase", letterSpacing: 1, marginBottom: 8,
                }}>
                  {t("m2.rating.studioGuideSelected", "Your Selections")}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {Array.from(selectedByCategory.entries()).map(([catId, paths]) => {
                    const cat = FLAVOR_CATEGORIES.find((c) => c.id === catId);
                    const color = cat?.color || "var(--labs-accent)";
                    const catLabel = cat ? (isDE ? cat.de : cat.en) : catId;
                    const icon = GUIDE_CATEGORY_ICONS[catId] || "";
                    return (
                      <div key={catId}>
                        <div style={{
                          display: "flex", alignItems: "center", gap: 4, marginBottom: 4,
                          fontSize: 10, color, fontWeight: 600,
                        }}>
                          <span style={{ fontSize: 12 }}>{icon}</span>
                          <span>{catLabel}</span>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, paddingLeft: 2 }}>
                          {paths.map((p) => (
                            <button
                              key={p.descriptorKey}
                              onClick={() => onToggle(p.descriptorKey)}
                              data-testid={`guide-selected-${p.descriptorKey.replace(/\s+/g, "-").toLowerCase()}`}
                              style={{
                                fontSize: 10, padding: "3px 8px", borderRadius: 14, fontFamily: "inherit",
                                background: `${color}18`, color,
                                border: `1px solid ${color}44`, cursor: "pointer",
                                display: "flex", alignItems: "center", gap: 4,
                                transition: "all 0.15s",
                              }}
                            >
                              {p.subgroupLabel && (
                                <span style={{ fontSize: 8, opacity: 0.6 }}>{p.subgroupLabel} ›</span>
                              )}
                              <span style={{ fontWeight: 600 }}>{p.descriptorLabel}</span>
                              <span style={{ fontSize: 9, opacity: 0.6 }}>×</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{
              fontSize: 9, fontWeight: 600, color: "var(--labs-text-muted)",
              textTransform: "uppercase", letterSpacing: 1, marginBottom: 8,
            }}>
              {t("m2.rating.studioGuideCategories", "Tap to explore")}
            </div>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
            }} data-testid="guide-category-grid">
              {FLAVOR_CATEGORIES.map((cat, i) => {
                const count = countSelectedInCategory(cat);
                const hasSubgroups = !!cat.subgroups && cat.subgroups.length > 0;
                return (
                  <button
                    key={cat.id}
                    onClick={() => drillDown(cat.id)}
                    data-testid={`guide-category-${cat.id}`}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "flex-start",
                      padding: "12px 14px", borderRadius: 12, fontFamily: "inherit",
                      background: count > 0 ? `${cat.color}12` : "var(--labs-surface)",
                      border: `1.5px solid ${count > 0 ? `${cat.color}55` : "var(--labs-border-subtle)"}`,
                      cursor: "pointer", transition: "all 0.2s ease", textAlign: "left",
                      position: "relative", overflow: "hidden",
                      animation: `labsFadeIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both`,
                      animationDelay: `${i * 40}ms`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
                      <span style={{ fontSize: 16, lineHeight: 1 }}>
                        {GUIDE_CATEGORY_ICONS[cat.id] || ""}
                      </span>
                      <span className="labs-serif" style={{
                        fontSize: 13, fontWeight: 600, color: cat.color,
                      }}>
                        {isDE ? cat.de : cat.en}
                      </span>
                      {count > 0 && (
                        <span style={{
                          fontSize: 9, padding: "1px 6px", borderRadius: 8,
                          background: cat.color, color: "var(--labs-bg)", fontWeight: 700,
                          marginLeft: "auto",
                        }}>
                          {count}
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: 9, color: "var(--labs-text-muted)", marginTop: 4,
                      display: "flex", alignItems: "center", gap: 3,
                    }}>
                      <span>
                        {hasSubgroups
                          ? `${cat.subgroups!.length} ${t("m2.rating.studioGuideGroups", "groups")}`
                          : `${cat.subcategories.length} ${t("m2.rating.studioGuideNotes", "notes")}`}
                      </span>
                      <ChevronRight style={{ width: 10, height: 10, opacity: 0.5 }} />
                    </div>
                    {count > 0 && (
                      <div style={{
                        position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
                        background: cat.color, opacity: 0.5,
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {level === 2 && navCategory && (
          <div>
            {navCategory.subgroups && navCategory.subgroups.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {navCategory.subgroups.map((sg, i) => {
                  const sgCount = countSelectedInSubgroup(sg);
                  return (
                    <button
                      key={sg.id}
                      onClick={() => drillDown(navCategory.id, sg.id)}
                      data-testid={`guide-subgroup-${sg.id}`}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "14px 16px", borderRadius: 12, fontFamily: "inherit",
                        background: sgCount > 0 ? `${navCategory.color}12` : "var(--labs-surface)",
                        border: `1.5px solid ${sgCount > 0 ? `${navCategory.color}44` : "var(--labs-border-subtle)"}`,
                        cursor: "pointer", transition: "all 0.2s ease", textAlign: "left",
                        animation: `labsFadeIn 250ms cubic-bezier(0.34, 1.56, 0.64, 1) both`,
                        animationDelay: `${i * 60}ms`,
                      }}
                    >
                      <div>
                        <div className="labs-serif" style={{
                          fontSize: 14, fontWeight: 600, color: navCategory.color,
                        }}>
                          {isDE ? sg.de : sg.en}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--labs-text-muted)", marginTop: 2 }}>
                          {sg.descriptors.map((d) => isDE ? d.de : d.en).join(", ")}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {sgCount > 0 && (
                          <span style={{
                            fontSize: 9, padding: "1px 6px", borderRadius: 8,
                            background: navCategory.color, color: "var(--labs-bg)", fontWeight: 700,
                          }}>
                            {sgCount}
                          </span>
                        )}
                        <ChevronRight style={{ width: 14, height: 14, color: "var(--labs-text-muted)" }} />
                      </div>
                    </button>
                  );
                })}

                <div style={{
                  marginTop: 8, padding: "10px 0",
                  borderTop: "1px solid var(--labs-border-subtle)",
                }}>
                  <div style={{
                    fontSize: 9, fontWeight: 600, color: "var(--labs-text-muted)",
                    textTransform: "uppercase", letterSpacing: 1, marginBottom: 8,
                  }}>
                    {t("m2.rating.studioGuideAllInCategory", "All in {{category}}", { category: isDE ? navCategory.de : navCategory.en })}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {navCategory.subcategories.map((desc, i) => {
                      const isS = isTermSelected(desc);
                      return (
                        <button
                          key={desc.id}
                          onClick={() => onToggle(desc.en)}
                          data-testid={`guide-term-${desc.id}`}
                          style={{
                            fontSize: 12, padding: "7px 14px", borderRadius: 20, fontFamily: "inherit",
                            background: isS ? `${navCategory.color}22` : "var(--labs-surface)",
                            color: isS ? navCategory.color : "var(--labs-text)",
                            border: `1.5px solid ${isS ? navCategory.color : "var(--labs-border)"}`,
                            cursor: "pointer", transition: "all 0.2s ease", minHeight: 36,
                            fontWeight: isS ? 600 : 400,
                            animation: `labsFadeIn 250ms cubic-bezier(0.34, 1.56, 0.64, 1) both`,
                            animationDelay: `${i * 40}ms`,
                          }}
                        >
                          {isS ? "✓ " : ""}{isDE ? desc.de : desc.en}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {navCategory.subcategories.map((desc, i) => {
                  const isS = isTermSelected(desc);
                  return (
                    <button
                      key={desc.id}
                      onClick={() => onToggle(desc.en)}
                      data-testid={`guide-term-${desc.id}`}
                      style={{
                        fontSize: 12, padding: "8px 16px", borderRadius: 20, fontFamily: "inherit",
                        background: isS ? `${navCategory.color}22` : "var(--labs-surface)",
                        color: isS ? navCategory.color : "var(--labs-text)",
                        border: `1.5px solid ${isS ? navCategory.color : "var(--labs-border)"}`,
                        cursor: "pointer", transition: "all 0.2s ease", minHeight: 38,
                        fontWeight: isS ? 600 : 400,
                        animation: `labsFadeIn 250ms cubic-bezier(0.34, 1.56, 0.64, 1) both`,
                        animationDelay: `${i * 50}ms`,
                      }}
                    >
                      {isS ? "✓ " : ""}{isDE ? desc.de : desc.en}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {level === 3 && navSubgroup && navCategory && (
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {navSubgroup.descriptors.map((desc, i) => {
                const isS = isTermSelected(desc);
                return (
                  <button
                    key={desc.id}
                    onClick={() => onToggle(desc.en)}
                    data-testid={`guide-term-${desc.id}`}
                    style={{
                      fontSize: 13, padding: "10px 18px", borderRadius: 22, fontFamily: "inherit",
                      background: isS ? `${navCategory.color}22` : "var(--labs-surface)",
                      color: isS ? navCategory.color : "var(--labs-text)",
                      border: `1.5px solid ${isS ? navCategory.color : "var(--labs-border)"}`,
                      cursor: "pointer", transition: "all 0.2s ease", minHeight: 42,
                      fontWeight: isS ? 600 : 400,
                      animation: `labsFadeIn 250ms cubic-bezier(0.34, 1.56, 0.64, 1) both`,
                      animationDelay: `${i * 60}ms`,
                    }}
                  >
                    {isS ? "✓ " : ""}{isDE ? desc.de : desc.en}
                  </button>
                );
              })}
            </div>

            {navCategory.subgroups && navCategory.subgroups.length > 1 && (
              <div style={{ marginTop: 16 }}>
                <div style={{
                  fontSize: 9, fontWeight: 600, color: "var(--labs-text-muted)",
                  textTransform: "uppercase", letterSpacing: 1, marginBottom: 8,
                }}>
                  {t("m2.rating.studioGuideRelated", "Other groups in {{category}}", { category: isDE ? navCategory.de : navCategory.en })}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {navCategory.subgroups
                    .filter((sg) => sg.id !== navSubgroupId)
                    .map((sg) => {
                      const sgCount = countSelectedInSubgroup(sg);
                      return (
                        <button
                          key={sg.id}
                          onClick={() => drillDown(navCategory.id, sg.id)}
                          data-testid={`guide-related-${sg.id}`}
                          style={{
                            fontSize: 11, padding: "6px 12px", borderRadius: 16, fontFamily: "inherit",
                            background: sgCount > 0 ? `${navCategory.color}12` : "var(--labs-surface)",
                            color: sgCount > 0 ? navCategory.color : "var(--labs-text-muted)",
                            border: `1px solid ${sgCount > 0 ? `${navCategory.color}44` : "var(--labs-border-subtle)"}`,
                            cursor: "pointer", transition: "all 0.15s",
                            display: "flex", alignItems: "center", gap: 4,
                          }}
                        >
                          {isDE ? sg.de : sg.en}
                          {sgCount > 0 && (
                            <span style={{
                              fontSize: 8, padding: "0 4px", borderRadius: 6,
                              background: navCategory.color, color: "var(--labs-bg)", fontWeight: 700,
                            }}>
                              {sgCount}
                            </span>
                          )}
                          <ChevronRight style={{ width: 10, height: 10 }} />
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CompactWheel({
  categories, section, selected, onToggle,
}: {
  categories: VocabCategory[];
  section: TermSection;
  selected: Set<string>;
  onToggle: (term: string) => void;
}) {
  const [focused, setFocused] = useState<CategoryId | null>(null);
  const cx = 150, cy = 150, outerR = 130, innerR = 45;

  const segments = categories.map((cat, i) => {
    const startAngle = (i * 60 - 90) * (Math.PI / 180);
    const endAngle = ((i + 1) * 60 - 90) * (Math.PI / 180);
    const midAngle = ((i + 0.5) * 60 - 90) * (Math.PI / 180);
    const x1o = cx + outerR * Math.cos(startAngle);
    const y1o = cy + outerR * Math.sin(startAngle);
    const x2o = cx + outerR * Math.cos(endAngle);
    const y2o = cy + outerR * Math.sin(endAngle);
    const x1i = cx + innerR * Math.cos(startAngle);
    const y1i = cy + innerR * Math.sin(startAngle);
    const x2i = cx + innerR * Math.cos(endAngle);
    const y2i = cy + innerR * Math.sin(endAngle);
    const path = `M ${x1i} ${y1i} L ${x1o} ${y1o} A ${outerR} ${outerR} 0 0 1 ${x2o} ${y2o} L ${x2i} ${y2i} A ${innerR} ${innerR} 0 0 0 ${x1i} ${y1i}`;
    const labelR = (outerR + innerR) / 2 + 12;
    const labelX = cx + labelR * Math.cos(midAngle);
    const labelY = cy + labelR * Math.sin(midAngle);
    const isFocused = focused === cat.id;
    const isDimmed = focused !== null && !isFocused;
    const count = cat[section].filter((t) => selected.has(t.toLowerCase())).length;
    return { ...cat, path, labelX, labelY, isFocused, isDimmed, count };
  });

  const focusedCat = focused ? categories.find((c) => c.id === focused) : null;

  return (
    <div data-testid="studio-wheel-view">
      <svg viewBox="0 0 300 300" style={{ width: "100%", maxWidth: 300, margin: "0 auto", display: "block" }}>
        {segments.map((seg) => (
          <g key={seg.id} onClick={() => { setFocused(seg.isFocused ? null : seg.id); triggerHaptic("light"); }} style={{ cursor: "pointer" }}>
            <path
              d={seg.path}
              fill={CATEGORY_COLORS[seg.id]}
              fillOpacity={seg.isDimmed ? 0.12 : seg.isFocused ? 0.5 : 0.28}
              stroke={CATEGORY_COLORS[seg.id]}
              strokeWidth={seg.isFocused ? 2 : 0.8}
              strokeOpacity={seg.isDimmed ? 0.2 : 0.6}
              style={{ transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
            />
            <text
              x={seg.labelX} y={seg.labelY} textAnchor="middle" dominantBaseline="middle"
              fill={seg.isDimmed ? "var(--labs-text-muted)" : CATEGORY_COLORS[seg.id]}
              fontSize={seg.isFocused ? 10 : 8} fontWeight={seg.isFocused ? 700 : 500}
              style={{ transition: "all 0.3s ease", pointerEvents: "none", fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {seg.name.split(" / ")[0]}
            </text>
            {seg.count > 0 && (
              <g>
                <circle cx={seg.labelX + 18} cy={seg.labelY - 6} r={7} fill={CATEGORY_COLORS[seg.id]} />
                <text x={seg.labelX + 18} y={seg.labelY - 6} textAnchor="middle" dominantBaseline="middle" fill="var(--labs-bg)" fontSize={8} fontWeight={700}>
                  {seg.count}
                </text>
              </g>
            )}
          </g>
        ))}
        <circle cx={cx} cy={cy} r={innerR - 2} fill="var(--labs-bg)" />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--labs-text)" fontSize={9} fontWeight={600} style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          Flavour
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill="var(--labs-text-muted)" fontSize={8}>
          Studio
        </text>
      </svg>

      {focusedCat && focused && (
        <div style={{
          marginTop: 12, padding: 14, background: "var(--labs-surface)",
          borderRadius: "var(--labs-radius, 10px)", border: `1px solid ${CATEGORY_COLORS[focused]}33`,
          animation: "labsFadeIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
        }} data-testid={`wheel-detail-${focused}`}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>{CATEGORY_ICONS[focused]}</span>
            <span className="labs-serif" style={{ fontSize: 14, fontWeight: 600, color: CATEGORY_COLORS[focused] }}>{focusedCat.name}</span>
            <button onClick={(e) => { e.stopPropagation(); setFocused(null); }} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--labs-text-muted)" }} data-testid="button-close-wheel-detail">
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {focusedCat[section].map((term) => {
              const isSelected = selected.has(term.toLowerCase());
              return (
                <button
                  key={term} onClick={(e) => { e.stopPropagation(); onToggle(term); }}
                  data-testid={`studio-term-${term.replace(/\s+/g, "-").toLowerCase()}`}
                  style={{
                    fontSize: 11, padding: "5px 11px", borderRadius: 20, fontFamily: "inherit",
                    background: isSelected ? `${CATEGORY_COLORS[focused]}22` : "var(--labs-surface-elevated, var(--labs-bg))",
                    color: isSelected ? CATEGORY_COLORS[focused] : "var(--labs-text)",
                    border: `1.5px solid ${isSelected ? CATEGORY_COLORS[focused] : "var(--labs-border)"}`,
                    cursor: "pointer", transition: "all 0.2s ease", minHeight: 34,
                    boxShadow: isSelected ? `0 0 0 2px ${CATEGORY_COLORS[focused]}44` : "none",
                  }}
                >
                  {isSelected ? "✓ " : ""}{term}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CompactCompass({
  categories, section, selected, onToggle,
}: {
  categories: VocabCategory[];
  section: TermSection;
  selected: Set<string>;
  onToggle: (term: string) => void;
}) {
  const { t } = useTranslation();
  const [selectedCat, setSelectedCat] = useState<CategoryId | null>(null);
  const w = 300, h = 260;
  const selCat = selectedCat ? categories.find((c) => c.id === selectedCat) : null;

  const userPosition = useMemo(() => {
    if (selected.size === 0) return null;
    let totalX = 0, totalY = 0, totalWeight = 0;
    for (const cat of categories) {
      const matchCount = cat[section].filter((term) => selected.has(term.toLowerCase())).length;
      if (matchCount > 0) {
        const pos = COMPASS_POSITIONS[cat.id];
        totalX += pos.x * matchCount;
        totalY += pos.y * matchCount;
        totalWeight += matchCount;
      }
    }
    if (totalWeight === 0) return null;
    return {
      x: 30 + (totalX / totalWeight) * (w - 60),
      y: 20 + (totalY / totalWeight) * (h - 40),
    };
  }, [selected, categories, section, w, h]);

  const floatingChips = useMemo(() => {
    if (!selectedCat) return [];
    const cat = categories.find((c) => c.id === selectedCat);
    if (!cat) return [];
    const pos = COMPASS_POSITIONS[selectedCat];
    const px = 30 + pos.x * (w - 60);
    const py = 20 + pos.y * (h - 40);
    return cat[section].slice(0, 5).map((term, i) => {
      const angle = (i * 72 - 90) * (Math.PI / 180);
      const chipR = 42;
      return { term, x: px + chipR * Math.cos(angle), y: py + chipR * Math.sin(angle) };
    });
  }, [selectedCat, categories, section, w, h]);

  return (
    <div data-testid="studio-compass-view">
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: 320, margin: "0 auto", display: "block" }}>
        <line x1={30} y1={h / 2} x2={w - 30} y2={h / 2} stroke="var(--labs-border)" strokeWidth={0.8} strokeDasharray="4 4" />
        <line x1={w / 2} y1={20} x2={w / 2} y2={h - 20} stroke="var(--labs-border)" strokeWidth={0.8} strokeDasharray="4 4" />
        <text x={w - 28} y={h / 2 - 6} fill="var(--labs-text-muted)" fontSize={8} textAnchor="end">{t("m2.rating.studioAxisFullBodied", "Full-Bodied")}</text>
        <text x={35} y={h / 2 - 6} fill="var(--labs-text-muted)" fontSize={8} textAnchor="start">{t("m2.rating.studioAxisLight", "Light")}</text>
        <text x={w / 2} y={28} fill="var(--labs-text-muted)" fontSize={8} textAnchor="middle">{t("m2.rating.studioAxisSmoky", "Smoky")}</text>
        <text x={w / 2} y={h - 16} fill="var(--labs-text-muted)" fontSize={8} textAnchor="middle">{t("m2.rating.studioAxisSweet", "Sweet")}</text>
        {categories.map((cat) => {
          const pos = COMPASS_POSITIONS[cat.id];
          const px = 30 + pos.x * (w - 60);
          const py = 20 + pos.y * (h - 40);
          const isSelected = selectedCat === cat.id;
          const isDimmed = selectedCat !== null && !isSelected;
          const r = isSelected ? 24 : 20;
          const color = CATEGORY_COLORS[cat.id];
          const count = cat[section].filter((term) => selected.has(term.toLowerCase())).length;
          return (
            <g key={cat.id} onClick={() => { setSelectedCat(isSelected ? null : cat.id); triggerHaptic("light"); }} style={{ cursor: "pointer" }}>
              <circle cx={px} cy={py} r={r + 6} fill={color} fillOpacity={0.06} style={{ transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" }} />
              <circle cx={px} cy={py} r={r} fill={color} fillOpacity={isDimmed ? 0.1 : 0.22} stroke={color} strokeWidth={isSelected ? 2 : 0.8} strokeOpacity={isDimmed ? 0.2 : 0.5} style={{ transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" }} />
              <text x={px} y={py - 3} textAnchor="middle" fill={isDimmed ? "var(--labs-text-muted)" : color} fontSize={8} fontWeight={600} style={{ transition: "all 0.3s ease", pointerEvents: "none", fontFamily: "'Playfair Display', Georgia, serif" }}>
                {cat.name.split(" / ")[0]}
              </text>
              <text x={px} y={py + 7} textAnchor="middle" fill={isDimmed ? "var(--labs-text-muted)" : "var(--labs-text-secondary, var(--labs-text-muted))"} fontSize={7} style={{ pointerEvents: "none", opacity: isDimmed ? 0.4 : 0.7 }}>
                {cat.name.split(" / ")[1] || ""}
              </text>
              {count > 0 && (
                <g>
                  <circle cx={px + r - 2} cy={py - r + 2} r={6} fill={color} />
                  <text x={px + r - 2} y={py - r + 2} textAnchor="middle" dominantBaseline="middle" fill="var(--labs-bg)" fontSize={7} fontWeight={700}>{count}</text>
                </g>
              )}
              {cat[section].filter((term) => selected.has(term.toLowerCase())).map((selTerm, ti) => {
                const dotAngle = (ti * 45 + 20) * (Math.PI / 180);
                const dotR = r * 0.65;
                return (
                  <circle key={selTerm} cx={px + dotR * Math.cos(dotAngle)} cy={py + dotR * Math.sin(dotAngle)}
                    r={3} fill={color} fillOpacity={0.9} style={{ transition: "all 0.3s ease", filter: `drop-shadow(0 0 3px ${color})` }} />
                );
              })}
            </g>
          );
        })}
        {floatingChips.map((chip) => {
          const isS = selected.has(chip.term.toLowerCase());
          const color = selectedCat ? CATEGORY_COLORS[selectedCat] : "var(--labs-accent)";
          return (
            <g key={chip.term} onClick={(e) => { e.stopPropagation(); onToggle(chip.term); triggerHaptic("light"); }} style={{ cursor: "pointer" }}>
              <rect x={chip.x - 22} y={chip.y - 7} width={44} height={14} rx={7} fill={isS ? color : "var(--labs-surface)"} fillOpacity={isS ? 0.35 : 0.85} stroke={color} strokeWidth={isS ? 1.2 : 0.5} strokeOpacity={isS ? 0.8 : 0.3} style={{ transition: "all 0.3s ease" }} />
              <text x={chip.x} y={chip.y + 1} textAnchor="middle" dominantBaseline="middle" fill={isS ? color : "var(--labs-text)"} fontSize={6} fontWeight={isS ? 700 : 400} style={{ pointerEvents: "none" }}>
                {chip.term.length > 8 ? chip.term.slice(0, 7) + "…" : chip.term}
              </text>
            </g>
          );
        })}
        {userPosition && (
          <g>
            <circle cx={userPosition.x} cy={userPosition.y} r={8} fill="var(--labs-accent)" fillOpacity={0.2} stroke="var(--labs-accent)" strokeWidth={1.5} strokeDasharray="3 2" style={{ transition: "all 0.5s ease" }} />
            <circle cx={userPosition.x} cy={userPosition.y} r={3} fill="var(--labs-accent)" style={{ transition: "all 0.5s ease" }} />
            <text x={userPosition.x} y={userPosition.y - 12} textAnchor="middle" fill="var(--labs-accent)" fontSize={7} fontWeight={600}>{t("m2.rating.studioYouLabel", "You")}</text>
          </g>
        )}
      </svg>
      {selCat && selectedCat && (
        <div style={{
          marginTop: 10, padding: 14, background: "var(--labs-surface)",
          borderRadius: "var(--labs-radius, 10px)", border: `1px solid ${CATEGORY_COLORS[selectedCat]}33`,
          animation: "labsFadeIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
        }} data-testid={`compass-detail-${selectedCat}`}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>{CATEGORY_ICONS[selectedCat]}</span>
            <span className="labs-serif" style={{ fontSize: 14, fontWeight: 600, color: CATEGORY_COLORS[selectedCat] }}>{selCat.name}</span>
            <button onClick={(e) => { e.stopPropagation(); setSelectedCat(null); }} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--labs-text-muted)" }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {selCat[section].map((term) => {
              const isS = selected.has(term.toLowerCase());
              return (
                <button key={term} onClick={(e) => { e.stopPropagation(); onToggle(term); }}
                  data-testid={`studio-term-${term.replace(/\s+/g, "-").toLowerCase()}`}
                  style={{
                    fontSize: 11, padding: "5px 11px", borderRadius: 20, fontFamily: "inherit",
                    background: isS ? `${CATEGORY_COLORS[selectedCat]}22` : "var(--labs-surface-elevated, var(--labs-bg))",
                    color: isS ? CATEGORY_COLORS[selectedCat] : "var(--labs-text)",
                    border: `1.5px solid ${isS ? CATEGORY_COLORS[selectedCat] : "var(--labs-border)"}`,
                    cursor: "pointer", transition: "all 0.2s ease", minHeight: 34,
                    boxShadow: isS ? `0 0 0 2px ${CATEGORY_COLORS[selectedCat]}44` : "none",
                  }}
                >
                  {isS ? "✓ " : ""}{term}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CompactRadar({
  categories, selected, onToggle, section,
}: {
  categories: VocabCategory[];
  selected: Set<string>;
  onToggle: (term: string) => void;
  section: TermSection;
}) {
  const { t } = useTranslation();
  const [enabledCats, setEnabledCats] = useState<Set<CategoryId>>(new Set(["islay", "speyside"]));
  const [selectedRadarCat, setSelectedRadarCat] = useState<CategoryId | null>(null);
  const [selectedAxis, setSelectedAxis] = useState<string | null>(null);
  const cx = 150, cy = 145, maxR = 110;
  const levels = [0.25, 0.5, 0.75, 1.0];

  const getPoint = (axisIndex: number, value: number) => {
    const angle = (axisIndex * 60 - 90) * (Math.PI / 180);
    return { x: cx + maxR * value * Math.cos(angle), y: cy + maxR * value * Math.sin(angle) };
  };

  const getPolygonPoints = (values: number[]) =>
    values.map((v, i) => { const p = getPoint(i, v); return `${p.x},${p.y}`; }).join(" ");

  const userProfile = useMemo(() => {
    const scores = RADAR_AXES.map(() => 0);
    selected.forEach((termLower) => {
      RADAR_AXES.forEach((axis, i) => {
        if (AXIS_KEYWORDS[axis].some((kw) => termLower.includes(kw))) scores[i] += 0.15;
      });
    });
    return scores.map((s) => Math.min(s, 1));
  }, [selected]);

  const toggleCat = (id: CategoryId) => {
    setEnabledCats((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const selCat = selectedRadarCat ? categories.find((c) => c.id === selectedRadarCat) : null;

  return (
    <div data-testid="studio-radar-view">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12, justifyContent: "center" }}>
        {categories.map((cat) => {
          const isOn = enabledCats.has(cat.id);
          return (
            <button key={cat.id} onClick={() => toggleCat(cat.id)}
              style={{
                fontSize: 10, padding: "4px 10px", borderRadius: 20, fontFamily: "inherit", cursor: "pointer",
                background: isOn ? `${CATEGORY_COLORS[cat.id]}18` : "var(--labs-surface)",
                border: `1px solid ${isOn ? CATEGORY_COLORS[cat.id] : "var(--labs-border)"}`,
                color: isOn ? CATEGORY_COLORS[cat.id] : "var(--labs-text-muted)",
                transition: "all 0.2s", display: "flex", alignItems: "center", gap: 4,
              }}
              data-testid={`studio-radar-toggle-${cat.id}`}
            >
              <span style={{ fontSize: 12 }}>{CATEGORY_ICONS[cat.id]}</span>
              {cat.name.split(" / ")[0]}
            </button>
          );
        })}
      </div>
      <svg viewBox="0 0 300 300" style={{ width: "100%", maxWidth: 300, margin: "0 auto", display: "block" }}>
        {levels.map((level) => (
          <polygon key={level} points={getPolygonPoints(RADAR_AXES.map(() => level))} fill="none" stroke="var(--labs-border)" strokeWidth={level === 1 ? 0.8 : 0.4} strokeOpacity={0.5} />
        ))}
        {RADAR_AXES.map((axis, i) => {
          const ep = getPoint(i, 1);
          const lp = getPoint(i, 1.18);
          return (
            <g key={axis} onClick={() => {
              setSelectedAxis(selectedAxis === axis ? null : axis);
              setSelectedRadarCat(null);
              triggerHaptic("light");
            }} style={{ cursor: "pointer" }}>
              <line x1={cx} y1={cy} x2={ep.x} y2={ep.y} stroke="var(--labs-border)" strokeWidth={0.4} strokeOpacity={0.4} />
              <text x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" fill="var(--labs-text-secondary, var(--labs-text-muted))" fontSize={9} fontWeight={500}>{axis}</text>
            </g>
          );
        })}
        {categories.filter((c) => enabledCats.has(c.id)).map((cat) => (
          <g key={cat.id} onClick={() => { setSelectedRadarCat(selectedRadarCat === cat.id ? null : cat.id); triggerHaptic("light"); }} style={{ cursor: "pointer" }}>
            <polygon points={getPolygonPoints(RADAR_PROFILES[cat.id])} fill={CATEGORY_COLORS[cat.id]} fillOpacity={0.12} stroke={CATEGORY_COLORS[cat.id]} strokeWidth={1.2} strokeOpacity={0.7} style={{ transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" }} />
          </g>
        ))}
        {selected.size > 0 && (
          <polygon points={getPolygonPoints(userProfile)} fill="var(--labs-accent)" fillOpacity={0.15} stroke="var(--labs-accent)" strokeWidth={1.5} strokeDasharray="5 3" style={{ transition: "all 0.5s ease" }} />
        )}
      </svg>
      {selected.size > 0 && (
        <div style={{ textAlign: "center", marginTop: 2 }}>
          <span style={{ fontSize: 9, color: "var(--labs-accent)", fontWeight: 500 }}>— {t("m2.rating.studioYourProfile", "Your tasting profile")} —</span>
        </div>
      )}
      {selectedAxis && !selectedRadarCat && (() => {
        const keywords = AXIS_KEYWORDS[selectedAxis] || [];
        const axisTerms: string[] = [];
        for (const cat of categories) {
          for (const term of cat[section]) {
            if (keywords.some((kw) => term.toLowerCase().includes(kw))) {
              axisTerms.push(term);
            }
          }
        }
        const uniqueTerms = Array.from(new Set(axisTerms));
        if (uniqueTerms.length === 0) return null;
        return (
          <div style={{
            marginTop: 10, padding: 14, background: "var(--labs-surface)",
            borderRadius: "var(--labs-radius, 10px)", border: "1px solid var(--labs-accent-muted)",
            animation: "labsFadeIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
          }} data-testid={`radar-axis-${selectedAxis.toLowerCase()}`}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span className="labs-serif" style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-accent)" }}>{selectedAxis}</span>
              <button onClick={() => setSelectedAxis(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--labs-text-muted)" }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {uniqueTerms.map((term) => {
                const isS = selected.has(term.toLowerCase());
                return (
                  <button key={term} onClick={() => onToggle(term)}
                    data-testid={`studio-term-${term.replace(/\s+/g, "-").toLowerCase()}`}
                    style={{
                      fontSize: 11, padding: "5px 11px", borderRadius: 20, fontFamily: "inherit",
                      background: isS ? "var(--labs-accent-muted)" : "var(--labs-surface-elevated, var(--labs-bg))",
                      color: isS ? "var(--labs-accent)" : "var(--labs-text)",
                      border: `1.5px solid ${isS ? "var(--labs-accent)" : "var(--labs-border)"}`,
                      cursor: "pointer", transition: "all 0.2s ease", minHeight: 34,
                      boxShadow: isS ? "0 0 0 2px var(--labs-accent-muted)" : "none",
                    }}
                  >
                    {isS ? "✓ " : ""}{term}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}
      {selCat && selectedRadarCat && (
        <div style={{
          marginTop: 10, padding: 14, background: "var(--labs-surface)",
          borderRadius: "var(--labs-radius, 10px)", border: `1px solid ${CATEGORY_COLORS[selectedRadarCat]}33`,
          animation: "labsFadeIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>{CATEGORY_ICONS[selectedRadarCat]}</span>
            <span className="labs-serif" style={{ fontSize: 14, fontWeight: 600, color: CATEGORY_COLORS[selectedRadarCat] }}>{selCat.name}</span>
            <button onClick={(e) => { e.stopPropagation(); setSelectedRadarCat(null); }} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--labs-text-muted)" }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {selCat[section].map((term) => {
              const isS = selected.has(term.toLowerCase());
              return (
                <button key={term} onClick={(e) => { e.stopPropagation(); onToggle(term); }}
                  data-testid={`studio-term-${term.replace(/\s+/g, "-").toLowerCase()}`}
                  style={{
                    fontSize: 11, padding: "5px 11px", borderRadius: 20, fontFamily: "inherit",
                    background: isS ? `${CATEGORY_COLORS[selectedRadarCat]}22` : "var(--labs-surface-elevated, var(--labs-bg))",
                    color: isS ? CATEGORY_COLORS[selectedRadarCat] : "var(--labs-text)",
                    border: `1.5px solid ${isS ? CATEGORY_COLORS[selectedRadarCat] : "var(--labs-border)"}`,
                    cursor: "pointer", transition: "all 0.2s ease", minHeight: 34,
                    boxShadow: isS ? `0 0 0 2px ${CATEGORY_COLORS[selectedRadarCat]}44` : "none",
                  }}
                >
                  {isS ? "✓ " : ""}{term}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DescribeView({
  selected, onToggle, section, categories,
}: {
  selected: Set<string>;
  onToggle: (term: string) => void;
  section: TermSection;
  categories: VocabCategory[];
}) {
  const { t, i18n } = useTranslation();
  const isDE = i18n.language === "de";
  const [description, setDescription] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [tastesLikeOpen, setTastesLikeOpen] = useState(false);
  const [tastesLikeQuery, setTastesLikeQuery] = useState("");
  const [tastesLikeResults, setTastesLikeResults] = useState<Array<{ name: string; distillery: string }>>([]);
  const [tastesLikeLoading, setTastesLikeLoading] = useState(false);
  const [refSuggestions, setRefSuggestions] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tastesLikeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (tastesLikeDebounceRef.current) clearTimeout(tastesLikeDebounceRef.current);
    };
  }, []);

  const allTerms = useMemo(() => getAllTermsForSection(categories, section), [categories, section]);

  const handleDescribe = useCallback(async (text: string) => {
    if (!text.trim() || text.trim().length < 3) { setSuggestions([]); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/labs/flavour-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: text, section, language: isDE ? "de" : "en" }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.terms || []);
      }
    } catch {
      const lower = text.toLowerCase();
      const matched = allTerms.filter((term) =>
        term.toLowerCase().includes(lower) ||
        FLAVOR_CATEGORIES.some((cat) =>
          cat.subcategories.some((sub) =>
            sub.keywords.some((kw) => kw.includes(lower)) && (sub.en === term || sub.de === term)
          )
        )
      );
      setSuggestions(matched.slice(0, 8));
    }
    setLoading(false);
  }, [section, isDE, allTerms]);

  const handleInputChange = useCallback((text: string) => {
    setDescription(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleDescribe(text), 600);
  }, [handleDescribe]);

  const handleTastesLikeSearch = useCallback(async (query: string) => {
    if (!query.trim()) { setTastesLikeResults([]); return; }
    setTastesLikeLoading(true);
    try {
      const res = await fetch(`/api/labs/explore/whiskies?search=${encodeURIComponent(query)}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        setTastesLikeResults((data || []).slice(0, 8).map((w: Record<string, string>) => ({ name: w.name, distillery: w.distillery })));
      }
    } catch { setTastesLikeResults([]); }
    setTastesLikeLoading(false);
  }, []);

  const handleSelectReference = useCallback(async (name: string, distillery: string) => {
    setTastesLikeOpen(false);
    setLoading(true);
    try {
      const res = await fetch("/api/labs/flavour-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceWhisky: `${name} ${distillery}`, section, language: isDE ? "de" : "en" }),
      });
      if (res.ok) {
        const data = await res.json();
        setRefSuggestions(data.terms || []);
      }
    } catch { setRefSuggestions([]); }
    setLoading(false);
  }, [section, isDE]);

  return (
    <div data-testid="studio-describe-view">
      <div style={{ position: "relative", marginBottom: 12 }}>
        <textarea
          value={description}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={t("m2.rating.studioDescribePlaceholder", "Describe what you taste...")}
          rows={3}
          className="labs-input"
          data-testid="studio-describe-input"
          style={{ width: "100%", fontSize: 13, padding: "12px 14px", resize: "none", boxSizing: "border-box" }}
        />
        {loading && (
          <div style={{ position: "absolute", right: 12, top: 12 }}>
            <Sparkles style={{ width: 16, height: 16, color: "var(--labs-accent)", animation: "spin 1s linear infinite" }} />
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--labs-accent)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
            {t("m2.rating.studioSuggestedFlavours", "Suggested Flavours")}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {suggestions.map((term, i) => {
              const isS = selected.has(term.toLowerCase());
              return (
                <button
                  key={term} onClick={() => onToggle(term)}
                  data-testid={`studio-suggest-${term.replace(/\s+/g, "-").toLowerCase()}`}
                  style={{
                    fontSize: 11, padding: "5px 11px", borderRadius: 20, fontFamily: "inherit",
                    background: isS ? "var(--labs-accent)" : "var(--labs-surface)",
                    color: isS ? "var(--labs-bg)" : "var(--labs-text)",
                    border: `1.5px solid ${isS ? "var(--labs-accent)" : "var(--labs-border)"}`,
                    cursor: "pointer", transition: "all 0.2s ease", minHeight: 34,
                    animation: `labsFadeIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both`,
                    animationDelay: `${i * 60}ms`,
                  }}
                >
                  {isS ? "✓ " : ""}{term}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={() => setTastesLikeOpen(!tastesLikeOpen)}
        data-testid="studio-tastes-like-button"
        style={{
          display: "flex", alignItems: "center", gap: 6, width: "100%",
          padding: "10px 14px", borderRadius: 10,
          background: "var(--labs-surface)", border: "1px solid var(--labs-border-subtle)",
          cursor: "pointer", fontFamily: "inherit", color: "var(--labs-text)",
          fontSize: 12, fontWeight: 500,
        }}
      >
        <Search style={{ width: 14, height: 14, color: "var(--labs-accent)" }} />
        {t("m2.rating.studioTastesLike", "Tastes like...")}
      </button>

      {tastesLikeOpen && (
        <div style={{ marginTop: 8, padding: 12, background: "var(--labs-surface)", borderRadius: 10, border: "1px solid var(--labs-border-subtle)", animation: "labsFadeIn 200ms ease both" }}>
          <input
            className="labs-input"
            placeholder={t("m2.rating.studioSearchWhisky", "Search whisky...")}
            value={tastesLikeQuery}
            onChange={(e) => {
              setTastesLikeQuery(e.target.value);
              if (tastesLikeDebounceRef.current) clearTimeout(tastesLikeDebounceRef.current);
              tastesLikeDebounceRef.current = setTimeout(() => handleTastesLikeSearch(e.target.value), 350);
            }}
            data-testid="studio-tastes-like-search"
            style={{ width: "100%", fontSize: 12, padding: "8px 12px", marginBottom: 8, boxSizing: "border-box" }}
          />
          {tastesLikeLoading && <div style={{ fontSize: 11, color: "var(--labs-text-muted)", padding: 4 }}>{t("m2.rating.studioSearching", "Searching...")}</div>}
          {tastesLikeResults.map((w) => (
            <button
              key={`${w.name}-${w.distillery}`}
              onClick={() => handleSelectReference(w.name, w.distillery)}
              style={{
                display: "block", width: "100%", padding: "8px 10px", borderRadius: 8,
                background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                textAlign: "left", color: "var(--labs-text)", fontSize: 12,
              }}
              data-testid={`tastes-like-${w.name.replace(/\s+/g, "-").toLowerCase()}`}
            >
              <strong>{w.name}</strong>
              {w.distillery && <span style={{ color: "var(--labs-text-muted)", marginLeft: 6 }}>{w.distillery}</span>}
            </button>
          ))}
        </div>
      )}

      {refSuggestions.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--labs-accent)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
            {t("m2.rating.studioTypicalFlavours", "Typical Flavours")}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {refSuggestions.map((term, i) => {
              const isS = selected.has(term.toLowerCase());
              return (
                <button
                  key={term} onClick={() => onToggle(term)}
                  style={{
                    fontSize: 11, padding: "5px 11px", borderRadius: 20, fontFamily: "inherit",
                    background: isS ? "var(--labs-accent)" : "var(--labs-surface)",
                    color: isS ? "var(--labs-bg)" : "var(--labs-text)",
                    border: `1.5px solid ${isS ? "var(--labs-accent)" : "var(--labs-border)"}`,
                    cursor: "pointer", transition: "all 0.2s ease", minHeight: 34,
                    animation: `labsFadeIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both`,
                    animationDelay: `${i * 60}ms`,
                  }}
                >
                  {isS ? "✓ " : ""}{term}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DiscoverView({
  categories, section, selected, onToggle,
}: {
  categories: VocabCategory[];
  section: TermSection;
  selected: Set<string>;
  onToggle: (term: string) => void;
}) {
  const { t } = useTranslation();
  const allTerms = useMemo(() => {
    const terms: Array<{ term: string; catId: CategoryId; color: string }> = [];
    for (const cat of categories) {
      for (const term of cat[section]) {
        if (!selected.has(term.toLowerCase())) {
          terms.push({ term, catId: cat.id, color: CATEGORY_COLORS[cat.id] });
        }
      }
    }
    return terms;
  }, [categories, section, selected]);

  const [cardIndex, setCardIndex] = useState(0);
  const [swipeDir, setSwipeDir] = useState<"left" | "right" | null>(null);
  const [companions, setCompanions] = useState<string[]>([]);

  const currentCard = allTerms[cardIndex] || null;
  const nextCard = allTerms[cardIndex + 1] || null;

  const handleSwipe = useCallback((dir: "left" | "right") => {
    if (!currentCard) return;
    setSwipeDir(dir);
    triggerHaptic(dir === "right" ? "success" : "light");
    if (dir === "right") {
      onToggle(currentCard.term);
      const comps = COMPANION_MAP[currentCard.term];
      if (comps) setCompanions(comps.filter((c) => !selected.has(c.toLowerCase())));
      else setCompanions([]);
    } else {
      setCompanions([]);
    }
    setTimeout(() => {
      setSwipeDir(null);
      setCardIndex((prev) => Math.min(prev + 1, allTerms.length));
    }, 250);
  }, [currentCard, onToggle, selected, allTerms.length]);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      handleSwipe(dx > 0 ? "right" : "left");
    }
    touchStartRef.current = null;
  };

  if (!currentCard && allTerms.length === 0) {
    return (
      <div data-testid="studio-discover-view" style={{ textAlign: "center", padding: "40px 20px", color: "var(--labs-text-muted)" }}>
        <span style={{ fontSize: 32, display: "block", marginBottom: 8 }}>🎉</span>
        <span style={{ fontSize: 13 }}>{t("m2.rating.studioAllDiscovered", "All flavours discovered!")}</span>
      </div>
    );
  }

  return (
    <div data-testid="studio-discover-view">
      <div style={{ position: "relative", height: 180, display: "flex", justifyContent: "center", alignItems: "center", marginBottom: 12 }}>
        {nextCard && (
          <div style={{
            position: "absolute", width: "80%", maxWidth: 260, height: 140,
            background: `${nextCard.color}08`, border: `1px solid ${nextCard.color}22`,
            borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
            transform: "scale(0.94) translateY(6px)", opacity: 0.6,
          }}>
            <span style={{ fontSize: 14, color: "var(--labs-text-muted)" }}>{nextCard.term}</span>
          </div>
        )}
        {currentCard && (
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            data-testid="studio-discover-card"
            style={{
              position: "absolute", width: "85%", maxWidth: 280, height: 150,
              background: `linear-gradient(135deg, ${currentCard.color}18, ${currentCard.color}08)`,
              border: `1.5px solid ${currentCard.color}44`,
              borderRadius: 18, padding: 20, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 8,
              cursor: "grab",
              transition: swipeDir ? "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease" : "none",
              transform: swipeDir === "right" ? "translateX(120%) rotate(8deg)" : swipeDir === "left" ? "translateX(-120%) rotate(-8deg)" : "translateX(0)",
              opacity: swipeDir ? 0 : 1,
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            }}
          >
            <span className="labs-serif" style={{ fontSize: 22, fontWeight: 700, color: currentCard.color }}>{currentCard.term}</span>
            <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>
              {categories.find((c) => c.id === currentCard.catId)?.name || ""}
            </span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 12 }}>
        <button onClick={() => handleSwipe("left")} data-testid="studio-discover-skip"
          style={{
            width: 52, height: 52, borderRadius: "50%",
            background: "var(--labs-surface)", border: "1.5px solid var(--labs-border)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--labs-text-muted)", transition: "all 0.15s",
          }}
        >
          <X style={{ width: 20, height: 20 }} />
        </button>
        <button onClick={() => handleSwipe("right")} data-testid="studio-discover-add"
          style={{
            width: 52, height: 52, borderRadius: "50%",
            background: "var(--labs-accent)", border: "none",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--labs-bg)", transition: "all 0.15s",
            boxShadow: "0 2px 12px rgba(201, 167, 108, 0.4)",
          }}
        >
          <Plus style={{ width: 22, height: 22 }} />
        </button>
      </div>

      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: "var(--labs-text-muted)" }}>
          {t("m2.rating.studioSwipeHint", "Swipe right to add, left to skip")}
        </span>
      </div>

      {companions.length > 0 && (
        <div style={{
          padding: 12, background: "var(--labs-surface)", borderRadius: 10,
          border: "1px solid var(--labs-border-subtle)", animation: "labsFadeIn 300ms ease both",
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--labs-accent)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
            {t("m2.rating.studioOftenPaired", "Often paired with")}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {companions.map((term) => {
              const isS = selected.has(term.toLowerCase());
              return (
                <button key={term} onClick={() => onToggle(term)}
                  style={{
                    fontSize: 11, padding: "5px 11px", borderRadius: 20, fontFamily: "inherit",
                    background: isS ? "var(--labs-accent)" : "var(--labs-surface-elevated, var(--labs-bg))",
                    color: isS ? "var(--labs-bg)" : "var(--labs-text)",
                    border: `1.5px solid ${isS ? "var(--labs-accent)" : "var(--labs-border)"}`,
                    cursor: "pointer", transition: "all 0.2s ease", minHeight: 34,
                  }}
                  data-testid={`studio-companion-${term.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  {isS ? "✓ " : ""}{term}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FlavourStudioSheet({
  open, onOpenChange, dimension, existingChips, onChipsChange, disabled, initialView,
}: FlavourStudioSheetProps) {
  const { t, i18n } = useTranslation();
  const isDE = i18n.language === "de";
  const [view, setView] = useState<StudioView>(initialView || "guide");

  useEffect(() => {
    if (open) {
      setView(initialView || "guide");
    }
  }, [open, initialView]);
  const [customInput, setCustomInput] = useState("");
  const categories = useVocabCategories();
  const section = DIM_TO_SECTION[dimension] || "nose";

  const [selectedTerms, setSelectedTerms] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setSelectedTerms(new Set(existingChips.map((c) => {
        const normalized = FLAVOR_CATEGORIES.reduce((acc, cat) => {
          for (const sub of cat.subcategories) {
            if (sub.en.toLowerCase() === c.toLowerCase() || sub.de.toLowerCase() === c.toLowerCase()) return sub.en.toLowerCase();
          }
          return acc;
        }, c.toLowerCase());
        return normalized;
      })));
    }
  }, [open, existingChips]);

  const toggleTerm = useCallback((term: string) => {
    const lower = term.toLowerCase();
    setSelectedTerms((prev) => {
      const next = new Set(prev);
      if (next.has(lower)) next.delete(lower);
      else next.add(lower);
      triggerHaptic("light");
      return next;
    });
  }, []);

  const handleClose = useCallback(() => {
    const finalChips = Array.from(selectedTerms).map((lower) => {
      const existing = existingChips.find((c) => c.toLowerCase() === lower);
      if (existing) return existing;
      const allSectionTerms: string[] = [];
      for (const cat of categories) {
        allSectionTerms.push(...cat[section]);
      }
      for (const cat of FLAVOR_CATEGORIES) {
        for (const sub of cat.subcategories) {
          if (sub.en.toLowerCase() === lower) return sub.en;
          if (sub.de.toLowerCase() === lower) return sub.en;
        }
      }
      const match = allSectionTerms.find((t) => t.toLowerCase() === lower);
      if (match) return match;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    });
    onChipsChange(finalChips);
    onOpenChange(false);
  }, [selectedTerms, existingChips, onChipsChange, onOpenChange, categories, section]);

  const addCustomTag = useCallback(() => {
    const tag = customInput.trim();
    if (!tag) return;
    const lower = tag.toLowerCase();
    if (!selectedTerms.has(lower)) {
      setSelectedTerms((prev) => new Set(prev).add(lower));
      triggerHaptic("light");
    }
    setCustomInput("");
  }, [customInput, selectedTerms]);

  const quickTerms = useMemo(() => getQuickAddTerms(categories, section), [categories, section]);

  const dimLabel = dimension === "nose" ? (isDE ? "Nase" : "Nose") : dimension === "taste" ? (isDE ? "Gaumen" : "Palate") : dimension === "finish" ? (isDE ? "Abgang" : "Finish") : (isDE ? "Balance" : "Balance");

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) handleClose(); else onOpenChange(o); }}>
      <DrawerContent
        style={{
          maxHeight: "88vh",
          background: "var(--labs-bg, #1a1714)",
          borderColor: "var(--labs-border, #3a332b)",
        }}
        data-testid="flavour-studio-sheet"
      >
        <DrawerTitle className="sr-only">Flavour Studio</DrawerTitle>
        <div style={{ padding: "12px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="labs-serif" style={{ fontSize: 16, fontWeight: 700, color: "var(--labs-text)" }}>
              Flavour Studio
            </span>
            <span style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 10,
              background: "var(--labs-accent-muted)", color: "var(--labs-accent)", fontWeight: 600,
            }}>
              {dimLabel}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {selectedTerms.size > 0 && (
              <span style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 10,
                background: "var(--labs-accent)", color: "var(--labs-bg)", fontWeight: 700,
              }} data-testid="studio-count-badge">
                {selectedTerms.size}
              </span>
            )}
            <button onClick={handleClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--labs-text-muted)" }} data-testid="studio-close">
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </div>

        <div style={{ padding: "12px 16px", overflowY: "auto", flex: 1, maxHeight: "calc(88vh - 160px)" }}>
          <SegmentedControl value={view} onChange={setView} />

          {view === "guide" && <GuidedView selected={selectedTerms} onToggle={toggleTerm} isDE={isDE} />}
          {view === "wheel" && <CompactWheel categories={categories} section={section} selected={selectedTerms} onToggle={toggleTerm} />}
          {view === "compass" && <CompactCompass categories={categories} section={section} selected={selectedTerms} onToggle={toggleTerm} />}
          {view === "radar" && <CompactRadar categories={categories} section={section} selected={selectedTerms} onToggle={toggleTerm} />}
          {view === "describe" && <DescribeView selected={selectedTerms} onToggle={toggleTerm} section={section} categories={categories} />}
          {view === "discover" && <DiscoverView categories={categories} section={section} selected={selectedTerms} onToggle={toggleTerm} />}
        </div>

        <div style={{
          padding: "8px 16px 16px", borderTop: "1px solid var(--labs-border-subtle)",
          background: "var(--labs-bg, #1a1714)",
        }}>
          {quickTerms.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: "var(--labs-text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                {t("m2.rating.studioQuickAdd", "Quick Add")}
              </div>
              <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 4 }}>
                {quickTerms.map((term) => {
                  const isS = selectedTerms.has(term.toLowerCase());
                  const catId = findTermCategory(term, categories);
                  const color = catId ? CATEGORY_COLORS[catId] : "var(--labs-accent)";
                  return (
                    <button key={term} onClick={() => toggleTerm(term)}
                      data-testid={`studio-quick-${term.replace(/\s+/g, "-").toLowerCase()}`}
                      style={{
                        fontSize: 10, padding: "4px 10px", borderRadius: 16, fontFamily: "inherit",
                        whiteSpace: "nowrap", flexShrink: 0, minHeight: 28,
                        background: isS ? `${color}22` : "var(--labs-surface)",
                        color: isS ? color : "var(--labs-text-muted)",
                        border: `1px solid ${isS ? color : "var(--labs-border-subtle)"}`,
                        cursor: "pointer", transition: "all 0.15s",
                      }}
                    >
                      {isS ? "✓ " : ""}{term}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedTerms.size > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 4 }}>
                {Array.from(selectedTerms).map((lower) => {
                  const display = lower.charAt(0).toUpperCase() + lower.slice(1);
                  const catId = findTermCategory(display, categories);
                  const color = catId ? CATEGORY_COLORS[catId] : "var(--labs-accent)";
                  return (
                    <button key={lower} onClick={() => toggleTerm(display)}
                      data-testid={`studio-selected-${lower.replace(/\s+/g, "-")}`}
                      style={{
                        fontSize: 10, padding: "4px 10px", borderRadius: 16, fontFamily: "inherit",
                        whiteSpace: "nowrap", flexShrink: 0, minHeight: 28,
                        background: "var(--labs-accent)", color: "var(--labs-bg)", fontWeight: 600,
                        border: "none", cursor: "pointer", transition: "all 0.15s",
                        display: "flex", alignItems: "center", gap: 4,
                        borderLeft: `3px solid ${color}`,
                      }}
                    >
                      {display}
                      <span style={{ fontSize: 9, opacity: 0.7 }}>×</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 6 }}>
            <input
              className="labs-input"
              placeholder={t("m2.rating.studioCustomPlaceholder", "Custom descriptor...")}
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }}
              disabled={disabled}
              style={{ flex: 1, fontSize: 12, padding: "6px 10px" }}
              data-testid="studio-custom-input"
            />
            <button onClick={addCustomTag} disabled={!customInput.trim() || disabled}
              data-testid="studio-custom-add"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 32, height: 32, borderRadius: 8,
                border: "1px solid var(--labs-border)",
                background: customInput.trim() ? "var(--labs-accent)" : "var(--labs-surface)",
                color: customInput.trim() ? "var(--labs-bg)" : "var(--labs-text-muted)",
                cursor: customInput.trim() && !disabled ? "pointer" : "default",
                fontFamily: "inherit",
              }}
            >
              <Plus style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

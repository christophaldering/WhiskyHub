import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Plus, Sparkles, Search, ChevronRight, Check, HelpCircle, RotateCcw } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { FLAVOR_CATEGORIES, JOURNEY_CATEGORY_ORDER, FLAVOR_PROFILES, type FlavorCategory, type FlavorSubGroup } from "@/labs/data/flavor-data";
import { triggerHaptic } from "@/labs/hooks/useHaptic";
import type { DimKey } from "./LabsRatingPanel";
import { STYLE_CATEGORY_SVG, GUIDE_CATEGORY_SVG, renderIcon } from "@/labs/components/FlavourIcons";

export type StudioView = "guide" | "journey" | "wheel" | "compass" | "radar" | "describe";
type CategoryId = "islay" | "speyside" | "sherry" | "bourbon" | "highland" | "japanese";
type TermSection = "nose" | "palate" | "finish";

const CATEGORY_COLORS: Record<CategoryId, string> = {
  islay: "#6B9EAE", speyside: "#8EAF5A", sherry: "#C06868",
  bourbon: "#D4A05A", highland: "#9B7DB8", japanese: "#E8A0B4",
};

function tintBg(hex: string, strength: "subtle" | "medium" | "strong" | "chip"): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const alpha = strength === "subtle" ? 0.35 : strength === "medium" ? 0.5 : strength === "strong" ? 0.65 : 0.45;
  const bgR = 0x1a, bgG = 0x17, bgB = 0x14;
  const mr = Math.round(bgR + (r - bgR) * alpha);
  const mg = Math.round(bgG + (g - bgG) * alpha);
  const mb = Math.round(bgB + (b - bgB) * alpha);
  return `#${mr.toString(16).padStart(2, "0")}${mg.toString(16).padStart(2, "0")}${mb.toString(16).padStart(2, "0")}`;
}

function tintBorder(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const bgR = 0x1a, bgG = 0x17, bgB = 0x14;
  const alpha = 0.6;
  const mr = Math.round(bgR + (r - bgR) * alpha);
  const mg = Math.round(bgG + (g - bgG) * alpha);
  const mb = Math.round(bgB + (b - bgB) * alpha);
  return `#${mr.toString(16).padStart(2, "0")}${mg.toString(16).padStart(2, "0")}${mb.toString(16).padStart(2, "0")}`;
}

function adjustCategoryTextColor(hex: string, isDark: boolean): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (isDark) {
    if (luminance > 0.6) return hex;
    const factor = 0.35;
    const lr = Math.min(255, Math.round(r + (255 - r) * factor));
    const lg = Math.min(255, Math.round(g + (255 - g) * factor));
    const lb = Math.min(255, Math.round(b + (255 - b) * factor));
    return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
  } else {
    if (luminance < 0.45) return hex;
    const factor = 0.3;
    const lr = Math.round(r * (1 - factor));
    const lg = Math.round(g * (1 - factor));
    const lb = Math.round(b * (1 - factor));
    return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
  }
}

function useIsDarkTheme(): boolean {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const shell = document.querySelector('.labs-shell');
    if (shell) {
      setIsDark(!shell.classList.contains('labs-light'));
      const observer = new MutationObserver(() => {
        setIsDark(!shell.classList.contains('labs-light'));
      });
      observer.observe(shell, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
    }
  }, []);
  return isDark;
}


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

const LS_KEY_SHEET = 'flavourstudio-mode-sheet';

function getStoredSheetView(): StudioView {
  try {
    const v = localStorage.getItem(LS_KEY_SHEET);
    if (v && ["guide", "journey", "describe", "wheel", "compass", "radar"].includes(v)) return v as StudioView;
  } catch {}
  return "guide";
}

function SegmentedControl({ value, onChange }: { value: StudioView; onChange: (v: StudioView) => void }) {
  const { t } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const allOptions: { key: StudioView; label: string; icon?: string }[] = [
    { key: "guide", label: t("m2.rating.studioGuide", "Guide") },
    { key: "journey", label: t("m2.rating.studioJourney", "Journey") },
    { key: "describe", label: t("m2.rating.studioDescribe", "Describe") },
    { key: "wheel", label: t("m2.rating.studioWheel", "Wheel"), icon: "◎" },
    { key: "compass", label: t("m2.rating.studioCompass", "Compass"), icon: "◇" },
    { key: "radar", label: "Radar", icon: "⬡" },
  ];

  const currentLabel = allOptions.find((o) => o.key === value)?.label || allOptions[0].label;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  const handleSelect = (key: StudioView) => {
    onChange(key);
    setDropdownOpen(false);
    try { localStorage.setItem(LS_KEY_SHEET, key); } catch {}
    triggerHaptic("light");
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative", marginBottom: "var(--labs-space-md)" }} data-testid="studio-segmented-control">
      <button
        onClick={() => setDropdownOpen((p) => !p)}
        className="labs-btn-ghost"
        data-testid="studio-mode-switcher"
        style={{
          display: "flex", alignItems: "center", gap: "var(--labs-space-xs)",
          padding: "var(--labs-space-xs) 0", fontSize: 12,
        }}
      >
        <span>{t("m2.rating.studioViewLabel", "View")}:</span>
        <span style={{ color: "var(--labs-accent)", fontWeight: 600 }}>{currentLabel}</span>
        <span style={{ fontSize: 10, transition: "transform 200ms", transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
      </button>
      {dropdownOpen && (
        <div
          className="labs-card"
          style={{
            position: "absolute", top: "100%", left: 0, zIndex: 20,
            marginTop: "var(--labs-space-xs)", padding: "var(--labs-space-xs)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            minWidth: 180,
            animation: "labsFadeIn 150ms ease both",
          }}
        >
          {allOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => handleSelect(opt.key)}
              className="labs-btn-ghost"
              data-testid={`studio-view-${opt.key}`}
              style={{
                display: "flex", alignItems: "center", gap: "var(--labs-space-xs)",
                width: "100%", textAlign: "left",
                padding: "var(--labs-space-sm) var(--labs-space-md)", borderRadius: "var(--labs-radius-sm)",
                background: value === opt.key ? "var(--labs-accent-muted)" : "transparent",
                color: value === opt.key ? "var(--labs-accent)" : "var(--labs-text-secondary)",
                fontSize: 13, fontWeight: value === opt.key ? 600 : 400,
              }}
            >
              {opt.icon && <span style={{ fontSize: 12 }}>{opt.icon}</span>}
              {opt.label}
            </button>
          ))}
        </div>
      )}
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


function GuidedView({
  selected, onToggle, isDE,
}: {
  selected: Set<string>;
  onToggle: (term: string) => void;
  isDE: boolean;
}) {
  const { t } = useTranslation();
  const isDark = useIsDarkTheme();
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
          display: "flex", alignItems: "center", gap: "var(--labs-space-xs)", marginBottom: "var(--labs-space-md)",
          fontSize: 12, color: "var(--labs-text-secondary)", flexWrap: "wrap",
        }} data-testid="guide-breadcrumbs">
          {breadcrumbs.map((crumb, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: "var(--labs-space-xs)" }}>
                {i > 0 && <ChevronRight style={{ width: 12, height: 12, color: "var(--labs-text-secondary)" }} />}
                <button
                  onClick={() => { if (!isLast) goBack(crumb.level); }}
                  className="labs-btn-ghost"
                  data-testid={`guide-breadcrumb-${i}`}
                  style={{
                    fontSize: 12, padding: "2px var(--labs-space-xs)", borderRadius: "var(--labs-space-xs)",
                    color: isLast
                      ? (navCategory ? adjustCategoryTextColor(navCategory.color, isDark) : "var(--labs-text)")
                      : "var(--labs-text-secondary)",
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
              <div style={{ marginBottom: "var(--labs-space-md)" }}>
                <div className="ty-label" style={{ color: "var(--labs-accent)", marginBottom: "var(--labs-space-sm)" }}>
                  {t("m2.rating.studioGuideSelected", "Your Selections")}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-sm)" }}>
                  {Array.from(selectedByCategory.entries()).map(([catId, paths]) => {
                    const cat = FLAVOR_CATEGORIES.find((c) => c.id === catId);
                    const color = cat?.color || "var(--labs-accent)";
                    const catLabel = cat ? (isDE ? cat.de : cat.en) : catId;
                    return (
                      <div key={catId}>
                        <div style={{
                          display: "flex", alignItems: "center", gap: "var(--labs-space-xs)", marginBottom: "var(--labs-space-xs)",
                          fontSize: 11, color: adjustCategoryTextColor(color as string, isDark), fontWeight: 600,
                        }}>
                          <span style={{ fontSize: 12, display: "inline-flex" }}>{renderIcon(GUIDE_CATEGORY_SVG, catId, 12)}</span>
                          <span>{catLabel}</span>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--labs-space-xs)", paddingLeft: 2 }}>
                          {paths.map((p) => (
                            <button
                              key={p.descriptorKey}
                              onClick={() => onToggle(p.descriptorKey)}
                              className="labs-chip"
                              data-testid={`guide-selected-${p.descriptorKey.replace(/\s+/g, "-").toLowerCase()}`}
                              style={{
                                background: tintBg(color, "chip"), color: "#f5f0e8",
                                border: `1px solid ${tintBorder(color)}`,
                              }}
                            >
                              {p.subgroupLabel && (
                                <span style={{ fontSize: 11, color: "var(--labs-text-secondary)" }}>{p.subgroupLabel} ›</span>
                              )}
                              <span style={{ fontWeight: 600 }}>{p.descriptorLabel}</span>
                              <span style={{ fontSize: 11, color: "#f5f0e8" }}>×</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="ty-label" style={{ marginBottom: "var(--labs-space-sm)" }}>
              {t("m2.rating.studioGuideCategories", "Tap to explore")}
            </div>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--labs-space-sm)",
            }} data-testid="guide-category-grid">
              {FLAVOR_CATEGORIES.map((cat, i) => {
                const count = countSelectedInCategory(cat);
                const hasSubgroups = !!cat.subgroups && cat.subgroups.length > 0;
                return (
                  <button
                    key={cat.id}
                    onClick={() => drillDown(cat.id)}
                    className="labs-card labs-card-interactive"
                    data-testid={`guide-category-${cat.id}`}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "flex-start",
                      padding: "var(--labs-space-sm) 14px", fontFamily: "inherit",
                      background: count > 0 ? tintBg(cat.color, "subtle") : undefined,
                      borderColor: count > 0 ? tintBorder(cat.color) : undefined,
                      borderWidth: "1.5px",
                      textAlign: "left",
                      position: "relative", overflow: "hidden",
                      animation: `labsFadeIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both`,
                      animationDelay: `${i * 40}ms`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--labs-space-xs)", width: "100%" }}>
                      <span style={{ fontSize: 16, lineHeight: 1 }}>
                        {renderIcon(GUIDE_CATEGORY_SVG, cat.id, 16)}
                      </span>
                      <span className="labs-serif" style={{
                        fontSize: 13, fontWeight: 600, color: count > 0 ? "#f5f0e8" : adjustCategoryTextColor(cat.color, isDark),
                      }}>
                        {isDE ? cat.de : cat.en}
                      </span>
                      {count > 0 && (
                        <span style={{
                          fontSize: 11, padding: "1px 6px", borderRadius: "var(--labs-space-sm)",
                          background: cat.color, color: "var(--labs-bg)", fontWeight: 700,
                          marginLeft: "auto",
                        }}>
                          {count}
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: 11, color: "var(--labs-text-secondary)", marginTop: "var(--labs-space-xs)",
                      display: "flex", alignItems: "center", gap: 3,
                    }}>
                      <span>
                        {hasSubgroups
                          ? `${cat.subgroups!.length} ${t("m2.rating.studioGuideGroups", "groups")}`
                          : `${cat.subcategories.length} ${t("m2.rating.studioGuideNotes", "notes")}`}
                      </span>
                      <ChevronRight style={{ width: 10, height: 10, color: "var(--labs-text-secondary)" }} />
                    </div>
                    {count > 0 && (
                      <div style={{
                        position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
                        background: cat.color,
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
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-sm)" }}>
                {navCategory.subgroups.map((sg, i) => {
                  const sgCount = countSelectedInSubgroup(sg);
                  return (
                    <button
                      key={sg.id}
                      onClick={() => drillDown(navCategory.id, sg.id)}
                      className="labs-card labs-card-interactive"
                      data-testid={`guide-subgroup-${sg.id}`}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "var(--labs-space-md) var(--labs-space-md)", fontFamily: "inherit",
                        background: sgCount > 0 ? tintBg(navCategory.color, "subtle") : undefined,
                        borderColor: sgCount > 0 ? tintBorder(navCategory.color) : undefined,
                        borderWidth: "1.5px",
                        textAlign: "left",
                        animation: `labsFadeIn 250ms cubic-bezier(0.34, 1.56, 0.64, 1) both`,
                        animationDelay: `${i * 60}ms`,
                      }}
                    >
                      <div>
                        <div className="labs-serif" style={{
                          fontSize: 14, fontWeight: 600, color: sgCount > 0 ? "#f5f0e8" : adjustCategoryTextColor(navCategory.color, isDark),
                        }}>
                          {isDE ? sg.de : sg.en}
                        </div>
                        <div style={{ fontSize: 11, color: sgCount > 0 ? "var(--labs-text)" : "var(--labs-text-secondary)", marginTop: "2px" }}>
                          {sg.descriptors.map((d) => isDE ? d.de : d.en).join(", ")}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--labs-space-xs)" }}>
                        {sgCount > 0 && (
                          <span style={{
                            fontSize: 11, padding: "1px 6px", borderRadius: "var(--labs-space-sm)",
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
                  marginTop: "var(--labs-space-sm)", padding: "var(--labs-space-sm) 0",
                  borderTop: "1px solid var(--labs-border-subtle)",
                }}>
                  <div className="ty-label" style={{ marginBottom: "var(--labs-space-sm)" }}>
                    {t("m2.rating.studioGuideAllInCategory", "All in {{category}}", { category: isDE ? navCategory.de : navCategory.en })}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--labs-space-xs)" }}>
                    {navCategory.subcategories.map((desc, i) => {
                      const isS = isTermSelected(desc);
                      return (
                        <button
                          key={desc.id}
                          onClick={() => onToggle(desc.en)}
                          className={isS ? "labs-chip labs-chip-active" : "labs-chip"}
                          data-testid={`guide-term-${desc.id}`}
                          style={{
                            background: isS ? tintBg(navCategory.color, "chip") : undefined,
                            color: isS ? "#f5f0e8" : undefined,
                            borderColor: isS ? tintBorder(navCategory.color) : undefined,
                            borderWidth: "1.5px",
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
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--labs-space-xs)" }}>
                {navCategory.subcategories.map((desc, i) => {
                  const isS = isTermSelected(desc);
                  return (
                    <button
                      key={desc.id}
                      onClick={() => onToggle(desc.en)}
                      className={isS ? "labs-chip labs-chip-active" : "labs-chip"}
                      data-testid={`guide-term-${desc.id}`}
                      style={{
                        background: isS ? tintBg(navCategory.color, "chip") : undefined,
                        color: isS ? "#f5f0e8" : undefined,
                        borderColor: isS ? tintBorder(navCategory.color) : undefined,
                        borderWidth: "1.5px",
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
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--labs-space-sm)" }}>
              {navSubgroup.descriptors.map((desc, i) => {
                const isS = isTermSelected(desc);
                return (
                  <button
                    key={desc.id}
                    onClick={() => onToggle(desc.en)}
                    className={isS ? "labs-chip labs-chip-active" : "labs-chip"}
                    data-testid={`guide-term-${desc.id}`}
                    style={{
                      background: isS ? tintBg(navCategory.color, "chip") : undefined,
                      color: isS ? "#f5f0e8" : undefined,
                      borderColor: isS ? tintBorder(navCategory.color) : undefined,
                      borderWidth: "1.5px",
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
              <div style={{ marginTop: "var(--labs-space-md)" }}>
                <div className="ty-label" style={{ marginBottom: "var(--labs-space-sm)" }}>
                  {t("m2.rating.studioGuideRelated", "Other groups in {{category}}", { category: isDE ? navCategory.de : navCategory.en })}
                </div>
                <div style={{ display: "flex", gap: "var(--labs-space-xs)", flexWrap: "wrap" }}>
                  {navCategory.subgroups
                    .filter((sg) => sg.id !== navSubgroupId)
                    .map((sg) => {
                      const sgCount = countSelectedInSubgroup(sg);
                      return (
                        <button
                          key={sg.id}
                          onClick={() => drillDown(navCategory.id, sg.id)}
                          className="labs-chip"
                          data-testid={`guide-related-${sg.id}`}
                          style={{
                            background: sgCount > 0 ? tintBg(navCategory.color, "subtle") : undefined,
                            color: sgCount > 0 ? "#f5f0e8" : undefined,
                            borderColor: sgCount > 0 ? tintBorder(navCategory.color) : undefined,
                          }}
                        >
                          {isDE ? sg.de : sg.en}
                          {sgCount > 0 && (
                            <span style={{
                              fontSize: 11, padding: "0 4px", borderRadius: 6,
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
  const isDark = useIsDarkTheme();
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
              fillOpacity={seg.isDimmed ? 0.35 : seg.isFocused ? 0.7 : 0.5}
              stroke={CATEGORY_COLORS[seg.id]}
              strokeWidth={seg.isFocused ? 2 : 1}
              strokeOpacity={seg.isDimmed ? 0.3 : 0.7}
              style={{ transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
            />
            <text
              x={seg.labelX} y={seg.labelY} textAnchor="middle" dominantBaseline="middle"
              fill={seg.isDimmed ? "var(--labs-text-secondary)" : "#f5f0e8"}
              fontSize={seg.isFocused ? 11 : 10} fontWeight={seg.isFocused ? 700 : 600}
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
        <text x={cx} y={cy + 8} textAnchor="middle" fill="var(--labs-text-secondary)" fontSize={10}>
          Studio
        </text>
      </svg>

      {focusedCat && focused && (
        <div
          className="labs-card"
          style={{
            marginTop: "var(--labs-space-sm)", padding: "var(--labs-space-sm) 14px",
            borderColor: tintBorder(CATEGORY_COLORS[focused]),
            animation: "labsFadeIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
          }}
          data-testid={`wheel-detail-${focused}`}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--labs-space-sm)", marginBottom: "var(--labs-space-sm)" }}>
            <span style={{ fontSize: 18 }}>{renderIcon(STYLE_CATEGORY_SVG, focused, 18)}</span>
            <span className="labs-serif" style={{ fontSize: 14, fontWeight: 600, color: adjustCategoryTextColor(CATEGORY_COLORS[focused], isDark) }}>{focusedCat.name}</span>
            <button onClick={(e) => { e.stopPropagation(); setFocused(null); }} className="labs-btn-ghost" style={{ marginLeft: "auto", padding: "var(--labs-space-xs)" }} data-testid="button-close-wheel-detail">
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--labs-space-xs)" }}>
            {focusedCat[section].map((term) => {
              const isSelected = selected.has(term.toLowerCase());
              return (
                <button
                  key={term} onClick={(e) => { e.stopPropagation(); onToggle(term); }}
                  className={isSelected ? "labs-chip labs-chip-active" : "labs-chip"}
                  data-testid={`studio-term-${term.replace(/\s+/g, "-").toLowerCase()}`}
                  style={{
                    background: isSelected ? tintBg(CATEGORY_COLORS[focused], "chip") : undefined,
                    color: isSelected ? "#f5f0e8" : undefined,
                    borderColor: isSelected ? CATEGORY_COLORS[focused] : undefined,
                    borderWidth: "1.5px",
                    boxShadow: isSelected ? `0 0 0 2px ${tintBorder(CATEGORY_COLORS[focused])}` : "none",
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
  const isDark = useIsDarkTheme();
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
        <text x={w - 28} y={h / 2 - 6} fill="var(--labs-text-secondary)" fontSize={8} textAnchor="end">{t("m2.rating.studioAxisFullBodied", "Full-Bodied")}</text>
        <text x={35} y={h / 2 - 6} fill="var(--labs-text-secondary)" fontSize={8} textAnchor="start">{t("m2.rating.studioAxisLight", "Light")}</text>
        <text x={w / 2} y={28} fill="var(--labs-text-secondary)" fontSize={8} textAnchor="middle">{t("m2.rating.studioAxisSmoky", "Smoky")}</text>
        <text x={w / 2} y={h - 16} fill="var(--labs-text-secondary)" fontSize={8} textAnchor="middle">{t("m2.rating.studioAxisSweet", "Sweet")}</text>
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
              <circle cx={px} cy={py} r={r + 6} fill={color} fillOpacity={0.25} style={{ transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" }} />
              <circle cx={px} cy={py} r={r} fill={color} fillOpacity={isDimmed ? 0.35 : 0.55} stroke={color} strokeWidth={isSelected ? 2 : 1} strokeOpacity={isDimmed ? 0.4 : 0.8} style={{ transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" }} />
              <text x={px} y={py - 3} textAnchor="middle" fill={isDimmed ? "var(--labs-text-secondary)" : "#f5f0e8"} fontSize={10} fontWeight={600} style={{ transition: "all 0.3s ease", pointerEvents: "none", fontFamily: "'Playfair Display', Georgia, serif" }}>
                {cat.name.split(" / ")[0]}
              </text>
              <text x={px} y={py + 7} textAnchor="middle" fill={isDimmed ? "var(--labs-text-muted)" : "#f5f0e8"} fontSize={9} style={{ pointerEvents: "none" }}>
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
              <rect x={chip.x - 22} y={chip.y - 7} width={44} height={14} rx={7} fill={isS ? color : "var(--labs-surface)"} fillOpacity={isS ? 0.65 : 0.85} stroke={color} strokeWidth={isS ? 1.2 : 0.5} strokeOpacity={isS ? 0.9 : 0.4} style={{ transition: "all 0.3s ease" }} />
              <text x={chip.x} y={chip.y + 1} textAnchor="middle" dominantBaseline="middle" fill={isS ? "#f5f0e8" : "var(--labs-text)"} fontSize={6} fontWeight={isS ? 700 : 400} style={{ pointerEvents: "none" }}>
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
        <div
          className="labs-card"
          style={{
            marginTop: "var(--labs-space-sm)", padding: "var(--labs-space-sm) 14px",
            borderColor: tintBorder(CATEGORY_COLORS[selectedCat]),
            animation: "labsFadeIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
          }}
          data-testid={`compass-detail-${selectedCat}`}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--labs-space-sm)", marginBottom: "var(--labs-space-sm)" }}>
            <span style={{ fontSize: 18 }}>{renderIcon(STYLE_CATEGORY_SVG, selectedCat, 18)}</span>
            <span className="labs-serif" style={{ fontSize: 14, fontWeight: 600, color: adjustCategoryTextColor(CATEGORY_COLORS[selectedCat], isDark) }}>{selCat.name}</span>
            <button onClick={(e) => { e.stopPropagation(); setSelectedCat(null); }} className="labs-btn-ghost" style={{ marginLeft: "auto", padding: "var(--labs-space-xs)" }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--labs-space-xs)" }}>
            {selCat[section].map((term) => {
              const isS = selected.has(term.toLowerCase());
              return (
                <button key={term} onClick={(e) => { e.stopPropagation(); onToggle(term); }}
                  className={isS ? "labs-chip labs-chip-active" : "labs-chip"}
                  data-testid={`studio-term-${term.replace(/\s+/g, "-").toLowerCase()}`}
                  style={{
                    background: isS ? tintBg(CATEGORY_COLORS[selectedCat], "chip") : undefined,
                    color: isS ? "#f5f0e8" : undefined,
                    borderColor: isS ? CATEGORY_COLORS[selectedCat] : undefined,
                    borderWidth: "1.5px",
                    boxShadow: isS ? `0 0 0 2px ${tintBorder(CATEGORY_COLORS[selectedCat])}` : "none",
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
  const isDark = useIsDarkTheme();
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
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--labs-space-xs)", marginBottom: "var(--labs-space-sm)", justifyContent: "center" }}>
        {categories.map((cat) => {
          const isOn = enabledCats.has(cat.id);
          return (
            <button key={cat.id} onClick={() => toggleCat(cat.id)}
              className={isOn ? "labs-chip labs-chip-active" : "labs-chip"}
              style={{
                background: isOn ? tintBg(CATEGORY_COLORS[cat.id], "chip") : undefined,
                borderColor: isOn ? CATEGORY_COLORS[cat.id] : undefined,
                color: isOn ? "#f5f0e8" : undefined,
              }}
              data-testid={`studio-radar-toggle-${cat.id}`}
            >
              <span style={{ fontSize: 12 }}>{renderIcon(STYLE_CATEGORY_SVG, cat.id, 12)}</span>
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
              <text x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" fill="var(--labs-text-secondary)" fontSize={11} fontWeight={500}>{axis}</text>
            </g>
          );
        })}
        {categories.filter((c) => enabledCats.has(c.id)).map((cat) => (
          <g key={cat.id} onClick={() => { setSelectedRadarCat(selectedRadarCat === cat.id ? null : cat.id); triggerHaptic("light"); }} style={{ cursor: "pointer" }}>
            <polygon points={getPolygonPoints(RADAR_PROFILES[cat.id])} fill={CATEGORY_COLORS[cat.id]} fillOpacity={0.4} stroke={CATEGORY_COLORS[cat.id]} strokeWidth={1.5} strokeOpacity={0.9} style={{ transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" }} />
          </g>
        ))}
        {selected.size > 0 && (
          <polygon points={getPolygonPoints(userProfile)} fill="var(--labs-accent)" fillOpacity={0.15} stroke="var(--labs-accent)" strokeWidth={1.5} strokeDasharray="5 3" style={{ transition: "all 0.5s ease" }} />
        )}
      </svg>
      {selected.size > 0 && (
        <div style={{ textAlign: "center", marginTop: "2px" }}>
          <span style={{ fontSize: 11, color: "var(--labs-accent)", fontWeight: 500 }}>— {t("m2.rating.studioYourProfile", "Your tasting profile")} —</span>
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
          <div
            className="labs-card"
            style={{
              marginTop: "var(--labs-space-sm)", padding: "var(--labs-space-sm) 14px",
              borderColor: "var(--labs-accent-muted)",
              animation: "labsFadeIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
            }}
            data-testid={`radar-axis-${selectedAxis.toLowerCase()}`}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--labs-space-sm)", marginBottom: "var(--labs-space-sm)" }}>
              <span className="labs-serif" style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-accent)" }}>{selectedAxis}</span>
              <button onClick={() => setSelectedAxis(null)} className="labs-btn-ghost" style={{ marginLeft: "auto", padding: "var(--labs-space-xs)" }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--labs-space-xs)" }}>
              {uniqueTerms.map((term) => {
                const isS = selected.has(term.toLowerCase());
                return (
                  <button key={term} onClick={() => onToggle(term)}
                    className={isS ? "labs-chip labs-chip-active" : "labs-chip"}
                    data-testid={`studio-term-${term.replace(/\s+/g, "-").toLowerCase()}`}
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
        <div
          className="labs-card"
          style={{
            marginTop: "var(--labs-space-sm)", padding: "var(--labs-space-sm) 14px",
            borderColor: tintBorder(CATEGORY_COLORS[selectedRadarCat]),
            animation: "labsFadeIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--labs-space-sm)", marginBottom: "var(--labs-space-sm)" }}>
            <span style={{ fontSize: 18 }}>{renderIcon(STYLE_CATEGORY_SVG, selectedRadarCat, 18)}</span>
            <span className="labs-serif" style={{ fontSize: 14, fontWeight: 600, color: adjustCategoryTextColor(CATEGORY_COLORS[selectedRadarCat], isDark) }}>{selCat.name}</span>
            <button onClick={(e) => { e.stopPropagation(); setSelectedRadarCat(null); }} className="labs-btn-ghost" style={{ marginLeft: "auto", padding: "var(--labs-space-xs)" }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--labs-space-xs)" }}>
            {selCat[section].map((term) => {
              const isS = selected.has(term.toLowerCase());
              return (
                <button key={term} onClick={(e) => { e.stopPropagation(); onToggle(term); }}
                  className={isS ? "labs-chip labs-chip-active" : "labs-chip"}
                  data-testid={`studio-term-${term.replace(/\s+/g, "-").toLowerCase()}`}
                  style={{
                    background: isS ? tintBg(CATEGORY_COLORS[selectedRadarCat], "chip") : undefined,
                    color: isS ? "#f5f0e8" : undefined,
                    borderColor: isS ? CATEGORY_COLORS[selectedRadarCat] : undefined,
                    borderWidth: "1.5px",
                    boxShadow: isS ? `0 0 0 2px ${tintBorder(CATEGORY_COLORS[selectedRadarCat])}` : "none",
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
      <div style={{ position: "relative", marginBottom: "var(--labs-space-sm)" }}>
        <textarea
          value={description}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={t("m2.rating.studioDescribePlaceholder", "Describe what you taste...")}
          rows={3}
          className="labs-input"
          data-testid="studio-describe-input"
          style={{ width: "100%", resize: "none", boxSizing: "border-box" }}
        />
        {loading && (
          <div style={{ position: "absolute", right: 12, top: 12 }}>
            <Sparkles style={{ width: 16, height: 16, color: "var(--labs-accent)", animation: "spin 1s linear infinite" }} />
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <div style={{ marginBottom: "var(--labs-space-sm)" }}>
          <div className="ty-label" style={{ color: "var(--labs-accent)", marginBottom: "var(--labs-space-xs)" }}>
            {t("m2.rating.studioSuggestedFlavours", "Suggested Flavours")}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--labs-space-xs)" }}>
            {suggestions.map((term, i) => {
              const isS = selected.has(term.toLowerCase());
              return (
                <button
                  key={term} onClick={() => onToggle(term)}
                  className={isS ? "labs-chip labs-chip-active" : "labs-chip"}
                  data-testid={`studio-suggest-${term.replace(/\s+/g, "-").toLowerCase()}`}
                  style={{
                    background: isS ? "var(--labs-accent)" : undefined,
                    color: isS ? "var(--labs-bg)" : undefined,
                    borderColor: isS ? "var(--labs-accent)" : undefined,
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
        className="labs-btn-secondary"
        data-testid="studio-tastes-like-button"
        style={{
          display: "flex", alignItems: "center", gap: "var(--labs-space-xs)", width: "100%",
          padding: "var(--labs-space-sm) var(--labs-space-md)", fontSize: 12,
        }}
      >
        <Search style={{ width: 14, height: 14, color: "var(--labs-accent)" }} />
        {t("m2.rating.studioTastesLike", "Tastes like...")}
      </button>

      {tastesLikeOpen && (
        <div
          className="labs-card"
          style={{ marginTop: "var(--labs-space-sm)", padding: "var(--labs-space-sm)", animation: "labsFadeIn 200ms ease both" }}
        >
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
            style={{ marginBottom: "var(--labs-space-sm)", boxSizing: "border-box" }}
          />
          {tastesLikeLoading && <div style={{ fontSize: 11, color: "var(--labs-text-muted)", padding: "var(--labs-space-xs)" }}>{t("m2.rating.studioSearching", "Searching...")}</div>}
          {tastesLikeResults.map((w) => (
            <button
              key={`${w.name}-${w.distillery}`}
              onClick={() => handleSelectReference(w.name, w.distillery)}
              className="labs-btn-ghost"
              style={{
                display: "block", width: "100%", padding: "var(--labs-space-sm) 10px",
                textAlign: "left", fontSize: 12,
              }}
              data-testid={`tastes-like-${w.name.replace(/\s+/g, "-").toLowerCase()}`}
            >
              <strong>{w.name}</strong>
              {w.distillery && <span style={{ color: "var(--labs-text-muted)", marginLeft: "var(--labs-space-xs)" }}>{w.distillery}</span>}
            </button>
          ))}
        </div>
      )}

      {refSuggestions.length > 0 && (
        <div style={{ marginTop: "var(--labs-space-sm)" }}>
          <div className="ty-label" style={{ color: "var(--labs-accent)", marginBottom: "var(--labs-space-xs)" }}>
            {t("m2.rating.studioTypicalFlavours", "Typical Flavours")}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--labs-space-xs)" }}>
            {refSuggestions.map((term, i) => {
              const isS = selected.has(term.toLowerCase());
              return (
                <button
                  key={term} onClick={() => onToggle(term)}
                  className={isS ? "labs-chip labs-chip-active" : "labs-chip"}
                  style={{
                    background: isS ? "var(--labs-accent)" : undefined,
                    color: isS ? "var(--labs-bg)" : undefined,
                    borderColor: isS ? "var(--labs-accent)" : undefined,
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

type JourneyDecision = "yes" | "maybe" | "no";
type JourneyPhase = "sweep" | "drilldown" | "profile";


function matchProfile(catWeights: Record<string, number>, isDE: boolean): { label: string; score: number } | null {
  let best: { label: string; score: number } | null = null;
  for (const profile of FLAVOR_PROFILES) {
    let score = 0;
    for (const catId of profile.priorityCategories) {
      score += catWeights[catId] || 0;
    }
    if (!best || score > best.score) {
      best = { label: isDE ? profile.de : profile.en, score };
    }
  }
  return best && best.score > 0 ? best : null;
}

function JourneyView({
  selected, onToggle, isDE,
}: {
  selected: Set<string>;
  onToggle: (term: string) => void;
  isDE: boolean;
}) {
  const { t } = useTranslation();
  const isDark = useIsDarkTheme();
  const [phase, setPhase] = useState<JourneyPhase>("sweep");
  const [sweepIndex, setSweepIndex] = useState(0);
  const [decisions, setDecisions] = useState<Record<string, JourneyDecision>>({});
  const [drillIndex, setDrillIndex] = useState(0);
  const [animDir, setAnimDir] = useState<"forward" | "back" | null>(null);

  const orderedCategories = useMemo(() => {
    return JOURNEY_CATEGORY_ORDER.map((jcm) => {
      const cat = FLAVOR_CATEGORIES.find((c) => c.id === jcm.id);
      return cat ? { ...cat, descEn: jcm.descEn, descDe: jcm.descDe } : null;
    }).filter(Boolean) as (FlavorCategory & { descEn: string; descDe: string })[];
  }, []);

  const currentSweepCat = orderedCategories[sweepIndex] || null;

  const drillCategories = useMemo(() => {
    const yes = orderedCategories.filter((c) => decisions[c.id] === "yes");
    const maybe = orderedCategories.filter((c) => decisions[c.id] === "maybe");
    return [...yes, ...maybe];
  }, [orderedCategories, decisions]);

  const currentDrillCat = drillCategories[drillIndex] || null;

  const isTermSelected = useCallback((desc: { en: string; de: string }): boolean => {
    return selected.has(desc.en.toLowerCase()) || selected.has(desc.de.toLowerCase());
  }, [selected]);

  const catWeights = useMemo(() => {
    const w: Record<string, number> = {};
    for (const cat of FLAVOR_CATEGORIES) {
      const count = cat.subcategories.filter((sub) => isTermSelected(sub)).length;
      if (count > 0) w[cat.id] = count;
    }
    return w;
  }, [isTermSelected]);

  const profileMatch = useMemo(() => matchProfile(catWeights, isDE), [catWeights, isDE]);

  const handleDecision = useCallback((decision: JourneyDecision) => {
    if (!currentSweepCat) return;
    triggerHaptic(decision === "yes" ? "success" : "light");
    setDecisions((prev) => ({ ...prev, [currentSweepCat.id]: decision }));
    setAnimDir("forward");
    setTimeout(() => {
      if (sweepIndex < orderedCategories.length - 1) {
        setSweepIndex((i) => i + 1);
      } else {
        const yesOrMaybe = orderedCategories.filter((c) => {
          const d = { ...decisions, [currentSweepCat.id]: decision };
          return d[c.id] === "yes" || d[c.id] === "maybe";
        });
        if (yesOrMaybe.length > 0) {
          setDrillIndex(0);
          setPhase("drilldown");
        } else {
          setPhase("profile");
        }
      }
      setAnimDir(null);
    }, 250);
  }, [currentSweepCat, sweepIndex, orderedCategories, decisions]);

  const handleRestart = useCallback(() => {
    setPhase("sweep");
    setSweepIndex(0);
    setDecisions({});
    setDrillIndex(0);
    triggerHaptic("light");
  }, []);

  const animClass = animDir === "forward" ? "labs-slide-in" : animDir === "back" ? "labs-slide-back" : "";

  const miniProfileBars = useMemo(() => {
    return orderedCategories.map((cat) => {
      const d = decisions[cat.id];
      return {
        id: cat.id,
        color: cat.color,
        active: d === "yes" || d === "maybe",
        maybe: d === "maybe",
        decided: !!d,
      };
    });
  }, [orderedCategories, decisions]);

  if (phase === "sweep") {
    return (
      <div data-testid="studio-journey-view">
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: "var(--labs-space-sm)",
        }}>
          <div className="ty-label">
            {t("m2.rating.journeyPhase1", "Phase 1: First Impressions")}
          </div>
          <div style={{ fontSize: 11, color: "var(--labs-text-secondary)" }}>
            {sweepIndex + 1} / {orderedCategories.length}
          </div>
        </div>

        <div style={{
          display: "flex", gap: 2, marginBottom: "var(--labs-space-sm)", height: 4, borderRadius: 2,
          background: "var(--labs-surface)", overflow: "hidden",
        }} data-testid="journey-progress-bar">
          {miniProfileBars.map((bar) => (
            <div
              key={bar.id}
              style={{
                flex: 1, borderRadius: 2,
                background: bar.active ? bar.color : bar.decided ? "var(--labs-border-subtle)" : "var(--labs-surface)",
                opacity: bar.maybe ? 0.6 : 1,
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>

        <div style={{ fontSize: 13, color: "var(--labs-text)", textAlign: "center", marginBottom: "var(--labs-space-sm)" }}>
          {t("m2.rating.journeySweepPrompt", "Do you detect this flavour family?")}
        </div>

        {currentSweepCat && (
          <div className={animClass} key={currentSweepCat.id} style={{ animation: "labsFadeIn 300ms ease both" }}>
            <div
              className="labs-card"
              style={{
                padding: "var(--labs-space-lg)",
                background: `linear-gradient(135deg, ${tintBg(currentSweepCat.color, "medium")}, ${tintBg(currentSweepCat.color, "subtle")})`,
                borderColor: tintBorder(currentSweepCat.color),
                borderWidth: "1.5px",
                textAlign: "center", marginBottom: "var(--labs-space-md)",
              }}
              data-testid={`journey-sweep-card-${currentSweepCat.id}`}
            >
              <div style={{ fontSize: 32, marginBottom: "var(--labs-space-sm)", display: "flex", justifyContent: "center" }}>
                {renderIcon(GUIDE_CATEGORY_SVG, currentSweepCat.id, 32)}
              </div>
              <div className="labs-serif" style={{ fontSize: 20, fontWeight: 700, color: "var(--labs-text)", textShadow: `0 1px 8px ${tintBorder(currentSweepCat.color)}`, marginBottom: "var(--labs-space-xs)" }}>
                {isDE ? currentSweepCat.de : currentSweepCat.en}
              </div>
              <div style={{ fontSize: 13, color: "var(--labs-text)", marginBottom: "var(--labs-space-sm)" }}>
                {isDE ? currentSweepCat.descDe : currentSweepCat.descEn}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--labs-space-xs)", justifyContent: "center" }}>
                {currentSweepCat.subcategories.slice(0, 4).map((sub) => (
                  <span key={sub.id} className="labs-chip" style={{
                    background: tintBg(currentSweepCat.color, "chip"), color: "#f5f0e8",
                    border: `1px solid ${tintBorder(currentSweepCat.color)}`,
                    cursor: "default",
                  }}>
                    {isDE ? sub.de : sub.en}
                  </span>
                ))}
                {currentSweepCat.subcategories.length > 4 && (
                  <span className="labs-chip" style={{
                    background: tintBg(currentSweepCat.color, "subtle"), color: "#f5f0e8",
                    cursor: "default",
                  }}>
                    +{currentSweepCat.subcategories.length - 4}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "var(--labs-space-sm)" }}>
              <button
                onClick={() => handleDecision("no")}
                className="labs-btn-secondary"
                data-testid="journey-btn-no"
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--labs-space-xs)",
                  padding: "var(--labs-space-sm) 18px", minWidth: 70,
                }}
              >
                <X style={{ width: 18, height: 18 }} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>{t("m2.rating.journeyNo", "No")}</span>
              </button>
              <button
                onClick={() => handleDecision("maybe")}
                className="labs-btn-secondary"
                data-testid="journey-btn-maybe"
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--labs-space-xs)",
                  padding: "var(--labs-space-sm) 18px", minWidth: 70,
                  borderColor: "var(--labs-accent)", color: "var(--labs-accent)",
                }}
              >
                <HelpCircle style={{ width: 18, height: 18 }} />
                <span style={{ fontSize: 11, fontWeight: 600 }}>{t("m2.rating.journeyMaybe", "Maybe")}</span>
              </button>
              <button
                onClick={() => handleDecision("yes")}
                className="labs-btn-primary"
                data-testid="journey-btn-yes"
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--labs-space-xs)",
                  padding: "var(--labs-space-sm) 22px", minWidth: 70,
                  boxShadow: "0 2px 12px rgba(201, 167, 108, 0.3)",
                }}
              >
                <Check style={{ width: 18, height: 18 }} />
                <span style={{ fontSize: 11, fontWeight: 600 }}>{t("m2.rating.journeyYes", "Yes")}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (phase === "drilldown" && currentDrillCat) {
    const isMaybe = decisions[currentDrillCat.id] === "maybe";
    return (
      <div data-testid="studio-journey-drilldown">
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: "var(--labs-space-sm)",
        }}>
          <div className="ty-label">
            {t("m2.rating.journeyPhase2", "Phase 2: Specific Notes")}
          </div>
          <div style={{ fontSize: 11, color: "var(--labs-text-secondary)" }}>
            {drillIndex + 1} / {drillCategories.length}
          </div>
        </div>

        <div style={{
          display: "flex", gap: 2, marginBottom: "var(--labs-space-sm)", height: 3, borderRadius: 2,
          background: "var(--labs-surface)", overflow: "hidden",
        }}>
          {drillCategories.map((cat, i) => (
            <div key={cat.id} style={{
              flex: 1, borderRadius: 2,
              background: i <= drillIndex ? cat.color : "var(--labs-border-subtle)",
              opacity: i < drillIndex ? 0.65 : 1,
              transition: "all 0.3s ease",
            }} />
          ))}
        </div>

        <div className={animClass} key={currentDrillCat.id}>
          <div style={{
            display: "flex", alignItems: "center", gap: "var(--labs-space-sm)", marginBottom: "var(--labs-space-sm)",
          }}>
            <span style={{ fontSize: 20, display: "inline-flex" }}>{renderIcon(GUIDE_CATEGORY_SVG, currentDrillCat.id, 20)}</span>
            <div>
              <div className="labs-serif" style={{ fontSize: 16, fontWeight: 700, color: "var(--labs-text)" }}>
                {isDE ? currentDrillCat.de : currentDrillCat.en}
              </div>
              {isMaybe && (
                <div style={{ fontSize: 12, color: "var(--labs-text-secondary)", fontStyle: "italic" }}>
                  {t("m2.rating.journeyMaybePrompt", "You weren't sure — tap any notes you might detect")}
                </div>
              )}
              {!isMaybe && (
                <div style={{ fontSize: 12, color: "var(--labs-text-secondary)" }}>
                  {t("m2.rating.journeyDrillPrompt", "Which specific notes stand out?")}
                </div>
              )}
            </div>
          </div>

          {currentDrillCat.subgroups && currentDrillCat.subgroups.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-sm)" }}>
              {currentDrillCat.subgroups.map((sg) => (
                <div key={sg.id}>
                  <div className="ty-label" style={{ marginBottom: "var(--labs-space-xs)" }}>
                    {isDE ? sg.de : sg.en}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--labs-space-xs)" }}>
                    {sg.descriptors.map((desc) => {
                      const isS = isTermSelected(desc);
                      return (
                        <button
                          key={desc.id}
                          onClick={() => { onToggle(desc.en); triggerHaptic("light"); }}
                          className={isS ? "labs-chip labs-chip-active" : "labs-chip"}
                          data-testid={`journey-term-${desc.id}`}
                          style={{
                            background: isS ? tintBg(currentDrillCat.color, "chip") : undefined,
                            color: isS ? "#f5f0e8" : undefined,
                            borderColor: isS ? tintBorder(currentDrillCat.color) : undefined,
                            borderWidth: "1.5px",
                            fontWeight: isS ? 600 : 400,
                          }}
                        >
                          {isS ? "✓ " : ""}{isDE ? desc.de : desc.en}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--labs-space-xs)" }}>
              {currentDrillCat.subcategories.map((desc) => {
                const isS = isTermSelected(desc);
                return (
                  <button
                    key={desc.id}
                    onClick={() => { onToggle(desc.en); triggerHaptic("light"); }}
                    className={isS ? "labs-chip labs-chip-active" : "labs-chip"}
                    data-testid={`journey-term-${desc.id}`}
                    style={{
                      background: isS ? tintBg(currentDrillCat.color, "chip") : undefined,
                      color: isS ? "#f5f0e8" : undefined,
                      borderColor: isS ? tintBorder(currentDrillCat.color) : undefined,
                      borderWidth: "1.5px",
                      fontWeight: isS ? 600 : 400,
                    }}
                  >
                    {isS ? "✓ " : ""}{isDE ? desc.de : desc.en}
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "var(--labs-space-md)" }}>
            <button
              onClick={() => {
                triggerHaptic("light");
                if (drillIndex > 0) {
                  setAnimDir("back");
                  setTimeout(() => { setDrillIndex((i) => i - 1); setAnimDir(null); }, 200);
                } else {
                  setPhase("sweep");
                  setSweepIndex(orderedCategories.length - 1);
                }
              }}
              className="labs-btn-secondary"
              data-testid="journey-drill-back"
              style={{ fontSize: 12, padding: "var(--labs-space-xs) 14px" }}
            >
              {t("common.back", "Back")}
            </button>
            <button
              onClick={() => {
                triggerHaptic("light");
                setAnimDir("forward");
                setTimeout(() => {
                  if (drillIndex < drillCategories.length - 1) {
                    setDrillIndex((i) => i + 1);
                  } else {
                    setPhase("profile");
                  }
                  setAnimDir(null);
                }, 200);
              }}
              className="labs-btn-primary"
              data-testid="journey-drill-next"
              style={{ fontSize: 11, padding: "var(--labs-space-xs) 14px" }}
            >
              {drillIndex < drillCategories.length - 1
                ? t("m2.rating.journeyNext", "Next")
                : t("m2.rating.journeyShowProfile", "Show Profile")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalSelected = Object.keys(catWeights).reduce((sum, k) => sum + catWeights[k], 0);
  const maxWeight = Math.max(...Object.values(catWeights), 1);

  return (
    <div data-testid="studio-journey-profile">
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "var(--labs-space-sm)",
      }}>
        <div className="ty-label">
          {t("m2.rating.journeyPhase3", "Phase 3: Your Profile")}
        </div>
        <button
          onClick={handleRestart}
          className="labs-btn-ghost"
          data-testid="journey-restart"
          style={{
            display: "flex", alignItems: "center", gap: "var(--labs-space-xs)",
            padding: "var(--labs-space-xs) var(--labs-space-sm)",
            border: "1px solid var(--labs-border)", fontSize: 11,
          }}
        >
          <RotateCcw style={{ width: 10, height: 10 }} />
          {t("m2.rating.journeyRestart", "Restart")}
        </button>
      </div>

      {totalSelected === 0 ? (
        <div style={{ textAlign: "center", padding: "var(--labs-space-lg) var(--labs-space-md)", color: "var(--labs-text-muted)" }}>
          <div style={{ fontSize: 24, marginBottom: "var(--labs-space-sm)" }}>🔍</div>
          <div style={{ fontSize: 13 }}>
            {t("m2.rating.journeyNoSelections", "No notes selected yet. Go back and tap specific notes in each category.")}
          </div>
          <button
            onClick={() => {
              if (drillCategories.length > 0) {
                setDrillIndex(0);
                setPhase("drilldown");
              } else {
                handleRestart();
              }
            }}
            className="labs-btn-primary"
            data-testid="journey-back-to-drill"
            style={{ marginTop: "var(--labs-space-sm)", fontSize: 12, padding: "var(--labs-space-sm) var(--labs-space-md)" }}
          >
            {t("m2.rating.journeyGoBack", "Go Back")}
          </button>
        </div>
      ) : (
        <>
          {profileMatch && (
            <div
              className="labs-card"
              style={{
                padding: "var(--labs-space-sm)", marginBottom: "var(--labs-space-md)",
                background: "var(--labs-accent-muted)",
                borderColor: "var(--labs-accent)",
                textAlign: "center",
              }}
              data-testid="journey-profile-match"
            >
              <div className="ty-label" style={{ color: "var(--labs-accent)", marginBottom: "var(--labs-space-xs)" }}>
                {t("m2.rating.journeyProfileMatch", "Profile Match")}
              </div>
              <div className="labs-serif" style={{ fontSize: 16, fontWeight: 700, color: "var(--labs-accent)" }}>
                {profileMatch.label}
              </div>
            </div>
          )}

          <div style={{ marginBottom: "var(--labs-space-md)" }}>
            <div className="ty-label" style={{ marginBottom: "var(--labs-space-sm)" }}>
              {t("m2.rating.journeyCategoryWeights", "Category Weights")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-xs)" }}>
              {orderedCategories
                .filter((cat) => catWeights[cat.id] > 0)
                .sort((a, b) => (catWeights[b.id] || 0) - (catWeights[a.id] || 0))
                .map((cat) => {
                  const w = catWeights[cat.id] || 0;
                  const pct = (w / maxWeight) * 100;
                  return (
                    <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: "var(--labs-space-sm)" }}>
                      <span style={{ fontSize: 14, width: 20, textAlign: "center", display: "inline-flex", justifyContent: "center" }}>{renderIcon(GUIDE_CATEGORY_SVG, cat.id, 14)}</span>
                      <span style={{ fontSize: 11, width: 60, color: adjustCategoryTextColor(cat.color, isDark), fontWeight: 600 }}>
                        {isDE ? cat.de : cat.en}
                      </span>
                      <div style={{
                        flex: 1, height: 8, borderRadius: "var(--labs-space-xs)",
                        background: "var(--labs-surface)", overflow: "hidden",
                      }}>
                        <div style={{
                          width: `${pct}%`, height: "100%", borderRadius: "var(--labs-space-xs)",
                          background: cat.color, transition: "width 0.5s ease",
                        }} />
                      </div>
                      <span style={{ fontSize: 11, color: "var(--labs-text-muted)", width: 16, textAlign: "right" }}>
                        {w}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          <div>
            <div className="ty-label" style={{ marginBottom: "var(--labs-space-sm)" }}>
              {t("m2.rating.journeySelectedNotes", "Selected Notes")} ({totalSelected})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-sm)" }}>
              {orderedCategories
                .filter((cat) => catWeights[cat.id] > 0)
                .map((cat) => {
                  const selectedDescs = cat.subcategories.filter((sub) => isTermSelected(sub));
                  return (
                    <div key={cat.id}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: "var(--labs-space-xs)", marginBottom: "var(--labs-space-xs)",
                        fontSize: 11, color: adjustCategoryTextColor(cat.color, isDark), fontWeight: 600,
                      }}>
                        <span style={{ fontSize: 12, display: "inline-flex" }}>{renderIcon(GUIDE_CATEGORY_SVG, cat.id, 12)}</span>
                        <span>{isDE ? cat.de : cat.en}</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--labs-space-xs)", paddingLeft: 2 }}>
                        {selectedDescs.map((desc) => (
                          <button
                            key={desc.id}
                            onClick={() => onToggle(desc.en)}
                            className="labs-chip"
                            data-testid={`journey-profile-${desc.id}`}
                            style={{
                              background: tintBg(cat.color, "chip"), color: "#f5f0e8",
                              border: `1px solid ${tintBorder(cat.color)}`,
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>{isDE ? desc.de : desc.en}</span>
                            <span style={{ fontSize: 11, color: "#f5f0e8" }}>×</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div style={{ display: "flex", gap: "var(--labs-space-sm)", marginTop: "var(--labs-space-md)" }}>
            <button
              onClick={() => {
                if (drillCategories.length > 0) {
                  setDrillIndex(0);
                  setPhase("drilldown");
                } else {
                  handleRestart();
                }
                triggerHaptic("light");
              }}
              className="labs-btn-secondary"
              data-testid="journey-refine"
              style={{ flex: 1, fontSize: 11, padding: "var(--labs-space-sm) var(--labs-space-sm)" }}
            >
              {t("m2.rating.journeyRefine", "Refine Notes")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function FlavourStudioSheet({
  open, onOpenChange, dimension, existingChips, onChipsChange, disabled, initialView,
}: FlavourStudioSheetProps) {
  const { t, i18n } = useTranslation();
  const isDE = i18n.language === "de";
  const [view, setView] = useState<StudioView>(initialView || getStoredSheetView());

  useEffect(() => {
    if (open) {
      setView(initialView || getStoredSheetView());
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

  const dimLabel = dimension === "nose" ? (isDE ? "Nase" : "Nose") : dimension === "taste" ? (isDE ? "Gaumen" : "Palate") : (isDE ? "Abgang" : "Finish");

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) handleClose(); else onOpenChange(o); }}>
      <DrawerContent
        style={{
          maxHeight: "88vh",
          background: "var(--labs-bg)",
          borderColor: "var(--labs-border)",
        }}
        data-testid="flavour-studio-sheet"
      >
        <DrawerTitle className="sr-only">Flavour Studio</DrawerTitle>
        <div style={{ padding: "var(--labs-space-sm) var(--labs-space-md) 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--labs-space-sm)" }}>
            <span className="labs-serif" style={{ fontSize: 16, fontWeight: 700, color: "var(--labs-text)" }}>
              Flavour Studio
            </span>
            <span className="labs-chip" style={{
              background: "var(--labs-accent-muted)", color: "var(--labs-accent)", fontWeight: 600,
              cursor: "default", padding: "2px var(--labs-space-sm)",
            }}>
              {dimLabel}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--labs-space-sm)" }}>
            {selectedTerms.size > 0 && (
              <span style={{
                fontSize: 11, padding: "2px var(--labs-space-sm)", borderRadius: 10,
                background: "var(--labs-accent)", color: "var(--labs-bg)", fontWeight: 700,
              }} data-testid="studio-count-badge">
                {selectedTerms.size}
              </span>
            )}
            <button onClick={handleClose} className="labs-btn-ghost" style={{ padding: "var(--labs-space-xs)" }} data-testid="studio-close">
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </div>

        <div style={{ padding: "var(--labs-space-sm) var(--labs-space-md)", overflowY: "auto", flex: 1, maxHeight: "calc(88vh - 160px)" }}>
          <SegmentedControl value={view} onChange={setView} />

          {view === "guide" && <GuidedView selected={selectedTerms} onToggle={toggleTerm} isDE={isDE} />}
          {view === "journey" && <JourneyView selected={selectedTerms} onToggle={toggleTerm} isDE={isDE} />}
          {view === "wheel" && <CompactWheel categories={categories} section={section} selected={selectedTerms} onToggle={toggleTerm} />}
          {view === "compass" && <CompactCompass categories={categories} section={section} selected={selectedTerms} onToggle={toggleTerm} />}
          {view === "radar" && <CompactRadar categories={categories} section={section} selected={selectedTerms} onToggle={toggleTerm} />}
          {view === "describe" && <DescribeView selected={selectedTerms} onToggle={toggleTerm} section={section} categories={categories} />}
        </div>

        <div style={{
          padding: "var(--labs-space-sm) var(--labs-space-md) var(--labs-space-md)", borderTop: "1px solid var(--labs-border-subtle)",
          background: "var(--labs-bg)",
        }}>
          {quickTerms.length > 0 && (
            <div style={{ marginBottom: "var(--labs-space-sm)" }}>
              <div className="ty-label" style={{ marginBottom: "var(--labs-space-xs)" }}>
                {t("m2.rating.studioQuickAdd", "Quick Add")}
              </div>
              <div style={{ display: "flex", gap: "var(--labs-space-xs)", overflowX: "auto", paddingBottom: "var(--labs-space-xs)" }}>
                {quickTerms.map((term) => {
                  const isS = selectedTerms.has(term.toLowerCase());
                  const catId = findTermCategory(term, categories);
                  const color = catId ? CATEGORY_COLORS[catId] : "var(--labs-accent)";
                  return (
                    <button key={term} onClick={() => toggleTerm(term)}
                      className={isS ? "labs-chip labs-chip-active" : "labs-chip"}
                      data-testid={`studio-quick-${term.replace(/\s+/g, "-").toLowerCase()}`}
                      style={{
                        background: isS ? (catId ? tintBg(CATEGORY_COLORS[catId], "chip") : "var(--labs-accent)") : undefined,
                        color: isS ? "#f5f0e8" : undefined,
                        borderColor: isS ? color : undefined,
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
            <div style={{ marginBottom: "var(--labs-space-sm)" }}>
              <div style={{ display: "flex", gap: "var(--labs-space-xs)", overflowX: "auto", paddingBottom: "var(--labs-space-xs)" }}>
                {Array.from(selectedTerms).map((lower) => {
                  const display = lower.charAt(0).toUpperCase() + lower.slice(1);
                  const catId = findTermCategory(display, categories);
                  const color = catId ? CATEGORY_COLORS[catId] : "var(--labs-accent)";
                  return (
                    <button key={lower} onClick={() => toggleTerm(display)}
                      className="labs-chip"
                      data-testid={`studio-selected-${lower.replace(/\s+/g, "-")}`}
                      style={{
                        background: "var(--labs-accent)", color: "var(--labs-bg)", fontWeight: 600,
                        border: "none",
                        borderLeft: `3px solid ${color}`,
                      }}
                    >
                      {display}
                      <span style={{ fontSize: 11, color: "var(--labs-bg)" }}>×</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "var(--labs-space-xs)" }}>
            <input
              className="labs-input"
              placeholder={t("m2.rating.studioCustomPlaceholder", "Custom descriptor...")}
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }}
              disabled={disabled}
              style={{ flex: 1 }}
              data-testid="studio-custom-input"
            />
            <button onClick={addCustomTag} disabled={!customInput.trim() || disabled}
              className={customInput.trim() ? "labs-btn-primary" : "labs-btn-secondary"}
              data-testid="studio-custom-add"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 32, height: 32, padding: 0,
                borderRadius: "var(--labs-space-sm)",
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

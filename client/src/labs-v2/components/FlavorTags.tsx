import { useState, useMemo, useCallback, lazy, Suspense } from "react";
import type { ThemeTokens } from "../tokens";
import { SP, FONT, RADIUS } from "../tokens";
import type { Translations } from "../i18n";
import type { PhaseId } from "../types/rating";
import { Globe, ChevronDown } from "../icons";
import {
  FLAVOR_CATEGORIES,
  getSortedCategories,
  getEffectiveProfile,
  type FlavorCategory,
  type FlavorProfileId,
} from "@/labs/data/flavor-data";

const FlavourStudioSheet = lazy(() => import("@/labs/components/FlavourStudioSheet"));

type StudioView = "guide" | "journey" | "wheel" | "compass" | "radar" | "describe";
type DimKey = "nose" | "taste" | "finish";

const PHASE_TO_DIM: Record<string, DimKey> = {
  nose: "nose",
  palate: "taste",
  finish: "finish",
};

const VISIBLE_GROUP_COUNT = 3;

interface FlavorTagsProps {
  phaseId: PhaseId;
  whiskyRegion?: string;
  whiskyCask?: string;
  whiskyFlavorProfile?: string;
  blind: boolean;
  selected: string[];
  onToggle: (tag: string) => void;
  th: ThemeTokens;
  t: Translations;
}

function detectProfile(region?: string, cask?: string): { id: FlavorProfileId; label: string } | null {
  const r = (region || "").toLowerCase();
  const c = (cask || "").toLowerCase();
  if (r.includes("islay") || r.includes("island")) return { id: "peated-maritime", label: "Peated & Maritime" };
  if (c.includes("sherry") || c.includes("px")) return { id: "sherried-rich", label: "Sherried & Rich" };
  if (r.includes("speyside")) return { id: "speyside-fruity", label: "Speyside & Fruity" };
  if (r.includes("highland")) return { id: "highland-elegant", label: "Highland & Elegant" };
  if (c.includes("bourbon")) return { id: "bourbon-classic", label: "Bourbon & Classic" };
  return null;
}

function CollapsiblePanel({
  title,
  subtitle,
  isOpen,
  onToggle,
  th,
  badge,
  children,
  testId,
}: {
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: () => void;
  th: ThemeTokens;
  badge?: number;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <div
      data-testid={testId}
      style={{
        marginBottom: SP.sm,
        border: `1px solid ${th.border}`,
        borderRadius: RADIUS.lg,
        overflow: "hidden",
        background: th.bgCard,
        transition: "all 0.2s ease",
      }}
    >
      <button
        data-testid={`${testId}-toggle`}
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `${SP.md}px`,
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: FONT.body,
          minHeight: 48,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: th.text }}>{title}</span>
          {subtitle && !isOpen && (
            <span style={{ fontSize: 12, color: th.muted }}>{subtitle}</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: SP.sm }}>
          {badge !== undefined && badge > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: th.gold,
                background: `${th.gold}18`,
                borderRadius: RADIUS.full,
                padding: "2px 8px",
                minWidth: 20,
                textAlign: "center",
              }}
            >
              {badge}
            </span>
          )}
          <div
            style={{
              transition: "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <ChevronDown color={th.muted} size={18} />
          </div>
        </div>
      </button>
      <div
        style={{
          maxHeight: isOpen ? 2000 : 0,
          overflow: "hidden",
          transition: "max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div style={{ padding: `0 ${SP.md}px ${SP.md}px` }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function FlavorTags({
  phaseId,
  whiskyRegion,
  whiskyCask,
  whiskyFlavorProfile,
  blind,
  selected,
  onToggle,
  th,
  t,
}: FlavorTagsProps) {
  const [panel1Open, setPanel1Open] = useState(false);
  const [panel2Open, setPanel2Open] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioInitialView, setStudioInitialView] = useState<StudioView>("wheel");
  const phase = th.phases[phaseId];

  const profile = useMemo(() => {
    if (blind) return null;
    const { profileId } = getEffectiveProfile(
      { flavorProfile: whiskyFlavorProfile, region: whiskyRegion, peatLevel: null, caskInfluence: whiskyCask },
      blind
    );
    if (profileId) return profileId;
    const detected = detectProfile(whiskyRegion, whiskyCask);
    return detected?.id || null;
  }, [blind, whiskyRegion, whiskyCask, whiskyFlavorProfile]);

  const profileLabel = useMemo(() => {
    if (blind) return null;
    const det = detectProfile(whiskyRegion, whiskyCask);
    return det?.label || null;
  }, [blind, whiskyRegion, whiskyCask]);

  const sortedCategories = useMemo(() => {
    return getSortedCategories(profile);
  }, [profile]);

  const primaryCategories = useMemo(() => {
    return sortedCategories.slice(0, VISIBLE_GROUP_COUNT);
  }, [sortedCategories]);

  const secondaryCategories = useMemo(() => {
    return sortedCategories.slice(VISIBLE_GROUP_COUNT);
  }, [sortedCategories]);

  const primaryTags = useMemo(() => {
    return primaryCategories.flatMap((c) =>
      c.subcategories.map((s) => ({ tag: s.en, de: s.de, catColor: c.color, catId: c.id }))
    );
  }, [primaryCategories]);

  const secondaryTags = useMemo(() => {
    return secondaryCategories.flatMap((c) =>
      c.subcategories.map((s) => ({ tag: s.en, de: s.de, catColor: c.color, catId: c.id }))
    );
  }, [secondaryCategories]);

  const selectedSet = useMemo(() => new Set(selected.map((s) => s.toLowerCase())), [selected]);

  const primaryCount = useMemo(() => {
    return primaryTags.filter((t) => selectedSet.has(t.tag.toLowerCase())).length;
  }, [primaryTags, selectedSet]);

  const secondaryCount = useMemo(() => {
    return secondaryTags.filter((t) => selectedSet.has(t.tag.toLowerCase())).length;
  }, [secondaryTags, selectedSet]);

  const handleStudioOpen = useCallback((view: StudioView) => {
    setStudioInitialView(view);
    setStudioOpen(true);
  }, []);

  const handleStudioChipsChange = useCallback((newChips: string[]) => {
    const currentSet = new Set(selected.map((c) => c.toLowerCase()));
    const newSet = new Set(newChips.map((c) => c.toLowerCase()));
    for (const chip of newChips) {
      if (!currentSet.has(chip.toLowerCase())) {
        onToggle(chip);
      }
    }
    for (const chip of selected) {
      if (!newSet.has(chip.toLowerCase())) {
        onToggle(chip);
      }
    }
  }, [selected, onToggle]);

  const dimension: DimKey | undefined = PHASE_TO_DIM[phaseId];

  if (phaseId === "overall") return null;

  const studioViews: { id: StudioView; label: string; icon: string }[] = [
    { id: "guide", label: t.ratingStudioGuide, icon: "📋" },
    { id: "journey", label: t.ratingStudioJourney, icon: "🔄" },
    { id: "wheel", label: t.ratingStudioWheel, icon: "◎" },
    { id: "compass", label: t.ratingStudioCompass, icon: "◇" },
    { id: "radar", label: t.ratingStudioRadar, icon: "⬡" },
    { id: "describe", label: t.ratingStudioDescribe, icon: "✏️" },
  ];

  const renderChip = (item: { tag: string; de: string; catColor: string; catId: string }, i: number) => {
    const isActive = selectedSet.has(item.tag.toLowerCase());
    const isMaxed = selected.length >= 12 && !isActive;
    return (
      <button
        key={`${item.catId}-${item.tag}`}
        data-testid={`flavor-chip-${phaseId}-${item.tag.toLowerCase().replace(/\s+/g, "-")}`}
        onClick={() => !isMaxed && onToggle(item.tag)}
        disabled={isMaxed}
        style={{
          padding: "8px 14px",
          borderRadius: RADIUS.full,
          fontFamily: FONT.body,
          fontSize: 13,
          fontWeight: isActive ? 600 : 400,
          cursor: isMaxed ? "not-allowed" : "pointer",
          border: isActive ? `1.5px solid ${phase.accent}` : `1px solid ${th.border}`,
          background: isActive ? phase.dim : "transparent",
          color: isActive ? phase.accent : th.muted,
          opacity: isMaxed ? 0.45 : 1,
          transition: "all 0.15s ease",
          whiteSpace: "nowrap" as const,
        }}
      >
        {item.tag}
      </button>
    );
  };

  const renderCategoryGroup = (cat: FlavorCategory) => {
    const count = cat.subcategories.filter((s) => selectedSet.has(s.en.toLowerCase())).length;
    return (
      <div key={cat.id} style={{ marginBottom: SP.sm }} data-testid={`flavor-category-${phaseId}-${cat.id}`}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
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
          <span style={{ fontSize: 11, fontWeight: 600, color: th.muted, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
            {cat.en}
          </span>
          {count > 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: th.gold,
                background: `${th.gold}18`,
                borderRadius: RADIUS.full,
                padding: "1px 7px",
                minWidth: 18,
                textAlign: "center" as const,
              }}
            >
              {count}
            </span>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {cat.subcategories.map((s, i) =>
            renderChip({ tag: s.en, de: s.de, catColor: cat.color, catId: cat.id }, i)
          )}
        </div>
      </div>
    );
  };

  return (
    <div data-testid={`flavor-tags-${phaseId}`} style={{ marginTop: SP.lg }}>
      <div
        data-testid={`flavor-profile-badge-${phaseId}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: SP.sm,
          padding: `${SP.sm}px ${SP.md}px`,
          background: blind ? th.bgCard : `${th.gold}0F`,
          border: `1px solid ${blind ? th.border : `${th.gold}38`}`,
          borderRadius: RADIUS.md,
          marginBottom: SP.md,
        }}
      >
        <Globe color={blind ? th.faint : th.gold} size={16} />
        <span style={{
          fontSize: 13,
          fontFamily: FONT.body,
          color: blind ? th.muted : th.gold,
          fontWeight: 500,
        }}>
          {blind
            ? t.ratingBlind
            : profileLabel
              ? `${t.ratingProfile} ${profileLabel}`
              : t.ratingBlind
          }
        </span>
        {!blind && whiskyRegion && (
          <span style={{ fontSize: 12, color: th.faint, marginLeft: "auto", fontFamily: FONT.body }}>
            {whiskyRegion}
          </span>
        )}
      </div>

      {selected.length > 0 && (
        <div
          data-testid={`flavor-selected-${phaseId}`}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: SP.md,
          }}
        >
          {selected.map((tag) => (
            <button
              key={tag}
              data-testid={`flavor-selected-chip-${phaseId}-${tag.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => onToggle(tag)}
              style={{
                padding: "5px 12px",
                borderRadius: RADIUS.full,
                fontFamily: FONT.body,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
                background: phase.accent,
                color: th.bg,
                display: "flex",
                alignItems: "center",
                gap: 4,
                transition: "all 0.15s",
              }}
            >
              {tag}
              <span style={{ fontSize: 12, opacity: 0.7 }}>×</span>
            </button>
          ))}
        </div>
      )}

      <CollapsiblePanel
        title={`${t.ratingAromen} ▾`}
        subtitle={t.ratingAromenS}
        isOpen={panel1Open}
        onToggle={() => setPanel1Open((p) => !p)}
        th={th}
        badge={primaryCount}
        testId={`flavor-panel-primary-${phaseId}`}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {primaryTags.map((item, i) => renderChip(item, i))}
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel
        title={`${t.ratingMoreAromen} ▾`}
        subtitle={t.ratingMoreAromenSub}
        isOpen={panel2Open}
        onToggle={() => setPanel2Open((p) => !p)}
        th={th}
        badge={secondaryCount}
        testId={`flavor-panel-secondary-${phaseId}`}
      >
        {secondaryCategories.map(renderCategoryGroup)}

        <div
          style={{
            borderTop: `1px solid ${th.border}`,
            marginTop: SP.md,
            paddingTop: SP.md,
          }}
        >
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: th.muted,
            textTransform: "uppercase" as const,
            letterSpacing: "0.05em",
            marginBottom: SP.sm,
          }}>
            {t.ratingStudioModels}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {studioViews.map((view) => (
              <button
                key={view.id}
                data-testid={`studio-view-btn-${phaseId}-${view.id}`}
                onClick={() => handleStudioOpen(view.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "8px 14px",
                  borderRadius: RADIUS.full,
                  border: `1px solid ${th.border}`,
                  background: th.bgCard,
                  color: th.muted,
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: FONT.body,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 13 }}>{view.icon}</span>
                {view.label}
              </button>
            ))}
          </div>
        </div>
      </CollapsiblePanel>

      {dimension && (
        <Suspense fallback={null}>
          <FlavourStudioSheet
            open={studioOpen}
            onOpenChange={setStudioOpen}
            dimension={dimension}
            existingChips={selected}
            onChipsChange={handleStudioChipsChange}
            initialView={studioInitialView}
          />
        </Suspense>
      )}
    </div>
  );
}

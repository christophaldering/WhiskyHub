import { useState, useEffect, useMemo } from "react";
import type { ThemeTokens } from "./theme";
import { SP, FONT } from "./theme";
import type { PhaseId } from "./types";
import { GlobeIcon } from "./icons";
import { FLAVOR_CATEGORIES, type FlavorCategory } from "@/labs/data/flavor-data";

interface FlavorTagsProps {
  phaseId: PhaseId;
  whiskyRegion?: string;
  whiskyCask?: string;
  blind: boolean;
  selected: string[];
  onToggle: (tag: string) => void;
  th: ThemeTokens;
  labels: {
    aromen: string;
    aromenSub: string;
    blindLabel: string;
    profileLabel: string;
  };
}

interface ApiCategory {
  id: number | string;
  nameEn?: string;
  nameDe?: string;
  name?: string;
  descriptors?: Array<{
    id: number | string;
    nameEn?: string;
    nameDe?: string;
    name?: string;
  }>;
}

function detectProfile(region?: string, cask?: string): { id: string; label: string } | null {
  const r = (region || "").toLowerCase();
  const c = (cask || "").toLowerCase();
  if (r.includes("islay") || r.includes("island")) return { id: "peated-maritime", label: "Peated & Maritime" };
  if (c.includes("sherry") || c.includes("px")) return { id: "sherried-rich", label: "Sherried & Rich" };
  if (r.includes("speyside")) return { id: "speyside-fruity", label: "Speyside & Fruity" };
  if (r.includes("highland")) return { id: "highland-elegant", label: "Highland & Elegant" };
  if (c.includes("bourbon")) return { id: "bourbon-classic", label: "Bourbon & Classic" };
  return null;
}

function getTagsFromLocal(phaseId: PhaseId): string[] {
  const phaseIdx = ["nose", "palate", "finish"].indexOf(phaseId);
  if (phaseIdx < 0) return [];
  const offset = phaseIdx * 2;
  return FLAVOR_CATEGORIES.slice(offset, offset + 3)
    .flatMap((c: FlavorCategory) => c.subcategories.slice(0, 3).map((s) => s.en))
    .slice(0, 6);
}

export default function FlavorTags({ phaseId, whiskyRegion, whiskyCask, blind, selected, onToggle, th, labels }: FlavorTagsProps) {
  const [apiCategories, setApiCategories] = useState<ApiCategory[] | null>(null);
  const [fetchedAt, setFetchedAt] = useState(0);
  const phase = th.phases[phaseId];

  useEffect(() => {
    if (Date.now() - fetchedAt < 300000 && apiCategories !== null) return;
    let cancelled = false;
    fetch("/api/flavour-categories")
      .then((r) => r.json())
      .then((data: ApiCategory[]) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setApiCategories(data);
          setFetchedAt(Date.now());
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [fetchedAt, apiCategories]);

  const profile = useMemo(() => {
    if (blind) return null;
    return detectProfile(whiskyRegion, whiskyCask);
  }, [blind, whiskyRegion, whiskyCask]);

  const tags = useMemo(() => {
    if (apiCategories && apiCategories.length > 0) {
      const allTags: string[] = [];
      for (const cat of apiCategories) {
        if (cat.descriptors) {
          for (const d of cat.descriptors) {
            allTags.push(d.nameEn || d.name || String(d.id));
          }
        } else {
          allTags.push(cat.nameEn || cat.name || String(cat.id));
        }
      }
      if (allTags.length > 0) {
        const phaseIdx = ["nose", "palate", "finish"].indexOf(phaseId);
        const offset = Math.max(0, phaseIdx) * 6;
        return allTags.slice(offset, offset + 6).length > 0
          ? allTags.slice(offset, offset + 6)
          : allTags.slice(0, 6);
      }
    }
    return getTagsFromLocal(phaseId);
  }, [apiCategories, phaseId]);

  if (phaseId === "overall") return null;

  return (
    <div data-testid={`flavor-tags-${phaseId}`} style={{ marginTop: SP.lg }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: th.text, marginBottom: SP.xs, fontFamily: FONT.body }}>
        {labels.aromen}
      </div>
      <div style={{ fontSize: 14, color: th.muted, marginBottom: SP.md, fontFamily: FONT.body }}>
        {labels.aromenSub}
      </div>

      <div
        data-testid={`flavor-profile-badge-${phaseId}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: SP.sm,
          padding: `${SP.sm}px ${SP.md}px`,
          background: blind ? th.bgCard : `${th.gold}0F`,
          border: `1px solid ${blind ? th.border : `${th.gold}38`}`,
          borderRadius: 12,
          marginBottom: SP.md,
        }}
      >
        <GlobeIcon color={blind ? th.faint : th.gold} size={16} />
        <span style={{
          fontSize: 13,
          fontFamily: FONT.body,
          color: blind ? th.muted : th.gold,
          fontWeight: 500,
        }}>
          {blind
            ? labels.blindLabel
            : profile
              ? `${labels.profileLabel} ${profile.label}`
              : labels.blindLabel
          }
        </span>
        {!blind && whiskyRegion && (
          <span style={{ fontSize: 12, color: th.faint, marginLeft: "auto", fontFamily: FONT.body }}>
            {whiskyRegion}
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: SP.sm }}>
        {tags.map((tag, i) => {
          const isActive = selected.includes(tag);
          const isMaxed = selected.length >= 6 && !isActive;
          return (
            <button
              key={tag}
              data-testid={`flavor-tag-${phaseId}-${i}`}
              onClick={() => !isMaxed && onToggle(tag)}
              disabled={isMaxed}
              className="labs-fade-in"
              style={{
                minHeight: 44,
                padding: "10px 18px",
                borderRadius: 22,
                fontFamily: FONT.body,
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                cursor: isMaxed ? "not-allowed" : "pointer",
                border: isActive ? `1.5px solid ${phase.accent}` : `1px solid ${th.border}`,
                background: isActive ? phase.dim : th.bgCard,
                color: isActive ? phase.accent : th.muted,
                opacity: isMaxed ? 0.5 : 1,
                transition: "all 0.15s",
              }}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}

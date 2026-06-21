import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Map } from "lucide-react";
import DiscoverActionBar from "@/labs/components/DiscoverActionBar";
import {
  useVocabCategories,
  GuidedView,
  JourneyView,
  CompactWheel,
  CompactCompass,
  CompactRadar,
} from "@/labs/components/FlavourStudioSheet";

type AtlasLens = "wheel" | "guide" | "journey" | "compass" | "radar";

const LENSES: { key: AtlasLens; labelFb: string }[] = [
  { key: "wheel", labelFb: "Wheel" },
  { key: "guide", labelFb: "Guide" },
  { key: "journey", labelFb: "Journey" },
  { key: "compass", labelFb: "Compass" },
  { key: "radar", labelFb: "Radar" },
];

export default function LabsAromaAtlas() {
  const { t, i18n } = useTranslation();
  const isDE = i18n.language === "de";
  const categories = useVocabCategories();
  const [lens, setLens] = useState<AtlasLens>("wheel");
  // Reiner Erkundungs-State: wird NIRGENDS gespeichert. Hier wird nicht bewertet.
  const [explored, setExplored] = useState<Set<string>>(new Set());

  const toggle = (term: string) => {
    const lower = term.toLowerCase();
    setExplored((prev) => {
      const next = new Set(prev);
      if (next.has(lower)) next.delete(lower);
      else next.add(lower);
      return next;
    });
  };

  return (
    <div className="labs-page" data-testid="labs-aroma-atlas-page">
      <DiscoverActionBar active="bibliothek" />

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Map style={{ width: 22, height: 22, color: "var(--labs-accent)" }} />
        <h1 className="labs-h2" style={{ color: "var(--labs-text)", margin: 0 }} data-testid="text-aroma-atlas-title">
          {t("rabbitHole.aromaAtlasTitle", "Aroma-Atlas")}
        </h1>
      </div>
      <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: "0 0 16px", lineHeight: 1.5 }}>
        {t(
          "rabbitHole.aromaAtlasDesc",
          "Wandere durch die Welt der Aromen \u2014 in f\u00fcnf Ansichten. Hier wird nichts bewertet; tippe frei, um zu erkunden.",
        )}
      </p>

      {/* Linsen-Umschalter */}
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}
        data-testid="atlas-lens-switch"
      >
        {LENSES.map((l) => {
          const active = lens === l.key;
          return (
            <button
              key={l.key}
              type="button"
              onClick={() => setLens(l.key)}
              data-testid={`atlas-lens-${l.key}`}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border: active ? "1px solid var(--labs-gold)" : "1px solid var(--labs-border)",
                background: active
                  ? "color-mix(in srgb, var(--labs-gold) 14%, transparent)"
                  : "var(--labs-surface)",
                color: active ? "var(--labs-gold)" : "var(--labs-text-muted)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              {l.labelFb}
            </button>
          );
        })}
      </div>

      {/* Aktive Linse */}
      <div data-testid={`atlas-lens-view-${lens}`}>
        {lens === "wheel" && (
          <CompactWheel categories={categories} section="overall" selected={explored} onToggle={toggle} />
        )}
        {lens === "guide" && <GuidedView selected={explored} onToggle={toggle} isDE={isDE} />}
        {lens === "journey" && <JourneyView selected={explored} onToggle={toggle} isDE={isDE} />}
        {lens === "compass" && (
          <CompactCompass categories={categories} section="overall" selected={explored} onToggle={toggle} />
        )}
        {lens === "radar" && (
          <CompactRadar categories={categories} section="overall" selected={explored} onToggle={toggle} />
        )}
      </div>
    </div>
  );
}

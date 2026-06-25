import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Map, X, Copy } from "lucide-react";
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

  const exploredList = Array.from(explored);

  return (
    <div
      className="labs-page"
      data-testid="labs-aroma-atlas-page"
      style={exploredList.length > 0 ? { paddingBottom: 120 } : undefined}
    >
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

      {exploredList.length > 0 && (
        <div
          data-testid="atlas-collected-tray"
          style={{ marginTop: 28, paddingTop: 16, borderTop: "1px solid var(--labs-border)" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8 }}>
            <span className="labs-serif" style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)" }} data-testid="text-atlas-collected-title">
              {t("atlas.collectedTitle", "Gesammelt")} ({exploredList.length})
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => { navigator.clipboard?.writeText(exploredList.join(", ")); }}
                data-testid="button-atlas-copy"
                className="labs-btn-ghost"
                style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: "6px 10px" }}
              >
                <Copy style={{ width: 14, height: 14 }} />
                {t("common.copy", "Kopieren")}
              </button>
              <button
                type="button"
                onClick={() => setExplored(new Set())}
                data-testid="button-atlas-clear-all"
                className="labs-btn-ghost"
                style={{ fontSize: 12, padding: "6px 10px" }}
              >
                {t("common.clearAll", "Alle löschen")}
              </button>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {exploredList.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => toggle(term)}
                data-testid={`atlas-collected-chip-${term}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "1px solid var(--labs-gold)",
                  background: "color-mix(in srgb, var(--labs-gold) 14%, transparent)",
                  color: "var(--labs-gold)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {term}
                <X style={{ width: 13, height: 13 }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

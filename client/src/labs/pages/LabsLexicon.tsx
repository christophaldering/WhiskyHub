import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSearch, useLocation } from "wouter";
import DiscoverActionBar from "@/labs/components/DiscoverActionBar";
import { Search, BookOpen, Wine, FlameKindling, MapPin, Factory, Package, ChevronDown } from "lucide-react";
import { lexiconData, categoryLabelsEn, categoryLabelsDe, type LexiconEntry, type LexiconCategory } from "@/labs/data/lexiconData";
import { TemplatesContent } from "./LabsTemplates";
import { VocabularyContent } from "./LabsVocabulary";

type TabId = "dictionary" | "templates" | "flavour-map";

const iconMap: Record<string, React.ElementType> = {
  tastingTerms: Wine, flavorCategories: FlameKindling, regions: MapPin, productionMethods: Factory, caskTypes: Package,
};

function DictionaryContent() {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const lang = i18n.language?.startsWith("de") ? "de" : "en";
  const categories = lexiconData[lang] ?? lexiconData.en;
  const labels = lang === "de" ? categoryLabelsDe : categoryLabelsEn;

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories
      .map((cat) => ({ ...cat, entries: cat.entries.filter((e) => e.term.toLowerCase().includes(q) || e.definition.toLowerCase().includes(q)) }))
      .filter((cat) => cat.entries.length > 0);
  }, [categories, searchQuery]);

  return (
    <div data-testid="dictionary-content">
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--labs-text-muted)" }} />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search terms..."
          className="labs-input"
          style={{ width: "100%", paddingLeft: 36, boxSizing: "border-box" }}
          data-testid="input-lexicon-search"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="labs-empty" data-testid="text-lexicon-no-results">
          <BookOpen style={{ width: 40, height: 40, color: "var(--labs-text-muted)", opacity: 0.75, margin: "0 auto 12px" }} />
          <p style={{ color: "var(--labs-text-muted)" }}>No results found</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((cat) => {
            const Icon = iconMap[cat.key] || BookOpen;
            const isOpen = !!searchQuery.trim() || openSections[cat.key];
            return (
              <div key={cat.key} className="labs-card" style={{ overflow: "hidden" }} data-testid={`labs-lexicon-section-${cat.key}`}>
                <button
                  onClick={() => setOpenSections((p) => ({ ...p, [cat.key]: !p[cat.key] }))}
                  className="labs-btn-ghost"
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", textAlign: "left" }}
                  data-testid={`button-toggle-${cat.key}`}
                >
                  <Icon style={{ width: 16, height: 16, color: "var(--labs-accent)", flexShrink: 0 }} />
                  <span className="labs-serif" style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{labels[cat.key]}</span>
                  <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{cat.entries.length}</span>
                  <ChevronDown style={{ width: 16, height: 16, color: "var(--labs-text-muted)", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </button>
                {isOpen && (
                  <div style={{ padding: "0 16px 14px", borderTop: "1px solid var(--labs-border)" }}>
                    {cat.entries.map((entry) => (
                      <div key={entry.term} style={{ padding: "10px 0", borderBottom: "1px solid var(--labs-border)" }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>{entry.term}</div>
                        <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginTop: 2, lineHeight: 1.5 }}>{entry.definition}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LabsLexicon({ forceTab }: { forceTab?: TabId } = {}) {
  const { t } = useTranslation();
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const tabParam = params.get("tab");
  const [, navigate] = useLocation();
  const resolvedTab: TabId = forceTab ?? (tabParam === "templates" ? "templates" : tabParam === "flavour-map" ? "flavour-map" : "dictionary");
  const [activeTab, setActiveTab] = useState<TabId>(resolvedTab);

  useEffect(() => {
    setActiveTab(resolvedTab);
  }, [resolvedTab]);

  const switchTab = useCallback((tab: TabId) => {
    setActiveTab(tab);
    const query = tab === "dictionary" ? "" : `?tab=${tab}`;
    navigate(`/labs/discover/lexicon${query}`, { replace: true });
  }, [navigate]);

  const tabs: { id: TabId; label: string }[] = [
    { id: "dictionary", label: t("bibliothek.tabDictionary", "Dictionary") },
    { id: "templates", label: t("bibliothek.tabTemplates", "Templates") },
    { id: "flavour-map", label: t("bibliothek.tabFlavourMap", "Flavour Map") },
  ];

  const hideChrome = forceTab === "flavour-map";

  if (hideChrome) {
    return (
      <div className="labs-page" data-testid="labs-discover-lexicon-page">
        <VocabularyContent />
      </div>
    );
  }

  return (
    <div className="labs-page" data-testid="labs-discover-lexicon-page">
      <DiscoverActionBar active="bibliothek" />

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <BookOpen style={{ width: 22, height: 22, color: "var(--labs-accent)" }} />
        <h1 className="labs-h2" style={{ color: "var(--labs-text)", margin: 0 }} data-testid="text-lexicon-title">
          {t("discover.lexicon", "Lexicon")}
        </h1>
      </div>
      <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: "0 0 16px" }}>
        {t("bibliothek.lexiconSubtitle", "Dictionary, tasting templates & flavour visualisations")}
      </p>

      <div style={{ display: "flex", borderRadius: 10, border: "1px solid var(--labs-border)", overflow: "hidden", background: "var(--labs-surface-elevated)", marginBottom: 20 }} data-testid="lexicon-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            style={{
              flex: 1,
              padding: "10px 8px",
              fontSize: 12,
              fontWeight: 600,
              background: activeTab === tab.id ? "var(--labs-accent)" : "transparent",
              color: activeTab === tab.id ? "var(--labs-bg)" : "var(--labs-text-muted)",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontFamily: "inherit",
            }}
            data-testid={`button-tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "dictionary" && <DictionaryContent />}
      {activeTab === "templates" && <TemplatesContent />}
      {activeTab === "flavour-map" && <VocabularyContent />}
    </div>
  );
}

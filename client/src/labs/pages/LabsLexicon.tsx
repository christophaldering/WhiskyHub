import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import BackLink from "@/labs/components/BackLink";
import { Search, BookOpen, Wine, FlameKindling, MapPin, Factory, Package, ChevronDown, ChevronLeft } from "lucide-react";
import { lexiconData, categoryLabelsEn, categoryLabelsDe, type LexiconEntry, type LexiconCategory } from "@/labs/data/lexiconData";

const iconMap: Record<string, React.ElementType> = {
  tastingTerms: Wine, flavorCategories: FlameKindling, regions: MapPin, productionMethods: Factory, caskTypes: Package,
};

export default function LabsLexicon() {
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
    <div className="px-5 py-6 max-w-2xl mx-auto" data-testid="labs-discover-lexicon-page">
      <BackLink href="/labs/entdecken" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-lexicon">
          <ChevronLeft className="w-4 h-4" /> {t("discover.title", "Discover")}
        </button>
      </BackLink>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <BookOpen style={{ width: 22, height: 22, color: "var(--labs-accent)" }} />
        <h1 className="labs-serif" style={{ fontSize: 22, fontWeight: 700, color: "var(--labs-text)", margin: 0 }} data-testid="text-lexicon-title">
          Lexicon
        </h1>
      </div>
      <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: "0 0 16px" }}>Searchable whisky dictionary</p>

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

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { v, alpha } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { Search, BookOpen, Wine, FlameKindling, MapPin, Factory, Package, ChevronDown } from "lucide-react";

interface LexiconEntry { term: string; definition: string; }
interface LexiconCategory { key: string; entries: LexiconEntry[]; }

const iconMap: Record<string, React.ElementType> = {
  tastingTerms: Wine, flavorCategories: FlameKindling, regions: MapPin, productionMethods: Factory, caskTypes: Package,
};

const lexiconData: Record<string, LexiconCategory[]> = {
  en: [
    { key: "tastingTerms", entries: [
      { term: "Nose", definition: "The aroma of a whisky as perceived by smelling it." },
      { term: "Palate", definition: "The taste and texture experienced when whisky is on the tongue." },
      { term: "Finish", definition: "The lingering flavors and sensations after swallowing." },
      { term: "Balance", definition: "The harmony between different flavor elements." },
      { term: "Body", definition: "The weight and texture of a whisky in the mouth." },
      { term: "Dram", definition: "A traditional Scottish term for a serving of whisky." },
      { term: "Cask Strength", definition: "Whisky bottled directly from the cask without dilution, typically 55–65% ABV." },
      { term: "Single Malt", definition: "Whisky made from 100% malted barley at a single distillery using pot stills." },
      { term: "ABV", definition: "Alcohol By Volume — the standard measure of alcohol content." },
      { term: "PPM", definition: "Phenol Parts Per Million — a measure of peat intensity in malted barley." },
    ]},
    { key: "flavorCategories", entries: [
      { term: "Fruity", definition: "Flavors of fresh or dried fruit — apple, pear, citrus, tropical fruit." },
      { term: "Floral", definition: "Delicate aromas of heather, lavender, rose, or honeysuckle." },
      { term: "Peaty / Smoky", definition: "Aromas from peat-dried malt — campfire smoke, iodine, tar." },
      { term: "Spicy", definition: "Warming notes of cinnamon, pepper, ginger, clove." },
      { term: "Sweet", definition: "Honey, vanilla, caramel, toffee — often from bourbon casks." },
      { term: "Maritime", definition: "Sea-influenced characters — brine, seaweed, salt spray." },
    ]},
    { key: "regions", entries: [
      { term: "Speyside", definition: "Scotland's most prolific region with 50+ distilleries. Elegant, fruity malts." },
      { term: "Highland", definition: "Scotland's largest region — diverse styles from light to full-bodied." },
      { term: "Islay", definition: "Famous for intensely peated, smoky whiskies with maritime character." },
      { term: "Campbeltown", definition: "Once Scotland's whisky capital. Briny, complex, slightly oily whiskies." },
      { term: "Japan", definition: "Japanese whisky draws on Scottish traditions with meticulous craftsmanship." },
    ]},
    { key: "productionMethods", entries: [
      { term: "Malting", definition: "Soaking barley, allowing germination, then drying. Peat may be used for smokiness." },
      { term: "Distillation", definition: "Heating wash in copper pot stills to separate and concentrate alcohol." },
      { term: "Maturation", definition: "Ageing spirit in oak casks for color, flavor, and complexity." },
      { term: "Cask Finishing", definition: "Secondary maturation in a different cask type for extra flavor layers." },
      { term: "Angel's Share", definition: "The ~2% of whisky that evaporates annually during maturation." },
    ]},
    { key: "caskTypes", entries: [
      { term: "Bourbon Barrel", definition: "American oak (200L) previously used for bourbon. Vanilla, caramel, coconut." },
      { term: "Sherry Butt", definition: "European oak (500L) seasoned with sherry. Dried fruit, chocolate, spice." },
      { term: "Port Pipe", definition: "Portuguese cask (550–650L). Red berry, plum, chocolate notes." },
      { term: "Quarter Cask", definition: "Small cask (125L) that accelerates maturation. Intense, rich flavors." },
    ]},
  ],
  de: [
    { key: "tastingTerms", entries: [
      { term: "Nase", definition: "Das Aroma eines Whiskys beim Riechen." },
      { term: "Gaumen", definition: "Geschmack und Textur auf der Zunge." },
      { term: "Abgang", definition: "Nachklingende Aromen nach dem Schlucken." },
      { term: "Balance", definition: "Gleichgewicht zwischen Geschmackselementen." },
      { term: "Körper", definition: "Gewicht und Textur im Mund." },
      { term: "Dram", definition: "Schottischer Begriff für eine Portion Whisky." },
      { term: "Fassstärke", definition: "Whisky direkt aus dem Fass, ohne Verdünnung." },
      { term: "Single Malt", definition: "Whisky aus 100% gemälzter Gerste einer Brennerei." },
      { term: "ABV", definition: "Alkoholgehalt in Prozent." },
      { term: "PPM", definition: "Maß für die Torfintensität in gemälzter Gerste." },
    ]},
    { key: "flavorCategories", entries: [
      { term: "Fruchtig", definition: "Aromen von frischem oder getrocknetem Obst." },
      { term: "Blumig", definition: "Zarte Aromen von Heidekraut, Lavendel, Rose." },
      { term: "Torfig / Rauchig", definition: "Aromen aus torfgetrocknetem Malz." },
      { term: "Würzig", definition: "Zimt, Pfeffer, Ingwer, Nelke." },
      { term: "Süß", definition: "Honig, Vanille, Karamell — oft von Bourbon-Fässern." },
      { term: "Maritim", definition: "Salzlake, Seetang, Meeressprühnebel." },
    ]},
    { key: "regions", entries: [
      { term: "Speyside", definition: "Produktivste Region mit 50+ Brennereien. Elegant, fruchtig." },
      { term: "Highland", definition: "Größte Region — vielfältige Stile." },
      { term: "Islay", definition: "Intensiv getorft, rauchig, maritim." },
      { term: "Campbeltown", definition: "Einst Whisky-Hauptstadt. Salzig, komplex, ölig." },
      { term: "Japan", definition: "Japanischer Whisky mit schottischer Tradition." },
    ]},
    { key: "productionMethods", entries: [
      { term: "Mälzen", definition: "Gerste einweichen, keimen lassen, trocknen." },
      { term: "Destillation", definition: "Erhitzen in Kupferbrennblasen." },
      { term: "Reifung", definition: "Lagerung in Eichenfässern." },
      { term: "Fass-Finish", definition: "Zweite Reifung in anderem Fasstyp." },
      { term: "Angel's Share", definition: "~2% Verdunstung pro Jahr während der Reifung." },
    ]},
    { key: "caskTypes", entries: [
      { term: "Bourbon Barrel", definition: "Amerikanisches Eichenfass (200L). Vanille, Karamell, Kokosnuss." },
      { term: "Sherry Butt", definition: "Europäisches Eichenfass (500L). Trockenfrüchte, Schokolade, Gewürze." },
      { term: "Port Pipe", definition: "Portugiesisches Fass (550–650L). Rote Beeren, Pflaume, Schokolade." },
      { term: "Quarter Cask", definition: "Kleines Fass (125L). Beschleunigte Reifung, intensive Aromen." },
    ]},
  ],
};

const categoryLabels: Record<string, Record<string, string>> = {
  en: { tastingTerms: "Tasting Terms", flavorCategories: "Flavor Categories", regions: "Regions", productionMethods: "Production Methods", caskTypes: "Cask Types" },
  de: { tastingTerms: "Verkostungsbegriffe", flavorCategories: "Aromakategorien", regions: "Regionen", productionMethods: "Herstellungsverfahren", caskTypes: "Fasstypen" },
};

export default function M2DiscoverLexicon() {
  const { i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const lang = i18n.language?.startsWith("de") ? "de" : "en";
  const categories = lexiconData[lang] ?? lexiconData.en;
  const labels = categoryLabels[lang] ?? categoryLabels.en;

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories
      .map((cat) => ({ ...cat, entries: cat.entries.filter((e) => e.term.toLowerCase().includes(q) || e.definition.toLowerCase().includes(q)) }))
      .filter((cat) => cat.entries.length > 0);
  }, [categories, searchQuery]);

  return (
    <div style={{ padding: "16px 16px 32px", maxWidth: 600, margin: "0 auto" }} data-testid="m2-discover-lexicon-page">
      <M2BackButton />
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0 4px" }}>
        <BookOpen style={{ width: 22, height: 22, color: v.accent }} />
        <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: v.text, margin: 0 }} data-testid="text-m2-lexicon-title">
          {lang === "de" ? "Lexikon" : "Lexicon"}
        </h1>
      </div>
      <p style={{ fontSize: 13, color: v.muted, margin: "0 0 16px" }}>{lang === "de" ? "Durchsuchbares Whisky-Wörterbuch" : "Searchable whisky dictionary"}</p>

      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: v.muted }} />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={lang === "de" ? "Begriffe suchen…" : "Search terms…"}
          style={{ width: "100%", padding: "10px 12px 10px 36px", background: v.inputBg, border: `1px solid ${v.inputBorder}`, borderRadius: 10, color: v.text, fontSize: 14, outline: "none", boxSizing: "border-box" }}
          data-testid="input-m2-lexicon-search"
        />
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <BookOpen style={{ width: 40, height: 40, color: v.muted, opacity: 0.3, margin: "0 auto 12px" }} />
          <p style={{ color: v.muted }} data-testid="text-m2-lexicon-no-results">{lang === "de" ? "Keine Ergebnisse" : "No results found"}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((cat) => {
            const Icon = iconMap[cat.key] || BookOpen;
            const isOpen = searchQuery.trim() || openSections[cat.key];
            return (
              <div key={cat.key} style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, overflow: "hidden" }} data-testid={`m2-lexicon-section-${cat.key}`}>
                <button
                  onClick={() => setOpenSections((p) => ({ ...p, [cat.key]: !p[cat.key] }))}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", color: v.text, textAlign: "left" }}
                >
                  <Icon style={{ width: 16, height: 16, color: v.accent, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, fontFamily: "'Playfair Display', serif" }}>{labels[cat.key]}</span>
                  <span style={{ fontSize: 11, color: v.muted }}>{cat.entries.length}</span>
                  <ChevronDown style={{ width: 16, height: 16, color: v.muted, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </button>
                {isOpen && (
                  <div style={{ padding: "0 16px 14px", borderTop: `1px solid ${v.border}` }}>
                    {cat.entries.map((entry) => (
                      <div key={entry.term} style={{ padding: "10px 0", borderBottom: `1px solid ${alpha(v.border, "40")}` }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: v.text }}>{entry.term}</div>
                        <div style={{ fontSize: 12, color: v.muted, marginTop: 2, lineHeight: 1.5 }}>{entry.definition}</div>
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

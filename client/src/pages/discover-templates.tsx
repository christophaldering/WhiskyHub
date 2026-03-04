import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import SimpleShell from "@/components/simple/simple-shell";
import { c, cardStyle, pageTitleStyle, pageSubtitleStyle } from "@/lib/theme";

interface TemplateCategory {
  id: string;
  nameEN: string;
  nameDE: string;
  descEN: string;
  descDE: string;
  icon: string;
  noseEN: string[];
  noseDE: string[];
  palateEN: string[];
  palateDE: string[];
  finishEN: string[];
  finishDE: string[];
  tipsEN: string;
  tipsDE: string;
}

const TEMPLATES: TemplateCategory[] = [
  {
    id: "islay",
    nameEN: "Islay / Peated",
    nameDE: "Islay / Getorft",
    descEN: "For heavily peated, smoky whiskies from Islay and similar styles",
    descDE: "Für stark getorfte, rauchige Whiskys von Islay und ähnlichen Stilen",
    icon: "🔥",
    noseEN: ["Peat smoke", "Iodine", "Sea salt", "Brine", "Tar", "Medicinal", "Campfire", "Seaweed", "Smoked fish", "Charcoal", "Bonfire", "Leather"],
    noseDE: ["Torfrauch", "Jod", "Meersalz", "Salzlake", "Teer", "Medizinisch", "Lagerfeuer", "Seetang", "Räucherfisch", "Holzkohle", "Feuer", "Leder"],
    palateEN: ["Smoke", "Ash", "Black pepper", "Dark chocolate", "Espresso", "Dried fruit", "Maritime salt", "Oily texture", "Liquorice", "Citrus peel"],
    palateDE: ["Rauch", "Asche", "Schwarzer Pfeffer", "Zartbitterschokolade", "Espresso", "Trockenfrüchte", "Maritime Salzigkeit", "Ölige Textur", "Lakritz", "Zitrusschale"],
    finishEN: ["Long smoky finish", "Warming peat", "Lingering ash", "Mineral", "Dry spice", "Coastal brine"],
    finishDE: ["Langer rauchiger Abgang", "Wärmender Torf", "Anhaltende Asche", "Mineralisch", "Trockene Gewürze", "Küstensalz"],
    tipsEN: "Add a few drops of water to open up the smoke and reveal hidden fruit notes beneath the peat.",
    tipsDE: "Einige Tropfen Wasser hinzufügen, um den Rauch zu öffnen und verborgene Fruchtnoten unter dem Torf freizulegen.",
  },
  {
    id: "speyside",
    nameEN: "Speyside / Fruity",
    nameDE: "Speyside / Fruchtig",
    descEN: "For elegant, fruit-forward Speyside malts and similar styles",
    descDE: "Für elegante, fruchtige Speyside-Malts und ähnliche Stile",
    icon: "🍎",
    noseEN: ["Apple", "Pear", "Honey", "Vanilla", "Floral", "Heather", "Malt", "Toffee", "Butterscotch", "Apricot", "Peach", "Fresh grass"],
    noseDE: ["Apfel", "Birne", "Honig", "Vanille", "Blumig", "Heidekraut", "Malz", "Toffee", "Karamell", "Aprikose", "Pfirsich", "Frisches Gras"],
    palateEN: ["Orchard fruit", "Honey", "Vanilla cream", "Light spice", "Marzipan", "Barley sugar", "Citrus", "Ginger", "Milk chocolate", "Nutmeg"],
    palateDE: ["Obstgarten-Früchte", "Honig", "Vanillecreme", "Leichte Gewürze", "Marzipan", "Gerstenzucker", "Zitrus", "Ingwer", "Milchschokolade", "Muskatnuss"],
    finishEN: ["Medium-length", "Gentle warmth", "Lingering sweetness", "Clean", "Floral fade", "Honey aftertaste"],
    finishDE: ["Mittellang", "Sanfte Wärme", "Anhaltende Süße", "Sauber", "Blumiges Ausklingen", "Honig-Nachgeschmack"],
    tipsEN: "Speyside malts benefit from slow nosing. Let the glass warm in your hand to release the delicate fruit esters.",
    tipsDE: "Speyside-Malts profitieren von langsamem Riechen. Lassen Sie das Glas in der Hand wärmen, um die feinen Fruchtester freizusetzen.",
  },
  {
    id: "sherry",
    nameEN: "Sherry Cask / Rich",
    nameDE: "Sherryfass / Reichhaltig",
    descEN: "For rich, sherry-influenced whiskies with dried fruit and spice",
    descDE: "Für reichhaltige, vom Sherryfass beeinflusste Whiskys mit Trockenfrüchten und Gewürzen",
    icon: "🍷",
    noseEN: ["Dried fruit", "Raisins", "Christmas cake", "Dark chocolate", "Orange peel", "Cinnamon", "Clove", "Walnut", "Fig", "Plum", "Sherry", "Leather"],
    noseDE: ["Trockenfrüchte", "Rosinen", "Weihnachtskuchen", "Zartbitterschokolade", "Orangenschale", "Zimt", "Nelke", "Walnuss", "Feige", "Pflaume", "Sherry", "Leder"],
    palateEN: ["Rich fruit", "Dark berries", "Spice", "Sultanas", "Treacle", "Gingerbread", "Cocoa", "Molasses", "Red wine", "Oak tannins"],
    palateDE: ["Reiche Frucht", "Dunkle Beeren", "Gewürze", "Sultaninen", "Melasse", "Lebkuchen", "Kakao", "Rohrzuckermelasse", "Rotwein", "Eichentannine"],
    finishEN: ["Long and warming", "Dried fruit lingers", "Spiced oak", "Chocolatey", "Tannic grip", "Sweet decay"],
    finishDE: ["Lang und wärmend", "Anhaltende Trockenfrüchte", "Gewürzte Eiche", "Schokoladig", "Tannin-Griff", "Süßes Verklingen"],
    tipsEN: "Sherry-matured whiskies often reveal more complexity with a second nosing after 10 minutes in the glass.",
    tipsDE: "Im Sherryfass gereifte Whiskys offenbaren oft mehr Komplexität beim zweiten Riechen nach 10 Minuten im Glas.",
  },
  {
    id: "bourbon",
    nameEN: "Bourbon / American",
    nameDE: "Bourbon / Amerikanisch",
    descEN: "For bourbon, rye, and American whiskey styles",
    descDE: "Für Bourbon, Rye und amerikanische Whiskey-Stile",
    icon: "🌽",
    noseEN: ["Vanilla", "Caramel", "Corn sweetness", "Charred oak", "Brown sugar", "Cherry", "Cinnamon", "Maple syrup", "Toffee", "Banana", "Coconut", "Butterscotch"],
    noseDE: ["Vanille", "Karamell", "Mais-Süße", "Verkohlte Eiche", "Brauner Zucker", "Kirsche", "Zimt", "Ahornsirup", "Toffee", "Banane", "Kokosnuss", "Karamellbonbon"],
    palateEN: ["Vanilla", "Sweet corn", "Oak char", "Spice", "Cinnamon red hots", "Caramel corn", "Cherry cola", "Baking spice", "Nutty", "Orange"],
    palateDE: ["Vanille", "Süßer Mais", "Eichenkohle", "Gewürze", "Zimt-Bonbon", "Karamell-Mais", "Kirsch-Cola", "Backgewürze", "Nussig", "Orange"],
    finishEN: ["Medium warmth", "Sweet oak", "Vanilla fade", "Peppery", "Dry and spicy", "Caramel lingering"],
    finishDE: ["Mittlere Wärme", "Süße Eiche", "Vanille-Ausklingen", "Pfeffrig", "Trocken und würzig", "Anhaltender Karamell"],
    tipsEN: "Bourbon's high corn content creates a sweet base. Look for how the charred oak interacts with that sweetness.",
    tipsDE: "Der hohe Maisanteil von Bourbon erzeugt eine süße Basis. Achten Sie darauf, wie die verkohlte Eiche mit dieser Süße interagiert.",
  },
  {
    id: "highland",
    nameEN: "Highland / Robust",
    nameDE: "Highland / Kräftig",
    descEN: "For robust, full-bodied Highland malts with heather and spice",
    descDE: "Für kräftige, vollmundige Highland-Malts mit Heidekraut und Gewürzen",
    icon: "⛰️",
    noseEN: ["Heather", "Honey", "Dried herbs", "Oak", "Nutmeg", "Ginger", "Stone fruit", "Citrus", "Malt", "Light smoke", "Beeswax", "Pine"],
    noseDE: ["Heidekraut", "Honig", "Getrocknete Kräuter", "Eiche", "Muskatnuss", "Ingwer", "Steinobst", "Zitrus", "Malz", "Leichter Rauch", "Bienenwachs", "Kiefer"],
    palateEN: ["Full-bodied", "Spice", "Dried fruit", "Toffee", "Ginger cake", "Orange marmalade", "Toasted oak", "Black pepper", "Dark honey", "Nutty"],
    palateDE: ["Vollmundig", "Gewürze", "Trockenfrüchte", "Toffee", "Ingwerkuchen", "Orangenmarmelade", "Geröstete Eiche", "Schwarzer Pfeffer", "Dunkler Honig", "Nussig"],
    finishEN: ["Long and warming", "Dry spice", "Oak tannin", "Heather honey", "Gentle smoke", "Herbal fade"],
    finishDE: ["Lang und wärmend", "Trockene Gewürze", "Eichentannin", "Heidehonig", "Sanfter Rauch", "Kräuteriges Ausklingen"],
    tipsEN: "Highland malts span a wide range. Pay attention to whether the character leans coastal, eastern, or western.",
    tipsDE: "Highland-Malts umfassen ein breites Spektrum. Achten Sie darauf, ob der Charakter eher küstennah, östlich oder westlich tendiert.",
  },
  {
    id: "japanese",
    nameEN: "Japanese / Refined",
    nameDE: "Japanisch / Raffiniert",
    descEN: "For Japanese whiskies known for precision, balance, and elegance",
    descDE: "Für japanische Whiskys, bekannt für Präzision, Balance und Eleganz",
    icon: "🎌",
    noseEN: ["White flowers", "Pear", "Green tea", "Sandalwood", "Citrus blossom", "Light vanilla", "Incense", "Rice", "Delicate smoke", "Peach", "Melon", "Mint"],
    noseDE: ["Weiße Blüten", "Birne", "Grüner Tee", "Sandelholz", "Zitrusblüte", "Leichte Vanille", "Weihrauch", "Reis", "Zarter Rauch", "Pfirsich", "Melone", "Minze"],
    palateEN: ["Precise balance", "Stone fruit", "Subtle spice", "Honey", "White pepper", "Mizunara oak", "Silky texture", "Umami", "Floral", "Clean malt"],
    palateDE: ["Präzise Balance", "Steinobst", "Subtile Gewürze", "Honig", "Weißer Pfeffer", "Mizunara-Eiche", "Seidige Textur", "Umami", "Blumig", "Sauberer Malz"],
    finishEN: ["Clean and long", "Delicate fade", "Subtle oak", "Elegant warmth", "Floral echo", "Mineral"],
    finishDE: ["Sauber und lang", "Zartes Verklingen", "Subtile Eiche", "Elegante Wärme", "Blumiges Echo", "Mineralisch"],
    tipsEN: "Japanese whisky rewards patience. Take small sips and notice how the flavors evolve on the palate.",
    tipsDE: "Japanischer Whisky belohnt Geduld. Nehmen Sie kleine Schlucke und beachten Sie, wie sich die Aromen am Gaumen entwickeln.",
  },
];

function VocabPills({ terms }: { terms: string[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {terms.map((term) => (
        <span
          key={term}
          style={{
            fontSize: 11,
            padding: "4px 10px",
            borderRadius: 20,
            background: `${c.accent}12`,
            color: c.text,
            border: `1px solid ${c.border}`,
          }}
        >
          {term}
        </span>
      ))}
    </div>
  );
}

function VocabSection({
  title,
  terms,
  sectionId,
  copiedSection,
  onCopy,
}: {
  title: string;
  terms: string[];
  sectionId: string;
  copiedSection: string | null;
  onCopy: (text: string, sectionId: string) => void;
}) {
  const isCopied = copiedSection === sectionId;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: c.accent }}>
          {title}
        </span>
        <button
          onClick={() => onCopy(terms.join(", "), sectionId)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: isCopied ? c.success : c.muted }}
          data-testid={`button-copy-${sectionId}`}
        >
          {isCopied ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
        </button>
      </div>
      <VocabPills terms={terms} />
    </div>
  );
}

export default function DiscoverTemplates() {
  const { i18n } = useTranslation();
  const isDE = i18n.language === "de";
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(sectionId);
      setTimeout(() => setCopiedSection(null), 2000);
    });
  };

  return (
    <SimpleShell>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
        <div style={{ marginBottom: 8 }}>
          <h2 style={pageTitleStyle} data-testid="text-templates-title">
            Tasting Templates
          </h2>
          <p style={pageSubtitleStyle}>
            {isDE ? "Vokabular-Guides für verschiedene Whisky-Stile" : "Style-specific vocabulary & sensory guides"}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {TEMPLATES.map((template) => {
            const isExpanded = expandedId === template.id;
            const name = isDE ? template.nameDE : template.nameEN;
            const desc = isDE ? template.descDE : template.descEN;
            const noseTerms = isDE ? template.noseDE : template.noseEN;
            const palateTerms = isDE ? template.palateDE : template.palateEN;
            const finishTerms = isDE ? template.finishDE : template.finishEN;
            const tips = isDE ? template.tipsDE : template.tipsEN;

            return (
              <div
                key={template.id}
                style={{
                  ...cardStyle,
                  padding: 0,
                  overflow: "hidden",
                }}
                data-testid={`card-template-${template.id}`}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : template.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "16px 20px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    color: c.text,
                    fontFamily: "system-ui, sans-serif",
                  }}
                  data-testid={`button-template-${template.id}`}
                >
                  <span style={{ fontSize: 24 }}>{template.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "'Playfair Display', serif" }}>{name}</div>
                    <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>{desc}</div>
                  </div>
                  {isExpanded
                    ? <ChevronUp style={{ width: 16, height: 16, color: c.muted, flexShrink: 0 }} />
                    : <ChevronDown style={{ width: 16, height: 16, color: c.muted, flexShrink: 0 }} />
                  }
                </button>

                {isExpanded && (
                  <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${c.border}` }}>
                    <div style={{ marginTop: 16 }}>
                      <VocabSection
                        title={isDE ? "Nase / Aromen" : "Nose / Aromas"}
                        terms={noseTerms}
                        sectionId={`${template.id}-nose`}
                        copiedSection={copiedSection}
                        onCopy={copyToClipboard}
                      />
                      <VocabSection
                        title={isDE ? "Gaumen / Geschmack" : "Palate / Taste"}
                        terms={palateTerms}
                        sectionId={`${template.id}-palate`}
                        copiedSection={copiedSection}
                        onCopy={copyToClipboard}
                      />
                      <VocabSection
                        title={isDE ? "Abgang" : "Finish"}
                        terms={finishTerms}
                        sectionId={`${template.id}-finish`}
                        copiedSection={copiedSection}
                        onCopy={copyToClipboard}
                      />
                    </div>

                    <div style={{
                      padding: "12px 16px",
                      background: `${c.accent}08`,
                      borderRadius: 10,
                      border: `1px solid ${c.accent}15`,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: c.accent, marginBottom: 4 }}>
                        💡 {isDE ? "Tipp" : "Tip"}
                      </div>
                      <div style={{ fontSize: 12, color: c.muted, lineHeight: 1.5 }}>{tips}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </SimpleShell>
  );
}

import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useState } from "react";
import { FileText, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

export default function TastingTemplates() {
  const { t, i18n } = useTranslation();
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
    <div className="max-w-4xl mx-auto px-4 py-8 min-w-0 overflow-x-hidden" data-testid="templates-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-7 h-7 text-primary" />
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-templates-title">
            {t("templates.title")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">{t("templates.subtitle")}</p>

        <div className="space-y-4">
          {TEMPLATES.map((template, index) => {
            const isExpanded = expandedId === template.id;
            const name = isDE ? template.nameDE : template.nameEN;
            const desc = isDE ? template.descDE : template.descEN;
            const noseTerms = isDE ? template.noseDE : template.noseEN;
            const palateTerms = isDE ? template.palateDE : template.palateEN;
            const finishTerms = isDE ? template.finishDE : template.finishEN;
            const tips = isDE ? template.tipsDE : template.tipsEN;

            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-card rounded-lg border border-border/40 overflow-hidden"
                data-testid={`card-template-${template.id}`}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : template.id)}
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-secondary/30 transition-colors"
                  data-testid={`button-template-${template.id}`}
                >
                  <span className="text-2xl">{template.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-serif font-semibold text-foreground">{name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" /> : <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />}
                </button>

                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.3 }}
                    className="px-5 pb-5 border-t border-border/20"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4">
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

                    <div className="mt-5 p-4 bg-primary/5 rounded-md border border-primary/10">
                      <p className="text-xs font-serif font-semibold text-primary/80 mb-1">
                        💡 {isDE ? "Tipp" : "Tip"}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{tips}</p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
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
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-serif font-semibold text-foreground uppercase tracking-wider">{title}</h4>
        <button
          onClick={() => onCopy(terms.join(", "), sectionId)}
          className="text-muted-foreground hover:text-primary transition-colors"
          title="Copy"
        >
          {isCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {terms.map((term) => (
          <span
            key={term}
            className="text-[11px] px-2 py-1 rounded-full bg-secondary/60 text-foreground/80 hover:bg-primary/10 hover:text-primary cursor-default transition-colors"
          >
            {term}
          </span>
        ))}
      </div>
    </div>
  );
}

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import SimpleShell from "@/components/simple/simple-shell";
import { Search, BookOpen, Wine, FlameKindling, MapPin, Factory, Package, ChevronDown, ChevronRight } from "lucide-react";
import { c as colors } from "@/lib/theme";

interface LexiconEntry {
  term: string;
  definition: string;
}

interface LexiconCategory {
  key: string;
  iconName: string;
  entries: LexiconEntry[];
}

const iconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  tastingTerms: Wine,
  flavorCategories: FlameKindling,
  regions: MapPin,
  productionMethods: Factory,
  caskTypes: Package,
};

const lexiconData: Record<string, LexiconCategory[]> = {
  en: [
    {
      key: "tastingTerms",
      iconName: "tastingTerms",
      entries: [
        { term: "Nose", definition: "The aroma of a whisky as perceived by smelling it. The nose often reveals the most complex layer of a dram." },
        { term: "Palate", definition: "The taste and texture experienced when whisky is on the tongue. It encompasses sweetness, bitterness, spice, and body." },
        { term: "Finish", definition: "The lingering flavors and sensations after swallowing. A long finish is often considered a sign of quality." },
        { term: "Balance", definition: "The harmony between different flavor elements — sweetness, acidity, bitterness, and alcohol. A well-balanced whisky has no single element dominating." },
        { term: "Body", definition: "The weight and texture of a whisky in the mouth, ranging from light and delicate to full and oily." },
        { term: "Legs", definition: "The streaks of liquid that cling to the inside of a glass after swirling. They indicate viscosity and alcohol content." },
        { term: "Mouthfeel", definition: "The physical sensation of whisky in the mouth — oily, waxy, creamy, thin, or astringent." },
        { term: "Dram", definition: "A traditional Scottish term for a serving of whisky. There is no fixed measurement; it simply means a pour." },
        { term: "Expression", definition: "A specific bottling or variant from a distillery, such as a particular age statement, cask finish, or limited edition." },
        { term: "Cask Strength", definition: "Whisky bottled directly from the cask without dilution, typically between 55–65% ABV. It offers the fullest intensity." },
        { term: "Single Malt", definition: "Whisky made from 100% malted barley at a single distillery using pot stills. Not to be confused with single cask." },
        { term: "Blended", definition: "A whisky created by combining malt and grain whiskies from multiple distilleries. Blends account for over 90% of Scotch sales." },
        { term: "NAS", definition: "No Age Statement. A whisky without a declared maturation period, allowing blenders to use a variety of cask ages." },
        { term: "ABV", definition: "Alcohol By Volume. The standard measure of alcohol content, expressed as a percentage. Scotch must be at least 40% ABV." },
        { term: "PPM", definition: "Phenol Parts Per Million. A measure of peat intensity in malted barley. Higher PPM indicates more smoky character." },
      ],
    },
    {
      key: "flavorCategories",
      iconName: "flavorCategories",
      entries: [
        { term: "Fruity", definition: "Flavors reminiscent of fresh or dried fruit — apple, pear, citrus, tropical fruit, raisins, or figs. Common in Speyside malts." },
        { term: "Floral", definition: "Delicate aromas of flowers such as heather, lavender, rose, or honeysuckle. Often found in lighter, more elegant whiskies." },
        { term: "Peaty / Smoky", definition: "Aromas and flavors derived from peat-dried malt — campfire smoke, iodine, tar, ash. Characteristic of Islay whiskies." },
        { term: "Spicy", definition: "Warming notes of cinnamon, pepper, ginger, clove, or nutmeg. Often associated with rye content or new oak maturation." },
        { term: "Sweet", definition: "Flavors of honey, vanilla, caramel, toffee, butterscotch, or brown sugar. Frequently imparted by bourbon cask maturation." },
        { term: "Woody", definition: "Notes of oak, cedar, sandalwood, or sawdust. Derived from cask interaction during maturation." },
        { term: "Maritime", definition: "Sea-influenced characters — brine, seaweed, salt spray, iodine. Common in coastal distilleries like those on Islay or Campbeltown." },
        { term: "Medicinal", definition: "Aromas of antiseptic, bandages, menthol, or eucalyptus. Often associated with heavily peated whiskies." },
        { term: "Malty", definition: "Flavors of cereal, biscuit, bread dough, or toast. A fundamental character from the malted barley base." },
        { term: "Nutty", definition: "Notes of almonds, hazelnuts, walnuts, or marzipan. Can develop through both distillation character and maturation." },
      ],
    },
    {
      key: "regions",
      iconName: "regions",
      entries: [
        { term: "Speyside", definition: "Scotland's most prolific whisky region, home to over 50 distilleries. Known for elegant, fruity, and often sherried malts." },
        { term: "Highland", definition: "Scotland's largest region, producing diverse styles from light and floral to rich and full-bodied. Includes sub-regions with distinct characters." },
        { term: "Lowland", definition: "Known for gentle, light-bodied whiskies with grassy, citrus, and floral notes. Often triple-distilled for smoothness." },
        { term: "Islay", definition: "A small island famous for intensely peated, smoky whiskies with maritime character. Home to legendary distilleries like Ardbeg and Laphroaig." },
        { term: "Campbeltown", definition: "Once Scotland's whisky capital with over 30 distilleries, now home to three. Known for briny, complex, slightly oily whiskies." },
        { term: "Islands", definition: "Scottish island distilleries outside Islay — Skye, Mull, Jura, Orkney, Arran. Styles vary widely but often carry maritime influence." },
        { term: "Ireland", definition: "Irish whiskey is typically triple-distilled and unpeated, producing a smooth, approachable spirit. Pot still whiskey is a uniquely Irish style." },
        { term: "Kentucky", definition: "The heartland of bourbon production. Kentucky's limestone-filtered water and climate create ideal conditions for corn-based whiskey maturation." },
        { term: "Tennessee", definition: "Home to Tennessee whiskey, which undergoes the Lincoln County Process — charcoal mellowing before cask maturation." },
        { term: "Japan", definition: "Japanese whisky draws on Scottish traditions but with meticulous craftsmanship. Known for precision, balance, and elegant complexity." },
      ],
    },
    {
      key: "productionMethods",
      iconName: "productionMethods",
      entries: [
        { term: "Malting", definition: "The process of soaking barley in water, allowing it to germinate, then drying it. Peat may be used during drying to impart smokiness." },
        { term: "Mashing", definition: "Mixing ground malt (grist) with hot water in a mash tun to extract fermentable sugars, producing a sweet liquid called wort." },
        { term: "Fermentation", definition: "Adding yeast to wort in washbacks to convert sugars into alcohol, creating a beer-like liquid called wash at around 8% ABV." },
        { term: "Distillation", definition: "Heating the wash in copper pot stills to separate and concentrate alcohol. Most Scotch is double-distilled; Irish whiskey is often triple-distilled." },
        { term: "Maturation", definition: "Ageing spirit in oak casks, where it develops color, flavor, and complexity. Scotch must mature for at least three years." },
        { term: "Cask Finishing", definition: "Transferring whisky to a different cask type for a secondary maturation period, adding extra layers of flavor — e.g., sherry, port, or wine casks." },
        { term: "Vatting", definition: "Blending multiple casks of whisky together before bottling. Used for both single malts (same distillery) and blends (multiple distilleries)." },
        { term: "Charring", definition: "Burning the inside of oak barrels to create a charcoal layer. This caramelizes wood sugars and helps filter impurities from the spirit." },
        { term: "Angel's Share", definition: "The portion of whisky that evaporates from the cask during maturation — roughly 2% per year in Scotland, more in warmer climates." },
        { term: "Chill Filtration", definition: "Cooling whisky before filtering to remove fatty acids that cause cloudiness. Non-chill-filtered whiskies retain more body and texture." },
      ],
    },
    {
      key: "caskTypes",
      iconName: "caskTypes",
      entries: [
        { term: "Bourbon Barrel", definition: "An American oak cask (200L) previously used for bourbon. Imparts vanilla, caramel, and coconut. The most common cask in Scotch production." },
        { term: "Sherry Butt", definition: "A large European oak cask (500L) seasoned with sherry. Imparts rich dried fruit, dark chocolate, and spice. Highly prized for single malts." },
        { term: "Port Pipe", definition: "A Portuguese cask (550–650L) previously holding port wine. Adds red berry, plum, and chocolate notes with a slight tannic edge." },
        { term: "Wine Cask", definition: "Casks previously used for red or white wine maturation. They add fruity, vinous notes and can include Burgundy, Bordeaux, or Sauternes." },
        { term: "Virgin Oak", definition: "A brand-new, unused oak cask. Imparts intense wood character — strong vanilla, tannin, and spice. Used sparingly to avoid over-oaking." },
        { term: "Hogshead", definition: "A rebuilt cask (250L) typically made from bourbon barrel staves with new ends. The most common cask size in Scotch maturation." },
        { term: "Quarter Cask", definition: "A small cask (125L) that accelerates maturation due to greater surface-area-to-volume ratio. Produces intense, rich flavors in less time." },
        { term: "Puncheon", definition: "A large cask (500L) made of either American or European oak. Its size means slower maturation and subtler wood influence." },
      ],
    },
  ],
  de: [
    {
      key: "tastingTerms",
      iconName: "tastingTerms",
      entries: [
        { term: "Nase", definition: "Das Aroma eines Whiskys, wie es beim Riechen wahrgenommen wird. Die Nase offenbart oft die komplexeste Schicht eines Drams." },
        { term: "Gaumen", definition: "Der Geschmack und die Textur, die man beim Trinken auf der Zunge erlebt. Umfasst Süße, Bitterkeit, Würze und Körper." },
        { term: "Abgang", definition: "Die nachklingenden Aromen und Empfindungen nach dem Schlucken. Ein langer Abgang gilt oft als Zeichen von Qualität." },
        { term: "Balance", definition: "Das Gleichgewicht zwischen verschiedenen Geschmackselementen — Süße, Säure, Bitterkeit und Alkohol. Ein ausbalancierter Whisky hat kein dominierendes Element." },
        { term: "Körper", definition: "Das Gewicht und die Textur eines Whiskys im Mund, von leicht und zart bis voll und ölig." },
        { term: "Schlieren", definition: "Die Flüssigkeitsstreifen, die nach dem Schwenken an der Innenseite des Glases haften. Sie zeigen Viskosität und Alkoholgehalt an." },
        { term: "Mundgefühl", definition: "Die physische Empfindung des Whiskys im Mund — ölig, wachsig, cremig, dünn oder adstringierend." },
        { term: "Dram", definition: "Ein traditioneller schottischer Begriff für eine Portion Whisky. Es gibt kein festes Maß; es bedeutet einfach ein Einschenken." },
        { term: "Expression", definition: "Eine bestimmte Abfüllung oder Variante einer Brennerei, wie eine bestimmte Altersangabe, ein Cask Finish oder eine limitierte Edition." },
        { term: "Fassstärke", definition: "Whisky, der direkt aus dem Fass ohne Verdünnung abgefüllt wird, typischerweise zwischen 55–65% vol. Bietet die volle Intensität." },
        { term: "Single Malt", definition: "Whisky aus 100% gemälzter Gerste, in einer einzigen Brennerei mit Pot Stills hergestellt. Nicht zu verwechseln mit Single Cask." },
        { term: "Blended", definition: "Ein Whisky aus der Kombination von Malt- und Grain-Whiskys verschiedener Brennereien. Blends machen über 90% des Scotch-Umsatzes aus." },
        { term: "NAS", definition: "No Age Statement (ohne Altersangabe). Ein Whisky ohne deklarierte Reifezeit, der dem Blender erlaubt, verschiedene Fassalter zu verwenden." },
        { term: "ABV", definition: "Alcohol By Volume (Alkoholgehalt). Das Standardmaß für den Alkoholgehalt in Prozent. Scotch muss mindestens 40% vol. haben." },
        { term: "PPM", definition: "Phenol Parts Per Million. Ein Maß für die Torfintensität in gemälzter Gerste. Höhere PPM-Werte bedeuten mehr rauchigen Charakter." },
      ],
    },
    {
      key: "flavorCategories",
      iconName: "flavorCategories",
      entries: [
        { term: "Fruchtig", definition: "Aromen, die an frisches oder getrocknetes Obst erinnern — Apfel, Birne, Zitrus, tropische Früchte, Rosinen oder Feigen. Häufig bei Speyside-Malts." },
        { term: "Blumig", definition: "Zarte Aromen von Blumen wie Heidekraut, Lavendel, Rose oder Geißblatt. Oft in leichteren, eleganteren Whiskys zu finden." },
        { term: "Torfig / Rauchig", definition: "Aromen aus torfgetrocknetem Malz — Lagerfeuerrauch, Jod, Teer, Asche. Charakteristisch für Islay-Whiskys." },
        { term: "Würzig", definition: "Wärmende Noten von Zimt, Pfeffer, Ingwer, Nelke oder Muskatnuss. Oft verbunden mit Roggenanteil oder neuer Eichenreifung." },
        { term: "Süß", definition: "Aromen von Honig, Vanille, Karamell, Toffee, Butterscotch oder braunem Zucker. Häufig durch Bourbon-Fass-Reifung vermittelt." },
        { term: "Holzig", definition: "Noten von Eiche, Zeder, Sandelholz oder Sägemehl. Entsteht durch die Interaktion mit dem Fass während der Reifung." },
        { term: "Maritim", definition: "Vom Meer beeinflusste Charaktere — Salzlake, Seetang, Meeressprühnebel, Jod. Häufig bei Küstenbrennereien wie auf Islay oder in Campbeltown." },
        { term: "Medizinisch", definition: "Aromen von Antiseptikum, Pflaster, Menthol oder Eukalyptus. Oft mit stark getorften Whiskys assoziiert." },
        { term: "Malzig", definition: "Aromen von Getreide, Keks, Brotteig oder Toast. Ein grundlegender Charakter aus der gemälzten Gerstenbasis." },
        { term: "Nussig", definition: "Noten von Mandeln, Haselnüssen, Walnüssen oder Marzipan. Kann sich sowohl durch Destillationscharakter als auch durch Reifung entwickeln." },
      ],
    },
    {
      key: "regions",
      iconName: "regions",
      entries: [
        { term: "Speyside", definition: "Schottlands produktivste Whisky-Region mit über 50 Brennereien. Bekannt für elegante, fruchtige und oft sherrygereifte Malts." },
        { term: "Highland", definition: "Schottlands größte Region mit vielfältigen Stilen — von leicht und blumig bis reich und vollmundig. Umfasst Unterregionen mit eigenem Charakter." },
        { term: "Lowland", definition: "Bekannt für sanfte, leichte Whiskys mit grasigen, Zitrus- und Blumennoten. Oft dreifach destilliert für Weichheit." },
        { term: "Islay", definition: "Eine kleine Insel, berühmt für intensiv getorfte, rauchige Whiskys mit maritimem Charakter. Heimat legendärer Brennereien wie Ardbeg und Laphroaig." },
        { term: "Campbeltown", definition: "Einst Schottlands Whisky-Hauptstadt mit über 30 Brennereien, heute drei. Bekannt für salzige, komplexe, leicht ölige Whiskys." },
        { term: "Islands", definition: "Schottische Inselbrennereien außerhalb Islays — Skye, Mull, Jura, Orkney, Arran. Vielfältige Stile, oft mit maritimem Einfluss." },
        { term: "Irland", definition: "Irischer Whiskey wird typischerweise dreifach destilliert und ungetorft, was einen weichen, zugänglichen Brand ergibt. Pot Still Whiskey ist ein einzigartig irischer Stil." },
        { term: "Kentucky", definition: "Das Herz der Bourbon-Produktion. Kentuckys kalksteingefiltertes Wasser und Klima schaffen ideale Bedingungen für die Reifung von Maiswhiskey." },
        { term: "Tennessee", definition: "Heimat des Tennessee Whiskey, der den Lincoln County Process durchläuft — Holzkohlefiltration vor der Fassreifung." },
        { term: "Japan", definition: "Japanischer Whisky basiert auf schottischen Traditionen, aber mit akribischer Handwerkskunst. Bekannt für Präzision, Balance und elegante Komplexität." },
      ],
    },
    {
      key: "productionMethods",
      iconName: "productionMethods",
      entries: [
        { term: "Mälzen", definition: "Das Einweichen von Gerste in Wasser, Keimenlassen und anschließendes Trocknen. Torf kann beim Trocknen verwendet werden, um Rauchigkeit zu verleihen." },
        { term: "Maischen", definition: "Mischen von gemahlenem Malz (Schrot) mit heißem Wasser im Maischbottich, um vergärbare Zucker zu extrahieren und eine süße Flüssigkeit namens Würze zu erzeugen." },
        { term: "Fermentation", definition: "Zugabe von Hefe zur Würze in Gärbottichen, um Zucker in Alkohol umzuwandeln. Erzeugt eine bierähnliche Flüssigkeit mit ca. 8% vol." },
        { term: "Destillation", definition: "Erhitzen der Maische in kupfernen Brennblasen zur Trennung und Konzentration des Alkohols. Scotch wird meist zweifach, irischer Whiskey oft dreifach destilliert." },
        { term: "Reifung", definition: "Lagerung des Brands in Eichenfässern, wo er Farbe, Geschmack und Komplexität entwickelt. Scotch muss mindestens drei Jahre reifen." },
        { term: "Fass-Finish", definition: "Umfüllen von Whisky in einen anderen Fasstyp für eine zweite Reifungsperiode, die zusätzliche Aromen verleiht — z.B. Sherry-, Port- oder Weinfässer." },
        { term: "Vatting", definition: "Vermählung mehrerer Fässer vor der Abfüllung. Wird sowohl für Single Malts (gleiche Brennerei) als auch für Blends (verschiedene Brennereien) verwendet." },
        { term: "Ausbrennen", definition: "Verbrennen der Innenseite von Eichenfässern zur Erzeugung einer Holzkohleschicht. Dies karamellisiert Holzzucker und hilft, Verunreinigungen zu filtern." },
        { term: "Angel's Share", definition: "Der Anteil des Whiskys, der während der Reifung aus dem Fass verdunstet — etwa 2% pro Jahr in Schottland, mehr in wärmeren Klimazonen." },
        { term: "Kühlfiltration", definition: "Kühlung des Whiskys vor dem Filtern, um Fettsäuren zu entfernen, die Trübung verursachen. Nicht kühlfiltrierte Whiskys behalten mehr Körper und Textur." },
      ],
    },
    {
      key: "caskTypes",
      iconName: "caskTypes",
      entries: [
        { term: "Bourbon Barrel", definition: "Ein amerikanisches Eichenfass (200L), zuvor für Bourbon verwendet. Verleiht Vanille, Karamell und Kokosnuss. Das häufigste Fass in der Scotch-Produktion." },
        { term: "Sherry Butt", definition: "Ein großes europäisches Eichenfass (500L), mit Sherry vorkonditioniert. Verleiht reiche Trockenfrüchte, dunkle Schokolade und Gewürze. Hoch geschätzt für Single Malts." },
        { term: "Port Pipe", definition: "Ein portugiesisches Fass (550–650L), zuvor mit Portwein belegt. Fügt rote Beeren-, Pflaumen- und Schokoladennoten mit leichter Tanninstruktur hinzu." },
        { term: "Weinfass", definition: "Fässer, die zuvor für Rot- oder Weißweinreifung verwendet wurden. Sie fügen fruchtige, weinige Noten hinzu — Burgunder, Bordeaux oder Sauternes." },
        { term: "Virgin Oak", definition: "Ein brandneues, unbenutztes Eichenfass. Verleiht intensiven Holzcharakter — starke Vanille, Tannin und Gewürze. Wird sparsam eingesetzt." },
        { term: "Hogshead", definition: "Ein umgebautes Fass (250L), typischerweise aus Bourbon-Barrel-Dauben mit neuen Böden. Die häufigste Fassgröße in der Scotch-Reifung." },
        { term: "Quarter Cask", definition: "Ein kleines Fass (125L), das die Reifung durch ein größeres Oberflächen-Volumen-Verhältnis beschleunigt. Erzeugt intensive, reiche Aromen in kürzerer Zeit." },
        { term: "Puncheon", definition: "Ein großes Fass (500L) aus amerikanischer oder europäischer Eiche. Seine Größe bedeutet langsamere Reifung und subtileren Holzeinfluss." },
      ],
    },
  ],
};

const categoryLabels: Record<string, Record<string, string>> = {
  en: {
    tastingTerms: "Tasting Terms",
    flavorCategories: "Flavor Categories",
    regions: "Regions",
    productionMethods: "Production Methods",
    caskTypes: "Cask Types",
  },
  de: {
    tastingTerms: "Verkostungsbegriffe",
    flavorCategories: "Aromakategorien",
    regions: "Regionen",
    productionMethods: "Herstellungsverfahren",
    caskTypes: "Fasstypen",
  },
};

export default function DiscoverLexicon() {
  const { i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedTerms, setExpandedTerms] = useState<Record<string, boolean>>({});

  const lang = i18n.language?.startsWith("de") ? "de" : "en";
  const categories = lexiconData[lang] ?? lexiconData.en;
  const labels = categoryLabels[lang] ?? categoryLabels.en;

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        entries: cat.entries.filter(
          (e) =>
            e.term.toLowerCase().includes(q) ||
            e.definition.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.entries.length > 0);
  }, [categories, searchQuery]);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleTerm = (id: string) => {
    setExpandedTerms((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isSectionOpen = (key: string) => {
    if (searchQuery.trim()) return true;
    return !!expandedSections[key];
  };

  return (
    <SimpleShell maxWidth={600}>
      <div data-testid="discover-lexicon-page">
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 4 }}>
            <BookOpen style={{ width: 24, height: 24, color: colors.accent }} />
            <h1
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 24,
                fontWeight: 700,
                color: colors.accent,
                margin: 0,
              }}
              data-testid="text-lexicon-title"
            >
              {lang === "de" ? "Whisky-Lexikon" : "Whisky Lexicon"}
            </h1>
          </div>
          <p style={{ fontSize: 13, color: colors.muted, margin: 0 }} data-testid="text-lexicon-subtitle">
            {lang === "de"
              ? "Begriffe, Aromen, Regionen und mehr"
              : "Terms, flavors, regions and more"}
          </p>
        </div>

        <div style={{ position: "relative", marginBottom: 24 }}>
          <Search
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              width: 16,
              height: 16,
              color: colors.muted,
            }}
          />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === "de" ? "Begriffe durchsuchen…" : "Search terms…"}
            style={{
              width: "100%",
              padding: "10px 12px 10px 36px",
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              color: colors.text,
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
            }}
            data-testid="input-lexicon-search"
          />
        </div>

        {filteredCategories.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <BookOpen style={{ width: 48, height: 48, color: colors.muted, opacity: 0.4, margin: "0 auto 16px" }} />
            <p style={{ color: colors.muted, fontFamily: "'Playfair Display', serif" }} data-testid="text-lexicon-no-results">
              {lang === "de" ? "Keine Ergebnisse gefunden" : "No results found"}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredCategories.map((cat) => {
              const Icon = iconMap[cat.key];
              const open = isSectionOpen(cat.key);
              return (
                <div
                  key={cat.key}
                  style={{
                    background: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 10,
                    overflow: "hidden",
                  }}
                  data-testid={`section-${cat.key}`}
                >
                  <button
                    onClick={() => toggleSection(cat.key)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 16px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: colors.text,
                    }}
                    data-testid={`toggle-section-${cat.key}`}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {Icon && <Icon style={{ width: 16, height: 16, color: colors.accent }} />}
                      <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 600 }}>
                        {labels[cat.key]}
                      </span>
                      <span style={{ fontSize: 12, color: colors.muted, fontWeight: 400 }}>
                        ({cat.entries.length})
                      </span>
                    </span>
                    {open ? (
                      <ChevronDown style={{ width: 16, height: 16, color: colors.muted }} />
                    ) : (
                      <ChevronRight style={{ width: 16, height: 16, color: colors.muted }} />
                    )}
                  </button>

                  {open && (
                    <div style={{ borderTop: `1px solid ${colors.border}` }}>
                      {cat.entries.map((entry, idx) => {
                        const termId = `${cat.key}-${idx}`;
                        const termOpen = !!expandedTerms[termId];
                        return (
                          <div
                            key={termId}
                            style={{
                              borderBottom: idx < cat.entries.length - 1 ? `1px solid ${colors.border}` : "none",
                            }}
                          >
                            <button
                              onClick={() => toggleTerm(termId)}
                              style={{
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "10px 16px",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: termOpen ? colors.accent : colors.text,
                                fontSize: 14,
                                textAlign: "left",
                              }}
                              data-testid={`toggle-term-${termId}`}
                            >
                              <span style={{ fontWeight: 500 }}>{entry.term}</span>
                              {termOpen ? (
                                <ChevronDown style={{ width: 14, height: 14, color: colors.muted, flexShrink: 0 }} />
                              ) : (
                                <ChevronRight style={{ width: 14, height: 14, color: colors.muted, flexShrink: 0 }} />
                              )}
                            </button>
                            {termOpen && (
                              <div
                                style={{
                                  padding: "0 16px 12px",
                                  fontSize: 13,
                                  lineHeight: 1.6,
                                  color: colors.muted,
                                }}
                                data-testid={`definition-${termId}`}
                              >
                                {entry.definition}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SimpleShell>
  );
}
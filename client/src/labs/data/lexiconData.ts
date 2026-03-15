export interface LexiconEntry { term: string; definition: string; }
export interface LexiconCategory { key: string; entries: LexiconEntry[]; }

export const lexiconData: Record<string, LexiconCategory[]> = {
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

export const categoryLabelsEn: Record<string, string> = {
  tastingTerms: "Tasting Terms", flavorCategories: "Flavor Categories", regions: "Regions", productionMethods: "Production Methods", caskTypes: "Cask Types",
};
export const categoryLabelsDe: Record<string, string> = {
  tastingTerms: "Verkostungsbegriffe", flavorCategories: "Aromakategorien", regions: "Regionen", productionMethods: "Herstellungsverfahren", caskTypes: "Fasstypen",
};

export const categoryLabelMap: Record<string, Record<string, string>> = {
  en: { tastingTerms: "Tasting", flavorCategories: "Flavours", regions: "Regions", productionMethods: "Production", caskTypes: "Casks" },
  de: { tastingTerms: "Verkostung", flavorCategories: "Aromen", regions: "Regionen", productionMethods: "Herstellung", caskTypes: "Fässer" },
};

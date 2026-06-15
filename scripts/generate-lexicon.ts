import OpenAI from "openai";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const platformKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const platformBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const userKey = process.env.OPENAI_API_KEY;

const apiKey = platformKey ?? userKey;
const baseURL = platformKey ? platformBaseUrl : undefined;

if (!apiKey) {
  console.error("No OpenAI key available");
  process.exit(1);
}
console.log(`Using ${platformKey ? "platform" : "user"} OpenAI key${baseURL ? ` (via ${baseURL})` : ""}`);

const openai = new OpenAI({ apiKey, baseURL });

interface CategorySpec {
  key: string;
  labelEn: string;
  labelDe: string;
  count: number;
  scope: string;
  alreadyCovered: string[];
}

const CATEGORIES: CategorySpec[] = [
  {
    key: "tastingTerms",
    labelEn: "Tasting Terms",
    labelDe: "Verkostungsbegriffe",
    count: 25,
    scope: "Vocabulary used while nosing and tasting whisky: sensory descriptors, evaluation terminology, common technical phrases. Examples of additional terms: Mouthfeel, Astringency, Length, Complexity, Balance, Depth, Intensity, Layered, Linear, Fresh, Dry Finish, Warm Finish, Long Finish, Short Finish, Lingering, Bittering, Drying, Coating, Oily Texture, Creamy Texture, Sharp, Soft, Rich, Robust, Delicate.",
    alreadyCovered: ["Nose", "Palate", "Finish", "Body", "Dram", "Cask Strength", "Single Malt", "ABV", "PPM"],
  },
  {
    key: "flavorCategories",
    labelEn: "Flavour Categories",
    labelDe: "Aromakategorien",
    count: 18,
    scope: "Flavour and aroma descriptor families used in whisky tasting: e.g. Nutty, Malty, Oily, Medicinal, Oaky, Herbal, Mineral, Leathery, Sulphury, Waxy, Vegetal, Sherried, Coastal, Coffee/Roasted, Tropical, Dried Fruit, Balsamic, Dairy.",
    alreadyCovered: ["Fruity", "Floral", "Peaty / Smoky", "Spicy", "Sweet", "Maritime"],
  },
  {
    key: "regions",
    labelEn: "Regions",
    labelDe: "Regionen",
    count: 22,
    scope: "Whisky-producing regions and sub-regions worldwide. Include: Lowland (Scotland), Islands (Scotland sub-region), Orkney, Skye, Mull, Jura, Arran (Island), Wales, England, Ireland, Cooley region (Ireland), Kentucky, Tennessee, Indiana, Texas, Canada, Hokkaido (Japan), Honshu (Japan), Taiwan, India, Australia, Sweden, France, Germany.",
    alreadyCovered: ["Speyside", "Highland", "Islay", "Campbeltown", "Japan"],
  },
  {
    key: "productionMethods",
    labelEn: "Production Methods",
    labelDe: "Herstellungsverfahren",
    count: 30,
    scope: "Steps and equipment in whisky production: malting, milling, mashing, fermentation, distillation hardware and techniques, maturation, blending. Suggested terms: Mash Bill, Wash, Wort, Washback, Mash Tun, Lyne Arm, Reflux, Worm Tub, Shell-and-Tube Condenser, Foreshots, Feints, Heart Cut, Spirit Safe, New Make Spirit, Charring, Toasting, Re-coopering, Continuous Still, Column Still, Coffey Still, Lomond Still, Direct Fire, Steam Coil, Floor Malting, Saladin Box, Drum Maltings, Triple Distillation, Double Distillation, Yeast Strain, Fermentation Time.",
    alreadyCovered: ["Malting", "Distillation", "Maturation", "Cask Finishing", "Angel's Share"],
  },
  {
    key: "caskTypes",
    labelEn: "Cask Types",
    labelDe: "Fasstypen",
    count: 25,
    scope: "Cask varieties and seasoning treatments. Sherry types: Oloroso, PX (Pedro Ximénez), Amontillado, Fino, Manzanilla, Palo Cortado, Cream Sherry. Wine: Sauternes, Bordeaux, Burgundy, Rioja, Marsala, Tokaji. Other spirits: Rum, Tequila, Cognac, Calvados, Mezcal. Specialty: Mizunara, Chestnut, Acacia, Cherry Wood, Virgin Oak, Refill Cask, Rejuvenated Cask, STR (Shaved-Toasted-Re-charred), IPA Beer Cask, Stout Beer Cask, Port Pipe, Madeira Drum.",
    alreadyCovered: ["Firkin", "Quarter Cask", "Rundlet", "Tierce", "British Barrel", "A.S.B. (American Standard Barrel)", "Bourbon Barrel", "Barrique", "Hogshead", "Puncheon / Tertian", "Butt", "Pipe", "Drum", "Gorda", "Tun"],
  },
  {
    key: "history",
    labelEn: "History & Heritage",
    labelDe: "Geschichte & Tradition",
    count: 20,
    scope: "Whisky history milestones and heritage facts. Suggested: Excise Act 1823, Old Bushmills 1608 license, Phylloxera Crisis, Pattison Crash, US Prohibition, Bourbon Act of 1964, Coffey Still invention 1830, Glenlivet first licensed distillery, Speyside Boom 1890s, Whisky Loch 1980s, Single Malt Renaissance, World Whisky Boom, Japanese whisky pioneer Masataka Taketsuru, Suntory founding, Bushmills heritage, Macallan dynasty, Glenfiddich first global single malt, Johnnie Walker family, Jim Beam family, Jack Daniel founding.",
    alreadyCovered: [],
  },
  {
    key: "legalAndStandards",
    labelEn: "Legal Definitions & Standards",
    labelDe: "Rechtliche Begriffe & Standards",
    count: 22,
    scope: "Regulations, designations, label categories. Suggested: Scotch Whisky Regulations 2009, Bottled in Bond, Straight Bourbon, Single Pot Still Irish Whiskey, Tennessee Whiskey, Bourbon (legal definition), Rye Whiskey, Wheat Whiskey, Single Cask, Single Barrel, Vintage, NAS (No Age Statement), Age Statement, Single Malt Scotch, Single Grain Scotch, Blended Malt Scotch, Blended Grain Scotch, Blended Scotch, Independent Bottler, Original Bottler (OB), Chill Filtration, Non-Chill-Filtered, Natural Colour, E150a Caramel Colouring.",
    alreadyCovered: [],
  },
  {
    key: "chemistry",
    labelEn: "Chemistry & Composition",
    labelDe: "Chemie & Zusammensetzung",
    count: 20,
    scope: "Chemical compounds and processes that shape whisky flavour. Suggested: Phenols, Cresols, Guaiacol, Ethanol, Methanol, Esters, Aldehydes, Ketones, Whisky Lactone (cis/trans), Tannins, Vanillin, Furfural, Eugenol, Congeners, Fusel Oils, Higher Alcohols, Diacetyl, Sulphur Compounds, Maillard Reaction, Lignin Breakdown.",
    alreadyCovered: [],
  },
  {
    key: "tastingMechanics",
    labelEn: "Glassware & Tasting Mechanics",
    labelDe: "Glas & Verkostungsmechanik",
    count: 20,
    scope: "Glasses, tools, rituals, mechanics. Suggested: Quaich, Glencairn Glass, Copita, Tulip Glass, Tumbler, Snifter, Riedel Vinum, Hydrometer, Refractometer, Drop of Water, Reduction, Headspace, Decanting, Resting in Glass, Nosing Technique, Retro-nasal Olfaction, Flight (sequenced tasting), Blind Tasting, Triangle Test, Palate Cleansing.",
    alreadyCovered: [],
  },
  {
    key: "bottlersAndBrands",
    labelEn: "Bottlers & Producer Styles",
    labelDe: "Abfüller & Produzenten-Stile",
    count: 22,
    scope: "Independent bottlers and key producer typologies (informational only, no endorsements). Suggested: Gordon & MacPhail, Cadenhead, Signatory Vintage, Douglas Laing, Hunter Laing, Compass Box, Berry Bros & Rudd, Adelphi, Wemyss Malts, Scotch Malt Whisky Society (SMWS), That Boutique-y Whisky Co, Càrn Mòr, Murray McDavid, Single Malts of Scotland, Specialty Drinks, Independent Bottler concept, Original Bottler (OB), Distillery Bottling, Distillery-Only Release, Single-Cask Bottling, Small Batch, Limited Edition.",
    alreadyCovered: [],
  },
  {
    key: "stylesAndStrengths",
    labelEn: "Styles & Strengths",
    labelDe: "Stile & Stärken",
    count: 20,
    scope: "Style classifications and strength labels. Suggested: Peated, Unpeated, Heavily Peated, Lightly Peated, Sherried Style, Bourbon-Matured Style, Triple Distilled Style, Heavy Style, Light Style, Highland Style, Lowland Style, Speyside Style, Coastal Style, Old Style (long fermentation), New Make Spirit Style, Bottling Strength, 40% Minimum, Overproof, Navy Strength concept, Reduced Strength.",
    alreadyCovered: [],
  },
];

const CATEGORY_LABELS_EN_EXTRA: Record<string, string> = {
  history: "History & Heritage",
  legalAndStandards: "Legal & Standards",
  chemistry: "Chemistry",
  tastingMechanics: "Glass & Mechanics",
  bottlersAndBrands: "Bottlers & Brands",
  stylesAndStrengths: "Styles & Strengths",
};
const CATEGORY_LABELS_DE_EXTRA: Record<string, string> = {
  history: "Geschichte & Tradition",
  legalAndStandards: "Recht & Standards",
  chemistry: "Chemie",
  tastingMechanics: "Glas & Mechanik",
  bottlersAndBrands: "Abfüller & Marken",
  stylesAndStrengths: "Stile & Stärken",
};
const CATEGORY_LABEL_MAP_EN_EXTRA: Record<string, string> = {
  history: "History",
  legalAndStandards: "Legal",
  chemistry: "Chemistry",
  tastingMechanics: "Glass",
  bottlersAndBrands: "Bottlers",
  stylesAndStrengths: "Styles",
};
const CATEGORY_LABEL_MAP_DE_EXTRA: Record<string, string> = {
  history: "Geschichte",
  legalAndStandards: "Recht",
  chemistry: "Chemie",
  tastingMechanics: "Glas",
  bottlersAndBrands: "Abfüller",
  stylesAndStrengths: "Stile",
};

interface GeneratedEntry {
  termEn: string;
  defEn: string;
  termDe: string;
  defDe: string;
}

async function generateCategory(spec: CategorySpec): Promise<GeneratedEntry[]> {
  const sys = `You are a whisky encyclopaedia editor. Output strict JSON only. Each definition must be 1-3 sentences, factual, neutral, no marketing language. Match this style: short, sober, informative.`;
  const user = `Generate exactly ${spec.count} unique whisky lexicon entries for the category "${spec.labelEn}".

Category scope:
${spec.scope}

Already covered (DO NOT repeat these): ${spec.alreadyCovered.join(", ") || "none"}

Requirements:
- termEn: the English term (use the canonical industry spelling).
- defEn: 1-3 sentence English definition.
- termDe: the German equivalent (often identical to English when it is a loanword such as "Single Malt"; otherwise translate properly, e.g. "Mash Tun" -> "Maischbottich", "Lyne Arm" -> "Geistrohr").
- defDe: 1-3 sentence German definition with the same factual content.
- Each entry must be unique within this category and not duplicate the covered list.
- Avoid emojis, bullet points, and quoted speech in definitions.
- Sort the array alphabetically by termEn.

Return JSON shape: { "entries": [{ "termEn": "...", "defEn": "...", "termDe": "...", "defDe": "..." }, ...] }`;

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error(`No content for ${spec.key}`);
  const parsed = JSON.parse(content) as { entries?: GeneratedEntry[] };
  const entries = parsed.entries ?? [];
  if (entries.length === 0) throw new Error(`No entries for ${spec.key}`);
  return entries;
}

function escapeStr(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

interface ExistingEntry { term: string; definition: string; }
interface ExistingCategory { key: string; entries: ExistingEntry[]; }

const EXISTING_EN: ExistingCategory[] = [
  { key: "tastingTerms", entries: [
    { term: "Nose", definition: "The aroma of a whisky as perceived by smelling it." },
    { term: "Palate", definition: "The taste and texture experienced when whisky is on the tongue." },
    { term: "Finish", definition: "The lingering flavors and sensations after swallowing." },
    { term: "Body", definition: "The weight and texture of a whisky in the mouth." },
    { term: "Dram", definition: "A traditional Scottish term for a serving of whisky." },
    { term: "Cask Strength", definition: "Whisky bottled directly from the cask without dilution, typically 55-65% ABV." },
    { term: "Single Malt", definition: "Whisky made from 100% malted barley at a single distillery using pot stills." },
    { term: "ABV", definition: "Alcohol By Volume - the standard measure of alcohol content." },
    { term: "PPM", definition: "Phenol Parts Per Million - a measure of peat intensity in malted barley." },
  ]},
  { key: "flavorCategories", entries: [
    { term: "Fruity", definition: "Flavors of fresh or dried fruit - apple, pear, citrus, tropical fruit." },
    { term: "Floral", definition: "Delicate aromas of heather, lavender, rose, or honeysuckle." },
    { term: "Peaty / Smoky", definition: "Aromas from peat-dried malt - campfire smoke, iodine, tar." },
    { term: "Spicy", definition: "Warming notes of cinnamon, pepper, ginger, clove." },
    { term: "Sweet", definition: "Honey, vanilla, caramel, toffee - often from bourbon casks." },
    { term: "Maritime", definition: "Sea-influenced characters - brine, seaweed, salt spray." },
  ]},
  { key: "regions", entries: [
    { term: "Speyside", definition: "Scotland's most prolific region with 50+ distilleries. Elegant, fruity malts." },
    { term: "Highland", definition: "Scotland's largest region - diverse styles from light to full-bodied." },
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
    { term: "Firkin", definition: "Small traditional cask (40L). Rare today, used historically for ales and spirits." },
    { term: "Quarter Cask", definition: "Small cask (50L) that accelerates maturation due to high surface-to-volume ratio. Intense, rich flavors." },
    { term: "Rundlet", definition: "Small historical cask (68L). Seldom used in modern whisky production." },
    { term: "Tierce", definition: "Medium cask (160L), a third of a pipe. Occasionally used for specialty maturations." },
    { term: "British Barrel", definition: "Traditional British cask (200L). Standard size for UK spirit production." },
    { term: "A.S.B. (American Standard Barrel)", definition: "American oak barrel (200L). The most common cask in bourbon production." },
    { term: "Bourbon Barrel", definition: "American oak (200L) previously used for bourbon. Vanilla, caramel, coconut." },
    { term: "Barrique", definition: "French oak cask (225L) widely used in wine. Adds tannin, spice, and elegance." },
    { term: "Hogshead", definition: "Rebuilt barrel (240L), often from bourbon staves. Balanced influence on spirit." },
    { term: "Puncheon / Tertian", definition: "Large cask (320L). Slower maturation, subtler wood influence." },
    { term: "Butt", definition: "Large European oak cask (480L) seasoned with sherry. Dried fruit, chocolate, spice." },
    { term: "Pipe", definition: "Portuguese cask (650L) used for port or Madeira. Red berry, plum, chocolate notes." },
    { term: "Drum", definition: "Large cask (650L). Similar size to a pipe, used for bulk maturation." },
    { term: "Gorda", definition: "Very large cask (700L). Often used for blending and vatting whisky." },
    { term: "Tun", definition: "Massive cask (1000L). Used primarily for blending large batches of whisky." },
  ]},
];

const EXISTING_DE: ExistingCategory[] = [
  { key: "tastingTerms", entries: [
    { term: "Nase", definition: "Das Aroma eines Whiskys beim Riechen." },
    { term: "Gaumen", definition: "Geschmack und Textur auf der Zunge." },
    { term: "Abgang", definition: "Nachklingende Aromen nach dem Schlucken." },
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
    { term: "Süß", definition: "Honig, Vanille, Karamell - oft von Bourbon-Fässern." },
    { term: "Maritim", definition: "Salzlake, Seetang, Meeressprühnebel." },
  ]},
  { key: "regions", entries: [
    { term: "Speyside", definition: "Produktivste Region mit 50+ Brennereien. Elegant, fruchtig." },
    { term: "Highland", definition: "Größte Region - vielfältige Stile." },
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
    { term: "Firkin", definition: "Kleines traditionelles Fass (40L). Heute selten, historisch für Bier und Spirituosen verwendet." },
    { term: "Quarter Cask", definition: "Kleines Fass (50L) mit beschleunigter Reifung durch hohes Oberflächen-Volumen-Verhältnis. Intensive, reichhaltige Aromen." },
    { term: "Rundlet", definition: "Kleines historisches Fass (68L). In der modernen Whiskyproduktion kaum noch verwendet." },
    { term: "Tierce", definition: "Mittelgroßes Fass (160L), ein Drittel einer Pipe. Gelegentlich für Spezialreifungen genutzt." },
    { term: "British Barrel", definition: "Traditionelles britisches Fass (200L). Standardgröße für die britische Spirituosenproduktion." },
    { term: "A.S.B. (American Standard Barrel)", definition: "Amerikanisches Eichenfass (200L). Das gebräuchlichste Fass in der Bourbon-Produktion." },
    { term: "Bourbon Barrel", definition: "Amerikanisches Eichenfass (200L). Vanille, Karamell, Kokosnuss." },
    { term: "Barrique", definition: "Französisches Eichenfass (225L), weit verbreitet im Weinbau. Verleiht Tannin, Würze und Eleganz." },
    { term: "Hogshead", definition: "Umgebautes Fass (240L), oft aus Bourbon-Dauben. Ausgewogener Holzeinfluss." },
    { term: "Puncheon / Tertian", definition: "Großes Fass (320L). Langsamere Reifung, subtilerer Holzeinfluss." },
    { term: "Butt", definition: "Großes europäisches Eichenfass (480L), mit Sherry vorbereitet. Trockenfrüchte, Schokolade, Gewürze." },
    { term: "Pipe", definition: "Portugiesisches Fass (650L), für Port- oder Madeira-Wein verwendet. Rote Beeren, Pflaume, Schokolade." },
    { term: "Drum", definition: "Großes Fass (650L). Ähnliche Größe wie eine Pipe, für Massenreifung verwendet." },
    { term: "Gorda", definition: "Sehr großes Fass (700L). Häufig zum Mischen und Zusammenführen von Whisky verwendet." },
    { term: "Tun", definition: "Riesiges Fass (1000L). Hauptsächlich zum Mischen großer Whisky-Chargen verwendet." },
  ]},
];

function entryLine(term: string, definition: string): string {
  return `      { term: "${escapeStr(term)}", definition: "${escapeStr(definition)}" },`;
}

function categoryBlock(key: string, entries: ExistingEntry[]): string {
  const lines = entries.map((e) => entryLine(e.term, e.definition)).join("\n");
  return `    { key: "${key}", entries: [\n${lines}\n    ]},`;
}

function buildFile(enCats: ExistingCategory[], deCats: ExistingCategory[]): string {
  const enBlocks = enCats.map((c) => categoryBlock(c.key, c.entries)).join("\n");
  const deBlocks = deCats.map((c) => categoryBlock(c.key, c.entries)).join("\n");

  const allKeys = enCats.map((c) => c.key);
  const labelsEn: Record<string, string> = {
    tastingTerms: "Tasting Terms", flavorCategories: "Flavour Categories", regions: "Regions",
    productionMethods: "Production Methods", caskTypes: "Cask Types",
    ...CATEGORY_LABELS_EN_EXTRA,
  };
  const labelsDe: Record<string, string> = {
    tastingTerms: "Verkostungsbegriffe", flavorCategories: "Aromakategorien", regions: "Regionen",
    productionMethods: "Herstellungsverfahren", caskTypes: "Fasstypen",
    ...CATEGORY_LABELS_DE_EXTRA,
  };
  const mapEn: Record<string, string> = {
    tastingTerms: "Tasting", flavorCategories: "Flavours", regions: "Regions",
    productionMethods: "Production", caskTypes: "Casks",
    ...CATEGORY_LABEL_MAP_EN_EXTRA,
  };
  const mapDe: Record<string, string> = {
    tastingTerms: "Verkostung", flavorCategories: "Aromen", regions: "Regionen",
    productionMethods: "Herstellung", caskTypes: "Fässer",
    ...CATEGORY_LABEL_MAP_DE_EXTRA,
  };

  const labelLine = (m: Record<string, string>): string =>
    allKeys.map((k) => `${k}: "${escapeStr(m[k] ?? k)}"`).join(", ");

  return `export interface LexiconEntry { term: string; definition: string; }
export interface LexiconCategory { key: string; entries: LexiconEntry[]; }

export const lexiconData: Record<string, LexiconCategory[]> = {
  en: [
${enBlocks}
  ],
  de: [
${deBlocks}
  ],
};

export const categoryLabelsEn: Record<string, string> = {
  ${labelLine(labelsEn)},
};
export const categoryLabelsDe: Record<string, string> = {
  ${labelLine(labelsDe)},
};

export const categoryLabelMap: Record<string, Record<string, string>> = {
  en: { ${labelLine(mapEn)} },
  de: { ${labelLine(mapDe)} },
};
`;
}

async function main(): Promise<void> {
  console.log(`Generating ${CATEGORIES.length} categories in parallel...`);
  const results = await Promise.all(
    CATEGORIES.map(async (spec) => {
      const start = Date.now();
      try {
        const entries = await generateCategory(spec);
        console.log(`  ${spec.key}: ${entries.length} entries (${Date.now() - start}ms)`);
        return { spec, entries };
      } catch (err) {
        console.error(`  ${spec.key} FAILED:`, err);
        throw err;
      }
    }),
  );

  const newEnByKey = new Map<string, ExistingEntry[]>();
  const newDeByKey = new Map<string, ExistingEntry[]>();
  for (const { spec, entries } of results) {
    const seenEn = new Set<string>();
    const seenDe = new Set<string>();
    const enArr: ExistingEntry[] = [];
    const deArr: ExistingEntry[] = [];
    for (const e of entries) {
      const enKey = e.termEn.trim().toLowerCase();
      const deKey = e.termDe.trim().toLowerCase();
      if (seenEn.has(enKey) || seenDe.has(deKey)) continue;
      if (spec.alreadyCovered.some((c) => c.toLowerCase() === enKey)) continue;
      seenEn.add(enKey);
      seenDe.add(deKey);
      enArr.push({ term: e.termEn.trim(), definition: e.defEn.trim() });
      deArr.push({ term: e.termDe.trim(), definition: e.defDe.trim() });
    }
    enArr.sort((a, b) => a.term.localeCompare(b.term));
    deArr.sort((a, b) => a.term.localeCompare(b.term));
    newEnByKey.set(spec.key, enArr);
    newDeByKey.set(spec.key, deArr);
  }

  const mergedEn: ExistingCategory[] = [];
  const mergedDe: ExistingCategory[] = [];
  const existingKeys = EXISTING_EN.map((c) => c.key);
  for (const cat of EXISTING_EN) {
    const fresh = newEnByKey.get(cat.key) ?? [];
    const existingTerms = new Set(cat.entries.map((e) => e.term.toLowerCase()));
    const filtered = fresh.filter((e) => !existingTerms.has(e.term.toLowerCase()));
    mergedEn.push({ key: cat.key, entries: [...cat.entries, ...filtered] });
  }
  for (const cat of EXISTING_DE) {
    const fresh = newDeByKey.get(cat.key) ?? [];
    const existingTerms = new Set(cat.entries.map((e) => e.term.toLowerCase()));
    const filtered = fresh.filter((e) => !existingTerms.has(e.term.toLowerCase()));
    mergedDe.push({ key: cat.key, entries: [...cat.entries, ...filtered] });
  }
  for (const { spec } of results) {
    if (existingKeys.includes(spec.key)) continue;
    mergedEn.push({ key: spec.key, entries: newEnByKey.get(spec.key) ?? [] });
    mergedDe.push({ key: spec.key, entries: newDeByKey.get(spec.key) ?? [] });
  }

  const totalEn = mergedEn.reduce((a, c) => a + c.entries.length, 0);
  const totalDe = mergedDe.reduce((a, c) => a + c.entries.length, 0);
  console.log(`\nTotals: EN=${totalEn}, DE=${totalDe}`);
  for (const c of mergedEn) {
    const dCat = mergedDe.find((x) => x.key === c.key);
    console.log(`  ${c.key}: en=${c.entries.length} de=${dCat?.entries.length ?? 0}`);
  }

  const file = buildFile(mergedEn, mergedDe);
  const target = resolve(process.cwd(), "client/src/labs/data/lexiconData.ts");
  writeFileSync(target, file, "utf8");
  console.log(`\nWrote ${target} (${file.length} bytes)`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});

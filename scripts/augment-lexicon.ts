import OpenAI from "openai";
import { writeFileSync } from "fs";
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
console.log(`Using ${platformKey ? "platform" : "user"} OpenAI key`);
const openai = new OpenAI({ apiKey, baseURL });

const TARGETS_PER_CATEGORY: Record<string, { en: number; de: number; topic: string }> = {
  tastingTerms: { en: 30, de: 30, topic: "additional whisky tasting and sensory descriptors not yet in the list (e.g. austere, brooding, chewy, drying, edgy, elegant, ethereal, expressive, full-bodied, harsh, hot, juicy, lush, meaty, mellow, mouth-filling, opulent, peppery, prickly, racy, restrained, rounded, savoury, silky, sinewy, smooth, stony, supple, syrupy, tight, viscous, voluptuous, vibrant)" },
  flavorCategories: { en: 25, de: 25, topic: "additional flavour and aroma descriptor families (e.g. tobacco, leather, wax, beeswax, tar, rubber, ash, bonfire, bacon, smoked meat, hay, grass, mint, eucalyptus, cedar, sandalwood, dark chocolate, milk chocolate, butterscotch, marzipan, almond, walnut, hazelnut, dried apricot, fig, raisin, prune, candied orange, lemon zest, ginger, cardamom, nutmeg, allspice, anise, fennel, mocha, espresso, treacle, demerara, brown sugar, coconut, banana, pineapple)" },
  regions: { en: 30, de: 30, topic: "additional whisky-producing regions and sub-regions worldwide (e.g. Orkney, Skye, Mull, Jura, Arran, Lewis, Outer Hebrides, Wales, England, Cotswolds, Lake District, Northern Ireland, Cooley, Donegal, Kentucky, Tennessee, Indiana, Texas, Colorado, New York, Brooklyn, Hudson Valley, Pacific Northwest, Canada, Alberta, Quebec, Hokkaido, Honshu, Kyushu, Taiwan, Yilan, India, Goa, Australia, Tasmania, Melbourne, Sweden, Mackmyra Region, France, Brittany, Alsace, Germany, Black Forest, Spain, Galicia, Switzerland, Czech Republic, Israel, South Africa, New Zealand)" },
  productionMethods: { en: 35, de: 35, topic: "additional production-process and equipment terms (e.g. Mash Bill, Wort, Wash, Washback, Mash Tun, Spirit Safe, New Make Spirit, Foreshots, Heart Cut, Feints, Lyne Arm, Reflux, Worm Tub, Shell-and-Tube Condenser, Lomond Still, Coffey Still, Column Still, Continuous Still, Direct Fire, Steam Coil, Floor Malting, Saladin Box, Drum Maltings, Triple Distillation, Double Distillation, Yeast Strain, Long Fermentation, Short Fermentation, Distillers Beer, Low Wines, High Wines, Rummager, Charge, Spirit Receiver, Filling Strength, Cask Filling, Re-charring, Re-coopering, Quarter-fill, Toasting Levels, Char Levels, Bourbon Char #4, Doubler, Thumper, Pot Still Shape, Boil Ball, Onion Shape, Lantern Shape, Wash Still, Spirit Still)" },
  caskTypes: { en: 30, de: 30, topic: "additional cask types and seasoning treatments (e.g. Oloroso Sherry Cask, Pedro Ximénez (PX) Cask, Amontillado Sherry Cask, Fino Sherry Cask, Manzanilla Sherry Cask, Palo Cortado Sherry Cask, Cream Sherry Cask, Sauternes Cask, Bordeaux Cask, Burgundy Cask, Rioja Cask, Marsala Cask, Tokaji Cask, Chardonnay Cask, Cabernet Sauvignon Cask, Port Pipe, Madeira Drum, Rum Cask, Tequila Cask, Cognac Cask, Calvados Cask, Mezcal Cask, Mizunara Cask, Chestnut Cask, Acacia Cask, Cherry Wood Cask, Virgin Oak Cask, Refill Cask, First-Fill Cask, Second-Fill Cask, Third-Fill Cask, Rejuvenated Cask, STR Cask (Shaved-Toasted-Re-charred), IPA Beer Cask, Stout Beer Cask, ASB Cask, Custom Char Cask, Toasted Cask, Heavily Charred Cask)" },
  history: { en: 25, de: 25, topic: "additional historical milestones, persons and events in whisky (e.g. Excise Act 1823, Old Bushmills 1608 license, Phylloxera Crisis, Pattison Crash, US Prohibition 1920, Repeal 1933, Bottled in Bond Act 1897, Coffey Still invention 1830, Aeneas Coffey, Glenlivet first licensed distillery 1824, George Smith, Speyside Boom 1890s, Whisky Loch 1980s, Single Malt Renaissance, Japanese Pioneer Masataka Taketsuru, Suntory founding 1923, Shinjiro Torii, Bushmills heritage, Macallan Roxburghe Estate, Glenfiddich first global single malt, Walker family, Beam family, Jack Daniel founding 1866, Lincoln County Process, Bourbon Heritage Month, World Whisky Day, Whisky Magazine origin, World Whiskies Awards origin)" },
  legalAndStandards: { en: 25, de: 25, topic: "additional legal definitions and standards (e.g. Scotch Whisky Regulations 2009, Bottled in Bond, Straight Bourbon, Tennessee Whiskey legal definition, Single Pot Still Irish Whiskey, Bourbon legal definition, Rye Whiskey legal definition, Wheat Whiskey legal definition, Malt Whiskey legal definition US, Single Cask, Single Barrel, Vintage, NAS (No Age Statement), Age Statement rule, Single Malt Scotch, Single Grain Scotch, Blended Malt Scotch, Blended Grain Scotch, Blended Scotch, Independent Bottler, Original Bottler (OB), Chill Filtration, Non Chill-Filtered, Natural Colour, E150a Caramel Colouring, EU Minimum Maturation 3 years, US Minimum Maturation rules, Solera System, Lincoln County Process, Sour Mash, Limited Release, Cask Strength threshold)" },
  chemistry: { en: 22, de: 22, topic: "additional whisky chemistry terms (e.g. Phenols, Cresols, Guaiacol, Syringol, Eugenol, Ethanol, Methanol, Esters, Ethyl Acetate, Ethyl Hexanoate, Aldehydes, Acetaldehyde, Furfural, Ketones, Diacetyl, Whisky Lactone (cis/trans), Tannins, Vanillin, Lignin Breakdown, Hemicellulose, Cellulose, Congeners, Fusel Oils, Higher Alcohols, Isoamyl Alcohol, Sulphur Compounds, DMS (Dimethyl Sulphide), Maillard Reaction, Caramelisation, Oxidation, Esterification)" },
  tastingMechanics: { en: 25, de: 25, topic: "additional glassware and tasting mechanics terms (e.g. Quaich, Glencairn Glass, Copita, Tulip Glass, Tumbler, Snifter, Riedel Vinum, Norlan Glass, Stem Glass, Whisky Lens, Hydrometer, Refractometer, Drop of Water, Reduction (with water), Headspace in Bottle, Decanting, Resting in Glass, Nosing Technique, Open-mouth Nosing, Retro-nasal Olfaction, Flight (sequenced tasting), Blind Tasting, Triangle Test, Palate Cleansing, Palate Fatigue, Tasting Mat, Tasting Wheel, Aroma Kit, Spittoon, Reference Sample)" },
  bottlersAndBrands: { en: 25, de: 25, topic: "additional independent bottlers and producer-style terms (informational only, no endorsements) (e.g. Gordon & MacPhail, Cadenhead, Signatory Vintage, Douglas Laing, Hunter Laing, Compass Box, Berry Bros & Rudd, Adelphi, Wemyss Malts, Scotch Malt Whisky Society (SMWS), That Boutique-y Whisky Co, Càrn Mòr, Murray McDavid, Single Malts of Scotland, Specialty Drinks, Independent Bottler concept, Original Bottler (OB), Distillery Bottling, Distillery-Only Release, Single-Cask Bottling, Small Batch, Limited Edition, Anniversary Edition, Festival Bottling, Hand-Filled Bottling, Annual Release Series, Core Range, NAS Range)" },
  stylesAndStrengths: { en: 25, de: 25, topic: "additional style classifications and strength labels (e.g. Peated, Unpeated, Heavily Peated, Lightly Peated, Sherried Style, Bourbon-Matured Style, Heavily Sherried, Triple Distilled Style, Heavy Style, Light Style, Highland Style, Lowland Style, Speyside Style, Coastal Style, Old Style (long fermentation), New Make Spirit Style, Bottling Strength, 40% Minimum, 43% Standard, Overproof, Navy Strength concept, Reduced Strength, Diluted Cask Strength, Single Cask Strength, Vatted at Cask Strength, High-Strength Bottling, Lower-Strength Bottling, Travel Retail Edition, Marriage in Tun, Vatted Malt)" },
};

interface GeneratedEntry { termEn: string; defEn: string; termDe: string; defDe: string; }

async function topupCategory(key: string, currentEnTerms: string[], currentDeTerms: string[], targetEn: number, targetDe: number, topic: string): Promise<GeneratedEntry[]> {
  const needed = Math.max(targetEn - currentEnTerms.length, targetDe - currentDeTerms.length);
  if (needed <= 0) return [];
  const requestCount = Math.min(needed + 5, 35);

  const sys = `You are a whisky encyclopaedia editor. Output strict JSON only. Each definition must be 1-3 sentences, factual, neutral, no marketing language. Match a short, sober, informative style.`;
  const user = `Generate exactly ${requestCount} ADDITIONAL unique whisky lexicon entries for category "${key}".

Topic / scope:
${topic}

Already covered (DO NOT repeat any of these — case-insensitive match on termEn or termDe):
EN: ${currentEnTerms.join(", ")}
DE: ${currentDeTerms.join(", ")}

Requirements:
- termEn: canonical English industry spelling.
- defEn: 1-3 sentence English definition.
- termDe: German equivalent (loanwords stay English, e.g. "Single Malt"; otherwise translate properly).
- defDe: 1-3 sentence German definition with the same factual content.
- Each entry MUST be unique and MUST NOT match the covered list above.
- No emojis or bullet points in definitions.

Return JSON shape: { "entries": [{ "termEn": "...", "defEn": "...", "termDe": "...", "defDe": "..." }, ...] }`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    temperature: 0.5,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error(`No content for ${key}`);
  const parsed = JSON.parse(content) as { entries?: GeneratedEntry[] };
  return parsed.entries ?? [];
}

function escapeStr(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

interface ExistingEntry { term: string; definition: string; }
interface ExistingCategory { key: string; entries: ExistingEntry[]; }

function entryLine(term: string, definition: string): string {
  return `      { term: "${escapeStr(term)}", definition: "${escapeStr(definition)}" },`;
}

function categoryBlock(key: string, entries: ExistingEntry[]): string {
  const lines = entries.map((e) => entryLine(e.term, e.definition)).join("\n");
  return `    { key: "${key}", entries: [\n${lines}\n    ]},`;
}

async function main(): Promise<void> {
  const modulePath = resolve(process.cwd(), "client/src/labs/data/lexiconData.ts");
  const moduleUrl = `${modulePath}?t=${Date.now()}`;
  const mod = await import(moduleUrl) as {
    lexiconData: Record<string, { key: string; entries: { term: string; definition: string }[] }[]>;
    categoryLabelsEn: Record<string, string>;
    categoryLabelsDe: Record<string, string>;
    categoryLabelMap: Record<string, Record<string, string>>;
  };

  const enCats = mod.lexiconData.en;
  const deCats = mod.lexiconData.de;

  const enByKey = new Map(enCats.map((c) => [c.key, c]));
  const deByKey = new Map(deCats.map((c) => [c.key, c]));

  console.log("Current counts:");
  for (const cat of enCats) {
    const dCat = deByKey.get(cat.key);
    const target = TARGETS_PER_CATEGORY[cat.key];
    console.log(`  ${cat.key}: en=${cat.entries.length}/${target?.en ?? "?"} de=${dCat?.entries.length ?? 0}/${target?.de ?? "?"}`);
  }
  console.log("");

  const tasks: Promise<{ key: string; entries: GeneratedEntry[] }>[] = [];
  for (const [key, target] of Object.entries(TARGETS_PER_CATEGORY)) {
    const enCat = enByKey.get(key);
    const deCat = deByKey.get(key);
    if (!enCat || !deCat) continue;
    const needed = Math.max(target.en - enCat.entries.length, target.de - deCat.entries.length);
    if (needed <= 0) continue;
    tasks.push((async () => {
      const start = Date.now();
      try {
        const entries = await topupCategory(
          key,
          enCat.entries.map((e) => e.term),
          deCat.entries.map((e) => e.term),
          target.en,
          target.de,
          target.topic,
        );
        console.log(`  ${key} top-up: +${entries.length} (${Date.now() - start}ms)`);
        return { key, entries };
      } catch (err) {
        console.error(`  ${key} top-up FAILED:`, err);
        return { key, entries: [] };
      }
    })());
  }

  if (tasks.length === 0) {
    console.log("All categories already meet target.");
    return;
  }

  const results = await Promise.all(tasks);
  console.log("");

  for (const { key, entries } of results) {
    const enCat = enByKey.get(key);
    const deCat = deByKey.get(key);
    if (!enCat || !deCat) continue;
    const enLower = new Set(enCat.entries.map((e) => e.term.toLowerCase()));
    const deLower = new Set(deCat.entries.map((e) => e.term.toLowerCase()));
    for (const e of entries) {
      if (!e || typeof e.termEn !== "string" || typeof e.termDe !== "string" || typeof e.defEn !== "string" || typeof e.defDe !== "string") continue;
      const enKey = e.termEn.trim().toLowerCase();
      const deKey = e.termDe.trim().toLowerCase();
      if (!enKey || !deKey) continue;
      if (enLower.has(enKey) || deLower.has(deKey)) continue;
      enLower.add(enKey);
      deLower.add(deKey);
      enCat.entries.push({ term: e.termEn.trim(), definition: e.defEn.trim() });
      deCat.entries.push({ term: e.termDe.trim(), definition: e.defDe.trim() });
    }
    enCat.entries.sort((a, b) => a.term.localeCompare(b.term));
    deCat.entries.sort((a, b) => a.term.localeCompare(b.term));
  }

  console.log("After top-up:");
  let totalEn = 0;
  let totalDe = 0;
  for (const cat of enCats) {
    const dCat = deByKey.get(cat.key);
    totalEn += cat.entries.length;
    totalDe += dCat?.entries.length ?? 0;
    console.log(`  ${cat.key}: en=${cat.entries.length} de=${dCat?.entries.length ?? 0}`);
  }
  console.log(`Totals: EN=${totalEn} DE=${totalDe}`);

  const allKeys = enCats.map((c) => c.key);
  const labelsEn = mod.categoryLabelsEn;
  const labelsDe = mod.categoryLabelsDe;
  const mapEn = mod.categoryLabelMap.en;
  const mapDe = mod.categoryLabelMap.de;

  const enBlocks = enCats.map((c) => categoryBlock(c.key, c.entries)).join("\n");
  const deBlocks = deCats.map((c) => categoryBlock(c.key, c.entries)).join("\n");
  const labelLine = (m: Record<string, string>): string =>
    allKeys.map((k) => `${k}: "${escapeStr(m[k] ?? k)}"`).join(", ");

  const file = `export interface LexiconEntry { term: string; definition: string; }
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
  writeFileSync(modulePath, file, "utf8");
  console.log(`\nWrote ${modulePath} (${file.length} bytes)`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});

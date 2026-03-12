export interface FlavorDescriptor {
  id: string;
  en: string;
  de: string;
  keywords: string[];
}

export interface FlavorCategory {
  id: string;
  en: string;
  de: string;
  color: string;
  subcategories: FlavorDescriptor[];
}

export const FLAVOR_CATEGORIES: FlavorCategory[] = [
  {
    id: "fruity", en: "Fruity", de: "Fruchtig", color: "#e07b4c",
    subcategories: [
      { id: "apple", en: "Apple", de: "Apfel", keywords: ["apple", "apfel"] },
      { id: "pear", en: "Pear", de: "Birne", keywords: ["pear", "birne"] },
      { id: "citrus", en: "Citrus", de: "Zitrus", keywords: ["citrus", "zitrus", "lemon", "orange", "lime"] },
      { id: "berry", en: "Berry", de: "Beere", keywords: ["berry", "beere", "strawberry", "raspberry"] },
      { id: "tropical", en: "Tropical", de: "Tropisch", keywords: ["tropical", "tropisch", "mango", "pineapple", "banana"] },
      { id: "dried-fruit", en: "Dried Fruit", de: "Trockenfrüchte", keywords: ["dried fruit", "raisin", "date", "fig"] },
    ],
  },
  {
    id: "floral", en: "Floral", de: "Blumig", color: "#c77dba",
    subcategories: [
      { id: "rose", en: "Rose", de: "Rose", keywords: ["rose"] },
      { id: "lavender", en: "Lavender", de: "Lavendel", keywords: ["lavender", "lavendel"] },
      { id: "heather", en: "Heather", de: "Heidekraut", keywords: ["heather", "heidekraut"] },
      { id: "elderflower", en: "Elderflower", de: "Holunderblüte", keywords: ["elderflower", "holunderblüte"] },
    ],
  },
  {
    id: "sweet", en: "Sweet", de: "Süß", color: "#d4a853",
    subcategories: [
      { id: "honey", en: "Honey", de: "Honig", keywords: ["honey", "honig"] },
      { id: "vanilla", en: "Vanilla", de: "Vanille", keywords: ["vanilla", "vanille"] },
      { id: "caramel", en: "Caramel", de: "Karamell", keywords: ["caramel", "karamell", "butterscotch"] },
      { id: "toffee", en: "Toffee", de: "Toffee", keywords: ["toffee", "fudge"] },
      { id: "chocolate", en: "Chocolate", de: "Schokolade", keywords: ["chocolate", "schokolade", "cocoa"] },
      { id: "marzipan", en: "Marzipan", de: "Marzipan", keywords: ["marzipan", "almond"] },
    ],
  },
  {
    id: "spicy", en: "Spicy", de: "Würzig", color: "#c04e3e",
    subcategories: [
      { id: "cinnamon", en: "Cinnamon", de: "Zimt", keywords: ["cinnamon", "zimt"] },
      { id: "pepper", en: "Pepper", de: "Pfeffer", keywords: ["pepper", "pfeffer"] },
      { id: "ginger", en: "Ginger", de: "Ingwer", keywords: ["ginger", "ingwer"] },
      { id: "clove", en: "Clove", de: "Nelke", keywords: ["clove", "nelke"] },
      { id: "nutmeg", en: "Nutmeg", de: "Muskatnuss", keywords: ["nutmeg", "muskatnuss"] },
    ],
  },
  {
    id: "woody", en: "Woody", de: "Holzig", color: "#8b6f47",
    subcategories: [
      { id: "oak", en: "Oak", de: "Eiche", keywords: ["oak", "eiche"] },
      { id: "cedar", en: "Cedar", de: "Zeder", keywords: ["cedar", "zeder"] },
      { id: "sandalwood", en: "Sandalwood", de: "Sandelholz", keywords: ["sandalwood", "sandelholz"] },
      { id: "pine", en: "Pine", de: "Kiefer", keywords: ["pine", "kiefer", "resin"] },
    ],
  },
  {
    id: "smoky", en: "Smoky", de: "Rauchig", color: "#6b7280",
    subcategories: [
      { id: "peat", en: "Peat", de: "Torf", keywords: ["peat", "torf"] },
      { id: "campfire", en: "Campfire", de: "Lagerfeuer", keywords: ["campfire", "lagerfeuer", "smoke"] },
      { id: "charcoal", en: "Charcoal", de: "Holzkohle", keywords: ["charcoal", "holzkohle"] },
      { id: "ash", en: "Ash", de: "Asche", keywords: ["ash", "asche"] },
      { id: "tar", en: "Tar", de: "Teer", keywords: ["tar", "teer"] },
    ],
  },
  {
    id: "malty", en: "Malty", de: "Malzig", color: "#b8934a",
    subcategories: [
      { id: "cereal", en: "Cereal", de: "Getreide", keywords: ["cereal", "getreide", "grain", "malt"] },
      { id: "biscuit", en: "Biscuit", de: "Keks", keywords: ["biscuit", "keks", "shortbread"] },
      { id: "bread", en: "Bread", de: "Brot", keywords: ["bread", "brot", "dough"] },
      { id: "toast", en: "Toast", de: "Toast", keywords: ["toast", "toasted"] },
    ],
  },
  {
    id: "maritime", en: "Maritime", de: "Maritim", color: "#4a90a4",
    subcategories: [
      { id: "sea-salt", en: "Sea Salt", de: "Meersalz", keywords: ["sea salt", "meersalz", "salt", "brine"] },
      { id: "iodine", en: "Iodine", de: "Jod", keywords: ["iodine", "jod", "medicinal"] },
      { id: "seaweed", en: "Seaweed", de: "Seetang", keywords: ["seaweed", "seetang", "kelp"] },
    ],
  },
  {
    id: "nutty", en: "Nutty", de: "Nussig", color: "#9b7653",
    subcategories: [
      { id: "walnut", en: "Walnut", de: "Walnuss", keywords: ["walnut", "walnuss"] },
      { id: "hazelnut", en: "Hazelnut", de: "Haselnuss", keywords: ["hazelnut", "haselnuss"] },
      { id: "coconut", en: "Coconut", de: "Kokosnuss", keywords: ["coconut", "kokosnuss"] },
      { id: "almond", en: "Almond", de: "Mandel", keywords: ["almond", "mandel"] },
    ],
  },
  {
    id: "herbal", en: "Herbal", de: "Kräuter", color: "#6b8e5a",
    subcategories: [
      { id: "mint", en: "Mint", de: "Minze", keywords: ["mint", "minze", "menthol"] },
      { id: "eucalyptus", en: "Eucalyptus", de: "Eukalyptus", keywords: ["eucalyptus", "eukalyptus"] },
      { id: "grass", en: "Grass", de: "Gras", keywords: ["grass", "gras", "hay", "heu"] },
      { id: "tea", en: "Tea", de: "Tee", keywords: ["tea", "tee"] },
    ],
  },
  {
    id: "earthy", en: "Earthy", de: "Erdig", color: "#7a6855",
    subcategories: [
      { id: "leather", en: "Leather", de: "Leder", keywords: ["leather", "leder"] },
      { id: "tobacco", en: "Tobacco", de: "Tabak", keywords: ["tobacco", "tabak"] },
      { id: "mushroom", en: "Mushroom", de: "Pilz", keywords: ["mushroom", "pilz"] },
      { id: "moss", en: "Moss", de: "Moos", keywords: ["moss", "moos"] },
    ],
  },
  {
    id: "creamy", en: "Creamy", de: "Cremig", color: "#d4b896",
    subcategories: [
      { id: "butter", en: "Butter", de: "Butter", keywords: ["butter", "buttery"] },
      { id: "cream", en: "Cream", de: "Sahne", keywords: ["cream", "sahne", "creamy"] },
      { id: "custard", en: "Custard", de: "Pudding", keywords: ["custard", "pudding"] },
      { id: "milk-choc", en: "Milk Chocolate", de: "Vollmilchschokolade", keywords: ["milk chocolate", "vollmilch"] },
    ],
  },
  {
    id: "mineral", en: "Mineral", de: "Mineralisch", color: "#8e99a4",
    subcategories: [
      { id: "flint", en: "Flint", de: "Feuerstein", keywords: ["flint", "feuerstein"] },
      { id: "chalk", en: "Chalk", de: "Kreide", keywords: ["chalk", "kreide"] },
      { id: "sulfur", en: "Sulfur", de: "Schwefel", keywords: ["sulfur", "schwefel", "sulphur"] },
      { id: "iron", en: "Iron", de: "Eisen", keywords: ["iron", "eisen", "metallic"] },
    ],
  },
];

export type FlavorProfileId =
  | "sherried-rich"
  | "bourbon-classic"
  | "peated-maritime"
  | "highland-elegant"
  | "speyside-fruity"
  | "island-coastal";

export interface FlavorProfileDef {
  id: FlavorProfileId;
  en: string;
  de: string;
  priorityCategories: string[];
}

export const FLAVOR_PROFILES: FlavorProfileDef[] = [
  {
    id: "sherried-rich",
    en: "Sherried & Rich",
    de: "Sherried & Reichhaltig",
    priorityCategories: ["sweet", "fruity", "spicy", "nutty", "woody", "creamy"],
  },
  {
    id: "bourbon-classic",
    en: "Bourbon & Classic",
    de: "Bourbon & Klassisch",
    priorityCategories: ["sweet", "woody", "malty", "creamy", "spicy", "nutty"],
  },
  {
    id: "peated-maritime",
    en: "Peated & Maritime",
    de: "Torfig & Maritim",
    priorityCategories: ["smoky", "maritime", "earthy", "spicy", "mineral", "herbal"],
  },
  {
    id: "highland-elegant",
    en: "Highland & Elegant",
    de: "Highland & Elegant",
    priorityCategories: ["floral", "herbal", "sweet", "fruity", "woody", "malty"],
  },
  {
    id: "speyside-fruity",
    en: "Speyside & Fruity",
    de: "Speyside & Fruchtig",
    priorityCategories: ["fruity", "floral", "sweet", "malty", "creamy", "herbal"],
  },
  {
    id: "island-coastal",
    en: "Island & Coastal",
    de: "Insel & Küste",
    priorityCategories: ["maritime", "smoky", "herbal", "mineral", "earthy", "spicy"],
  },
];

export function detectFlavorProfile(whisky: {
  region?: string | null;
  peatLevel?: string | null;
  caskInfluence?: string | null;
}): FlavorProfileId | null {
  const region = (whisky.region || "").toLowerCase();
  const peat = (whisky.peatLevel || "").toLowerCase();
  const cask = (whisky.caskInfluence || "").toLowerCase();

  if (peat === "heavy" || peat === "medium") return "peated-maritime";
  if (cask.includes("sherry") || cask.includes("port") || cask.includes("wine") || cask.includes("oloroso") || cask.includes("pedro")) return "sherried-rich";
  if (cask.includes("bourbon") || cask.includes("american oak")) return "bourbon-classic";
  if (region.includes("islay") || region.includes("island") || region.includes("campbeltown")) return "island-coastal";
  if (region.includes("speyside") || region.includes("lowland")) return "speyside-fruity";
  if (region.includes("highland") || region.includes("japan")) return "highland-elegant";

  return null;
}

export function getSortedCategories(profileId: string | null): FlavorCategory[] {
  if (!profileId) return FLAVOR_CATEGORIES;
  const profile = FLAVOR_PROFILES.find((p) => p.id === profileId);
  if (!profile) return FLAVOR_CATEGORIES;

  const prioritySet = new Set(profile.priorityCategories);
  const priority = profile.priorityCategories
    .map((id) => FLAVOR_CATEGORIES.find((c) => c.id === id))
    .filter(Boolean) as FlavorCategory[];
  const rest = FLAVOR_CATEGORIES.filter((c) => !prioritySet.has(c.id));
  return [...priority, ...rest];
}

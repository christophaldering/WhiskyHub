import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { journalApi, ratingNotesApi } from "@/lib/api";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CircleDot, X } from "lucide-react";
import { GuestPreview } from "@/components/guest-preview";
import { useState, useMemo } from "react";

interface FlavorCategory {
  id: string;
  en: string;
  de: string;
  color: string;
  subcategories: { id: string; en: string; de: string; keywords: string[] }[];
}

const FLAVOR_WHEEL_DATA: FlavorCategory[] = [
  {
    id: "fruity",
    en: "Fruity",
    de: "Fruchtig",
    color: "#e07b4c",
    subcategories: [
      { id: "apple", en: "Apple", de: "Apfel", keywords: ["apple", "apfel", "green apple", "grüner apfel"] },
      { id: "pear", en: "Pear", de: "Birne", keywords: ["pear", "birne"] },
      { id: "citrus", en: "Citrus", de: "Zitrus", keywords: ["citrus", "zitrus", "lemon", "zitrone", "orange", "lime", "limette", "grapefruit"] },
      { id: "berry", en: "Berry", de: "Beere", keywords: ["berry", "beere", "berries", "beeren", "strawberry", "erdbeere", "raspberry", "himbeere", "blackberry", "brombeere", "blueberry", "heidelbeere"] },
      { id: "tropical", en: "Tropical", de: "Tropisch", keywords: ["tropical", "tropisch", "mango", "pineapple", "ananas", "banana", "banane", "coconut", "kokosnuss", "passion fruit", "maracuja"] },
      { id: "dried-fruit", en: "Dried Fruit", de: "Trockenfrüchte", keywords: ["dried fruit", "trockenfrüchte", "raisin", "rosine", "date", "dattel", "fig", "feige", "prune", "pflaume", "sultana"] },
    ],
  },
  {
    id: "floral",
    en: "Floral",
    de: "Blumig",
    color: "#c77dba",
    subcategories: [
      { id: "rose", en: "Rose", de: "Rose", keywords: ["rose"] },
      { id: "lavender", en: "Lavender", de: "Lavendel", keywords: ["lavender", "lavendel"] },
      { id: "heather", en: "Heather", de: "Heidekraut", keywords: ["heather", "heidekraut", "heide"] },
      { id: "elderflower", en: "Elderflower", de: "Holunderblüte", keywords: ["elderflower", "holunderblüte", "holunder"] },
    ],
  },
  {
    id: "sweet",
    en: "Sweet",
    de: "Süß",
    color: "#d4a853",
    subcategories: [
      { id: "honey", en: "Honey", de: "Honig", keywords: ["honey", "honig"] },
      { id: "vanilla", en: "Vanilla", de: "Vanille", keywords: ["vanilla", "vanille"] },
      { id: "caramel", en: "Caramel", de: "Karamell", keywords: ["caramel", "karamell", "butterscotch"] },
      { id: "toffee", en: "Toffee", de: "Toffee", keywords: ["toffee", "fudge"] },
      { id: "chocolate", en: "Chocolate", de: "Schokolade", keywords: ["chocolate", "schokolade", "cocoa", "kakao"] },
      { id: "marzipan", en: "Marzipan", de: "Marzipan", keywords: ["marzipan", "almond", "mandel"] },
    ],
  },
  {
    id: "spicy",
    en: "Spicy",
    de: "Würzig",
    color: "#c04e3e",
    subcategories: [
      { id: "cinnamon", en: "Cinnamon", de: "Zimt", keywords: ["cinnamon", "zimt"] },
      { id: "pepper", en: "Pepper", de: "Pfeffer", keywords: ["pepper", "pfeffer", "black pepper", "schwarzer pfeffer"] },
      { id: "ginger", en: "Ginger", de: "Ingwer", keywords: ["ginger", "ingwer"] },
      { id: "clove", en: "Clove", de: "Nelke", keywords: ["clove", "nelke", "gewürznelke"] },
      { id: "nutmeg", en: "Nutmeg", de: "Muskatnuss", keywords: ["nutmeg", "muskatnuss", "muskat"] },
    ],
  },
  {
    id: "woody",
    en: "Woody",
    de: "Holzig",
    color: "#8b6f47",
    subcategories: [
      { id: "oak", en: "Oak", de: "Eiche", keywords: ["oak", "eiche", "eichenholz"] },
      { id: "cedar", en: "Cedar", de: "Zeder", keywords: ["cedar", "zeder", "zedernholz"] },
      { id: "sandalwood", en: "Sandalwood", de: "Sandelholz", keywords: ["sandalwood", "sandelholz"] },
      { id: "pine", en: "Pine", de: "Kiefer", keywords: ["pine", "kiefer", "resin", "harz"] },
    ],
  },
  {
    id: "smoky",
    en: "Smoky",
    de: "Rauchig",
    color: "#6b7280",
    subcategories: [
      { id: "peat", en: "Peat", de: "Torf", keywords: ["peat", "torf", "peaty", "torfig"] },
      { id: "campfire", en: "Campfire", de: "Lagerfeuer", keywords: ["campfire", "lagerfeuer", "bonfire", "smoke", "rauch"] },
      { id: "charcoal", en: "Charcoal", de: "Holzkohle", keywords: ["charcoal", "holzkohle"] },
      { id: "ash", en: "Ash", de: "Asche", keywords: ["ash", "asche"] },
      { id: "tar", en: "Tar", de: "Teer", keywords: ["tar", "teer"] },
    ],
  },
  {
    id: "malty",
    en: "Malty",
    de: "Malzig",
    color: "#b8934a",
    subcategories: [
      { id: "cereal", en: "Cereal", de: "Getreide", keywords: ["cereal", "getreide", "grain", "korn", "barley", "gerste", "malt", "malz"] },
      { id: "biscuit", en: "Biscuit", de: "Keks", keywords: ["biscuit", "keks", "cookie", "shortbread"] },
      { id: "bread", en: "Bread", de: "Brot", keywords: ["bread", "brot", "dough", "teig"] },
      { id: "toast", en: "Toast", de: "Toast", keywords: ["toast", "toasted", "geröstet"] },
    ],
  },
  {
    id: "maritime",
    en: "Maritime",
    de: "Maritim",
    color: "#4a90a4",
    subcategories: [
      { id: "sea-salt", en: "Sea Salt", de: "Meersalz", keywords: ["sea salt", "meersalz", "salt", "salz", "salty", "salzig", "brine", "brackish"] },
      { id: "brine", en: "Brine", de: "Salzlake", keywords: ["brine", "salzlake", "briny"] },
      { id: "iodine", en: "Iodine", de: "Jod", keywords: ["iodine", "jod", "medicinal", "medizinisch"] },
      { id: "seaweed", en: "Seaweed", de: "Seetang", keywords: ["seaweed", "seetang", "kelp", "algae", "algen"] },
    ],
  },
];

interface JournalEntry {
  id: string;
  noseNotes?: string | null;
  tasteNotes?: string | null;
  finishNotes?: string | null;
  body?: string | null;
}

function computeFlavorFrequencies(entries: JournalEntry[], isDE: boolean) {
  const allText = entries
    .map((e) => [e.noseNotes, e.tasteNotes, e.finishNotes, e.body].filter(Boolean).join(" "))
    .join(" ")
    .toLowerCase();

  const categoryFreqs: Record<string, number> = {};
  const subFreqs: Record<string, Record<string, number>> = {};

  for (const cat of FLAVOR_WHEEL_DATA) {
    categoryFreqs[cat.id] = 0;
    subFreqs[cat.id] = {};
    for (const sub of cat.subcategories) {
      let count = 0;
      for (const kw of sub.keywords) {
        const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "gi");
        const matches = allText.match(regex);
        if (matches) count += matches.length;
      }
      subFreqs[cat.id][sub.id] = count;
      categoryFreqs[cat.id] += count;
    }
  }

  return { categoryFreqs, subFreqs };
}

export function FlavorWheelContent() {
  const { t, i18n } = useTranslation();
  const { currentParticipant } = useAppStore();
  const isDE = i18n.language === "de";
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: journalEntries, isLoading } = useQuery<JournalEntry[]>({
    queryKey: ["journal", currentParticipant?.id],
    queryFn: () => journalApi.getAll(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const { data: ratingNotes } = useQuery<Array<{ id: string; notes: string | null }>>({
    queryKey: ["rating-notes", currentParticipant?.id],
    queryFn: () => ratingNotesApi.get(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const { categoryFreqs, subFreqs, totalMentions, topCategory, mostUniqueFlavor, innerData, outerData } = useMemo(() => {
    const combinedEntries = [
      ...(journalEntries || []),
      ...(ratingNotes || []).map(r => ({
        id: r.id,
        noseNotes: null,
        tasteNotes: null,
        finishNotes: null,
        body: r.notes,
      })),
    ];

    if (combinedEntries.length === 0) {
      return { categoryFreqs: {}, subFreqs: {}, totalMentions: 0, topCategory: null, mostUniqueFlavor: null, innerData: [], outerData: [] };
    }

    const { categoryFreqs, subFreqs } = computeFlavorFrequencies(combinedEntries, isDE);
    const totalMentions = Object.values(categoryFreqs).reduce((s, v) => s + v, 0);

    let topCategory: FlavorCategory | null = null;
    let topCount = 0;
    for (const cat of FLAVOR_WHEEL_DATA) {
      if (categoryFreqs[cat.id] > topCount) {
        topCount = categoryFreqs[cat.id];
        topCategory = cat;
      }
    }

    let mostUniqueFlavor: { cat: FlavorCategory; sub: { en: string; de: string }; count: number } | null = null;
    let minCount = Infinity;
    for (const cat of FLAVOR_WHEEL_DATA) {
      for (const sub of cat.subcategories) {
        const c = subFreqs[cat.id][sub.id];
        if (c > 0 && c < minCount) {
          minCount = c;
          mostUniqueFlavor = { cat, sub, count: c };
        }
      }
    }

    const innerData = FLAVOR_WHEEL_DATA.map((cat) => ({
      name: isDE ? cat.de : cat.en,
      value: Math.max(categoryFreqs[cat.id], 1),
      actualValue: categoryFreqs[cat.id],
      color: cat.color,
      id: cat.id,
    }));

    const outerData: { name: string; value: number; actualValue: number; color: string; catId: string; subId: string }[] = [];
    for (const cat of FLAVOR_WHEEL_DATA) {
      for (const sub of cat.subcategories) {
        outerData.push({
          name: isDE ? sub.de : sub.en,
          value: Math.max(subFreqs[cat.id][sub.id], 0.3),
          actualValue: subFreqs[cat.id][sub.id],
          color: cat.color,
          catId: cat.id,
          subId: sub.id,
        });
      }
    }

    return { categoryFreqs, subFreqs, totalMentions, topCategory, mostUniqueFlavor, innerData, outerData };
  }, [journalEntries, ratingNotes, isDE]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-card/50 rounded animate-pulse" />
        <div className="h-64 bg-card/50 rounded-lg animate-pulse" />
      </div>
    );
  }

  const hasData = totalMentions > 0;
  const selectedCatData = selectedCategory ? FLAVOR_WHEEL_DATA.find((c) => c.id === selectedCategory) : null;

  return (
    <div className="space-y-8" data-testid="flavor-wheel-embedded">
      <p className="text-sm text-muted-foreground">{t("flavorWheel.subtitle")}</p>
      <p className="text-xs text-muted-foreground" data-testid="text-flavor-wheel-source-count">
        {t("flavorWheel.sourceCount", { journals: journalEntries?.length || 0, ratings: ratingNotes?.length || 0 })}
      </p>

      {!hasData ? (
        <div className="text-center py-16 text-muted-foreground">
          <CircleDot className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-serif">{t("flavorWheel.empty")}</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card rounded-lg border border-border/40 p-4 text-center" data-testid="stat-total-mentions">
              <p className="text-2xl font-serif font-bold text-primary">{totalMentions}</p>
              <p className="text-xs text-muted-foreground">{t("flavorWheel.totalMentions")}</p>
            </div>
            <div className="bg-card rounded-lg border border-border/40 p-4 text-center" data-testid="stat-top-category">
              <p className="text-2xl font-serif font-bold" style={{ color: topCategory?.color }}>
                {topCategory ? (isDE ? topCategory.de : topCategory.en) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">{t("flavorWheel.topCategory")}</p>
            </div>
            <div className="bg-card rounded-lg border border-border/40 p-4 text-center" data-testid="stat-unique-flavor">
              <p className="text-2xl font-serif font-bold text-primary/80">
                {mostUniqueFlavor ? (isDE ? mostUniqueFlavor.sub.de : mostUniqueFlavor.sub.en) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">{t("flavorWheel.mostUnique")}</p>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border/40 p-6">
            <h2 className="text-lg font-serif font-semibold mb-1 text-foreground">{t("flavorWheel.wheelTitle")}</h2>
            <p className="text-xs text-muted-foreground mb-1">{t("flavorWheel.wheelSubtitle")}</p>
            <p className="text-xs text-muted-foreground/70 mb-4" data-testid="text-wheel-desc">{t("flavorWheel.wheelDesc")}</p>
            <div className="h-[420px] md:h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={innerData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="25%" outerRadius="42%" paddingAngle={2} stroke="hsl(var(--background))" strokeWidth={2} onClick={(entry) => setSelectedCategory(entry.id === selectedCategory ? null : entry.id)} style={{ cursor: "pointer" }}>
                    {innerData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} opacity={selectedCategory === null || selectedCategory === entry.id ? 1 : 0.25} className="transition-opacity duration-300" />
                    ))}
                  </Pie>
                  <Pie data={outerData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="44%" outerRadius="72%" paddingAngle={1} stroke="hsl(var(--background))" strokeWidth={1} onClick={(entry) => setSelectedCategory(entry.catId === selectedCategory ? null : entry.catId)} style={{ cursor: "pointer" }}>
                    {outerData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} opacity={selectedCategory === null ? (entry.actualValue > 0 ? 0.85 : 0.2) : selectedCategory === entry.catId ? (entry.actualValue > 0 ? 1 : 0.4) : 0.1} className="transition-opacity duration-300" />
                    ))}
                  </Pie>
                  <Tooltip content={({ payload }) => {
                    if (!payload || payload.length === 0) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
                        <p className="text-sm font-serif font-semibold text-foreground">{data.name}</p>
                        <p className="text-xs text-muted-foreground">{data.actualValue} {t("flavorWheel.mentions")}</p>
                      </div>
                    );
                  }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {FLAVOR_WHEEL_DATA.map((cat) => (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedCategory === cat.id ? "ring-2 ring-primary/60 bg-card shadow-sm" : "bg-card/50 hover:bg-card"}`} data-testid={`legend-${cat.id}`}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-foreground">{isDE ? cat.de : cat.en}</span>
                  <span className="text-muted-foreground">({categoryFreqs[cat.id] || 0})</span>
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {selectedCatData && (
              <motion.div key={selectedCatData.id} className="bg-card rounded-lg border border-border/40 p-6" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} data-testid={`detail-${selectedCatData.id}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedCatData.color }} />
                    <h2 className="text-lg font-serif font-semibold text-foreground">{isDE ? selectedCatData.de : selectedCatData.en}</h2>
                    <span className="text-sm text-muted-foreground ml-1">({categoryFreqs[selectedCatData.id]} {t("flavorWheel.mentions")})</span>
                  </div>
                  <button onClick={() => setSelectedCategory(null)} className="p-1 rounded-md hover:bg-secondary/50 text-muted-foreground" data-testid="button-close-detail">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedCatData.subcategories.map((sub) => {
                    const count = subFreqs[selectedCatData.id]?.[sub.id] || 0;
                    const maxInCat = Math.max(...selectedCatData.subcategories.map((s) => subFreqs[selectedCatData.id]?.[s.id] || 0), 1);
                    return (
                      <div key={sub.id} className="relative overflow-hidden rounded-lg border border-border/30 p-3" data-testid={`sub-${sub.id}`}>
                        <div className="absolute inset-0 opacity-15" style={{ backgroundColor: selectedCatData.color, width: `${(count / maxInCat) * 100}%` }} />
                        <div className="relative flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">{isDE ? sub.de : sub.en}</span>
                          <span className="text-sm font-serif font-bold" style={{ color: count > 0 ? selectedCatData.color : "hsl(var(--muted-foreground))" }}>{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default function FlavorWheel() {
  const { t, i18n } = useTranslation();
  const { currentParticipant } = useAppStore();
  const isDE = i18n.language === "de";
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: journalEntries, isLoading } = useQuery<JournalEntry[]>({
    queryKey: ["journal", currentParticipant?.id],
    queryFn: () => journalApi.getAll(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const { data: ratingNotes } = useQuery<Array<{ id: string; notes: string | null }>>({
    queryKey: ["rating-notes", currentParticipant?.id],
    queryFn: () => ratingNotesApi.get(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const { categoryFreqs, subFreqs, totalMentions, topCategory, mostUniqueFlavor, innerData, outerData } = useMemo(() => {
    const combinedEntries = [
      ...(journalEntries || []),
      ...(ratingNotes || []).map(r => ({
        id: r.id,
        noseNotes: null,
        tasteNotes: null,
        finishNotes: null,
        body: r.notes,
      })),
    ];

    if (combinedEntries.length === 0) {
      return { categoryFreqs: {}, subFreqs: {}, totalMentions: 0, topCategory: null, mostUniqueFlavor: null, innerData: [], outerData: [] };
    }

    const { categoryFreqs, subFreqs } = computeFlavorFrequencies(combinedEntries, isDE);
    const totalMentions = Object.values(categoryFreqs).reduce((s, v) => s + v, 0);

    let topCategory: FlavorCategory | null = null;
    let topCount = 0;
    for (const cat of FLAVOR_WHEEL_DATA) {
      if (categoryFreqs[cat.id] > topCount) {
        topCount = categoryFreqs[cat.id];
        topCategory = cat;
      }
    }

    let mostUniqueFlavor: { cat: FlavorCategory; sub: { en: string; de: string }; count: number } | null = null;
    let minCount = Infinity;
    for (const cat of FLAVOR_WHEEL_DATA) {
      for (const sub of cat.subcategories) {
        const c = subFreqs[cat.id][sub.id];
        if (c > 0 && c < minCount) {
          minCount = c;
          mostUniqueFlavor = { cat, sub, count: c };
        }
      }
    }

    const innerData = FLAVOR_WHEEL_DATA.map((cat) => ({
      name: isDE ? cat.de : cat.en,
      value: Math.max(categoryFreqs[cat.id], 1),
      actualValue: categoryFreqs[cat.id],
      color: cat.color,
      id: cat.id,
    }));

    const outerData: { name: string; value: number; actualValue: number; color: string; catId: string; subId: string }[] = [];
    for (const cat of FLAVOR_WHEEL_DATA) {
      for (const sub of cat.subcategories) {
        outerData.push({
          name: isDE ? sub.de : sub.en,
          value: Math.max(subFreqs[cat.id][sub.id], 0.3),
          actualValue: subFreqs[cat.id][sub.id],
          color: cat.color,
          catId: cat.id,
          subId: sub.id,
        });
      }
    }

    return { categoryFreqs, subFreqs, totalMentions, topCategory, mostUniqueFlavor, innerData, outerData };
  }, [journalEntries, ratingNotes, isDE]);

  if (!currentParticipant) {
    return (
      <GuestPreview featureTitle={t("flavorWheel.title")} featureDescription={t("guestPreview.flavorWheel")}>
        <div className="space-y-4">
          <h1 className="text-2xl font-serif font-bold">{t("flavorWheel.title")}</h1>
          <div className="bg-card rounded-xl border p-6 flex items-center justify-center" style={{height: 350}}>
            <div className="w-64 h-64 rounded-full border-4 border-primary/20 flex items-center justify-center relative">
              <div className="w-44 h-44 rounded-full border-2 border-primary/30 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center font-serif text-primary font-semibold">Aroma</div>
              </div>
              {["Fruity","Floral","Peaty","Spicy","Sweet","Woody"].map((label, i) => (
                <span key={label} className="absolute text-xs text-muted-foreground font-medium" style={{top: `${50 - 45 * Math.cos(i * Math.PI / 3)}%`, left: `${50 + 45 * Math.sin(i * Math.PI / 3)}%`, transform: "translate(-50%, -50%)"}}>{label}</span>
              ))}
            </div>
          </div>
        </div>
      </GuestPreview>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="h-8 w-48 bg-card/50 rounded animate-pulse mb-4" />
        <div className="h-64 bg-card/50 rounded-lg animate-pulse" />
      </div>
    );
  }

  const hasData = totalMentions > 0;

  const selectedCatData = selectedCategory ? FLAVOR_WHEEL_DATA.find((c) => c.id === selectedCategory) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 min-w-0 overflow-x-hidden" data-testid="flavor-wheel-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3 mb-2">
          <CircleDot className="w-7 h-7 text-primary" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-flavor-wheel-title">
            {t("flavorWheel.title")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-2">{t("flavorWheel.subtitle")}</p>
        <p className="text-xs text-muted-foreground mb-8" data-testid="text-flavor-wheel-source-count">
          {t("flavorWheel.sourceCount", { journals: journalEntries?.length || 0, ratings: ratingNotes?.length || 0 })}
        </p>

        {!hasData ? (
          <div className="text-center py-16 text-muted-foreground">
            <CircleDot className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-serif">{t("flavorWheel.empty")}</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <motion.div
                className="bg-card rounded-lg border border-border/40 p-4 text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                data-testid="stat-total-mentions"
              >
                <p className="text-2xl font-serif font-bold text-primary">{totalMentions}</p>
                <p className="text-xs text-muted-foreground">{t("flavorWheel.totalMentions")}</p>
              </motion.div>
              <motion.div
                className="bg-card rounded-lg border border-border/40 p-4 text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                data-testid="stat-top-category"
              >
                <p className="text-2xl font-serif font-bold" style={{ color: topCategory?.color }}>
                  {topCategory ? (isDE ? topCategory.de : topCategory.en) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">{t("flavorWheel.topCategory")}</p>
              </motion.div>
              <motion.div
                className="bg-card rounded-lg border border-border/40 p-4 text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                data-testid="stat-unique-flavor"
              >
                <p className="text-2xl font-serif font-bold text-primary/80">
                  {mostUniqueFlavor ? (isDE ? mostUniqueFlavor.sub.de : mostUniqueFlavor.sub.en) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">{t("flavorWheel.mostUnique")}</p>
              </motion.div>
            </div>

            <motion.div
              className="bg-card rounded-lg border border-border/40 p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-lg font-serif font-semibold mb-1 text-foreground">{t("flavorWheel.wheelTitle")}</h2>
              <p className="text-xs text-muted-foreground mb-1">{t("flavorWheel.wheelSubtitle")}</p>
              <p className="text-xs text-muted-foreground/70 mb-4" data-testid="text-wheel-desc">{t("flavorWheel.wheelDesc")}</p>
              <div className="h-[420px] md:h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={innerData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius="25%"
                      outerRadius="42%"
                      paddingAngle={2}
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                      onClick={(entry) => {
                        setSelectedCategory(entry.id === selectedCategory ? null : entry.id);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      {innerData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.color}
                          opacity={selectedCategory === null || selectedCategory === entry.id ? 1 : 0.25}
                          className="transition-opacity duration-300"
                        />
                      ))}
                    </Pie>
                    <Pie
                      data={outerData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius="44%"
                      outerRadius="72%"
                      paddingAngle={1}
                      stroke="hsl(var(--background))"
                      strokeWidth={1}
                      onClick={(entry) => {
                        setSelectedCategory(entry.catId === selectedCategory ? null : entry.catId);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      {outerData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.color}
                          opacity={
                            selectedCategory === null
                              ? entry.actualValue > 0
                                ? 0.85
                                : 0.2
                              : selectedCategory === entry.catId
                              ? entry.actualValue > 0
                                ? 1
                                : 0.4
                              : 0.1
                          }
                          className="transition-opacity duration-300"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ payload }) => {
                        if (!payload || payload.length === 0) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
                            <p className="text-sm font-serif font-semibold text-foreground">{data.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {data.actualValue} {t("flavorWheel.mentions")}
                            </p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {FLAVOR_WHEEL_DATA.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedCategory === cat.id
                        ? "ring-2 ring-primary/60 bg-card shadow-sm"
                        : "bg-card/50 hover:bg-card"
                    }`}
                    data-testid={`legend-${cat.id}`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-foreground">{isDE ? cat.de : cat.en}</span>
                    <span className="text-muted-foreground">({categoryFreqs[cat.id] || 0})</span>
                  </button>
                ))}
              </div>
            </motion.div>

            <AnimatePresence mode="wait">
              {selectedCatData && (
                <motion.div
                  key={selectedCatData.id}
                  className="bg-card rounded-lg border border-border/40 p-6"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  data-testid={`detail-${selectedCatData.id}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedCatData.color }} />
                      <h2 className="text-lg font-serif font-semibold text-foreground">
                        {isDE ? selectedCatData.de : selectedCatData.en}
                      </h2>
                      <span className="text-sm text-muted-foreground ml-1">
                        ({categoryFreqs[selectedCatData.id]} {t("flavorWheel.mentions")})
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="p-1 rounded-md hover:bg-secondary/50 text-muted-foreground"
                      data-testid="button-close-detail"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedCatData.subcategories.map((sub) => {
                      const count = subFreqs[selectedCatData.id]?.[sub.id] || 0;
                      const maxInCat = Math.max(
                        ...selectedCatData.subcategories.map((s) => subFreqs[selectedCatData.id]?.[s.id] || 0),
                        1
                      );
                      return (
                        <motion.div
                          key={sub.id}
                          className="relative overflow-hidden rounded-lg border border-border/30 p-3"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          data-testid={`sub-${sub.id}`}
                        >
                          <div
                            className="absolute inset-0 opacity-15"
                            style={{
                              backgroundColor: selectedCatData.color,
                              width: `${(count / maxInCat) * 100}%`,
                            }}
                          />
                          <div className="relative flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">{isDE ? sub.de : sub.en}</span>
                            <span className="text-sm font-serif font-bold" style={{ color: count > 0 ? selectedCatData.color : "hsl(var(--muted-foreground))" }}>
                              {count}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { journalApi, ratingNotesApi } from "@/lib/api";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CircleDot, X } from "lucide-react";
import SimpleShell from "@/components/simple/simple-shell";
import { c, cardStyle } from "@/lib/theme";

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

function computeFlavorFrequencies(entries: JournalEntry[]) {
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

const tooltipStyle: React.CSSProperties = {
  background: c.card,
  border: `1px solid ${c.border}`,
  borderRadius: 10,
  padding: "6px 12px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
};

export default function MyTasteWheel() {
  const { currentParticipant } = useAppStore();
  const pid = currentParticipant?.id;
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: journalEntries, isLoading: jLoading } = useQuery<JournalEntry[]>({
    queryKey: ["journal", pid],
    queryFn: () => journalApi.getAll(pid!),
    enabled: !!pid,
  });

  const { data: ratingNotes, isLoading: rLoading } = useQuery<Array<{ id: string; notes: string | null }>>({
    queryKey: ["rating-notes", pid],
    queryFn: () => ratingNotesApi.get(pid!),
    enabled: !!pid,
  });

  const isLoading = jLoading || rLoading;

  const { categoryFreqs, subFreqs, totalMentions, topCategory, mostUniqueFlavor, innerData, outerData } = useMemo(() => {
    const combinedEntries: JournalEntry[] = [
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
      return { categoryFreqs: {} as Record<string, number>, subFreqs: {} as Record<string, Record<string, number>>, totalMentions: 0, topCategory: null as FlavorCategory | null, mostUniqueFlavor: null as { cat: FlavorCategory; sub: { en: string; de: string }; count: number } | null, innerData: [] as any[], outerData: [] as any[] };
    }

    const { categoryFreqs, subFreqs } = computeFlavorFrequencies(combinedEntries);
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
        const cnt = subFreqs[cat.id][sub.id];
        if (cnt > 0 && cnt < minCount) {
          minCount = cnt;
          mostUniqueFlavor = { cat, sub, count: cnt };
        }
      }
    }

    const innerData = FLAVOR_WHEEL_DATA.map((cat) => ({
      name: cat.en,
      value: Math.max(categoryFreqs[cat.id], 1),
      actualValue: categoryFreqs[cat.id],
      color: cat.color,
      id: cat.id,
    }));

    const outerData: { name: string; value: number; actualValue: number; color: string; catId: string; subId: string }[] = [];
    for (const cat of FLAVOR_WHEEL_DATA) {
      for (const sub of cat.subcategories) {
        outerData.push({
          name: sub.en,
          value: Math.max(subFreqs[cat.id][sub.id], 0.3),
          actualValue: subFreqs[cat.id][sub.id],
          color: cat.color,
          catId: cat.id,
          subId: sub.id,
        });
      }
    }

    return { categoryFreqs, subFreqs, totalMentions, topCategory, mostUniqueFlavor, innerData, outerData };
  }, [journalEntries, ratingNotes]);

  const hasData = totalMentions > 0;
  const selectedCatData = selectedCategory ? FLAVOR_WHEEL_DATA.find((cat) => cat.id === selectedCategory) : null;

  const statBox: React.CSSProperties = {
    ...cardStyle,
    padding: "14px 12px",
    textAlign: "center",
    flex: 1,
    minWidth: 0,
  };

  return (
    <SimpleShell>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 4 }}>
            <CircleDot style={{ width: 22, height: 22, color: c.accent }} />
            <h1
              style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 700, color: c.accent, margin: 0 }}
              data-testid="text-wheel-title"
            >
              Aroma Wheel
            </h1>
          </div>
          <p style={{ fontSize: 13, color: c.muted, textAlign: "center", margin: 0 }}>
            Interactive visualization of your sensory history
          </p>
        </div>

        {!pid && (
          <div style={{ ...cardStyle, textAlign: "center", padding: 32 }}>
            <CircleDot style={{ width: 40, height: 40, color: c.mutedLight, margin: "0 auto 12px", opacity: 0.3 }} />
            <p style={{ fontSize: 14, color: c.muted, margin: 0 }}>Sign in to see your aroma wheel.</p>
          </div>
        )}

        {pid && isLoading && (
          <div style={{ ...cardStyle, padding: 32, textAlign: "center" }}>
            <p style={{ fontSize: 13, color: c.muted, margin: 0 }}>Loading…</p>
          </div>
        )}

        {pid && !isLoading && (
          <>
            <p style={{ fontSize: 12, color: c.mutedLight, textAlign: "center", margin: 0 }} data-testid="text-wheel-source-count">
              Based on {journalEntries?.length || 0} journal entries and {ratingNotes?.length || 0} tasting notes
            </p>

            {!hasData ? (
              <div style={{ ...cardStyle, textAlign: "center", padding: 32 }}>
                <CircleDot style={{ width: 40, height: 40, color: c.mutedLight, margin: "0 auto 12px", opacity: 0.3 }} />
                <p style={{ fontSize: 14, color: c.muted, margin: 0, fontFamily: "'Playfair Display', serif" }}>
                  No flavor data yet — log some whiskies to build your wheel.
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={statBox} data-testid="stat-total-mentions">
                    <div style={{ fontSize: 22, fontWeight: 700, color: c.accent, fontFamily: "'Playfair Display', serif" }}>{totalMentions}</div>
                    <div style={{ fontSize: 10, color: c.muted, marginTop: 2 }}>Total Mentions</div>
                  </div>
                  <div style={statBox} data-testid="stat-top-category">
                    <div style={{ fontSize: 22, fontWeight: 700, color: topCategory?.color || c.accent, fontFamily: "'Playfair Display', serif" }}>
                      {topCategory ? topCategory.en : "—"}
                    </div>
                    <div style={{ fontSize: 10, color: c.muted, marginTop: 2 }}>Top Category</div>
                  </div>
                  <div style={statBox} data-testid="stat-unique-flavor">
                    <div style={{ fontSize: 22, fontWeight: 700, color: c.accent, fontFamily: "'Playfair Display', serif", opacity: 0.8 }}>
                      {mostUniqueFlavor ? mostUniqueFlavor.sub.en : "—"}
                    </div>
                    <div style={{ fontSize: 10, color: c.muted, marginTop: 2 }}>Most Unique</div>
                  </div>
                </div>

                <div style={{ ...cardStyle, padding: "20px 12px" }}>
                  <h2 style={{ fontSize: 15, fontWeight: 600, color: c.text, margin: "0 0 2px", fontFamily: "'Playfair Display', serif" }}>
                    Your Aroma Wheel
                  </h2>
                  <p style={{ fontSize: 11, color: c.muted, margin: "0 0 4px" }}>Tap a segment to explore subcategories</p>
                  <div style={{ width: "100%", height: 380 }}>
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
                          stroke={c.bg}
                          strokeWidth={2}
                          onClick={(entry: any) => setSelectedCategory(entry.id === selectedCategory ? null : entry.id)}
                          style={{ cursor: "pointer" }}
                        >
                          {innerData.map((entry: any, i: number) => (
                            <Cell
                              key={i}
                              fill={entry.color}
                              opacity={selectedCategory === null || selectedCategory === entry.id ? 1 : 0.25}
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
                          stroke={c.bg}
                          strokeWidth={1}
                          onClick={(entry: any) => setSelectedCategory(entry.catId === selectedCategory ? null : entry.catId)}
                          style={{ cursor: "pointer" }}
                        >
                          {outerData.map((entry: any, i: number) => (
                            <Cell
                              key={i}
                              fill={entry.color}
                              opacity={
                                selectedCategory === null
                                  ? entry.actualValue > 0 ? 0.85 : 0.2
                                  : selectedCategory === entry.catId
                                    ? entry.actualValue > 0 ? 1 : 0.4
                                    : 0.1
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ payload }: any) => {
                            if (!payload || payload.length === 0) return null;
                            const data = payload[0].payload;
                            return (
                              <div style={tooltipStyle}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: c.text, fontFamily: "'Playfair Display', serif" }}>{data.name}</div>
                                <div style={{ fontSize: 11, color: c.muted }}>{data.actualValue} mentions</div>
                              </div>
                            );
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 12 }}>
                    {FLAVOR_WHEEL_DATA.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "5px 12px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 500,
                          cursor: "pointer",
                          border: selectedCategory === cat.id ? `1px solid ${c.accent}60` : `1px solid ${c.border}`,
                          background: selectedCategory === cat.id ? `${c.accent}10` : c.card,
                          color: c.text,
                          fontFamily: "system-ui, sans-serif",
                          transition: "all 0.2s",
                        }}
                        data-testid={`legend-${cat.id}`}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                        <span>{cat.en}</span>
                        <span style={{ color: c.muted }}>({categoryFreqs[cat.id] || 0})</span>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedCatData && (
                  <div style={cardStyle} data-testid={`detail-${selectedCatData.id}`}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: selectedCatData.color }} />
                        <span style={{ fontSize: 16, fontWeight: 600, color: c.text, fontFamily: "'Playfair Display', serif" }}>
                          {selectedCatData.en}
                        </span>
                        <span style={{ fontSize: 12, color: c.muted }}>
                          ({categoryFreqs[selectedCatData.id]} mentions)
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedCategory(null)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: c.muted }}
                        data-testid="button-close-detail"
                      >
                        <X style={{ width: 16, height: 16 }} />
                      </button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {selectedCatData.subcategories.map((sub) => {
                        const count = subFreqs[selectedCatData.id]?.[sub.id] || 0;
                        const maxInCat = Math.max(...selectedCatData.subcategories.map((s) => subFreqs[selectedCatData.id]?.[s.id] || 0), 1);
                        return (
                          <div
                            key={sub.id}
                            style={{
                              position: "relative",
                              overflow: "hidden",
                              borderRadius: 10,
                              border: `1px solid ${c.border}`,
                              padding: "10px 12px",
                            }}
                            data-testid={`sub-${sub.id}`}
                          >
                            <div
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                bottom: 0,
                                width: `${(count / maxInCat) * 100}%`,
                                background: selectedCatData.color,
                                opacity: 0.12,
                              }}
                            />
                            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ fontSize: 13, fontWeight: 500, color: c.text }}>{sub.en}</span>
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  fontFamily: "'Playfair Display', serif",
                                  color: count > 0 ? selectedCatData.color : c.mutedLight,
                                }}
                              >
                                {count}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </SimpleShell>
  );
}

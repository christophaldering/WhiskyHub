import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { journalApi, ratingNotesApi } from "@/lib/api";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Link } from "wouter";
import SimpleShell from "@/components/simple/simple-shell";
import { c as C } from "@/lib/theme";

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

export default function MyTasteFlavors() {
  const { currentParticipant } = useAppStore();
  const { t } = useTranslation();

  if (!currentParticipant) {
    return (
      <SimpleShell>
        <div style={{ textAlign: "center", padding: "60px 20px" }} data-testid="flavor-wheel-signin">
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>◎</div>
          <p style={{ color: C.text, fontSize: 16, fontFamily: "'Playfair Display', serif", marginBottom: 8 }}>
            {t("myTasteFlavors.title")}
          </p>
          <p style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>
            {t("myTasteFlavors.signInDesc")}
          </p>
          <Link href="/my-taste">
            <span
              style={{
                display: "inline-block",
                padding: "10px 24px",
                background: C.accent,
                color: C.bg,
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "none",
              }}
              data-testid="link-goto-mytaste"
            >
              {t("myTasteFlavors.goToMyTaste")}
            </span>
          </Link>
        </div>
      </SimpleShell>
    );
  }

  return (
    <SimpleShell maxWidth={600}>
      <FlavorWheelInner participantId={currentParticipant.id} />
    </SimpleShell>
  );
}

function FlavorWheelInner({ participantId }: { participantId: string }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("de") ? "de" : "en";
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: journalEntries, isLoading } = useQuery<JournalEntry[]>({
    queryKey: ["journal", participantId],
    queryFn: () => journalApi.getAll(participantId),
  });

  const { data: ratingNotes } = useQuery<Array<{ id: string; notes: string | null }>>({
    queryKey: ["rating-notes", participantId],
    queryFn: () => ratingNotesApi.get(participantId),
  });

  const { categoryFreqs, subFreqs, totalMentions, topCategory, mostUniqueFlavor, innerData, outerData } = useMemo(() => {
    const combinedEntries = [
      ...(journalEntries || []),
      ...(ratingNotes || []).map((r) => ({
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
        const c = subFreqs[cat.id][sub.id];
        if (c > 0 && c < minCount) {
          minCount = c;
          mostUniqueFlavor = { cat, sub, count: c };
        }
      }
    }

    const innerData = FLAVOR_WHEEL_DATA.map((cat) => ({
      name: cat[lang],
      value: Math.max(categoryFreqs[cat.id], 1),
      actualValue: categoryFreqs[cat.id],
      color: cat.color,
      id: cat.id,
    }));

    const outerData: { name: string; value: number; actualValue: number; color: string; catId: string; subId: string }[] = [];
    for (const cat of FLAVOR_WHEEL_DATA) {
      for (const sub of cat.subcategories) {
        outerData.push({
          name: sub[lang],
          value: Math.max(subFreqs[cat.id][sub.id], 0.3),
          actualValue: subFreqs[cat.id][sub.id],
          color: cat.color,
          catId: cat.id,
          subId: sub.id,
        });
      }
    }

    return { categoryFreqs, subFreqs, totalMentions, topCategory, mostUniqueFlavor, innerData, outerData };
  }, [journalEntries, ratingNotes, lang]);

  if (isLoading) {
    return (
      <div style={{ padding: "20px 0" }}>
        <div style={{ height: 28, width: 180, background: C.card, borderRadius: 6, marginBottom: 16 }} />
        <div style={{ height: 300, background: C.card, borderRadius: 12 }} />
      </div>
    );
  }

  const hasData = totalMentions > 0;
  const selectedCatData = selectedCategory ? FLAVOR_WHEEL_DATA.find((c) => c.id === selectedCategory) : null;

  return (
    <div data-testid="my-taste-flavor-wheel-page">
      <h1
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 24,
          color: C.accent,
          marginBottom: 8,
        }}
        data-testid="text-flavor-wheel-title"
      >
        {t("myTasteFlavors.title")}
      </h1>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>
        {t("myTasteFlavors.subtitle")}
      </p>

      {!hasData ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: C.muted }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>◎</div>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16 }}>
            {t("myTasteFlavors.noData")}
          </p>
        </div>
      ) : (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: "14px 8px",
                textAlign: "center",
              }}
              data-testid="stat-total-mentions"
            >
              <p style={{ fontSize: 22, fontFamily: "'Playfair Display', serif", fontWeight: 700, color: C.accent }}>
                {totalMentions}
              </p>
              <p style={{ fontSize: 11, color: C.muted }}>{t("myTasteFlavors.totalMentions")}</p>
            </div>
            <div
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: "14px 8px",
                textAlign: "center",
              }}
              data-testid="stat-top-category"
            >
              <p
                style={{
                  fontSize: 22,
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 700,
                  color: topCategory?.color || C.text,
                }}
              >
                {topCategory ? topCategory[lang] : "—"}
              </p>
              <p style={{ fontSize: 11, color: C.muted }}>{t("myTasteFlavors.topCategory")}</p>
            </div>
            <div
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: "14px 8px",
                textAlign: "center",
              }}
              data-testid="stat-unique-flavor"
            >
              <p
                style={{
                  fontSize: 22,
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 700,
                  color: C.accent,
                  opacity: 0.8,
                }}
              >
                {mostUniqueFlavor ? mostUniqueFlavor.sub[lang] : "—"}
              </p>
              <p style={{ fontSize: 11, color: C.muted }}>{t("myTasteFlavors.mostUnique")}</p>
            </div>
          </div>

          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 20,
              marginBottom: 24,
            }}
          >
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 16,
                color: C.text,
                marginBottom: 4,
              }}
            >
              {t("myTasteFlavors.aromaWheel")}
            </h2>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
              {t("myTasteFlavors.aromaWheelHint")}
            </p>
            <div style={{ height: 400 }}>
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
                    stroke={C.bg}
                    strokeWidth={2}
                    onClick={(entry) => setSelectedCategory(entry.id === selectedCategory ? null : entry.id)}
                    style={{ cursor: "pointer" }}
                  >
                    {innerData.map((entry, i) => (
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
                    stroke={C.bg}
                    strokeWidth={1}
                    onClick={(entry) => setSelectedCategory(entry.catId === selectedCategory ? null : entry.catId)}
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
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload || payload.length === 0) return null;
                      const data = payload[0].payload;
                      return (
                        <div
                          style={{
                            background: C.card,
                            border: `1px solid ${C.border}`,
                            borderRadius: 8,
                            padding: "6px 12px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                          }}
                        >
                          <p style={{ fontSize: 13, fontFamily: "'Playfair Display', serif", fontWeight: 600, color: C.text }}>
                            {data.name}
                          </p>
                          <p style={{ fontSize: 11, color: C.muted }}>
                            {t("myTasteFlavors.mentions", { count: data.actualValue })}
                          </p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 8,
                marginTop: 16,
              }}
            >
              {FLAVOR_WHEEL_DATA.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    border: selectedCategory === cat.id ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
                    background: selectedCategory === cat.id ? C.card : "transparent",
                    color: C.text,
                    transition: "all 0.2s",
                  }}
                  data-testid={`legend-${cat.id}`}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: cat.color,
                      display: "inline-block",
                    }}
                  />
                  <span>{cat[lang]}</span>
                  <span style={{ color: C.muted }}>({categoryFreqs[cat.id] || 0})</span>
                </button>
              ))}
            </div>
          </div>

          {selectedCatData && (
            <div
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: 20,
                marginBottom: 24,
              }}
              data-testid={`detail-${selectedCatData.id}`}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      backgroundColor: selectedCatData.color,
                      display: "inline-block",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 18,
                      fontWeight: 600,
                      color: C.text,
                    }}
                  >
                    {selectedCatData[lang]}
                  </span>
                  <span style={{ fontSize: 13, color: C.muted, marginLeft: 4 }}>
                    ({t("myTasteFlavors.mentions", { count: categoryFreqs[selectedCatData.id] })})
                  </span>
                </div>
                <button
                  onClick={() => setSelectedCategory(null)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: C.muted,
                    fontSize: 18,
                    padding: 4,
                  }}
                  data-testid="button-close-detail"
                >
                  ✕
                </button>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                {selectedCatData.subcategories.map((sub) => {
                  const count = subFreqs[selectedCatData.id]?.[sub.id] || 0;
                  const maxInCat = Math.max(
                    ...selectedCatData.subcategories.map((s) => subFreqs[selectedCatData.id]?.[s.id] || 0),
                    1
                  );
                  return (
                    <div
                      key={sub.id}
                      style={{
                        position: "relative",
                        overflow: "hidden",
                        borderRadius: 8,
                        border: `1px solid ${C.border}`,
                        padding: 10,
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
                          backgroundColor: selectedCatData.color,
                          opacity: 0.15,
                        }}
                      />
                      <div
                        style={{
                          position: "relative",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>
                          {sub[lang]}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontFamily: "'Playfair Display', serif",
                            fontWeight: 700,
                            color: count > 0 ? selectedCatData.color : C.muted,
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
        </div>
      )}
    </div>
  );
}

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useSession } from "@/lib/session";
import { journalApi, ratingNotesApi } from "@/lib/api";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ChevronLeft, CircleDot, X, Wine } from "lucide-react";
import { FLAVOR_CATEGORIES, type FlavorCategory } from "@/labs/data/flavor-data";

const FLAVOR_WHEEL_DATA = FLAVOR_CATEGORIES;

interface JournalEntry {
  id: string; noseNotes?: string | null; tasteNotes?: string | null; finishNotes?: string | null; body?: string | null;
}

function computeFlavorFrequencies(entries: JournalEntry[]) {
  const allText = entries.map(e => [e.noseNotes, e.tasteNotes, e.finishNotes, e.body].filter(Boolean).join(" ")).join(" ").toLowerCase();
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

export default function LabsTasteWheel() {
  const session = useSession();
  const pid = session.pid;
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const locName = useCallback((item: { en: string }) => item.en, []);

  const { data: journalEntries, isLoading } = useQuery<JournalEntry[]>({
    queryKey: ["journal", pid],
    queryFn: () => journalApi.getAll(pid!),
    enabled: !!pid,
  });

  const { data: ratingNotes } = useQuery<Array<{ id: string; notes: string | null }>>({
    queryKey: ["rating-notes", pid],
    queryFn: () => ratingNotesApi.get(pid!),
    enabled: !!pid,
  });

  const { categoryFreqs, subFreqs, totalMentions, topCategory, mostUniqueFlavor, innerData, outerData } = useMemo(() => {
    const combined: JournalEntry[] = [
      ...(journalEntries || []),
      ...(ratingNotes || []).map(r => ({ id: r.id, noseNotes: null, tasteNotes: null, finishNotes: null, body: r.notes })),
    ];
    if (combined.length === 0) return { categoryFreqs: {} as Record<string, number>, subFreqs: {} as Record<string, Record<string, number>>, totalMentions: 0, topCategory: null as FlavorCategory | null, mostUniqueFlavor: null as { cat: FlavorCategory; sub: { id: string; en: string }; count: number } | null, innerData: [] as { name: string; value: number; actualValue: number; color: string; id: string }[], outerData: [] as { name: string; value: number; actualValue: number; color: string; catId: string; subId: string }[] };

    const { categoryFreqs, subFreqs } = computeFlavorFrequencies(combined);
    const totalMentions = Object.values(categoryFreqs).reduce((s, v) => s + v, 0);
    let topCategory: FlavorCategory | null = null;
    let topCount = 0;
    for (const cat of FLAVOR_WHEEL_DATA) { if (categoryFreqs[cat.id] > topCount) { topCount = categoryFreqs[cat.id]; topCategory = cat; } }
    let mostUniqueFlavor: { cat: FlavorCategory; sub: { id: string; en: string }; count: number } | null = null;
    let minC = Infinity;
    for (const cat of FLAVOR_WHEEL_DATA) { for (const sub of cat.subcategories) { const c = subFreqs[cat.id][sub.id]; if (c > 0 && c < minC) { minC = c; mostUniqueFlavor = { cat, sub, count: c }; } } }

    const innerData = FLAVOR_WHEEL_DATA.map(cat => ({ name: cat.en, value: Math.max(categoryFreqs[cat.id], 1), actualValue: categoryFreqs[cat.id], color: cat.color, id: cat.id }));
    const outerData: { name: string; value: number; actualValue: number; color: string; catId: string; subId: string }[] = [];
    for (const cat of FLAVOR_WHEEL_DATA) { for (const sub of cat.subcategories) { outerData.push({ name: sub.en, value: Math.max(subFreqs[cat.id][sub.id], 0.3), actualValue: subFreqs[cat.id][sub.id], color: cat.color, catId: cat.id, subId: sub.id }); } }
    return { categoryFreqs, subFreqs, totalMentions, topCategory, mostUniqueFlavor, innerData, outerData };
  }, [journalEntries, ratingNotes]);

  const selectedCatData = selectedCategory ? FLAVOR_WHEEL_DATA.find(c => c.id === selectedCategory) : null;
  const hasData = totalMentions > 0;

  if (!session.signedIn || !pid) {
    return (
      <div className="labs-empty" style={{ minHeight: "60vh" }}>
        <CircleDot className="w-12 h-12 mb-4" style={{ color: "var(--labs-accent)" }} />
        <p style={{ color: "var(--labs-text)", fontSize: 16, fontWeight: 600 }}>Flavor Wheel</p>
        <p style={{ color: "var(--labs-text-muted)", fontSize: 13 }}>Sign in to explore your flavor categories</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto" data-testid="labs-taste-wheel">
      <Link href="/labs/taste" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-wheel">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
      </Link>

      <h1 className="labs-serif text-xl font-semibold mb-1 labs-fade-in" style={{ color: "var(--labs-text)" }} data-testid="text-wheel-title">
        Flavor Wheel
      </h1>
      <p className="text-sm mb-1 labs-fade-in" style={{ color: "var(--labs-text-muted)" }}>
        Aroma categories extracted from your tasting notes
      </p>
      <p className="text-xs mb-6 labs-fade-in" style={{ color: "var(--labs-text-muted)" }} data-testid="text-source-count">
        Sources: {journalEntries?.length || 0} journal entries, {ratingNotes?.length || 0} rating notes
      </p>

      {isLoading ? (
        <div className="labs-card p-8 text-center"><div className="labs-spinner mx-auto" /></div>
      ) : !hasData ? (
        <div className="labs-empty labs-fade-in">
          <Wine className="w-10 h-10 mb-3" style={{ color: "var(--labs-text-muted)" }} />
          <p style={{ color: "var(--labs-text-secondary)", fontSize: 14 }}>Add tasting notes to populate your flavor wheel</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="grid grid-cols-3 gap-3 labs-fade-in">
            <div className="labs-card p-3 text-center" data-testid="stat-total-mentions">
              <p className="labs-serif text-xl font-bold" style={{ color: "var(--labs-accent)" }}>{totalMentions}</p>
              <p className="text-[10px]" style={{ color: "var(--labs-text-muted)" }}>Total Mentions</p>
            </div>
            <div className="labs-card p-3 text-center" data-testid="stat-top-category">
              <p className="labs-serif text-xl font-bold" style={{ color: topCategory?.color }}>{topCategory ? locName(topCategory) : "—"}</p>
              <p className="text-[10px]" style={{ color: "var(--labs-text-muted)" }}>Top Category</p>
            </div>
            <div className="labs-card p-3 text-center" data-testid="stat-unique-flavor">
              <p className="labs-serif text-xl font-bold" style={{ color: "var(--labs-accent)" }}>{mostUniqueFlavor ? locName(mostUniqueFlavor.sub) : "—"}</p>
              <p className="text-[10px]" style={{ color: "var(--labs-text-muted)" }}>Most Unique</p>
            </div>
          </div>

          <div className="labs-card p-5 labs-fade-in labs-stagger-1">
            <h2 className="labs-serif text-base font-semibold mb-4" style={{ color: "var(--labs-text)" }}>Flavor Distribution</h2>
            <div style={{ height: 380 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={innerData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="25%" outerRadius="42%" paddingAngle={2} stroke="var(--labs-bg)" strokeWidth={2}
                    onClick={(entry: any) => setSelectedCategory(entry.id === selectedCategory ? null : entry.id)} style={{ cursor: "pointer" }}>
                    {innerData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} opacity={selectedCategory === null || selectedCategory === entry.id ? 1 : 0.25} />
                    ))}
                  </Pie>
                  <Pie data={outerData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="44%" outerRadius="72%" paddingAngle={1} stroke="var(--labs-bg)" strokeWidth={1}
                    onClick={(entry: any) => setSelectedCategory(entry.catId === selectedCategory ? null : entry.catId)} style={{ cursor: "pointer" }}>
                    {outerData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} opacity={selectedCategory === null ? (entry.actualValue > 0 ? 0.85 : 0.2) : selectedCategory === entry.catId ? (entry.actualValue > 0 ? 1 : 0.4) : 0.1} />
                    ))}
                  </Pie>
                  <Tooltip content={({ payload }: any) => {
                    if (!payload || payload.length === 0) return null;
                    const data = payload[0].payload;
                    return (
                      <div style={{ background: "var(--labs-surface-elevated)", border: "1px solid var(--labs-border)", borderRadius: 8, padding: "6px 10px" }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)" }}>{data.name}</p>
                        <p style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{data.actualValue} mentions</p>
                      </div>
                    );
                  }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mt-3">
              {FLAVOR_WHEEL_DATA.map(cat => (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 500,
                    background: selectedCategory === cat.id ? "var(--labs-surface-elevated)" : "var(--labs-surface)",
                    border: selectedCategory === cat.id ? "1px solid var(--labs-accent)" : "1px solid var(--labs-border)",
                    cursor: "pointer", color: "var(--labs-text)", fontFamily: "inherit",
                  }}
                  data-testid={`legend-${cat.id}`}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                  {locName(cat)}
                  <span style={{ color: "var(--labs-text-muted)" }}>({categoryFreqs[cat.id] || 0})</span>
                </button>
              ))}
            </div>
          </div>

          {selectedCatData && (
            <div className="labs-card p-5 labs-fade-in" data-testid={`detail-${selectedCatData.id}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: selectedCatData.color }} />
                  <h2 className="labs-serif text-base font-semibold" style={{ color: "var(--labs-text)" }}>{locName(selectedCatData)}</h2>
                  <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>({categoryFreqs[selectedCatData.id]} mentions)</span>
                </div>
                <button onClick={() => setSelectedCategory(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }} data-testid="button-close-detail">
                  <X className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {selectedCatData.subcategories.map(sub => {
                  const count = subFreqs[selectedCatData.id]?.[sub.id] || 0;
                  const maxInCat = Math.max(...selectedCatData.subcategories.map(s => subFreqs[selectedCatData.id]?.[s.id] || 0), 1);
                  return (
                    <div key={sub.id} style={{
                      position: "relative", overflow: "hidden", borderRadius: 8, border: "1px solid var(--labs-border)", padding: "8px 10px",
                    }} data-testid={`sub-${sub.id}`}>
                      <div style={{ position: "absolute", inset: 0, opacity: 0.12, background: selectedCatData.color, width: `${(count / maxInCat) * 100}%` }} />
                      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--labs-text)" }}>{locName(sub)}</span>
                        <span className="labs-serif" style={{ fontSize: 13, fontWeight: 700, color: count > 0 ? selectedCatData.color : "var(--labs-text-muted)" }}>{count}</span>
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

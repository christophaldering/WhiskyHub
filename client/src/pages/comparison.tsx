import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { flavorProfileApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";
import { useState } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";
import { GitCompareArrows, Plus, X, Wine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GuestPreview } from "@/components/guest-preview";

const CHART_COLORS = ["#c8a864", "#6b9bd2", "#d97c5a"];

interface WhiskyData {
  id: string;
  name: string;
  distillery: string | null;
  region: string | null;
  age: string | null;
  abv: number | null;
  imageUrl: string | null;
  caskInfluence: string | null;
  peatLevel: string | null;
  whiskybaseId: string | null;
}

interface RatingData {
  overall: number;
  nose: number;
  taste: number;
  finish: number;
  balance: number;
  notes: string | null;
}

interface RatedWhiskyItem {
  whisky: WhiskyData;
  rating: RatingData;
}

interface FlavorProfileData {
  avgScores: { nose: number; taste: number; finish: number; balance: number; overall: number };
  regionBreakdown: Record<string, { count: number; avgScore: number }>;
  caskBreakdown: Record<string, { count: number; avgScore: number }>;
  peatBreakdown: Record<string, { count: number; avgScore: number }>;
  categoryBreakdown: Record<string, { count: number; avgScore: number }>;
  ratedWhiskies: RatedWhiskyItem[];
  allWhiskies: any[];
}

export default function Comparison() {
  const { t, i18n } = useTranslation();
  const { currentParticipant } = useAppStore();
  const isDE = i18n.language === "de";
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: profile, isLoading } = useQuery<FlavorProfileData>({
    queryKey: ["flavor-profile", currentParticipant?.id],
    queryFn: () => flavorProfileApi.get(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  if (!currentParticipant) {
    return (
      <GuestPreview featureTitle={t("comparison.title")} featureDescription={t("guestPreview.comparison")}>
        <div className="space-y-4">
          <h1 className="text-2xl font-serif font-bold">{t("comparison.title")}</h1>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-xl border p-4 text-center space-y-3">
              <div className="font-serif font-semibold">Lagavulin 16</div>
              <div className="text-sm text-muted-foreground">Islay · 43%</div>
              <div className="text-2xl font-serif font-bold text-primary">8.7</div>
            </div>
            <div className="bg-card rounded-xl border p-4 text-center space-y-3">
              <div className="font-serif font-semibold">Laphroaig 10</div>
              <div className="text-sm text-muted-foreground">Islay · 40%</div>
              <div className="text-2xl font-serif font-bold text-primary">8.2</div>
            </div>
          </div>
          <div className="bg-card rounded-xl border p-4">
            <div className="grid grid-cols-3 gap-2 text-sm">
              {[{cat: "Nose", a: "8.5", b: "8.0"}, {cat: "Taste", a: "9.0", b: "8.5"}, {cat: "Finish", a: "8.8", b: "7.8"}].map(c => (
                <div key={c.cat} className="text-center"><div className="text-muted-foreground text-xs mb-1">{c.cat}</div><div className="font-serif">{c.a} vs {c.b}</div></div>
              ))}
            </div>
          </div>
        </div>
      </GuestPreview>
    );
  }

  const ratedWhiskies = profile?.ratedWhiskies || [];
  const selected = selectedIds.map(id => ratedWhiskies.find(r => r.whisky.id === id)).filter(Boolean) as typeof ratedWhiskies;

  const dimensions = [
    { key: "nose", label: isDE ? "Nase" : "Nose" },
    { key: "taste", label: isDE ? "Geschmack" : "Taste" },
    { key: "finish", label: isDE ? "Abgang" : "Finish" },
    { key: "balance", label: isDE ? "Balance" : "Balance" },
    { key: "overall", label: isDE ? "Gesamt" : "Overall" },
  ];

  const radarData = dimensions.map(dim => {
    const entry: Record<string, any> = { dimension: dim.label };
    selected.forEach((item, i) => {
      entry[`whisky${i}`] = (item.rating as any)[dim.key];
    });
    return entry;
  });

  const toggleWhisky = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const filteredWhiskies = ratedWhiskies.filter(r =>
    r.whisky.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.whisky.distillery || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 min-w-0 overflow-x-hidden" data-testid="comparison-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3 mb-2">
          <GitCompareArrows className="w-7 h-7 text-primary" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-compare-title">
            {t("comparison.title")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">{t("comparison.subtitle")}</p>

        {isLoading ? (
          <div className="h-64 bg-card/50 rounded-lg animate-pulse" />
        ) : ratedWhiskies.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <GitCompareArrows className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-serif">{t("comparison.empty")}</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-card rounded-lg border border-border/40 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-serif font-semibold">{t("comparison.selectLabel")}</h2>
                <span className="text-xs text-muted-foreground">{selectedIds.length}/3</span>
              </div>

              {selected.length > 0 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {selected.map((item, i) => (
                    <div
                      key={item.whisky.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border"
                      style={{ borderColor: CHART_COLORS[i], color: CHART_COLORS[i] }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                      <span className="truncate max-w-[120px]">{item.whisky.name}</span>
                      <button onClick={() => toggleWhisky(item.whisky.id)} className="hover:opacity-70">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                type="text"
                placeholder={t("comparison.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border/40 rounded-md mb-3 focus:outline-none focus:ring-1 focus:ring-primary/50"
                data-testid="input-compare-search"
              />

              {selectedIds.length === 0 && (
                <p className="text-xs text-muted-foreground italic mb-3" data-testid="text-click-hint">
                  {t("comparison.clickHint")}
                </p>
              )}

              <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-thin">
                {filteredWhiskies.map((item) => {
                  const isSelected = selectedIds.includes(item.whisky.id);
                  const colorIdx = selectedIds.indexOf(item.whisky.id);
                  return (
                    <button
                      key={item.whisky.id}
                      onClick={() => toggleWhisky(item.whisky.id)}
                      disabled={!isSelected && selectedIds.length >= 3}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors text-sm",
                        isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-secondary/50 hover:border-l-2 hover:border-l-primary/50 disabled:opacity-40"
                      )}
                      data-testid={`button-select-whisky-${item.whisky.id}`}
                    >
                      {isSelected ? (
                        <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[colorIdx] }} />
                      ) : (
                        <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      {item.whisky.imageUrl && (
                        <img src={item.whisky.imageUrl} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="font-medium truncate block">{item.whisky.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {[item.whisky.distillery, item.whisky.region].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{item.rating.overall.toFixed(1)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selected.length >= 2 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="bg-card rounded-lg border border-border/40 p-6">
                  <h2 className="text-lg font-serif font-semibold mb-4">{t("comparison.radarTitle")}</h2>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="dimension" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontFamily: "serif" }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                        {selected.map((item, i) => (
                          <Radar
                            key={item.whisky.id}
                            name={item.whisky.name}
                            dataKey={`whisky${i}`}
                            stroke={CHART_COLORS[i]}
                            fill={CHART_COLORS[i]}
                            fillOpacity={0.15}
                            strokeWidth={2}
                          />
                        ))}
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-card rounded-lg border border-border/40 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40">
                        <th className="text-left p-3 font-serif font-semibold text-muted-foreground">{t("comparison.dimension")}</th>
                        {selected.map((item, i) => (
                          <th key={item.whisky.id} className="text-center p-3 font-serif font-semibold" style={{ color: CHART_COLORS[i] }}>
                            {item.whisky.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dimensions.map((dim) => (
                        <tr key={dim.key} className="border-b border-border/20">
                          <td className="p-3 text-foreground font-medium">{dim.label}</td>
                          {selected.map((item) => {
                            const val = (item.rating as any)[dim.key] as number;
                            const maxVal = Math.max(...selected.map(s => (s.rating as any)[dim.key] as number));
                            return (
                              <td key={item.whisky.id} className={cn("p-3 text-center tabular-nums", val === maxVal ? "font-bold text-primary" : "text-muted-foreground")}>
                                {val.toFixed(1)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selected.some(s => s.rating.notes) && (
                  <div className="bg-card rounded-lg border border-border/40 p-6">
                    <h2 className="text-lg font-serif font-semibold mb-4">{t("comparison.notesTitle")}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {selected.map((item, i) => (
                        <div key={item.whisky.id} className="space-y-1">
                          <h3 className="text-sm font-semibold" style={{ color: CHART_COLORS[i] }}>{item.whisky.name}</h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {item.rating.notes || (isDE ? "Keine Notizen" : "No notes")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-card rounded-lg border border-border/40 p-6">
                  <h2 className="text-lg font-serif font-semibold mb-4">{t("comparison.detailsTitle")}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selected.map((item, i) => (
                      <div key={item.whisky.id} className="space-y-2">
                        <h3 className="text-sm font-serif font-semibold" style={{ color: CHART_COLORS[i] }}>{item.whisky.name}</h3>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          {item.whisky.distillery && <p>{isDE ? "Brennerei" : "Distillery"}: {item.whisky.distillery}</p>}
                          {item.whisky.region && <p>{isDE ? "Region" : "Region"}: {item.whisky.region}</p>}
                          {item.whisky.age && <p>{isDE ? "Alter" : "Age"}: {item.whisky.age}</p>}
                          {item.whisky.abv && <p>ABV: {item.whisky.abv}%</p>}
                          {item.whisky.caskInfluence && <p>{isDE ? "Fass" : "Cask"}: {item.whisky.caskInfluence}</p>}
                          {item.whisky.peatLevel && <p>{isDE ? "Torf" : "Peat"}: {item.whisky.peatLevel}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {selected.length >= 0 && selected.length < 2 && (
              <div className="text-center py-8 text-muted-foreground">
                <GitCompareArrows className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm italic">{t("comparison.selectMore")}</p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { flavorProfileApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Activity } from "lucide-react";

const COLORS = ["#c8a864", "#a8845c", "#8b6f47", "#d4a853", "#b8934a", "#9e7d3f", "#c4956c", "#d9b87c"];

interface BreakdownEntry { count: number; avgScore: number }
interface RatedWhisky {
  whisky: { id: string; name: string; distillery: string | null; region: string | null; age: string | null; abv: number | null; imageUrl: string | null; caskInfluence: string | null; peatLevel: string | null };
  rating: { overall: number; nose: number; taste: number; finish: number; balance: number; notes: string | null };
}
interface FlavorProfileData {
  avgScores: { nose: number; taste: number; finish: number; balance: number; overall: number };
  regionBreakdown: Record<string, BreakdownEntry>;
  caskBreakdown: Record<string, BreakdownEntry>;
  peatBreakdown: Record<string, BreakdownEntry>;
  categoryBreakdown: Record<string, BreakdownEntry>;
  ratedWhiskies: RatedWhisky[];
  allWhiskies: any[];
  sources?: { tastingRatings: number; journalEntries: number };
}

export default function FlavorProfile() {
  const { t, i18n } = useTranslation();
  const { currentParticipant } = useAppStore();
  const isDE = i18n.language === "de";

  const { data: profile, isLoading } = useQuery<FlavorProfileData>({
    queryKey: ["flavor-profile", currentParticipant?.id],
    queryFn: () => flavorProfileApi.get(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  if (!currentParticipant) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground font-serif" data-testid="text-flavor-login-required">
          {t("flavorProfile.loginRequired")}
        </p>
      </div>
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

  const radarData = profile?.avgScores ? [
    { dimension: isDE ? "Nase" : "Nose", value: profile.avgScores.nose, fullMark: 100 },
    { dimension: isDE ? "Geschmack" : "Taste", value: profile.avgScores.taste, fullMark: 100 },
    { dimension: isDE ? "Abgang" : "Finish", value: profile.avgScores.finish, fullMark: 100 },
    { dimension: isDE ? "Balance" : "Balance", value: profile.avgScores.balance, fullMark: 100 },
    { dimension: isDE ? "Gesamt" : "Overall", value: profile.avgScores.overall, fullMark: 100 },
  ] : [];

  const regionData = profile?.regionBreakdown
    ? Object.entries(profile.regionBreakdown)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({ name, count: data.count, avgScore: data.avgScore }))
    : [];

  const caskData = profile?.caskBreakdown
    ? Object.entries(profile.caskBreakdown)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({ name, count: data.count, avgScore: data.avgScore }))
    : [];

  const peatData = profile?.peatBreakdown
    ? Object.entries(profile.peatBreakdown)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({ name, count: data.count, avgScore: data.avgScore }))
    : [];

  const totalRatings = profile?.ratedWhiskies?.length || 0;
  const totalJournalScores = profile?.sources?.journalEntries || 0;
  const topWhiskies = profile?.ratedWhiskies
    ? [...profile.ratedWhiskies].sort((a, b) => b.rating.overall - a.rating.overall).slice(0, 5)
    : [];

  const hasData = totalRatings > 0 || totalJournalScores > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" data-testid="flavor-profile-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-7 h-7 text-primary" />
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-flavor-title">
            {t("flavorProfile.title")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-2">{t("flavorProfile.subtitle")}</p>
        {profile?.sources && (profile.sources.tastingRatings > 0 || profile.sources.journalEntries > 0) && (
          <p className="text-xs text-muted-foreground/70 mb-8" data-testid="text-flavor-sources">
            {isDE
              ? `Basierend auf ${profile.sources.tastingRatings} Tasting-Bewertung${profile.sources.tastingRatings !== 1 ? "en" : ""} und ${profile.sources.journalEntries} Journal-Eintr${profile.sources.journalEntries !== 1 ? "ägen" : "ag"}`
              : `Based on ${profile.sources.tastingRatings} tasting rating${profile.sources.tastingRatings !== 1 ? "s" : ""} and ${profile.sources.journalEntries} journal entr${profile.sources.journalEntries !== 1 ? "ies" : "y"}`}
          </p>
        )}
        {!(profile?.sources && (profile.sources.tastingRatings > 0 || profile.sources.journalEntries > 0)) && (
          <div className="mb-8" />
        )}

        {!hasData ? (
          <div className="text-center py-16 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-serif">{t("flavorProfile.empty")}</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-card rounded-lg border border-border/40 p-6">
              <h2 className="text-lg font-serif font-semibold mb-1 text-foreground">{t("flavorProfile.radarTitle")}</h2>
              <p className="text-xs text-muted-foreground mb-4">
                {t("flavorProfile.radarSubtitle", { count: totalRatings })}
              </p>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontFamily: "serif" }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                    <Radar name="Profile" dataKey="value" stroke="#c8a864" fill="#c8a864" fillOpacity={0.3} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {regionData.length > 0 && (
              <div className="bg-card rounded-lg border border-border/40 p-6">
                <h2 className="text-lg font-serif font-semibold mb-1">{t("flavorProfile.regionTitle")}</h2>
                <p className="text-xs text-muted-foreground mb-4">{t("flavorProfile.regionSubtitle")}</p>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={regionData} layout="vertical" margin={{ left: 80 }}>
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} width={75} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                        formatter={(value: number, name: string) => [value.toFixed(1), name === "avgScore" ? (isDE ? "Ø Bewertung" : "Avg Score") : (isDE ? "Anzahl" : "Count")]}
                      />
                      <Bar dataKey="avgScore" radius={[0, 4, 4, 0]}>
                        {regionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {peatData.length > 0 && (
                <div className="bg-card rounded-lg border border-border/40 p-6">
                  <h2 className="text-base font-serif font-semibold mb-3">{t("flavorProfile.peatTitle")}</h2>
                  <div className="space-y-3">
                    {peatData.map((d) => (
                      <div key={d.name} className="flex items-center justify-between">
                        <span className="text-sm text-foreground">{d.name}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 bg-secondary/50 rounded-full overflow-hidden">
                            <div className="h-full bg-primary/60 rounded-full" style={{ width: `${d.avgScore}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right">{d.avgScore}</span>
                          <span className="text-[10px] text-muted-foreground/60">({d.count})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {caskData.length > 0 && (
                <div className="bg-card rounded-lg border border-border/40 p-6">
                  <h2 className="text-base font-serif font-semibold mb-3">{t("flavorProfile.caskTitle")}</h2>
                  <div className="space-y-3">
                    {caskData.map((d) => (
                      <div key={d.name} className="flex items-center justify-between">
                        <span className="text-sm text-foreground">{d.name}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 bg-secondary/50 rounded-full overflow-hidden">
                            <div className="h-full bg-primary/60 rounded-full" style={{ width: `${d.avgScore}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right">{d.avgScore}</span>
                          <span className="text-[10px] text-muted-foreground/60">({d.count})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {topWhiskies.length > 0 && (
              <div className="bg-card rounded-lg border border-border/40 p-6">
                <h2 className="text-lg font-serif font-semibold mb-4">{t("flavorProfile.topTitle")}</h2>
                <div className="space-y-3">
                  {topWhiskies.map((item, i) => (
                    <div key={item.whisky.id} className="flex items-center gap-4 py-2 border-b border-border/20 last:border-0">
                      <span className="text-lg font-serif font-bold text-primary/60 w-8">{i + 1}</span>
                      {item.whisky.imageUrl && (
                        <img src={item.whisky.imageUrl} alt={item.whisky.name} className="w-10 h-10 rounded object-cover" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{item.whisky.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[item.whisky.distillery, item.whisky.region, item.whisky.age ? `${item.whisky.age}y` : null].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-serif font-bold text-primary">{item.rating.overall.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

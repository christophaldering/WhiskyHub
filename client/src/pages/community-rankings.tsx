import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { communityApi, flavorProfileApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";
import { Trophy, ExternalLink, Star, Users, Filter, ChevronDown } from "lucide-react";
import { useState } from "react";

interface CommunityWhisky {
  whiskyKey: string;
  name: string;
  distillery: string | null;
  whiskybaseId: string | null;
  avgOverall: number;
  avgNose: number;
  avgTaste: number;
  avgFinish: number;
  avgBalance: number;
  totalRatings: number;
  totalRaters: number;
  region: string | null;
  category: string | null;
  caskInfluence: string | null;
  peatLevel: string | null;
  age: string | null;
  abv: number | null;
  imageUrl: string | null;
}

export default function CommunityRankings() {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const [filter, setFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const { data: scores, isLoading } = useQuery<CommunityWhisky[]>({
    queryKey: ["community-scores"],
    queryFn: () => communityApi.getScores(),
  });

  const { data: myProfile } = useQuery({
    queryKey: ["flavor-profile", currentParticipant?.id],
    queryFn: () => flavorProfileApi.get(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const myScores = new Map<string, number>();
  if (myProfile?.ratedWhiskies) {
    for (const rw of myProfile.ratedWhiskies) {
      const key = rw.whisky.whiskybaseId
        ? `wb:${rw.whisky.whiskybaseId}`
        : `name:${(rw.whisky.name || "").toLowerCase().trim()}|${(rw.whisky.distillery || "").toLowerCase().trim()}`;
      myScores.set(key, rw.rating.overall);
    }
  }

  const regions = scores ? Array.from(new Set(scores.map(s => s.region).filter((r): r is string => !!r))) : [];
  const categories = scores ? Array.from(new Set(scores.map(s => s.category).filter((c): c is string => !!c))) : [];

  const filtered = scores?.filter(s => {
    if (filter === "all") return true;
    if (filter.startsWith("region:")) return s.region === filter.slice(7);
    if (filter.startsWith("category:")) return s.category === filter.slice(9);
    return true;
  }) || [];

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-amber-600";
    if (score >= 65) return "text-primary";
    return "text-muted-foreground";
  };

  const getMedalEmoji = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return null;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 min-w-0 overflow-x-hidden" data-testid="community-rankings-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="w-7 h-7 text-primary" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-rankings-title">
            {t("communityRankings.title")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          {t("communityRankings.subtitle")}
        </p>

        <div className="mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            data-testid="button-toggle-filters"
          >
            <Filter className="w-4 h-4" />
            {t("communityRankings.filters")}
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${filter === "all" ? "bg-primary text-white border-primary" : "border-border hover:border-primary/50"}`}
                data-testid="button-filter-all"
              >
                {t("communityRankings.filterAll")}
              </button>
              {regions.map(r => (
                <button
                  key={r}
                  onClick={() => setFilter(`region:${r}`)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${filter === `region:${r}` ? "bg-primary text-white border-primary" : "border-border hover:border-primary/50"}`}
                  data-testid={`button-filter-region-${r}`}
                >
                  {r}
                </button>
              ))}
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setFilter(`category:${c}`)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${filter === `category:${c}` ? "bg-primary text-white border-primary" : "border-border hover:border-primary/50"}`}
                  data-testid={`button-filter-category-${c}`}
                >
                  {c}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 bg-card/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-serif">{t("communityRankings.emptyTitle")}</p>
            <p className="text-xs mt-2">{t("communityRankings.emptyHint")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((whisky, index) => {
              const myScore = myScores.get(whisky.whiskyKey);
              const medal = getMedalEmoji(index);

              return (
                <motion.div
                  key={whisky.whiskyKey}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.5) }}
                  className="bg-card rounded-lg border border-border/40 p-4 hover:border-primary/30 transition-colors"
                  data-testid={`card-community-whisky-${index}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 shrink-0 text-center">
                      {medal ? (
                        <span className="text-xl">{medal}</span>
                      ) : (
                        <span className="text-sm font-serif font-bold text-primary/40">{index + 1}</span>
                      )}
                    </div>

                    {whisky.imageUrl && (
                      <img src={whisky.imageUrl} alt={whisky.name} className="w-12 h-16 rounded object-cover shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-serif font-semibold truncate">{whisky.name}</h3>
                        {whisky.whiskybaseId && (
                          <a
                            href={`https://www.whiskybase.com/whiskies/whisky/${whisky.whiskybaseId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary/50 hover:text-primary shrink-0"
                            data-testid={`link-wb-${index}`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {[whisky.distillery, whisky.region, whisky.age ? `${whisky.age}y` : null, whisky.abv ? `${whisky.abv}%` : null].filter(Boolean).join(" · ")}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Users className="w-3 h-3" />
                          {whisky.totalRaters} {t("communityRankings.tasters")}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Star className="w-3 h-3" />
                          {whisky.totalRatings} {t("communityRankings.ratings")}
                        </div>
                        {whisky.caskInfluence && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/80">{whisky.caskInfluence}</span>
                        )}
                        {whisky.peatLevel && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{whisky.peatLevel}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">CaskSense</div>
                      <div className={`text-xl font-serif font-bold ${getScoreColor(whisky.avgOverall)}`}>
                        {whisky.avgOverall}
                      </div>
                      {myScore !== undefined && (
                        <div className="text-[10px] mt-0.5">
                          <span className="text-muted-foreground">{t("communityRankings.you")}: </span>
                          <span className={`font-semibold ${myScore > whisky.avgOverall ? "text-green-600" : myScore < whisky.avgOverall ? "text-red-500" : "text-muted-foreground"}`}>
                            {myScore}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {[
                      { label: t("communityRankings.nose"), value: whisky.avgNose },
                      { label: t("communityRankings.taste"), value: whisky.avgTaste },
                      { label: t("communityRankings.finish"), value: whisky.avgFinish },
                      { label: "Balance", value: whisky.avgBalance },
                    ].map(d => (
                      <div key={d.label} className="text-center">
                        <div className="text-[10px] text-muted-foreground">{d.label}</div>
                        <div className="text-xs font-semibold text-primary/70">{d.value}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}

            <p className="text-xs text-muted-foreground text-center mt-6 italic">
              {t("communityRankings.footerNote", { count: filtered.reduce((s, w) => s + w.totalRatings, 0) })}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

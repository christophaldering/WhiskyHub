import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { leaderboardApi } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, FileText, Star, Target, Trophy } from "lucide-react";

interface LeaderboardEntry {
  id: string;
  name: string;
  ratingsCount?: number;
  avgNotesLength?: number;
  avgScore?: number;
  consistency?: number;
}

interface LeaderboardData {
  mostActive: LeaderboardEntry[];
  mostDetailed: LeaderboardEntry[];
  highestRated: LeaderboardEntry[];
  mostConsistent: LeaderboardEntry[];
}

function getRankStyle(rank: number) {
  if (rank === 1) return "bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold";
  if (rank === 2) return "bg-gray-300/15 text-gray-300 border-gray-400/30 font-semibold";
  if (rank === 3) return "bg-orange-700/20 text-orange-400 border-orange-600/30 font-semibold";
  return "bg-muted/30 text-muted-foreground border-border/20";
}

function getRankBadge(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

function RankingList({
  entries,
  formatValue,
  currentUserId,
  categoryKey,
}: {
  entries: LeaderboardEntry[];
  formatValue: (entry: LeaderboardEntry) => string;
  currentUserId?: string;
  categoryKey: string;
}) {
  const { t } = useTranslation();

  if (!entries || entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground" data-testid={`empty-${categoryKey}`}>
        <Trophy className="w-10 h-10 mb-3 opacity-30" />
        <p className="font-serif text-sm">{t("leaderboard.empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid={`list-${categoryKey}`}>
      {entries.slice(0, 10).map((entry, index) => {
        const rank = index + 1;
        const isCurrentUser = currentUserId === entry.id;
        const badge = getRankBadge(rank);

        return (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${getRankStyle(rank)} ${
              isCurrentUser ? "ring-2 ring-primary/50 shadow-[0_0_12px_rgba(var(--primary-rgb,200,170,100),0.2)]" : ""
            }`}
            data-testid={`row-${categoryKey}-${entry.id}`}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full text-sm" data-testid={`rank-${categoryKey}-${rank}`}>
              {badge ? (
                <span className="text-lg">{badge}</span>
              ) : (
                <span className="text-xs font-medium">{rank}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p
                className={`text-sm truncate ${isCurrentUser ? "font-bold text-primary" : "font-medium"}`}
                data-testid={`name-${categoryKey}-${entry.id}`}
              >
                {entry.name}
                {isCurrentUser && (
                  <span className="ml-2 text-[10px] uppercase tracking-wider text-primary/70">
                    ({t("leaderboard.you")})
                  </span>
                )}
              </p>
            </div>

            <div
              className="text-sm font-mono font-medium tabular-nums"
              data-testid={`value-${categoryKey}-${entry.id}`}
            >
              {formatValue(entry)}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export default function Leaderboard() {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();

  const { data, isLoading } = useQuery<LeaderboardData>({
    queryKey: ["leaderboard"],
    queryFn: () => leaderboardApi.get(),
  });

  const categories = [
    {
      key: "mostActive",
      label: t("leaderboard.mostActive"),
      icon: Activity,
      entries: data?.mostActive || [],
      formatValue: (e: LeaderboardEntry) => `${e.ratingsCount ?? 0} ${t("leaderboard.ratings")}`,
    },
    {
      key: "mostDetailed",
      label: t("leaderboard.mostDetailed"),
      icon: FileText,
      entries: data?.mostDetailed || [],
      formatValue: (e: LeaderboardEntry) => `${Math.round(e.avgNotesLength ?? 0)} ${t("leaderboard.characters")}`,
    },
    {
      key: "highestRated",
      label: t("leaderboard.highestRated"),
      icon: Star,
      entries: data?.highestRated || [],
      formatValue: (e: LeaderboardEntry) => `${(e.avgScore ?? 0).toFixed(1)}/100`,
    },
    {
      key: "mostConsistent",
      label: t("leaderboard.mostConsistent"),
      icon: Target,
      entries: data?.mostConsistent || [],
      formatValue: (e: LeaderboardEntry) => `${Math.round(e.consistency ?? 0)}%`,
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 min-w-0 overflow-x-hidden" data-testid="leaderboard-page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="w-7 h-7 text-primary" />
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-leaderboard-title">
            {t("leaderboard.title")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6" data-testid="text-leaderboard-subtitle">
          {t("leaderboard.subtitle")}
        </p>

        {isLoading ? (
          <div className="space-y-3" data-testid="leaderboard-loading">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-card/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <Tabs defaultValue="mostActive" data-testid="leaderboard-tabs">
            <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 mb-4" data-testid="leaderboard-tabs-list">
              {categories.map((cat) => (
                <TabsTrigger
                  key={cat.key}
                  value={cat.key}
                  className="flex items-center gap-1.5 text-xs sm:text-sm"
                  data-testid={`tab-${cat.key}`}
                >
                  <cat.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{cat.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((cat) => (
              <TabsContent key={cat.key} value={cat.key} data-testid={`tab-content-${cat.key}`}>
                <div className="rounded-xl border bg-card/50 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <cat.icon className="w-5 h-5 text-primary/70" />
                    <h2 className="font-serif font-semibold text-lg" data-testid={`heading-${cat.key}`}>
                      {cat.label}
                    </h2>
                  </div>
                  <RankingList
                    entries={cat.entries}
                    formatValue={cat.formatValue}
                    currentUserId={currentParticipant?.id}
                    categoryKey={cat.key}
                  />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </motion.div>
    </div>
  );
}

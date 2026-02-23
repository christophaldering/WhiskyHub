import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { tastingHistoryApi } from "@/lib/api";
import {
  Wine, Crown, Users, MapPin, Calendar, ChevronDown, ChevronRight,
  Star, BarChart3, Loader2, Globe, Landmark, ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GuestPreview } from "@/components/guest-preview";

export default function TastingHistory() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { currentParticipant } = useAppStore();
  const [expandedTasting, setExpandedTasting] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["tasting-history", currentParticipant?.id],
    queryFn: () => tastingHistoryApi.get(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const tastings = data?.tastings || [];
  const stats = data?.stats;

  const hostedTastings = useMemo(() => tastings.filter((t: any) => t.isHost), [tastings]);
  const participatedTastings = useMemo(() => tastings.filter((t: any) => !t.isHost), [tastings]);

  if (!currentParticipant) {
    return (
      <GuestPreview featureTitle={t("tastingHistory.title")} featureDescription={t("guestPreview.tastingHistory")}>
        <div className="space-y-4">
          <h1 className="text-2xl font-serif font-bold">{t("tastingHistory.title")}</h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[{label: "Tastings", value: "12"}, {label: "Whiskies", value: "48"}, {label: "Distilleries", value: "31"}, {label: "Avg Rating", value: "7.8"}].map(s => (
              <div key={s.label} className="bg-card rounded-xl border p-4 text-center"><div className="text-2xl font-serif font-bold text-primary">{s.value}</div><div className="text-xs text-muted-foreground mt-1">{s.label}</div></div>
            ))}
          </div>
          <div className="space-y-3">
            {[{name: "Highland Evening", date: "Jan 15, 2026", whiskies: 6}, {name: "Islay Exploration", date: "Dec 8, 2025", whiskies: 5}, {name: "Speyside Classics", date: "Nov 20, 2025", whiskies: 4}].map(item => (
              <div key={item.name} className="bg-card rounded-xl border p-4"><div className="font-serif font-semibold">{item.name}</div><div className="text-sm text-muted-foreground">{item.date} · {item.whiskies} whiskies</div></div>
            ))}
          </div>
        </div>
      </GuestPreview>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Wine className="w-12 h-12 text-muted-foreground/40" />
        <p className="text-muted-foreground font-serif italic text-center">
          {t("tastingHistory.empty")}
        </p>
      </div>
    );
  }

  const formatScore = (score: number | null) => {
    if (score == null) return "–";
    return score.toFixed(1);
  };

  const scoreColor = (score: number | null) => {
    if (score == null) return "text-muted-foreground";
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-orange-600 dark:text-orange-400";
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      draft: t("session.status.draft"),
      open: t("session.status.open"),
      closed: t("session.status.closed"),
      reveal: t("session.status.reveal"),
      archived: t("session.status.archived"),
    };
    return map[status] || status;
  };

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      open: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      closed: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      reveal: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      archived: "bg-secondary text-secondary-foreground",
    };
    return map[status] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto min-w-0 overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-2xl sm:text-4xl font-serif font-black text-primary tracking-tight break-words" data-testid="text-history-title">
          {t("tastingHistory.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("tastingHistory.subtitle")}</p>
        <div className="w-12 h-1 bg-primary/50 mt-3" />
      </motion.div>

      {stats && stats.totalTastings > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          data-testid="stats-overview"
        >
          <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
            <Wine className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-mono font-bold text-primary">{stats.totalTastings}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("tastingHistory.statTastings")}</p>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
            <BarChart3 className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-mono font-bold text-primary">{stats.totalWhiskies}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("tastingHistory.statWhiskies")}</p>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
            <Landmark className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-mono font-bold text-primary">{stats.uniqueDistilleries}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("tastingHistory.statDistilleries")}</p>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
            <Star className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className={`text-2xl font-mono font-bold ${scoreColor(stats.overallAvg)}`}>{formatScore(stats.overallAvg)}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("tastingHistory.statAvgRating")}</p>
          </div>
        </motion.div>
      )}

      {stats && stats.totalTastings > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="flex flex-wrap gap-3 text-xs text-muted-foreground"
        >
          <span className="flex items-center gap-1">
            <Globe className="w-3.5 h-3.5" />
            {stats.uniqueCountries} {t("tastingHistory.countries")}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {stats.uniqueRegions} {t("tastingHistory.regions")}
          </span>
          <span className="flex items-center gap-1">
            <Crown className="w-3.5 h-3.5" />
            {stats.hostedCount}x {t("tastingHistory.hosted")}
          </span>
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5" />
            {stats.totalRated} {t("tastingHistory.rated")}
          </span>
        </motion.div>
      )}

      <Tabs defaultValue="all" className="mt-2">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="all" className="gap-1.5 text-xs" data-testid="tab-tastings-all">
            {t("tastingHistory.tabAll")} ({tastings.length})
          </TabsTrigger>
          <TabsTrigger value="participated" className="gap-1.5 text-xs" data-testid="tab-tastings-participated">
            <Users className="w-3.5 h-3.5" />
            {t("tastingHistory.tabParticipated")} ({participatedTastings.length})
          </TabsTrigger>
          <TabsTrigger value="hosted" className="gap-1.5 text-xs" data-testid="tab-tastings-hosted">
            <Crown className="w-3.5 h-3.5" />
            {t("tastingHistory.tabHosted")} ({hostedTastings.length})
          </TabsTrigger>
        </TabsList>
        {["all", "participated", "hosted"].map(tab => {
          const items = tab === "hosted" ? hostedTastings : tab === "participated" ? participatedTastings : tastings;
          return (
            <TabsContent key={tab} value={tab} className="mt-4">
              {items.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                  <Wine className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                  <p className="text-muted-foreground font-serif text-lg italic" data-testid="text-no-history">
                    {t("tastingHistory.empty")}
                  </p>
                  <p className="text-sm text-muted-foreground/70 mt-2">{t("tastingHistory.emptyHint")}</p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {items.map((tasting: any, index: number) => {
                    const isExpanded = expandedTasting === tasting.id;
                    return (
                      <motion.div
                        key={tasting.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * Math.min(index, 10), duration: 0.5 }}
                      >
                        <Card className="border-border/50 bg-card shadow-sm hover:shadow-md transition-all duration-300" data-testid={`card-history-${tasting.id}`}>
                          <CardHeader
                            className="cursor-pointer select-none py-4"
                            onClick={() => setExpandedTasting(isExpanded ? null : tasting.id)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <CardTitle className="flex items-center gap-2 font-serif text-lg text-primary">
                                  {isExpanded ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                                  <span className="truncate">{tasting.title}</span>
                                </CardTitle>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 ml-6 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(tasting.date).toLocaleDateString()}
                                  </span>
                                  {tasting.location && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {tasting.location}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {tasting.participantCount}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Wine className="w-3 h-3" />
                                    {tasting.whiskyCount} {t("tastingHistory.whiskiesShort")}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {tasting.myAvgOverall != null && (
                                  <span className={`text-lg font-mono font-bold ${scoreColor(tasting.myAvgOverall)}`} data-testid={`score-tasting-${tasting.id}`}>
                                    {formatScore(tasting.myAvgOverall)}
                                  </span>
                                )}
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase ${statusColor(tasting.status)}`}>
                                  {statusLabel(tasting.status)}
                                </span>
                                {tasting.isHost && (
                                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                                )}
                              </div>
                            </div>
                          </CardHeader>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="overflow-hidden"
                              >
                                <CardContent className="pt-0 pb-4">
                                  <div className="border-t border-border/30 pt-3 space-y-2">
                                    <div className="flex items-center justify-between mb-3">
                                      <p className="text-xs text-muted-foreground">
                                        {t("tastingHistory.hostedBy")}: <span className="font-medium text-foreground">{tasting.hostName}</span>
                                        {tasting.ratedCount > 0 && (
                                          <> &bull; {tasting.ratedCount}/{tasting.whiskyCount} {t("tastingHistory.rated")}</>
                                        )}
                                      </p>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); navigate(`/tasting/${tasting.id}`); }}
                                        className="text-xs text-primary hover:underline flex items-center gap-1"
                                        data-testid={`link-open-tasting-${tasting.id}`}
                                      >
                                        {t("tastingHistory.openSession")} <ArrowRight className="w-3 h-3" />
                                      </button>
                                    </div>

                                    <div className="grid gap-2">
                                      {tasting.whiskies.map((whisky: any, wi: number) => (
                                        <div
                                          key={whisky.id}
                                          className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 border border-border/20"
                                          data-testid={`whisky-row-${whisky.id}`}
                                        >
                                          <span className="text-xs font-mono text-muted-foreground/60 w-5 text-right flex-shrink-0">
                                            {wi + 1}
                                          </span>
                                          {whisky.imageUrl ? (
                                            <img src={whisky.imageUrl} alt={whisky.name} className="w-8 h-10 rounded object-cover flex-shrink-0" />
                                          ) : (
                                            <div className="w-8 h-10 rounded bg-secondary/60 flex items-center justify-center flex-shrink-0">
                                              <Wine className="w-4 h-4 text-muted-foreground/30" />
                                            </div>
                                          )}
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-serif font-medium text-foreground truncate">
                                              {whisky.distillery && <span className="text-primary">{whisky.distillery} </span>}
                                              {whisky.name}
                                            </p>
                                            <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                                              {whisky.age && <span>{whisky.age}y</span>}
                                              {whisky.abv && <span>{whisky.abv}%</span>}
                                              {whisky.region && <span>{whisky.region}</span>}
                                              {whisky.caskInfluence && <span>{whisky.caskInfluence}</span>}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-3 flex-shrink-0">
                                            {whisky.myRating ? (
                                              <div className="text-right">
                                                <p className={`text-sm font-mono font-bold ${scoreColor(whisky.myRating.overall)}`}>
                                                  {formatScore(whisky.myRating.overall)}
                                                </p>
                                                <div className="flex gap-1.5 text-[9px] text-muted-foreground">
                                                  <span>N:{formatScore(whisky.myRating.nose)}</span>
                                                  <span>T:{formatScore(whisky.myRating.taste)}</span>
                                                  <span>F:{formatScore(whisky.myRating.finish)}</span>
                                                </div>
                                              </div>
                                            ) : (
                                              <span className="text-xs text-muted-foreground/40 italic">{t("tastingHistory.notRated")}</span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </CardContent>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

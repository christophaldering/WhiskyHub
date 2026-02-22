import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { tastingApi, profileApi } from "@/lib/api";
import { motion } from "framer-motion";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { Wine, Calendar, Users, TrendingUp, Star, Armchair } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useChartColors } from "@/lib/theme-colors";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function LoungeHome() {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const chartColors = useChartColors();

  const { data: allTastings = [] } = useQuery({
    queryKey: ["tastings", currentParticipant?.id],
    queryFn: () => tastingApi.getAll(currentParticipant?.id),
    enabled: !!currentParticipant,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", currentParticipant?.id],
    queryFn: () => profileApi.get(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const { data: flavorProfile } = useQuery({
    queryKey: ["/api/flavor-profile", currentParticipant?.id],
    queryFn: async () => {
      if (!currentParticipant) return null;
      const res = await fetch(`/api/flavor-profile/${currentParticipant.id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!currentParticipant,
  });

  const recentTastings = allTastings
    .filter((t: any) => t.status === "archived" || t.status === "reveal")
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  const lastTasting = recentTastings[0];

  const radarData = flavorProfile?.dimensions
    ? Object.entries(flavorProfile.dimensions).map(([key, value]) => ({
        dimension: key.charAt(0).toUpperCase() + key.slice(1),
        value: value as number,
        fullMark: 10,
      }))
    : [
        { dimension: "Nose", value: 0, fullMark: 10 },
        { dimension: "Taste", value: 0, fullMark: 10 },
        { dimension: "Finish", value: 0, fullMark: 10 },
        { dimension: "Balance", value: 0, fullMark: 10 },
        { dimension: "Complexity", value: 0, fullMark: 10 },
      ];

  const participantName = currentParticipant?.name?.split(" ")[0] || "";

  const upcomingTastings = allTastings
    .filter((t: any) => t.status === "open" || t.status === "draft")
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 2);

  return (
    <div className="space-y-10" data-testid="lounge-home">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-950/40 via-amber-900/20 to-background border border-amber-800/20 p-8 md:p-12"
      >
        <div className="absolute top-4 right-4 opacity-10">
          <Armchair className="w-24 h-24 text-amber-500" />
        </div>
        <h1 className="text-3xl md:text-4xl font-serif font-black text-primary tracking-tight" data-testid="lounge-welcome-title">
          {t('loungeNav.loungeHomeWelcome')}{participantName ? `, ${participantName}` : ""}
        </h1>
        <p className="text-muted-foreground mt-2 text-lg font-serif italic max-w-xl">
          {t('uiTheme.loungeSubtitle')}
        </p>
        <div className="flex items-center gap-4 mt-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Wine className="w-4 h-4 text-amber-500" />
            <span>{allTastings.length} {t('loungeNav.tastings')}</span>
          </div>
          {upcomingTastings.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-500" />
              <span>{upcomingTastings.length} {t('loungeNav.calendar')}</span>
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card className="border-border/40 bg-card/50">
            <CardContent className="p-6">
              <h2 className="text-lg font-serif font-bold text-primary mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                {t('loungeNav.loungeHomeRadar')}
              </h2>
              {flavorProfile?.dimensions ? (
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                    <PolarGrid stroke={chartColors.grid} />
                    <PolarAngleAxis dataKey="dimension" tick={{ fill: chartColors.text, fontSize: 11 }} />
                    <Radar
                      name="You"
                      dataKey="value"
                      stroke={chartColors.primary}
                      fill={chartColors.primary}
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[260px] text-muted-foreground text-sm">
                  <p className="text-center">{t('loungeNav.noRecentTastings')}</p>
                  <Link href="/lounge/tastings">
                    <Button variant="outline" size="sm" className="mt-4">{t('loungeNav.sessions')}</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="border-border/40 bg-card/50">
            <CardContent className="p-6">
              <h2 className="text-lg font-serif font-bold text-primary mb-4 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                {t('loungeNav.loungeHomeHighlights')}
              </h2>
              {lastTasting ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-amber-900/10 border border-amber-800/10">
                    <p className="text-xs text-amber-500/70 uppercase tracking-wider mb-1">{t('loungeNav.loungeHomeTopWhisky')}</p>
                    <p className="text-base font-serif font-semibold text-primary">{lastTasting.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(lastTasting.date).toLocaleDateString()}
                      {lastTasting.location ? ` · ${lastTasting.location}` : ""}
                    </p>
                  </div>
                  {recentTastings.length > 1 && (
                    <div className="space-y-2">
                      {recentTastings.slice(1).map((tasting: any) => (
                        <Link key={tasting.id} href={`/lounge/tastings/${tasting.id}`}>
                          <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-amber-900/5 transition-colors cursor-pointer">
                            <Wine className="w-4 h-4 text-amber-500/50" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{tasting.title}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(tasting.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground text-sm">
                  <p className="text-center">{t('loungeNav.noRecentTastings')}</p>
                  <Link href="/lounge/tastings">
                    <Button variant="outline" size="sm" className="mt-4">{t('loungeNav.sessions')}</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {upcomingTastings.length > 0 && (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card className="border-border/40 bg-card/50">
            <CardContent className="p-6">
              <h2 className="text-lg font-serif font-bold text-primary mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500" />
                {t('loungeNav.calendar')}
              </h2>
              <div className="space-y-3">
                {upcomingTastings.map((tasting: any) => (
                  <Link key={tasting.id} href={`/lounge/tastings/${tasting.id}`}>
                    <div className="flex items-center gap-4 p-4 rounded-xl border border-border/20 hover:bg-amber-900/5 transition-colors cursor-pointer">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-amber-900/20 flex items-center justify-center">
                        <Wine className="w-5 h-5 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-serif font-semibold truncate">{tasting.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tasting.date).toLocaleDateString()} 
                          {tasting.location ? ` · ${tasting.location}` : ""}
                        </p>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-amber-500 font-semibold">
                        {tasting.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

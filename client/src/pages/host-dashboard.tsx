import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { hostDashboardApi } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { GlassWater, Users, Wine, Star, Calendar, Trophy, LayoutDashboard } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface HostSummary {
  totalTastings: number;
  totalParticipants: number;
  totalWhiskies: number;
  averageScores: { nose: number; taste: number; finish: number; balance: number; overall: number };
  topWhiskies: { name: string; distillery: string; averageScore: number; tastingTitle: string }[];
  recentTastings: { id: string; title: string; date: string; status: string; participantCount: number }[];
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.4 } }),
};

const statusColors: Record<string, string> = {
  draft: "bg-yellow-600/20 text-yellow-400 border-yellow-600/30",
  open: "bg-green-600/20 text-green-400 border-green-600/30",
  closed: "bg-red-600/20 text-red-400 border-red-600/30",
  reveal: "bg-purple-600/20 text-purple-400 border-purple-600/30",
  archived: "bg-muted text-muted-foreground border-border",
};

export default function HostDashboard() {
  const { t, i18n } = useTranslation();
  const { currentParticipant } = useAppStore();
  const isDE = i18n.language === "de";

  const { data: summary, isLoading } = useQuery<HostSummary>({
    queryKey: ["host-dashboard", currentParticipant?.id],
    queryFn: () => hostDashboardApi.getSummary(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  if (!currentParticipant) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="host-dashboard-login-required">
        <p className="text-muted-foreground font-serif">{t("hostDashboard.loginRequired")}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8" data-testid="host-dashboard-loading">
        <div className="h-8 w-56 bg-card/50 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-card/50 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-card/50 rounded-lg animate-pulse" />
      </div>
    );
  }

  const hasData = summary && summary.totalTastings > 0;

  const chartData = summary?.averageScores
    ? [
        { dimension: isDE ? "Nase" : "Nose", value: summary.averageScores.nose },
        { dimension: isDE ? "Geschmack" : "Taste", value: summary.averageScores.taste },
        { dimension: isDE ? "Abgang" : "Finish", value: summary.averageScores.finish },
        { dimension: "Balance", value: summary.averageScores.balance },
        { dimension: isDE ? "Gesamt" : "Overall", value: summary.averageScores.overall },
      ]
    : [];

  const statCards = [
    { key: "totalTastings", value: summary?.totalTastings ?? 0, icon: Calendar, color: "text-amber-400" },
    { key: "totalParticipants", value: summary?.totalParticipants ?? 0, icon: Users, color: "text-blue-400" },
    { key: "totalWhiskies", value: summary?.totalWhiskies ?? 0, icon: Wine, color: "text-rose-400" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 min-w-0 overflow-x-hidden" data-testid="host-dashboard-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3 mb-2">
          <LayoutDashboard className="w-7 h-7 text-primary" />
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-host-dashboard-title">
            {t("hostDashboard.title")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8" data-testid="text-host-dashboard-subtitle">
          {t("hostDashboard.subtitle")}
        </p>

        {!hasData ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 text-muted-foreground"
            data-testid="host-dashboard-empty"
          >
            <GlassWater className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-serif text-lg mb-2">{t("hostDashboard.emptyTitle")}</p>
            <p className="text-sm">{t("hostDashboard.emptyMessage")}</p>
          </motion.div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {statCards.map((card, i) => (
                <motion.div
                  key={card.key}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  className="bg-card rounded-lg border border-border/40 p-5 flex items-center gap-4"
                  data-testid={`stat-card-${card.key}`}
                >
                  <card.icon className={`w-10 h-10 ${card.color} shrink-0`} />
                  <div>
                    <p className="text-2xl font-serif font-bold text-foreground" data-testid={`stat-value-${card.key}`}>
                      {card.value}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(`hostDashboard.${card.key}`)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {chartData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="bg-card rounded-lg border border-border/40 p-6"
                data-testid="host-dashboard-scores-chart"
              >
                <h2 className="text-lg font-serif font-semibold mb-1">{t("hostDashboard.averageScores")}</h2>
                <p className="text-xs text-muted-foreground mb-4">{t("hostDashboard.averageScoresSubtitle")}</p>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis
                        dataKey="dimension"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontFamily: "serif" }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontFamily: "serif",
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                        formatter={(value: number) => [value.toFixed(1), isDE ? "Durchschnitt" : "Average"]}
                      />
                      <Bar dataKey="value" fill="#c8a864" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            {summary?.topWhiskies && summary.topWhiskies.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="bg-card rounded-lg border border-border/40 p-6"
                data-testid="host-dashboard-top-whiskies"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-serif font-semibold">{t("hostDashboard.topWhiskies")}</h2>
                </div>
                <div className="space-y-3">
                  {summary.topWhiskies.map((whisky, i) => (
                    <div
                      key={`${whisky.name}-${i}`}
                      className="flex items-center gap-4 py-2 border-b border-border/20 last:border-0"
                      data-testid={`top-whisky-${i}`}
                    >
                      <span className="text-lg font-serif font-bold text-primary/60 w-8">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" data-testid={`top-whisky-name-${i}`}>
                          {whisky.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[whisky.distillery, whisky.tastingTitle].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span className="text-lg font-serif font-bold text-primary" data-testid={`top-whisky-score-${i}`}>
                          {whisky.averageScore.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {summary?.recentTastings && summary.recentTastings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="bg-card rounded-lg border border-border/40 p-6"
                data-testid="host-dashboard-recent-tastings"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-serif font-semibold">{t("hostDashboard.recentTastings")}</h2>
                </div>
                <div className="space-y-3">
                  {summary.recentTastings.map((tasting) => (
                    <div
                      key={tasting.id}
                      className="flex items-center gap-4 py-2 border-b border-border/20 last:border-0"
                      data-testid={`recent-tasting-${tasting.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" data-testid={`recent-tasting-title-${tasting.id}`}>
                          {tasting.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tasting.date).toLocaleDateString(isDE ? "de-DE" : "en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 ${statusColors[tasting.status] ?? ""}`}
                        data-testid={`recent-tasting-status-${tasting.id}`}
                      >
                        {t(`session.status.${tasting.status}`)}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Users className="w-3.5 h-3.5" />
                        <span data-testid={`recent-tasting-participants-${tasting.id}`}>{tasting.participantCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

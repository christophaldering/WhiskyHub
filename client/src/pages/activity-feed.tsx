import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { activityApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";
import { Rss, NotebookPen, Wine, Star } from "lucide-react";
import { Link } from "wouter";
import { GuestPreview } from "@/components/guest-preview";

interface ActivityItem {
  type: "journal" | "tasting";
  participantId: string;
  participantName: string;
  timestamp: string;
  details: Record<string, any>;
}

function formatRelativeTime(timestamp: string, isDE: boolean): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return isDE ? "Gerade eben" : "Just now";
  if (diffMin < 60) return isDE ? `vor ${diffMin} Min.` : `${diffMin}m ago`;
  if (diffHrs < 24) return isDE ? `vor ${diffHrs} Std.` : `${diffHrs}h ago`;
  if (diffDays < 7) return isDE ? `vor ${diffDays} Tagen` : `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString(isDE ? "de-DE" : "en-US", { month: "short", day: "numeric" });
}

export default function ActivityFeed() {
  const { t, i18n } = useTranslation();
  const { currentParticipant } = useAppStore();
  const isDE = i18n.language === "de";

  const { data, isLoading } = useQuery<{ activities: ActivityItem[] }>({
    queryKey: ["friend-activity", currentParticipant?.id],
    queryFn: () => activityApi.getFriendActivity(currentParticipant!.id),
    enabled: !!currentParticipant,
    refetchInterval: 60000,
  });

  if (!currentParticipant) {
    return (
      <GuestPreview featureTitle={t("activityFeed.title")} featureDescription={t("guestPreview.activity")}>
        <div className="space-y-4">
          <h1 className="text-2xl font-serif font-bold">{t("activityFeed.title")}</h1>
          <div className="space-y-3">
            {[{user: "Alex M.", action: "rated Ardbeg Uigeadail", score: "9.2", time: "2h ago"}, {user: "Sarah K.", action: "joined Highland Evening tasting", score: "", time: "5h ago"}, {user: "Tom B.", action: "added Lagavulin 16 to wishlist", score: "", time: "1d ago"}].map((a, i) => (
              <div key={i} className="bg-card rounded-xl border p-4 flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-serif text-primary text-sm font-semibold">{a.user[0]}</div>
                <div className="flex-1"><div className="text-sm"><span className="font-semibold">{a.user}</span> {a.action} {a.score && <span className="text-primary font-serif font-bold ml-1">{a.score}</span>}</div><div className="text-xs text-muted-foreground">{a.time}</div></div>
              </div>
            ))}
          </div>
        </div>
      </GuestPreview>
    );
  }

  const activities = data?.activities || [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 min-w-0 overflow-x-hidden" data-testid="activity-feed-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3 mb-2">
          <Rss className="w-7 h-7 text-primary" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-feed-title">
            {t("activityFeed.title")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">{t("activityFeed.subtitle")}</p>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-card/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Rss className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-serif">{t("activityFeed.empty")}</p>
            <p className="text-xs mt-2">{t("activityFeed.emptyHint")}</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border/30" />
            <div className="space-y-1">
              {activities.map((activity, index) => (
                <motion.div
                  key={`${activity.type}-${activity.participantId}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  className="relative flex gap-4 pl-0"
                  data-testid={`card-activity-${index}`}
                >
                  <div className="relative z-10 mt-3 flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-card border border-border/40 flex items-center justify-center">
                      {activity.type === "journal" ? (
                        <NotebookPen className="w-4 h-4 text-primary/70" />
                      ) : (
                        <Wine className="w-4 h-4 text-primary/70" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 py-3 min-w-0">
                    <div className="bg-card rounded-lg border border-border/40 p-4 hover:border-primary/20 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-serif font-semibold text-foreground">{activity.participantName}</span>
                        <span className="text-[10px] text-muted-foreground/60">{formatRelativeTime(activity.timestamp, isDE)}</span>
                      </div>
                      {activity.type === "journal" ? (
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {isDE ? "Hat einen Tagebucheintrag geschrieben" : "Wrote a journal entry"}
                          </p>
                          <p className="text-sm font-medium mt-1 truncate">{activity.details.title}</p>
                          {activity.details.whiskyName && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {activity.details.whiskyName}
                              {activity.details.distillery ? ` · ${activity.details.distillery}` : ""}
                            </p>
                          )}
                          {activity.details.personalScore && (
                            <div className="flex items-center gap-1 mt-1.5">
                              <Star className="w-3 h-3 text-primary/60 fill-primary/40" />
                              <span className="text-xs font-serif font-bold text-primary/70">{activity.details.personalScore}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {isDE ? "Nimmt an einem Tasting teil" : "Joined a tasting"}
                          </p>
                          <Link href={`/tasting/${activity.details.tastingId}`}>
                            <p className="text-sm font-medium mt-1 truncate hover:text-primary transition-colors cursor-pointer">
                              {activity.details.title}
                            </p>
                          </Link>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {activity.details.date} · {activity.details.location}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

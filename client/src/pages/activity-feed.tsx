import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { activityApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";
import { Rss, NotebookPen, Wine, Star } from "lucide-react";
import { Link } from "wouter";
import { GuestPreview } from "@/components/guest-preview";
import SimpleShell from "@/components/simple/simple-shell";
import { c, cardStyle, pageTitleStyle, pageSubtitleStyle } from "@/lib/theme";
import type { TFunction } from "i18next";

interface ActivityItem {
  type: "journal" | "tasting";
  participantId: string;
  participantName: string;
  timestamp: string;
  details: Record<string, any>;
}

function formatRelativeTime(timestamp: string, t: TFunction, language: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return t("activityFeed.justNow");
  if (diffMin < 60) return t("activityFeed.minutesAgo", { count: diffMin });
  if (diffHrs < 24) return t("activityFeed.hoursAgo", { count: diffHrs });
  if (diffDays < 7) return t("activityFeed.daysAgo", { count: diffDays });
  return new Date(timestamp).toLocaleDateString(language === "de" ? "de-DE" : "en-US", { month: "short", day: "numeric" });
}

export default function ActivityFeed() {
  const { t, i18n } = useTranslation();
  const { currentParticipant } = useAppStore();

  const { data, isLoading } = useQuery<{ activities: ActivityItem[] }>({
    queryKey: ["friend-activity", currentParticipant?.id],
    queryFn: () => activityApi.getFriendActivity(currentParticipant!.id),
    enabled: !!currentParticipant,
    refetchInterval: 60000,
  });

  if (!currentParticipant) {
    return (
      <SimpleShell maxWidth={700}>
        <GuestPreview featureTitle={t("activityFeed.title")} featureDescription={t("guestPreview.activity")}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h1 style={{ ...pageTitleStyle }}>{t("activityFeed.title")}</h1>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[{user: "Alex M.", action: "rated Ardbeg Uigeadail", score: "9.2", time: "2h ago"}, {user: "Sarah K.", action: "joined Highland Evening tasting", score: "", time: "5h ago"}, {user: "Tom B.", action: "added Lagavulin 16 to wishlist", score: "", time: "1d ago"}].map((a, i) => (
                <div key={i} style={{ ...cardStyle, padding: 16, display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${c.accent}18`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display', Georgia, serif", color: c.accent, fontSize: 14, fontWeight: 600 }}>{a.user[0]}</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 14, color: c.text }}><span style={{ fontWeight: 600 }}>{a.user}</span> {a.action} {a.score && <span style={{ color: c.accent, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, marginLeft: 4 }}>{a.score}</span>}</div><div style={{ fontSize: 12, color: c.muted }}>{a.time}</div></div>
                </div>
              ))}
            </div>
          </div>
        </GuestPreview>
      </SimpleShell>
    );
  }

  const activities = data?.activities || [];

  return (
    <SimpleShell maxWidth={700}>
    <div style={{ minWidth: 0, overflowX: "hidden" }} data-testid="activity-feed-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <Rss style={{ width: 28, height: 28, color: c.accent }} />
          <h1 style={{ ...pageTitleStyle, color: c.accent }} data-testid="text-feed-title">
            {t("activityFeed.title")}
          </h1>
        </div>
        <p style={{ ...pageSubtitleStyle, marginBottom: 32 }}>{t("activityFeed.subtitle")}</p>

        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ height: 64, background: `${c.card}80`, borderRadius: 8 }} />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 0", color: c.muted }}>
            <Rss style={{ width: 48, height: 48, margin: "0 auto 16px", opacity: 0.3, display: "block" }} />
            <p style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{t("activityFeed.empty")}</p>
            <p style={{ fontSize: 12, marginTop: 8 }}>{t("activityFeed.emptyHint")}</p>
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 19, top: 0, bottom: 0, width: 1, background: `${c.border}4D` }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {activities.map((activity, index) => (
                <motion.div
                  key={`${activity.type}-${activity.participantId}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  style={{ position: "relative", display: "flex", gap: 16, paddingLeft: 0 }}
                  data-testid={`card-activity-${index}`}
                >
                  <div style={{ position: "relative", zIndex: 10, marginTop: 12, flexShrink: 0 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: c.card, border: `1px solid ${c.border}66`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {activity.type === "journal" ? (
                        <NotebookPen style={{ width: 16, height: 16, color: `${c.accent}B3` }} />
                      ) : (
                        <Wine style={{ width: 16, height: 16, color: `${c.accent}B3` }} />
                      )}
                    </div>
                  </div>
                  <div style={{ flex: 1, padding: "12px 0", minWidth: 0 }}>
                    <div style={{ background: c.card, borderRadius: 8, border: `1px solid ${c.border}66`, padding: 16, transition: "border-color 0.2s" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, color: c.text }}>{activity.participantName}</span>
                        <span style={{ fontSize: 10, color: `${c.muted}99` }}>{formatRelativeTime(activity.timestamp, t, i18n.language)}</span>
                      </div>
                      {activity.type === "journal" ? (
                        <div>
                          <p style={{ fontSize: 12, color: c.muted }}>
                            {t("activityFeed.wroteJournalEntry")}
                          </p>
                          <p style={{ fontSize: 14, fontWeight: 500, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: c.text }}>{activity.details.title}</p>
                          {activity.details.whiskyName && (
                            <p style={{ fontSize: 12, color: c.muted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {activity.details.whiskyName}
                              {activity.details.distillery ? ` · ${activity.details.distillery}` : ""}
                            </p>
                          )}
                          {activity.details.personalScore && (
                            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
                              <Star style={{ width: 12, height: 12, color: `${c.accent}99`, fill: `${c.accent}66` }} />
                              <span style={{ fontSize: 12, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: `${c.accent}B3` }}>{activity.details.personalScore}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <p style={{ fontSize: 12, color: c.muted }}>
                            {t("activityFeed.joinedTasting")}
                          </p>
                          <Link href={`/tasting/${activity.details.tastingId}`}>
                            <p style={{ fontSize: 14, fontWeight: 500, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: c.text, cursor: "pointer", transition: "color 0.2s" }}>
                              {activity.details.title}
                            </p>
                          </Link>
                          <p style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>
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
    </SimpleShell>
  );
}

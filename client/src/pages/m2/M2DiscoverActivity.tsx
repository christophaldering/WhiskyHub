import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { v } from "@/lib/themeVars";
import { getSession, useSession } from "@/lib/session";
import { activityApi } from "@/lib/api";
import M2BackButton from "@/components/m2/M2BackButton";
import { Rss, NotebookPen, Wine, Star } from "lucide-react";
import { Link } from "wouter";
import type { TFunction } from "i18next";

interface ActivityItem {
  type: "journal" | "tasting";
  participantId: string;
  participantName: string;
  timestamp: string;
  details: Record<string, any>;
}

function relTime(ts: string, t: TFunction, lang: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return t("activityFeed.justNow", "just now");
  if (mins < 60) return t("activityFeed.minutesAgo", "{{count}}m ago", { count: mins });
  if (hrs < 24) return t("activityFeed.hoursAgo", "{{count}}h ago", { count: hrs });
  if (days < 7) return t("activityFeed.daysAgo", "{{count}}d ago", { count: days });
  return new Date(ts).toLocaleDateString(lang === "de" ? "de-DE" : "en-US", { month: "short", day: "numeric" });
}

const card: React.CSSProperties = { background: v.card, borderRadius: 12, border: `1px solid ${v.border}`, padding: 14 };

export default function M2DiscoverActivity() {
  const { t, i18n } = useTranslation();
  const session = useSession();
  const pid = session.pid;

  const { data, isLoading } = useQuery<{ activities: ActivityItem[] }>({
    queryKey: ["friend-activity", pid],
    queryFn: () => activityApi.getFriendActivity(pid!),
    enabled: !!pid,
    refetchInterval: 60000,
  });

  const activities = data?.activities || [];

  return (
    <div style={{ padding: "16px 16px 32px", maxWidth: 600, margin: "0 auto" }} data-testid="m2-discover-activity-page">
      <M2BackButton />

      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0 4px" }}>
        <Rss style={{ width: 22, height: 22, color: v.accent }} />
        <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: v.text, margin: 0 }} data-testid="text-m2-activity-title">
          {t("activityFeed.title", "Activity Feed")}
        </h1>
      </div>
      <p style={{ fontSize: 13, color: v.muted, margin: "0 0 20px" }}>{t("activityFeed.subtitle", "See what your friends are up to")}</p>

      {!pid && (
        <div style={{ ...card, textAlign: "center", padding: 40 }}>
          <Rss style={{ width: 40, height: 40, color: v.mutedLight, margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontSize: 14, color: v.muted }} data-testid="m2-activity-signin">{t("m2.discover.activitySignInPrompt", "Sign in to see your friends' activity.")}</p>
        </div>
      )}

      {pid && isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => <div key={i} style={{ height: 60, background: v.elevated, borderRadius: 10, animation: "pulse 1.5s ease-in-out infinite" }} />)}
        </div>
      )}

      {pid && !isLoading && activities.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <Rss style={{ width: 40, height: 40, color: v.mutedLight, margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontSize: 14, color: v.muted, fontFamily: "'Playfair Display', serif" }}>{t("activityFeed.empty", "No activity yet")}</p>
          <p style={{ fontSize: 12, color: v.mutedLight, marginTop: 6 }}>{t("activityFeed.emptyHint", "Add friends to see their activity here")}</p>
        </div>
      )}

      {activities.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {activities.map((a, i) => (
            <div key={`${a.type}-${a.participantId}-${i}`} style={card} data-testid={`m2-activity-${i}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: v.elevated, border: `1px solid ${v.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {a.type === "journal" ? <NotebookPen style={{ width: 15, height: 15, color: v.accent }} /> : <Wine style={{ width: 15, height: 15, color: v.accent }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: v.text, fontFamily: "'Playfair Display', serif" }}>{a.participantName}</span>
                    <span style={{ fontSize: 10, color: v.mutedLight }}>{relTime(a.timestamp, t, i18n.language)}</span>
                  </div>
                  {a.type === "journal" ? (
                    <div>
                      <p style={{ fontSize: 11, color: v.muted, margin: 0 }}>{t("activityFeed.wroteJournalEntry", "wrote a journal entry")}</p>
                      <p style={{ fontSize: 13, fontWeight: 500, color: v.text, margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.details.title}</p>
                      {a.details.personalScore && (
                        <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 4 }}>
                          <Star style={{ width: 11, height: 11, color: v.accent }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: v.accent }}>{a.details.personalScore}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: 11, color: v.muted, margin: 0 }}>{t("activityFeed.joinedTasting", "joined a tasting")}</p>
                      <p style={{ fontSize: 13, fontWeight: 500, color: v.text, margin: "2px 0 0" }}>{a.details.title}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

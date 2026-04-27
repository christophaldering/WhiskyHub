import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useBackNavigation } from "@/labs/hooks/useBackNavigation";
import { activityApi } from "@/lib/api";
import { getSession } from "@/lib/session";
import { stripGuestSuffix } from "@/lib/utils";
import { FileText, Wine, Star, Activity, ChevronLeft } from "lucide-react";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import InsightCard from "@/labs/components/InsightCard";
import { selectFeedInsights, type FeedEngineDram, type SoloEngineDna, type SoloEngineDnaAxis } from "@/labs/insights/engine";
import type { Insight } from "@/labs/insights/types";

interface ActivityItem {
  type: "journal" | "tasting";
  participantId: string;
  participantName: string;
  timestamp: string;
  details: Record<string, unknown>;
}

export default function LabsActivity() {
  const { t } = useTranslation();
  const goBackToCircle = useBackNavigation("/labs/circle");
  const session = getSession();
  const pid = session.pid;

  function relTime(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return t("labs.activity.justNow", "just now");
    if (mins < 60) return t("labs.activity.mAgo", "{{m}}m ago", { m: mins });
    if (hrs < 24) return t("labs.activity.hAgo", "{{h}}h ago", { h: hrs });
    if (days < 7) return t("labs.activity.dAgo", "{{d}}d ago", { d: days });
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  const { data, isLoading } = useQuery<{ activities: ActivityItem[] }>({
    queryKey: ["friend-activity", pid],
    queryFn: () => activityApi.getFriendActivity(pid!),
    enabled: !!pid,
    refetchInterval: 60000,
  });

  const activities = data?.activities || [];

  const ownDramsQuery = useQuery<FeedEngineDram[]>({
    queryKey: ["journal-list", pid, "feed-insights"],
    queryFn: async () => {
      const res = await fetch(`/api/journal/${pid}`, {
        headers: { "x-participant-id": pid || "" },
      });
      if (!res.ok) return [];
      const json = await res.json();
      const entries = Array.isArray(json) ? json : Array.isArray(json?.entries) ? json.entries : [];
      return entries.map((e: Record<string, unknown>) => ({
        id: String(e.id ?? ""),
        title: typeof e.title === "string" ? e.title : null,
        region: typeof e.region === "string" ? e.region : null,
        personalScore: typeof e.personalScore === "number" ? e.personalScore : (typeof e.overallScore === "number" ? e.overallScore : null),
        createdAt: typeof e.createdAt === "string" ? e.createdAt : null,
      }));
    },
    enabled: !!pid,
    staleTime: 60000,
  });

  const dnaQuery = useQuery<SoloEngineDna | null>({
    queryKey: ["whisky-dna", pid, "feed-insights"],
    queryFn: async () => {
      const res = await fetch(`/api/participants/${pid}/whisky-dna`, {
        headers: { "x-participant-id": pid || "" },
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!pid,
    staleTime: 60000,
  });

  const insights: Insight[] = useMemo(() => {
    if (!pid) return [];
    return selectFeedInsights({
      drams: ownDramsQuery.data ?? [],
      dnaAxes: (dnaQuery.data?.axes ?? []) as SoloEngineDnaAxis[],
      t,
    });
  }, [pid, ownDramsQuery.data, dnaQuery.data, t]);

  type FeedNode =
    | { kind: "activity"; key: string; activity: ActivityItem; sortKey: number }
    | { kind: "insight"; key: string; insight: Insight; sortKey: number };

  const feed: FeedNode[] = useMemo(() => {
    const nodes: FeedNode[] = activities.map((a, i) => ({
      kind: "activity",
      key: `act-${a.type}-${a.participantId}-${i}`,
      activity: a,
      sortKey: new Date(a.timestamp).getTime() || (Date.now() - i * 1000),
    }));
    const now = Date.now();
    insights.forEach((ins, i) => {
      nodes.push({
        kind: "insight",
        key: `ins-${ins.id}`,
        insight: ins,
        sortKey: now - i * 90000,
      });
    });
    nodes.sort((a, b) => b.sortKey - a.sortKey);
    return nodes;
  }, [activities, insights]);

  return (
    <div className="labs-page labs-fade-in" data-testid="labs-activity-page">
      <button
        onClick={goBackToCircle}
        className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4"
        style={{ color: "var(--labs-text-muted)" }}
        data-testid="labs-activity-back"
      >
        <ChevronLeft className="w-4 h-4" /> {t("labs.activity.backCircle", "Circle")}
      </button>

      <div className="flex items-center gap-2.5 mb-1">
        <Activity className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
        <h1 className="labs-h2" style={{ color: "var(--labs-text)" }} data-testid="labs-activity-title">
          {t("labs.activity.title", "Activity Feed")}
        </h1>
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)" }}>
        {t("labs.activity.subtitle", "See what your friends are up to")}
      </p>

      {!pid && (
        <AuthGateMessage
          icon={<Activity className="w-10 h-10" style={{ color: "var(--labs-text-muted)", opacity: 0.75 }} />}
          title={t("authGate.activity.title")}
          bullets={[t("authGate.activity.bullet1"), t("authGate.activity.bullet2"), t("authGate.activity.bullet3")]}
          className="labs-empty"
          compact
        />
      )}

      {pid && isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="labs-card p-4" style={{ opacity: 0.75 }}>
              <div className="h-4 rounded animate-pulse" style={{ background: "var(--labs-border)", width: "60%" }} />
              <div className="h-3 mt-2 rounded animate-pulse" style={{ background: "var(--labs-border)", width: "40%" }} />
            </div>
          ))}
        </div>
      )}

      {pid && !isLoading && feed.length === 0 && (
        <div className="labs-empty" style={{ minHeight: "30vh" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--labs-accent-muted)" }}>
            <Activity className="w-7 h-7" style={{ color: "var(--labs-accent)" }} />
          </div>
          <p className="text-sm font-semibold mb-2" style={{ color: "var(--labs-text)" }}>{t("labs.activity.noActivity", "No activity yet")}</p>
          <p className="text-xs" style={{ color: "var(--labs-text-muted)", maxWidth: 280 }}>
            {t("labs.activity.noActivityDesc", "Add friends to see their activity here")}
          </p>
        </div>
      )}

      {feed.length > 0 && (
        <div className="space-y-2">
          {feed.map((node, i) => node.kind === "insight" ? (
            <div key={node.key} data-testid={`labs-activity-insight-${i}`}>
              <InsightCard insight={node.insight} size="standard" />
            </div>
          ) : (() => {
            const a = node.activity;
            return (
            <div key={node.key} className="labs-card p-4 flex gap-3" data-testid={`labs-activity-item-${i}`}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--labs-accent-muted)" }}>
                {a.type === "journal" ? (
                  <FileText className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                ) : (
                  <Wine className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="labs-serif text-sm font-semibold truncate" style={{ color: "var(--labs-text)" }}>
                    {stripGuestSuffix(a.participantName)}
                  </span>
                  <span className="text-[11px] flex-shrink-0" style={{ color: "var(--labs-text-muted)" }}>
                    {relTime(a.timestamp)}
                  </span>
                </div>
                {a.type === "journal" ? (
                  <div>
                    <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{t("labs.activity.loggedDram", "logged a dram")}</p>
                    <p className="text-xs font-medium truncate mt-0.5" style={{ color: "var(--labs-text)" }}>
                      {String(a.details.title ?? "")}
                    </p>
                    {a.details.personalScore && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3 h-3" style={{ color: "var(--labs-accent)" }} />
                        <span className="text-xs font-bold" style={{ color: "var(--labs-accent)" }}>
                          {String(a.details.personalScore)}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{t("labs.activity.joinedTasting", "joined a tasting")}</p>
                    <p className="text-xs font-medium mt-0.5" style={{ color: "var(--labs-text)" }}>
                      {a.details.title as string}
                    </p>
                  </div>
                )}
              </div>
            </div>
            );
          })())}
        </div>
      )}
    </div>
  );
}

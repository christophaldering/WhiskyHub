import { useQuery } from "@tanstack/react-query";
import { activityApi } from "@/lib/api";
import { getSession } from "@/lib/session";
import { FileText, Wine, Star, Activity, ArrowLeft } from "lucide-react";

interface ActivityItem {
  type: "journal" | "tasting";
  participantId: string;
  participantName: string;
  timestamp: string;
  details: Record<string, unknown>;
}

function relTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function LabsActivity() {
  const session = getSession();
  const pid = session.pid;

  const { data, isLoading } = useQuery<{ activities: ActivityItem[] }>({
    queryKey: ["friend-activity", pid],
    queryFn: () => activityApi.getFriendActivity(pid!),
    enabled: !!pid,
    refetchInterval: 60000,
  });

  const activities = data?.activities || [];

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto labs-fade-in" data-testid="labs-activity-page">
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-1.5 text-xs mb-4"
        style={{ color: "var(--labs-text-muted)", background: "none", border: "none", cursor: "pointer" }}
        data-testid="labs-activity-back"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      <div className="flex items-center gap-2.5 mb-1">
        <Activity className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
        <h1 className="labs-serif text-xl font-semibold" style={{ color: "var(--labs-text)" }} data-testid="labs-activity-title">
          Activity Feed
        </h1>
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)" }}>
        See what your friends are up to
      </p>

      {!pid && (
        <div className="labs-empty" style={{ minHeight: "30vh" }}>
          <Activity className="w-10 h-10 mb-3" style={{ color: "var(--labs-text-muted)", opacity: 0.3 }} />
          <p className="text-sm" style={{ color: "var(--labs-text-muted)" }} data-testid="labs-activity-signin">
            Sign in to see your friends' activity.
          </p>
        </div>
      )}

      {pid && isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="labs-card p-4" style={{ opacity: 0.5 }}>
              <div className="h-4 rounded animate-pulse" style={{ background: "var(--labs-border)", width: "60%" }} />
              <div className="h-3 mt-2 rounded animate-pulse" style={{ background: "var(--labs-border)", width: "40%" }} />
            </div>
          ))}
        </div>
      )}

      {pid && !isLoading && activities.length === 0 && (
        <div className="labs-empty" style={{ minHeight: "30vh" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--labs-accent-muted)" }}>
            <Activity className="w-7 h-7" style={{ color: "var(--labs-accent)" }} />
          </div>
          <p className="text-sm font-semibold mb-2" style={{ color: "var(--labs-text)" }}>No activity yet</p>
          <p className="text-xs" style={{ color: "var(--labs-text-muted)", maxWidth: 280 }}>
            Add friends to see their activity here
          </p>
        </div>
      )}

      {activities.length > 0 && (
        <div className="space-y-2">
          {activities.map((a, i) => (
            <div key={`${a.type}-${a.participantId}-${i}`} className="labs-card p-4 flex gap-3" data-testid={`labs-activity-item-${i}`}>
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
                    {a.participantName}
                  </span>
                  <span className="text-[10px] flex-shrink-0" style={{ color: "var(--labs-text-muted)" }}>
                    {relTime(a.timestamp)}
                  </span>
                </div>
                {a.type === "journal" ? (
                  <div>
                    <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>wrote a journal entry</p>
                    <p className="text-xs font-medium truncate mt-0.5" style={{ color: "var(--labs-text)" }}>
                      {a.details.title as string}
                    </p>
                    {a.details.personalScore && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3 h-3" style={{ color: "var(--labs-accent)" }} />
                        <span className="text-xs font-bold" style={{ color: "var(--labs-accent)" }}>
                          {a.details.personalScore as number}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>joined a tasting</p>
                    <p className="text-xs font-medium mt-0.5" style={{ color: "var(--labs-text)" }}>
                      {a.details.title as string}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

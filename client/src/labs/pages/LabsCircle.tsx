import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { Users, Heart, Wine, ChevronRight, Activity, UserPlus } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { communityApi, friendsApi, activityApi, tastingApi } from "@/lib/api";
import { getSession } from "@/lib/session";

type Tab = "people" | "activity";

export default function LabsCircle() {
  const { currentParticipant } = useAppStore();
  const session = getSession();
  const pid = currentParticipant?.id || session.pid;
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("people");

  const { data: twins, isLoading: twinsLoading } = useQuery({
    queryKey: ["taste-twins", pid],
    queryFn: () => communityApi.getTasteTwins(pid!),
    enabled: !!pid,
  });

  const { data: friends, isLoading: friendsLoading } = useQuery({
    queryKey: ["friends", pid],
    queryFn: () => friendsApi.getAll(pid!),
    enabled: !!pid,
  });

  const { data: friendActivity, isLoading: activityLoading } = useQuery({
    queryKey: ["friend-activity", pid],
    queryFn: () => activityApi.getFriendActivity(pid!),
    enabled: !!pid,
  });

  const { data: tastings } = useQuery({
    queryKey: ["tastings", pid],
    queryFn: () => tastingApi.getAll(pid),
    enabled: !!pid,
  });

  const recentSharedSessions = tastings
    ?.filter((t: any) => t.status === "archived" || t.status === "reveal")
    ?.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    ?.slice(0, 5) || [];

  if (!pid) {
    return (
      <div className="labs-empty labs-fade-in" style={{ minHeight: "60vh" }}>
        <Users className="w-12 h-12 mb-4" style={{ color: "var(--labs-text-muted)" }} />
        <p className="text-lg font-medium mb-2" style={{ color: "var(--labs-text)" }}>
          Your Circle
        </p>
        <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)" }}>
          Sign in to see people from your tastings
        </p>
        <button
          className="labs-btn-secondary"
          onClick={() => navigate("/labs")}
          data-testid="labs-circle-signin"
        >
          Go to Home
        </button>
      </div>
    );
  }

  const isLoading = twinsLoading || friendsLoading;
  const twinsList: any[] = Array.isArray(twins) ? twins : [];
  const friendsList: any[] = Array.isArray(friends) ? friends : [];
  const activityList: any[] = Array.isArray(friendActivity) ? friendActivity : [];

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto labs-fade-in">
      <h1
        className="labs-serif text-xl font-semibold mb-1"
        data-testid="labs-circle-title"
      >
        Circle
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)" }}>
        People you've shared a dram with
      </p>

      <div className="flex gap-2 mb-6">
        {(["people", "activity"] as const).map((t) => (
          <button
            key={t}
            className="labs-btn-ghost px-4 py-2 rounded-full text-sm transition-all"
            style={{
              background: tab === t ? "var(--labs-accent-muted)" : "var(--labs-surface)",
              color: tab === t ? "var(--labs-accent)" : "var(--labs-text-secondary)",
              border: `1px solid ${tab === t ? "var(--labs-accent)" : "var(--labs-border)"}`,
              fontWeight: tab === t ? 600 : 500,
            }}
            onClick={() => setTab(t)}
            data-testid={`labs-circle-tab-${t}`}
          >
            {t === "people" ? "People" : "Activity"}
            {t === "people" && (twinsList.length + friendsList.length > 0) && (
              <span
                className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
                style={{ background: "var(--labs-accent)", color: "var(--labs-bg)" }}
              >
                {twinsList.length + friendsList.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "people" && (
        <div className="labs-fade-in">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="labs-card p-4" style={{ opacity: 0.5 }}>
                  <div
                    className="h-4 rounded animate-pulse"
                    style={{ background: "var(--labs-border)", width: "60%" }}
                  />
                  <div
                    className="h-3 mt-2 rounded animate-pulse"
                    style={{ background: "var(--labs-border)", width: "40%" }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <>
              {twinsList.length > 0 && (
                <div className="mb-6">
                  <p className="labs-section-label">Taste Twins</p>
                  <div className="space-y-2">
                    {twinsList.slice(0, 8).map((twin: any, idx: number) => (
                      <div
                        key={twin.participantId || idx}
                        className="labs-card labs-card-interactive p-4 flex items-center gap-4"
                        data-testid={`labs-circle-twin-${twin.participantId || idx}`}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: "var(--labs-accent-muted)" }}
                        >
                          <Heart className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--labs-text)" }}>
                            {twin.participantName || twin.name || "Unknown"}
                          </p>
                          <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                            {twin.sharedWhiskies} shared whiskies
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className="labs-badge labs-badge-accent"
                          >
                            {Math.round((twin.correlation ?? twin.similarity ?? 0) * 100)}% match
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {friendsList.length > 0 && (
                <div className="mb-6">
                  <p className="labs-section-label">Friends</p>
                  <div className="space-y-2">
                    {friendsList.map((friend: any, idx: number) => (
                      <div
                        key={friend.id || idx}
                        className="labs-card p-4 flex items-center gap-4"
                        data-testid={`labs-circle-friend-${friend.id || idx}`}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: "var(--labs-info-muted)" }}
                        >
                          <Users className="w-4 h-4" style={{ color: "var(--labs-info)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--labs-text)" }}>
                            {[friend.firstName, friend.lastName].filter(Boolean).join(" ") || friend.name || "Friend"}
                          </p>
                          {friend.email && (
                            <p className="text-xs truncate" style={{ color: "var(--labs-text-muted)" }}>
                              {friend.email}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {twinsList.length === 0 && friendsList.length === 0 && (
                <div className="labs-empty" style={{ minHeight: "30vh" }}>
                  <Users className="w-10 h-10 mb-3" style={{ color: "var(--labs-text-muted)" }} />
                  <p className="text-sm font-medium mb-1" style={{ color: "var(--labs-text-secondary)" }}>
                    No connections yet
                  </p>
                  <p className="text-xs" style={{ color: "var(--labs-text-muted)", maxWidth: 260 }}>
                    Join a tasting to discover your taste twins and build your circle
                  </p>
                </div>
              )}

              {recentSharedSessions.length > 0 && (
                <div>
                  <p className="labs-section-label">Recent Shared Sessions</p>
                  <div className="space-y-2">
                    {recentSharedSessions.map((session: any) => (
                      <div
                        key={session.id}
                        className="labs-card labs-card-interactive p-4 flex items-center gap-4"
                        onClick={() => navigate(`/labs/tastings/${session.id}`)}
                        data-testid={`labs-circle-session-${session.id}`}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: "var(--labs-accent-muted)" }}
                        >
                          <Wine className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--labs-text)" }}>
                            {session.title}
                          </p>
                          <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                            {session.date} · {session.location || ""}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--labs-text-muted)" }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "activity" && (
        <div className="labs-fade-in">
          {activityLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="labs-card p-4" style={{ opacity: 0.5 }}>
                  <div
                    className="h-4 rounded animate-pulse"
                    style={{ background: "var(--labs-border)", width: "70%" }}
                  />
                  <div
                    className="h-3 mt-2 rounded animate-pulse"
                    style={{ background: "var(--labs-border)", width: "50%" }}
                  />
                </div>
              ))}
            </div>
          ) : activityList.length > 0 ? (
            <div className="space-y-2">
              {activityList.slice(0, 20).map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="labs-card p-4 flex items-center gap-4"
                  data-testid={`labs-circle-activity-${idx}`}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: item.type === "journal"
                        ? "var(--labs-success-muted)"
                        : "var(--labs-accent-muted)",
                    }}
                  >
                    {item.type === "journal" ? (
                      <Activity className="w-4 h-4" style={{ color: "var(--labs-success)" }} />
                    ) : (
                      <Wine className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--labs-text)" }}>
                      {item.participantName || "Someone"}
                    </p>
                    <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                      {item.type === "journal"
                        ? `Logged ${item.details?.whiskyName || "a whisky"}`
                        : `Joined ${item.details?.tastingTitle || "a tasting"}`}
                    </p>
                  </div>
                  <span className="text-[10px] flex-shrink-0" style={{ color: "var(--labs-text-muted)" }}>
                    {formatTimeAgo(item.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="labs-empty" style={{ minHeight: "30vh" }}>
              <Activity className="w-10 h-10 mb-3" style={{ color: "var(--labs-text-muted)" }} />
              <p className="text-sm font-medium mb-1" style={{ color: "var(--labs-text-secondary)" }}>
                No activity yet
              </p>
              <p className="text-xs" style={{ color: "var(--labs-text-muted)", maxWidth: 260 }}>
                Activity from your friends and tasting partners will appear here
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(timestamp: string): string {
  if (!timestamp) return "";
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHrs < 24) return `${diffHrs}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

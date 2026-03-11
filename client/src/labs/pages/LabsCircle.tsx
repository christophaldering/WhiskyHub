import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Users, Heart, Wine, ChevronRight, Activity, Star, UserPlus, Calendar, GlassWater } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { communityApi, friendsApi, activityApi, tastingApi, ratingApi } from "@/lib/api";
import { getSession } from "@/lib/session";

type Tab = "people" | "sessions" | "activity";

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

  const sharedSessions = useMemo(() => {
    return (tastings || [])
      .filter((t: any) => t.status === "archived" || t.status === "reveal")
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [tastings]);

  const recentSharedSessions = sharedSessions.slice(0, 8);

  const participantCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of sharedSessions) {
      counts[s.id] = s.participants?.length || s.participantCount || 0;
    }
    return counts;
  }, [sharedSessions]);

  const peopleFromTastings = useMemo(() => {
    const map = new Map<string, { name: string; sharedCount: number; sessions: string[] }>();
    for (const t of sharedSessions) {
      const participants: any[] = t.participants || [];
      for (const p of participants) {
        if (p.id === pid) continue;
        const key = p.id || p.name;
        if (!key) continue;
        const existing = map.get(key);
        if (existing) {
          existing.sharedCount++;
          existing.sessions.push(t.title || t.id);
        } else {
          map.set(key, {
            name: p.name || "Unknown",
            sharedCount: 1,
            sessions: [t.title || t.id],
          });
        }
      }
    }
    return Array.from(map.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.sharedCount - a.sharedCount);
  }, [sharedSessions, pid]);

  if (!pid) {
    return (
      <div className="labs-empty labs-fade-in" style={{ minHeight: "60vh" }}>
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: "var(--labs-accent-muted)" }}
        >
          <Users className="w-8 h-8" style={{ color: "var(--labs-accent)" }} />
        </div>
        <p className="text-lg font-semibold mb-2" style={{ color: "var(--labs-text)" }}>
          Your Circle
        </p>
        <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)", maxWidth: 280 }}>
          Sign in to discover people from your tastings, find taste twins, and track activity
        </p>
        <button
          className="labs-btn-primary"
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

  const tabCounts: Record<Tab, number> = {
    people: twinsList.length + friendsList.length + peopleFromTastings.length,
    sessions: recentSharedSessions.length,
    activity: activityList.length,
  };

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

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {(["people", "sessions", "activity"] as const).map((t) => (
          <button
            key={t}
            className="labs-btn-ghost px-4 py-2 rounded-full text-sm transition-all whitespace-nowrap"
            style={{
              background: tab === t ? "var(--labs-accent-muted)" : "var(--labs-surface)",
              color: tab === t ? "var(--labs-accent)" : "var(--labs-text-secondary)",
              border: `1px solid ${tab === t ? "var(--labs-accent)" : "var(--labs-border)"}`,
              fontWeight: tab === t ? 600 : 500,
            }}
            onClick={() => setTab(t)}
            data-testid={`labs-circle-tab-${t}`}
          >
            {t === "people" ? "People" : t === "sessions" ? "Sessions" : "Activity"}
            {tabCounts[t] > 0 && (
              <span
                className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
                style={{
                  background: tab === t ? "var(--labs-accent)" : "var(--labs-border)",
                  color: tab === t ? "var(--labs-bg)" : "var(--labs-text-secondary)",
                }}
              >
                {tabCounts[t]}
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
                <div className="mb-8">
                  <p className="labs-section-label flex items-center gap-2">
                    <Heart className="w-3.5 h-3.5" />
                    Taste Twins
                  </p>
                  <div className="space-y-2">
                    {twinsList.slice(0, 8).map((twin: any, idx: number) => {
                      const matchPct = Math.round((twin.correlation ?? twin.similarity ?? 0) * 100);
                      const sharedWhiskies = twin.sharedWhiskies || 0;
                      const sharedSessions = twin.sharedSessions || twin.sharedTastings || 0;
                      return (
                        <div
                          key={twin.participantId || idx}
                          className="labs-card labs-card-interactive p-4"
                          data-testid={`labs-circle-twin-${twin.participantId || idx}`}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ background: "var(--labs-accent-muted)" }}
                            >
                              <Heart className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate" style={{ color: "var(--labs-text)" }}>
                                {twin.participantName || twin.name || "Unknown"}
                              </p>
                              <div className="flex items-center gap-3 mt-0.5">
                                {sharedWhiskies > 0 && (
                                  <span className="text-xs flex items-center gap-1" style={{ color: "var(--labs-text-muted)" }}>
                                    <GlassWater className="w-3 h-3" />
                                    {sharedWhiskies} shared
                                  </span>
                                )}
                                {sharedSessions > 0 && (
                                  <span className="text-xs flex items-center gap-1" style={{ color: "var(--labs-text-muted)" }}>
                                    <Calendar className="w-3 h-3" />
                                    {sharedSessions} sessions
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              <span
                                className="labs-badge"
                                style={{
                                  background: matchPct >= 80
                                    ? "var(--labs-success-muted)"
                                    : matchPct >= 50
                                      ? "var(--labs-accent-muted)"
                                      : "var(--labs-info-muted)",
                                  color: matchPct >= 80
                                    ? "var(--labs-success)"
                                    : matchPct >= 50
                                      ? "var(--labs-accent)"
                                      : "var(--labs-info)",
                                }}
                              >
                                {matchPct}% match
                              </span>
                            </div>
                          </div>
                          {(twin.topSharedSessions || twin.topSharedWhiskies) && (
                            <div
                              className="mt-3 pt-3 flex flex-wrap gap-1.5"
                              style={{ borderTop: "1px solid var(--labs-border-subtle)" }}
                            >
                              {(twin.topSharedSessions || []).slice(0, 3).map((s: any, i: number) => (
                                <span
                                  key={i}
                                  className="text-[10px] px-2 py-0.5 rounded-full"
                                  style={{
                                    background: "var(--labs-surface-elevated)",
                                    color: "var(--labs-text-secondary)",
                                  }}
                                >
                                  {s.title || s}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {peopleFromTastings.length > 0 && (
                <div className="mb-8">
                  <p className="labs-section-label flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" />
                    Tasting Partners
                  </p>
                  <div className="space-y-2">
                    {peopleFromTastings.slice(0, 10).map((person) => (
                      <div
                        key={person.id}
                        className="labs-card p-4 flex items-center gap-4"
                        data-testid={`labs-circle-partner-${person.id}`}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold"
                          style={{
                            background: "var(--labs-surface-elevated)",
                            color: "var(--labs-text-secondary)",
                          }}
                        >
                          {person.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--labs-text)" }}>
                            {person.name}
                          </p>
                          <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                            {person.sharedCount} shared tasting{person.sharedCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <span
                          className="text-xs px-2.5 py-1 rounded-full flex-shrink-0"
                          style={{
                            background: "var(--labs-accent-muted)",
                            color: "var(--labs-accent)",
                            fontWeight: 600,
                          }}
                        >
                          {person.sharedCount}×
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {friendsList.length > 0 && (
                <div className="mb-8">
                  <p className="labs-section-label flex items-center gap-2">
                    <UserPlus className="w-3.5 h-3.5" />
                    Friends
                  </p>
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

              {twinsList.length === 0 && friendsList.length === 0 && peopleFromTastings.length === 0 && (
                <div className="labs-empty" style={{ minHeight: "30vh" }}>
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: "var(--labs-accent-muted)" }}
                  >
                    <Users className="w-7 h-7" style={{ color: "var(--labs-accent)" }} />
                  </div>
                  <p className="text-sm font-semibold mb-2" style={{ color: "var(--labs-text)" }}>
                    No connections yet
                  </p>
                  <p className="text-xs mb-5" style={{ color: "var(--labs-text-muted)", maxWidth: 280 }}>
                    Join or host a tasting to discover your taste twins and build your whisky circle
                  </p>
                  <div className="flex gap-3">
                    <button
                      className="labs-btn-primary text-sm px-5 py-2.5"
                      onClick={() => navigate("/labs/join")}
                      data-testid="labs-circle-empty-join"
                    >
                      Join a Tasting
                    </button>
                    <button
                      className="labs-btn-secondary text-sm px-5 py-2.5"
                      onClick={() => navigate("/labs/host")}
                      data-testid="labs-circle-empty-host"
                    >
                      Host One
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "sessions" && (
        <div className="labs-fade-in">
          {recentSharedSessions.length > 0 ? (
            <>
              <div
                className="labs-card p-4 mb-5 flex items-center gap-4"
                data-testid="labs-circle-sessions-summary"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--labs-accent-muted)" }}
                >
                  <Wine className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>
                    {sharedSessions.length} Shared Session{sharedSessions.length !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                    Completed tastings you've participated in
                  </p>
                </div>
              </div>

              <p className="labs-section-label">Recent Sessions</p>
              <div className="space-y-2">
                {recentSharedSessions.map((s: any) => {
                  const pCount = participantCounts[s.id] || s.participantIds?.length || 0;
                  const whiskyCount = s.whiskyCount || s.whiskies?.length || 0;
                  const isHost = s.hostId === pid;
                  return (
                    <div
                      key={s.id}
                      className="labs-card labs-card-interactive p-4"
                      onClick={() => navigate(`/labs/tastings/${s.id}`)}
                      data-testid={`labs-circle-session-${s.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: "var(--labs-accent-muted)" }}
                        >
                          <Wine className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold truncate" style={{ color: "var(--labs-text)" }}>
                              {s.title}
                            </p>
                            {isHost && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0"
                                style={{
                                  background: "var(--labs-accent-muted)",
                                  color: "var(--labs-accent)",
                                }}
                              >
                                Host
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                              {s.date}
                            </span>
                            {pCount > 0 && (
                              <span className="text-xs flex items-center gap-1" style={{ color: "var(--labs-text-muted)" }}>
                                <Users className="w-3 h-3" />
                                {pCount}
                              </span>
                            )}
                            {whiskyCount > 0 && (
                              <span className="text-xs flex items-center gap-1" style={{ color: "var(--labs-text-muted)" }}>
                                <GlassWater className="w-3 h-3" />
                                {whiskyCount}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--labs-text-muted)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="labs-empty" style={{ minHeight: "30vh" }}>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "var(--labs-accent-muted)" }}
              >
                <Wine className="w-7 h-7" style={{ color: "var(--labs-accent)" }} />
              </div>
              <p className="text-sm font-semibold mb-2" style={{ color: "var(--labs-text)" }}>
                No shared sessions yet
              </p>
              <p className="text-xs mb-5" style={{ color: "var(--labs-text-muted)", maxWidth: 280 }}>
                Complete a tasting with others to see your shared sessions here
              </p>
              <button
                className="labs-btn-primary text-sm px-5 py-2.5"
                onClick={() => navigate("/labs/join")}
                data-testid="labs-circle-empty-sessions-join"
              >
                Join a Tasting
              </button>
            </div>
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
              {activityList.slice(0, 20).map((item: any, idx: number) => {
                const isJournal = item.type === "journal";
                const isRating = item.type === "rating";
                const whiskyName = item.details?.whiskyName || item.details?.name;
                const score = item.details?.score || item.details?.overall;
                const tastingTitle = item.details?.tastingTitle;

                return (
                  <div
                    key={idx}
                    className="labs-card p-4"
                    data-testid={`labs-circle-activity-${idx}`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{
                          background: isJournal
                            ? "var(--labs-success-muted)"
                            : isRating
                              ? "var(--labs-accent-muted)"
                              : "var(--labs-info-muted)",
                        }}
                      >
                        {isJournal ? (
                          <Activity className="w-4 h-4" style={{ color: "var(--labs-success)" }} />
                        ) : isRating ? (
                          <Star className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                        ) : (
                          <Wine className="w-4 h-4" style={{ color: "var(--labs-info)" }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--labs-text)" }}>
                          {item.participantName || "Someone"}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--labs-text-muted)" }}>
                          {isJournal
                            ? `Logged ${whiskyName || "a whisky"}`
                            : isRating
                              ? `Rated ${whiskyName || "a whisky"}`
                              : `Joined ${tastingTitle || "a tasting"}`}
                        </p>
                        {whiskyName && score && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-semibold"
                              style={{
                                background: "var(--labs-accent-muted)",
                                color: "var(--labs-accent)",
                              }}
                            >
                              {typeof score === "number" ? score.toFixed(1) : score}
                            </span>
                            <span className="text-[11px] truncate" style={{ color: "var(--labs-text-secondary)" }}>
                              {whiskyName}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] flex-shrink-0 mt-1" style={{ color: "var(--labs-text-muted)" }}>
                        {formatTimeAgo(item.timestamp)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="labs-empty" style={{ minHeight: "30vh" }}>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "var(--labs-info-muted)" }}
              >
                <Activity className="w-7 h-7" style={{ color: "var(--labs-info)" }} />
              </div>
              <p className="text-sm font-semibold mb-2" style={{ color: "var(--labs-text)" }}>
                No activity yet
              </p>
              <p className="text-xs mb-5" style={{ color: "var(--labs-text-muted)", maxWidth: 280 }}>
                Activity from your friends and tasting partners will appear here as they log whiskies and join tastings
              </p>
              <button
                className="labs-btn-secondary text-sm px-5 py-2.5"
                onClick={() => navigate("/labs/tastings")}
                data-testid="labs-circle-empty-activity-tastings"
              >
                Browse Tastings
              </button>
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

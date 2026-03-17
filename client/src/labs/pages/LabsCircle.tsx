import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Users, Wine, ChevronRight, Activity, Star, UserPlus,
  GlassWater, Trophy, FileText, Compass, Check, X, Trash2, Wifi, Clock,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { stripGuestSuffix } from "@/lib/utils";
import { friendsApi, activityApi, tastingApi, leaderboardApi, pidHeaders } from "@/lib/api";
import { getSession } from "@/lib/session";
import { SkeletonList } from "@/labs/components/LabsSkeleton";

type Tab = "friends" | "leaderboard" | "sessions" | "activity";

const MEDALS = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];

interface OnlineFriend {
  friendId: string;
  name: string;
  email?: string;
  participantId?: string;
  lastSeenAt?: string;
  photoUrl?: string | null;
}

function timeAgo(iso: string | undefined): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  isSelf?: boolean;
  isFriend?: boolean;
  ratingsCount?: number;
  avgNotesLength?: number;
  avgScore?: number;
  uniqueWhiskies?: number;
  score?: number;
  tastings?: number;
}

interface YourRanks {
  mostActive: number;
  mostDetailed: number;
  highestRated: number;
  explorer: number;
  total: number;
  stats: {
    ratingsCount: number;
    avgNotesLength: number;
    avgScore: number;
    uniqueWhiskies: number;
  };
}

interface LeaderboardData {
  mostActive: LeaderboardEntry[];
  mostDetailed: LeaderboardEntry[];
  highestRated: LeaderboardEntry[];
  explorer: LeaderboardEntry[];
  yourRanks?: YourRanks;
}

export default function LabsCircle() {
  const { currentParticipant } = useAppStore();
  const session = getSession();
  const pid = currentParticipant?.id || session.pid;
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("friends");
  const [lbCategory, setLbCategory] = useState("mostActive");
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [friendFirstName, setFriendFirstName] = useState("");
  const [friendLastName, setFriendLastName] = useState("");
  const [friendEmail, setFriendEmail] = useState("");

  const { data: friends, isLoading: friendsLoading } = useQuery({
    queryKey: ["friends", pid],
    queryFn: () => friendsApi.getAll(pid!),
    enabled: !!pid && tab === "friends",
  });

  const { data: pendingRequests } = useQuery<unknown[]>({
    queryKey: ["friends-pending", pid],
    queryFn: () => friendsApi.getPending(pid!),
    enabled: !!pid && tab === "friends",
    refetchInterval: 30000,
  });

  const { data: onlineData } = useQuery<{ online: OnlineFriend[]; count: number }>({
    queryKey: ["friends-online", pid],
    queryFn: () => fetch(`/api/participants/${pid}/friends/online`, { headers: pidHeaders() }).then((r) => r.json()),
    enabled: !!pid,
    refetchInterval: 30000,
  });

  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuery<LeaderboardData>({
    queryKey: ["leaderboard", pid],
    queryFn: () => leaderboardApi.get(),
    enabled: !!pid && tab === "leaderboard",
  });

  const { data: friendActivity, isLoading: activityLoading } = useQuery({
    queryKey: ["friend-activity", pid],
    queryFn: () => activityApi.getFriendActivity(pid!),
    enabled: !!pid && tab === "activity",
  });

  const { data: tastings } = useQuery({
    queryKey: ["tastings", pid],
    queryFn: () => tastingApi.getAll(pid),
    enabled: !!pid && (tab === "sessions" || tab === "friends"),
  });

  const addFriendMutation = useMutation({
    mutationFn: (data: { firstName: string; lastName: string; email: string }) =>
      friendsApi.create(pid!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends", pid] });
      setFriendFirstName("");
      setFriendLastName("");
      setFriendEmail("");
      setAddFriendOpen(false);
    },
  });

  const deleteFriendMutation = useMutation({
    mutationFn: (friendId: string) => friendsApi.delete(pid!, friendId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends", pid] });
    },
  });

  const acceptFriendMutation = useMutation({
    mutationFn: (friendId: string) => friendsApi.accept(pid!, friendId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends", pid] });
      queryClient.invalidateQueries({ queryKey: ["friends-pending", pid] });
    },
  });

  const declineFriendMutation = useMutation({
    mutationFn: (friendId: string) => friendsApi.decline(pid!, friendId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends-pending", pid] });
    },
  });

  const [selectedFriend, setSelectedFriend] = useState<OnlineFriend | null>(null);

  const onlineFriendIds = useMemo(() => {
    return new Set<string>((onlineData?.online || []).map((f) => f.friendId));
  }, [onlineData]);

  const onlineFriendsMap = useMemo(() => {
    const m = new Map<string, OnlineFriend>();
    for (const f of onlineData?.online || []) m.set(f.friendId, f);
    return m;
  }, [onlineData]);

  const onlineCount = onlineData?.count || onlineFriendIds.size;

  const sharedSessions = useMemo(() => {
    return (tastings || [])
      .filter((t: Record<string, unknown>) => t.status === "archived" || t.status === "reveal")
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
        new Date(b.date as string).getTime() - new Date(a.date as string).getTime()
      );
  }, [tastings]);

  const recentSharedSessions = sharedSessions.slice(0, 8);

  const participantCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of sharedSessions) {
      const participants = s.participants as Array<Record<string, unknown>> | undefined;
      const participantCount = s.participantCount as number | undefined;
      counts[s.id as string] = participants?.length || participantCount || 0;
    }
    return counts;
  }, [sharedSessions]);


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
          Sign in to see your friends, rankings and tastings
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

  const friendsList: Array<Record<string, unknown>> = Array.isArray(friends) ? friends : [];
  const pendingList: Array<Record<string, unknown>> = Array.isArray(pendingRequests) ? pendingRequests as Array<Record<string, unknown>> : [];

  const tabs: Array<{ key: Tab; label: string; icon: typeof Users }> = [
    { key: "friends", label: "Friends", icon: Users },
    { key: "leaderboard", label: "Board", icon: Trophy },
    { key: "sessions", label: "Sessions", icon: Wine },
    { key: "activity", label: "Feed", icon: Activity },
  ];

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto labs-fade-in">
      <div style={{ marginBottom: 20 }}>
        <div className="flex items-center justify-between">
          <h1
            className="labs-serif"
            style={{ fontSize: 28, fontWeight: 700, color: "var(--labs-text)", margin: 0 }}
            data-testid="labs-circle-title"
          >
            Circle
          </h1>
          {onlineCount > 0 && (
            <span
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ background: "var(--labs-success-muted)", color: "var(--labs-success)" }}
              data-testid="labs-circle-online-count"
            >
              <Wifi className="w-3 h-3" />
              {onlineCount} online
            </span>
          )}
        </div>
        <p style={{ fontSize: 14, color: "var(--labs-text-muted)", margin: "2px 0 0" }}>
          Friends, rankings & tastings
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" style={{ marginBottom: 20, WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`labs-chip ${tab === t.key ? "labs-chip-active" : ""}`}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
            onClick={() => setTab(t.key)}
            data-testid={`labs-circle-tab-${t.key}`}
          >
            <t.icon style={{ width: 14, height: 14 }} />
            {t.label}
            {t.key === "friends" && pendingList.length > 0 && (
              <span
                className="inline-flex items-center justify-center rounded-full"
                style={{
                  width: 16, height: 16, fontSize: 11, fontWeight: 700,
                  background: "var(--labs-danger)", color: "var(--labs-on-accent)",
                }}
              >
                {pendingList.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "leaderboard" && renderLeaderboardTab()}
      {tab === "friends" && renderFriendsTab()}
      {tab === "sessions" && renderSessionsTab()}
      {tab === "activity" && renderActivityTab()}

      {selectedFriend && (
        <FriendDetailSheet
          friend={selectedFriend}
          sharedSessions={sharedSessions}
          onClose={() => setSelectedFriend(null)}
        />
      )}
    </div>
  );

  function renderLeaderboardTab() {
    if (leaderboardLoading) return <LoadingSkeleton count={4} />;

    const isStructured = leaderboardData && !Array.isArray(leaderboardData) &&
      ("mostActive" in leaderboardData || "highestRated" in leaderboardData);

    if (!isStructured) {
      return <EmptyState icon={Trophy} title="No rankings yet" description="Leaderboard data will appear once enough ratings are submitted" />;
    }

    const structured = leaderboardData as LeaderboardData;
    const yourRanks = structured.yourRanks;

    const categories: Array<{
      key: string;
      label: string;
      subtitle: string;
      icon: typeof Activity;
      entries: LeaderboardEntry[];
      format: (e: LeaderboardEntry) => string;
      rankKey: keyof Omit<YourRanks, "total" | "stats">;
      statKey: keyof YourRanks["stats"];
      statFormat: (v: number) => string;
    }> = [
      {
        key: "mostActive",
        label: "Active",
        subtitle: "Most ratings submitted",
        icon: Activity,
        entries: structured.mostActive || [],
        format: (e) => `${e.ratingsCount || 0} ratings`,
        rankKey: "mostActive",
        statKey: "ratingsCount",
        statFormat: (v) => `${v} ratings`,
      },
      {
        key: "mostDetailed",
        label: "Detailed",
        subtitle: "Longest tasting notes",
        icon: FileText,
        entries: structured.mostDetailed || [],
        format: (e) => `${Math.round(e.avgNotesLength || 0)} chars`,
        rankKey: "mostDetailed",
        statKey: "avgNotesLength",
        statFormat: (v) => `${Math.round(v)} chars avg`,
      },
      {
        key: "highestRated",
        label: "Top Rated",
        subtitle: "Highest average score",
        icon: Star,
        entries: structured.highestRated || [],
        format: (e) => typeof e.avgScore === "number" ? e.avgScore.toFixed(1) : "\u2014",
        rankKey: "highestRated",
        statKey: "avgScore",
        statFormat: (v) => `${v.toFixed(1)} avg`,
      },
      {
        key: "explorer",
        label: "Explorer",
        subtitle: "Greatest variety tasted",
        icon: Compass,
        entries: structured.explorer || [],
        format: (e) => `${e.uniqueWhiskies || 0} whiskies`,
        rankKey: "explorer",
        statKey: "uniqueWhiskies",
        statFormat: (v) => `${v} whiskies`,
      },
    ];

    const activeCat = categories.find((c) => c.key === lbCategory) || categories[0];
    const yourRank = yourRanks ? yourRanks[activeCat.rankKey] : 0;
    const yourTotal = yourRanks?.total || 0;
    const yourPct = yourTotal > 0 ? Math.round(((yourTotal - yourRank) / yourTotal) * 100) : 0;

    const getEntryStyle = (entry: LeaderboardEntry) => {
      if (entry.isSelf) return { border: "1px solid var(--labs-accent)", background: "color-mix(in srgb, var(--labs-accent) 8%, var(--labs-surface))" };
      if (entry.isFriend) return { borderLeft: "3px solid var(--labs-success)" };
      return undefined;
    };

    const getNameDisplay = (entry: LeaderboardEntry) => {
      if (entry.isSelf) return { text: "You", color: "var(--labs-accent)", suffix: " \u2605" };
      if (entry.isFriend) return { text: stripGuestSuffix(entry.name), color: "var(--labs-text)", suffix: "" };
      return { text: entry.name, color: "var(--labs-text-muted)", suffix: "" };
    };

    return (
      <div className="labs-fade-in" data-testid="labs-circle-leaderboard">
        {yourRanks && (
          <div
            className="labs-card p-4 mb-5"
            style={{ border: "1px solid var(--labs-accent)", background: "color-mix(in srgb, var(--labs-accent) 6%, var(--labs-surface))" }}
            data-testid="labs-circle-your-rank"
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--labs-accent-muted)" }}
              >
                <Trophy className="w-6 h-6" style={{ color: "var(--labs-accent)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium" style={{ color: "var(--labs-text-muted)" }}>
                  Your Rank {"\u00B7"} {activeCat.label}
                </p>
                <p className="text-lg font-bold labs-serif" style={{ color: "var(--labs-accent)" }}>
                  #{yourRank} <span className="text-sm font-normal" style={{ color: "var(--labs-text-secondary)" }}>of {yourTotal}</span>
                </p>
              </div>
              <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}>
                  Top {Math.max(1, 100 - yourPct)}%
                </span>
                <span className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
                  {activeCat.statFormat(yourRanks.stats[activeCat.statKey])}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-1.5 mb-5">
          {categories.map((cat) => {
            const isActive = lbCategory === cat.key;
            return (
              <button
                key={cat.key}
                className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-[11px] transition-all"
                style={{
                  background: isActive ? "var(--labs-accent-muted)" : "transparent",
                  color: isActive ? "var(--labs-accent)" : "var(--labs-text-muted)",
                  border: `1px solid ${isActive ? "var(--labs-accent)" : "transparent"}`,
                  fontWeight: isActive ? 700 : 500,
                  cursor: "pointer",
                }}
                onClick={() => setLbCategory(cat.key)}
                data-testid={`labs-circle-lb-${cat.key}`}
              >
                <cat.icon className="w-4 h-4" />
                <span className="truncate max-w-full">{cat.label}</span>
              </button>
            );
          })}
        </div>

        <p
          className="text-xs text-center mb-5"
          style={{ color: "var(--labs-text-muted)" }}
          data-testid="labs-circle-lb-subtitle"
        >
          {activeCat.subtitle}
        </p>

        {activeCat.entries.length === 0 ? (
          <EmptyState icon={Trophy} title="No rankings yet" description="Leaderboard data will appear once enough ratings are submitted" />
        ) : (
          <div className="space-y-2">
            {activeCat.entries.map((entry, i) => {
              const nameDisplay = getNameDisplay(entry);
              return (
                <div
                  key={entry.id || i}
                  className="labs-card p-4 flex items-center gap-3"
                  style={getEntryStyle(entry)}
                  data-testid={`labs-circle-lb-entry-${i}`}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: i < 3 ? "var(--labs-accent-muted)" : "var(--labs-surface-elevated)",
                      fontSize: i < 3 ? 16 : 13,
                      fontWeight: 700,
                      color: i < 3 ? "var(--labs-accent)" : "var(--labs-text-muted)",
                    }}
                  >
                    {i < 3 ? MEDALS[i] : i + 1}
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span
                      className="text-sm font-semibold truncate"
                      style={{ color: nameDisplay.color, fontStyle: !entry.isSelf && !entry.isFriend ? "italic" : "normal" }}
                      data-testid={`labs-circle-lb-name-${i}`}
                    >
                      {nameDisplay.text}{nameDisplay.suffix}
                    </span>
                    {entry.isFriend && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0" style={{ background: "var(--labs-success-muted)", color: "var(--labs-success)" }}>
                        Friend
                      </span>
                    )}
                  </div>
                  <span
                    className="labs-serif text-sm font-bold whitespace-nowrap"
                    style={{ color: "var(--labs-accent)" }}
                    data-testid={`labs-circle-lb-value-${i}`}
                  >
                    {activeCat.format(entry)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[11px] text-center mt-4" style={{ color: "var(--labs-text-muted)", fontStyle: "italic" }}>
          Names shown only for you and your friends. Others appear as whisky aliases.
        </p>
      </div>
    );
  }

  function renderFriendsTab() {
    if (friendsLoading) return <LoadingSkeleton count={3} />;
    const friendList = Array.isArray(friends) ? friends as Array<Record<string, unknown>> : [];

    return (
      <div className="labs-fade-in" data-testid="labs-circle-friends">
        <div className="flex justify-end mb-4">
          <button
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: addFriendOpen ? "var(--labs-surface)" : "var(--labs-accent)",
              color: addFriendOpen ? "var(--labs-text)" : "var(--labs-bg)",
              border: addFriendOpen ? "1px solid var(--labs-border)" : "none",
              cursor: "pointer",
            }}
            onClick={() => setAddFriendOpen(!addFriendOpen)}
            data-testid="labs-circle-add-friend-btn"
          >
            <UserPlus className="w-4 h-4" />
            {addFriendOpen ? "Cancel" : "Add Friend"}
          </button>
        </div>

        {addFriendOpen && (
          <div className="labs-card p-4 mb-5 space-y-3" data-testid="labs-circle-add-friend-form">
            <input
              type="text"
              placeholder="First name"
              value={friendFirstName}
              onChange={(e) => setFriendFirstName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: "var(--labs-surface-elevated)",
                border: "1px solid var(--labs-border)",
                color: "var(--labs-text)",
              }}
              data-testid="labs-circle-input-firstname"
            />
            <input
              type="text"
              placeholder="Last name (optional)"
              value={friendLastName}
              onChange={(e) => setFriendLastName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: "var(--labs-surface-elevated)",
                border: "1px solid var(--labs-border)",
                color: "var(--labs-text)",
              }}
              data-testid="labs-circle-input-lastname"
            />
            <input
              type="email"
              placeholder="Email"
              value={friendEmail}
              onChange={(e) => setFriendEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: "var(--labs-surface-elevated)",
                border: "1px solid var(--labs-border)",
                color: "var(--labs-text)",
              }}
              data-testid="labs-circle-input-email"
            />
            <button
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: friendFirstName.trim() && friendEmail.trim() ? "var(--labs-accent)" : "var(--labs-border)",
                color: friendFirstName.trim() && friendEmail.trim() ? "var(--labs-bg)" : "var(--labs-text-muted)",
                cursor: friendFirstName.trim() && friendEmail.trim() ? "pointer" : "default",
                border: "none",
              }}
              disabled={!friendFirstName.trim() || !friendEmail.trim() || addFriendMutation.isPending}
              onClick={() => {
                if (friendFirstName.trim() && friendEmail.trim()) {
                  addFriendMutation.mutate({
                    firstName: friendFirstName.trim(),
                    lastName: friendLastName.trim(),
                    email: friendEmail.trim(),
                  });
                }
              }}
              data-testid="labs-circle-submit-friend"
            >
              {addFriendMutation.isPending ? "\u2026" : "Send Invite"}
            </button>
          </div>
        )}

        {pendingList.length > 0 && (
          <div className="mb-6">
            <p className="labs-section-label flex items-center gap-2">
              Pending Requests
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold"
                style={{ background: "var(--labs-danger)", color: "var(--labs-bg)" }}
              >
                {pendingList.length}
              </span>
            </p>
            <div className="space-y-2">
              {pendingList.map((req, i) => (
                <div
                  key={(req.id as string) || i}
                  className="labs-card p-4 flex items-center gap-3"
                  style={{ borderLeft: "3px solid var(--labs-accent)" }}
                  data-testid={`labs-circle-pending-${i}`}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 labs-serif font-semibold"
                    style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}
                  >
                    {((req.firstName || req.name || "?") as string)[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--labs-text)" }}>
                      {req.firstName as string} {req.lastName as string}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                      style={{ background: "var(--labs-success-muted)", color: "var(--labs-success)", border: "none", cursor: "pointer" }}
                      onClick={() => acceptFriendMutation.mutate(req.id as string)}
                      data-testid={`labs-circle-accept-${i}`}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                      style={{ background: "var(--labs-surface-elevated)", color: "var(--labs-text-muted)", border: "none", cursor: "pointer" }}
                      onClick={() => declineFriendMutation.mutate(req.id as string)}
                      data-testid={`labs-circle-decline-${i}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {friendList.length === 0 && !addFriendOpen ? (
          <EmptyState icon={Users} title="No friends yet" description="Add your whisky companions to share notes and see their activity" />
        ) : (
          <>
            <div className="mb-4">
              <p className="labs-section-label flex items-center gap-2 mb-2">
                <Wifi className="w-3.5 h-3.5" style={{ color: onlineCount > 0 ? "var(--labs-success)" : "var(--labs-text-muted)" }} />
                <span style={{ color: onlineCount > 0 ? "var(--labs-success)" : "var(--labs-text-muted)" }}>Online Now</span>
              </p>
              {onlineCount > 0 ? (
                <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                  {(onlineData?.online || []).map((of) => {
                    const initials = stripGuestSuffix(of.name).trim().split(/\s+/).map(p => p[0]).join("").toUpperCase().slice(0, 2);
                    return (
                      <button
                        key={of.friendId}
                        onClick={() => setSelectedFriend(of)}
                        className="flex flex-col items-center gap-1.5 flex-shrink-0"
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, minWidth: 60 }}
                        data-testid={`labs-circle-online-avatar-${of.friendId}`}
                      >
                        <div className="relative">
                          {of.photoUrl ? (
                            <img
                              src={of.photoUrl}
                              alt=""
                              className="w-12 h-12 rounded-full"
                              style={{ objectFit: "cover", border: "2px solid var(--labs-success)" }}
                            />
                          ) : (
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-[14px] font-bold"
                            style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)", border: "2px solid var(--labs-success)" }}
                          >
                            {initials}
                          </div>
                          )}
                          <div
                            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
                            style={{ background: "var(--labs-success)", borderColor: "var(--labs-surface)" }}
                          />
                        </div>
                        <span className="text-[11px] font-medium truncate w-full text-center" style={{ color: "var(--labs-text)" }}>
                          {stripGuestSuffix(of.name).split(" ")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs" style={{ color: "var(--labs-text-muted)", fontStyle: "italic" }} data-testid="labs-circle-nobody-online">
                  None of your friends are online right now
                </p>
              )}
            </div>
            {(() => {
              const onlineList = friendList.filter(f => onlineFriendIds.has(f.id as string));
              const offlineList = friendList.filter(f => !onlineFriendIds.has(f.id as string));
              const renderFriendCard = (friend: Record<string, unknown>, i: number, isOnline: boolean) => {
                const fid = friend.id as string;
                const displayName = stripGuestSuffix([friend.firstName, friend.lastName].filter(Boolean).join(" ") || (friend.name as string) || "Friend");
                const onlineInfo = onlineFriendsMap.get(fid);
                return (
                  <div
                    key={fid || i}
                    className="labs-card p-4 flex items-center gap-3"
                    style={{
                      ...(isOnline ? { borderLeft: "3px solid var(--labs-success)", background: "color-mix(in srgb, var(--labs-success) 6%, var(--labs-surface))" } : {}),
                      cursor: isOnline ? "pointer" : undefined,
                    }}
                    onClick={isOnline && onlineInfo ? () => setSelectedFriend(onlineInfo) : undefined}
                    data-testid={`labs-circle-friendlist-${i}`}
                  >
                    <div className="relative flex-shrink-0">
                      {(friend as any).photoUrl ? (
                        <img
                          src={(friend as any).photoUrl}
                          alt=""
                          className="w-10 h-10 rounded-full"
                          style={{
                            objectFit: "cover",
                            border: isOnline ? "2px solid var(--labs-success)" : "2px solid var(--labs-accent-muted)",
                          }}
                        />
                      ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center labs-serif font-semibold"
                        style={{
                          background: isOnline ? "color-mix(in srgb, var(--labs-success) 20%, var(--labs-surface))" : "var(--labs-accent-muted)",
                          color: isOnline ? "var(--labs-success)" : "var(--labs-accent)",
                        }}
                      >
                        {displayName[0]}
                      </div>
                      )}
                      {isOnline && (
                        <div
                          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
                          style={{ background: "var(--labs-success)", borderColor: "var(--labs-surface)" }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--labs-text)" }}>
                          {displayName}
                        </p>
                        {isOnline && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: "var(--labs-success)", color: "#fff" }}>
                            ONLINE
                          </span>
                        )}
                      </div>
                      {isOnline ? (
                        <p className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: "var(--labs-success)" }}>
                          Active {timeAgo(onlineInfo?.lastSeenAt)}
                        </p>
                      ) : typeof friend.email === "string" && friend.email ? (
                        <p className="text-xs truncate" style={{ color: "var(--labs-text-muted)" }}>
                          {friend.email}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      {isOnline && (
                        <ChevronRight className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} />
                      )}
                        <button
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                          style={{ background: "var(--labs-surface-elevated)", color: "var(--labs-text-muted)", border: "none", cursor: "pointer" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Remove this friend?")) {
                              deleteFriendMutation.mutate(fid);
                            }
                          }}
                          data-testid={`labs-circle-delete-friend-${i}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                };
              return (
                <>
                  {onlineList.length > 0 && (
                    <div className="mb-4">
                      <p className="labs-section-label flex items-center gap-2 mb-2">
                        <Wifi className="w-3.5 h-3.5" style={{ color: "var(--labs-success)" }} />
                        <span style={{ color: "var(--labs-success)" }}>Online</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: "var(--labs-success)", color: "#fff" }}>{onlineList.length}</span>
                      </p>
                      <div className="space-y-2">
                        {onlineList.map((f, i) => renderFriendCard(f, i, true))}
                      </div>
                    </div>
                  )}
                  {offlineList.length > 0 && (
                    <div>
                      <p className="labs-section-label flex items-center gap-2 mb-2">
                        <Users className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} />
                        <span style={{ color: "var(--labs-text-secondary)" }}>Offline</span>
                        <span className="text-[11px] px-1.5 rounded-full" style={{ background: "var(--labs-surface-elevated)", color: "var(--labs-text-muted)" }}>{offlineList.length}</span>
                      </p>
                      <div className="space-y-2">
                        {offlineList.map((f, i) => renderFriendCard(f, i + onlineList.length, false))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </>
        )}
      </div>
    );
  }

  function renderSessionsTab() {
    return (
      <div className="labs-fade-in">
        {recentSharedSessions.length > 0 ? (
          <>
            <div className="labs-card p-4 mb-5 flex items-center gap-4" data-testid="labs-circle-sessions-summary">
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
              {recentSharedSessions.map((s: Record<string, unknown>) => {
                const sId = s.id as string;
                const pCount = participantCounts[sId] || (s.participantIds as string[] | undefined)?.length || 0;
                const whiskyCount = (s.whiskyCount as number) || (s.whiskies as unknown[] | undefined)?.length || 0;
                const isHost = s.hostId === pid;
                return (
                  <div
                    key={sId}
                    className="labs-card labs-card-interactive p-4"
                    onClick={() => navigate(`/labs/tastings/${sId}`)}
                    data-testid={`labs-circle-session-${sId}`}
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
                            {s.title as string}
                          </p>
                          {isHost && (
                            <span
                              className="text-[11px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0"
                              style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}
                            >
                              Host
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                            {s.date as string}
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
          <EmptyState icon={Wine} title="No shared sessions yet" description="Completed sessions will appear here once you've tasted with others">
            <button className="labs-btn-primary text-sm px-5 py-2.5" onClick={() => navigate("/labs/join")} data-testid="labs-circle-empty-sessions-join">
              Join a Tasting
            </button>
          </EmptyState>
        )}
      </div>
    );
  }

  function renderActivityTab() {
    if (activityLoading) return <LoadingSkeleton count={4} />;

    const items = Array.isArray(friendActivity)
      ? friendActivity as Array<Record<string, unknown>>
      : (friendActivity as Record<string, unknown> | undefined)?.activities
        ? ((friendActivity as Record<string, unknown>).activities as Array<Record<string, unknown>>)
        : [];

    if (items.length === 0) {
      return <EmptyState icon={Activity} title="No activity yet" description="Add friends to see their recent tastings and ratings here" />;
    }

    return (
      <div className="labs-fade-in space-y-2">
        {items.slice(0, 20).map((item, idx) => {
          const details = (item.details || {}) as Record<string, unknown>;
          const isJournal = item.type === "journal";
          const whiskyName = (details.whiskyName || details.name) as string | undefined;
          const score = (details.score || details.overall || details.personalScore) as number | undefined;
          return (
            <div
              key={`${item.type}-${item.participantId}-${idx}`}
              className="labs-card p-4 flex gap-3"
              data-testid={`labs-circle-activity-${idx}`}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--labs-accent-muted)" }}
              >
                {isJournal ? (
                  <FileText className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                ) : (
                  <Wine className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "var(--labs-text)" }}>
                  {stripGuestSuffix((item.participantName as string) || "Someone")}
                </p>
                <p className="text-xs truncate mt-0.5" style={{ color: "var(--labs-text-secondary)" }}>
                  {isJournal ? (
                    whiskyName ? (
                      <>
                        Logged: {whiskyName}
                        {score != null && (
                          <span style={{ color: "var(--labs-accent)", fontWeight: 600, marginLeft: 6 }}>
                            {typeof score === "number" ? Math.round(score * 10) / 10 : score}/100
                          </span>
                        )}
                      </>
                    ) : "Logged a dram"
                  ) : (
                    (details.title as string) ? `Joined: ${details.title as string}` : "Participated in a tasting"
                  )}
                </p>
                {typeof item.timestamp === "string" && (
                  <p className="text-[11px] mt-1" style={{ color: "var(--labs-text-muted)" }}>
                    {formatRelativeTime(item.timestamp)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
}

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function LoadingSkeleton({ count }: { count: number }) {
  return <SkeletonList count={count} showAvatar />;
}

function FriendDetailSheet({
  friend,
  sharedSessions,
  onClose,
}: {
  friend: OnlineFriend;
  sharedSessions: Array<Record<string, unknown>>;
  onClose: () => void;
}) {
  const initials = friend.name.trim().split(/\s+/).map(p => p[0]).join("").toUpperCase().slice(0, 2);
  const friendSessions = sharedSessions.filter((s) => {
    const participants = (s.participants || []) as Array<Record<string, unknown>>;
    return participants.some((p) => p.id === friend.participantId || (p.name as string)?.toLowerCase() === friend.name.toLowerCase());
  });

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: "var(--z-overlay)",
        background: "var(--overlay-backdrop)", backdropFilter: "var(--overlay-blur)", WebkitBackdropFilter: "var(--overlay-blur)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
      onClick={onClose}
      data-testid="friend-detail-overlay"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="labs-fade-in"
        style={{
          width: "100%", maxWidth: 480,
          background: "var(--labs-surface)", borderRadius: "20px 20px 0 0",
          padding: "28px 24px 36px",
          maxHeight: "75vh", overflowY: "auto",
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--labs-border)", margin: "0 auto 20px" }} />

        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="relative">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold"
              style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)", border: "3px solid var(--labs-success)" }}
            >
              {initials}
            </div>
            <div
              className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2"
              style={{ background: "var(--labs-success)", borderColor: "var(--labs-surface)" }}
            />
          </div>
          <div className="text-center">
            <p className="text-base font-bold labs-serif" style={{ color: "var(--labs-text)" }}>
              {friend.name}
            </p>
            <p className="text-xs flex items-center justify-center gap-1.5 mt-1" style={{ color: "var(--labs-success)" }}>
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: "var(--labs-success)", animation: "pulse 2s infinite" }} />
              Online {timeAgo(friend.lastSeenAt)}
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="labs-card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--labs-accent-muted)" }}>
              <Clock className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>Last active</p>
              <p className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>
                {friend.lastSeenAt ? new Date(friend.lastSeenAt).toLocaleString() : "Just now"}
              </p>
            </div>
          </div>

          {friend.email && (
            <div className="labs-card p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--labs-accent-muted)" }}>
                <Users className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>Contact</p>
                <p className="text-sm font-medium truncate" style={{ color: "var(--labs-text)" }}>
                  {friend.email}
                </p>
              </div>
            </div>
          )}

          <div className="labs-card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--labs-accent-muted)" }}>
              <Wine className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>Shared tastings</p>
              <p className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>
                {friendSessions.length > 0
                  ? `${friendSessions.length} session${friendSessions.length > 1 ? "s" : ""} together`
                  : "No shared sessions yet"}
              </p>
            </div>
          </div>
        </div>

        {friendSessions.length > 0 && (
          <div>
            <p className="labs-section-label mb-2">Recent together</p>
            <div className="space-y-2">
              {friendSessions.slice(0, 3).map((s) => (
                <div key={s.id as string} className="labs-card p-3 flex items-center gap-3">
                  <GlassWater className="w-4 h-4 flex-shrink-0" style={{ color: "var(--labs-accent)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--labs-text)" }}>
                      {(s.title as string) || "Tasting"}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
                      {new Date(s.date as string).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 rounded-xl text-sm font-semibold"
          style={{ background: "var(--labs-surface-elevated)", color: "var(--labs-text)", border: "none", cursor: "pointer" }}
          data-testid="friend-detail-close"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Users;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="labs-empty labs-fade-in" style={{ minHeight: "30vh" }}>
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "var(--labs-accent-muted)" }}
      >
        <Icon className="w-7 h-7" style={{ color: "var(--labs-accent)" }} />
      </div>
      <p className="text-sm font-semibold mb-2" style={{ color: "var(--labs-text)" }}>
        {title}
      </p>
      <p className="text-xs mb-5" style={{ color: "var(--labs-text-muted)", maxWidth: 280 }}>
        {description}
      </p>
      {children}
    </div>
  );
}

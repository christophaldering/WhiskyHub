import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import {
  Users, Wine, ChevronRight, Activity, Star, UserPlus,
  GlassWater, Trophy, Radio, FileText, Compass, Check, X, Trash2, Wifi, Clock,
  Globe, Mail, Send, BarChart3, Plus,
} from "lucide-react";
import CommunityInsights from "@/labs/components/CommunityInsights";
import LabsHistory, { LabsHistoryInsights } from "@/labs/pages/LabsHistory";
import { EmbeddedExploreProvider } from "@/labs/embeddedExploreContext";
import { useAppStore } from "@/lib/store";
import { stripGuestSuffix, formatScore } from "@/lib/utils";
import { friendsApi, activityApi, tastingApi, leaderboardApi, communityApi, pidHeaders } from "@/lib/api";
import { getSession } from "@/lib/session";
import { SkeletonList } from "@/labs/components/LabsSkeleton";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

type Tab = "friends" | "leaderboard" | "sessions" | "activity" | "stats" | "community";

const MEDALS = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];

interface OnlineFriend {
  friendId: string;
  name: string;
  email?: string;
  participantId?: string;
  lastSeenAt?: string;
  photoUrl?: string | null;
}

function timeAgo(iso: string | undefined, t: (key: string, fallback: string, opts?: Record<string, unknown>) => string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("labs.activity.justNow", "just now");
  if (mins < 60) return t("labs.activity.mAgo", "{{m}}m ago", { m: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("labs.activity.hAgo", "{{h}}h ago", { h: hours });
  return t("labs.activity.dAgo", "{{d}}d ago", { d: Math.floor(hours / 24) });
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
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const session = getSession();
  const pid = currentParticipant?.id || session.pid;
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const searchStr = useSearch();
  const initialTab = useMemo<Tab>(() => {
    try {
      const params = new URLSearchParams(searchStr);
      const t = params.get("tab");
      if (t === "friends" || t === "leaderboard" || t === "sessions" || t === "activity" || t === "stats" || t === "community") {
        return t;
      }
    } catch {}
    return "friends";
  }, []);
  const [tab, setTab] = useState<Tab>(initialTab);
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

  const pendingList: Array<Record<string, unknown>> = Array.isArray(pendingRequests) ? pendingRequests as Array<Record<string, unknown>> : [];

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

  const { data: communityInvites } = useQuery<unknown[]>({
    queryKey: ["community-invites-pending", pid],
    queryFn: () => communityApi.getPendingInvites(),
    enabled: !!pid,
    refetchInterval: 30000,
  });

  const communityInviteCount = Array.isArray(communityInvites) ? communityInvites.length : 0;

  const { data: myCommunitiesData, isLoading: communitiesLoading } = useQuery<{ communities?: Array<Record<string, unknown>> }>({
    queryKey: ["my-communities", pid],
    queryFn: () => communityApi.getMine(),
    enabled: !!pid && tab === "community",
    refetchInterval: 30000,
  });

  const acceptCommunityInviteMutation = useMutation({
    mutationFn: (inviteId: string) => communityApi.acceptInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-communities"] });
      queryClient.invalidateQueries({ queryKey: ["community-invites-pending"] });
    },
  });

  const declineCommunityInviteMutation = useMutation({
    mutationFn: (inviteId: string) => communityApi.declineInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-invites-pending"] });
    },
  });

  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [communityName, setCommunityName] = useState("");
  const [communityDescription, setCommunityDescription] = useState("");
  const [creatingCommunity, setCreatingCommunity] = useState(false);

  const handleCreateCommunity = async () => {
    if (!communityName.trim()) return;
    setCreatingCommunity(true);
    try {
      const community = await communityApi.create({
        name: communityName.trim(),
        description: communityDescription.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["my-communities"] });
      setShowCreateCommunity(false);
      setCommunityName("");
      setCommunityDescription("");
      navigate(`/labs/community/${community.id}`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to create community";
      toast({ title: t("m2.circle.errorTitle"), description: message });
    } finally {
      setCreatingCommunity(false);
    }
  };

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

  const [resendingInvite, setResendingInvite] = useState<string | null>(null);
  const [resentSuccess, setResentSuccess] = useState<string | null>(null);
  const [resentError, setResentError] = useState<string | null>(null);
  const resendInviteMutation = useMutation({
    mutationFn: (friendId: string) => friendsApi.resendInvite(pid!, friendId),
    onSuccess: (_data, friendId) => {
      setResendingInvite(null);
      setResentSuccess(friendId);
      setResentError(null);
      setTimeout(() => setResentSuccess(null), 3000);
    },
    onError: (_err, friendId) => {
      setResendingInvite(null);
      setResentError(friendId);
      setTimeout(() => setResentError(null), 3000);
    },
  });

  const [selectedFriend, setSelectedFriend] = useState<OnlineFriend | null>(null);
  const [cheersCooldowns, setCheersCooldowns] = useState<Record<string, number>>({});
  const [invitePickerFriend, setInvitePickerFriend] = useState<OnlineFriend | null>(null);

  const cheersMutation = useMutation({
    mutationFn: ({ friendId, recipientParticipantId }: { friendId: string; recipientParticipantId?: string }) =>
      friendsApi.cheers(pid!, friendId, recipientParticipantId),
    onSuccess: (_data, { friendId }) => {
      setCheersCooldowns((prev) => ({ ...prev, [friendId]: Date.now() }));
      toast({ title: t("m2.circle.cheersSuccess"), description: t("m2.circle.cheersSent") });
    },
    onError: (err: Error & { code?: string }) => {
      if (err.message?.includes("Cooldown")) {
        toast({ title: t("m2.circle.cooldownActive"), description: t("m2.circle.cooldownWait") });
      } else {
        toast({ title: t("m2.circle.errorTitle"), description: err.message });
      }
    },
  });

  const inviteMutation = useMutation({
    mutationFn: ({ friendId, tastingId, recipientParticipantId }: { friendId: string; tastingId: string; recipientParticipantId?: string }) =>
      friendsApi.inviteToTasting(pid!, friendId, tastingId, recipientParticipantId),
    onSuccess: () => {
      setInvitePickerFriend(null);
      toast({ title: t("m2.circle.inviteSent"), description: t("m2.circle.inviteSentDesc") });
    },
    onError: (err: Error) => {
      toast({ title: t("m2.circle.errorTitle"), description: err.message });
    },
  });

  const isCheersOnCooldown = useCallback((friendId: string) => {
    const lastCheers = cheersCooldowns[friendId];
    if (!lastCheers) return false;
    return Date.now() - lastCheers < 5 * 60 * 1000;
  }, [cheersCooldowns]);

  const myActiveTastings = useMemo(() => {
    return (tastings || []).filter(
      (t: Record<string, unknown>) =>
        t.hostId === pid && (t.status === "draft" || t.status === "open")
    );
  }, [tastings, pid]);

  const filteredOnline = useMemo(() => {
    const thresholdMs = 2.5 * 60 * 1000;
    const now = Date.now();
    return (onlineData?.online || []).filter((f) => {
      if (!f.lastSeenAt) return false;
      return now - new Date(f.lastSeenAt).getTime() < thresholdMs;
    });
  }, [onlineData]);

  const onlineFriendIds = useMemo(() => {
    return new Set<string>(filteredOnline.map((f) => f.friendId));
  }, [filteredOnline]);

  const onlineFriendsMap = useMemo(() => {
    const m = new Map<string, OnlineFriend>();
    for (const f of filteredOnline) m.set(f.friendId, f);
    return m;
  }, [filteredOnline]);

  const onlineCount = filteredOnline.length;

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
      <AuthGateMessage
        icon={<Users className="w-12 h-12" style={{ color: "var(--labs-accent)" }} />}
        title={t("authGate.circle.title")}
        bullets={[t("authGate.circle.bullet1"), t("authGate.circle.bullet2"), t("authGate.circle.bullet3")]}
      />
    );
  }

  type CircleTile = {
    key: Tab;
    label: string;
    sublabel: string;
    icon: typeof Users;
    iconVariant: "accent" | "surface" | "success";
    iconColorClass: string;
    badge?: number;
    onClick?: () => void;
    testId: string;
  };
  const tiles: CircleTile[] = [
    {
      key: "friends",
      label: t("m2.circle.navFriends", "Freunde"),
      sublabel: t("m2.circle.navFriendsSub", "Kreis & Anfragen"),
      icon: Users,
      iconVariant: "accent",
      iconColorClass: "labs-icon-accent",
      badge: pendingList.length || undefined,
      testId: "labs-circle-tab-friends",
    },
    {
      key: "stats",
      label: t("m2.circle.navStats", "Statistiken & Trends"),
      sublabel: t("m2.circle.navStatsSub", "Community Insights"),
      icon: BarChart3,
      iconVariant: "accent",
      iconColorClass: "labs-icon-accent",
      testId: "labs-circle-tab-stats",
    },
    {
      key: "community",
      label: t("m2.circle.navCommunity", "Community"),
      sublabel: t("m2.circle.navCommunitySub", "Gruppen & Einladungen"),
      icon: Globe,
      iconVariant: "surface",
      iconColorClass: "labs-icon-text-secondary",
      badge: communityInviteCount || undefined,
      testId: "labs-circle-tab-community",
    },
    {
      key: "activity",
      label: t("m2.circle.navActivity", "Aktivität"),
      sublabel: t("m2.circle.navActivitySub", "Feed & Updates"),
      icon: Activity,
      iconVariant: "surface",
      iconColorClass: "labs-icon-text-secondary",
      testId: "labs-circle-tab-activity",
    },
    {
      key: "leaderboard",
      label: t("m2.circle.navLeaderboard", "Resonanz"),
      sublabel: t("m2.circle.navLeaderboardSub", "Was im Kreis Wirkung zeigt"),
      icon: Radio,
      iconVariant: "success",
      iconColorClass: "labs-icon-success",
      testId: "labs-circle-tab-leaderboard",
    },
    {
      key: "sessions",
      label: t("m2.circle.navSessions", "Sessions"),
      sublabel: t("m2.circle.navSessionsSub", "Gemeinsame Tastings"),
      icon: Wine,
      iconVariant: "accent",
      iconColorClass: "labs-icon-accent",
      testId: "labs-circle-tab-sessions",
    },
  ];

  const renderTile = (tile: CircleTile) => {
    const isActive = tab === tile.key;
    const Icon = tile.icon;
    return (
      <button
        key={tile.key}
        type="button"
        onClick={() => {
          if (tile.onClick) {
            tile.onClick();
            return;
          }
          setTab(tile.key);
        }}
        className={`labs-action-bar-item labs-action-bar-item--button${isActive ? " labs-action-bar-item--active" : ""}`}
        data-testid={tile.testId}
      >
        <div
          className={`labs-action-bar-icon labs-action-bar-icon--${tile.iconVariant}`}
          style={{ position: "relative" }}
        >
          <Icon className={`w-5 h-5 ${tile.iconColorClass}`} />
          {tile.badge && tile.badge > 0 ? (
            <span
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                minWidth: 16,
                height: 16,
                padding: "0 4px",
                borderRadius: 8,
                background: "var(--labs-danger)",
                color: "var(--labs-on-accent)",
                fontSize: 10,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
              }}
              data-testid={`badge-${tile.testId}`}
            >
              {tile.badge}
            </span>
          ) : null}
        </div>
        <span className="labs-action-bar-label">{tile.label}</span>
        <span className="labs-action-bar-sublabel">{tile.sublabel}</span>
      </button>
    );
  };

  const tilesRow1 = tiles.slice(0, 3);
  const tilesRow2 = tiles.slice(3, 6);

  return (
    <div className="labs-page labs-fade-in">
      <div style={{ marginBottom: 20 }}>
        <div className="flex items-center justify-between">
          <h1
            className="ty-h1"
            style={{ margin: 0 }}
            data-testid="labs-circle-title"
          >
            Circle
          </h1>
          <div className="flex items-center gap-2">
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
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: addFriendOpen ? "var(--labs-surface)" : "var(--labs-accent)",
                color: addFriendOpen ? "var(--labs-text)" : "var(--labs-bg)",
                border: addFriendOpen ? "1px solid var(--labs-border)" : "1px solid transparent",
                cursor: "pointer",
              }}
              onClick={() => {
                if (!addFriendOpen) setTab("friends");
                setAddFriendOpen(!addFriendOpen);
              }}
              data-testid="labs-circle-add-friend-btn"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {addFriendOpen ? t("m2.circle.cancel") : t("m2.circle.addToggle")}
            </button>
          </div>
        </div>
        <p className="ty-sub" style={{ margin: "2px 0 0" }}>
          {t("m2.circle.friendsRankingsSubtitle")}
        </p>
      </div>

      <div className="labs-fade-in" style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="labs-action-bar">
          {tilesRow1.map(renderTile)}
        </div>
        <div className="labs-action-bar">
          {tilesRow2.map(renderTile)}
        </div>
      </div>

      {tab === "leaderboard" && renderLeaderboardTab()}
      {tab === "friends" && renderFriendsTab()}
      {tab === "sessions" && renderSessionsTab()}
      {tab === "activity" && renderActivityTab()}
      {tab === "stats" && renderStatsTab()}
      {tab === "community" && renderCommunityTab()}

      {selectedFriend && (
        <FriendDetailSheet
          friend={selectedFriend}
          sharedSessions={sharedSessions}
          onClose={() => setSelectedFriend(null)}
          onCheers={(friendId) => cheersMutation.mutate({ friendId, recipientParticipantId: selectedFriend.participantId })}
          isCheersOnCooldown={isCheersOnCooldown(selectedFriend.friendId)}
          isCheersLoading={cheersMutation.isPending}
          myActiveTastings={myActiveTastings}
          onInvite={(friendId, tastingId) => inviteMutation.mutate({ friendId, tastingId, recipientParticipantId: selectedFriend.participantId })}
          isInviteLoading={inviteMutation.isPending}
          pid={pid!}
        />
      )}

      {invitePickerFriend && (
        <InvitePickerSheet
          friend={invitePickerFriend}
          tastings={myActiveTastings}
          onClose={() => setInvitePickerFriend(null)}
          onInvite={(tastingId) => inviteMutation.mutate({ friendId: invitePickerFriend.friendId, tastingId, recipientParticipantId: invitePickerFriend.participantId })}
          isLoading={inviteMutation.isPending}
        />
      )}
    </div>
  );

  function renderLeaderboardTab() {
    if (leaderboardLoading) return <LoadingSkeleton count={4} />;

    const isStructured = leaderboardData && !Array.isArray(leaderboardData) &&
      ("mostActive" in leaderboardData || "highestRated" in leaderboardData);

    if (!isStructured) {
      return <EmptyState icon={Radio} title={t("m2.circle.noLeaderboardTitle")} description={t("m2.circle.noLeaderboardDesc")} />;
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
        label: t("m2.circle.lbMostActive"),
        subtitle: t("m2.circle.lbMostActiveSub"),
        icon: Activity,
        entries: structured.mostActive || [],
        format: (e) => `${e.ratingsCount || 0} ${t("m2.circle.ratings")}`,
        rankKey: "mostActive",
        statKey: "ratingsCount",
        statFormat: (v) => `${v} ${t("m2.circle.ratings")}`,
      },
      {
        key: "mostDetailed",
        label: t("m2.circle.lbMostDetailed"),
        subtitle: t("m2.circle.lbMostDetailedSub"),
        icon: FileText,
        entries: structured.mostDetailed || [],
        format: (e) => `${Math.round(e.avgNotesLength || 0)} ${t("m2.circle.chars")}`,
        rankKey: "mostDetailed",
        statKey: "avgNotesLength",
        statFormat: (v) => `${Math.round(v)} ${t("m2.circle.chars")} avg`,
      },
      {
        key: "highestRated",
        label: t("m2.circle.lbHighestRated"),
        subtitle: t("m2.circle.lbHighestRatedSub"),
        icon: Star,
        entries: structured.highestRated || [],
        format: (e) => typeof e.avgScore === "number" ? e.avgScore.toFixed(1) : "\u2014",
        rankKey: "highestRated",
        statKey: "avgScore",
        statFormat: (v) => `${v.toFixed(1)} avg`,
      },
      {
        key: "explorer",
        label: t("m2.circle.lbExplorer"),
        subtitle: t("m2.circle.lbExplorerSub"),
        icon: Compass,
        entries: structured.explorer || [],
        format: (e) => `${e.uniqueWhiskies || 0} ${t("m2.circle.whiskies")}`,
        rankKey: "explorer",
        statKey: "uniqueWhiskies",
        statFormat: (v) => `${v} ${t("m2.circle.whiskies")}`,
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
      if (entry.isSelf) return { text: t("m2.circle.you"), color: "var(--labs-accent)", suffix: " \u2605" };
      if (entry.isFriend) return { text: stripGuestSuffix(String(entry.name ?? "")), color: "var(--labs-text)", suffix: "" };
      return { text: String(entry.name ?? ""), color: "var(--labs-text-muted)", suffix: "" };
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
                <Radio className="w-6 h-6" style={{ color: "var(--labs-accent)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium" style={{ color: "var(--labs-text-muted)" }}>
                  {t("m2.circle.yourShare", "Your Share")} {"\u00B7"} {activeCat.label}
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

        <div className="labs-auto-grid mb-5" style={{ "--grid-min": "70px", gap: "0.375rem" } as React.CSSProperties}>
          {categories.map((cat) => {
            const isActive = lbCategory === cat.key;
            return (
              <button
                key={cat.key}
                className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-[11px] transition-all"
                style={{
                  background: isActive ? "var(--labs-accent-muted)" : "var(--labs-surface)",
                  color: isActive ? "var(--labs-accent)" : "var(--labs-text-muted)",
                  border: `1px solid ${isActive ? "var(--labs-accent)" : "var(--labs-border)"}`,
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
          <EmptyState icon={Radio} title={t("m2.circle.noLeaderboardTitle")} description={t("m2.circle.noLeaderboardDesc")} />
        ) : (
          <div className="labs-grouped-list">
            {activeCat.entries.map((entry, i) => {
              const nameDisplay = getNameDisplay(entry);
              return (
                <div
                  key={entry.id || i}
                  className="labs-list-row"
                  style={{ gap: 12, ...getEntryStyle(entry) }}
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
                      className="ty-ui truncate"
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

        {addFriendOpen && (
          <div className="labs-card p-4 mb-5 space-y-3" data-testid="labs-circle-add-friend-form">
            <input
              type="text"
              placeholder={t("m2.circle.firstNamePlaceholder")}
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
              placeholder={t("m2.circle.lastNamePlaceholder")}
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
              type="text"
              inputMode="email"
              autoComplete="email"
              placeholder={t("m2.circle.emailPlaceholder")}
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
              {addFriendMutation.isPending ? "\u2026" : t("m2.circle.sendInvite")}
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
            <div className="labs-grouped-list">
              {pendingList.map((req, i) => (
                <div
                  key={(req.id as string) || i}
                  className="labs-list-row"
                  style={{ gap: 12, borderLeft: "3px solid var(--labs-accent)" }}
                  data-testid={`labs-circle-pending-${i}`}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 labs-serif font-semibold"
                    style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}
                  >
                    {String(req.firstName || req.name || "?")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="ty-ui truncate">
                      {String(req.firstName ?? "")} {String(req.lastName ?? "")}
                    </span>
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
          <EmptyState icon={Users} title={t("m2.circle.emptyTitle")} description={t("m2.circle.emptyDesc")} />
        ) : (
          <>
            <div className="mb-4">
              <p className="labs-section-label flex items-center gap-2 mb-2">
                <Wifi className="w-3.5 h-3.5" style={{ color: onlineCount > 0 ? "var(--labs-success)" : "var(--labs-text-muted)" }} />
                <span style={{ color: onlineCount > 0 ? "var(--labs-success)" : "var(--labs-text-muted)" }}>{t("m2.circle.online")}</span>
              </p>
              {onlineCount > 0 ? (
                <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                  {filteredOnline.map((of) => {
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
                          <span className="text-[11px] font-medium truncate w-full text-center" style={{ color: of.participantId === pid ? "var(--labs-accent)" : "var(--labs-text)" }}>
                          {of.participantId === pid ? "You ★" : stripGuestSuffix(of.name).split(" ")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs" style={{ color: "var(--labs-text-muted)", fontStyle: "italic" }} data-testid="labs-circle-nobody-online">
                  {t("m2.circle.noFriendsOnline", "None of your friends are online right now")}
                </p>
              )}
            </div>
            {(() => {
              const offlineRegistered = friendList.filter(f => !onlineFriendIds.has(f.id as string) && f.isRegistered);
              const invitedList = friendList.filter(f => !onlineFriendIds.has(f.id as string) && !f.isRegistered);
              const renderFriendCard = (friend: Record<string, unknown>, i: number, status: "online" | "offline" | "invited") => {
                const fid = friend.id as string;
                const displayName = stripGuestSuffix([friend.firstName, friend.lastName].filter(v => v != null && typeof v !== "object").map(String).join(" ") || String(friend.name ?? "") || "Friend");
                const onlineInfo = onlineFriendsMap.get(fid);
                const isSelf = onlineInfo?.participantId === pid || friend.matchedParticipantId === pid;
                const isOnline = status === "online";
                const isInvited = status === "invited";
                return (
                  <div
                    key={fid || i}
                    className="labs-list-row"
                    style={{
                      gap: 12,
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
                            border: isOnline ? "2px solid var(--labs-success)" : isInvited ? "1px solid color-mix(in srgb, var(--labs-warning, #f59e0b) 35%, var(--labs-border-subtle))" : "2px solid var(--labs-accent-muted)",
                            opacity: isInvited ? 0.85 : 1,
                          }}
                        />
                      ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center labs-serif font-semibold"
                        style={{
                          background: isOnline ? "color-mix(in srgb, var(--labs-success) 20%, var(--labs-surface))" : isInvited ? "color-mix(in srgb, var(--labs-warning, #f59e0b) 8%, var(--labs-surface-elevated))" : "var(--labs-accent-muted)",
                          color: isOnline ? "var(--labs-success)" : isInvited ? "var(--labs-text-muted)" : "var(--labs-accent)",
                          border: isInvited ? "1px solid color-mix(in srgb, var(--labs-warning, #f59e0b) 30%, var(--labs-border-subtle))" : undefined,
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
                        <span className="ty-ui truncate" style={{ color: isSelf ? "var(--labs-accent)" : isInvited ? "var(--labs-text-secondary)" : undefined }}>
                          {isSelf ? "You ★" : displayName}
                        </span>
                        {isOnline && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: "var(--labs-success)", color: "#fff" }}>
                            ONLINE
                          </span>
                        )}
                      </div>
                      {isOnline ? (
                        <p className="ty-caption mt-0.5 flex items-center gap-1" style={{ color: "var(--labs-success)" }}>
                          {t("m2.circle.active")} {timeAgo(onlineInfo?.lastSeenAt, t)}
                        </p>
                      ) : isInvited ? (
                        <p className="ty-caption mt-0.5 flex items-center gap-1.5" style={{ color: "var(--labs-text-muted)" }} data-testid={`labs-circle-invited-badge-${fid}`}>
                          <Mail className="w-3 h-3" style={{ color: "var(--labs-warning, #f59e0b)", opacity: 0.85 }} />
                          {t("m2.circle.notYetRegistered")}
                        </p>
                      ) : typeof friend.email === "string" && friend.email ? (
                        <p className="ty-caption truncate">
                          {friend.email}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isOnline && !isSelf && (
                        <>
                          <button
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                            style={{
                              background: isCheersOnCooldown(fid) ? "var(--labs-surface-elevated)" : "var(--labs-accent-muted)",
                              color: isCheersOnCooldown(fid) ? "var(--labs-text-muted)" : "var(--labs-accent)",
                              border: "none",
                              cursor: isCheersOnCooldown(fid) ? "default" : "pointer",
                              opacity: isCheersOnCooldown(fid) ? 0.5 : 1,
                            }}
                            disabled={isCheersOnCooldown(fid) || cheersMutation.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isCheersOnCooldown(fid)) cheersMutation.mutate({ friendId: fid, recipientParticipantId: onlineInfo?.participantId });
                            }}
                            title={isCheersOnCooldown(fid) ? t("m2.circle.cooldownWaitTitle") : t("m2.circle.cheersSendTitle")}
                            data-testid={`labs-circle-cheers-${i}`}
                          >
                            <GlassWater className="w-3.5 h-3.5" />
                          </button>
                          {myActiveTastings.length > 0 && (
                            <button
                              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                              style={{
                                background: "var(--labs-accent-muted)",
                                color: "var(--labs-accent)",
                                border: "none",
                                cursor: "pointer",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onlineInfo) setInvitePickerFriend(onlineInfo);
                              }}
                              title={t("m2.circle.inviteToTasting")}
                              data-testid={`labs-circle-invite-${i}`}
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                      {isOnline && (
                        <ChevronRight className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} />
                      )}
                      {isInvited && (
                        <button
                          className="flex items-center gap-1.5 px-2 sm:px-2.5 h-8 rounded-lg text-[11px] font-medium transition-all"
                          style={{
                            background: resentSuccess === fid ? "var(--labs-success-muted, rgba(34,197,94,0.15))" : resentError === fid ? "var(--labs-danger-muted, rgba(239,68,68,0.15))" : "transparent",
                            color: resentSuccess === fid ? "var(--labs-success)" : resentError === fid ? "var(--labs-danger, #ef4444)" : "var(--labs-text-secondary)",
                            border: `1px solid ${resentSuccess === fid ? "color-mix(in srgb, var(--labs-success) 35%, transparent)" : resentError === fid ? "color-mix(in srgb, var(--labs-danger, #ef4444) 35%, transparent)" : "var(--labs-border-subtle)"}`,
                            cursor: resendingInvite === fid ? "wait" : "pointer",
                          }}
                          disabled={resendingInvite === fid || resentSuccess === fid}
                          onClick={(e) => {
                            e.stopPropagation();
                            setResentError(null);
                            setResendingInvite(fid);
                            resendInviteMutation.mutate(fid);
                          }}
                          title={t("m2.circle.resend")}
                          aria-label={t("m2.circle.resend")}
                          data-testid={`labs-circle-resend-invite-${fid}`}
                        >
                          {resendingInvite === fid ? (
                            <>
                              <Send className="w-3.5 h-3.5 animate-pulse" />
                              <span className="hidden min-[400px]:inline">{t("m2.circle.sending")}</span>
                            </>
                          ) : resentSuccess === fid ? (
                            <><Check className="w-3.5 h-3.5" /><span className="hidden min-[400px]:inline">{t("m2.circle.sent")}</span></>
                          ) : resentError === fid ? (
                            <><X className="w-3.5 h-3.5" /><span className="hidden min-[400px]:inline">{t("m2.circle.failed")}</span></>
                          ) : (
                            <><Send className="w-3.5 h-3.5" /><span className="hidden min-[400px]:inline">{t("m2.circle.resend")}</span></>
                          )}
                        </button>
                      )}
                        {!isSelf && (
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
                        )}
                      </div>
                    </div>
                  );
                };
              return (
                <>
                  {offlineRegistered.length > 0 && (
                    <div className="mb-4">
                      <p className="labs-section-label flex items-center gap-2 mb-2">
                        <Users className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} />
                        <span style={{ color: "var(--labs-text-secondary)" }}>{t("m2.circle.offline")}</span>
                        <span className="text-[11px] px-1.5 rounded-full" style={{ background: "var(--labs-surface-elevated)", color: "var(--labs-text-muted)" }}>{offlineRegistered.length}</span>
                      </p>
                      <div className="labs-grouped-list">
                        {offlineRegistered.map((f, i) => renderFriendCard(f, i, "offline"))}
                      </div>
                    </div>
                  )}
                  {invitedList.length > 0 && (
                    <div>
                      <p className="labs-section-label flex items-center gap-2 mb-2">
                        <Mail className="w-3.5 h-3.5" style={{ color: "var(--labs-warning, #f59e0b)" }} />
                        <span style={{ color: "var(--labs-warning, #f59e0b)" }}>{t("m2.circle.invited")}</span>
                        <span className="text-[11px] px-1.5 rounded-full" style={{ background: "color-mix(in srgb, var(--labs-warning, #f59e0b) 15%, var(--labs-surface))", color: "var(--labs-warning, #f59e0b)" }}>{invitedList.length}</span>
                      </p>
                      <div className="labs-grouped-list">
                        {invitedList.map((f, i) => renderFriendCard(f, i + offlineRegistered.length, "invited"))}
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

            <p className="labs-section-label">{t("m2.circle.recentSessions")}</p>
            <div className="labs-grouped-list">
              {recentSharedSessions.map((s: Record<string, unknown>) => {
                const sId = s.id as string;
                const pCount = participantCounts[sId] || (s.participantIds as string[] | undefined)?.length || 0;
                const whiskyCount = (s.whiskyCount as number) || (s.whiskies as unknown[] | undefined)?.length || 0;
                const isHost = s.hostId === pid;
                return (
                  <div
                    key={sId}
                    className="labs-list-row"
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/labs/tastings/${sId}`)}
                    data-testid={`labs-circle-session-${sId}`}
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--labs-accent-muted)" }}
                    >
                      <Wine className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="ty-ui truncate">
                          {String(s.title ?? "")}
                        </span>
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
                        <span className="ty-caption">
                          {String(s.date ?? "")}
                        </span>
                        {pCount > 0 && (
                          <span className="ty-caption flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {pCount}
                          </span>
                        )}
                        {whiskyCount > 0 && (
                          <span className="ty-caption flex items-center gap-1">
                            <GlassWater className="w-3 h-3" />
                            {whiskyCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ opacity: 0.3, fontSize: 16, flexShrink: 0 }}>›</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <EmptyState icon={Wine} title={t("m2.circle.noSharedSessionsTitle")} description={t("m2.circle.noSharedSessionsDesc")}>
            <button className="labs-empty-action" onClick={() => navigate("/labs/join")} data-testid="labs-circle-empty-sessions-join">
              {t("hub.joinTasting")}
            </button>
          </EmptyState>
        )}

        <div style={{ marginTop: 32 }} data-testid="labs-circle-sessions-archive">
          <div
            className="labs-section-label"
            style={{ fontSize: 11, letterSpacing: "0.08em", color: "var(--labs-text-muted)", marginBottom: 12, paddingLeft: 4, textTransform: "uppercase" }}
          >
            {t("bibliothek.archive", "Community Archive")}
          </div>
          <EmbeddedExploreProvider>
            <LabsHistory />
          </EmbeddedExploreProvider>
        </div>
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
      return <EmptyState icon={Activity} title={t("m2.circle.emptyTitle")} description={t("m2.circle.emptyDesc")} />;
    }

    return (
      <div className="labs-fade-in">
        <div className="labs-grouped-list">
          {items.slice(0, 20).map((item, idx) => {
            const details = (item.details || {}) as Record<string, unknown>;
            const isJournal = item.type === "journal";
            const whiskyName = (details.name || details.whiskyName) as string | undefined;
            const score = (details.score || details.overall || details.personalScore) as number | undefined;
            return (
              <div
                key={`${item.type}-${item.participantId}-${idx}`}
                className="labs-list-row"
                style={{ gap: 12 }}
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
                  <span className="ty-ui truncate" style={{ display: "block" }}>
                    {stripGuestSuffix(String(item.participantName || t("m2.circle.someone")))}
                  </span>
                  <p className="ty-caption truncate mt-0.5" style={{ color: "var(--labs-text-secondary)" }}>
                    {isJournal ? (
                      whiskyName ? (
                        <>
                          {t("m2.circle.loggedDram")}: {String(whiskyName)}
                          {score != null && (
                            <span style={{ color: "var(--labs-accent)", fontWeight: 600, marginLeft: 6 }}>
                              {typeof score === "number" ? formatScore(score) : String(score)}/100
                            </span>
                          )}
                        </>
                      ) : t("m2.circle.loggedDramGeneric")
                    ) : (
                      details.title ? `${t("m2.circle.joinedTasting")}: ${String(details.title)}` : t("m2.circle.joinedTastingGeneric")
                    )}
                  </p>
                  {typeof item.timestamp === "string" && (
                    <p className="ty-caption mt-1">
                      {formatRelativeTime(item.timestamp, t)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderStatsTab() {
    return (
      <div className="labs-fade-in" data-testid="labs-circle-stats">
        <CommunityInsights expandedByDefault />
        <div style={{ marginTop: 8 }}>
          <div
            className="labs-section-label"
            style={{ fontSize: 11, letterSpacing: "0.08em", color: "var(--labs-text-muted)", marginBottom: 12, paddingLeft: 4 }}
          >
            {t("bibliothek.crossTastingInsights", "Cross-Tasting Insights")}
          </div>
          <LabsHistoryInsights />
        </div>
      </div>
    );
  }

  function renderCommunityTab() {
    const communities = (myCommunitiesData?.communities || []) as Array<Record<string, unknown>>;
    const invites = Array.isArray(communityInvites) ? (communityInvites as Array<Record<string, unknown>>) : [];

    return (
      <div className="labs-fade-in" data-testid="labs-circle-community">
        <div className="flex items-center justify-end mb-4">
          <button
            onClick={() => setShowCreateCommunity(!showCreateCommunity)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: showCreateCommunity ? "var(--labs-surface)" : "var(--labs-accent)",
              color: showCreateCommunity ? "var(--labs-text)" : "var(--labs-bg)",
              border: showCreateCommunity ? "1px solid var(--labs-border)" : "1px solid transparent",
              cursor: "pointer",
            }}
            data-testid="btn-create-community"
          >
            <Plus className="w-3.5 h-3.5" />
            {showCreateCommunity ? t("common.cancel") : t("m2.community.createCommunity")}
          </button>
        </div>

        {showCreateCommunity && (
          <div className="labs-card mb-6" style={{ padding: "var(--labs-space-md)" }} data-testid="create-community-form">
            <div className="space-y-3">
              <div>
                <label className="labs-label">{t("common.name")}</label>
                <input
                  type="text"
                  className="labs-input w-full"
                  placeholder={t("m2.community.namePlaceholder")}
                  value={communityName}
                  onChange={(e) => setCommunityName(e.target.value)}
                  maxLength={100}
                  data-testid="input-community-name"
                />
              </div>
              <div>
                <label className="labs-label">{t("m2.community.descOptional")}</label>
                <textarea
                  className="labs-input w-full"
                  placeholder={t("m2.community.descPlaceholder")}
                  value={communityDescription}
                  onChange={(e) => setCommunityDescription(e.target.value)}
                  maxLength={500}
                  rows={2}
                  style={{ resize: "none" }}
                  data-testid="input-community-description"
                />
              </div>
              <button
                onClick={handleCreateCommunity}
                disabled={!communityName.trim() || creatingCommunity}
                className="labs-btn w-full"
                style={{
                  background: "var(--labs-accent)",
                  color: "var(--labs-bg)",
                  opacity: !communityName.trim() || creatingCommunity ? 0.5 : 1,
                }}
                data-testid="btn-submit-community"
              >
                {creatingCommunity ? t("m2.community.creating") : t("m2.community.createCommunity")}
              </button>
            </div>
          </div>
        )}

        {invites.length > 0 && (
          <div className="mb-6" data-testid="community-invites-section">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--labs-text-muted)" }}>
              <Mail className="w-3.5 h-3.5 inline mr-1" />
              Pending Invitations ({invites.length})
            </h3>
            <div className="space-y-2">
              {invites.map((invite) => {
                const inviteId = invite.id as string;
                return (
                  <div key={inviteId} className="labs-card p-4 flex items-center justify-between" data-testid={`invite-${inviteId}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--labs-text)" }}>
                        {(invite.communityName as string) || "Community"}
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
                        Invited by {(invite.inviterName as string) || "someone"}
                      </p>
                      {invite.personalNote ? (
                        <p className="text-[11px] italic mt-1" style={{ color: "var(--labs-text-secondary)" }}>
                          "{invite.personalNote as string}"
                        </p>
                      ) : null}
                    </div>
                    <div className="flex gap-2 ml-3 flex-shrink-0">
                      <button
                        onClick={() => acceptCommunityInviteMutation.mutate(inviteId)}
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "var(--labs-success-muted)", color: "var(--labs-success)", cursor: "pointer" }}
                        data-testid={`btn-accept-invite-${inviteId}`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => declineCommunityInviteMutation.mutate(inviteId)}
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "var(--labs-danger-muted, rgba(220,38,38,0.1))", color: "var(--labs-danger)", cursor: "pointer" }}
                        data-testid={`btn-decline-invite-${inviteId}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {communitiesLoading ? (
          <div className="text-center py-10">
            <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>{t("common.loading")}</p>
          </div>
        ) : communities.length === 0 ? (
          <div className="text-center py-10" data-testid="empty-communities">
            <Users className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--labs-text-muted)", opacity: 0.5 }} />
            <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>
              No communities yet. Create one or accept an invitation to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-2" data-testid="communities-list">
            {communities.map((c) => {
              const cId = c.id as string;
              const onlineCount = (c.onlineCount as number) ?? 0;
              return (
                <button
                  key={cId}
                  onClick={() => navigate(`/labs/community/${cId}`)}
                  className="labs-card p-4 w-full text-left flex items-center justify-between transition-all"
                  style={{ cursor: "pointer" }}
                  data-testid={`community-card-${cId}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--labs-text)" }}>
                      {c.name as string}
                    </p>
                    {c.description ? (
                      <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--labs-text-muted)" }}>
                        {c.description as string}
                      </p>
                    ) : null}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
                        <Users className="w-3 h-3 inline mr-1" />
                        {(c.memberCount as number) || 0} members
                      </span>
                      <span
                        className="text-[11px] flex items-center gap-1"
                        style={{ color: onlineCount > 0 ? "#22c55e" : "var(--labs-text-muted)" }}
                        data-testid={`online-count-${cId}`}
                      >
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{
                            background: onlineCount > 0 ? "#22c55e" : "var(--labs-text-muted)",
                            opacity: onlineCount > 0 ? 1 : 0.5,
                          }}
                        />
                        {onlineCount} online
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--labs-text-muted)" }} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }
}

function formatRelativeTime(timestamp: string, t: (key: string, fallback: string, opts?: Record<string, unknown>) => string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return t("labs.activity.justNow", "just now");
  if (diffMin < 60) return t("labs.activity.mAgo", "{{m}}m ago", { m: diffMin });
  if (diffHrs < 24) return t("labs.activity.hAgo", "{{h}}h ago", { h: diffHrs });
  if (diffDays < 7) return t("labs.activity.dAgo", "{{d}}d ago", { d: diffDays });
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function LoadingSkeleton({ count }: { count: number }) {
  return <SkeletonList count={count} showAvatar />;
}

function FriendDetailSheet({
  friend,
  sharedSessions,
  onClose,
  onCheers,
  isCheersOnCooldown,
  isCheersLoading,
  myActiveTastings,
  onInvite,
  isInviteLoading,
  pid,
}: {
  friend: OnlineFriend;
  sharedSessions: Array<Record<string, unknown>>;
  onClose: () => void;
  onCheers: (friendId: string) => void;
  isCheersOnCooldown: boolean;
  isCheersLoading: boolean;
  myActiveTastings: Array<Record<string, unknown>>;
  onInvite: (friendId: string, tastingId: string) => void;
  isInviteLoading: boolean;
  pid: string;
}) {
  const { t } = useTranslation();
  const [showInvitePicker, setShowInvitePicker] = useState(false);
  const isSelf = friend.participantId === pid;
  const initials = friend.name.trim().split(/\s+/).map(p => p[0]).join("").toUpperCase().slice(0, 2);
  const friendSessions = sharedSessions.filter((s) => {
    const participants = (s.participants || []) as Array<Record<string, unknown>>;
    return participants.some((p) => p.id === friend.participantId || (p.name as string)?.toLowerCase() === friend.name.toLowerCase());
  });

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: "var(--z-overlay)",
        background: "rgba(0, 0, 0, 0.75)", backdropFilter: "var(--overlay-blur)", WebkitBackdropFilter: "var(--overlay-blur)",
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
              {String(friend.name ?? "")}
            </p>
            <p className="text-xs flex items-center justify-center gap-1.5 mt-1" style={{ color: "var(--labs-success)" }}>
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: "var(--labs-success)", animation: "pulse 2s infinite" }} />
              {t("m2.circle.online")} {timeAgo(friend.lastSeenAt, t)}
            </p>
          </div>
        </div>

        {!isSelf && (
          <div className="flex gap-3 mb-6">
            <button
              className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              style={{
                background: isCheersOnCooldown ? "var(--labs-surface-elevated)" : "var(--labs-accent)",
                color: isCheersOnCooldown ? "var(--labs-text-muted)" : "var(--labs-bg)",
                border: "none",
                cursor: isCheersOnCooldown ? "default" : "pointer",
                opacity: isCheersOnCooldown ? 0.6 : 1,
              }}
              disabled={isCheersOnCooldown || isCheersLoading}
              onClick={() => onCheers(friend.friendId)}
              data-testid="friend-detail-cheers"
            >
              <GlassWater className="w-4 h-4" />
              {isCheersOnCooldown ? "Cooldown..." : "Cheers! 🥃"}
            </button>
            {myActiveTastings.length > 0 && (
              <button
                className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                style={{
                  background: "var(--labs-accent-muted)",
                  color: "var(--labs-accent)",
                  border: "1px solid var(--labs-accent)",
                  cursor: "pointer",
                }}
                onClick={() => setShowInvitePicker(!showInvitePicker)}
                data-testid="friend-detail-invite"
              >
                <Send className="w-4 h-4" />
                Einladen
              </button>
            )}
          </div>
        )}

        {showInvitePicker && myActiveTastings.length > 0 && (
          <div className="mb-6">
            <p className="labs-section-label mb-2">{t("m2.circle.selectTasting")}</p>
            <div className="space-y-2">
              {myActiveTastings.map((tasting: Record<string, unknown>) => (
                <button
                  key={tasting.id as string}
                  className="w-full labs-card p-3 flex items-center gap-3 transition-all"
                  style={{ border: "1px solid var(--labs-border)", cursor: "pointer", background: "var(--labs-surface)" }}
                  onClick={() => {
                    onInvite(friend.friendId, tasting.id as string);
                    setShowInvitePicker(false);
                  }}
                  disabled={isInviteLoading}
                  data-testid={`friend-detail-invite-tasting-${tasting.id}`}
                >
                  <Wine className="w-4 h-4 flex-shrink-0" style={{ color: "var(--labs-accent)" }} />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--labs-text)" }}>
                      {String(tasting.title || "Tasting")}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
                      {String(tasting.date ?? "")} · {String(tasting.status ?? "")}
                    </p>
                  </div>
                  <Send className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--labs-accent)" }} />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3 mb-6">
          <div className="labs-card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--labs-accent-muted)" }}>
              <Clock className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{t("m2.circle.lastActive")}</p>
              <p className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>
                {friend.lastSeenAt ? new Date(friend.lastSeenAt).toLocaleString() : t("m2.circle.justNow")}
              </p>
            </div>
          </div>

          {friend.email && (
            <div className="labs-card p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--labs-accent-muted)" }}>
                <Users className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{t("m2.circle.contact")}</p>
                <p className="text-sm font-medium truncate" style={{ color: "var(--labs-text)" }}>
                  {String(friend.email ?? "")}
                </p>
              </div>
            </div>
          )}

          <div className="labs-card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--labs-accent-muted)" }}>
              <Wine className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{t("m2.circle.sharedTastings")}</p>
              <p className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>
                {friendSessions.length > 0
                  ? t("m2.circle.sessionsTogether", { count: friendSessions.length })
                  : t("m2.circle.noSharedSessionsTitle")}
              </p>
            </div>
          </div>
        </div>

        {friendSessions.length > 0 && (
          <div>
            <p className="labs-section-label mb-2">{ t("m2.circle.recentTogether") }</p>
            <div className="space-y-2">
              {friendSessions.slice(0, 3).map((s) => (
                <div key={s.id as string} className="labs-card p-3 flex items-center gap-3">
                  <GlassWater className="w-4 h-4 flex-shrink-0" style={{ color: "var(--labs-accent)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--labs-text)" }}>
                      {String(s.title || "Tasting")}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
                      {(() => { try { return new Date(String(s.date)).toLocaleDateString(); } catch { return String(s.date ?? ""); } })()}
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

function InvitePickerSheet({
  friend,
  tastings,
  onClose,
  onInvite,
  isLoading,
}: {
  friend: OnlineFriend;
  tastings: Array<Record<string, unknown>>;
  onClose: () => void;
  onInvite: (tastingId: string) => void;
  isLoading: boolean;
}) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: "var(--z-overlay)",
        background: "rgba(0, 0, 0, 0.75)", backdropFilter: "var(--overlay-blur)", WebkitBackdropFilter: "var(--overlay-blur)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
      onClick={onClose}
      data-testid="invite-picker-overlay"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="labs-fade-in"
        style={{
          width: "100%", maxWidth: 480,
          background: "var(--labs-surface)", borderRadius: "20px 20px 0 0",
          padding: "28px 24px 36px",
          maxHeight: "60vh", overflowY: "auto",
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--labs-border)", margin: "0 auto 20px" }} />
        <p className="text-sm font-bold labs-serif mb-1" style={{ color: "var(--labs-text)" }}>
          {stripGuestSuffix(friend.name)} einladen
        </p>
        <p className="text-xs mb-4" style={{ color: "var(--labs-text-muted)" }}>
          Wähle ein Tasting aus:
        </p>
        <div className="space-y-2">
          {tastings.map((tasting: Record<string, unknown>) => (
            <button
              key={tasting.id as string}
              className="w-full labs-card p-3 flex items-center gap-3 transition-all"
              style={{ border: "1px solid var(--labs-border)", cursor: "pointer", background: "var(--labs-surface)" }}
              onClick={() => onInvite(tasting.id as string)}
              disabled={isLoading}
              data-testid={`invite-picker-tasting-${tasting.id}`}
            >
              <Wine className="w-4 h-4 flex-shrink-0" style={{ color: "var(--labs-accent)" }} />
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-medium truncate" style={{ color: "var(--labs-text)" }}>
                  {String(tasting.title || "Tasting")}
                </p>
                <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
                  {String(tasting.date ?? "")} · {String(tasting.status ?? "")}
                </p>
              </div>
              <Send className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--labs-accent)" }} />
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 rounded-xl text-sm font-semibold"
          style={{ background: "var(--labs-surface-elevated)", color: "var(--labs-text)", border: "none", cursor: "pointer" }}
          data-testid="invite-picker-close"
        >
          Abbrechen
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
      <div className="labs-empty-icon" style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg viewBox="0 0 40 40" fill="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="0.5" opacity="0.15"/>
          <circle cx="20" cy="20" r="10" stroke="currentColor" strokeWidth="0.3" opacity="0.1"/>
        </svg>
        <Icon className="w-5 h-5" style={{ color: "currentColor", opacity: 0.5, position: "relative" }} />
      </div>
      <h2 className="labs-empty-title">{title}</h2>
      <p className="labs-empty-sub">{description}</p>
      {children}
    </div>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { v } from "@/lib/themeVars";
import { getSession } from "@/lib/session";
import { useAppStore } from "@/lib/store";
import {
  communityApi,
  leaderboardApi,
  activityApi,
  friendsApi,
} from "@/lib/api";
import { M2Loading } from "@/components/m2/M2Feedback";
import {
  Heart,
  Star,
  Activity,
  FileText,
  Compass,
  UserPlus,
  Trash2,
  Rss,
  HeartHandshake,
  Wine,
  NotebookPen,
  Users,
  Check,
  X,
} from "lucide-react";

type Tab = "twins" | "leaderboard" | "activity" | "friends";

const MEDALS = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];

interface TasteTwin {
  participantId: string;
  participantName: string;
  name?: string;
  correlation: number;
  similarity?: number;
  sharedWhiskies: number;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  ratingsCount?: number;
  avgNotesLength?: number;
  avgScore?: number;
  uniqueWhiskies?: number;
  score?: number;
  tastings?: number;
}

interface LeaderboardData {
  mostActive: LeaderboardEntry[];
  mostDetailed: LeaderboardEntry[];
  highestRated: LeaderboardEntry[];
  explorer: LeaderboardEntry[];
}

interface ActivityItem {
  type: "journal" | "tasting";
  participantId: string;
  participantName: string;
  timestamp: string;
  details: Record<string, any>;
}

function formatRelativeTime(timestamp: string, language: string, t: (key: string, fallback: string) => string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return t("m2.circle.justNow", "Just now");
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHrs < 24) return `${diffHrs}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return new Date(timestamp).toLocaleDateString(
    language === "de" ? "de-DE" : "en-US",
    { month: "short", day: "numeric" }
  );
}

export default function M2CircleHome() {
  const { t, i18n } = useTranslation();
  const session = getSession();
  const { currentParticipant } = useAppStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("twins");

  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [friendFirstName, setFriendFirstName] = useState("");
  const [friendLastName, setFriendLastName] = useState("");
  const [friendEmail, setFriendEmail] = useState("");
  const [lbTab, setLbTab] = useState<string>("mostActive");

  const pid = currentParticipant?.id || session.pid;

  const { data: twins = [], isLoading: twinsLoading } = useQuery<TasteTwin[]>({
    queryKey: ["taste-twins", pid],
    queryFn: () => communityApi.getTasteTwins(pid!),
    enabled: activeTab === "twins" && !!pid,
  });

  const { data: leaderboardData, isLoading: leaderboardLoading } =
    useQuery<LeaderboardData | LeaderboardEntry[]>({
      queryKey: ["leaderboard"],
      queryFn: () => leaderboardApi.get(),
      enabled: activeTab === "leaderboard",
    });

  const { data: activityData, isLoading: activityLoading } = useQuery<{
    activities: ActivityItem[];
  }>({
    queryKey: ["friend-activity", pid],
    queryFn: () => activityApi.getFriendActivity(pid!),
    enabled: activeTab === "activity" && !!pid,
    refetchInterval: 60000,
  });

  const { data: friends = [], isLoading: friendsLoading } = useQuery<any[]>({
    queryKey: ["friends", pid],
    queryFn: () => friendsApi.getAll(pid!),
    enabled: activeTab === "friends" && !!pid,
  });

  const { data: pendingRequests = [] } = useQuery<any[]>({
    queryKey: ["friends-pending", pid],
    queryFn: () => friendsApi.getPending(pid!),
    enabled: activeTab === "friends" && !!pid,
    refetchInterval: 30000,
  });

  const { data: onlineData } = useQuery<{ online: any[]; count: number }>({
    queryKey: ["friends-online", pid],
    queryFn: () => fetch(`/api/participants/${pid}/friends/online`).then(r => r.json()),
    enabled: !!pid,
    refetchInterval: 60000,
  });

  const addFriendMutation = useMutation({
    mutationFn: (data: {
      firstName: string;
      lastName: string;
      email: string;
    }) => friendsApi.create(pid!, data),
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

  const tabs: { key: Tab; icon: any; label: string; description: string }[] = [
    {
      key: "twins",
      icon: HeartHandshake,
      label: t("m2.circle.tasteTwins", "Twins"),
      description: t("m2.circle.twinsDesc", "People who taste like you"),
    },
    {
      key: "leaderboard",
      icon: Star,
      label: t("m2.circle.leaderboard", "Board"),
      description: t("m2.circle.leaderboardDesc", "Community rankings across categories"),
    },
    {
      key: "activity",
      icon: Rss,
      label: t("m2.circle.activity", "Feed"),
      description: t("m2.circle.activityDesc", "Recent activity from your friends"),
    },
    {
      key: "friends",
      icon: Users,
      label: t("m2.circle.friends", "Friends"),
      description: t("m2.circle.friendsDesc", "Find and manage your connections"),
    },
  ];

  const cardBase: React.CSSProperties = {
    background: v.card,
    border: `1px solid ${v.border}`,
    borderRadius: 14,
    padding: "16px",
    boxShadow: `0 1px 3px rgba(0,0,0,0.08)`,
  };

  const loadingSpinner = <M2Loading />;

  const emptyState = (text: string) => (
    <div
      style={{
        textAlign: "center",
        padding: "48px 16px",
        color: v.muted,
        fontSize: 14,
        lineHeight: 1.6,
      }}
    >
      {text}
    </div>
  );

  function renderTwins() {
    if (!pid)
      return emptyState(
        t("m2.circle.signInForTwins", "Sign in to see your Taste Twins.")
      );
    if (twinsLoading) return loadingSpinner;
    const items = Array.isArray(twins) ? twins : [];
    if (items.length === 0)
      return emptyState(
        t("m2.circle.noTwins", "No taste twins found yet. Rate more whiskies!")
      );

    return (
      <div
        style={{ display: "flex", flexDirection: "column", gap: 10 }}
        data-testid="m2-circle-twins-list"
      >
        {items.map((twin, i) => {
          const matchValue =
            twin.correlation != null
              ? Math.round(twin.correlation * 100)
              : twin.similarity != null
              ? Math.round(
                  typeof twin.similarity === "number" && twin.similarity <= 1
                    ? twin.similarity * 100
                    : twin.similarity
                )
              : 0;
          const barColor =
            matchValue >= 80
              ? v.success
              : matchValue >= 50
              ? v.accent
              : v.muted;

          return (
            <div
              key={twin.participantId || i}
              style={cardBase}
              data-testid={`card-twin-${i}`}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: `color-mix(in srgb, ${v.accent} 15%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "'Playfair Display', Georgia, serif",
                      color: v.accent,
                      fontSize: 15,
                      fontWeight: 600,
                    }}
                  >
                    {(twin.participantName || twin.name || "?")[0]}
                  </div>
                  <span
                    style={{ color: v.text, fontWeight: 600, fontSize: 15 }}
                    data-testid={`text-twin-name-${i}`}
                  >
                    {twin.participantName || twin.name}
                  </span>
                </div>
                <span
                  style={{
                    color: v.accent,
                    fontWeight: 700,
                    fontSize: 18,
                    fontFamily: "'Playfair Display', Georgia, serif",
                  }}
                  data-testid={`text-twin-similarity-${i}`}
                >
                  {matchValue}%
                </span>
              </div>
              <div
                style={{
                  height: 5,
                  borderRadius: 3,
                  background: `color-mix(in srgb, ${v.border} 50%, transparent)`,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${matchValue}%`,
                    borderRadius: 3,
                    background: barColor,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
              {twin.sharedWhiskies != null && (
                <span
                  style={{ color: v.muted, fontSize: 12, marginTop: 8, display: "block" }}
                >
                  {twin.sharedWhiskies}{" "}
                  {t("m2.circle.sharedWhiskies", "shared whiskies")}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderLeaderboard() {
    if (leaderboardLoading) return loadingSpinner;

    const isStructured =
      leaderboardData &&
      !Array.isArray(leaderboardData) &&
      ("mostActive" in leaderboardData ||
        "highestRated" in leaderboardData);
    if (isStructured) {
      const structured = leaderboardData as LeaderboardData;
      const categories: {
        key: string;
        label: string;
        subtitle: string;
        icon: any;
        entries: LeaderboardEntry[];
        format: (e: LeaderboardEntry) => string;
      }[] = [
        {
          key: "mostActive",
          label: t("m2.circle.lbMostActive", "Active"),
          subtitle: t("m2.circle.lbMostActiveSub", "Most ratings submitted"),
          icon: Activity,
          entries: structured.mostActive || [],
          format: (e) =>
            `${e.ratingsCount || 0} ${t("m2.circle.ratings", "ratings")}`,
        },
        {
          key: "mostDetailed",
          label: t("m2.circle.lbMostDetailed", "Detailed"),
          subtitle: t("m2.circle.lbMostDetailedSub", "Longest tasting notes"),
          icon: FileText,
          entries: structured.mostDetailed || [],
          format: (e) =>
            `${Math.round(e.avgNotesLength || 0)} ${t("m2.circle.chars", "chars")}`,
        },
        {
          key: "highestRated",
          label: t("m2.circle.lbHighestRated", "Top Rated"),
          subtitle: t("m2.circle.lbHighestRatedSub", "Highest average score"),
          icon: Star,
          entries: structured.highestRated || [],
          format: (e) =>
            typeof e.avgScore === "number" ? e.avgScore.toFixed(1) : "\u2014",
        },
        {
          key: "explorer",
          label: t("m2.circle.lbExplorer", "Explorer"),
          subtitle: t("m2.circle.lbExplorerSub", "Greatest variety of whiskies rated"),
          icon: Compass,
          entries: structured.explorer || [],
          format: (e) =>
            `${e.uniqueWhiskies || 0} ${t("m2.circle.whiskies", "whiskies")}`,
        },
      ];

      const activeCat =
        categories.find((c) => c.key === lbTab) || categories[0];

      return (
        <div data-testid="m2-circle-leaderboard">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 6,
              marginBottom: 16,
            }}
          >
            {categories.map((cat) => {
              const isActive = lbTab === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setLbTab(cat.key)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 3,
                    padding: "8px 4px",
                    borderRadius: 10,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 10,
                    fontWeight: isActive ? 700 : 500,
                    background: isActive ? `color-mix(in srgb, ${v.accent} 12%, transparent)` : "transparent",
                    color: isActive ? v.accent : v.muted,
                    transition: "all 0.2s",
                  }}
                  data-testid={`btn-lb-${cat.key}`}
                >
                  <cat.icon style={{ width: 16, height: 16 }} />
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", lineHeight: 1.2 }}>{cat.label}</span>
                </button>
              );
            })}
          </div>
          <div style={{
            fontSize: 12,
            color: v.muted,
            textAlign: "center",
            marginTop: -8,
            marginBottom: 16,
            lineHeight: 1.3,
          }} data-testid="m2-circle-lb-subtitle">
            {activeCat.subtitle}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activeCat.entries.length === 0
              ? emptyState(
                  t("m2.circle.noLeaderboard", "No leaderboard data yet.")
                )
              : activeCat.entries.map((entry, i) => (
                  <div
                    key={entry.id || i}
                    style={{
                      ...cardBase,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                    data-testid={`row-leaderboard-${i}`}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: i < 3
                          ? `color-mix(in srgb, ${v.accent} 15%, transparent)`
                          : `color-mix(in srgb, ${v.border} 40%, transparent)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: i < 3 ? 16 : 13,
                        fontWeight: 700,
                        color: i < 3 ? v.accent : v.muted,
                        flexShrink: 0,
                      }}
                    >
                      {i < 3 ? MEDALS[i] : i + 1}
                    </div>
                    <span
                      style={{
                        flex: 1,
                        color:
                          entry.id === pid ? v.accent : v.text,
                        fontWeight: entry.id === pid ? 700 : 600,
                        fontSize: 14,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      data-testid={`text-leaderboard-name-${i}`}
                    >
                      {entry.name}
                      {entry.id === pid ? " \u2605" : ""}
                    </span>
                    <span
                      style={{
                        color: v.accent,
                        fontWeight: 700,
                        fontSize: 15,
                        fontFamily: "'Playfair Display', Georgia, serif",
                        whiteSpace: "nowrap",
                      }}
                      data-testid={`text-leaderboard-value-${i}`}
                    >
                      {activeCat.format(entry)}
                    </span>
                  </div>
                ))}
          </div>
        </div>
      );
    }

    const flatList = Array.isArray(leaderboardData) ? leaderboardData : [];
    if (flatList.length === 0)
      return emptyState(
        t("m2.circle.noLeaderboard", "No leaderboard data yet.")
      );

    return (
      <div
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
        data-testid="m2-circle-leaderboard"
      >
        {flatList.map((entry: any, i: number) => (
          <div
            key={i}
            style={{
              ...cardBase,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
            data-testid={`row-leaderboard-${i}`}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: i < 3
                  ? `color-mix(in srgb, ${v.accent} 15%, transparent)`
                  : `color-mix(in srgb, ${v.border} 40%, transparent)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: i < 3 ? 16 : 13,
                fontWeight: 700,
                color: i < 3 ? v.accent : v.muted,
                flexShrink: 0,
              }}
            >
              {i < 3 ? MEDALS[i] : i + 1}
            </div>
            <span
              style={{ flex: 1, color: v.text, fontWeight: 600, fontSize: 14 }}
              data-testid={`text-leaderboard-name-${i}`}
            >
              {entry.name}
            </span>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  color: v.accent,
                  fontWeight: 700,
                  fontSize: 15,
                  fontFamily: "'Playfair Display', Georgia, serif",
                }}
                data-testid={`text-leaderboard-score-${i}`}
              >
                {entry.score}
              </div>
              {entry.tastings != null && (
                <div style={{ color: v.muted, fontSize: 11 }}>
                  {entry.tastings} {t("m2.circle.tastings", "tastings")}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderActivity() {
    if (!pid)
      return emptyState(
        t("m2.circle.signInForFeed", "Sign in to see friend activity.")
      );
    if (activityLoading) return loadingSpinner;
    const activities = activityData?.activities || [];
    if (activities.length === 0)
      return emptyState(
        t(
          "m2.circle.noActivity",
          "No friend activity yet. Add friends to see their updates!"
        )
      );

    return (
      <div
        style={{ display: "flex", flexDirection: "column", gap: 10 }}
        data-testid="m2-circle-activity-list"
      >
        {activities.map((activity, index) => (
          <div
            key={`${activity.type}-${activity.participantId}-${index}`}
            style={{
              ...cardBase,
              display: "flex",
              gap: 12,
            }}
            data-testid={`card-activity-${index}`}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: `color-mix(in srgb, ${v.accent} 12%, transparent)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {activity.type === "journal" ? (
                <NotebookPen
                  style={{ width: 18, height: 18, color: v.accent }}
                />
              ) : (
                <Wine style={{ width: 18, height: 18, color: v.accent }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: v.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  data-testid={`text-activity-name-${index}`}
                >
                  {activity.participantName}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: v.muted,
                    flexShrink: 0,
                    marginLeft: 8,
                  }}
                  data-testid={`text-activity-time-${index}`}
                >
                  {formatRelativeTime(activity.timestamp, i18n.language, t)}
                </span>
              </div>
              {activity.details && (
                <>
                  {activity.type === "journal" && activity.details.whiskyName && (
                    <p
                      style={{
                        fontSize: 13,
                        color: v.textSecondary,
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        lineHeight: 1.4,
                      }}
                    >
                      {t("m2.circle.loggedDram", "Logged")}: {activity.details.whiskyName}
                      {activity.details.score != null && (
                        <span style={{ color: v.accent, fontWeight: 600, marginLeft: 6 }}>
                          {activity.details.score}/100
                        </span>
                      )}
                    </p>
                  )}
                  {activity.type === "tasting" && activity.details.tastingName && (
                    <p
                      style={{
                        fontSize: 13,
                        color: v.textSecondary,
                        margin: 0,
                        lineHeight: 1.4,
                      }}
                    >
                      {t("m2.circle.joinedTasting", "Joined")}: {activity.details.tastingName}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderFriends() {
    if (!pid)
      return emptyState(
        t("m2.circle.signInForFriends", "Sign in to manage your friends.")
      );
    if (friendsLoading) return loadingSpinner;
    const friendList = Array.isArray(friends) ? friends : [];
    const pending = Array.isArray(pendingRequests) ? pendingRequests : [];
    const onlineFriendIds = new Set<string>(
      (onlineData?.online || []).map((f: any) => f.friendId)
    );

    return (
      <div data-testid="m2-circle-friends">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button
            onClick={() => setAddFriendOpen(!addFriendOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: addFriendOpen ? v.card : v.accent,
              color: addFriendOpen ? v.text : "#1a1714",
              border: addFriendOpen ? `1px solid ${v.border}` : "none",
              borderRadius: 10,
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            data-testid="btn-add-friend"
          >
            <UserPlus style={{ width: 15, height: 15 }} />
            {addFriendOpen
              ? t("m2.circle.cancel", "Cancel")
              : t("m2.circle.addFriend", "Add Friend")}
          </button>
        </div>

        {addFriendOpen && (
          <div
            style={{
              ...cardBase,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <input
              type="text"
              placeholder={t("m2.circle.firstName", "First name")}
              value={friendFirstName}
              onChange={(e) => setFriendFirstName(e.target.value)}
              style={{
                background: v.elevated,
                border: `1px solid ${v.border}`,
                borderRadius: 10,
                padding: "10px 14px",
                color: v.text,
                fontSize: 14,
                outline: "none",
              }}
              data-testid="input-friend-first-name"
            />
            <input
              type="text"
              placeholder={t("m2.circle.lastName", "Last name (optional)")}
              value={friendLastName}
              onChange={(e) => setFriendLastName(e.target.value)}
              style={{
                background: v.elevated,
                border: `1px solid ${v.border}`,
                borderRadius: 10,
                padding: "10px 14px",
                color: v.text,
                fontSize: 14,
                outline: "none",
              }}
              data-testid="input-friend-last-name"
            />
            <input
              type="email"
              placeholder={t("m2.circle.email", "Email")}
              value={friendEmail}
              onChange={(e) => setFriendEmail(e.target.value)}
              style={{
                background: v.elevated,
                border: `1px solid ${v.border}`,
                borderRadius: 10,
                padding: "10px 14px",
                color: v.text,
                fontSize: 14,
                outline: "none",
              }}
              data-testid="input-friend-email"
            />
            <button
              onClick={() => {
                if (friendFirstName.trim() && friendEmail.trim()) {
                  addFriendMutation.mutate({
                    firstName: friendFirstName.trim(),
                    lastName: friendLastName.trim(),
                    email: friendEmail.trim(),
                  });
                }
              }}
              disabled={
                !friendFirstName.trim() ||
                !friendEmail.trim() ||
                addFriendMutation.isPending
              }
              style={{
                background:
                  friendFirstName.trim() && friendEmail.trim()
                    ? v.accent
                    : v.border,
                color:
                  friendFirstName.trim() && friendEmail.trim()
                    ? "#1a1714"
                    : v.muted,
                border: "none",
                borderRadius: 10,
                padding: "11px",
                fontSize: 14,
                fontWeight: 600,
                cursor:
                  friendFirstName.trim() && friendEmail.trim()
                    ? "pointer"
                    : "default",
                transition: "all 0.2s",
              }}
              data-testid="btn-submit-friend"
            >
              {addFriendMutation.isPending
                ? "\u2026"
                : t("m2.circle.sendInvite", "Send Invite")}
            </button>
          </div>
        )}

        {pending.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: v.muted, marginBottom: 8 }}>
              {t("m2.circle.pendingRequests", "Pending Requests")} ({pending.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pending.map((req: any, i: number) => (
                <div
                  key={req.id || i}
                  style={{
                    ...cardBase,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    borderLeft: `3px solid ${v.accent}`,
                  }}
                  data-testid={`card-pending-${i}`}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: `color-mix(in srgb, ${v.accent} 15%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "'Playfair Display', Georgia, serif",
                      color: v.accent,
                      fontSize: 14,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {(req.firstName || req.name || "?")[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: v.text, fontWeight: 600, fontSize: 14 }}>
                      {req.firstName} {req.lastName}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => acceptFriendMutation.mutate(req.id)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        border: "none",
                        background: `color-mix(in srgb, ${v.success} 15%, transparent)`,
                        color: v.success,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      data-testid={`btn-accept-${i}`}
                    >
                      <Check style={{ width: 16, height: 16 }} />
                    </button>
                    <button
                      onClick={() => declineFriendMutation.mutate(req.id)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        border: "none",
                        background: `color-mix(in srgb, ${v.muted} 10%, transparent)`,
                        color: v.muted,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      data-testid={`btn-decline-${i}`}
                    >
                      <X style={{ width: 16, height: 16 }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {friendList.length === 0 && !addFriendOpen
          ? emptyState(
              t(
                "m2.circle.noFriends",
                "No friends yet. Add your whisky companions!"
              )
            )
          : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...friendList].sort((a: any, b: any) => {
                const aOn = onlineFriendIds.has(a.id) ? 0 : 1;
                const bOn = onlineFriendIds.has(b.id) ? 0 : 1;
                return aOn - bOn;
              }).map((friend: any, i: number) => {
                const isOnline = onlineFriendIds.has(friend.id);
                return (
                <div
                  key={friend.id || i}
                  style={{
                    ...cardBase,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    borderLeft: isOnline ? `3px solid ${v.success}` : undefined,
                  }}
                  data-testid={`card-friend-${i}`}
                >
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: isOnline
                          ? `color-mix(in srgb, ${v.success} 15%, transparent)`
                          : `color-mix(in srgb, ${v.accent} 15%, transparent)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "'Playfair Display', Georgia, serif",
                        color: isOnline ? v.success : v.accent,
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      {(friend.firstName || friend.name || "?")[0]}
                    </div>
                    {isOnline && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: -1,
                          right: -1,
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: v.success,
                          border: `2px solid ${v.card}`,
                          animation: "pulse 2s infinite",
                        }}
                        data-testid={`online-dot-${i}`}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          color: v.text,
                          fontWeight: 600,
                          fontSize: 14,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        data-testid={`text-friend-name-${i}`}
                      >
                        {friend.firstName} {friend.lastName}
                      </span>
                      {isOnline && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "1px 6px",
                            borderRadius: 6,
                            background: `color-mix(in srgb, ${v.success} 15%, transparent)`,
                            color: v.success,
                          }}
                          data-testid={`badge-online-${i}`}
                        >
                          {t("m2.circle.online", "Online")}
                        </span>
                      )}
                    </div>
                    {friend.email && (
                      <div
                        style={{
                          color: v.muted,
                          fontSize: 12,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {friend.email}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteFriendMutation.mutate(friend.id)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "transparent",
                      border: `1px solid ${v.border}`,
                      cursor: "pointer",
                      color: v.muted,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s",
                    }}
                    data-testid={`btn-delete-friend-${i}`}
                  >
                    <Trash2 style={{ width: 14, height: 14 }} />
                  </button>
                </div>
                );
              })}
            </div>
          )}
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 16px" }} data-testid="m2-circle-home">
      <h1
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 26,
          fontWeight: 700,
          color: v.text,
          margin: "0 0 6px",
        }}
        data-testid="text-m2-circle-title"
      >
        {t("m2.circle.title", "Circle")}
      </h1>
      <p style={{ fontSize: 14, color: v.textSecondary, marginBottom: 20, lineHeight: 1.4 }}>
        {t("m2.circle.subtitle", "Connect with fellow whisky enthusiasts")}
      </p>

      {!session.signedIn && !pid && (
        <div
          style={{
            background: v.elevated,
            borderRadius: 14,
            padding: "32px 16px",
            textAlign: "center",
            color: v.textSecondary,
            fontSize: 14,
          }}
          data-testid="m2-circle-signin-prompt"
        >
          {t("m2.circle.signInPrompt", "Sign in to join the community")}
        </div>
      )}

      {(session.signedIn || pid) && (
        <>
          {onlineData && onlineData.count > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                marginBottom: 16,
                padding: "8px 16px",
                borderRadius: 20,
                background: `color-mix(in srgb, ${v.success} 10%, transparent)`,
                border: `1px solid color-mix(in srgb, ${v.success} 20%, transparent)`,
                alignSelf: "center",
              }}
              data-testid="m2-circle-online-count"
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: v.success, display: "inline-block", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 13, color: v.success, fontWeight: 500 }}>
                {t("m2.circle.friendsOnline", "{{count}} friend online", { count: onlineData.count })}
              </span>
            </div>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              marginBottom: 24,
              background: v.card,
              borderRadius: 14,
              border: `1px solid ${v.border}`,
              overflow: "hidden",
            }}
            data-testid="m2-circle-tabs"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    padding: "12px 4px 10px",
                    border: "none",
                    borderBottom: isActive ? `2.5px solid ${v.accent}` : "2.5px solid transparent",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: isActive ? 700 : 500,
                    background: isActive ? `color-mix(in srgb, ${v.accent} 8%, transparent)` : "transparent",
                    color: isActive ? v.accent : v.muted,
                    transition: "all 0.2s ease",
                  }}
                  data-testid={`tab-${tab.key}`}
                >
                  <tab.icon style={{ width: 20, height: 20 }} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div style={{
            fontSize: 13,
            color: v.muted,
            textAlign: "center",
            marginTop: -16,
            marginBottom: 20,
            lineHeight: 1.4,
          }} data-testid="m2-circle-tab-description">
            {tabs.find((t) => t.key === activeTab)?.description}
          </div>

          {activeTab === "twins" && renderTwins()}
          {activeTab === "leaderboard" && renderLeaderboard()}
          {activeTab === "activity" && renderActivity()}
          {activeTab === "friends" && renderFriends()}
        </>
      )}
    </div>
  );
}

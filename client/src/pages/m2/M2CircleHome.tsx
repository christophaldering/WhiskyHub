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
import {
  Trophy,
  Heart,
  Star,
  Activity,
  FileText,
  Target,
  UserPlus,
  Trash2,
  Loader2,
  Rss,
  HeartHandshake,
  Wine,
  NotebookPen,
} from "lucide-react";

type Tab = "rankings" | "twins" | "leaderboard" | "activity" | "friends";

const MEDALS = ["🥇", "🥈", "🥉"];

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
  consistency?: number;
  score?: number;
  tastings?: number;
}

interface LeaderboardData {
  mostActive: LeaderboardEntry[];
  mostDetailed: LeaderboardEntry[];
  highestRated: LeaderboardEntry[];
  mostConsistent: LeaderboardEntry[];
}

interface ActivityItem {
  type: "journal" | "tasting";
  participantId: string;
  participantName: string;
  timestamp: string;
  details: Record<string, any>;
}

function formatRelativeTime(timestamp: string, language: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return language === "de" ? "Gerade eben" : "Just now";
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
  const [activeTab, setActiveTab] = useState<Tab>("rankings");

  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [friendFirstName, setFriendFirstName] = useState("");
  const [friendLastName, setFriendLastName] = useState("");
  const [friendEmail, setFriendEmail] = useState("");
  const [lbTab, setLbTab] = useState<string>("mostActive");

  const pid = currentParticipant?.id || session.pid;

  const { data: rankings = [], isLoading: rankingsLoading } = useQuery<any[]>({
    queryKey: ["community-scores"],
    queryFn: () => communityApi.getScores(),
    enabled: activeTab === "rankings",
  });

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

  const tabs: { key: Tab; icon: any; label: string }[] = [
    {
      key: "rankings",
      icon: Trophy,
      label: t("m2.circle.rankings", "Rankings"),
    },
    {
      key: "twins",
      icon: HeartHandshake,
      label: t("m2.circle.tasteTwins", "Twins"),
    },
    {
      key: "leaderboard",
      icon: Star,
      label: t("m2.circle.leaderboard", "Board"),
    },
    {
      key: "activity",
      icon: Rss,
      label: t("m2.circle.activity", "Feed"),
    },
    {
      key: "friends",
      icon: Heart,
      label: t("m2.circle.friends", "Friends"),
    },
  ];

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: "7px 14px",
    borderRadius: 20,
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    background: active ? v.accent : v.card,
    color: active ? "#1a1714" : v.muted,
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    gap: 5,
    whiteSpace: "nowrap",
  });

  const cardBase: React.CSSProperties = {
    background: v.card,
    border: `1px solid ${v.border}`,
    borderRadius: 12,
    padding: "14px 16px",
  };

  const loadingSpinner = (
    <div
      style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}
    >
      <Loader2
        style={{
          width: 24,
          height: 24,
          color: v.accent,
          animation: "spin 1s linear infinite",
        }}
      />
    </div>
  );

  const emptyState = (text: string) => (
    <div
      style={{
        textAlign: "center",
        padding: "40px 16px",
        color: v.muted,
        fontSize: 14,
      }}
    >
      {text}
    </div>
  );

  function renderRankings() {
    if (rankingsLoading) return loadingSpinner;
    const items = Array.isArray(rankings) ? rankings : [];
    if (items.length === 0)
      return emptyState(
        t("m2.circle.noRankings", "No community rankings yet.")
      );

    return (
      <div
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
        data-testid="m2-circle-rankings-list"
      >
        {items.map((item: any, i: number) => (
          <div
            key={i}
            style={{
              ...cardBase,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
            data-testid={`row-ranking-${i}`}
          >
            <span
              style={{ fontSize: 20, width: 28, textAlign: "center" }}
            >
              {i < 3 ? (
                MEDALS[i]
              ) : (
                <span style={{ color: v.muted, fontSize: 14 }}>
                  {i + 1}
                </span>
              )}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: v.text,
                  fontWeight: 600,
                  fontSize: 14,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                data-testid={`text-ranking-name-${i}`}
              >
                {item.whiskyName}
              </div>
              {item.distillery && (
                <div style={{ color: v.muted, fontSize: 12 }}>
                  {item.distillery}
                </div>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  color: v.accent,
                  fontWeight: 700,
                  fontSize: 16,
                  fontFamily: "'Playfair Display', Georgia, serif",
                }}
                data-testid={`text-ranking-score-${i}`}
              >
                {typeof item.avgScore === "number"
                  ? item.avgScore.toFixed(1)
                  : item.avgScore}
              </div>
              {item.count != null && (
                <div style={{ color: v.muted, fontSize: 11 }}>
                  {item.count} {t("m2.circle.ratings", "ratings")}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

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
              style={{ ...cardBase }}
              data-testid={`card-twin-${i}`}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: `color-mix(in srgb, ${v.accent} 15%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "'Playfair Display', Georgia, serif",
                      color: v.accent,
                      fontSize: 13,
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
                    fontSize: 16,
                    fontFamily: "'Playfair Display', Georgia, serif",
                  }}
                  data-testid={`text-twin-similarity-${i}`}
                >
                  {matchValue}%
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  borderRadius: 2,
                  background: `color-mix(in srgb, ${v.border} 50%, transparent)`,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${matchValue}%`,
                    borderRadius: 2,
                    background: barColor,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
              {twin.sharedWhiskies != null && (
                <span
                  style={{ color: v.muted, fontSize: 12, marginTop: 6, display: "block" }}
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
        icon: any;
        entries: LeaderboardEntry[];
        format: (e: LeaderboardEntry) => string;
      }[] = [
        {
          key: "mostActive",
          label: t("m2.circle.lbMostActive", "Most Active"),
          icon: Activity,
          entries: structured.mostActive || [],
          format: (e) =>
            `${e.ratingsCount || 0} ${t("m2.circle.ratings", "ratings")}`,
        },
        {
          key: "mostDetailed",
          label: t("m2.circle.lbMostDetailed", "Most Detailed"),
          icon: FileText,
          entries: structured.mostDetailed || [],
          format: (e) =>
            `${Math.round(e.avgNotesLength || 0)} ${t("m2.circle.chars", "chars")}`,
        },
        {
          key: "highestRated",
          label: t("m2.circle.lbHighestRated", "Highest Rated"),
          icon: Star,
          entries: structured.highestRated || [],
          format: (e) =>
            typeof e.avgScore === "number" ? e.avgScore.toFixed(1) : "—",
        },
        {
          key: "mostConsistent",
          label: t("m2.circle.lbMostConsistent", "Most Consistent"),
          icon: Target,
          entries: structured.mostConsistent || [],
          format: (e) =>
            typeof e.consistency === "number"
              ? `${Math.round(e.consistency * 100)}%`
              : "—",
        },
      ];

      const activeCat =
        categories.find((c) => c.key === lbTab) || categories[0];

      return (
        <div data-testid="m2-circle-leaderboard">
          <div
            style={{
              display: "flex",
              gap: 6,
              marginBottom: 16,
              overflowX: "auto",
            }}
          >
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setLbTab(cat.key)}
                style={{
                  ...pillStyle(lbTab === cat.key),
                  fontSize: 12,
                  padding: "5px 10px",
                }}
                data-testid={`btn-lb-${cat.key}`}
              >
                <cat.icon style={{ width: 12, height: 12 }} />
                {cat.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
                      padding: "12px 16px",
                    }}
                    data-testid={`row-leaderboard-${i}`}
                  >
                    <span
                      style={{
                        fontSize: i < 3 ? 20 : 14,
                        width: 28,
                        textAlign: "center",
                        color: i >= 3 ? v.muted : undefined,
                        fontWeight: 700,
                      }}
                    >
                      {i < 3 ? MEDALS[i] : i + 1}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        color:
                          entry.id === pid ? v.accent : v.text,
                        fontWeight: entry.id === pid ? 700 : 600,
                        fontSize: 14,
                      }}
                      data-testid={`text-leaderboard-name-${i}`}
                    >
                      {entry.name}
                      {entry.id === pid ? " ★" : ""}
                    </span>
                    <span
                      style={{
                        color: v.accent,
                        fontWeight: 700,
                        fontSize: 14,
                        fontFamily: "'Playfair Display', Georgia, serif",
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
        style={{ display: "flex", flexDirection: "column", gap: 6 }}
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
              padding: "12px 16px",
            }}
            data-testid={`row-leaderboard-${i}`}
          >
            <span
              style={{
                fontSize: i < 3 ? 20 : 14,
                width: 28,
                textAlign: "center",
                color: i >= 3 ? v.muted : undefined,
                fontWeight: 700,
              }}
            >
              {i < 3 ? MEDALS[i] : i + 1}
            </span>
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
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
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
                width: 36,
                height: 36,
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
                  style={{ width: 16, height: 16, color: v.accent }}
                />
              ) : (
                <Wine style={{ width: 16, height: 16, color: v.accent }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 2,
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: v.text,
                    fontFamily: "'Playfair Display', Georgia, serif",
                  }}
                >
                  {activity.participantName}
                </span>
                <span style={{ fontSize: 11, color: v.muted }}>
                  {formatRelativeTime(activity.timestamp, i18n.language)}
                </span>
              </div>
              {activity.type === "journal" ? (
                <div>
                  <p
                    style={{
                      fontSize: 13,
                      color: v.textSecondary,
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {activity.details.whiskyName || activity.details.title}
                  </p>
                  {activity.details.personalScore && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        marginTop: 4,
                      }}
                    >
                      <Star
                        style={{
                          width: 12,
                          height: 12,
                          color: v.accent,
                          fill: v.accent,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: v.accent,
                          fontFamily: "'Playfair Display', Georgia, serif",
                        }}
                      >
                        {activity.details.personalScore}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p
                    style={{
                      fontSize: 13,
                      color: v.textSecondary,
                      margin: 0,
                    }}
                  >
                    {activity.details.title}
                  </p>
                  {activity.details.date && (
                    <p
                      style={{ fontSize: 11, color: v.muted, margin: "2px 0 0" }}
                    >
                      {activity.details.date}
                      {activity.details.location
                        ? ` · ${activity.details.location}`
                        : ""}
                    </p>
                  )}
                </div>
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

    const pending = Array.isArray(pendingRequests) ? pendingRequests : [];
    const friendList = Array.isArray(friends) ? friends : [];

    return (
      <div data-testid="m2-circle-friends-list">
        {pending.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h3
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: v.accent,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {t("m2.circle.pendingRequests", "Pending Requests")} ({pending.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {pending.map((req: any, i: number) => (
                <div
                  key={req.id || i}
                  style={{
                    ...cardBase,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    borderColor: v.accent,
                  }}
                  data-testid={`card-pending-${i}`}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: `color-mix(in srgb, ${v.accent} 15%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: v.accent,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {(req.firstName || req.name || "?")[0]}
                  </div>
                  <span
                    style={{ flex: 1, color: v.text, fontWeight: 500, fontSize: 14 }}
                  >
                    {req.firstName} {req.lastName}
                  </span>
                  <button
                    onClick={() => acceptFriendMutation.mutate(req.id)}
                    style={{
                      background: v.accent,
                      color: "#1a1714",
                      border: "none",
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                    data-testid={`btn-accept-${i}`}
                  >
                    {t("m2.circle.accept", "Accept")}
                  </button>
                  <button
                    onClick={() => declineFriendMutation.mutate(req.id)}
                    style={{
                      background: "transparent",
                      color: v.muted,
                      border: `1px solid ${v.border}`,
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                    data-testid={`btn-decline-${i}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 13, color: v.muted }}>
            {friendList.length}{" "}
            {t("m2.circle.friendsCount", "friends")}
          </span>
          <button
            onClick={() => setAddFriendOpen(!addFriendOpen)}
            style={{
              background: v.accent,
              color: "#1a1714",
              border: "none",
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
            data-testid="btn-add-friend"
          >
            <UserPlus style={{ width: 14, height: 14 }} />
            {t("m2.circle.addFriend", "Add Friend")}
          </button>
        </div>

        {addFriendOpen && (
          <div
            style={{
              ...cardBase,
              marginBottom: 12,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
            data-testid="m2-circle-add-friend-form"
          >
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder={t("m2.circle.firstName", "First name")}
                value={friendFirstName}
                onChange={(e) => setFriendFirstName(e.target.value)}
                style={{
                  flex: 1,
                  background: v.inputBg,
                  border: `1px solid ${v.inputBorder}`,
                  borderRadius: 8,
                  padding: "8px 12px",
                  color: v.inputText,
                  fontSize: 14,
                  outline: "none",
                }}
                data-testid="input-friend-firstname"
              />
              <input
                type="text"
                placeholder={t("m2.circle.lastName", "Last name")}
                value={friendLastName}
                onChange={(e) => setFriendLastName(e.target.value)}
                style={{
                  flex: 1,
                  background: v.inputBg,
                  border: `1px solid ${v.inputBorder}`,
                  borderRadius: 8,
                  padding: "8px 12px",
                  color: v.inputText,
                  fontSize: 14,
                  outline: "none",
                }}
                data-testid="input-friend-lastname"
              />
            </div>
            <input
              type="email"
              placeholder={t("m2.circle.email", "Email")}
              value={friendEmail}
              onChange={(e) => setFriendEmail(e.target.value)}
              style={{
                background: v.inputBg,
                border: `1px solid ${v.inputBorder}`,
                borderRadius: 8,
                padding: "8px 12px",
                color: v.inputText,
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
                borderRadius: 8,
                padding: "10px",
                fontSize: 14,
                fontWeight: 600,
                cursor:
                  friendFirstName.trim() && friendEmail.trim()
                    ? "pointer"
                    : "default",
              }}
              data-testid="btn-submit-friend"
            >
              {addFriendMutation.isPending
                ? "…"
                : t("m2.circle.sendInvite", "Send Invite")}
            </button>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {friendList.map((friend: any, i: number) => (
                <div
                  key={friend.id || i}
                  style={{
                    ...cardBase,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                  data-testid={`card-friend-${i}`}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: `color-mix(in srgb, ${v.accent} 15%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "'Playfair Display', Georgia, serif",
                      color: v.accent,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {(friend.firstName || friend.name || "?")[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
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
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: 4,
                      color: v.muted,
                    }}
                    data-testid={`btn-delete-friend-${i}`}
                  >
                    <Trash2 style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              ))}
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
          margin: "0 0 8px",
        }}
        data-testid="text-m2-circle-title"
      >
        {t("m2.circle.title", "Circle")}
      </h1>
      <p style={{ fontSize: 14, color: v.textSecondary, marginBottom: 16 }}>
        {t("m2.circle.subtitle", "Connect with fellow whisky enthusiasts")}
      </p>

      {!session.signedIn && !pid && (
        <div
          style={{
            background: v.elevated,
            borderRadius: 12,
            padding: "24px 16px",
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
          <div
            style={{
              display: "flex",
              gap: 6,
              marginBottom: 20,
              overflowX: "auto",
              paddingBottom: 4,
            }}
            data-testid="m2-circle-tabs"
          >
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={pillStyle(activeTab === tab.key)}
                data-testid={`tab-${tab.key}`}
              >
                <tab.icon style={{ width: 14, height: 14 }} />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "rankings" && renderRankings()}
          {activeTab === "twins" && renderTwins()}
          {activeTab === "leaderboard" && renderLeaderboard()}
          {activeTab === "activity" && renderActivity()}
          {activeTab === "friends" && renderFriends()}
        </>
      )}
    </div>
  );
}

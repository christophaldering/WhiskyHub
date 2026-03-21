import { useState, useEffect, useCallback } from "react";
import type { ThemeTokens } from "../../tokens";
import type { Translations } from "../../i18n";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";
import { UserPlus, UserCheck, TabCircle, Search } from "../../icons";
import { friendsApi } from "@/lib/api";

interface Friend {
  id: string;
  friendId: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avgScore?: number;
  lastSeenAt?: string;
  photoUrl?: string | null;
}

interface FriendRequest {
  id: string;
  fromParticipantId: string;
  toParticipantId: string;
  fromName?: string;
  toName?: string;
  status: string;
  direction?: string;
}

interface Props {
  th: ThemeTokens;
  t: Translations;
  participantId: string | null;
}

function isOnline(lastSeen: string | undefined): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 2.5 * 60 * 1000;
}

export default function FriendsTab({ th, t, participantId }: Props) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);

  const loadData = useCallback(() => {
    if (!participantId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      friendsApi.getAll(participantId).catch(() => []),
      friendsApi.getPending(participantId).catch(() => []),
    ]).then(([f, r]) => {
      setFriends(Array.isArray(f) ? f : []);
      setRequests(Array.isArray(r) ? r as FriendRequest[] : []);
      setLoading(false);
    });
  }, [participantId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAccept = (friendId: string) => {
    if (!participantId) return;
    friendsApi.accept(participantId, friendId).then(() => loadData()).catch(() => {});
  };

  const handleDecline = (friendId: string) => {
    if (!participantId) return;
    friendsApi.decline(participantId, friendId).then(() => loadData()).catch(() => {});
  };

  const handleSendRequest = () => {
    if (!participantId || !searchQuery.trim()) return;
    setSending(true);
    const parts = searchQuery.trim().split(/\s+/);
    friendsApi.create(participantId, {
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" ") || "",
      email: "",
    }).then(() => {
      setSearchQuery("");
      setSending(false);
      loadData();
    }).catch(() => setSending(false));
  };

  const incoming = requests.filter((r) => r.direction === "incoming" || r.toParticipantId === participantId);
  const outgoing = requests.filter((r) => r.direction === "outgoing" || r.fromParticipantId === participantId);

  if (loading) {
    return (
      <div style={{ padding: `${SP.lg}px 0` }}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} style={{
            height: 60, background: th.bgCard, borderRadius: RADIUS.md,
            marginBottom: SP.sm, opacity: 0.6,
          }} className="v2-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="v2-fade-up" data-testid="v2-circle-friends">
      <div style={{
        display: "flex", alignItems: "center", gap: SP.sm,
        marginBottom: SP.lg,
      }}>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: SP.sm,
          background: th.inputBg, borderRadius: RADIUS.md,
          padding: `0 ${SP.sm}px`, minHeight: TOUCH_MIN,
          border: `1px solid ${th.border}`,
        }}>
          <Search color={th.muted} size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.circleSearchFriend}
            data-testid="v2-circle-search-friend"
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: th.text, fontSize: 14, fontFamily: FONT.body,
              padding: `${SP.sm}px 0`,
            }}
          />
        </div>
        {searchQuery.trim() && (
          <button
            onClick={handleSendRequest}
            disabled={sending}
            data-testid="v2-circle-send-request"
            style={{
              display: "flex", alignItems: "center", gap: SP.xs,
              padding: `${SP.sm}px ${SP.md}px`, minHeight: TOUCH_MIN,
              borderRadius: RADIUS.md, border: "none",
              background: th.gold, color: "#0e0b05",
              fontFamily: FONT.body, fontSize: 13, fontWeight: 600,
              cursor: sending ? "wait" : "pointer",
              opacity: sending ? 0.6 : 1,
            }}
          >
            <UserPlus color="#0e0b05" size={16} />
            {t.circleAddFriend}
          </button>
        )}
        {!searchQuery.trim() && (
          <button
            onClick={() => setSearchMode(!searchMode)}
            data-testid="v2-circle-toggle-search"
            style={{
              width: TOUCH_MIN, height: TOUCH_MIN,
              borderRadius: RADIUS.md, border: `1px solid ${th.border}`,
              background: searchMode ? th.gold : "transparent",
              color: searchMode ? "#0e0b05" : th.muted,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <UserPlus color={searchMode ? "#0e0b05" : th.muted} size={18} />
          </button>
        )}
      </div>

      {incoming.length > 0 && (
        <div style={{ marginBottom: SP.lg }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: th.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: SP.sm }}>
            {t.circlePending} ({incoming.length})
          </p>
          {incoming.map((req) => (
            <div
              key={req.id}
              style={{
                display: "flex", alignItems: "center", gap: SP.sm,
                padding: `${SP.sm}px ${SP.md}px`, borderRadius: RADIUS.md,
                background: th.bgCard, border: `1px solid ${th.border}`,
                marginBottom: SP.xs,
              }}
              data-testid={`v2-circle-request-${req.id}`}
            >
              <div style={{
                width: 36, height: 36, borderRadius: RADIUS.full,
                background: `rgba(212,168,71,0.12)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <UserPlus color={th.gold} size={16} />
              </div>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: th.text }}>
                {req.fromName || "Someone"}
              </span>
              <button
                onClick={() => handleAccept(req.id)}
                data-testid={`v2-circle-accept-${req.id}`}
                style={{
                  minHeight: TOUCH_MIN, padding: `${SP.xs}px ${SP.sm}px`,
                  borderRadius: RADIUS.sm, border: "none",
                  background: th.green, color: "#fff",
                  fontSize: 12, fontWeight: 600, fontFamily: FONT.body,
                  cursor: "pointer",
                }}
              >
                {t.circleAccept}
              </button>
              <button
                onClick={() => handleDecline(req.id)}
                data-testid={`v2-circle-decline-${req.id}`}
                style={{
                  minHeight: TOUCH_MIN, padding: `${SP.xs}px ${SP.sm}px`,
                  borderRadius: RADIUS.sm, border: `1px solid ${th.border}`,
                  background: "transparent", color: th.muted,
                  fontSize: 12, fontWeight: 600, fontFamily: FONT.body,
                  cursor: "pointer",
                }}
              >
                {t.circleDecline}
              </button>
            </div>
          ))}
        </div>
      )}

      {outgoing.length > 0 && (
        <div style={{ marginBottom: SP.lg }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: th.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: SP.sm }}>
            {t.circlePending}
          </p>
          {outgoing.map((req) => (
            <div
              key={req.id}
              style={{
                display: "flex", alignItems: "center", gap: SP.sm,
                padding: `${SP.sm}px ${SP.md}px`, borderRadius: RADIUS.md,
                background: th.bgCard, border: `1px solid ${th.border}`,
                marginBottom: SP.xs,
              }}
              data-testid={`v2-circle-outgoing-${req.id}`}
            >
              <div style={{
                width: 36, height: 36, borderRadius: RADIUS.full,
                background: th.bgCard,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <UserPlus color={th.muted} size={16} />
              </div>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: th.text }}>
                {req.toName || "Someone"}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: `2px ${SP.sm}px`,
                borderRadius: RADIUS.full, background: th.bgCard, color: th.muted,
              }}>
                {t.circlePending}
              </span>
            </div>
          ))}
        </div>
      )}

      {friends.length === 0 && incoming.length === 0 && outgoing.length === 0 ? (
        <div style={{ textAlign: "center", padding: `${SP.xxl}px 0` }}>
          <TabCircle color={th.faint} size={40} style={{ marginBottom: SP.md }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: th.text, marginBottom: SP.xs }}>{t.circleFriends}</p>
          <p style={{ fontSize: 12, color: th.muted }}>{t.circleNoFriends}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: SP.xs }}>
          {friends.map((friend) => {
            const name = friend.name || [friend.firstName, friend.lastName].filter(Boolean).join(" ") || "—";
            const online = isOnline(friend.lastSeenAt);

            return (
              <div
                key={friend.id || friend.friendId}
                style={{
                  display: "flex", alignItems: "center", gap: SP.sm,
                  padding: `${SP.sm + 2}px ${SP.md}px`, borderRadius: RADIUS.md,
                  background: th.bgCard, border: `1px solid ${th.border}`,
                }}
                data-testid={`v2-circle-friend-${friend.id || friend.friendId}`}
              >
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: RADIUS.full,
                    background: `rgba(212,168,71,0.12)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: FONT.display, fontSize: 16, fontWeight: 700, color: th.gold,
                  }}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                  {online && (
                    <div style={{
                      position: "absolute", bottom: 0, right: 0,
                      width: 10, height: 10, borderRadius: RADIUS.full,
                      background: th.green,
                      border: `2px solid ${th.bg}`,
                    }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: th.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {name}
                  </p>
                  {online && (
                    <p style={{ fontSize: 11, color: th.green, margin: 0 }}>{t.circleOnline}</p>
                  )}
                </div>
                {typeof friend.avgScore === "number" && (
                  <span style={{
                    fontFamily: FONT.display, fontSize: 14, fontWeight: 700,
                    color: th.gold, flexShrink: 0,
                  }}>
                    {friend.avgScore.toFixed(1)}
                  </span>
                )}
                <UserCheck color={th.green} size={16} style={{ flexShrink: 0 }} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

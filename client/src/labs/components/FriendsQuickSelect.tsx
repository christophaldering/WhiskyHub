import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Users, Check } from "lucide-react";
import { friendsApi, inviteApi } from "@/lib/api";
import type { WhiskyFriend } from "@shared/schema";

interface FriendsQuickSelectProps {
  participantId: string;
  tastingId: string;
  onToggle: (email: string, selected: boolean) => void;
  selectedEmails: string[];
}

export default function FriendsQuickSelect({
  participantId,
  tastingId,
  onToggle,
  selectedEmails,
}: FriendsQuickSelectProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);

  const { data: friends = [] } = useQuery<WhiskyFriend[]>({
    queryKey: ["friends", participantId],
    queryFn: () => friendsApi.getAll(participantId),
    enabled: !!participantId,
  });

  const { data: existingInvites = [] } = useQuery<{ email: string }[]>({
    queryKey: ["invites", tastingId],
    queryFn: () => inviteApi.getForTasting(tastingId),
    enabled: !!tastingId,
  });

  const alreadyInvitedEmails = new Set(
    existingInvites.map((inv) => inv.email.toLowerCase())
  );

  const friendsWithEmail = friends.filter(
    (f) => f.email && f.status === "accepted"
  );

  if (friendsWithEmail.length === 0) return null;

  const selectedSet = new Set(selectedEmails.map((e) => e.toLowerCase()));

  const availableFriends = friendsWithEmail.filter(
    (f) => !alreadyInvitedEmails.has(f.email.toLowerCase())
  );
  const alreadyInvitedFriends = friendsWithEmail.filter((f) =>
    alreadyInvitedEmails.has(f.email.toLowerCase())
  );

  return (
    <div data-testid="labs-friends-quick-select">
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          fontFamily: "inherit",
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: expanded ? 8 : 0,
        }}
        data-testid="button-toggle-friends"
      >
        <Users
          className="w-3.5 h-3.5"
          style={{ color: "var(--labs-accent)" }}
        />
        <span
          className="text-xs font-semibold"
          style={{
            color: "var(--labs-text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {t("invite.friendsList", "Whisky Friends")}
        </span>
        <span
          className="text-xs"
          style={{ color: "var(--labs-text-muted)" }}
        >
          {expanded ? "\u25B2" : "\u25BC"}
        </span>
      </button>

      {expanded && (
        <div
          style={{
            maxHeight: 160,
            overflowY: "auto",
            borderRadius: 8,
            border: "1px solid var(--labs-border-subtle)",
          }}
        >
          {availableFriends.map((friend) => {
            const isSelected = selectedSet.has(friend.email.toLowerCase());
            return (
              <label
                key={friend.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  cursor: "pointer",
                  borderBottom: "1px solid var(--labs-border-subtle)",
                  background: isSelected
                    ? "color-mix(in srgb, var(--labs-accent) 10%, transparent)"
                    : "transparent",
                  transition: "background 0.15s",
                }}
                data-testid={`friend-row-${friend.id}`}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    border: isSelected
                      ? "2px solid var(--labs-accent)"
                      : "2px solid var(--labs-border)",
                    background: isSelected
                      ? "var(--labs-accent)"
                      : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.15s",
                  }}
                  data-testid={`checkbox-friend-${friend.id}`}
                >
                  {isSelected && (
                    <Check
                      className="w-3 h-3"
                      style={{ color: "#fff" }}
                    />
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() =>
                    onToggle(friend.email.toLowerCase(), !isSelected)
                  }
                  style={{ display: "none" }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    className="text-sm font-medium"
                    style={{
                      color: "var(--labs-text)",
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {friend.firstName} {friend.lastName}
                  </p>
                  <p
                    className="text-xs"
                    style={{
                      color: "var(--labs-text-muted)",
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {friend.email}
                  </p>
                </div>
              </label>
            );
          })}

          {alreadyInvitedFriends.map((friend) => (
            <div
              key={friend.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderBottom: "1px solid var(--labs-border-subtle)",
                opacity: 0.45,
                cursor: "not-allowed",
              }}
              data-testid={`friend-row-disabled-${friend.id}`}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  border: "2px solid var(--labs-border)",
                  background: "var(--labs-surface)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Check
                  className="w-3 h-3"
                  style={{ color: "var(--labs-text-muted)" }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  className="text-sm font-medium"
                  style={{
                    color: "var(--labs-text)",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {friend.firstName} {friend.lastName}
                </p>
                <p
                  className="text-xs"
                  style={{
                    color: "var(--labs-text-muted)",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {friend.email} ({t("invite.alreadyInvited", "already invited")})
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

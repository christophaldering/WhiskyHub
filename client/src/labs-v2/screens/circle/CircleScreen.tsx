import { useState, useCallback } from "react";
import { useV2Theme, useV2Lang } from "../../LabsV2Layout";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";
import { TabCircle } from "../../icons";
import FriendsTab from "./FriendsTab";
import GroupsTab from "./GroupsTab";
import Leaderboard from "./Leaderboard";
import SessionsBoard from "./SessionsBoard";
import ActivityFeed from "./ActivityFeed";
import { getParticipantId } from "@/lib/api";

type CircleTab = "friends" | "groups" | "board" | "sessions" | "feed";

export default function CircleScreen() {
  const { th } = useV2Theme();
  const { t, lang } = useV2Lang();
  const [activeTab, setActiveTab] = useState<CircleTab>("friends");
  const participantId = getParticipantId();

  const goToFriends = useCallback(() => setActiveTab("friends"), []);

  const tabs: { key: CircleTab; label: string }[] = [
    { key: "friends", label: t.circleFriends },
    { key: "groups", label: t.circleGroups },
    { key: "board", label: t.circleBoard },
    { key: "sessions", label: t.circleSessions },
    { key: "feed", label: t.circleFeed },
  ];

  return (
    <div className="v2-fade-up" style={{ padding: `${SP.xl}px ${SP.md}px` }}>
      <div style={{ textAlign: "center", marginBottom: SP.lg }}>
        <TabCircle color={th.gold} size={32} style={{ marginBottom: SP.sm }} />
        <h1
          style={{
            fontFamily: FONT.display, fontSize: 24, fontWeight: 600,
            color: th.text, marginBottom: SP.xs,
          }}
          data-testid="v2-circle-title"
        >
          {t.circleTitle}
        </h1>
        <p style={{ fontSize: 13, color: th.muted }} data-testid="v2-circle-subtitle">
          {t.circleSub}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          background: th.bgCard,
          borderRadius: RADIUS.md,
          padding: 3,
          marginBottom: SP.lg,
          border: `1px solid ${th.border}`,
        }}
        data-testid="v2-circle-tabs"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              data-testid={`v2-circle-tab-${tab.key}`}
              style={{
                flex: 1,
                minHeight: TOUCH_MIN,
                borderRadius: RADIUS.sm,
                border: "none",
                background: isActive ? th.gold : "transparent",
                color: isActive ? "#0e0b05" : th.muted,
                fontFamily: FONT.body,
                fontSize: 12,
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "friends" && (
        <FriendsTab th={th} t={t} participantId={participantId} />
      )}
      {activeTab === "groups" && (
        <GroupsTab th={th} t={t} participantId={participantId} />
      )}
      {activeTab === "board" && (
        <Leaderboard th={th} t={t} participantId={participantId} />
      )}
      {activeTab === "sessions" && (
        <SessionsBoard th={th} t={t} lang={lang} participantId={participantId} />
      )}
      {activeTab === "feed" && (
        <ActivityFeed th={th} t={t} lang={lang} participantId={participantId} onGoToFriends={goToFriends} />
      )}
    </div>
  );
}

import { useTranslation } from "react-i18next";
import { useSearch } from "wouter";
import { Users, HeartHandshake, Trophy, Medal, Rss } from "lucide-react";
import { TabsContent } from "@/components/ui/tabs";
import { PageLayout, type PageTab } from "@/components/page-layout";
import WhiskyFriends from "@/pages/whisky-friends";
import TasteTwins from "@/pages/taste-twins";
import CommunityRankings from "@/pages/community-rankings";
import Leaderboard from "@/pages/leaderboard";
import ActivityFeed from "@/pages/activity-feed";

const VALID_TABS = ["friends", "twins", "rankings", "leaderboard", "activity"] as const;

const TABS: PageTab[] = [
  { key: "friends", labelKey: "community.tabFriends", fallback: "Freunde", icon: Users, testId: "tab-community-friends" },
  { key: "twins", labelKey: "community.tabTwins", fallback: "Taste Twins", icon: HeartHandshake, testId: "tab-community-twins" },
  { key: "rankings", labelKey: "community.tabRankings", fallback: "Rankings", icon: Trophy, testId: "tab-community-rankings" },
  { key: "leaderboard", labelKey: "community.tabLeaderboard", fallback: "Leaderboard", icon: Medal, testId: "tab-community-leaderboard" },
  { key: "activity", labelKey: "community.tabActivity", fallback: "Aktivität", icon: Rss, testId: "tab-community-activity" },
];

export default function DiscoverCommunity() {
  const { t } = useTranslation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const rawTab = params.get("tab") || "friends";
  const activeTab = VALID_TABS.includes(rawTab as any) ? rawTab : "friends";

  const handleTabChange = (value: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", value);
    window.history.replaceState({}, "", url.toString());
  };

  return (
    <PageLayout
      icon={Users}
      title={t("community.title", "Community")}
      tabs={TABS}
      activeTabKey={activeTab}
      onTabChange={handleTabChange}
      tabsTestId="community-tabs-list"
      testId="discover-community-page"
    >
      <TabsContent value="friends" data-testid="tab-content-friends">
        <WhiskyFriends />
      </TabsContent>
      <TabsContent value="twins" data-testid="tab-content-twins">
        <TasteTwins />
      </TabsContent>
      <TabsContent value="rankings" data-testid="tab-content-rankings">
        <CommunityRankings />
      </TabsContent>
      <TabsContent value="leaderboard" data-testid="tab-content-leaderboard">
        <Leaderboard />
      </TabsContent>
      <TabsContent value="activity" data-testid="tab-content-activity">
        <ActivityFeed />
      </TabsContent>
    </PageLayout>
  );
}

import { useTranslation } from "react-i18next";
import { useSearch } from "wouter";
import { Users, HeartHandshake, Trophy, Medal, Rss } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import WhiskyFriends from "@/pages/whisky-friends";
import TasteTwins from "@/pages/taste-twins";
import CommunityRankings from "@/pages/community-rankings";
import Leaderboard from "@/pages/leaderboard";
import ActivityFeed from "@/pages/activity-feed";

const TABS = [
  { value: "friends", labelKey: "community.tabFriends", fallback: "Freunde", icon: Users },
  { value: "twins", labelKey: "community.tabTwins", fallback: "Taste Twins", icon: HeartHandshake },
  { value: "rankings", labelKey: "community.tabRankings", fallback: "Rankings", icon: Trophy },
  { value: "leaderboard", labelKey: "community.tabLeaderboard", fallback: "Leaderboard", icon: Medal },
  { value: "activity", labelKey: "community.tabActivity", fallback: "Aktivität", icon: Rss },
] as const;

const VALID_TABS = TABS.map((t) => t.value);

export default function DiscoverCommunity() {
  const { t } = useTranslation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const rawTab = params.get("tab") || "friends";
  const activeTab = VALID_TABS.includes(rawTab as any) ? rawTab : "friends";

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 min-w-0 overflow-x-hidden" data-testid="discover-community-page">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-7 h-7 text-primary" />
        <h1
          className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-primary tracking-tight"
          data-testid="text-community-title"
        >
          {t("community.title", "Community")}
        </h1>
      </div>

      <Tabs value={activeTab} data-testid="community-tabs">
        <div className="overflow-x-auto -mx-4 px-4 pb-1">
          <TabsList className="w-max min-w-full sm:w-full grid grid-cols-5 h-10" data-testid="community-tabs-list">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-serif whitespace-nowrap"
                data-testid={`tab-community-${tab.value}`}
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set("tab", tab.value);
                  window.history.replaceState({}, "", url.toString());
                }}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t(tab.labelKey, tab.fallback)}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

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
      </Tabs>
    </div>
  );
}

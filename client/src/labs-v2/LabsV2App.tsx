import { useState, useCallback } from "react";
import LabsV2Layout from "./LabsV2Layout";
import { useV2Theme, useV2Lang } from "./LabsV2Layout";
import TastingsHub from "./TastingsHub";
import JoinFlow from "./JoinFlow";
import PlaceholderTab from "./PlaceholderTab";
import { RatingFlow } from "./screens/rating/RatingFlow";
import type { RatingData } from "./types/rating";

type TabId = "tastings" | "discover" | "world" | "circle";
type SubScreen = null | "join" | "solo" | "host" | "rating";

function RatingScreen({ onBack }: { onBack: () => void }) {
  const { th } = useV2Theme();
  const { t } = useV2Lang();
  const [, setRatingResult] = useState<RatingData | null>(null);

  return (
    <RatingFlow
      th={th}
      t={t}
      whisky={{
        name: "Bunnahabhain 12",
        region: "Islay",
        cask: "Sherry",
        blind: false,
      }}
      tastingId="demo"
      dramIdx={1}
      total={6}
      tastingStatus="open"
      participantId="demo"
      onDone={(data) => { setRatingResult(data); }}
      onBack={onBack}
    />
  );
}

export default function LabsV2App() {
  const [activeTab, setActiveTab] = useState<TabId>("tastings");
  const [subScreen, setSubScreen] = useState<SubScreen>(null);

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    setSubScreen(null);
  }, []);

  const goBack = useCallback(() => {
    setSubScreen(null);
  }, []);

  const handleEnterLive = useCallback((_tid: string) => {
    setSubScreen("rating");
  }, []);

  const handleLogoClick = useCallback(() => {
    setActiveTab("tastings");
    setSubScreen(null);
  }, []);

  const hideTabBar = subScreen !== null;

  let content: React.ReactNode;

  if (subScreen === "join") {
    content = <JoinFlow onBack={goBack} onEnterLive={handleEnterLive} />;
  } else if (subScreen === "rating") {
    content = <RatingScreen onBack={goBack} />;
  } else if (subScreen === "solo" || subScreen === "host") {
    content = <PlaceholderTab variant="discover" />;
  } else if (activeTab === "tastings") {
    content = (
      <TastingsHub
        onJoin={() => setSubScreen("join")}
        onSolo={() => setSubScreen("solo")}
        onHost={() => setSubScreen("host")}
      />
    );
  } else if (activeTab === "discover") {
    content = <PlaceholderTab variant="discover" />;
  } else if (activeTab === "world") {
    content = <PlaceholderTab variant="world" />;
  } else {
    content = <PlaceholderTab variant="circle" />;
  }

  return (
    <LabsV2Layout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      hideTabBar={hideTabBar}
      onLogoClick={handleLogoClick}
    >
      {content}
    </LabsV2Layout>
  );
}

import { useState, useCallback } from "react";
import LabsV2Layout from "./LabsV2Layout";
import TastingsHub from "./TastingsHub";
import JoinFlow from "./JoinFlow";
import PlaceholderTab from "./PlaceholderTab";

type TabId = "tastings" | "discover" | "world" | "circle";
type SubScreen = null | "join" | "solo" | "host" | "rating";

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
  } else if (subScreen === "solo" || subScreen === "host" || subScreen === "rating") {
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

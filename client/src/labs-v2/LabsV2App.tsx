import { useState, useCallback } from "react";
import LabsV2Layout from "./LabsV2Layout";
import { useV2Theme, useV2Lang } from "./LabsV2Layout";
import OfflineBanner from "./components/OfflineBanner";
import TastingsHub from "./TastingsHub";
import JoinFlow from "./JoinFlow";
import PlaceholderTab from "./PlaceholderTab";
import EntdeckenScreen from "./screens/entdecken/EntdeckenScreen";
import CircleScreen from "./screens/circle/CircleScreen";
import { RatingFlow } from "./screens/rating/RatingFlow";
import SoloFlow from "./screens/solo/SoloFlow";
import HostWizard from "./screens/host/HostWizard";
import LiveTasting from "./screens/live/LiveTasting";
import ResultsScreen from "./screens/results/ResultsScreen";
import MeineWeltScreen from "./screens/meinewelt/MeineWeltScreen";
import type { RatingData } from "./types/rating";

type TabId = "tastings" | "discover" | "world" | "circle";
type SubScreen = null | "join" | "solo" | "host" | "rating" | "live" | "results";

function SoloScreen({ onBack }: { onBack: () => void }) {
  const { th } = useV2Theme();
  const { t } = useV2Lang();

  return <SoloFlow th={th} t={t} onBack={onBack} />;
}

function ResultsScreenWrapper({ onBack }: { onBack: () => void }) {
  const { th } = useV2Theme();
  const { t, lang } = useV2Lang();

  return (
    <ResultsScreen
      th={th}
      t={t}
      lang={lang}
      tastingId="demo"
      participantId="demo"
      isHost={false}
      onBack={onBack}
    />
  );
}

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

function OfflineBannerWrapper() {
  const { th } = useV2Theme();
  const { t } = useV2Lang();
  return <OfflineBanner th={th} t={t} />;
}

export default function LabsV2App() {
  const [activeTab, setActiveTab] = useState<TabId>("tastings");
  const [subScreen, setSubScreen] = useState<SubScreen>(null);
  const [activeTastingId, setActiveTastingId] = useState<string>("");

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    setSubScreen(null);
  }, []);

  const goBack = useCallback(() => {
    setSubScreen(null);
    setActiveTastingId("");
  }, []);

  const handleEnterLive = useCallback((tid: string) => {
    setActiveTastingId(tid);
    setSubScreen("live");
  }, []);

  const handleLogoClick = useCallback(() => {
    setActiveTab("tastings");
    setSubScreen(null);
  }, []);

  const hideTabBar = subScreen !== null;

  let content: React.ReactNode;

  if (subScreen === "results") {
    content = <ResultsScreenWrapper onBack={goBack} />;
  } else if (subScreen === "join") {
    content = <JoinFlow onBack={goBack} onEnterLive={handleEnterLive} />;
  } else if (subScreen === "live" && activeTastingId) {
    content = <LiveTasting tastingId={activeTastingId} onBack={goBack} />;
  } else if (subScreen === "rating") {
    content = <RatingScreen onBack={goBack} />;
  } else if (subScreen === "solo") {
    content = <SoloScreen onBack={goBack} />;
  } else if (subScreen === "host") {
    content = <HostWizard onBack={goBack} />;
  } else if (activeTab === "tastings") {
    content = (
      <TastingsHub
        onJoin={() => setSubScreen("join")}
        onSolo={() => setSubScreen("solo")}
        onHost={() => setSubScreen("host")}
      />
    );
  } else if (activeTab === "discover") {
    content = <EntdeckenScreen />;
  } else if (activeTab === "world") {
    content = <MeineWeltScreen />;
  } else {
    content = <CircleScreen />;
  }

  return (
    <LabsV2Layout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      hideTabBar={hideTabBar}
      onLogoClick={handleLogoClick}
    >
      <OfflineBannerWrapper />
      {content}
    </LabsV2Layout>
  );
}

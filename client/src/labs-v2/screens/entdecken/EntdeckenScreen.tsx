import { useState, useCallback } from "react";
import EntdeckenHub from "./EntdeckenHub";
import ExploreWhiskies from "./ExploreWhiskies";
import BottleDetail from "./BottleDetail";
import Lexikon from "./Lexikon";
import TastingGuide from "./TastingGuide";
import Distilleries from "./Distilleries";
import HistoricalArchive from "./HistoricalArchive";
import PlaceholderTab from "../../PlaceholderTab";

type SubRoute =
  | null
  | "explore"
  | "lexikon"
  | "guide"
  | "dest"
  | "bottlers"
  | "history"
  | { type: "bottle"; id: string };

export default function EntdeckenScreen() {
  const [subRoute, setSubRoute] = useState<SubRoute>(null);

  const goHub = useCallback(() => setSubRoute(null), []);

  const goExplore = useCallback(() => setSubRoute("explore"), []);

  const handleHubNavigate = useCallback((route: string) => {
    setSubRoute(route as SubRoute);
  }, []);

  const handleSelectBottle = useCallback((id: string) => {
    setSubRoute({ type: "bottle", id });
  }, []);

  if (subRoute === null) {
    return <EntdeckenHub onNavigate={handleHubNavigate} />;
  }

  if (subRoute === "explore") {
    return <ExploreWhiskies onBack={goHub} onSelectBottle={handleSelectBottle} />;
  }

  if (typeof subRoute === "object" && subRoute.type === "bottle") {
    return <BottleDetail bottleId={subRoute.id} onBack={goExplore} />;
  }

  if (subRoute === "lexikon") {
    return <Lexikon onBack={goHub} />;
  }

  if (subRoute === "guide") {
    return <TastingGuide onBack={goHub} />;
  }

  if (subRoute === "dest") {
    return <Distilleries onBack={goHub} />;
  }

  if (subRoute === "history") {
    return <HistoricalArchive onBack={goHub} />;
  }

  if (subRoute === "bottlers") {
    return <PlaceholderTab variant="discover" />;
  }

  return <EntdeckenHub onNavigate={handleHubNavigate} />;
}

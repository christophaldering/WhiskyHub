import { useTranslation } from "react-i18next";
import { useSearch } from "wouter";
import { Building2, Map, Package } from "lucide-react";
import { TabsContent } from "@/components/ui/tabs";
import { PageLayout, type PageTab } from "@/components/page-layout";
import DistilleryEncyclopedia from "@/pages/distillery-encyclopedia";
import DistilleryMap from "@/pages/distillery-map";
import Bottlers from "@/pages/bottlers";

const VALID_TABS = ["distilleries", "map", "bottlers"] as const;

const TABS: PageTab[] = [
  { key: "distilleries", labelKey: "distillery.tabTitle", fallback: "Destillerien", icon: Building2, testId: "tab-distilleries" },
  { key: "map", labelKey: "distilleryMap.tabTitle", fallback: "Karte", icon: Map, testId: "tab-map" },
  { key: "bottlers", labelKey: "bottler.tabTitle", fallback: "Abfüller", icon: Package, testId: "tab-bottlers" },
];

export default function DiscoverDistilleries() {
  const { t } = useTranslation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const tab = params.get("tab") || "distilleries";
  const activeTab = VALID_TABS.includes(tab as any) ? tab : "distilleries";

  const handleTabChange = (value: string) => {
    const url = new URL(window.location.href);
    if (value === "distilleries") url.searchParams.delete("tab");
    else url.searchParams.set("tab", value);
    window.history.replaceState({}, "", url.toString());
  };

  return (
    <PageLayout
      icon={Building2}
      title={t("distillery.tabTitle", "Destillerien")}
      tabs={TABS}
      activeTabKey={activeTab}
      onTabChange={handleTabChange}
      tabsTestId="tabs-distilleries"
      testId="discover-distilleries-page"
    >
      <TabsContent value="distilleries" data-testid="content-distilleries">
        <DistilleryEncyclopedia />
      </TabsContent>
      <TabsContent value="map" data-testid="content-map">
        <DistilleryMap />
      </TabsContent>
      <TabsContent value="bottlers" data-testid="content-bottlers">
        <Bottlers />
      </TabsContent>
    </PageLayout>
  );
}

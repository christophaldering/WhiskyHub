import { useTranslation } from "react-i18next";
import { useSearch } from "wouter";
import { Building2, Map, Package } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageLayout } from "@/components/page-layout";
import DistilleryEncyclopedia from "@/pages/distillery-encyclopedia";
import DistilleryMap from "@/pages/distillery-map";
import Bottlers from "@/pages/bottlers";

export default function DiscoverDistilleries() {
  const { t } = useTranslation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const tab = params.get("tab") || "distilleries";

  const validTabs = ["distilleries", "map", "bottlers"];
  const activeTab = validTabs.includes(tab) ? tab : "distilleries";

  return (
    <PageLayout
      icon={Building2}
      title={t("distillery.tabTitle", "Destillerien")}
      testId="discover-distilleries-page"
    >
      <Tabs value={activeTab} className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 pb-1">
          <TabsList className="w-full grid grid-cols-3" data-testid="tabs-distilleries">
            <TabsTrigger
              value="distilleries"
              className="gap-1.5 text-xs sm:text-sm"
              data-testid="tab-distilleries"
            >
              <Building2 className="w-4 h-4 shrink-0" />
              <span className="truncate">{t("distillery.tabTitle", "Destillerien")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="map"
              className="gap-1.5 text-xs sm:text-sm"
              data-testid="tab-map"
            >
              <Map className="w-4 h-4 shrink-0" />
              <span className="truncate">{t("distilleryMap.tabTitle", "Karte")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="bottlers"
              className="gap-1.5 text-xs sm:text-sm"
              data-testid="tab-bottlers"
            >
              <Package className="w-4 h-4 shrink-0" />
              <span className="truncate">{t("bottler.tabTitle", "Abfüller")}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="distilleries" data-testid="content-distilleries">
          <DistilleryEncyclopedia />
        </TabsContent>
        <TabsContent value="map" data-testid="content-map">
          <DistilleryMap />
        </TabsContent>
        <TabsContent value="bottlers" data-testid="content-bottlers">
          <Bottlers />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}

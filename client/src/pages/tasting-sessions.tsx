import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { Wine } from "lucide-react";
import { PageLayout } from "@/components/page-layout";
import Sessions from "@/pages/sessions";
import TastingHistory from "@/pages/tasting-history";

export default function TastingSessions() {
  const { t } = useTranslation();
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const rawTab = params.get("tab") || "all";
  const validTabs = ["all", "mine", "active"];
  const initialTab = validTabs.includes(rawTab) ? rawTab : "all";
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const url = new URL(window.location.href);
    if (value === "all") url.searchParams.delete("tab");
    else url.searchParams.set("tab", value);
    window.history.replaceState({}, "", url.toString());
  };

  return (
    <PageLayout
      icon={Wine}
      title={t("nav.sessions")}
      testId="tasting-sessions-page"
    >
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="overflow-x-auto -mx-4 px-4 pb-1">
          <TabsList className="w-full grid grid-cols-3" data-testid="tabs-sessions">
            <TabsTrigger value="all" data-testid="tab-sessions-all">
              {t("tastingSessions.tabAll", "Alle Sessions")}
            </TabsTrigger>
            <TabsTrigger value="active" data-testid="tab-sessions-active">
              {t("tastingSessions.tabActive", "Aktiv")}
            </TabsTrigger>
            <TabsTrigger value="mine" data-testid="tab-sessions-mine">
              {t("tastingSessions.tabMine", "Meine Tastings")}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="mt-4">
          <Sessions />
        </TabsContent>
        <TabsContent value="active" className="mt-4">
          <Sessions />
        </TabsContent>
        <TabsContent value="mine" className="mt-4">
          <TastingHistory />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}

import { useState } from "react";
import { TabsContent } from "@/components/ui/tabs";
import { useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { Wine } from "lucide-react";
import { PageLayout, type PageTab } from "@/components/page-layout";
import Home from "@/pages/home";
import TastingTemplates from "@/pages/tasting-templates";
import PairingSuggestions from "@/pages/pairing-suggestions";

const VALID_TABS = ["lobby", "templates", "pairings"] as const;

const TABS: PageTab[] = [
  { key: "lobby", labelKey: "tastingHub.tabLobby", testId: "tab-lobby" },
  { key: "templates", labelKey: "tastingHub.tabTemplates", testId: "tab-templates" },
  { key: "pairings", labelKey: "tastingHub.tabPairings", testId: "tab-pairings" },
];

export default function TastingHub() {
  const { t } = useTranslation();
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const tabParam = params.get("tab") || "lobby";
  const initialTab = VALID_TABS.includes(tabParam as any) ? tabParam : "lobby";
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const url = new URL(window.location.href);
    if (value === "lobby") url.searchParams.delete("tab");
    else url.searchParams.set("tab", value);
    window.history.replaceState({}, "", url.toString());
  };

  return (
    <PageLayout
      icon={Wine}
      title={t("tastingHub.title")}
      tabs={TABS}
      activeTabKey={activeTab}
      onTabChange={handleTabChange}
      tabsTestId="tabs-list"
      testId="tasting-hub-page"
    >
      <TabsContent value="lobby" data-testid="tab-content-lobby">
        <Home />
      </TabsContent>
      <TabsContent value="templates" data-testid="tab-content-templates">
        <TastingTemplates />
      </TabsContent>
      <TabsContent value="pairings" data-testid="tab-content-pairings">
        <PairingSuggestions />
      </TabsContent>
    </PageLayout>
  );
}

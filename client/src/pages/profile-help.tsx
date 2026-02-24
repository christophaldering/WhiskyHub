import { useTranslation } from "react-i18next";
import { useSearch } from "wouter";
import { HelpCircle, Info, Sparkles, Heart } from "lucide-react";
import { TabsContent } from "@/components/ui/tabs";
import { PageLayout, type PageTab } from "@/components/page-layout";
import Help from "@/pages/help";
import About from "@/pages/about";
import Features from "@/pages/features";
import Donate from "@/pages/donate";

const VALID_TABS = ["help", "about", "features", "donate"] as const;

const TABS: PageTab[] = [
  { key: "help", labelKey: "profileHelp.tabHelp", icon: HelpCircle, testId: "tab-help-help" },
  { key: "about", labelKey: "profileHelp.tabAbout", icon: Info, testId: "tab-help-about" },
  { key: "features", labelKey: "profileHelp.tabFeatures", icon: Sparkles, testId: "tab-help-features" },
  { key: "donate", labelKey: "profileHelp.tabDonate", icon: Heart, testId: "tab-help-donate" },
];

export default function ProfileHelp() {
  const { t } = useTranslation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const rawTab = params.get("tab") || "help";
  const activeTab = VALID_TABS.includes(rawTab as any) ? rawTab : "help";

  const handleTabChange = (value: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", value);
    window.history.replaceState({}, "", url.toString());
  };

  return (
    <PageLayout
      icon={HelpCircle}
      title={t("profileHelp.title")}
      tabs={TABS}
      activeTabKey={activeTab}
      onTabChange={handleTabChange}
      tabsTestId="profile-help-tabs-list"
      testId="profile-help-page"
    >
      <TabsContent value="help" data-testid="tab-content-help">
        <Help />
      </TabsContent>
      <TabsContent value="about" data-testid="tab-content-about">
        <About />
      </TabsContent>
      <TabsContent value="features" data-testid="tab-content-features">
        <Features />
      </TabsContent>
      <TabsContent value="donate" data-testid="tab-content-donate">
        <Donate />
      </TabsContent>
    </PageLayout>
  );
}

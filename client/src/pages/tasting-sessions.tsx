import { useState, lazy, Suspense } from "react";
import { TabsContent } from "@/components/ui/tabs";
import { useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { Wine, Loader2 } from "lucide-react";
import { PageLayout, type PageTab } from "@/components/page-layout";
import Sessions from "@/pages/sessions";
import TastingHistory from "@/pages/tasting-history";

const HostDashboard = lazy(() => import("@/pages/host-dashboard"));
const TastingRecap = lazy(() => import("@/pages/tasting-recap"));

const VALID_TABS = ["sessions", "mine", "host", "recap"] as const;

const TABS: PageTab[] = [
  { key: "sessions", labelKey: "tastingSessions.tabAll", testId: "tab-sessions-all" },
  { key: "mine", labelKey: "tastingSessions.tabMine", testId: "tab-sessions-mine" },
  { key: "host", labelKey: "tastingSessions.tabHost", testId: "tab-sessions-host" },
  { key: "recap", labelKey: "tastingSessions.tabRecap", testId: "tab-sessions-recap" },
];

export default function TastingSessions() {
  const { t } = useTranslation();
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const rawTab = params.get("tab") || "sessions";
  const initialTab = VALID_TABS.includes(rawTab as any) ? rawTab : "sessions";
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const url = new URL(window.location.href);
    if (value === "sessions") url.searchParams.delete("tab");
    else url.searchParams.set("tab", value);
    window.history.replaceState({}, "", url.toString());
  };

  const lazyFallback = (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  return (
    <PageLayout
      icon={Wine}
      title={t("nav.sessions")}
      tabs={TABS}
      activeTabKey={activeTab}
      onTabChange={handleTabChange}
      tabsTestId="tabs-sessions"
      testId="tasting-sessions-page"
    >
      <TabsContent value="sessions" className="mt-4">
        <Sessions />
      </TabsContent>
      <TabsContent value="mine" className="mt-4">
        <TastingHistory />
      </TabsContent>
      <TabsContent value="host" className="mt-4">
        <Suspense fallback={lazyFallback}>
          <HostDashboard />
        </Suspense>
      </TabsContent>
      <TabsContent value="recap" className="mt-4">
        <Suspense fallback={lazyFallback}>
          <TastingRecap />
        </Suspense>
      </TabsContent>
    </PageLayout>
  );
}

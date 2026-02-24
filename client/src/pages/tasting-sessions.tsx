import { useState, lazy, Suspense } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { Wine, Loader2 } from "lucide-react";
import { PageLayout } from "@/components/page-layout";
import Sessions from "@/pages/sessions";
import TastingHistory from "@/pages/tasting-history";

const HostDashboard = lazy(() => import("@/pages/host-dashboard"));
const TastingRecap = lazy(() => import("@/pages/tasting-recap"));

export default function TastingSessions() {
  const { t } = useTranslation();
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const rawTab = params.get("tab") || "sessions";
  const validTabs = ["sessions", "mine", "host", "recap"];
  const initialTab = validTabs.includes(rawTab) ? rawTab : "sessions";
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
      testId="tasting-sessions-page"
    >
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="overflow-x-auto -mx-4 px-4 pb-1">
          <TabsList className="w-full grid grid-cols-4" data-testid="tabs-sessions">
            <TabsTrigger value="sessions" data-testid="tab-sessions-all">
              {t("tastingSessions.tabAll", "Sessions")}
            </TabsTrigger>
            <TabsTrigger value="mine" data-testid="tab-sessions-mine">
              {t("tastingSessions.tabMine", "Meine Tastings")}
            </TabsTrigger>
            <TabsTrigger value="host" data-testid="tab-sessions-host">
              {t("tastingSessions.tabHost", "Host")}
            </TabsTrigger>
            <TabsTrigger value="recap" data-testid="tab-sessions-recap">
              {t("tastingSessions.tabRecap", "Recap")}
            </TabsTrigger>
          </TabsList>
        </div>

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
      </Tabs>
    </PageLayout>
  );
}

import { useState } from "react";
import { TabsContent } from "@/components/ui/tabs";
import { useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { NotebookPen } from "lucide-react";
import { PageLayout, type PageTab } from "@/components/page-layout";
import Journal from "@/pages/journal";
import MyWhiskies from "@/pages/my-whiskies";
import Comparison from "@/pages/comparison";
import TastingRecap from "@/pages/tasting-recap";
import Analytics from "@/pages/analytics";
import BenchmarkAnalyzer from "@/pages/benchmark-analyzer";
import ExportNotes from "@/pages/export-notes";
import DataExport from "@/pages/data-export";

const VALID_TABS = ["journal", "tasted", "compare", "recap", "analytics", "benchmark", "export"] as const;
type TabValue = (typeof VALID_TABS)[number];

const TABS: PageTab[] = [
  { key: "journal", labelKey: "myJournal.tabJournal", testId: "tab-journal" },
  { key: "tasted", labelKey: "myJournal.tabTasted", testId: "tab-tasted" },
  { key: "compare", labelKey: "myJournal.tabCompare", testId: "tab-compare" },
  { key: "recap", labelKey: "myJournal.tabRecap", testId: "tab-recap" },
  { key: "analytics", labelKey: "myJournal.tabAnalytics", badge: "PRO", testId: "tab-analytics" },
  { key: "benchmark", labelKey: "myJournal.tabBenchmark", badge: "PRO", testId: "tab-benchmark" },
  { key: "export", labelKey: "myJournal.tabExport", testId: "tab-export" },
];

export default function MyJournal() {
  const { t } = useTranslation();
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const tabParam = params.get("tab") as TabValue | null;
  const initialTab: TabValue = tabParam && VALID_TABS.includes(tabParam) ? tabParam : "journal";
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabValue);
    const url = new URL(window.location.href);
    if (value === "journal") url.searchParams.delete("tab");
    else url.searchParams.set("tab", value);
    window.history.replaceState({}, "", url.toString());
  };

  return (
    <PageLayout
      icon={NotebookPen}
      title={t("myJournal.title")}
      tabs={TABS}
      activeTabKey={activeTab}
      onTabChange={handleTabChange}
      tabsTestId="my-journal-tabs"
      testId="my-journal-page"
    >
      <TabsContent value="journal">
        <Journal />
      </TabsContent>
      <TabsContent value="tasted">
        <MyWhiskies />
      </TabsContent>
      <TabsContent value="compare">
        <Comparison />
      </TabsContent>
      <TabsContent value="recap">
        <TastingRecap />
      </TabsContent>
      <TabsContent value="analytics">
        <Analytics />
      </TabsContent>
      <TabsContent value="benchmark">
        <BenchmarkAnalyzer />
      </TabsContent>
      <TabsContent value="export">
        <div className="space-y-8">
          <ExportNotes />
          <DataExport />
        </div>
      </TabsContent>
    </PageLayout>
  );
}

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSearch } from "wouter";
import { NotebookPen } from "lucide-react";
import Journal from "@/pages/journal";
import MyWhiskies from "@/pages/my-whiskies";
import ExportNotes from "@/pages/export-notes";
import DataExport from "@/pages/data-export";
import SimpleShell from "@/components/simple/simple-shell";

const VALID_TABS = ["journal", "tasted", "export"] as const;
type TabValue = (typeof VALID_TABS)[number];

export default function MyJournal() {
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
    <SimpleShell maxWidth={900}>
    <div className="min-w-0 overflow-x-hidden" data-testid="my-journal-page">
      <div className="flex items-center gap-3 mb-6">
        <NotebookPen className="w-7 h-7 text-primary" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-my-journal-title">
          Mein Whisky
        </h1>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="overflow-x-auto -mx-4 px-4 pb-1">
          <TabsList className="w-full inline-flex" data-testid="my-journal-tabs">
            <TabsTrigger value="journal" data-testid="tab-journal">
              Journal
            </TabsTrigger>
            <TabsTrigger value="tasted" data-testid="tab-tasted">
              Verkostet
            </TabsTrigger>
            <TabsTrigger value="export" data-testid="tab-export">
              Export
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="journal">
          <Journal />
        </TabsContent>
        <TabsContent value="tasted">
          <MyWhiskies />
        </TabsContent>
        <TabsContent value="export">
          <div className="space-y-8">
            <ExportNotes />
            <DataExport />
          </div>
        </TabsContent>
      </Tabs>
    </div>
    </SimpleShell>
  );
}

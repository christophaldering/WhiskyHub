import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { Wine } from "lucide-react";
import Home from "@/pages/home";
import TastingTemplates from "@/pages/tasting-templates";
import PairingSuggestions from "@/pages/pairing-suggestions";

const VALID_TABS = ["lobby", "templates", "pairings"] as const;

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
    <div className="max-w-5xl mx-auto px-4 py-8 min-w-0 overflow-x-hidden" data-testid="tasting-hub-page">
      <div className="flex items-center gap-3 mb-6">
        <Wine className="w-7 h-7 text-primary" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-tasting-hub-title">
          Tasting
        </h1>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full justify-start" data-testid="tabs-list">
          <TabsTrigger value="lobby" data-testid="tab-lobby">
            Lobby
          </TabsTrigger>
          <TabsTrigger value="templates" data-testid="tab-templates">
            {t("tastingHub.templates", "Vorlagen")}
          </TabsTrigger>
          <TabsTrigger value="pairings" data-testid="tab-pairings">
            Pairings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lobby" data-testid="tab-content-lobby">
          <Home />
        </TabsContent>
        <TabsContent value="templates" data-testid="tab-content-templates">
          <TastingTemplates />
        </TabsContent>
        <TabsContent value="pairings" data-testid="tab-content-pairings">
          <PairingSuggestions />
        </TabsContent>
      </Tabs>
    </div>
  );
}

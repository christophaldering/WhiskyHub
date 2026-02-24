import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
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
    <div className="space-y-6 max-w-4xl mx-auto min-w-0 overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-2xl sm:text-4xl font-serif font-black text-primary tracking-tight break-words" data-testid="text-tasting-sessions-title">
          {t("nav.sessions")}
        </h1>
        <div className="w-12 h-1 bg-primary/50 mt-3" />
      </motion.div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-2">
        <TabsList className="w-full grid grid-cols-3">
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
    </div>
  );
}

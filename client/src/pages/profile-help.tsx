import { useTranslation } from "react-i18next";
import { useSearch } from "wouter";
import { HelpCircle, Info, Sparkles, Heart } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Help from "@/pages/help";
import About from "@/pages/about";
import Features from "@/pages/features";
import Donate from "@/pages/donate";

const TABS = [
  { value: "help", labelKey: "profileHelp.tabHelp", fallback: "Hilfe", icon: HelpCircle },
  { value: "about", labelKey: "profileHelp.tabAbout", fallback: "Über", icon: Info },
  { value: "features", labelKey: "profileHelp.tabFeatures", fallback: "Features", icon: Sparkles },
  { value: "donate", labelKey: "profileHelp.tabDonate", fallback: "Spenden", icon: Heart },
] as const;

const VALID_TABS = TABS.map((t) => t.value);

export default function ProfileHelp() {
  const { t } = useTranslation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const rawTab = params.get("tab") || "help";
  const activeTab = VALID_TABS.includes(rawTab as any) ? rawTab : "help";

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 min-w-0 overflow-x-hidden" data-testid="profile-help-page">
      <div className="flex items-center gap-3 mb-6">
        <HelpCircle className="w-7 h-7 text-primary" />
        <h1
          className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-primary tracking-tight"
          data-testid="text-profile-help-title"
        >
          {t("profileHelp.title", "Hilfe & Info")}
        </h1>
      </div>

      <Tabs value={activeTab} data-testid="profile-help-tabs">
        <div className="overflow-x-auto -mx-4 px-4 pb-1">
          <TabsList className="w-max min-w-full sm:w-full grid grid-cols-4 h-10" data-testid="profile-help-tabs-list">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-serif whitespace-nowrap"
                data-testid={`tab-help-${tab.value}`}
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set("tab", tab.value);
                  window.history.replaceState({}, "", url.toString());
                }}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{t(tab.labelKey, tab.fallback)}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

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
      </Tabs>
    </div>
  );
}

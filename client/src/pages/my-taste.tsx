import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FlavorProfile from "@/pages/flavor-profile";
import FlavorWheel from "@/pages/flavor-wheel";
import { Activity, CircleDot, TrendingUp } from "lucide-react";

export default function MyTaste() {
  const { t } = useTranslation();
  const [location] = useLocation();

  const searchParams = new URLSearchParams(window.location.search);
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl === "wheel" ? "wheel" : "profile");

  return (
    <div className="space-y-6" data-testid="my-taste-page">
      <div>
        <h1 className="text-2xl md:text-3xl font-serif font-black text-primary tracking-tight">
          {t('loungeNav.myTaste')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('loungeNav.mySalonDesc')}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2" data-testid="my-taste-tabs">
          <TabsTrigger value="profile" className="gap-2" data-testid="my-taste-tab-profile">
            <Activity className="w-4 h-4" />
            {t('loungeNav.tabProfile')}
          </TabsTrigger>
          <TabsTrigger value="wheel" className="gap-2" data-testid="my-taste-tab-wheel">
            <CircleDot className="w-4 h-4" />
            {t('loungeNav.tabWheel')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-6">
          <FlavorProfile />
        </TabsContent>
        <TabsContent value="wheel" className="mt-6">
          <FlavorWheel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

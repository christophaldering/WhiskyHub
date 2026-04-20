import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Archive, Sparkles, BarChart3, Compass, ChevronRight, GlassWater,
} from "lucide-react";
import type { ElementType } from "react";
import { useAppStore } from "@/lib/store";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import MeineWeltActionBar from "@/labs/components/MeineWeltActionBar";
import { tastingHistoryApi, journalApi } from "@/lib/api";
import { RecentRatedList, buildRecentRatedItems } from "@/labs/components/RecentRatedList";
import {
  AI_INSIGHTS_HUB_TILES,
  ANALYTICS_HUB_TILES,
  COLLECTION_HUB_TILES,
  TASTINGS_HUB_TILES,
  HubTileGrid,
  type TastingsHubFilter,
} from "./hubTiles";
import MeineWeltTastingsList from "@/labs/components/MeineWeltTastingsList";

type Tab = "tastings" | "collection" | "ai" | "analytics";

interface TabDef {
  key: Tab;
  icon: ElementType;
  iconVariant: "accent" | "surface" | "success";
  iconColorClass: string;
  labelKey: string;
  labelFallback: string;
  descKey: string;
  descFallback: string;
  href: string;
  testId: string;
}

const TABS: TabDef[] = [
  {
    key: "tastings",
    icon: GlassWater,
    iconVariant: "accent",
    iconColorClass: "labs-icon-accent",
    labelKey: "myTastePage.tileMyTastings",
    labelFallback: "My Tastings",
    descKey: "myTastePage.tileMyTastingsDesc",
    descFallback: "Search & history",
    href: "/labs/tastings",
    testId: "tile-meine-welt-tastings",
  },
  {
    key: "collection",
    icon: Archive,
    iconVariant: "accent",
    iconColorClass: "labs-icon-accent",
    labelKey: "myTastePage.tileMyCollection",
    labelFallback: "Collection",
    descKey: "myTastePage.tileMyCollectionDesc",
    descFallback: "Drams",
    href: "/labs/taste/collection-hub",
    testId: "tile-meine-welt-collection",
  },
  {
    key: "ai",
    icon: Sparkles,
    iconVariant: "accent",
    iconColorClass: "labs-icon-accent",
    labelKey: "myTastePage.tileAiInsights",
    labelFallback: "AI Insights",
    descKey: "myTastePage.tileAiInsightsDesc",
    descFallback: "Tips",
    href: "/labs/taste/ai-insights",
    testId: "tile-meine-welt-ai-insights",
  },
  {
    key: "analytics",
    icon: BarChart3,
    iconVariant: "success",
    iconColorClass: "labs-icon-success",
    labelKey: "myTastePage.tileProfileAnalytics",
    labelFallback: "Analytics",
    descKey: "myTastePage.tileProfileAnalyticsDesc",
    descFallback: "Aromas",
    href: "/labs/taste/analytics-hub",
    testId: "tile-meine-welt-profile-analytics",
  },
];

function isTab(value: string | null): value is Tab {
  return value === "tastings" || value === "collection" || value === "ai" || value === "analytics";
}

export default function LabsTaste() {
  const { currentParticipant } = useAppStore();
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const searchStr = useSearch();

  const initialTab = useMemo<Tab>(() => {
    try {
      const params = new URLSearchParams(searchStr);
      const v = params.get("tab");
      if (isTab(v)) return v;
      if (v === "palate") return "analytics";
    } catch {}
    return "tastings";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [activeTastingsFilter, setActiveTastingsFilter] = useState<TastingsHubFilter>("all");

  useEffect(() => {
    try {
      const params = new URLSearchParams(searchStr);
      const current = params.get("tab");
      if (current === activeTab) return;
      if (activeTab === "tastings") {
        params.delete("tab");
      } else {
        params.set("tab", activeTab);
      }
      const qs = params.toString();
      navigate(`/labs/taste${qs ? `?${qs}` : ""}`, { replace: true });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const { data: historyData } = useQuery({
    queryKey: ["tasting-history", currentParticipant?.id],
    queryFn: () => tastingHistoryApi.get(currentParticipant!.id),
    enabled: !!currentParticipant?.id && (activeTab === "collection" || activeTab === "tastings"),
    staleTime: 60_000,
  });

  const { data: journalData } = useQuery({
    queryKey: ["journal-entries", currentParticipant?.id],
    queryFn: () => journalApi.getAll(currentParticipant!.id),
    enabled: !!currentParticipant?.id && (activeTab === "collection" || activeTab === "tastings"),
    staleTime: 60_000,
  });

  const recentItems = useMemo(
    () => buildRecentRatedItems(historyData, journalData, { participantId: currentParticipant?.id }),
    [historyData, journalData, currentParticipant?.id],
  );

  if (!currentParticipant) {
    return (
      <AuthGateMessage
        icon={<Compass className="w-12 h-12" style={{ color: "var(--labs-accent)" }} />}
        title={t("authGate.taste.title")}
        bullets={[t("authGate.taste.bullet1"), t("authGate.taste.bullet2"), t("authGate.taste.bullet3")]}
      />
    );
  }

  const activeTab_ = TABS.find((tab) => tab.key === activeTab) ?? TABS[0];

  const renderInlineContent = () => {
    if (activeTab === "tastings") {
      const activeTile = TASTINGS_HUB_TILES.find((tile) => tile.filter === activeTastingsFilter);
      return (
        <div data-testid="meine-welt-inline-tastings">
          <HubTileGrid
            tiles={TASTINGS_HUB_TILES}
            t={t}
            variant="auto"
            activeTestId={activeTile?.testId}
            onTileClick={(tile) => {
              const next = (tile as (typeof TASTINGS_HUB_TILES)[number]).filter;
              if (next) setActiveTastingsFilter(next);
            }}
          />
          <div
            style={{ marginTop: 16 }}
            data-testid={`meine-welt-tastings-inline-${activeTastingsFilter}`}
          >
            <MeineWeltTastingsList filter={activeTastingsFilter} />
          </div>
          <div style={{ marginTop: 24 }}>
            <RecentRatedList
              items={recentItems}
              limit={12}
              sectionTestId="meine-welt-tastings-recent-section"
              viewAllHref="/labs/taste/drams"
              headerVariant="meine-welt"
            />
          </div>
        </div>
      );
    }
    if (activeTab === "collection") {
      return (
        <div data-testid="meine-welt-inline-collection">
          <HubTileGrid tiles={COLLECTION_HUB_TILES} t={t} testIdPrefix="meine-welt" variant="auto" />
          <div style={{ marginTop: 24 }}>
            <RecentRatedList
              items={recentItems}
              limit={12}
              sectionTestId="meine-welt-recent-section"
              viewAllHref="/labs/taste/drams"
              headerVariant="meine-welt"
            />
          </div>
        </div>
      );
    }
    if (activeTab === "ai") {
      return (
        <div data-testid="meine-welt-inline-ai">
          <HubTileGrid tiles={AI_INSIGHTS_HUB_TILES} t={t} testIdPrefix="meine-welt" variant="auto" />
        </div>
      );
    }
    return (
      <div data-testid="meine-welt-inline-analytics">
        <HubTileGrid tiles={ANALYTICS_HUB_TILES} t={t} testIdPrefix="meine-welt" variant="auto" />
      </div>
    );
  };

  return (
    <div className="labs-page labs-fade-in" data-testid="labs-taste-page">
      <MeineWeltActionBar active={activeTab} onSelect={setActiveTab} />

      <div className="labs-fade-in" data-testid={`meine-welt-content-${activeTab}`}>
        <div className="labs-meine-welt-section-head">
          <span className="labs-meine-welt-section-label">
            {t(activeTab_.labelKey, activeTab_.labelFallback)}
          </span>
          {activeTab === "collection" && (
            <Link
              href="/labs/taste/drams"
              className="labs-meine-welt-view-all"
              data-testid={`link-meine-welt-view-all-${activeTab}`}
            >
              {t("myTastePage.viewAll", "View all")}
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
          {activeTab === "tastings" && (
            <Link
              href="/labs/tastings"
              className="labs-meine-welt-view-all"
              data-testid={`link-meine-welt-view-all-${activeTab}`}
            >
              {t("myTastePage.viewAll", "View all")}
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
        {renderInlineContent()}
      </div>
    </div>
  );
}

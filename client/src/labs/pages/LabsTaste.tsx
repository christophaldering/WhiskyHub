import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Archive, Sparkles, BarChart3, Compass, GlassWater, Search,
} from "lucide-react";
import type { ElementType } from "react";
import { useAppStore } from "@/lib/store";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import MeineWeltActionBar from "@/labs/components/MeineWeltActionBar";
import { tastingApi, tastingHistoryApi, journalApi } from "@/lib/api";
import { RecentRatedList, buildRecentRatedItems } from "@/labs/components/RecentRatedList";
import {
  AI_INSIGHTS_HUB_TILES,
  ANALYTICS_HUB_TILES,
  COLLECTION_HUB_TILES,
  TASTINGS_HUB_TILES,
  HubTileGrid,
  HubTileCollapsible,
  type TastingsHubFilter,
} from "./hubTiles";
import MeineWeltTastingsList from "@/labs/components/MeineWeltTastingsList";
import SurprisePanel from "@/labs/components/SurprisePanel";
import { EmbeddedMeineWeltProvider } from "@/labs/embeddedMeineWeltContext";
import LabsTasteDrams from "./LabsTasteDrams";
import LabsTasteCollection from "./LabsTasteCollection";
import LabsTasteWishlist from "./LabsTasteWishlist";
import LabsHandoutLibrary from "./LabsHandoutLibrary";
import LabsConnoisseur from "./LabsConnoisseur";
import LabsWhiskyDNA from "./LabsWhiskyDNA";
import LabsRecommendations from "./LabsRecommendations";
import LabsCollectionAnalysis from "./LabsCollectionAnalysis";
import LabsAICuration from "./LabsAICuration";
import LabsTasteAnalytics from "./LabsTasteAnalytics";
import LabsTasteWheel from "./LabsTasteWheel";
import LabsTasteCompare from "./LabsTasteCompare";
import LabsTasteDownloads from "./LabsTasteDownloads";
import LabsTasteProfile from "./LabsTasteProfile";
import LabsBenchmark from "./LabsBenchmark";

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

const COLLECTION_SUB_IDS = new Set(
  COLLECTION_HUB_TILES.map((tile) => tile.testId),
);
const AI_SUB_IDS = new Set(AI_INSIGHTS_HUB_TILES.map((tile) => tile.testId));
const ANALYTICS_SUB_IDS = new Set(
  ANALYTICS_HUB_TILES.map((tile) => tile.testId),
);

function tabForSub(sub: string): Tab | null {
  if (COLLECTION_SUB_IDS.has(sub)) return "collection";
  if (AI_SUB_IDS.has(sub)) return "ai";
  if (ANALYTICS_SUB_IDS.has(sub)) return "analytics";
  return null;
}

export default function LabsTaste() {
  const { currentParticipant } = useAppStore();
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const searchStr = useSearch();

  const { initialTab, initialSub } = useMemo<{ initialTab: Tab; initialSub: string | null }>(() => {
    try {
      const params = new URLSearchParams(searchStr);
      const v = params.get("tab");
      const sub = params.get("sub");
      if (sub) {
        const inferred = tabForSub(sub);
        if (inferred) return { initialTab: inferred, initialSub: sub };
      }
      if (isTab(v)) return { initialTab: v, initialSub: null };
      if (v === "palate") return { initialTab: "analytics", initialSub: null };
    } catch {}
    return { initialTab: "tastings", initialSub: null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [activeTastingsFilter, setActiveTastingsFilter] = useState<TastingsHubFilter>("active");
  const [tastingsSearchQuery, setTastingsSearchQuery] = useState("");
  const [activeCollectionTile, setActiveCollectionTile] = useState<string | null>(
    initialTab === "collection" && initialSub && COLLECTION_SUB_IDS.has(initialSub) ? initialSub : null,
  );
  const [activeAITile, setActiveAITile] = useState<string | null>(
    initialTab === "ai" && initialSub && AI_SUB_IDS.has(initialSub) ? initialSub : null,
  );
  const [activeAnalyticsTile, setActiveAnalyticsTile] = useState<string | null>(
    initialTab === "analytics" && initialSub && ANALYTICS_SUB_IDS.has(initialSub) ? initialSub : null,
  );

  const activeSubForTab: string | null =
    activeTab === "collection"
      ? activeCollectionTile
      : activeTab === "ai"
        ? activeAITile
        : activeTab === "analytics"
          ? activeAnalyticsTile
          : null;

  useEffect(() => {
    try {
      const params = new URLSearchParams(searchStr);
      const currentTab = params.get("tab");
      const currentSub = params.get("sub");
      const desiredTab = activeTab === "tastings" ? null : activeTab;
      const desiredSub = activeSubForTab;
      if ((currentTab ?? null) === desiredTab && (currentSub ?? null) === desiredSub) return;
      if (!desiredTab) params.delete("tab");
      else params.set("tab", desiredTab);
      if (!desiredSub) params.delete("sub");
      else params.set("sub", desiredSub);
      const qs = params.toString();
      navigate(`/labs/taste${qs ? `?${qs}` : ""}`, { replace: true });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeSubForTab]);

  // Reconcile URL → state on subsequent navigations (back/forward, external link)
  useEffect(() => {
    try {
      const params = new URLSearchParams(searchStr);
      const tabParam = params.get("tab");
      const subParam = params.get("sub");
      let nextTab: Tab = "tastings";
      if (subParam) {
        const inferred = tabForSub(subParam);
        if (inferred) nextTab = inferred;
        else if (isTab(tabParam)) nextTab = tabParam;
      } else if (isTab(tabParam)) {
        nextTab = tabParam;
      } else if (tabParam === "palate") {
        nextTab = "analytics";
      }
      if (nextTab !== activeTab) setActiveTab(nextTab);
      const nextCollection =
        nextTab === "collection" && subParam && COLLECTION_SUB_IDS.has(subParam) ? subParam : null;
      const nextAI = nextTab === "ai" && subParam && AI_SUB_IDS.has(subParam) ? subParam : null;
      const nextAnalytics =
        nextTab === "analytics" && subParam && ANALYTICS_SUB_IDS.has(subParam) ? subParam : null;
      if (nextCollection !== activeCollectionTile) setActiveCollectionTile(nextCollection);
      if (nextAI !== activeAITile) setActiveAITile(nextAI);
      if (nextAnalytics !== activeAnalyticsTile) setActiveAnalyticsTile(nextAnalytics);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchStr]);

  const handleSelectTab = (next: Tab) => {
    // Role B: re-click on active top-level tab is a no-op
    if (next === activeTab) return;
    // Tab switch resets all sub-tiles ("alle zu") and the tastings filter to default
    setActiveCollectionTile(null);
    setActiveAITile(null);
    setActiveAnalyticsTile(null);
    setActiveTastingsFilter("active");
    setTastingsSearchQuery("");
    setActiveTab(next);
  };

  // Role A: ESC closes active sub-tile on desktop
  useEffect(() => {
    const hasActiveSub =
      activeCollectionTile !== null ||
      activeAITile !== null ||
      activeAnalyticsTile !== null;
    if (!hasActiveSub) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (window.matchMedia("(hover: none)").matches) return;
      setActiveCollectionTile(null);
      setActiveAITile(null);
      setActiveAnalyticsTile(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeCollectionTile, activeAITile, activeAnalyticsTile]);

  const inlineContentRef = useRef<HTMLDivElement | null>(null);

  const { data: historyData } = useQuery({
    queryKey: ["tasting-history", currentParticipant?.id],
    queryFn: () => tastingHistoryApi.get(currentParticipant!.id),
    enabled: !!currentParticipant?.id && (activeTab === "collection" || activeTab === "tastings"),
    staleTime: 60_000,
  });

  const { data: activeTastingsData } = useQuery({
    queryKey: ["tastings", currentParticipant?.id],
    queryFn: () => tastingApi.getAll(currentParticipant!.id),
    enabled: !!currentParticipant?.id && activeTab === "tastings" && activeTastingsFilter === "active",
    staleTime: 60_000,
  });

  const { data: journalData } = useQuery({
    queryKey: ["journal-entries", currentParticipant?.id],
    queryFn: () => journalApi.getAll(currentParticipant!.id),
    enabled: !!currentParticipant?.id && (activeTab === "collection" || activeTab === "tastings"),
    staleTime: 60_000,
  });

  const rawTastingsCount = useMemo(() => {
    if (activeTastingsFilter === "active") {
      if (!activeTastingsData) return null;
      const tastingsCount = activeTastingsData.filter(
        (t: any) => !t.isTestData && !t.invitePending && (t.status === "open" || t.status === "draft"),
      ).length;
      const draftDramsCount = (journalData ?? []).filter(
        (entry: any) => entry?.status === "draft",
      ).length;
      return tastingsCount + draftDramsCount;
    } else {
      if (!historyData) return null;
      return (historyData.tastings ?? []).filter(
        (t: any) => t.status !== "open" && t.status !== "draft" && t.status !== "deleted",
      ).length;
    }
  }, [activeTastingsFilter, activeTastingsData, historyData, journalData]);

  const recentItems = useMemo(
    () => buildRecentRatedItems(historyData, journalData, { participantId: currentParticipant?.id, preferredRatingScale: currentParticipant?.preferredRatingScale ?? 100 }),
    [historyData, journalData, currentParticipant?.id, currentParticipant?.preferredRatingScale],
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

  const renderInlineContent = () => {
    if (activeTab === "tastings") {
      const activeTile = TASTINGS_HUB_TILES.find((tile) => tile.filter === activeTastingsFilter);
      return (
        <div data-testid="meine-welt-inline-tastings">
          <HubTileGrid
            tiles={TASTINGS_HUB_TILES}
            t={t}
            variant="single-row"
            role="filter"
            activeTestId={activeTile?.testId}
            onTileClick={(tile) => {
              const next = (tile as (typeof TASTINGS_HUB_TILES)[number]).filter;
              if (!next) return;
              if (next === activeTastingsFilter) setActiveTastingsFilter("active");
              else setActiveTastingsFilter(next);
            }}
          />
          {rawTastingsCount !== null && rawTastingsCount > 0 && (
            <div
              className="labs-tastings-search-wrapper"
              style={{ marginTop: 12 }}
              data-testid="meine-welt-tastings-search-wrapper"
            >
              <Search className="labs-tastings-search-icon w-4 h-4" />
              <input
                className="labs-input labs-tastings-search-input"
                placeholder={
                  activeTastingsFilter === "completed"
                    ? t("tastings.archiveSearchPlaceholder", "Archiv durchsuchen...")
                    : t("tastings.searchPlaceholder", "Tastings durchsuchen...")
                }
                value={tastingsSearchQuery}
                onChange={(e) => setTastingsSearchQuery(e.target.value)}
                data-testid="meine-welt-tastings-search"
              />
            </div>
          )}
          <div
            style={{ marginTop: 12 }}
            data-testid={`meine-welt-tastings-inline-${activeTastingsFilter}`}
          >
            <MeineWeltTastingsList filter={activeTastingsFilter} searchQuery={tastingsSearchQuery} />
          </div>
        </div>
      );
    }
    if (activeTab === "collection") {
      const activeTile = COLLECTION_HUB_TILES.find((tile) => tile.testId === activeCollectionTile);
      const activeTestId = activeTile?.testId;
      return (
        <div data-testid="meine-welt-inline-collection">
          <HubTileGrid
            tiles={COLLECTION_HUB_TILES}
            t={t}
            testIdPrefix="meine-welt"
            variant="single-row"
            role="nav"
            activeTestId={activeTestId}
            onTileClick={(tile) =>
              setActiveCollectionTile((prev) => (prev === tile.testId ? null : tile.testId))
            }
          />
          <HubTileCollapsible
            open={activeCollectionTile !== null}
            innerRef={inlineContentRef}
            className="labs-tastings-inline-content"
            style={{ marginTop: 16 }}
            testId={
              activeCollectionTile
                ? `meine-welt-collection-inline-${activeCollectionTile}`
                : undefined
            }
          >
            <EmbeddedMeineWeltProvider>
              {activeCollectionTile === "labs-link-collection-hub-drams" && <LabsTasteDrams />}
              {activeCollectionTile === "labs-link-collection-hub-bottles" && <LabsTasteCollection />}
              {activeCollectionTile === "labs-link-collection-hub-wishlist" && <LabsTasteWishlist />}
              {activeCollectionTile === "labs-link-collection-hub-handouts" && <LabsHandoutLibrary mode="workspace" />}
            </EmbeddedMeineWeltProvider>
          </HubTileCollapsible>
          {!activeCollectionTile && (
            <div style={{ marginTop: 24 }}>
              <RecentRatedList
                items={recentItems}
                limit={12}
                sectionTestId="meine-welt-recent-section"
                viewAllHref="/labs/taste/drams"
                headerVariant="meine-welt"
                hideViewAll
              />
            </div>
          )}
        </div>
      );
    }
    if (activeTab === "ai") {
      const activeTile = AI_INSIGHTS_HUB_TILES.find((tile) => tile.testId === activeAITile);
      const activeTestId = activeTile?.testId;
      return (
        <div data-testid="meine-welt-inline-ai">
          <HubTileGrid
            tiles={AI_INSIGHTS_HUB_TILES}
            t={t}
            testIdPrefix="meine-welt"
            variant="single-row"
            role="nav"
            activeTestId={activeTestId}
            onTileClick={(tile) =>
              setActiveAITile((prev) => (prev === tile.testId ? null : tile.testId))
            }
          />
          <HubTileCollapsible
            open={activeAITile !== null}
            innerRef={inlineContentRef}
            className="labs-tastings-inline-content"
            style={{ marginTop: 16 }}
            testId={activeAITile ? `meine-welt-ai-inline-${activeAITile}` : undefined}
          >
            <EmbeddedMeineWeltProvider>
              {activeAITile === "labs-link-ai-insights-connoisseur" && <LabsConnoisseur />}
              {activeAITile === "labs-link-ai-insights-dna" && <LabsWhiskyDNA />}
              {activeAITile === "labs-link-ai-insights-recommendations" && <LabsRecommendations />}
              {activeAITile === "labs-link-ai-insights-collection-analysis" && <LabsCollectionAnalysis />}
              {activeAITile === "labs-link-ai-insights-ai-curation" && <LabsAICuration />}
            </EmbeddedMeineWeltProvider>
          </HubTileCollapsible>
        </div>
      );
    }
    const activeAnalyticsTileDef = ANALYTICS_HUB_TILES.find((tile) => tile.testId === activeAnalyticsTile);
    const analyticsActiveTestId = activeAnalyticsTileDef?.testId;
    return (
      <div data-testid="meine-welt-inline-analytics">
        <HubTileGrid
          tiles={ANALYTICS_HUB_TILES}
          t={t}
          testIdPrefix="meine-welt"
          variant="single-row"
          role="nav"
          activeTestId={analyticsActiveTestId}
          onTileClick={(tile) =>
            setActiveAnalyticsTile((prev) => (prev === tile.testId ? null : tile.testId))
          }
        />
        <HubTileCollapsible
          open={activeAnalyticsTile !== null}
          innerRef={inlineContentRef}
          className="labs-tastings-inline-content"
          style={{ marginTop: 16 }}
          testId={
            activeAnalyticsTile
              ? `meine-welt-analytics-inline-${activeAnalyticsTile}`
              : undefined
          }
        >
          <EmbeddedMeineWeltProvider>
            {activeAnalyticsTile === "labs-link-analytics-hub-analytics" && <LabsTasteAnalytics />}
            {activeAnalyticsTile === "labs-link-analytics-hub-wheel" && <LabsTasteWheel />}
            {activeAnalyticsTile === "labs-link-analytics-hub-compare" && <LabsTasteCompare />}
            {activeAnalyticsTile === "labs-link-analytics-hub-downloads" && <LabsTasteDownloads />}
            {activeAnalyticsTile === "labs-link-analytics-hub-palate" && <LabsTasteProfile />}
            {activeAnalyticsTile === "labs-link-analytics-hub-benchmark" && <LabsBenchmark />}
          </EmbeddedMeineWeltProvider>
        </HubTileCollapsible>
      </div>
    );
  };

  return (
    <div className="labs-page labs-fade-in" data-testid="labs-taste-page">
      <MeineWeltActionBar active={activeTab} onSelect={handleSelectTab} />

      <div className="labs-fade-in" data-testid={`meine-welt-content-${activeTab}`}>
        {renderInlineContent()}
      </div>

      {/* Lives in the free area below the tile rows on Meine Welt. */}
      <SurprisePanel />
    </div>
  );
}

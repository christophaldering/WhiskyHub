import { useEffect, useMemo, useRef, useState } from "react";
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
import { EmbeddedMeineWeltProvider } from "@/labs/embeddedMeineWeltContext";
import LabsTasteDrams from "./LabsTasteDrams";
import LabsTasteCollection from "./LabsTasteCollection";
import LabsTasteWishlist from "./LabsTasteWishlist";
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
  const [activeTastingsFilter, setActiveTastingsFilter] = useState<TastingsHubFilter>("all");
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
    setActiveTastingsFilter("all");
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

  // Role A: smooth auto-scroll content zone into view (~60px offset) when a sub-tile opens
  const inlineContentRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const sub = activeCollectionTile ?? activeAITile ?? activeAnalyticsTile;
    if (!sub) return;
    const el = inlineContentRef.current;
    if (!el) return;
    const id = window.setTimeout(() => {
      try {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch {}
    }, 50);
    return () => window.clearTimeout(id);
  }, [activeCollectionTile, activeAITile, activeAnalyticsTile]);

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

  const renderInlineContent = () => {
    if (activeTab === "tastings") {
      const activeTile = TASTINGS_HUB_TILES.find((tile) => tile.filter === activeTastingsFilter);
      return (
        <div data-testid="meine-welt-inline-tastings">
          <HubTileGrid
            tiles={TASTINGS_HUB_TILES}
            t={t}
            variant="four-row"
            role="filter"
            activeTestId={activeTile?.testId}
            onTileClick={(tile) => {
              const next = (tile as (typeof TASTINGS_HUB_TILES)[number]).filter;
              if (!next) return;
              // Role C: re-click on active filter resets to default "all"
              if (next === activeTastingsFilter) setActiveTastingsFilter("all");
              else setActiveTastingsFilter(next);
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
              hideViewAll
            />
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
          {activeCollectionTile ? (
            <div
              ref={inlineContentRef}
              className="labs-tastings-inline-content labs-hub-tile-content-zone"
              style={{ marginTop: 16 }}
              data-testid={`meine-welt-collection-inline-${activeCollectionTile}`}
            >
              <EmbeddedMeineWeltProvider>
                {activeCollectionTile === "labs-link-collection-hub-drams" && <LabsTasteDrams />}
                {activeCollectionTile === "labs-link-collection-hub-bottles" && <LabsTasteCollection />}
                {activeCollectionTile === "labs-link-collection-hub-wishlist" && <LabsTasteWishlist />}
              </EmbeddedMeineWeltProvider>
            </div>
          ) : (
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
          {activeAITile && (
            <div
              ref={inlineContentRef}
              className="labs-tastings-inline-content labs-hub-tile-content-zone"
              style={{ marginTop: 16 }}
              data-testid={`meine-welt-ai-inline-${activeAITile}`}
            >
              <EmbeddedMeineWeltProvider>
                {activeAITile === "labs-link-ai-insights-connoisseur" && <LabsConnoisseur />}
                {activeAITile === "labs-link-ai-insights-dna" && <LabsWhiskyDNA />}
                {activeAITile === "labs-link-ai-insights-recommendations" && <LabsRecommendations />}
                {activeAITile === "labs-link-ai-insights-collection-analysis" && <LabsCollectionAnalysis />}
                {activeAITile === "labs-link-ai-insights-ai-curation" && <LabsAICuration />}
              </EmbeddedMeineWeltProvider>
            </div>
          )}
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
        {activeAnalyticsTile && (
          <div
            ref={inlineContentRef}
            className="labs-tastings-inline-content labs-hub-tile-content-zone"
            style={{ marginTop: 16 }}
            data-testid={`meine-welt-analytics-inline-${activeAnalyticsTile}`}
          >
            <EmbeddedMeineWeltProvider>
              {activeAnalyticsTile === "labs-link-analytics-hub-analytics" && <LabsTasteAnalytics />}
              {activeAnalyticsTile === "labs-link-analytics-hub-wheel" && <LabsTasteWheel />}
              {activeAnalyticsTile === "labs-link-analytics-hub-compare" && <LabsTasteCompare />}
              {activeAnalyticsTile === "labs-link-analytics-hub-downloads" && <LabsTasteDownloads />}
              {activeAnalyticsTile === "labs-link-analytics-hub-palate" && <LabsTasteProfile />}
              {activeAnalyticsTile === "labs-link-analytics-hub-benchmark" && <LabsBenchmark />}
            </EmbeddedMeineWeltProvider>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="labs-page labs-fade-in" data-testid="labs-taste-page">
      <MeineWeltActionBar active={activeTab} onSelect={handleSelectTab} />

      <div className="labs-fade-in" data-testid={`meine-welt-content-${activeTab}`}>
        {activeTab === "collection" && (
          <div className="labs-meine-welt-section-head" style={{ justifyContent: "flex-end" }}>
            <Link
              href="/labs/taste/drams"
              className="labs-meine-welt-view-all"
              data-testid={`link-meine-welt-view-all-${activeTab}`}
            >
              {t("myTastePage.viewAll", "View all")}
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
        {renderInlineContent()}
      </div>
    </div>
  );
}

import { Link } from "wouter";
import type { ElementType } from "react";
import {
  BookOpen, Archive, Heart, Sparkles, Activity, Library, Compass,
  BarChart3, PieChart, GitCompareArrows, Download,
} from "lucide-react";

export interface HubTileDef {
  icon: ElementType;
  labelKey: string;
  labelFallback: string;
  descKey: string;
  descFallback: string;
  href: string;
  testId: string;
}

export const COLLECTION_HUB_TILES: HubTileDef[] = [
  {
    icon: BookOpen,
    labelKey: "myTastePage.myDrams",
    labelFallback: "My Drams",
    descKey: "myTastePage.myDramsNavDesc",
    descFallback: "Tasting diary",
    href: "/labs/taste/drams",
    testId: "labs-link-collection-hub-drams",
  },
  {
    icon: Archive,
    labelKey: "myTastePage.myBottles",
    labelFallback: "My Bottles",
    descKey: "myTastePage.myBottlesNavDesc",
    descFallback: "Bottle collection",
    href: "/labs/taste/collection",
    testId: "labs-link-collection-hub-bottles",
  },
  {
    icon: Heart,
    labelKey: "myTastePage.myWishlist",
    labelFallback: "My Wishlist",
    descKey: "myTastePage.myWishlistNavDesc",
    descFallback: "Whiskies to try",
    href: "/labs/taste/wishlist",
    testId: "labs-link-collection-hub-wishlist",
  },
];

export const AI_INSIGHTS_HUB_TILES: HubTileDef[] = [
  {
    icon: Sparkles,
    labelKey: "myTastePage.aiInsightsHub.connoisseur",
    labelFallback: "Connoisseur Report",
    descKey: "myTastePage.aiInsightsHub.connoisseurDesc",
    descFallback: "Your personal palate letter",
    href: "/labs/taste/connoisseur",
    testId: "labs-link-ai-insights-connoisseur",
  },
  {
    icon: Activity,
    labelKey: "myTastePage.whiskyDna",
    labelFallback: "Whisky DNA",
    descKey: "myTastePage.aiInsightsHub.dnaDesc",
    descFallback: "The fingerprint of your taste",
    href: "/labs/taste/dna",
    testId: "labs-link-ai-insights-dna",
  },
  {
    icon: Sparkles,
    labelKey: "myTastePage.recommendations",
    labelFallback: "Recommendations",
    descKey: "myTastePage.aiInsightsHub.recommendationsDesc",
    descFallback: "Personalized whisky picks for you",
    href: "/labs/taste/recommendations",
    testId: "labs-link-ai-insights-recommendations",
  },
  {
    icon: Library,
    labelKey: "myTastePage.aiInsightsHub.collectionAnalysis",
    labelFallback: "Collection Analysis",
    descKey: "myTastePage.aiInsightsHub.collectionAnalysisDesc",
    descFallback: "Patterns in your bottle collection",
    href: "/labs/taste/collection-analysis",
    testId: "labs-link-ai-insights-collection-analysis",
  },
  {
    icon: Compass,
    labelKey: "myTastePage.aiInsightsHub.aiCuration",
    labelFallback: "AI Curation",
    descKey: "myTastePage.aiInsightsHub.aiCurationDesc",
    descFallback: "AI-curated lineups & suggestions",
    href: "/labs/taste/ai-curation",
    testId: "labs-link-ai-insights-ai-curation",
  },
];

export const ANALYTICS_HUB_TILES: HubTileDef[] = [
  {
    icon: BarChart3,
    labelKey: "myTastePage.myAnalytics",
    labelFallback: "Analytics",
    descKey: "myTastePage.analyticsHub.analyticsDesc",
    descFallback: "Your rating statistics & trends",
    href: "/labs/taste/analytics",
    testId: "labs-link-analytics-hub-analytics",
  },
  {
    icon: PieChart,
    labelKey: "myTastePage.analyticsHub.flavorWheel",
    labelFallback: "Flavor Wheel",
    descKey: "myTastePage.analyticsHub.flavorWheelDesc",
    descFallback: "Aromas across all your tastings",
    href: "/labs/taste/wheel",
    testId: "labs-link-analytics-hub-wheel",
  },
  {
    icon: GitCompareArrows,
    labelKey: "myTastePage.comparison",
    labelFallback: "Compare",
    descKey: "myTastePage.analyticsHub.compareDesc",
    descFallback: "Compare your ratings side by side",
    href: "/labs/taste/compare",
    testId: "labs-link-analytics-hub-compare",
  },
  {
    icon: Download,
    labelKey: "myTastePage.analyticsHub.downloads",
    labelFallback: "Downloads",
    descKey: "myTastePage.analyticsHub.downloadsDesc",
    descFallback: "Export your data as CSV or Excel",
    href: "/labs/taste/downloads",
    testId: "labs-link-analytics-hub-downloads",
  },
];

export function HubTileCard({
  tile,
  t,
  testIdOverride,
}: {
  tile: HubTileDef;
  t: (key: string, fallback: string) => string;
  testIdOverride?: string;
}) {
  const Icon = tile.icon;
  return (
    <Link href={tile.href} className="labs-hub-tile" data-testid={testIdOverride ?? tile.testId}>
      <div className="labs-hub-tile-icon">
        <Icon className="labs-hub-tile-icon-svg" strokeWidth={1.8} />
      </div>
      <div className="labs-hub-tile-body">
        <div className="labs-hub-tile-label">{t(tile.labelKey, tile.labelFallback)}</div>
        <div className="labs-hub-tile-desc">{t(tile.descKey, tile.descFallback)}</div>
      </div>
    </Link>
  );
}

export function HubTileGrid({
  tiles,
  t,
  testIdPrefix,
  variant = "two-col",
}: {
  tiles: HubTileDef[];
  t: (key: string, fallback: string) => string;
  testIdPrefix?: string;
  variant?: "two-col" | "auto";
}) {
  const className = variant === "auto" ? "labs-hub-tile-grid labs-hub-tile-grid--auto" : "labs-hub-tile-grid";
  return (
    <div className={className}>
      {tiles.map((tile) => (
        <HubTileCard
          key={tile.testId}
          tile={tile}
          t={t}
          testIdOverride={testIdPrefix ? `${testIdPrefix}-${tile.testId}` : undefined}
        />
      ))}
    </div>
  );
}

import { Link } from "wouter";
import type { ElementType } from "react";
import {
  BookOpen, Archive, Heart, Sparkles, Activity, Library, Compass,
  BarChart3, PieChart, GitCompareArrows, Download, Layers, Crown, Users, Brain,
} from "lucide-react";

export interface HubTileDef {
  icon: ElementType;
  labelKey: string;
  labelFallback: string;
  descKey: string;
  descFallback: string;
  href?: string;
  testId: string;
}

export type TastingsHubFilter = "all" | "hosting" | "joined" | "archive";

export interface TastingsHubTileDef extends HubTileDef {
  filter: TastingsHubFilter;
}

export const TASTINGS_HUB_TILES: TastingsHubTileDef[] = [
  {
    icon: Layers,
    filter: "all",
    labelKey: "myTastePage.tastingsHub.all",
    labelFallback: "All",
    descKey: "myTastePage.tastingsHub.allDesc",
    descFallback: "All your tastings",
    testId: "tile-meine-welt-tastings-all",
  },
  {
    icon: Crown,
    filter: "hosting",
    labelKey: "myTastePage.tastingsHub.hosting",
    labelFallback: "Hosting",
    descKey: "myTastePage.tastingsHub.hostingDesc",
    descFallback: "Tastings you host",
    testId: "tile-meine-welt-tastings-hosting",
  },
  {
    icon: Users,
    filter: "joined",
    labelKey: "myTastePage.tastingsHub.joined",
    labelFallback: "Joined",
    descKey: "myTastePage.tastingsHub.joinedDesc",
    descFallback: "Tastings you joined",
    testId: "tile-meine-welt-tastings-joined",
  },
  {
    icon: Archive,
    filter: "archive",
    labelKey: "myTastePage.tastingsHub.archive",
    labelFallback: "My Archive",
    descKey: "myTastePage.tastingsHub.archiveDesc",
    descFallback: "Completed tastings",
    testId: "tile-meine-welt-tastings-archive",
  },
];

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
  {
    icon: Activity,
    labelKey: "myTastePage.analyticsHub.palate",
    labelFallback: "Your Profile / Palate",
    descKey: "myTastePage.analyticsHub.palateDesc",
    descFallback: "Your CaskSense flavor profile",
    href: "/labs/taste/profile",
    testId: "labs-link-analytics-hub-palate",
  },
  {
    icon: Brain,
    labelKey: "bibliothek.benchmark",
    labelFallback: "Benchmark",
    descKey: "bibliothek.benchmarkDesc",
    descFallback: "External tasting data & comparison",
    href: "/labs/taste/benchmark",
    testId: "labs-link-analytics-hub-benchmark",
  },
];

export function HubTileCard({
  tile,
  t,
  testIdOverride,
  onClick,
  active,
}: {
  tile: HubTileDef;
  t: (key: string, fallback: string) => string;
  testIdOverride?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const Icon = tile.icon;
  const className = `labs-hub-tile${onClick ? " labs-hub-tile--button" : ""}${active ? " labs-hub-tile--active" : ""}`;
  const inner = (
    <>
      <div className="labs-hub-tile-icon">
        <Icon className="labs-hub-tile-icon-svg" strokeWidth={1.8} />
      </div>
      <div className="labs-hub-tile-body">
        <div className="labs-hub-tile-label">{t(tile.labelKey, tile.labelFallback)}</div>
        <div className="labs-hub-tile-desc">{t(tile.descKey, tile.descFallback)}</div>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        onClick={onClick}
        data-testid={testIdOverride ?? tile.testId}
        aria-pressed={active ? true : undefined}
      >
        {inner}
      </button>
    );
  }

  return (
    <Link href={tile.href ?? "#"} className={className} data-testid={testIdOverride ?? tile.testId}>
      {inner}
    </Link>
  );
}

export function HubTileGrid({
  tiles,
  t,
  testIdPrefix,
  variant = "two-col",
  onTileClick,
  activeTestId,
}: {
  tiles: HubTileDef[];
  t: (key: string, fallback: string) => string;
  testIdPrefix?: string;
  variant?: "two-col" | "auto" | "four-row" | "single-row";
  onTileClick?: (tile: HubTileDef) => void;
  activeTestId?: string;
}) {
  const useSingleRow = variant === "single-row" || variant === "four-row";
  const className =
    variant === "auto"
      ? "labs-hub-tile-grid labs-hub-tile-grid--auto"
      : useSingleRow
        ? "labs-hub-tile-grid labs-hub-tile-grid--single-row"
        : "labs-hub-tile-grid";
  const mobileCols = tiles.length >= 5 ? 3 : tiles.length;
  const style = useSingleRow
    ? ({
        ["--hub-cols" as string]: String(tiles.length),
        ["--hub-mobile-cols" as string]: String(mobileCols),
      } as React.CSSProperties)
    : undefined;
  return (
    <div className={className} style={style}>
      {tiles.map((tile) => (
        <HubTileCard
          key={tile.testId}
          tile={tile}
          t={t}
          testIdOverride={testIdPrefix ? `${testIdPrefix}-${tile.testId}` : undefined}
          onClick={onTileClick ? () => onTileClick(tile) : undefined}
          active={activeTestId === tile.testId}
        />
      ))}
    </div>
  );
}

import { Link } from "wouter";
import { useEffect, useState, type ElementType, type ReactNode, type CSSProperties, type Ref } from "react";
import {
  BookOpen, Archive, Heart, Sparkles, Activity, Library, Compass,
  BarChart3, PieChart, GitCompareArrows, Download, Layers, Crown, Users, Brain,
  ChevronDown, FileText, Image as ImageIcon,
} from "lucide-react";

export type HubTileRole = "nav" | "tab" | "filter";

export interface HubTileDef {
  icon: ElementType;
  labelKey: string;
  labelFallback: string;
  descKey: string;
  descFallback: string;
  href?: string;
  testId: string;
  role?: HubTileRole;
}

export type TastingsHubFilter = "active" | "completed";

export interface TastingsHubTileDef extends HubTileDef {
  filter: TastingsHubFilter;
}

export const TASTINGS_HUB_TILES: TastingsHubTileDef[] = [
  {
    icon: Layers,
    filter: "active",
    labelKey: "myTastePage.tastingsHub.active",
    labelFallback: "Aktiv",
    descKey: "myTastePage.tastingsHub.activeDesc",
    descFallback: "Laufende und geplante Tastings",
    testId: "tile-meine-welt-tastings-active",
  },
  {
    icon: Archive,
    filter: "completed",
    labelKey: "myTastePage.tastingsHub.completed",
    labelFallback: "Abgeschlossen",
    descKey: "myTastePage.tastingsHub.completedDesc",
    descFallback: "Deine archivierten Tastings",
    testId: "tile-meine-welt-tastings-completed",
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
  {
    icon: FileText,
    labelKey: "myTastePage.myHandouts",
    labelFallback: "My Handouts",
    descKey: "myTastePage.myHandoutsNavDesc",
    descFallback: "Your handout library",
    href: "/labs/taste/my-handouts",
    testId: "labs-link-collection-hub-handouts",
  },
  {
    icon: ImageIcon,
    labelKey: "labs.aiImages.tileLabel",
    labelFallback: "AI Bilder",
    descKey: "labs.aiImages.tileDesc",
    descFallback: "Galerie deiner KI-Cover",
    href: "/labs/taste/ai-images",
    testId: "labs-link-collection-hub-ai-images",
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
  role,
  badge,
}: {
  tile: HubTileDef;
  t: (key: string, fallback: string) => string;
  testIdOverride?: string;
  onClick?: () => void;
  active?: boolean;
  role?: HubTileRole;
  badge?: number;
}) {
  const Icon = tile.icon;
  const effectiveRole: HubTileRole = role ?? tile.role ?? "nav";
  const showChevron = effectiveRole === "nav" && !!onClick;
  const roleClass =
    effectiveRole === "tab" || effectiveRole === "filter"
      ? " labs-hub-tile--tab"
      : " labs-hub-tile--nav";
  const className = `labs-hub-tile${onClick ? " labs-hub-tile--button" : ""}${active ? " labs-hub-tile--active" : ""}${roleClass}`;
  const inner = (
    <>
      <div className="labs-hub-tile-icon">
        <Icon className="labs-hub-tile-icon-svg" strokeWidth={1.8} />
      </div>
      <div className="labs-hub-tile-body">
        <div className="labs-hub-tile-label">
          {t(tile.labelKey, tile.labelFallback)}
          {badge != null && badge > 0 && (
            <span
              className="labs-badge labs-badge-accent"
              style={{ fontSize: 10, padding: "1px 6px", marginLeft: 6, verticalAlign: "middle" }}
              data-testid={`badge-count-${tile.testId}`}
            >
              {badge}
            </span>
          )}
        </div>
        <div className="labs-hub-tile-desc">{t(tile.descKey, tile.descFallback)}</div>
      </div>
      {showChevron && (
        <span
          className={`labs-hub-tile-chevron${active ? " labs-hub-tile-chevron--open" : ""}`}
          aria-hidden="true"
        >
          <ChevronDown className="labs-hub-tile-chevron-svg" strokeWidth={2} />
        </span>
      )}
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

export function HubTileCollapsible({
  open,
  children,
  className,
  style,
  testId,
  innerRef,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  testId?: string;
  innerRef?: Ref<HTMLDivElement>;
}) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const id = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, 200);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!mounted) return null;

  const cls = [
    "labs-hub-tile-content-zone",
    closing ? "labs-hub-tile-content-zone--closing" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={innerRef} className={cls} style={style} data-testid={testId}>
      {children}
    </div>
  );
}

export function HubTileGrid({
  tiles,
  t,
  testIdPrefix,
  variant = "two-col",
  onTileClick,
  activeTestId,
  role,
  tileBadges,
}: {
  tiles: HubTileDef[];
  t: (key: string, fallback: string) => string;
  testIdPrefix?: string;
  variant?: "two-col" | "auto" | "four-row" | "single-row";
  onTileClick?: (tile: HubTileDef) => void;
  activeTestId?: string;
  role?: HubTileRole;
  tileBadges?: Record<string, number>;
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
          role={role}
          badge={tileBadges?.[tile.testId]}
        />
      ))}
    </div>
  );
}

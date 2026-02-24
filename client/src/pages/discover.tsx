import { useState, lazy, Suspense } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import {
  Users, BarChart3, HeartHandshake, Rss, Medal,
  BookOpen, Landmark, Map, Package, Library, Microscope, FileText, Puzzle,
  GitCompareArrows, Sparkles, Activity, Database, Compass,
  Loader2
} from "lucide-react";

const CommunityRankings = lazy(() => import("@/pages/community-rankings"));
const TasteTwins = lazy(() => import("@/pages/taste-twins"));
const WhiskyFriends = lazy(() => import("@/pages/whisky-friends"));
const ActivityFeed = lazy(() => import("@/pages/activity-feed"));
const Leaderboard = lazy(() => import("@/pages/leaderboard"));

const BenchmarkAnalyzer = lazy(() => import("@/pages/benchmark-analyzer"));
const DistilleryEncyclopedia = lazy(() => import("@/pages/distillery-encyclopedia"));
const DistilleryMap = lazy(() => import("@/pages/distillery-map"));
const Bottlers = lazy(() => import("@/pages/bottlers"));
const Lexicon = lazy(() => import("@/pages/lexicon"));
const Research = lazy(() => import("@/pages/research"));
const TastingTemplates = lazy(() => import("@/pages/tasting-templates"));
const PairingSuggestions = lazy(() => import("@/pages/pairing-suggestions"));

const Comparison = lazy(() => import("@/pages/comparison"));
const Analytics = lazy(() => import("@/pages/analytics"));
const Recommendations = lazy(() => import("@/pages/recommendations"));

type DiscoverTab = "community" | "wissen" | "analyse";

interface HubLink {
  href: string;
  icon: React.ElementType;
  label: string;
  testId: string;
}

export default function Discover() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<DiscoverTab>("community");
  const { currentParticipant } = useAppStore();

  const isHost = currentParticipant?.role === "host" || currentParticipant?.role === "admin";
  const isAdmin = currentParticipant?.role === "admin";

  const tabs: { id: DiscoverTab; label: string; icon: React.ElementType }[] = [
    { id: "community", label: t("discoverHub.community"), icon: Users },
    { id: "wissen", label: t("discoverHub.wissen"), icon: BookOpen },
    { id: "analyse", label: t("discoverHub.analyse"), icon: BarChart3 },
  ];

  const communityLinks: HubLink[] = [
    { href: "/community-rankings", icon: BarChart3, label: t("nav.communityRankings"), testId: "discover-rankings" },
    { href: "/taste-twins", icon: HeartHandshake, label: t("nav.tasteTwins"), testId: "discover-taste-twins" },
    { href: "/friends", icon: Users, label: t("nav.friends"), testId: "discover-friends" },
    { href: "/activity", icon: Rss, label: t("nav.activity"), testId: "discover-activity" },
    { href: "/leaderboard", icon: Medal, label: t("nav.leaderboard"), testId: "discover-leaderboard" },
  ];

  const wissenLinks: HubLink[] = [
    { href: "/benchmark", icon: BookOpen, label: t("nav.benchmark"), testId: "discover-library" },
    { href: "/distilleries", icon: Landmark, label: t("nav.distilleries"), testId: "discover-distilleries" },
    { href: "/distillery-map", icon: Map, label: t("nav.distilleryMap"), testId: "discover-map" },
    { href: "/bottlers", icon: Package, label: t("nav.bottlers"), testId: "discover-bottlers" },
    { href: "/lexicon", icon: Library, label: t("nav.lexicon"), testId: "discover-lexicon" },
    { href: "/research", icon: Microscope, label: t("nav.research"), testId: "discover-research" },
    { href: "/tasting-templates", icon: FileText, label: t("nav.templates"), testId: "discover-templates" },
    { href: "/pairings", icon: Puzzle, label: t("nav.pairings"), testId: "discover-pairings" },
  ];

  const analyseLinks: HubLink[] = [
    { href: "/comparison", icon: GitCompareArrows, label: t("nav.comparison"), testId: "discover-comparison" },
    { href: "/analytics", icon: BarChart3, label: t("nav.analytics"), testId: "discover-analytics" },
    { href: "/recommendations", icon: Sparkles, label: t("nav.recommendations"), testId: "discover-recommendations" },
    { href: "/flavor-profile", icon: Activity, label: t("discoverHub.flavorAnalysis"), testId: "discover-flavor" },
    ...((isHost || isAdmin || currentParticipant?.canAccessWhiskyDb) ? [
      { href: "/whisky-database", icon: Database, label: t("nav.whiskyDatabase"), testId: "discover-whisky-db" },
    ] : []),
  ];

  const renderLinkGrid = (links: HubLink[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {links.map((link) => (
        <button
          key={link.href}
          onClick={() => navigate(link.href)}
          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-accent/50 hover:border-primary/30 transition-all text-center group"
          data-testid={link.testId}
        >
          <link.icon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors leading-tight">{link.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold" data-testid="discover-title">
          {t("discoverHub.title")}
        </h1>
        <p className="text-muted-foreground mt-1" data-testid="discover-subtitle">
          {t("discoverHub.subtitle")}
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide" data-testid="discover-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all shrink-0",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
            data-testid={`discover-tab-${tab.id}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === "community" && renderLinkGrid(communityLinks)}
        {activeTab === "wissen" && renderLinkGrid(wissenLinks)}
        {activeTab === "analyse" && renderLinkGrid(analyseLinks)}
      </motion.div>
    </div>
  );
}

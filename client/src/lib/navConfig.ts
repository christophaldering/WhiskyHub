import { Wine, User, BookOpen, Radar, BarChart3, GitCompareArrows, Sparkles, FlaskConical, Archive, Heart, Download, Settings, Crown, ClipboardList } from "lucide-react";
import type { ElementType } from "react";

export interface NavItem {
  key: string;
  labelKey: string;
  route: string;
  icon: ElementType;
  match?: string[];
}

export const primaryTabs: NavItem[] = [
  {
    key: "tasting",
    labelKey: "nav.tasting",
    route: "/tasting",
    icon: Wine,
    match: ["/tasting", "/enter", "/join", "/tasting-room-simple", "/naked/", "/host", "/host-dashboard", "/sessions", "/log-simple", "/log"],
  },
  {
    key: "myTaste",
    labelKey: "nav.myTaste",
    route: "/my-taste",
    icon: User,
    match: ["/my-taste", "/taste", "/analyze", "/discover"],
  },
];

export const myTasteLinks: NavItem[] = [
  { key: "drams", labelKey: "myTastePage.journal", route: "/my-taste/drams", icon: BookOpen },
  { key: "profile", labelKey: "myTastePage.flavorProfile", route: "/my-taste/profile", icon: Radar },
  { key: "analytics", labelKey: "myTastePage.myAnalytics", route: "/my-taste/analytics", icon: BarChart3 },
  { key: "compare", labelKey: "myTastePage.compare", route: "/my-taste/compare", icon: GitCompareArrows },
  { key: "recommendations", labelKey: "myTastePage.recommendations", route: "/my-taste/recommendations", icon: Sparkles },
  { key: "benchmark", labelKey: "myTastePage.benchmarkAnalyzer", route: "/my-taste/benchmark", icon: FlaskConical },
  { key: "collection", labelKey: "myTastePage.myCollection", route: "/my-taste/collection", icon: Archive },
  { key: "wishlist", labelKey: "myTastePage.wishlist", route: "/my-taste/wishlist", icon: Heart },
  { key: "downloads", labelKey: "downloads.title", route: "/my-taste/downloads", icon: Download },
  { key: "settings", labelKey: "sessionSheet.settingsProfile", route: "/my-taste/settings", icon: Settings },
];

export const tastingLinks: NavItem[] = [
  { key: "host", labelKey: "nav.host", route: "/host", icon: Crown },
  { key: "sessions", labelKey: "nav.sessions", route: "/sessions", icon: ClipboardList },
];

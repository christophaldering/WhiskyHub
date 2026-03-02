import { useLocation } from "wouter";
import {
  User, Settings, Bell,
  LayoutDashboard, Camera, FileText,
  BarChart3, GitCompare, BookOpen, Database, Download,
  Users, Heart, Trophy, Medal,
  BookMarked, Building2, Map, Factory, FlaskConical,
  HelpCircle, Info, Star, Lightbulb, Newspaper, Gift,
  Scale, Shield,
  Lock, ChevronRight, Globe,
} from "lucide-react";
import { PageHeaderV2, CardV2, ListRowV2 } from "@/v2/components";
import { useAppStore } from "@/lib/store";
import { LucideIcon } from "lucide-react";

interface MoreItem {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  route: string;
}

interface MoreGroup {
  label: string;
  items: MoreItem[];
}

export default function V2More() {
  const [, navigate] = useLocation();
  const { currentParticipant } = useAppStore();
  const isAdmin = currentParticipant?.role === "admin";

  const groups: MoreGroup[] = [
    {
      label: "Profile & Settings",
      items: [
        { icon: User, title: "Profile", subtitle: "Your tasting identity", route: "/legacy/profile" },
        { icon: Settings, title: "Account", subtitle: "Settings & preferences", route: "/legacy/profile/account" },
        { icon: Globe, title: "Language", subtitle: "English / Deutsch", route: "/legacy/profile/account" },
        { icon: Bell, title: "Notifications", subtitle: "Manage alerts", route: "/legacy/profile/account" },
      ],
    },
    {
      label: "Host Tools",
      items: [
        { icon: LayoutDashboard, title: "Host Dashboard", subtitle: "Manage your sessions", route: "/legacy/tasting/host" },
        { icon: Camera, title: "Photo Tasting", subtitle: "AI bottle identification", route: "/legacy/photo-tasting" },
        { icon: FileText, title: "Tasting Templates", subtitle: "Reusable session templates", route: "/legacy/tasting-templates" },
      ],
    },
    {
      label: "Analysis",
      items: [
        { icon: GitCompare, title: "Comparison", subtitle: "Side-by-side whisky comparison", route: "/legacy/comparison" },
        { icon: Database, title: "Benchmark / Library", subtitle: "Whisky database & benchmarks", route: "/legacy/benchmark" },
        { icon: BarChart3, title: "Analytics", subtitle: "Your tasting analytics", route: "/legacy/analytics" },
        { icon: Download, title: "Data Export", subtitle: "Export your tasting data", route: "/legacy/data-export" },
      ],
    },
    {
      label: "Social",
      items: [
        { icon: Users, title: "Friends", subtitle: "Your tasting friends", route: "/legacy/friends" },
        { icon: Heart, title: "Taste Twins", subtitle: "People with similar taste", route: "/legacy/taste-twins" },
        { icon: Trophy, title: "Community Rankings", subtitle: "Community leaderboards", route: "/legacy/community-rankings" },
        { icon: Medal, title: "Leaderboard", subtitle: "Top tasters", route: "/legacy/leaderboard" },
      ],
    },
    {
      label: "Knowledge",
      items: [
        { icon: BookMarked, title: "Lexicon", subtitle: "Whisky terminology", route: "/legacy/lexicon" },
        { icon: Building2, title: "Distilleries", subtitle: "Distillery encyclopedia", route: "/legacy/distilleries" },
        { icon: Map, title: "Distillery Map", subtitle: "Explore by region", route: "/legacy/distillery-map" },
        { icon: Factory, title: "Bottlers", subtitle: "Independent bottlers", route: "/legacy/bottlers" },
        { icon: FlaskConical, title: "Research", subtitle: "Whisky research notes", route: "/legacy/research" },
      ],
    },
    {
      label: "About",
      items: [
        { icon: HelpCircle, title: "Help", subtitle: "FAQ & support", route: "/legacy/profile/help" },
        { icon: Info, title: "About", subtitle: "About CaskSense", route: "/legacy/about" },
        { icon: Star, title: "Features", subtitle: "Feature overview", route: "/legacy/features" },
        { icon: Lightbulb, title: "Method", subtitle: "Our tasting method", route: "/legacy/method" },
        { icon: Newspaper, title: "News", subtitle: "Latest updates", route: "/legacy/news" },
        { icon: Gift, title: "Donate", subtitle: "Support CaskSense", route: "/legacy/donate" },
      ],
    },
    {
      label: "Legal",
      items: [
        { icon: Scale, title: "Impressum", route: "/impressum" },
        { icon: Shield, title: "Privacy", route: "/privacy" },
      ],
    },
  ];

  if (isAdmin) {
    groups.push({
      label: "Admin",
      items: [
        { icon: Lock, title: "Admin Panel", subtitle: "Platform administration", route: "/legacy/admin" },
      ],
    });
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeaderV2 title="More" />

      <div className="px-5 space-y-6 pb-8">
        {groups.map((group) => (
          <div key={group.label}>
            <p
              className="text-xs font-medium uppercase tracking-wider mb-2 px-1"
              style={{ color: "var(--v2-text-muted)", opacity: 0.7 }}
            >
              {group.label}
            </p>
            <CardV2>
              {group.items.map((item) => (
                <ListRowV2
                  key={item.route + item.title}
                  icon={item.icon}
                  title={item.title}
                  subtitle={item.subtitle}
                  onClick={() => navigate(item.route)}
                  trailing={
                    <ChevronRight
                      className="w-4 h-4"
                      style={{ color: "var(--v2-text-muted)" }}
                    />
                  }
                />
              ))}
            </CardV2>
          </div>
        ))}
      </div>
    </div>
  );
}

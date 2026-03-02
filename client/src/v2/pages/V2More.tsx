import { useLocation } from "wouter";
import {
  User, Settings, Bell,
  LayoutDashboard, Camera, FileText,
  GitCompare, Library, BarChart3, Download,
  Users, Heart, Trophy, Medal,
  BookOpen, Building2, Map, Wine, FlaskConical,
  HelpCircle, Info, Star, Newspaper, Coffee, Beaker,
  Scale, Shield, ChevronRight,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { PageHeaderV2, CardV2, ListRowV2 } from "@/v2/components";
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
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();

  const isAdmin = currentParticipant?.role === "admin";

  const groups: MoreGroup[] = [
    {
      label: "Profile & Settings",
      items: [
        { icon: User, title: "Profile", subtitle: "Your tasting identity", route: "/legacy/profile" },
        { icon: Settings, title: "Account", subtitle: "Settings & preferences", route: "/legacy/profile/account" },
        { icon: Bell, title: "Notifications", subtitle: "Manage alerts", route: "/legacy/tasting/sessions" },
      ],
    },
    {
      label: "Host Tools",
      items: [
        { icon: LayoutDashboard, title: "Host Dashboard", subtitle: "Manage your sessions", route: "/legacy/tasting/host" },
        { icon: Camera, title: "Photo Tasting", subtitle: "Create from photos", route: "/legacy/photo-tasting" },
        { icon: FileText, title: "Tasting Templates", subtitle: "Pre-built templates", route: "/legacy/tasting-templates" },
      ],
    },
    {
      label: "Analysis",
      items: [
        { icon: GitCompare, title: "Comparison", subtitle: "Compare whiskies", route: "/legacy/comparison" },
        { icon: Library, title: "Benchmark / Library", subtitle: "Whisky library & analyzer", route: "/legacy/benchmark" },
        { icon: BarChart3, title: "Analytics", subtitle: "Platform analytics", route: "/legacy/analytics" },
        { icon: Download, title: "Data Export", subtitle: "Export your data", route: "/legacy/data-export" },
      ],
    },
    {
      label: "Social",
      items: [
        { icon: Users, title: "Friends", subtitle: "Your whisky friends", route: "/legacy/friends" },
        { icon: Heart, title: "Taste Twins", subtitle: "Find similar palates", route: "/legacy/taste-twins" },
        { icon: Trophy, title: "Community Rankings", subtitle: "Top rated whiskies", route: "/legacy/community-rankings" },
        { icon: Medal, title: "Leaderboard", subtitle: "Most active tasters", route: "/legacy/leaderboard" },
      ],
    },
    {
      label: "Knowledge",
      items: [
        { icon: BookOpen, title: "Lexicon", subtitle: "Whisky terminology", route: "/legacy/lexicon" },
        { icon: Building2, title: "Distilleries", subtitle: "Distillery encyclopedia", route: "/legacy/discover/distilleries" },
        { icon: Map, title: "Distillery Map", subtitle: "Explore by region", route: "/legacy/distillery-map" },
        { icon: Wine, title: "Bottlers", subtitle: "Independent bottlers", route: "/legacy/bottlers" },
        { icon: FlaskConical, title: "Research", subtitle: "Scientific insights", route: "/legacy/research" },
      ],
    },
    {
      label: "About",
      items: [
        { icon: HelpCircle, title: "Help", subtitle: "FAQ & support", route: "/legacy/profile/help" },
        { icon: Info, title: "About", subtitle: "About CaskSense", route: "/legacy/about" },
        { icon: Star, title: "Features", subtitle: "Feature overview", route: "/legacy/features" },
        { icon: Beaker, title: "Method", subtitle: "Our tasting method", route: "/legacy/method" },
        { icon: Newspaper, title: "News", subtitle: "Updates & changelog", route: "/legacy/news" },
        { icon: Coffee, title: "Donate", subtitle: "Support CaskSense", route: "/legacy/donate" },
      ],
    },
    {
      label: "Legal",
      items: [
        { icon: Scale, title: "Impressum", route: "/impressum" },
        { icon: Shield, title: "Privacy", route: "/privacy" },
      ],
    },
    ...(isAdmin
      ? [
          {
            label: "Admin",
            items: [
              {
                icon: Settings as LucideIcon,
                title: "Admin Panel",
                subtitle: "Platform administration",
                route: "/legacy/admin",
              },
            ],
          },
        ]
      : []),
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeaderV2 title="More" subtitle="All features & settings" />

      <div className="px-5 space-y-6 pb-8">
        {groups.map((group) => (
          <div key={group.label} data-testid={`more-group-${group.label.toLowerCase().replace(/\s+/g, "-")}`}>
            <h2
              className="text-xs font-semibold uppercase tracking-wider mb-2 px-1"
              style={{ color: "var(--v2-text-muted)" }}
            >
              {group.label}
            </h2>
            <CardV2>
              {group.items.map((item) => (
                <ListRowV2
                  key={item.route}
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

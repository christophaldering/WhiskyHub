import { Link } from "wouter";
import {
  Users, UserCheck, TrendingUp, Award, BookOpen, Map, Sparkles,
  ChevronRight, Database, Activity, GraduationCap, Info, Heart, Package, FileText
} from "lucide-react";
import SimpleShell from "@/components/simple/simple-shell";
import { useQuery } from "@tanstack/react-query";
import { platformStatsApi } from "@/lib/api";
import { c, cardStyle, sectionHeadingStyle, pageTitleStyle, pageSubtitleStyle } from "@/lib/theme";

interface NavItem {
  icon: React.ElementType;
  label: string;
  description: string;
  href: string;
  testId: string;
  badge?: string | number | null;
}

const sections: { title: string; items: NavItem[] }[] = [
  {
    title: "Sozial",
    items: [
      {
        icon: Users,
        label: "Taste Twins",
        description: "Find people with a similar palate",
        href: "/discover/community?tab=twins",
        testId: "link-taste-twins",
      },
      {
        icon: UserCheck,
        label: "Whisky Friends",
        description: "Your connections on the platform",
        href: "/discover/community",
        testId: "link-whisky-friends",
      },
      {
        icon: TrendingUp,
        label: "Rankings",
        description: "Top-rated whiskies across the community",
        href: "/discover/community?tab=rankings",
        testId: "link-rankings",
      },
      {
        icon: Award,
        label: "Leaderboard",
        description: "Most active, detailed & consistent tasters",
        href: "/discover/community?tab=leaderboard",
        testId: "link-leaderboard",
      },
      {
        icon: Activity,
        label: "Activity Feed",
        description: "See what others are tasting",
        href: "/discover/activity",
        testId: "link-activity",
      },
      {
        icon: Database,
        label: "Whisky Database",
        description: "Search all whiskies across tastings",
        href: "/discover/database",
        testId: "link-database",
      },
    ],
  },
  {
    title: "Empfehlungen",
    items: [
      {
        icon: Sparkles,
        label: "Recommendations",
        description: "Personalized whisky suggestions based on your taste",
        href: "/discover/recommendations",
        testId: "link-recommendations",
      },
    ],
  },
  {
    title: "Wissen",
    items: [
      {
        icon: BookOpen,
        label: "Lexicon",
        description: "Whisky terms & glossary",
        href: "/discover/lexicon",
        testId: "link-lexicon",
      },
      {
        icon: Map,
        label: "Distilleries",
        description: "Distillery encyclopedia & regions",
        href: "/discover/distilleries",
        testId: "link-distilleries",
      },
      {
        icon: Package,
        label: "Independent Bottlers",
        description: "Encyclopedia with search & country filter",
        href: "/discover/bottlers",
        testId: "link-bottlers",
      },
      {
        icon: FileText,
        label: "Tasting Templates",
        description: "Style-specific vocabulary & sensory guides",
        href: "/discover/templates",
        testId: "link-tasting-templates",
      },
      {
        icon: GraduationCap,
        label: "Tasting Guide",
        description: "Illustrated assessment methodology",
        href: "/guide",
        testId: "link-tasting-guide",
      },
    ],
  },
  {
    title: "Über CaskSense",
    items: [
      {
        icon: Info,
        label: "About CaskSense",
        description: "The story behind CaskSense",
        href: "/discover/about",
        testId: "link-about-casksense",
      },
      {
        icon: Heart,
        label: "Spende / Hospiz",
        description: "Support the Christina-Kleintjes-Hospiz-Stiftung",
        href: "/discover/donate",
        testId: "link-donate-hospiz",
      },
    ],
  },
];

export default function SimpleAnalyzePage() {
  const { data: platformStats } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: () => platformStatsApi.get(),
    staleTime: 60000,
  });

  const totalWhiskies = platformStats?.totalWhiskies ?? platformStats?.uniqueWhiskies ?? null;
  const totalParticipants = platformStats?.totalParticipants ?? null;

  return (
    <SimpleShell showBack={false}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
        <div style={{ marginBottom: 8 }}>
          <h2 style={pageTitleStyle} data-testid="text-analyze-title">
            Discover
          </h2>
          <p style={pageSubtitleStyle}>
            Sozial · Empfehlungen · Wissen
          </p>
        </div>

        {(totalWhiskies || totalParticipants) && (
          <div style={{ display: "flex", gap: 10 }}>
            {totalParticipants != null && (
              <div style={{ ...cardStyle, flex: 1, padding: "16px 18px", textAlign: "center" }} data-testid="stat-participants">
                <div style={{ fontSize: 24, fontWeight: 700, color: c.accent, fontFamily: "'Playfair Display', serif", letterSpacing: "-0.02em" }}>{totalParticipants}</div>
                <div style={{ fontSize: 11, color: c.muted, marginTop: 4 }}>Tasters</div>
              </div>
            )}
            {totalWhiskies != null && (
              <div style={{ ...cardStyle, flex: 1, padding: "16px 18px", textAlign: "center" }} data-testid="stat-whiskies">
                <div style={{ fontSize: 24, fontWeight: 700, color: c.accent, fontFamily: "'Playfair Display', serif", letterSpacing: "-0.02em" }}>{totalWhiskies}</div>
                <div style={{ fontSize: 11, color: c.muted, marginTop: 4 }}>Whiskies</div>
              </div>
            )}
          </div>
        )}

        {sections.map((section) => (
          <div key={section.title}>
            <h3 style={{ ...sectionHeadingStyle, color: c.accent }}>
              {section.title}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {section.items.map((item) => (
                <Link key={item.testId} href={item.href}>
                  <div
                    style={{
                      ...cardStyle,
                      padding: "14px 18px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      transition: "all 0.2s ease",
                    }}
                    data-testid={item.testId}
                  >
                    <div style={{ width: 38, height: 38, borderRadius: 12, background: `${c.accent}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <item.icon style={{ width: 18, height: 18, color: c.accent }} strokeWidth={1.8} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: c.text, letterSpacing: "-0.01em" }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: c.muted, marginTop: 3, lineHeight: 1.4 }}>{item.description}</div>
                    </div>
                    <ChevronRight style={{ width: 16, height: 16, color: `${c.muted}80`, flexShrink: 0 }} strokeWidth={1.8} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SimpleShell>
  );
}

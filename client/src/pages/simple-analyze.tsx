import { Link } from "wouter";
import {
  Users, TrendingUp, Award, BookOpen, Map, Compass,
  ChevronRight, Database, Activity
} from "lucide-react";
import SimpleShell from "@/components/simple/simple-shell";
import { useQuery } from "@tanstack/react-query";
import { platformStatsApi } from "@/lib/api";

const c = {
  bg: "#1a1714",
  card: "#242018",
  border: "#2e2a24",
  text: "#f5f0e8",
  muted: "#888",
  accent: "#d4a256",
};

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
    title: "Community",
    items: [
      {
        icon: Users,
        label: "Friends & Taste Twins",
        description: "Find people who taste like you",
        href: "/discover/community",
        testId: "link-community",
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
        description: "Most active tasters",
        href: "/discover/community?tab=leaderboard",
        testId: "link-leaderboard",
      },
      {
        icon: Activity,
        label: "Activity Feed",
        description: "See what others are tasting",
        href: "/legacy/discover/community?tab=activity",
        testId: "link-activity",
      },
    ],
  },
  {
    title: "Recommendations",
    items: [
      {
        icon: Compass,
        label: "For You",
        description: "Whisky suggestions based on your profile",
        href: "/legacy/discover",
        testId: "link-recommendations",
      },
    ],
  },
  {
    title: "Knowledge",
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
        icon: Database,
        label: "Whisky Database",
        description: "Search all whiskies",
        href: "/legacy/discover/database",
        testId: "link-database",
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
        <div style={{ marginBottom: 4 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }} data-testid="text-analyze-title">
            Discover
          </h2>
          <p style={{ fontSize: 13, color: c.muted, marginTop: 4 }}>
            Community · Recommendations · Knowledge
          </p>
        </div>

        {(totalWhiskies || totalParticipants) && (
          <div style={{ display: "flex", gap: 10 }}>
            {totalParticipants != null && (
              <div style={{ flex: 1, background: c.card, border: `1px solid ${c.border}`, borderRadius: 10, padding: "14px 16px", textAlign: "center" }} data-testid="stat-participants">
                <div style={{ fontSize: 22, fontWeight: 700, color: c.accent, fontFamily: "'Playfair Display', serif" }}>{totalParticipants}</div>
                <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>Tasters</div>
              </div>
            )}
            {totalWhiskies != null && (
              <div style={{ flex: 1, background: c.card, border: `1px solid ${c.border}`, borderRadius: 10, padding: "14px 16px", textAlign: "center" }} data-testid="stat-whiskies">
                <div style={{ fontSize: 22, fontWeight: 700, color: c.accent, fontFamily: "'Playfair Display', serif" }}>{totalWhiskies}</div>
                <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>Whiskies</div>
              </div>
            )}
          </div>
        )}

        {sections.map((section) => (
          <div key={section.title}>
            <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: c.accent, marginBottom: 10 }}>
              {section.title}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {section.items.map((item) => (
                <Link key={item.testId} href={item.href}>
                  <div
                    style={{
                      background: c.card,
                      border: `1px solid ${c.border}`,
                      borderRadius: 12,
                      padding: "16px 20px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                    }}
                    data-testid={item.testId}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${c.accent}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <item.icon style={{ width: 18, height: 18, color: c.accent }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>{item.description}</div>
                    </div>
                    <ChevronRight style={{ width: 14, height: 14, color: c.muted, flexShrink: 0 }} />
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

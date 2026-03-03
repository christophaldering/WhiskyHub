import { Link } from "wouter";
import {
  BarChart3, TrendingUp, Users, BookOpen, Map, Award,
  GitCompare, Compass, ChevronRight, FlaskConical, CircleDot
} from "lucide-react";
import SimpleShell from "@/components/simple/simple-shell";

const colors = {
  bg: "#1a1714",
  card: "#242018",
  border: "#2e2a24",
  text: "#f5f0e8",
  muted: "#888",
  accent: "#d4a256",
};

const cardStyle: React.CSSProperties = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  padding: "16px 20px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 12,
};

interface NavItem {
  icon: React.ElementType;
  label: string;
  description: string;
  href: string;
  testId: string;
}

const sections: { title: string; items: NavItem[] }[] = [
  {
    title: "Personal Analytics",
    items: [
      {
        icon: BarChart3,
        label: "My Analytics",
        description: "Your personal rating statistics",
        href: "/legacy/my/journal?tab=analytics",
        testId: "link-analytics",
      },
      {
        icon: GitCompare,
        label: "Comparison",
        description: "Side-by-side whisky comparison",
        href: "/legacy/my/journal?tab=compare",
        testId: "link-comparison",
      },
      {
        icon: FlaskConical,
        label: "Benchmark",
        description: "Compare against benchmarks",
        href: "/legacy/my/journal?tab=benchmark",
        testId: "link-benchmark",
      },
      {
        icon: CircleDot,
        label: "Flavor Wheel",
        description: "Interactive aroma wheel",
        href: "/legacy/flavor-wheel",
        testId: "link-flavor-wheel",
      },
    ],
  },
  {
    title: "Community",
    items: [
      {
        icon: Users,
        label: "Friends & Twins",
        description: "Find your taste twins",
        href: "/legacy/discover/community",
        testId: "link-community",
      },
      {
        icon: TrendingUp,
        label: "Rankings",
        description: "Community whisky rankings",
        href: "/legacy/discover/community?tab=rankings",
        testId: "link-rankings",
      },
      {
        icon: Award,
        label: "Leaderboard",
        description: "Global user ranking",
        href: "/legacy/discover/community?tab=leaderboard",
        testId: "link-leaderboard",
      },
    ],
  },
  {
    title: "Knowledge Base",
    items: [
      {
        icon: BookOpen,
        label: "Lexicon",
        description: "Whisky terms glossary",
        href: "/legacy/discover?section=lexicon",
        testId: "link-lexicon",
      },
      {
        icon: Map,
        label: "Distilleries",
        description: "Distillery encyclopedia & map",
        href: "/legacy/discover/distilleries",
        testId: "link-distilleries",
      },
      {
        icon: Compass,
        label: "Recommendations",
        description: "Whisky recommendations for you",
        href: "/legacy/discover",
        testId: "link-recommendations",
      },
    ],
  },
];

export default function SimpleAnalyzePage() {
  return (
    <SimpleShell showBack={false}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }} data-testid="text-analyze-title">
          Analyze
        </h2>

        {sections.map((section) => (
          <div key={section.title}>
            <h3
              style={{
                fontSize: 13,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: colors.accent,
                marginBottom: 10,
              }}
            >
              {section.title}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {section.items.map((item) => (
                <Link key={item.testId} href={item.href}>
                  <div style={cardStyle} data-testid={item.testId}>
                    <item.icon style={{ width: 18, height: 18, color: colors.accent, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{item.description}</div>
                    </div>
                    <ChevronRight style={{ width: 14, height: 14, color: colors.muted, flexShrink: 0 }} />
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

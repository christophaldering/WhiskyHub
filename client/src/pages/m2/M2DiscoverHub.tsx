import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { v, alpha } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import {
  Compass, BookOpen, Building2, Package, FileText, Map,
  Sparkles, FlaskConical, BookMarked, MessageSquare, Info,
  Heart, Rss, Users, ChevronRight,
} from "lucide-react";
import type { ElementType } from "react";

interface DiscoverLink {
  icon: ElementType;
  labelKey: string;
  labelFallback: string;
  descKey: string;
  descFallback: string;
  href: string;
  testId: string;
}

const LINKS: DiscoverLink[] = [
  { icon: BookOpen, labelKey: "m2.discover.lexicon", labelFallback: "Lexicon", descKey: "m2.discover.lexiconDesc", descFallback: "Searchable whisky dictionary", href: "/m2/discover/lexicon", testId: "link-discover-lexicon" },
  { icon: Building2, labelKey: "m2.discover.distilleries", labelFallback: "Distilleries", descKey: "m2.discover.distilleriesDesc", descFallback: "Distillery encyclopedia & map", href: "/m2/discover/distilleries", testId: "link-discover-distilleries" },
  { icon: Package, labelKey: "m2.discover.bottlers", labelFallback: "Bottlers", descKey: "m2.discover.bottlersDesc", descFallback: "Independent bottlers database", href: "/m2/discover/bottlers", testId: "link-discover-bottlers" },
  { icon: FileText, labelKey: "m2.discover.templates", labelFallback: "Templates", descKey: "m2.discover.templatesDesc", descFallback: "Tasting vocabulary templates", href: "/m2/discover/templates", testId: "link-discover-templates" },
  { icon: Map, labelKey: "m2.discover.guide", labelFallback: "Tasting Guide", descKey: "m2.discover.guideDesc", descFallback: "Step-by-step tasting guide", href: "/m2/discover/guide", testId: "link-discover-guide" },
  { icon: Sparkles, labelKey: "m2.discover.aiCuration", labelFallback: "AI Curation", descKey: "m2.discover.aiCurationDesc", descFallback: "AI whisky recommendations for lineups", href: "/m2/discover/ai-curation", testId: "link-discover-ai-curation" },
  { icon: FlaskConical, labelKey: "m2.discover.research", labelFallback: "Research", descKey: "m2.discover.researchDesc", descFallback: "Science of perception & bibliography", href: "/m2/discover/research", testId: "link-discover-research" },
  { icon: BookMarked, labelKey: "m2.discover.rabbitHole", labelFallback: "Rabbit Hole", descKey: "m2.discover.rabbitHoleDesc", descFallback: "Rating models, statistics & deep dives", href: "/m2/discover/rabbit-hole", testId: "link-discover-rabbit-hole" },
  { icon: MessageSquare, labelKey: "m2.discover.vocabulary", labelFallback: "Vocabulary", descKey: "m2.discover.vocabularyDesc", descFallback: "Copy-paste vocabulary cards", href: "/m2/discover/vocabulary", testId: "link-discover-vocabulary" },
  { icon: Info, labelKey: "m2.discover.about", labelFallback: "About", descKey: "m2.discover.aboutDesc", descFallback: "Story, founder info & contact", href: "/m2/discover/about", testId: "link-discover-about" },
  { icon: Heart, labelKey: "m2.discover.donate", labelFallback: "Donate", descKey: "m2.discover.donateDesc", descFallback: "Support CaskSense & Hospice", href: "/m2/discover/donate", testId: "link-discover-donate" },
  { icon: Rss, labelKey: "m2.discover.activity", labelFallback: "Activity Feed", descKey: "m2.discover.activityDesc", descFallback: "See what your friends are up to", href: "/m2/discover/activity", testId: "link-discover-activity" },
  { icon: Users, labelKey: "m2.discover.community", labelFallback: "Community", descKey: "m2.discover.communityDesc", descFallback: "Rankings, taste twins & leaderboard", href: "/m2/discover/community", testId: "link-discover-community" },
];

const card: React.CSSProperties = {
  background: v.card,
  borderRadius: 14,
  border: `1px solid ${v.border}`,
  padding: "14px 16px",
  display: "flex",
  alignItems: "center",
  gap: 12,
  cursor: "pointer",
  textDecoration: "none",
};

export default function M2DiscoverHub() {
  const { t } = useTranslation();

  return (
    <div style={{ padding: "16px 16px 32px", maxWidth: 600, margin: "0 auto" }} data-testid="m2-discover-hub-page">
      <M2BackButton />

      <div style={{ textAlign: "center", margin: "16px 0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 6 }}>
          <Compass style={{ width: 24, height: 24, color: v.accent }} strokeWidth={1.8} />
          <h1
            style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: v.text, margin: 0 }}
            data-testid="text-discover-hub-title"
          >
            {t("m2.discover.title", "Discover")}
          </h1>
        </div>
        <p style={{ fontSize: 13, color: v.muted, margin: 0 }}>
          {t("m2.discover.subtitle", "Recommendations, knowledge & research — all in one place.")}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {LINKS.map((link) => (
          <Link key={link.testId} href={link.href} style={{ textDecoration: "none" }}>
            <div style={card} data-testid={link.testId}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: alpha(v.accent, "12"),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <link.icon style={{ width: 18, height: 18, color: v.accent }} strokeWidth={1.8} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: v.text, fontFamily: "'Playfair Display', serif" }}>
                  {t(link.labelKey, link.labelFallback)}
                </div>
                <div style={{ fontSize: 12, color: v.muted, marginTop: 1 }}>
                  {t(link.descKey, link.descFallback)}
                </div>
              </div>
              <ChevronRight style={{ width: 16, height: 16, color: v.muted, flexShrink: 0 }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

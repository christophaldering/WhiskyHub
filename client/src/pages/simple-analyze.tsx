import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Users, UserCheck, TrendingUp, Award, BookOpen, Map, Sparkles,
  ChevronRight, Database, Activity, GraduationCap, Info, Heart, Package, FileText
} from "lucide-react";
import SimpleShell from "@/components/simple/simple-shell";
import { useQuery } from "@tanstack/react-query";
import { platformStatsApi } from "@/lib/api";
import { c, cardStyle, sectionHeadingStyle, pageTitleStyle, pageSubtitleStyle } from "@/lib/theme";
import { DISCOVER_STRUCTURE } from "@/lib/config";

interface NavItem {
  icon: React.ElementType;
  label: string;
  description: string;
  href: string;
  testId: string;
  badge?: string | number | null;
}

function getLegacySections(t: (key: string) => string): { title: string; items: NavItem[] }[] {
  return [
    {
      title: t("discoverPage.sectionSocial"),
      items: [
        { icon: Users, label: t("discoverPage.tasteTwins"), description: t("discoverPage.tasteTwinsDesc"), href: "/discover/community?tab=twins", testId: "link-taste-twins" },
        { icon: UserCheck, label: t("discoverPage.whiskyFriends"), description: t("discoverPage.whiskyFriendsDesc"), href: "/discover/community", testId: "link-whisky-friends" },
        { icon: TrendingUp, label: t("discoverPage.rankings"), description: t("discoverPage.rankingsDesc"), href: "/discover/community?tab=rankings", testId: "link-rankings" },
        { icon: Award, label: t("discoverPage.leaderboard"), description: t("discoverPage.leaderboardDesc"), href: "/discover/community?tab=leaderboard", testId: "link-leaderboard" },
        { icon: Activity, label: t("discoverPage.activityFeed"), description: t("discoverPage.activityFeedDesc"), href: "/discover/activity", testId: "link-activity" },
        { icon: Database, label: t("discoverPage.whiskyDatabase"), description: t("discoverPage.whiskyDatabaseDesc"), href: "/discover/database", testId: "link-database" },
      ],
    },
    {
      title: t("discoverPage.sectionRecommendations"),
      items: [
        { icon: Sparkles, label: t("discoverPage.recommendations"), description: t("discoverPage.recommendationsDesc"), href: "/discover/recommendations", testId: "link-recommendations" },
      ],
    },
    {
      title: t("discoverPage.sectionKnowledge"),
      items: [
        { icon: BookOpen, label: t("discoverPage.lexicon"), description: t("discoverPage.lexiconDesc"), href: "/discover/lexicon", testId: "link-lexicon" },
        { icon: Map, label: t("discoverPage.distilleries"), description: t("discoverPage.distilleriesDesc"), href: "/discover/distilleries", testId: "link-distilleries" },
        { icon: Package, label: t("discoverPage.independentBottlers"), description: t("discoverPage.independentBottlersDesc"), href: "/discover/bottlers", testId: "link-bottlers" },
        { icon: FileText, label: t("discoverPage.tastingTemplates"), description: t("discoverPage.tastingTemplatesDesc"), href: "/discover/templates", testId: "link-tasting-templates" },
        { icon: GraduationCap, label: t("discoverPage.tastingGuide"), description: t("discoverPage.tastingGuideDesc"), href: "/guide", testId: "link-tasting-guide" },
      ],
    },
    {
      title: t("discoverPage.sectionAbout"),
      items: [
        { icon: Info, label: t("discoverPage.aboutCaskSense"), description: t("discoverPage.aboutDesc"), href: "/discover/about", testId: "link-about-casksense" },
        { icon: Heart, label: t("discoverPage.donate"), description: t("discoverPage.donateDesc"), href: "/discover/donate", testId: "link-donate-hospiz" },
      ],
    },
  ];
}

function getV2Sections(t: (key: string) => string): { title: string; items: NavItem[] }[] {
  return [
    {
      title: t("discoverPage.sectionCommunity"),
      items: [
        { icon: Users, label: t("discoverPage.tasteTwins"), description: t("discoverPage.tasteTwinsDesc"), href: "/discover/community?tab=twins", testId: "link-taste-twins" },
        { icon: UserCheck, label: t("discoverPage.whiskyFriends"), description: t("discoverPage.whiskyFriendsDesc"), href: "/discover/community", testId: "link-whisky-friends" },
        { icon: TrendingUp, label: t("discoverPage.communityRankings"), description: t("discoverPage.communityRankingsDesc"), href: "/discover/community?tab=rankings", testId: "link-community-rankings" },
        { icon: Activity, label: t("discoverPage.activityFeed"), description: t("discoverPage.activityFeedDesc"), href: "/discover/activity", testId: "link-activity" },
      ],
    },
    {
      title: t("discoverPage.sectionKnowledge"),
      items: [
        { icon: BookOpen, label: t("discoverPage.lexicon"), description: t("discoverPage.lexiconDesc"), href: "/discover/lexicon", testId: "link-lexicon" },
        { icon: Map, label: t("discoverPage.distilleries"), description: t("discoverPage.distilleriesDesc"), href: "/discover/distilleries", testId: "link-distilleries" },
        { icon: Package, label: t("discoverPage.independentBottlers"), description: t("discoverPage.independentBottlersDesc"), href: "/discover/bottlers", testId: "link-bottlers" },
        { icon: Database, label: t("discoverPage.whiskyDatabase"), description: t("discoverPage.whiskyDatabaseDesc"), href: "/discover/database", testId: "link-database" },
      ],
    },
    {
      title: t("discoverPage.sectionPlanning"),
      items: [
        { icon: GraduationCap, label: t("discoverPage.tastingGuide"), description: t("discoverPage.tastingGuideDesc"), href: "/guide", testId: "link-tasting-guide" },
        { icon: FileText, label: t("discoverPage.tastingTemplates"), description: t("discoverPage.tastingTemplatesDesc"), href: "/discover/templates", testId: "link-tasting-templates" },
      ],
    },
    {
      title: t("discoverPage.sectionAbout"),
      items: [
        { icon: Info, label: t("discoverPage.aboutCaskSense"), description: t("discoverPage.aboutDesc"), href: "/discover/about", testId: "link-about-casksense" },
        { icon: Heart, label: t("discoverPage.donate"), description: t("discoverPage.donateDesc"), href: "/discover/donate", testId: "link-donate-hospiz" },
      ],
    },
  ];
}

export default function SimpleAnalyzePage() {
  const { t } = useTranslation();
  const { data: platformStats } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: () => platformStatsApi.get(),
    staleTime: 60000,
  });

  const totalWhiskies = platformStats?.totalWhiskies ?? platformStats?.uniqueWhiskies ?? null;
  const totalParticipants = platformStats?.totalParticipants ?? null;

  const isV2 = DISCOVER_STRUCTURE === "v2_simplified";
  const sections = isV2 ? getV2Sections(t) : getLegacySections(t);
  const subtitle = isV2 ? t("discoverPage.subtitleV2") : t("discoverPage.subtitle");

  return (
    <SimpleShell showBack={false}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
        <div style={{ marginBottom: 8 }}>
          <h2 style={pageTitleStyle} data-testid="text-analyze-title">
            {t("discoverPage.title")}
          </h2>
          <p style={pageSubtitleStyle}>
            {subtitle}
          </p>
        </div>

        {(totalWhiskies || totalParticipants) && (
          <div style={{ display: "flex", gap: 10 }}>
            {totalParticipants != null && (
              <div style={{ ...cardStyle, flex: 1, padding: "16px 18px", textAlign: "center" }} data-testid="stat-participants">
                <div style={{ fontSize: 24, fontWeight: 700, color: c.accent, fontFamily: "'Playfair Display', serif", letterSpacing: "-0.02em" }}>{totalParticipants}</div>
                <div style={{ fontSize: 11, color: c.muted, marginTop: 4 }}>{t("discoverPage.statTasters")}</div>
              </div>
            )}
            {totalWhiskies != null && (
              <div style={{ ...cardStyle, flex: 1, padding: "16px 18px", textAlign: "center" }} data-testid="stat-whiskies">
                <div style={{ fontSize: 24, fontWeight: 700, color: c.accent, fontFamily: "'Playfair Display', serif", letterSpacing: "-0.02em" }}>{totalWhiskies}</div>
                <div style={{ fontSize: 11, color: c.muted, marginTop: 4 }}>{t("discoverPage.statWhiskies")}</div>
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

import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { v, alpha } from "@/lib/themeVars";
import { getSession } from "@/lib/session";
import {
  Activity, BookOpen, Wine, BarChart3, ChevronRight, Lock,
  Radar, Archive, Heart, FlaskConical, Sparkles, GitCompareArrows,
  Download, PenLine, Library, Building2, Package, Map, Users,
  Trophy, Info, HandHeart, PieChart, UtensilsCrossed, Star,
} from "lucide-react";
import { Link } from "wouter";
import { participantApi, journalApi, statsApi } from "@/lib/api";

const ANALYTICS_THRESHOLD = 10;

function StatBox({ label, value, testId }: { label: string; value: number | string | null; testId: string }) {
  const display = value != null ? (typeof value === "number" ? value.toFixed(1) : value) : "—";
  return (
    <div
      style={{
        flex: 1,
        background: v.card,
        border: `1px solid ${v.border}`,
        borderRadius: 12,
        padding: "14px 12px",
        textAlign: "center",
      }}
      data-testid={testId}
    >
      <div style={{ fontSize: 22, fontWeight: 700, color: v.accent, fontVariantNumeric: "tabular-nums" }}>
        {display}
      </div>
      <div style={{ fontSize: 11, color: v.muted, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 13,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: 1.2,
        color: v.muted,
        margin: "24px 0 10px",
      }}
    >
      {children}
    </h2>
  );
}

interface NavRowProps {
  icon: React.ElementType;
  label: string;
  description?: string;
  href: string;
  testId: string;
  badge?: string | number | null;
}

function NavRow({ icon: Icon, label, description, href, testId, badge }: NavRowProps) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div
        style={{
          background: v.card,
          border: `1px solid ${v.border}`,
          borderRadius: 12,
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: "pointer",
          marginBottom: 6,
        }}
        data-testid={testId}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: alpha(v.accent, "15"),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon style={{ width: 18, height: 18, color: v.accent }} strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: v.text }}>{label}</div>
          {description && (
            <div style={{ fontSize: 12, color: v.muted, marginTop: 2, lineHeight: 1.4 }}>{description}</div>
          )}
        </div>
        {badge != null && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: v.accent,
              background: alpha(v.accent, "12"),
              padding: "3px 10px",
              borderRadius: 20,
              flexShrink: 0,
            }}
          >
            {badge}
          </span>
        )}
        <ChevronRight style={{ width: 16, height: 16, color: v.muted, flexShrink: 0 }} strokeWidth={1.8} />
      </div>
    </Link>
  );
}

export default function M2TasteHome() {
  const { t } = useTranslation();
  const session = getSession();
  const pid = session.pid;

  const { data: journal = [] } = useQuery({
    queryKey: ["journal", pid],
    queryFn: async () => {
      if (!pid) return [];
      return journalApi.getAll(pid);
    },
    enabled: !!pid,
  });

  const { data: tastings = [] } = useQuery({
    queryKey: ["tastings", pid],
    queryFn: async () => {
      if (!pid) return [];
      const res = await fetch(`/api/tastings?participantId=${pid}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!pid,
  });

  const { data: participant } = useQuery({
    queryKey: ["participant-detail", pid],
    queryFn: () => participantApi.get(pid!),
    enabled: !!pid,
  });

  const { data: stats } = useQuery({
    queryKey: ["participant-stats", pid],
    queryFn: () => statsApi.get(pid!),
    enabled: !!pid,
  });

  const { data: insightData } = useQuery({
    queryKey: ["participant-insights", pid],
    queryFn: () =>
      fetch(`/api/participants/${pid}/insights`, { headers: { "x-participant-id": pid! } }).then((r) =>
        r.ok ? r.json() : null
      ),
    enabled: !!pid,
  });

  const journalCount = Array.isArray(journal) ? journal.length : 0;
  const tastingCount = tastings.length;
  const stability = participant?.ratingStabilityScore ?? null;
  const exploration = participant?.explorationIndex ?? null;
  const smoke = participant?.smokeAffinityIndex ?? null;
  const insight = insightData?.insight ?? null;

  const totalRatings = stats?.totalRatings ?? stats?.ratingCount ?? 0;
  const totalJournal = stats?.totalJournalEntries ?? 0;
  const whiskyCount = totalRatings + totalJournal;
  const analyticsLocked = whiskyCount < ANALYTICS_THRESHOLD;

  return (
    <div style={{ padding: "20px 16px", paddingBottom: 100 }} data-testid="m2-taste-home">
      <h1
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 26,
          fontWeight: 700,
          color: v.text,
          margin: "0 0 8px",
        }}
        data-testid="text-m2-taste-title"
      >
        {t("m2.taste.title", "Taste")}
      </h1>
      <p style={{ fontSize: 14, color: v.textSecondary, marginBottom: 20 }}>
        {t("m2.taste.subtitle", "Your personal whisky world")}
      </p>

      {!session.signedIn && (
        <div
          style={{
            background: v.elevated,
            borderRadius: 12,
            padding: "24px 16px",
            textAlign: "center",
            color: v.textSecondary,
            fontSize: 14,
          }}
          data-testid="m2-taste-signin-prompt"
        >
          {t("m2.taste.signInPrompt", "Sign in to access your taste profile")}
        </div>
      )}

      {session.signedIn && (
        <>
          <Link href="/m2/tastings/solo" style={{ textDecoration: "none" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "14px 20px",
                background: v.accent,
                color: v.bg,
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                marginBottom: 20,
              }}
              data-testid="button-log-dram"
            >
              <PenLine style={{ width: 18, height: 18 }} strokeWidth={2} />
              {t("m2.taste.logDram", "Log a Dram")}
            </div>
          </Link>

          <div style={{ display: "flex", gap: 10, marginBottom: 6 }} data-testid="m2-taste-snapshot">
            <StatBox label={t("m2.taste.stability", "Stability")} value={stability} testId="stat-stability" />
            <StatBox label={t("m2.taste.exploration", "Exploration")} value={exploration} testId="stat-exploration" />
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <StatBox label={t("m2.taste.smokeAffinity", "Smoke")} value={smoke} testId="stat-smoke" />
            <StatBox label={t("m2.taste.tastingCount", "Tastings")} value={tastingCount} testId="stat-tastings" />
          </div>

          {insight && (
            <div
              style={{
                background: v.card,
                border: `1px solid ${v.border}`,
                borderRadius: 12,
                padding: "16px",
                marginBottom: 20,
              }}
              data-testid="card-taste-insight"
            >
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: v.muted, marginBottom: 8 }}>
                {t("m2.taste.insight", "Taste Insight")}
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: v.text, margin: 0 }} data-testid="text-insight-message">
                {insight.message}
              </p>
            </div>
          )}

          <Link href="/m2/taste/analytics" style={{ textDecoration: "none" }}>
            <div
              style={{
                background: v.card,
                border: `1px solid ${v.border}`,
                borderRadius: 12,
                padding: "16px",
                cursor: "pointer",
                opacity: analyticsLocked ? 0.85 : 1,
                marginBottom: 4,
              }}
              data-testid="card-analytics-preview"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: alpha(v.accent, "15"),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {analyticsLocked ? (
                    <Lock style={{ width: 16, height: 16, color: v.mutedLight }} />
                  ) : (
                    <BarChart3 style={{ width: 18, height: 18, color: v.accent }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: analyticsLocked ? v.mutedLight : v.text }}>
                    {t("m2.taste.analytics", "Analytics")}
                  </div>
                  <div style={{ fontSize: 12, color: v.muted, marginTop: 2 }}>
                    {analyticsLocked
                      ? t("m2.taste.analyticsLocked", `${whiskyCount}/${ANALYTICS_THRESHOLD} whiskies to unlock`)
                      : t("m2.taste.analyticsUnlocked", "Your taste data is ready")}
                  </div>
                </div>
                {analyticsLocked && (
                  <div style={{ height: 4, width: 50, background: v.bg, borderRadius: 2, overflow: "hidden", flexShrink: 0 }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min((whiskyCount / ANALYTICS_THRESHOLD) * 100, 100)}%`,
                        background: v.accent,
                        borderRadius: 2,
                      }}
                    />
                  </div>
                )}
                {!analyticsLocked && <ChevronRight style={{ width: 14, height: 14, color: v.muted, flexShrink: 0 }} />}
              </div>
            </div>
          </Link>

          <SectionHeading>{t("m2.taste.sectionProfile", "Profile & Analysis")}</SectionHeading>
          <NavRow
            icon={Radar}
            label={t("m2.taste.profile", "My CaskSense Profile")}
            description={t("m2.taste.profileDesc", "Flavor radar, style & sweet spot")}
            href="/m2/taste/profile"
            testId="m2-taste-link-profile"
          />
          <NavRow
            icon={BarChart3}
            label={t("m2.taste.analytics", "Analytics")}
            description={t("m2.taste.analyticsDesc", "Evolution, consistency & stats")}
            href="/m2/taste/analytics"
            testId="m2-taste-link-analytics"
          />
          <NavRow
            icon={GitCompareArrows}
            label={t("m2.taste.compare", "Compare")}
            description={t("m2.taste.compareDesc", "Your scores vs. community")}
            href="/m2/taste/compare"
            testId="m2-taste-link-compare"
          />
          <NavRow
            icon={Sparkles}
            label={t("m2.taste.recommendations", "Recommendations")}
            description={t("m2.taste.recommendationsDesc", "Whiskies matched to your taste")}
            href="/m2/taste/recommendations"
            testId="m2-taste-link-recommendations"
          />
          <NavRow
            icon={FlaskConical}
            label={t("m2.taste.benchmark", "Benchmark Analyzer")}
            description={t("m2.taste.benchmarkDesc", "Extract & compare external reviews")}
            href="/m2/taste/benchmark"
            testId="m2-taste-link-benchmark"
          />
          <NavRow
            icon={PieChart}
            label={t("m2.taste.wheel", "Flavor Wheel")}
            description={t("m2.taste.wheelDesc", "Aroma categories from your notes")}
            href="/m2/taste/wheel"
            testId="m2-taste-link-wheel"
          />
          <NavRow
            icon={UtensilsCrossed}
            label={t("m2.taste.pairings", "Pairings")}
            description={t("m2.taste.pairingsDesc", "AI food pairing suggestions")}
            href="/m2/taste/pairings"
            testId="m2-taste-link-pairings"
          />

          <SectionHeading>{t("m2.taste.sectionDrams", "My Drams")}</SectionHeading>
          <NavRow
            icon={BookOpen}
            label={t("m2.taste.journal", "My Drams")}
            description={t("m2.taste.journalDesc", "Your personal tasting journal")}
            href="/m2/taste/drams"
            testId="m2-taste-link-drams"
            badge={journalCount > 0 ? journalCount : null}
          />
          <NavRow
            icon={Archive}
            label={t("m2.taste.collection", "Collection")}
            description={t("m2.taste.collectionDesc", "Whiskybase import & management")}
            href="/m2/taste/collection"
            testId="m2-taste-link-collection"
          />
          <NavRow
            icon={Heart}
            label={t("m2.taste.wishlist", "Wishlist")}
            description={t("m2.taste.wishlistDesc", "Bottles you want to try")}
            href="/m2/taste/wishlist"
            testId="m2-taste-link-wishlist"
          />
          <NavRow
            icon={Download}
            label={t("m2.taste.downloads", "Downloads & Export")}
            description={t("m2.taste.downloadsDesc", "Tasting sheets, data export")}
            href="/m2/taste/downloads"
            testId="m2-taste-link-downloads"
          />

          <SectionHeading>{t("m2.taste.sectionKnowledge", "Knowledge")}</SectionHeading>
          <NavRow
            icon={Library}
            label={t("m2.taste.lexicon", "Lexicon")}
            description={t("m2.taste.lexiconDesc", "Searchable whisky dictionary")}
            href="/m2/discover/lexicon"
            testId="m2-taste-link-lexicon"
          />
          <NavRow
            icon={Building2}
            label={t("m2.taste.distilleries", "Distilleries")}
            description={t("m2.taste.distilleriesDesc", "Encyclopedia & map")}
            href="/m2/discover/distilleries"
            testId="m2-taste-link-distilleries"
          />
          <NavRow
            icon={Package}
            label={t("m2.taste.bottlers", "Bottlers")}
            description={t("m2.taste.bottlersDesc", "Independent bottlers database")}
            href="/m2/discover/bottlers"
            testId="m2-taste-link-bottlers"
          />
          <NavRow
            icon={Map}
            label={t("m2.taste.guide", "Tasting Guide")}
            description={t("m2.taste.guideDesc", "Step-by-step tasting guide")}
            href="/m2/discover/guide"
            testId="m2-taste-link-guide"
          />
          <NavRow
            icon={Star}
            label={t("m2.taste.rabbitHole", "Rabbit Hole")}
            description={t("m2.taste.rabbitHoleDesc", "Rating models & statistics")}
            href="/m2/discover/rabbit-hole"
            testId="m2-taste-link-rabbit-hole"
          />

          <SectionHeading>{t("m2.taste.sectionCommunity", "Community")}</SectionHeading>
          <NavRow
            icon={Users}
            label={t("m2.taste.tasteTwins", "Taste Twins")}
            description={t("m2.taste.tasteTwinsDesc", "Find similar palates")}
            href="/m2/discover/community?tab=twins"
            testId="m2-taste-link-twins"
          />
          <NavRow
            icon={Trophy}
            label={t("m2.taste.rankings", "Rankings")}
            description={t("m2.taste.rankingsDesc", "Community leaderboard")}
            href="/m2/discover/community?tab=rankings"
            testId="m2-taste-link-rankings"
          />
          <NavRow
            icon={Activity}
            label={t("m2.taste.activityFeed", "Activity Feed")}
            description={t("m2.taste.activityFeedDesc", "Friend activities")}
            href="/m2/discover/activity"
            testId="m2-taste-link-activity"
          />

          <SectionHeading>{t("m2.taste.sectionAbout", "About")}</SectionHeading>
          <NavRow
            icon={Info}
            label={t("m2.taste.about", "About CaskSense")}
            description={t("m2.taste.aboutDesc", "Story, founder & contact")}
            href="/m2/discover/about"
            testId="m2-taste-link-about"
          />
          <NavRow
            icon={HandHeart}
            label={t("m2.taste.donate", "Support Us")}
            description={t("m2.taste.donateDesc", "Help keep CaskSense free")}
            href="/m2/discover/donate"
            testId="m2-taste-link-donate"
          />
        </>
      )}
    </div>
  );
}

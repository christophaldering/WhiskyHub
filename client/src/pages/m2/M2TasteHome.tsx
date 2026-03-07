import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { v, alpha } from "@/lib/themeVars";
import { getSession, useSession } from "@/lib/session";
import {
  BookOpen, BarChart3, ChevronRight, ChevronDown, Lock,
  Radar, Archive, Heart, FlaskConical, Sparkles, GitCompareArrows,
  Library, Building2, Package, Map, ScrollText,
  PieChart, UtensilsCrossed, Star, GraduationCap,
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
        background: `radial-gradient(ellipse at center, ${alpha(v.accent, "06")} 0%, ${v.card} 70%)`,
        border: `1px solid ${v.border}`,
        borderRadius: 16,
        padding: "20px 16px",
        textAlign: "center",
      }}
      data-testid={testId}
    >
      <div style={{ fontSize: 24, fontWeight: 700, color: v.accent, fontVariantNumeric: "tabular-nums", fontFamily: "'Playfair Display', Georgia, serif" }}>
        {display}
      </div>
      <div style={{ fontSize: 11, color: v.muted, marginTop: 4, fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif" }}>{label}</div>
    </div>
  );
}

function AccordionSection({
  title,
  icon: Icon,
  open,
  onToggle,
  children,
  testId,
}: {
  title: string;
  icon: React.ElementType;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <div style={{ marginTop: 16 }} data-testid={testId}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 4px",
          background: "none",
          border: "none",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
        }}
        data-testid={`${testId}-toggle`}
      >
        <Icon style={{ width: 16, height: 16, color: v.accent, flexShrink: 0 }} strokeWidth={2} />
        <span style={{
          flex: 1,
          textAlign: "left",
          fontSize: 13,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 1.2,
          color: v.muted,
        }}>
          {title}
        </span>
        <ChevronDown
          style={{
            width: 16,
            height: 16,
            color: v.muted,
            flexShrink: 0,
            transition: "transform 0.25s ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
          strokeWidth={2}
        />
      </button>
      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: "grid-template-rows 0.3s ease",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          {children}
        </div>
      </div>
    </div>
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
          background: `linear-gradient(135deg, ${alpha(v.accent, "04")} 0%, ${v.card} 50%)`,
          border: `1px solid ${v.border}`,
          borderRadius: 16,
          padding: "16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: "pointer",
          marginBottom: 8,
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          WebkitTapHighlightColor: "transparent",
        }}
        onPointerDown={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(0.97)"; }}
        onPointerUp={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; }}
        onPointerLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; }}
        onPointerCancel={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; }}
        data-testid={testId}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: alpha(v.accent, "12"),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon style={{ width: 20, height: 20, color: v.accent }} strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: v.text, fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif" }}>{label}</div>
          {description && (
            <div style={{ fontSize: 12, color: v.muted, marginTop: 2, lineHeight: 1.4, fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif" }}>{description}</div>
          )}
        </div>
        {badge != null && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: v.accent,
              background: alpha(v.accent, "12"),
              padding: "4px 10px",
              borderRadius: 20,
              flexShrink: 0,
              fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
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
  const session = useSession();
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

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ profile: true });
  const toggle = (key: string) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div style={{ padding: "32px 16px", paddingBottom: 100 }} data-testid="m2-taste-home">
      <h1
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 32,
          fontWeight: 700,
          color: v.text,
          margin: "0 0 8px",
          letterSpacing: "-0.02em",
        }}
        data-testid="text-m2-taste-title"
      >
        {t("m2.taste.title", "Taste")}
      </h1>
      <p style={{ fontSize: 15, color: v.textSecondary, marginBottom: 24, fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif", lineHeight: 1.4 }}>
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
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }} data-testid="m2-taste-snapshot">
            <StatBox label={t("m2.taste.stability", "Stability")} value={stability} testId="stat-stability" />
            <StatBox label={t("m2.taste.exploration", "Exploration")} value={exploration} testId="stat-exploration" />
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
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

          <AccordionSection
            title={t("m2.taste.sectionProfile", "Profile & Analysis")}
            icon={Radar}
            open={!!openSections.profile}
            onToggle={() => toggle("profile")}
            testId="m2-taste-section-profile"
          >
            <NavRow icon={Radar} label={t("m2.taste.profile", "CaskSense Profile")} description={t("m2.taste.profileDesc", "Flavor radar, style & sweet spot")} href="/m2/taste/profile" testId="m2-taste-link-profile" />
            <NavRow icon={BarChart3} label={t("m2.taste.analytics", "Analytics")} description={t("m2.taste.analyticsDesc", "Evolution, consistency & stats")} href="/m2/taste/analytics" testId="m2-taste-link-analytics" />
            <NavRow icon={GitCompareArrows} label={t("m2.taste.compare", "Compare")} description={t("m2.taste.compareDesc", "Your scores vs. community")} href="/m2/taste/compare" testId="m2-taste-link-compare" />
            <NavRow icon={Sparkles} label={t("m2.taste.recommendations", "Recommendations")} description={t("m2.taste.recommendationsDesc", "Whiskies matched to your taste")} href="/m2/taste/recommendations" testId="m2-taste-link-recommendations" />
            <NavRow icon={FlaskConical} label={t("m2.taste.benchmark", "Benchmark Analyzer")} description={t("m2.taste.benchmarkDesc", "Extract & compare external reviews")} href="/m2/taste/benchmark" testId="m2-taste-link-benchmark" />
            <NavRow icon={PieChart} label={t("m2.taste.wheel", "Flavor Wheel")} description={t("m2.taste.wheelDesc", "Aroma categories from your notes")} href="/m2/taste/wheel" testId="m2-taste-link-wheel" />
            <NavRow icon={UtensilsCrossed} label={t("m2.taste.pairings", "Pairings")} description={t("m2.taste.pairingsDesc", "AI food pairing suggestions")} href="/m2/taste/pairings" testId="m2-taste-link-pairings" />
            <NavRow icon={Library} label={t("m2.taste.collectionAnalysis", "Collection Analysis")} description={t("m2.taste.collectionAnalysisDesc", "Deep insights into your whisky collection")} href="/m2/taste/collection-analysis" testId="m2-taste-link-collection-analysis" />
          </AccordionSection>

          <AccordionSection
            title={t("m2.taste.sectionDrams", "Drams & Collection")}
            icon={BookOpen}
            open={!!openSections.drams}
            onToggle={() => toggle("drams")}
            testId="m2-taste-section-drams"
          >
            <NavRow icon={BookOpen} label={t("m2.taste.journal", "Drams")} description={t("m2.taste.journalDesc", "Your personal tasting journal")} href="/m2/taste/drams" testId="m2-taste-link-drams" badge={journalCount > 0 ? journalCount : null} />
            <NavRow icon={Archive} label={t("m2.taste.collection", "Collection")} description={t("m2.taste.collectionDesc", "Whiskybase import & management")} href="/m2/taste/collection" testId="m2-taste-link-collection" />
            <NavRow icon={ScrollText} label={t("m2.taste.historical", "Historical Tastings")} description={t("m2.taste.historicalDesc", "External tasting data from past events")} href="/m2/taste/historical" testId="m2-taste-link-historical" />
            <NavRow icon={Heart} label={t("m2.taste.wishlist", "Wishlist")} description={t("m2.taste.wishlistDesc", "Bottles you want to try")} href="/m2/taste/wishlist" testId="m2-taste-link-wishlist" />
          </AccordionSection>

          <AccordionSection
            title={t("m2.taste.sectionKnowledge", "Knowledge")}
            icon={GraduationCap}
            open={!!openSections.knowledge}
            onToggle={() => toggle("knowledge")}
            testId="m2-taste-section-knowledge"
          >
            <NavRow icon={Library} label={t("m2.taste.lexicon", "Lexicon")} description={t("m2.taste.lexiconDesc", "Searchable whisky dictionary")} href="/m2/discover/lexicon" testId="m2-taste-link-lexicon" />
            <NavRow icon={Building2} label={t("m2.taste.distilleries", "Distilleries")} description={t("m2.taste.distilleriesDesc", "Encyclopedia & map")} href="/m2/discover/distilleries" testId="m2-taste-link-distilleries" />
            <NavRow icon={Package} label={t("m2.taste.bottlers", "Bottlers")} description={t("m2.taste.bottlersDesc", "Independent bottlers database")} href="/m2/discover/bottlers" testId="m2-taste-link-bottlers" />
            <NavRow icon={Map} label={t("m2.taste.guide", "Tasting Guide")} description={t("m2.taste.guideDesc", "Step-by-step tasting guide")} href="/m2/discover/guide" testId="m2-taste-link-guide" />
            <NavRow icon={Star} label={t("m2.taste.rabbitHole", "Rabbit Hole")} description={t("m2.taste.rabbitHoleDesc", "Rating models & statistics")} href="/m2/discover/rabbit-hole" testId="m2-taste-link-rabbit-hole" />
          </AccordionSection>
        </>
      )}
    </div>
  );
}

import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import BackLink from "@/labs/components/BackLink";
import { Sparkles, Activity, Library, Compass, ChevronLeft } from "lucide-react";
import type { ElementType } from "react";

interface HubLink {
  icon: ElementType;
  labelKey: string;
  labelFallback: string;
  descKey: string;
  descFallback: string;
  href: string;
  testId: string;
}

const LINKS: HubLink[] = [
  {
    icon: Sparkles,
    labelKey: "myTastePage.aiInsightsHub.connoisseur",
    labelFallback: "Connoisseur Report",
    descKey: "myTastePage.aiInsightsHub.connoisseurDesc",
    descFallback: "Your personal palate letter",
    href: "/labs/taste/connoisseur",
    testId: "labs-link-ai-insights-connoisseur",
  },
  {
    icon: Activity,
    labelKey: "myTastePage.whiskyDna",
    labelFallback: "Whisky DNA",
    descKey: "myTastePage.aiInsightsHub.dnaDesc",
    descFallback: "The fingerprint of your taste",
    href: "/labs/taste/dna",
    testId: "labs-link-ai-insights-dna",
  },
  {
    icon: Sparkles,
    labelKey: "myTastePage.recommendations",
    labelFallback: "Recommendations",
    descKey: "myTastePage.aiInsightsHub.recommendationsDesc",
    descFallback: "Personalized whisky picks for you",
    href: "/labs/taste/recommendations",
    testId: "labs-link-ai-insights-recommendations",
  },
  {
    icon: Library,
    labelKey: "myTastePage.aiInsightsHub.collectionAnalysis",
    labelFallback: "Collection Analysis",
    descKey: "myTastePage.aiInsightsHub.collectionAnalysisDesc",
    descFallback: "Patterns in your bottle collection",
    href: "/labs/taste/collection-analysis",
    testId: "labs-link-ai-insights-collection-analysis",
  },
  {
    icon: Compass,
    labelKey: "myTastePage.aiInsightsHub.aiCuration",
    labelFallback: "AI Curation",
    descKey: "myTastePage.aiInsightsHub.aiCurationDesc",
    descFallback: "AI-curated lineups & suggestions",
    href: "/labs/taste/ai-curation",
    testId: "labs-link-ai-insights-ai-curation",
  },
];

function Tile({ link, t }: { link: HubLink; t: (key: string, fallback: string) => string }) {
  return (
    <Link href={link.href} style={{ textDecoration: "none" }}>
      <div
        className="labs-card"
        data-testid={link.testId}
        style={{
          minHeight: 92,
          padding: "14px 16px",
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          cursor: "pointer",
          height: "100%",
        }}
      >
        <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--labs-surface-elevated)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <link.icon style={{ width: 18, height: 18, color: "var(--labs-accent)" }} strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)", lineHeight: 1.25 }}>
            {t(link.labelKey, link.labelFallback)}
          </div>
          <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginTop: 3, lineHeight: 1.35 }}>
            {t(link.descKey, link.descFallback)}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function LabsAIInsights() {
  const { t } = useTranslation();
  return (
    <div className="labs-page" data-testid="labs-ai-insights-page">
      <BackLink href="/labs/taste" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-ai-insights">
          <ChevronLeft className="w-4 h-4" /> {t("myTastePage.title", "My World")}
        </button>
      </BackLink>

      <div style={{ marginBottom: 24 }}>
        <h1 className="labs-serif" style={{ fontSize: 28, fontWeight: 700, color: "var(--labs-text)", margin: "0 0 2px" }} data-testid="text-ai-insights-title">
          {t("myTastePage.aiInsightsHub.title", "AI Insights")}
        </h1>
        <p style={{ fontSize: 14, color: "var(--labs-text-muted)", margin: 0 }}>
          {t("myTastePage.aiInsightsHub.subtitle", "AI-powered reports & recommendations")}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {LINKS.map((link) => (
          <Tile key={link.testId} link={link} t={t} />
        ))}
      </div>
    </div>
  );
}

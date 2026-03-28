import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react";
import BackLink from "@/labs/components/BackLink";
import CommunityInsights from "@/labs/components/CommunityInsights";
import { LabsHistoryInsights } from "./LabsHistory";

export default function LabsCommunityInsightsPage() {
  const { t } = useTranslation();
  return (
    <div className="labs-page" data-testid="labs-community-insights-page">
      <BackLink href="/labs/bibliothek" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-community-insights">
          <ChevronLeft className="w-4 h-4" /> {t("bibliothek.title", "Library")}
        </button>
      </BackLink>

      <div style={{ marginBottom: 24 }}>
        <h1 className="labs-serif" style={{ fontSize: 28, fontWeight: 700, color: "var(--labs-text)", margin: "0 0 2px" }} data-testid="text-community-insights-title">
          {t("bibliothek.statisticsAndTrends", "Statistics & Trends")}
        </h1>
        <p style={{ fontSize: 14, color: "var(--labs-text-muted)", margin: 0 }}>
          {t("bibliothek.statisticsAndTrendsDesc", "Community insights & cross-tasting analytics")}
        </p>
      </div>

      <CommunityInsights expandedByDefault />

      <div style={{ marginTop: 8 }}>
        <div className="labs-section-label" style={{ fontSize: 11, letterSpacing: "0.08em", color: "var(--labs-text-muted)", marginBottom: 12, paddingLeft: 4 }}>
          {t("bibliothek.crossTastingInsights", "Cross-Tasting Insights")}
        </div>
        <LabsHistoryInsights />
      </div>
    </div>
  );
}

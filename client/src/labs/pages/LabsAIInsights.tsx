import { useTranslation } from "react-i18next";
import MeineWeltActionBar from "@/labs/components/MeineWeltActionBar";
import { AI_INSIGHTS_HUB_TILES, HubTileGrid } from "./hubTiles";

export default function LabsAIInsights() {
  const { t } = useTranslation();
  return (
    <div className="labs-page" data-testid="labs-ai-insights-page">
      <MeineWeltActionBar active="ai" />

      <div style={{ marginBottom: 24 }}>
        <h1 className="labs-serif" style={{ fontSize: 28, fontWeight: 700, color: "var(--labs-text)", margin: "0 0 2px" }} data-testid="text-ai-insights-title">
          {t("myTastePage.aiInsightsHub.title", "AI Insights")}
        </h1>
        <p style={{ fontSize: 14, color: "var(--labs-text-muted)", margin: 0 }}>
          {t("myTastePage.aiInsightsHub.subtitle", "AI-powered reports & recommendations")}
        </p>
      </div>

      <HubTileGrid tiles={AI_INSIGHTS_HUB_TILES} t={t} />
    </div>
  );
}

import { useTranslation } from "react-i18next";
import MeineWeltActionBar from "@/labs/components/MeineWeltActionBar";
import { ANALYTICS_HUB_TILES, HubTileGrid } from "./hubTiles";

export default function LabsAnalyticsHub() {
  const { t } = useTranslation();
  return (
    <div className="labs-page" data-testid="labs-analytics-hub-page">
      <MeineWeltActionBar active="analytics" />

      <div style={{ marginBottom: 24 }}>
        <h1 className="labs-serif" style={{ fontSize: 28, fontWeight: 700, color: "var(--labs-text)", margin: "0 0 2px" }} data-testid="text-analytics-hub-title">
          {t("myTastePage.analyticsHub.title", "Profile & Analytics")}
        </h1>
        <p style={{ fontSize: 14, color: "var(--labs-text-muted)", margin: 0 }}>
          {t("myTastePage.analyticsHub.subtitle", "Stats, flavor wheel, comparisons & exports")}
        </p>
      </div>

      <HubTileGrid tiles={ANALYTICS_HUB_TILES} t={t} />
    </div>
  );
}

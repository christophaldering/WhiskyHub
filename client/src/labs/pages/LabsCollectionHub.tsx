import { useTranslation } from "react-i18next";
import MeineWeltActionBar from "@/labs/components/MeineWeltActionBar";
import { COLLECTION_HUB_TILES, HubTileGrid } from "./hubTiles";

export default function LabsCollectionHub() {
  const { t } = useTranslation();
  return (
    <div className="labs-page" data-testid="labs-collection-hub-page">
      <MeineWeltActionBar active="collection" />

      <div style={{ marginBottom: 24 }}>
        <h1 className="labs-h2" style={{ color: "var(--labs-text)", margin: "0 0 2px" }} data-testid="text-collection-hub-title">
          {t("myTastePage.collectionHub.title", "My Collection")}
        </h1>
        <p style={{ fontSize: 14, color: "var(--labs-text-muted)", margin: 0 }}>
          {t("myTastePage.collectionHub.subtitle", "Your drams, bottles & wishlist")}
        </p>
      </div>

      <HubTileGrid tiles={COLLECTION_HUB_TILES} t={t} variant="single-row" />
    </div>
  );
}

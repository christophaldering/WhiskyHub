import { useTranslation } from "react-i18next";
import BackLink from "@/labs/components/BackLink";
import { ChevronLeft } from "lucide-react";
import { COLLECTION_HUB_TILES, HubTileGrid } from "./hubTiles";

export default function LabsCollectionHub() {
  const { t } = useTranslation();
  return (
    <div className="labs-page" data-testid="labs-collection-hub-page">
      <BackLink href="/labs/taste" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-collection-hub">
          <ChevronLeft className="w-4 h-4" /> {t("myTastePage.title", "My World")}
        </button>
      </BackLink>

      <div style={{ marginBottom: 24 }}>
        <h1 className="labs-serif" style={{ fontSize: 28, fontWeight: 700, color: "var(--labs-text)", margin: "0 0 2px" }} data-testid="text-collection-hub-title">
          {t("myTastePage.collectionHub.title", "My Collection")}
        </h1>
        <p style={{ fontSize: 14, color: "var(--labs-text-muted)", margin: 0 }}>
          {t("myTastePage.collectionHub.subtitle", "Your drams, bottles & wishlist")}
        </p>
      </div>

      <HubTileGrid tiles={COLLECTION_HUB_TILES} t={t} />
    </div>
  );
}

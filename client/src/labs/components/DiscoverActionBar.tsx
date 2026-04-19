import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Wine, BookOpen } from "lucide-react";

type ActiveView = "whiskies" | "bibliothek";

export default function DiscoverActionBar({ active }: { active: ActiveView }) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  return (
    <div className="labs-fade-in" style={{ marginBottom: 20 }}>
      <div className="labs-action-bar">
        <button
          type="button"
          onClick={() => navigate("/labs/explore?tab=whiskies")}
          data-testid="tab-explore-whiskies"
          className={`labs-action-bar-item labs-action-bar-item--button${active === "whiskies" ? " labs-action-bar-item--active" : ""}`}
        >
          <div className="labs-action-bar-icon labs-action-bar-icon--accent">
            <Wine className="w-5 h-5 labs-icon-accent" />
          </div>
          <span className="labs-action-bar-label">{t("discover.whiskies", "Whiskies")}</span>
          <span className="labs-action-bar-sublabel">
            {t("explore.whiskiesExploreShort", "Explore whiskies")}
          </span>
        </button>
        <button
          type="button"
          onClick={() => navigate("/labs/explore?tab=bibliothek")}
          data-testid="tab-explore-bibliothek"
          className={`labs-action-bar-item labs-action-bar-item--button${active === "bibliothek" ? " labs-action-bar-item--active" : ""}`}
        >
          <div className="labs-action-bar-icon labs-action-bar-icon--surface">
            <BookOpen className="w-5 h-5 labs-icon-accent" />
          </div>
          <span className="labs-action-bar-label">{t("bibliothek.title", "Library")}</span>
          <span className="labs-action-bar-sublabel">
            {t("explore.libraryExploreDesc", "Knowledge, Reference & Deep Dive")}
          </span>
        </button>
      </div>
    </div>
  );
}

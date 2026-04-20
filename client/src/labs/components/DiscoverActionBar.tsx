import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Wine, BookOpen } from "lucide-react";
import HubHeader from "@/labs/components/HubHeader";
import { useIsEmbeddedInExplore } from "@/labs/embeddedExploreContext";

type ActiveView = "whiskies" | "bibliothek";

interface Props {
  active: ActiveView;
  onSelect?: (view: ActiveView) => void;
  showHubHeader?: boolean;
}

export default function DiscoverActionBar({ active, onSelect, showHubHeader = true }: Props) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const isEmbedded = useIsEmbeddedInExplore();
  if (isEmbedded) return null;

  const go = (view: ActiveView) => {
    if (onSelect) onSelect(view);
    else navigate(`/labs/explore?tab=${view}`);
  };

  return (
    <>
      {showHubHeader && <HubHeader kind="discover" />}
      <div className="labs-fade-in" style={{ marginBottom: 20 }}>
        <div className="labs-action-bar">
          <button
            type="button"
            onClick={() => go("whiskies")}
            data-testid="tab-explore-whiskies"
            className={`labs-action-bar-item labs-action-bar-item--button${active === "whiskies" ? " labs-action-bar-item--active" : ""}`}
          >
            <div className="labs-action-bar-icon labs-action-bar-icon--accent">
              <Wine className="w-5 h-5 labs-icon-accent" />
            </div>
            <span className="labs-action-bar-label">{t("discover.whiskies", "Whiskies")}</span>
            <span className="labs-action-bar-sublabel">
              {t("explore.whiskiesExploreDesc", "Browse the full catalog")}
            </span>
          </button>
          <button
            type="button"
            onClick={() => go("bibliothek")}
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
    </>
  );
}

import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Archive, Sparkles, BarChart3, GlassWater } from "lucide-react";
import HubHeader from "@/labs/components/HubHeader";

type ActiveView = "tastings" | "collection" | "ai" | "analytics";

interface Props {
  active: ActiveView;
  onSelect?: (view: ActiveView) => void;
  showHubHeader?: boolean;
}

export default function MeineWeltActionBar({ active, onSelect, showHubHeader = true }: Props) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const go = (view: ActiveView) => {
    if (onSelect) onSelect(view);
    else navigate(`/labs/taste?tab=${view}`);
  };

  return (
    <>
    {showHubHeader && <HubHeader kind="meine-welt" />}
    <div className="labs-fade-in" style={{ marginBottom: 20 }}>
      <div className="labs-action-bar labs-action-bar--meine-welt">
        <button
          type="button"
          onClick={() => go("tastings")}
          data-testid="tab-meine-welt-tastings"
          className={`labs-action-bar-item labs-action-bar-item--button${active === "tastings" ? " labs-action-bar-item--active" : ""}`}
        >
          <div className="labs-action-bar-icon labs-action-bar-icon--accent">
            <GlassWater className="w-5 h-5 labs-icon-accent" />
          </div>
          <span className="labs-action-bar-label">{t("myTastePage.tileMyTastings", "My Tastings")}</span>
          <span className="labs-action-bar-sublabel">{t("myTastePage.tileMyTastingsDesc", "Search & history")}</span>
        </button>
        <button
          type="button"
          onClick={() => go("collection")}
          data-testid="tab-meine-welt-collection"
          className={`labs-action-bar-item labs-action-bar-item--button${active === "collection" ? " labs-action-bar-item--active" : ""}`}
        >
          <div className="labs-action-bar-icon labs-action-bar-icon--accent">
            <Archive className="w-5 h-5 labs-icon-accent" />
          </div>
          <span className="labs-action-bar-label">{t("myTastePage.tileMyCollection", "Collection")}</span>
          <span className="labs-action-bar-sublabel">{t("myTastePage.tileMyCollectionDesc", "Drams")}</span>
        </button>
        <button
          type="button"
          onClick={() => go("ai")}
          data-testid="tab-meine-welt-ai"
          className={`labs-action-bar-item labs-action-bar-item--button${active === "ai" ? " labs-action-bar-item--active" : ""}`}
        >
          <div className="labs-action-bar-icon labs-action-bar-icon--accent">
            <Sparkles className="w-5 h-5 labs-icon-accent" />
          </div>
          <span className="labs-action-bar-label">{t("myTastePage.tileAiInsights", "AI Insights")}</span>
          <span className="labs-action-bar-sublabel">{t("myTastePage.tileAiInsightsDesc", "Tips")}</span>
        </button>
        <button
          type="button"
          onClick={() => go("analytics")}
          data-testid="tab-meine-welt-analytics"
          className={`labs-action-bar-item labs-action-bar-item--button${active === "analytics" ? " labs-action-bar-item--active" : ""}`}
        >
          <div className="labs-action-bar-icon labs-action-bar-icon--success">
            <BarChart3 className="w-5 h-5 labs-icon-success" />
          </div>
          <span className="labs-action-bar-label">{t("myTastePage.tileProfileAnalytics", "Analytics")}</span>
          <span className="labs-action-bar-sublabel">{t("myTastePage.tileProfileAnalyticsDesc", "Aromas")}</span>
        </button>
      </div>
    </div>
    </>
  );
}

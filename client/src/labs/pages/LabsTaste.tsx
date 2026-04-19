import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Archive, Activity, Sparkles, BarChart3, Compass, ChevronRight,
} from "lucide-react";
import type { ElementType } from "react";
import { useAppStore } from "@/lib/store";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import {
  AI_INSIGHTS_HUB_TILES,
  ANALYTICS_HUB_TILES,
  COLLECTION_HUB_TILES,
  HubTileCard,
  HubTileGrid,
} from "./hubTiles";

type Tab = "collection" | "palate" | "ai" | "analytics";

interface TabDef {
  key: Tab;
  icon: ElementType;
  iconVariant: "accent" | "surface" | "success";
  iconColorClass: string;
  labelKey: string;
  labelFallback: string;
  descKey: string;
  descFallback: string;
  href: string;
  testId: string;
}

const TABS: TabDef[] = [
  {
    key: "collection",
    icon: Archive,
    iconVariant: "accent",
    iconColorClass: "labs-icon-accent",
    labelKey: "myTastePage.tileMyCollection",
    labelFallback: "Collection",
    descKey: "myTastePage.tileMyCollectionDesc",
    descFallback: "Drams",
    href: "/labs/taste/collection-hub",
    testId: "tile-meine-welt-collection",
  },
  {
    key: "palate",
    icon: Activity,
    iconVariant: "surface",
    iconColorClass: "labs-icon-text-secondary",
    labelKey: "myTastePage.tileYourPalate",
    labelFallback: "Your Palate",
    descKey: "myTastePage.tileYourPalateDesc",
    descFallback: "Your flavor profile",
    href: "/labs/taste/profile",
    testId: "tile-meine-welt-your-palate",
  },
  {
    key: "ai",
    icon: Sparkles,
    iconVariant: "accent",
    iconColorClass: "labs-icon-accent",
    labelKey: "myTastePage.tileAiInsights",
    labelFallback: "AI Insights",
    descKey: "myTastePage.tileAiInsightsDesc",
    descFallback: "Tips",
    href: "/labs/taste/ai-insights",
    testId: "tile-meine-welt-ai-insights",
  },
  {
    key: "analytics",
    icon: BarChart3,
    iconVariant: "success",
    iconColorClass: "labs-icon-success",
    labelKey: "myTastePage.tileProfileAnalytics",
    labelFallback: "Analytics",
    descKey: "myTastePage.tileProfileAnalyticsDesc",
    descFallback: "Aromas",
    href: "/labs/taste/analytics-hub",
    testId: "tile-meine-welt-profile-analytics",
  },
];

const PALATE_TILE = {
  icon: Activity,
  labelKey: "myTastePage.tileYourPalate",
  labelFallback: "Your Palate",
  descKey: "myTastePage.tileYourPalateDesc",
  descFallback: "Your CaskSense flavor profile",
  href: "/labs/taste/profile",
  testId: "labs-link-meine-welt-palate-open",
};

function isTab(value: string | null): value is Tab {
  return value === "collection" || value === "palate" || value === "ai" || value === "analytics";
}

export default function LabsTaste() {
  const { currentParticipant } = useAppStore();
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const searchStr = useSearch();

  const initialTab = useMemo<Tab>(() => {
    try {
      const params = new URLSearchParams(searchStr);
      const v = params.get("tab");
      if (isTab(v)) return v;
    } catch {}
    return "collection";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  useEffect(() => {
    try {
      const params = new URLSearchParams(searchStr);
      const current = params.get("tab");
      if (current === activeTab) return;
      if (activeTab === "collection") {
        params.delete("tab");
      } else {
        params.set("tab", activeTab);
      }
      const qs = params.toString();
      navigate(`/labs/taste${qs ? `?${qs}` : ""}`, { replace: true });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  if (!currentParticipant) {
    return (
      <AuthGateMessage
        icon={<Compass className="w-12 h-12" style={{ color: "var(--labs-accent)" }} />}
        title={t("authGate.taste.title")}
        bullets={[t("authGate.taste.bullet1"), t("authGate.taste.bullet2"), t("authGate.taste.bullet3")]}
      />
    );
  }

  const renderTile = (tab: TabDef) => {
    const isActive = activeTab === tab.key;
    const Icon = tab.icon;
    return (
      <button
        key={tab.key}
        type="button"
        onClick={() => setActiveTab(tab.key)}
        className={`labs-action-bar-item labs-action-bar-item--button${isActive ? " labs-action-bar-item--active" : ""}`}
        data-testid={tab.testId}
      >
        <div className={`labs-action-bar-icon labs-action-bar-icon--${tab.iconVariant}`}>
          <Icon className={`w-5 h-5 ${tab.iconColorClass}`} />
        </div>
        <span className="labs-action-bar-label">{t(tab.labelKey, tab.labelFallback)}</span>
        <span className="labs-action-bar-sublabel">{t(tab.descKey, tab.descFallback)}</span>
      </button>
    );
  };

  const activeTab_ = TABS.find((tab) => tab.key === activeTab) ?? TABS[0];

  const renderInlineContent = () => {
    if (activeTab === "collection") {
      return (
        <div data-testid="meine-welt-inline-collection">
          <HubTileGrid tiles={COLLECTION_HUB_TILES} t={t} testIdPrefix="meine-welt" variant="auto" />
        </div>
      );
    }
    if (activeTab === "ai") {
      return (
        <div data-testid="meine-welt-inline-ai">
          <HubTileGrid tiles={AI_INSIGHTS_HUB_TILES} t={t} testIdPrefix="meine-welt" variant="auto" />
        </div>
      );
    }
    if (activeTab === "analytics") {
      return (
        <div data-testid="meine-welt-inline-analytics">
          <HubTileGrid tiles={ANALYTICS_HUB_TILES} t={t} testIdPrefix="meine-welt" variant="auto" />
        </div>
      );
    }
    return (
      <div className="labs-hub-tile-grid labs-hub-tile-grid--auto" data-testid="meine-welt-inline-palate">
        <HubTileCard tile={PALATE_TILE} t={t} />
      </div>
    );
  };

  return (
    <div className="labs-page labs-fade-in" data-testid="labs-taste-page">
      <div style={{ marginBottom: 20 }}>
        <h1 className="ty-h1" style={{ margin: 0 }} data-testid="labs-taste-title">
          {t("myTastePage.title", "My World")}
        </h1>
        <p className="ty-sub" style={{ margin: "2px 0 0" }}>
          {t("myTastePage.subtitle", "Your personal whisky collection & insights")}
        </p>
      </div>

      <div className="labs-fade-in" style={{ marginBottom: 20 }}>
        <div className="labs-action-bar">
          {TABS.map(renderTile)}
        </div>
      </div>

      <div className="labs-fade-in" data-testid={`meine-welt-content-${activeTab}`}>
        <div className="labs-meine-welt-section-head">
          <span className="labs-meine-welt-section-label">
            {t(activeTab_.labelKey, activeTab_.labelFallback)}
          </span>
          <Link
            href={activeTab_.href}
            className="labs-meine-welt-view-all"
            data-testid={`link-meine-welt-view-all-${activeTab}`}
          >
            {t("myTastePage.viewAll", "View all")}
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {renderInlineContent()}
      </div>
    </div>
  );
}

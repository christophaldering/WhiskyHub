import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Archive, Activity, Sparkles, BarChart3, Compass } from "lucide-react";
import type { ElementType } from "react";
import { useAppStore } from "@/lib/store";
import AuthGateMessage from "@/labs/components/AuthGateMessage";

interface HubLink {
  icon: ElementType;
  labelKey: string;
  labelFallback: string;
  descKey: string;
  descFallback: string;
  href: string;
  testId: string;
}

const TILES: HubLink[] = [
  {
    icon: Archive,
    labelKey: "myTastePage.tileMyCollection",
    labelFallback: "My Collection",
    descKey: "myTastePage.tileMyCollectionDesc",
    descFallback: "Drams, bottles & wishlist",
    href: "/labs/taste/collection-hub",
    testId: "tile-meine-welt-collection",
  },
  {
    icon: Activity,
    labelKey: "myTastePage.tileYourPalate",
    labelFallback: "Your Palate",
    descKey: "myTastePage.tileYourPalateDesc",
    descFallback: "Your CaskSense flavor profile",
    href: "/labs/taste/profile",
    testId: "tile-meine-welt-your-palate",
  },
  {
    icon: Sparkles,
    labelKey: "myTastePage.tileAiInsights",
    labelFallback: "AI Insights",
    descKey: "myTastePage.tileAiInsightsDesc",
    descFallback: "Connoisseur, DNA & recommendations",
    href: "/labs/taste/ai-insights",
    testId: "tile-meine-welt-ai-insights",
  },
  {
    icon: BarChart3,
    labelKey: "myTastePage.tileProfileAnalytics",
    labelFallback: "Profile & Analytics",
    descKey: "myTastePage.tileProfileAnalyticsDesc",
    descFallback: "Analytics, flavor wheel & exports",
    href: "/labs/taste/analytics-hub",
    testId: "tile-meine-welt-profile-analytics",
  },
];

function HubTile({ link, t }: { link: HubLink; t: (key: string, fallback: string) => string }) {
  return (
    <Link href={link.href} className="labs-action-bar-item" data-testid={link.testId}>
      <div className="labs-action-bar-icon labs-action-bar-icon--accent">
        <link.icon className="w-5 h-5 labs-icon-accent" />
      </div>
      <span className="labs-action-bar-label">{t(link.labelKey, link.labelFallback)}</span>
      <span className="labs-action-bar-sublabel">{t(link.descKey, link.descFallback)}</span>
    </Link>
  );
}

export default function LabsTaste() {
  const { currentParticipant } = useAppStore();
  const { t } = useTranslation();

  if (!currentParticipant) {
    return (
      <AuthGateMessage
        icon={<Compass className="w-12 h-12" style={{ color: "var(--labs-accent)" }} />}
        title={t("authGate.taste.title")}
        bullets={[t("authGate.taste.bullet1"), t("authGate.taste.bullet2"), t("authGate.taste.bullet3")]}
      />
    );
  }

  return (
    <div className="labs-page" data-testid="labs-taste-page">
      <h1 className="labs-h2 mb-1 labs-fade-in" style={{ color: "var(--labs-text)" }} data-testid="labs-taste-title">
        {t("myTastePage.title", "My World")}
      </h1>
      <p className="text-sm mb-6 labs-fade-in labs-stagger-1" style={{ color: "var(--labs-text-muted)" }}>
        {t("myTastePage.subtitle", "Your personal whisky collection & insights")}
      </p>

      <div className="labs-action-bar labs-fade-in labs-stagger-1">
        {TILES.map((link) => (
          <HubTile key={link.testId} link={link} t={t} />
        ))}
      </div>
    </div>
  );
}

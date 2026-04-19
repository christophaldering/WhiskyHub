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
    <Link href={link.href} style={{ textDecoration: "none" }}>
      <div
        className="labs-card labs-card-interactive"
        data-testid={link.testId}
        style={{
          minHeight: 110,
          padding: "18px 18px",
          display: "flex",
          alignItems: "flex-start",
          gap: 14,
          cursor: "pointer",
          height: "100%",
        }}
      >
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--labs-surface-elevated)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <link.icon style={{ width: 22, height: 22, color: "var(--labs-accent)" }} strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="labs-serif" style={{ fontSize: 17, fontWeight: 600, color: "var(--labs-text)", lineHeight: 1.2 }}>
            {t(link.labelKey, link.labelFallback)}
          </div>
          <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginTop: 4, lineHeight: 1.4 }}>
            {t(link.descKey, link.descFallback)}
          </div>
        </div>
      </div>
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

      <div className="labs-fade-in labs-stagger-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {TILES.map((link) => (
          <HubTile key={link.testId} link={link} t={t} />
        ))}
      </div>
    </div>
  );
}

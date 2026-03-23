import { Link } from "wouter";
import { useBackNavigation } from "@/labs/hooks/useBackNavigation";
import { useTranslation } from "react-i18next";
import {
  BookOpen, Building2, Package, FileText, Map,
  BookMarked, MessageSquare, ChevronRight, ChevronLeft,
  Sparkles, Info, Heart, BarChart3,
} from "lucide-react";
import type { ElementType } from "react";

interface DiscoverLink {
  icon: ElementType;
  labelKey: string;
  labelFallback: string;
  descKey: string;
  descFallback: string;
  href: string;
  testId: string;
}

interface DiscoverSection {
  titleKey: string;
  titleFallback: string;
  links: DiscoverLink[];
}

const SECTIONS: DiscoverSection[] = [
  {
    titleKey: "discover.sectionKnowledge",
    titleFallback: "Knowledge & Reference",
    links: [
      { icon: BookOpen, labelKey: "discover.lexicon", labelFallback: "Lexicon", descKey: "discover.lexiconDesc", descFallback: "Searchable whisky dictionary", href: "/labs/discover/lexicon", testId: "labs-link-discover-lexicon" },
      { icon: Building2, labelKey: "discover.distilleries", labelFallback: "Distilleries", descKey: "discover.distilleriesDesc", descFallback: "Distillery encyclopedia & map", href: "/labs/discover/distilleries", testId: "labs-link-discover-distilleries" },
      { icon: Package, labelKey: "discover.bottlers", labelFallback: "Bottlers", descKey: "discover.bottlersDesc", descFallback: "Independent bottlers database", href: "/labs/discover/bottlers", testId: "labs-link-discover-bottlers" },
      { icon: MessageSquare, labelKey: "discover.vocabulary", labelFallback: "Flavour Map", descKey: "discover.vocabularyDesc", descFallback: "Interactive tasting visualisation", href: "/labs/discover/flavour-map", testId: "labs-link-discover-flavour-map" },
    ],
  },
  {
    titleKey: "discover.sectionTasting",
    titleFallback: "Tasting & Guides",
    links: [
      { icon: Map, labelKey: "discover.guide", labelFallback: "Tasting Guide", descKey: "discover.guideDesc", descFallback: "Step-by-step tasting guide", href: "/labs/discover/guide", testId: "labs-link-discover-guide" },
      { icon: FileText, labelKey: "discover.templates", labelFallback: "Templates", descKey: "discover.templatesDesc", descFallback: "Tasting vocabulary templates", href: "/labs/discover/templates", testId: "labs-link-discover-templates" },
      { icon: Sparkles, labelKey: "discover.aiCuration", labelFallback: "AI Curation", descKey: "discover.aiCurationDesc", descFallback: "AI whisky recommendations for lineups", href: "/labs/taste/ai-curation", testId: "labs-link-discover-ai-curation" },
    ],
  },
  {
    titleKey: "discover.sectionDeepDive",
    titleFallback: "Deep Dives",
    links: [
      { icon: BookMarked, labelKey: "discover.rabbitHole", labelFallback: "Rabbit Hole", descKey: "discover.rabbitHoleDesc", descFallback: "Rating models, statistics & deep dives", href: "/labs/discover/rabbit-hole", testId: "labs-link-discover-rabbit-hole" },
      { icon: BarChart3, labelKey: "discover.insights", labelFallback: "Historical Insights", descKey: "discover.insightsDesc", descFallback: "Cross-tasting analytics & trends", href: "/labs/host/history/insights", testId: "labs-link-discover-historical-insights" },
    ],
  },
  {
    titleKey: "discover.sectionMore",
    titleFallback: "More",
    links: [
      { icon: Info, labelKey: "discover.about", labelFallback: "About", descKey: "discover.aboutDesc", descFallback: "Story, founder info & contact", href: "/labs/about", testId: "labs-link-discover-about" },
      { icon: Heart, labelKey: "discover.donate", labelFallback: "Donate", descKey: "discover.donateDesc", descFallback: "Support CaskSense & Hospice", href: "/labs/donate", testId: "labs-link-discover-donate" },
    ],
  },
];

function LinkRow({ link, t }: { link: DiscoverLink; t: (key: string, fallback: string) => string }) {
  return (
    <Link href={link.href} style={{ textDecoration: "none" }}>
      <div className="labs-list-row" data-testid={link.testId}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--labs-surface-elevated)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <link.icon style={{ width: 18, height: 18, color: "var(--labs-accent)" }} strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)" }}>
            {t(link.labelKey, link.labelFallback)}
          </div>
          <div style={{ fontSize: 13, color: "var(--labs-text-muted)", marginTop: 1 }}>
            {t(link.descKey, link.descFallback)}
          </div>
        </div>
        <ChevronRight style={{ width: 16, height: 16, color: "var(--labs-text-muted)", opacity: 0.75, flexShrink: 0 }} />
      </div>
    </Link>
  );
}

export default function LabsDiscover() {
  const goBackToEntdecken = useBackNavigation("/labs/entdecken");
  const { t } = useTranslation();
  return (
    <div className="px-5 py-6 max-w-2xl mx-auto" data-testid="labs-discover-page">
      <button onClick={goBackToEntdecken} className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4" style={{ color: "var(--labs-text-muted)" }} data-testid="button-back-discover">
        <ChevronLeft className="w-4 h-4" /> Entdecken
      </button>

      <div style={{ marginBottom: 24 }}>
        <h1 className="labs-serif" style={{ fontSize: 28, fontWeight: 700, color: "var(--labs-text)", margin: "0 0 2px" }} data-testid="text-discover-title">
          {t("discover.title", "Discover")}
        </h1>
        <p style={{ fontSize: 14, color: "var(--labs-text-muted)", margin: 0 }}>
          {t("discover.subtitle", "Knowledge, guides & research — all in one place.")}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {SECTIONS.map((section) => (
          <div key={section.titleKey}>
            <div className="labs-section-label" style={{ fontSize: 11, letterSpacing: "0.08em", color: "var(--labs-text-muted)", marginBottom: 8, paddingLeft: 4 }}>
              {t(section.titleKey, section.titleFallback)}
            </div>
            <div className="labs-grouped-list">
              {section.links.map((link) => (
                <LinkRow key={link.testId} link={link} t={t} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

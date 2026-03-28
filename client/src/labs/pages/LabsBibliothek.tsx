import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import BackLink from "@/labs/components/BackLink";
import {
  BookOpen, Building2, Package, FileText, Map,
  BookMarked, MessageSquare, ChevronRight, ChevronLeft,
  Archive, BarChart3, FlaskConical, SlidersHorizontal,
} from "lucide-react";
import type { ElementType } from "react";

interface BibliothekLink {
  icon: ElementType;
  labelKey: string;
  labelFallback: string;
  descKey: string;
  descFallback: string;
  href: string;
  testId: string;
  indent?: boolean;
}

interface BibliothekSection {
  titleKey: string;
  titleFallback: string;
  links: BibliothekLink[];
}

const SECTIONS: BibliothekSection[] = [
  {
    titleKey: "bibliothek.sectionCommunity",
    titleFallback: "Community",
    links: [
      { icon: BarChart3, labelKey: "bibliothek.communityInsights", labelFallback: "Community Insights", descKey: "bibliothek.communityInsightsDesc", descFallback: "Trends, top whiskies & regions", href: "/labs/bibliothek/insights", testId: "labs-link-bibliothek-insights" },
      { icon: Archive, labelKey: "bibliothek.archive", labelFallback: "Archive", descKey: "bibliothek.archiveDesc", descFallback: "Historical tastings & analytics", href: "/labs/history", testId: "labs-link-bibliothek-archive" },
    ],
  },
  {
    titleKey: "bibliothek.sectionReference",
    titleFallback: "Reference",
    links: [
      { icon: BookOpen, labelKey: "discover.lexicon", labelFallback: "Lexicon", descKey: "discover.lexiconDesc", descFallback: "Searchable whisky dictionary", href: "/labs/discover/lexicon", testId: "labs-link-bibliothek-lexicon" },
      { icon: MessageSquare, labelKey: "discover.vocabulary", labelFallback: "Flavour Map", descKey: "discover.vocabularyDesc", descFallback: "Interactive tasting visualisation", href: "/labs/discover/flavour-map", testId: "labs-link-bibliothek-flavour-map", indent: true },
      { icon: SlidersHorizontal, labelKey: "bibliothek.background", labelFallback: "Whisky Production", descKey: "bibliothek.backgroundDesc", descFallback: "Background & knowledge", href: "/labs/discover/background", testId: "labs-link-bibliothek-background", indent: true },
      { icon: Building2, labelKey: "discover.distilleries", labelFallback: "Distilleries", descKey: "discover.distilleriesDesc", descFallback: "Distillery encyclopedia & map", href: "/labs/discover/distilleries", testId: "labs-link-bibliothek-distilleries" },
      { icon: Package, labelKey: "discover.bottlers", labelFallback: "Bottlers", descKey: "discover.bottlersDesc", descFallback: "Independent bottlers database", href: "/labs/discover/bottlers", testId: "labs-link-bibliothek-bottlers" },
    ],
  },
  {
    titleKey: "bibliothek.sectionTastingHelp",
    titleFallback: "Tasting Help",
    links: [
      { icon: Map, labelKey: "discover.guide", labelFallback: "Tasting Guide", descKey: "discover.guideDesc", descFallback: "Step-by-step tasting guide", href: "/labs/discover/guide", testId: "labs-link-bibliothek-guide" },
      { icon: FileText, labelKey: "discover.templates", labelFallback: "Templates", descKey: "discover.templatesDesc", descFallback: "Tasting vocabulary templates", href: "/labs/discover/templates", testId: "labs-link-bibliothek-templates" },
      { icon: FlaskConical, labelKey: "bibliothek.method", labelFallback: "CaskSense Method", descKey: "bibliothek.methodDesc", descFallback: "Scoring system explained", href: "/labs/discover/method", testId: "labs-link-bibliothek-method" },
    ],
  },
  {
    titleKey: "bibliothek.sectionDeepDive",
    titleFallback: "Deep Dives",
    links: [
      { icon: BookMarked, labelKey: "discover.rabbitHole", labelFallback: "Rabbit Hole", descKey: "discover.rabbitHoleDesc", descFallback: "Rating models, statistics & deep dives", href: "/labs/discover/rabbit-hole", testId: "labs-link-bibliothek-rabbit-hole" },
      { icon: BookOpen, labelKey: "discover.research", labelFallback: "Research", descKey: "discover.researchDesc", descFallback: "Science of perception & bibliography", href: "/labs/discover/research", testId: "labs-link-bibliothek-research", indent: true },
    ],
  },
];

function LinkRow({ link, t }: { link: BibliothekLink; t: (key: string, fallback: string) => string }) {
  return (
    <Link href={link.href} style={{ textDecoration: "none" }}>
      <div className="labs-list-row" data-testid={link.testId} style={link.indent ? { paddingLeft: 30 } : undefined}>
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

export default function LabsBibliothek() {
  const { t } = useTranslation();
  return (
    <div className="labs-page" data-testid="labs-bibliothek-page">
      <BackLink href="/labs/explore" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-bibliothek">
          <ChevronLeft className="w-4 h-4" /> {t("discoverHub.title", "Explore")}
        </button>
      </BackLink>

      <div style={{ marginBottom: 24 }}>
        <h1 className="labs-serif" style={{ fontSize: 28, fontWeight: 700, color: "var(--labs-text)", margin: "0 0 2px" }} data-testid="text-bibliothek-title">
          {t("bibliothek.title", "Library")}
        </h1>
        <p style={{ fontSize: 14, color: "var(--labs-text-muted)", margin: 0 }}>
          {t("bibliothek.subtitle", "Knowledge, guides & reference")}
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

import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import DiscoverActionBar from "@/labs/components/DiscoverActionBar";
import {
  BookOpen, Building2, Package, Map,
  Archive, SlidersHorizontal,
  Utensils, Brain, Factory,
  Microscope, Globe,
} from "lucide-react";
import type { ElementType } from "react";

export interface BibliothekLink {
  icon: ElementType;
  labelKey: string;
  labelFallback: string;
  descKey: string;
  descFallback: string;
  href: string;
  testId: string;
  indent?: boolean;
}

export interface BibliothekSection {
  titleKey: string;
  titleFallback: string;
  links: BibliothekLink[];
}

export const SECTIONS: BibliothekSection[] = [
  {
    titleKey: "bibliothek.sectionCommunity",
    titleFallback: "Community",
    links: [
      { icon: Archive, labelKey: "bibliothek.archive", labelFallback: "Community Archive", descKey: "bibliothek.archiveDesc", descFallback: "Historical tastings & analytics", href: "/labs/history", testId: "labs-link-bibliothek-archive" },
      { icon: Globe, labelKey: "bibliothek.communityHandouts", labelFallback: "Community Handouts", descKey: "bibliothek.communityHandoutsDesc", descFallback: "Handouts shared by other hosts — adopt with one click", href: "/labs/host/handout-library?tab=community", testId: "labs-link-bibliothek-community-handouts" },
    ],
  },
  {
    titleKey: "bibliothek.sectionReference",
    titleFallback: "Reference",
    links: [
      { icon: BookOpen, labelKey: "discover.lexicon", labelFallback: "Lexicon", descKey: "bibliothek.lexiconDescNav", descFallback: "Dictionary, templates & flavour map", href: "/labs/discover/lexicon", testId: "labs-link-bibliothek-lexicon" },
      { icon: Building2, labelKey: "discover.distilleries", labelFallback: "Distilleries", descKey: "discover.distilleriesDesc", descFallback: "Distillery encyclopedia & map", href: "/labs/discover/distilleries", testId: "labs-link-bibliothek-distilleries" },
      { icon: Package, labelKey: "discover.bottlers", labelFallback: "Bottlers", descKey: "discover.bottlersDesc", descFallback: "Independent bottlers database", href: "/labs/discover/bottlers", testId: "labs-link-bibliothek-bottlers" },
    ],
  },
  {
    titleKey: "bibliothek.sectionTastingWissen",
    titleFallback: "Tasting Knowledge",
    links: [
      { icon: Factory, labelKey: "bibliothek.whiskyProduction", labelFallback: "Background & Methodology", descKey: "bibliothek.whiskyProductionDesc", descFallback: "Tasting, profile calculation, dimensions & statistical engine", href: "/labs/discover/background", testId: "labs-link-bibliothek-production" },
      { icon: Map, labelKey: "discover.guide", labelFallback: "Tasting Guide", descKey: "discover.guideDesc", descFallback: "Step-by-step tasting guide", href: "/labs/discover/guide", testId: "labs-link-bibliothek-guide" },
      { icon: SlidersHorizontal, labelKey: "bibliothek.howProfileCalculated", labelFallback: "How a Profile Is Calculated", descKey: "bibliothek.howProfileCalculatedDesc", descFallback: "Scoring, profiles & dimensions", href: "/labs/discover/method", testId: "labs-link-bibliothek-profile-calc" },
      { icon: Microscope, labelKey: "bibliothek.researchSensory", labelFallback: "Research & Sensory", descKey: "bibliothek.researchSensoryDesc", descFallback: "Concepts, studies & sensory science", href: "/labs/discover/research", testId: "labs-link-bibliothek-research-sensory" },
    ],
  },
  {
    titleKey: "bibliothek.sectionPairings",
    titleFallback: "Pairings",
    links: [
      { icon: Utensils, labelKey: "bibliothek.pairings", labelFallback: "Whisky & Food Pairings", descKey: "bibliothek.pairingsDesc", descFallback: "Combine whisky with food", href: "/labs/taste/pairings?from=bibliothek", testId: "labs-link-bibliothek-pairings" },
    ],
  },
  {
    titleKey: "bibliothek.sectionBenchmark",
    titleFallback: "Benchmark",
    links: [
      { icon: Brain, labelKey: "bibliothek.benchmark", labelFallback: "Benchmark", descKey: "bibliothek.benchmarkDesc", descFallback: "External tasting data & comparison", href: "/labs/taste/benchmark?from=bibliothek", testId: "labs-link-bibliothek-benchmark" },
    ],
  },
  {
    titleKey: "bibliothek.sectionRabbitHole",
    titleFallback: "Rabbit Hole",
    links: [
      { icon: Archive, labelKey: "rabbitHole.themenspeicherTitle", labelFallback: "Topic Vault", descKey: "rabbitHole.themenspeicherDesc", descFallback: "Open questions and ideas worth exploring later.", href: "/labs/discover/rabbit-hole/themenspeicher", testId: "labs-link-bibliothek-themenspeicher" },
    ],
  },
];

export function BibliothekTile({ link, t }: { link: BibliothekLink; t: (key: string, fallback: string) => string }) {
  return <Tile link={link} t={t} />;
}

function Tile({ link, t }: { link: BibliothekLink; t: (key: string, fallback: string) => string }) {
  return (
    <Link href={link.href} style={{ textDecoration: "none" }}>
      <div
        className="labs-card"
        data-testid={link.testId}
        style={{
          minHeight: 92,
          padding: "14px 16px",
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          cursor: "pointer",
          height: "100%",
        }}
      >
        <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--labs-surface-elevated)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <link.icon style={{ width: 18, height: 18, color: "var(--labs-accent)" }} strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)", lineHeight: 1.25 }}>
            {t(link.labelKey, link.labelFallback)}
          </div>
          <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginTop: 3, lineHeight: 1.35 }}>
            {t(link.descKey, link.descFallback)}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function LabsBibliothek() {
  const { t } = useTranslation();
  return (
    <div className="labs-page" data-testid="labs-bibliothek-page">
      <DiscoverActionBar active="bibliothek" />

      <div style={{ marginBottom: 24 }}>
        <h1 className="labs-h2" style={{ color: "var(--labs-text)", margin: "0 0 2px" }} data-testid="text-bibliothek-title">
          {t("bibliothek.title", "Library")}
        </h1>
        <p style={{ fontSize: 14, color: "var(--labs-text-muted)", margin: 0 }}>
          {t("bibliothek.subtitle", "Knowledge, guides & reference")}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {SECTIONS.map((section) => (
          <div key={section.titleKey}>
            <div className="labs-section-label" style={{ fontSize: 11, letterSpacing: "0.08em", color: "var(--labs-text-muted)", marginBottom: 8, paddingLeft: 4, textTransform: "uppercase" }}>
              {t(section.titleKey, section.titleFallback)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {section.links.map((link) => (
                <Tile key={link.testId} link={link} t={t} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { FlaskConical, ChevronLeft, BookOpen, GraduationCap, TrendingUp, BookMarked, Lightbulb } from "lucide-react";
import type { ElementType } from "react";
import BackLink from "@/labs/components/BackLink";

interface HubLink {
  icon: ElementType;
  labelKey: string;
  labelFallback: string;
  descKey: string;
  descFallback: string;
  href: string;
  testId: string;
}

const HUB_LINKS: HubLink[] = [
  { icon: BookOpen, labelKey: "research.subGrundlagen", labelFallback: "Foundations", descKey: "research.subGrundlagenDesc", descFallback: "Measuring, testing, perceiving, observing, judging, evaluating, predicting", href: "/labs/discover/research/grundlagen", testId: "labs-link-research-grundlagen" },
  { icon: GraduationCap, labelKey: "research.subTesttheorie", labelFallback: "Test Theory & Psychometrics", descKey: "research.subTesttheorieDesc", descFallback: "Quality criteria, scale levels, measurement error, normalisation", href: "/labs/discover/research/testtheorie", testId: "labs-link-research-testtheorie" },
  { icon: TrendingUp, labelKey: "research.subStatistischeMethoden", labelFallback: "Statistical Methods", descKey: "research.subStatistischeMethodenDesc", descFallback: "Correlation, Kendall's W, factor analysis, cluster analysis", href: "/labs/discover/research/statistische-methoden", testId: "labs-link-research-statistische-methoden" },
  { icon: BookMarked, labelKey: "research.subLiteratur", labelFallback: "Literature & Studies", descKey: "research.subLiteraturDesc", descFallback: "Personality, perception & bias, methods, measurement", href: "/labs/discover/research/literatur", testId: "labs-link-research-literatur" },
  { icon: Lightbulb, labelKey: "research.subHintergrund", labelFallback: "Background", descKey: "research.subHintergrundDesc", descFallback: "The CaskSense idea — where curiosity meets perception", href: "/labs/discover/research/hintergrund", testId: "labs-link-research-hintergrund" },
];

export default function LabsResearch() {
  const { t } = useTranslation();
  return (
    <div className="labs-page" data-testid="labs-discover-research-page">
      <BackLink href="/labs/bibliothek" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-research">
          <ChevronLeft className="w-4 h-4" /> {t("bibliothek.title", "Library")}
        </button>
      </BackLink>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <FlaskConical style={{ width: 22, height: 22, color: "var(--labs-accent)" }} />
          <h1 className="labs-serif" style={{ fontSize: 22, fontWeight: 700, color: "var(--labs-text)", margin: 0 }} data-testid="text-research-title">
            {t("research.title", "Research & Sensory Science")}
          </h1>
        </div>
        <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: 0, lineHeight: 1.5 }} data-testid="text-research-hub-intro">
          {t("research.hubIntro", "Concepts, statistics and studies behind sensory measurement — the scientific depth of CaskSense in one place.")}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {HUB_LINKS.map((link) => (
          <Link key={link.testId} href={link.href} style={{ textDecoration: "none" }}>
            <div
              className="labs-card"
              data-testid={link.testId}
              style={{ minHeight: 92, padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", height: "100%" }}
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
        ))}
      </div>
    </div>
  );
}

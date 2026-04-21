import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlaskConical, BookOpen, GraduationCap, TrendingUp, BookMarked } from "lucide-react";
import type { ComponentType, ElementType } from "react";
import DiscoverActionBar from "@/labs/components/DiscoverActionBar";
import { HubTileGrid, HubTileCollapsible, type HubTileDef } from "@/labs/pages/hubTiles";
import { EmbeddedExploreProvider } from "@/labs/embeddedExploreContext";
import LabsIdeaBehindNumbers from "@/labs/pages/LabsIdeaBehindNumbers";
import LabsTestTheory from "@/labs/pages/LabsTestTheory";
import LabsStatisticalMethods from "@/labs/pages/LabsStatisticalMethods";
import LabsLiterature from "@/labs/pages/LabsLiterature";

type SubKey = "grundlagen" | "testtheorie" | "statistische-methoden" | "literatur";

interface ResearchSub {
  key: SubKey;
  icon: ElementType;
  labelKey: string;
  labelFallback: string;
  descKey: string;
  descFallback: string;
  testId: string;
  Component: ComponentType;
}

const RESEARCH_SUBS: ResearchSub[] = [
  { key: "grundlagen", icon: BookOpen, labelKey: "research.subGrundlagen", labelFallback: "Foundations", descKey: "research.subGrundlagenDesc", descFallback: "Measuring, testing, perceiving, observing, judging, evaluating, predicting", testId: "tile-research-grundlagen", Component: LabsIdeaBehindNumbers },
  { key: "testtheorie", icon: GraduationCap, labelKey: "research.subTesttheorie", labelFallback: "Test Theory & Psychometrics", descKey: "research.subTesttheorieDesc", descFallback: "Quality criteria, scale levels, measurement error, normalisation", testId: "tile-research-testtheorie", Component: LabsTestTheory },
  { key: "statistische-methoden", icon: TrendingUp, labelKey: "research.subStatistischeMethoden", labelFallback: "Statistical Methods", descKey: "research.subStatistischeMethodenDesc", descFallback: "Correlation, Kendall's W, factor analysis, cluster analysis", testId: "tile-research-statistische-methoden", Component: LabsStatisticalMethods },
  { key: "literatur", icon: BookMarked, labelKey: "research.subLiteratur", labelFallback: "Literature & Studies", descKey: "research.subLiteraturDesc", descFallback: "Personality, perception & bias, methods, measurement", testId: "tile-research-literatur", Component: LabsLiterature },
];

export default function LabsResearch() {
  const { t } = useTranslation();
  const [activeSub, setActiveSub] = useState<SubKey | null>(null);

  const tiles: HubTileDef[] = RESEARCH_SUBS.map((s) => ({
    icon: s.icon,
    labelKey: s.labelKey,
    labelFallback: s.labelFallback,
    descKey: s.descKey,
    descFallback: s.descFallback,
    testId: s.testId,
    role: "nav",
  }));

  const active = activeSub ? RESEARCH_SUBS.find((s) => s.key === activeSub) ?? null : null;
  const ActiveComponent = active?.Component ?? null;
  const activeTestId = active ? active.testId : undefined;

  return (
    <div className="labs-page" data-testid="labs-discover-research-page">
      <DiscoverActionBar active="bibliothek" />

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <FlaskConical style={{ width: 22, height: 22, color: "var(--labs-accent)" }} />
          <h1 className="labs-h2" style={{ color: "var(--labs-text)", margin: 0 }} data-testid="text-research-title">
            {t("research.title", "Research & Sensory Science")}
          </h1>
        </div>
        <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: 0, lineHeight: 1.5 }} data-testid="text-research-hub-intro">
          {t("research.hubIntro", "Concepts, statistics and studies behind sensory measurement — the scientific depth of CaskSense in one place.")}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <HubTileGrid
          tiles={tiles}
          t={t}
          variant="four-row"
          role="nav"
          activeTestId={activeTestId}
          onTileClick={(tile) => {
            const sub = RESEARCH_SUBS.find((s) => s.testId === tile.testId);
            if (!sub) return;
            setActiveSub((curr) => (curr === sub.key ? null : sub.key));
          }}
        />

        <HubTileCollapsible
          open={active !== null}
          testId={active ? `research-inline-${active.key}` : undefined}
        >
          {ActiveComponent && active && (
            <div data-testid={`research-inline-content-${active.key}`}>
              <EmbeddedExploreProvider>
                <ActiveComponent />
              </EmbeddedExploreProvider>
            </div>
          )}
        </HubTileCollapsible>
      </div>
    </div>
  );
}

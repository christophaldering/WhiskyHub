import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { TrendingUp, ChevronLeft, ChevronDown, ChevronUp, Wine } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BackLink from "@/labs/components/BackLink";
import DiscoverActionBar from "@/labs/components/DiscoverActionBar";
import { useIsEmbeddedInExplore } from "@/labs/embeddedExploreContext";

import conceptNormalization from "@/assets/images/concept-normalization.png";
import conceptCorrelation from "@/assets/images/concept-correlation.png";
import conceptKendall from "@/assets/images/concept-kendall.png";
import conceptFactorAnalysis from "@/assets/images/concept-factor-analysis.png";
import conceptClusterAnalysis from "@/assets/images/concept-cluster-analysis.png";

const imageMap: Record<string, string> = {
  "concept-normalization": conceptNormalization,
  "concept-correlation": conceptCorrelation,
  "concept-kendall": conceptKendall,
  "concept-factor-analysis": conceptFactorAnalysis,
  "concept-cluster-analysis": conceptClusterAnalysis,
};

type Concept = {
  id: string;
  section: string;
  term: string;
  metaphor: string;
  explanation: string;
  whiskyLink: string;
  image: string;
};

function ConceptCard({ concept, index }: { concept: Concept; index: number }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const imageSrc = imageMap[concept.image] || "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="overflow-hidden" data-testid={`concept-card-${concept.id}`}>
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            {imageSrc && (
              <div className="md:w-48 md:min-h-full shrink-0">
                <img
                  src={imageSrc}
                  alt={concept.term}
                  className="w-full h-40 md:h-full object-cover"
                  data-testid={`concept-image-${concept.id}`}
                />
              </div>
            )}
            <div className="flex-1 p-5 md:p-6">
              <h3 className="font-serif font-bold text-base md:text-lg text-primary mb-2" data-testid={`concept-title-${concept.id}`}>
                {concept.term}
              </h3>
              <p className="text-sm text-primary/80 italic leading-relaxed mb-3" data-testid={`concept-metaphor-${concept.id}`}>
                {concept.metaphor}
              </p>
              <p className={`text-sm text-muted-foreground leading-relaxed ${expanded ? '' : 'line-clamp-3'}`} data-testid={`concept-explanation-${concept.id}`}>
                {concept.explanation}
              </p>

              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/10"
                  data-testid={`concept-whisky-${concept.id}`}
                >
                  <div className="flex items-start gap-2">
                    <Wine className="w-4 h-4 text-primary/60 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-primary/70 uppercase tracking-wider mb-1">
                        {t("research.whiskyConnectionLabel")}
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {concept.whiskyLink}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="mt-3 text-xs text-primary/70 hover:text-primary gap-1 px-2 h-7"
                data-testid={`concept-toggle-${concept.id}`}
              >
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {expanded ? t("research.conceptLess") : t("research.conceptMore")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function LabsStatisticalMethods() {
  const { t } = useTranslation();
  const embedded = useIsEmbeddedInExplore();

  const concepts = t("research.concepts", { returnObjects: true }) as Concept[];
  const statisticsConcepts = concepts.filter((c) => c.section === "statistics");

  return (
    <div className="labs-page labs-fade-in" data-testid="labs-statistical-methods-page">
      {!embedded && <DiscoverActionBar active="bibliothek" />}
      {!embedded && (
        <BackLink href="/labs/discover/research" style={{ textDecoration: "none" }}>
          <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-statistical-methods">
            <ChevronLeft className="w-4 h-4" /> {t("research.title", "Research")}
          </button>
        </BackLink>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <TrendingUp style={{ width: 22, height: 22, color: "var(--labs-accent)" }} />
        <h1 className="labs-h2" style={{ color: "var(--labs-text)", margin: 0 }} data-testid="text-statistical-methods-title">
          {t("research.subStatistischeMethoden", "Statistical Methods")}
        </h1>
      </div>
      <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: "0 0 24px", lineHeight: 1.5 }}>
        {t("research.subStatistischeMethodenDesc", "Correlation, Kendall's W, factor analysis, cluster analysis")}
      </p>

      <div className="space-y-4">
        {statisticsConcepts.map((concept, i) => (
          <ConceptCard key={concept.id} concept={concept} index={i} />
        ))}
      </div>
    </div>
  );
}

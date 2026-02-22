import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { BookOpen, ExternalLink, FlaskConical, Brain, BarChart3, Users, Wine, Microscope, Scale, ChevronDown, ChevronUp, GraduationCap, TrendingUp, Layers } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import conceptMeasuring from "@/assets/images/concept-measuring.png";
import conceptTesting from "@/assets/images/concept-testing.png";
import conceptPerceiving from "@/assets/images/concept-perceiving.png";
import conceptObserving from "@/assets/images/concept-observing.png";
import conceptJudging from "@/assets/images/concept-judging.png";
import conceptEvaluating from "@/assets/images/concept-evaluating.png";
import conceptPredicting from "@/assets/images/concept-predicting.png";
import conceptQualityCriteria from "@/assets/images/concept-quality-criteria.png";
import conceptScaleLevels from "@/assets/images/concept-scale-levels.png";
import conceptMeasurementError from "@/assets/images/concept-measurement-error.png";
import conceptNormalization from "@/assets/images/concept-normalization.png";
import conceptCorrelation from "@/assets/images/concept-correlation.png";
import conceptKendall from "@/assets/images/concept-kendall.png";
import conceptFactorAnalysis from "@/assets/images/concept-factor-analysis.png";
import conceptClusterAnalysis from "@/assets/images/concept-cluster-analysis.png";

const imageMap: Record<string, string> = {
  "concept-measuring": conceptMeasuring,
  "concept-testing": conceptTesting,
  "concept-perceiving": conceptPerceiving,
  "concept-observing": conceptObserving,
  "concept-judging": conceptJudging,
  "concept-evaluating": conceptEvaluating,
  "concept-predicting": conceptPredicting,
  "concept-quality-criteria": conceptQualityCriteria,
  "concept-scale-levels": conceptScaleLevels,
  "concept-measurement-error": conceptMeasurementError,
  "concept-normalization": conceptNormalization,
  "concept-correlation": conceptCorrelation,
  "concept-kendall": conceptKendall,
  "concept-factor-analysis": conceptFactorAnalysis,
  "concept-cluster-analysis": conceptClusterAnalysis,
};

const sectionIcons: Record<string, typeof BookOpen> = {
  foundations: BookOpen,
  testTheory: GraduationCap,
  statistics: TrendingUp,
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

type Study = {
  titleKey: string;
  journalKey: string;
  year: number;
  summaryKey: string;
  url: string;
  tags: string[];
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

type ConceptSection = {
  id: string;
  title: string;
  subtitle: string;
};

const personalityStudies: Study[] = [
  { titleKey: "research.studies.flavourBehaviour.title", journalKey: "research.studies.flavourBehaviour.journal", year: 2016, summaryKey: "research.studies.flavourBehaviour.summary", url: "https://scotchwhisky.com/magazine/latest-news/10461/smws-designs-whisky-personality-test/", tags: ["Big Five", "Whisky"] },
  { titleKey: "research.studies.personalityWine.title", journalKey: "research.studies.personalityWine.journal", year: 2025, summaryKey: "research.studies.personalityWine.summary", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11985116/", tags: ["Big Five", "Wine"] },
  { titleKey: "research.studies.contextPersonality.title", journalKey: "research.studies.contextPersonality.journal", year: 2020, summaryKey: "research.studies.contextPersonality.summary", url: "https://doi.org/10.1016/j.appet.2020.104607", tags: ["Personality", "Context"] },
];

const perceptionStudies: Study[] = [
  { titleKey: "research.studies.recencyEffect.title", journalKey: "research.studies.recencyEffect.journal", year: 2018, summaryKey: "research.studies.recencyEffect.summary", url: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0202732", tags: ["Bias", "Whisky"] },
  { titleKey: "research.studies.alcoholSensory.title", journalKey: "research.studies.alcoholSensory.journal", year: 2015, summaryKey: "research.studies.alcoholSensory.summary", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4388769/", tags: ["Sensory", "Alcohol"] },
  { titleKey: "research.studies.brainConnectivity.title", journalKey: "research.studies.brainConnectivity.journal", year: 2025, summaryKey: "research.studies.brainConnectivity.summary", url: "https://www.nature.com/articles/s41386-025-02058-7", tags: ["Neuroscience", "fMRI"] },
  { titleKey: "research.studies.expertConsumer.title", journalKey: "research.studies.expertConsumer.journal", year: 2023, summaryKey: "research.studies.expertConsumer.summary", url: "https://doi.org/10.1016/j.fqap.2023.104861", tags: ["Language", "Whiskey"] },
];

const methodStudies: Study[] = [
  { titleKey: "research.studies.rapidMethods.title", journalKey: "research.studies.rapidMethods.journal", year: 2023, summaryKey: "research.studies.rapidMethods.summary", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10556146/", tags: ["RATA", "QDA"] },
  { titleKey: "research.studies.whiskyLexicon.title", journalKey: "research.studies.whiskyLexicon.journal", year: 2021, summaryKey: "research.studies.whiskyLexicon.summary", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8303687/", tags: ["NLP", "Deep Learning"] },
  { titleKey: "research.studies.flavourAssessment.title", journalKey: "research.studies.flavourAssessment.journal", year: 2021, summaryKey: "research.studies.flavourAssessment.summary", url: "https://doi.org/10.3390/app11041410", tags: ["Scotch", "Methods"] },
];

const measurementStudies: Study[] = [
  { titleKey: "research.studies.winePsychology.title", journalKey: "research.studies.winePsychology.journal", year: 2020, summaryKey: "research.studies.winePsychology.summary", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7221102/", tags: ["Psychology", "Bias"] },
  { titleKey: "research.studies.panelPerformance.title", journalKey: "research.studies.panelPerformance.journal", year: 2021, summaryKey: "research.studies.panelPerformance.summary", url: "https://www.mdpi.com/2076-3417/11/24/11977", tags: ["Reliability", "Panels"] },
  { titleKey: "research.studies.sensoryCharacterization.title", journalKey: "research.studies.sensoryCharacterization.journal", year: 2022, summaryKey: "research.studies.sensoryCharacterization.summary", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8834440/", tags: ["Methods", "Profiling"] },
  { titleKey: "research.studies.interRaterKappa.title", journalKey: "research.studies.interRaterKappa.journal", year: 2012, summaryKey: "research.studies.interRaterKappa.summary", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3900052/", tags: ["Kappa", "Statistics"] },
];

function StudyCard({ study, index }: { study: Study; index: number }) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Card className="h-full" data-testid={`study-card-${index}`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3 mb-2">
            <Badge variant="outline" className="text-[10px] shrink-0">{study.year}</Badge>
            <div className="flex gap-1 flex-wrap justify-end">
              {study.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[9px] font-normal">{tag}</Badge>
              ))}
            </div>
          </div>
          <h3 className="font-serif font-semibold text-sm text-primary leading-snug mb-2" data-testid={`study-title-${index}`}>
            {t(study.titleKey)}
          </h3>
          <p className="text-[11px] text-muted-foreground/70 mb-2 italic">
            {t(study.journalKey)}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            {t(study.summaryKey)}
          </p>
          <a
            href={study.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
            data-testid={`study-link-${index}`}
          >
            <ExternalLink className="w-3 h-3" />
            {t("research.readStudy")}
          </a>
        </CardContent>
      </Card>
    </motion.div>
  );
}

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

export default function Research() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("personality");

  const conceptSections = t("research.conceptSections", { returnObjects: true }) as ConceptSection[];
  const concepts = t("research.concepts", { returnObjects: true }) as Concept[];

  return (
    <div className="min-h-screen bg-background min-w-0 overflow-x-hidden" data-testid="research-page">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative py-12 md:py-20 text-center overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="relative z-10 max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="flex items-center justify-center gap-2 mb-4"
          >
            <FlaskConical className="w-5 h-5 text-primary/60" />
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              CaskSense
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="text-3xl md:text-5xl font-serif font-bold text-primary tracking-tight mb-4"
            data-testid="text-research-title"
          >
            {t("research.title")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed"
            data-testid="text-research-subtitle"
          >
            {t("research.subtitle")}
          </motion.p>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="mt-6 h-px w-24 mx-auto bg-primary/30"
          />
        </div>
      </motion.div>

      <div className="max-w-4xl mx-auto px-6 pb-16">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-sm text-muted-foreground leading-relaxed mb-8 text-center"
          data-testid="text-research-intro"
        >
          {t("research.intro")}
        </motion.p>

        {/* CONCEPTS SECTION — now first */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="space-y-4"
        >
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-primary/60" />
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("research.knowledgeLabel")}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-serif font-bold text-primary" data-testid="text-knowledge-title">
              {t("research.knowledgeTitle")}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
              {t("research.knowledgeIntro")}
            </p>
          </div>

          {conceptSections.map((section) => {
            const SectionIcon = sectionIcons[section.id] || Layers;
            const sectionConcepts = concepts.filter((c) => c.section === section.id);

            return (
              <div key={section.id} className="mb-12">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="flex items-center gap-3 mb-2"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                    <SectionIcon className="w-4 h-4 text-primary/70" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-primary">{section.title}</h3>
                    <p className="text-xs text-muted-foreground">{section.subtitle}</p>
                  </div>
                </motion.div>
                <div className="ml-4 border-l-2 border-primary/10 pl-6 space-y-4 mt-4">
                  {sectionConcepts.map((concept, i) => (
                    <ConceptCard key={concept.id} concept={concept} index={i} />
                  ))}
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* STUDIES SECTION — now below concepts */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="mt-16"
        >
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <FlaskConical className="w-4 h-4 text-primary/60" />
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("research.tabMethodsShort")}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-serif font-bold text-primary" data-testid="text-studies-title">
              {t("research.studiesTitle") || "Literature & Studies"}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
              {t("research.studiesIntro") || t("research.disclaimer")}
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="personality" className="gap-1 text-[11px] sm:text-xs px-2" data-testid="tab-personality">
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t("research.tabPersonalityShort")}</span>
              </TabsTrigger>
              <TabsTrigger value="perception" className="gap-1 text-[11px] sm:text-xs px-2" data-testid="tab-perception">
                <Brain className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t("research.tabPerceptionShort")}</span>
              </TabsTrigger>
              <TabsTrigger value="methods" className="gap-1 text-[11px] sm:text-xs px-2" data-testid="tab-methods">
                <Microscope className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t("research.tabMethodsShort")}</span>
              </TabsTrigger>
              <TabsTrigger value="measurement" className="gap-1 text-[11px] sm:text-xs px-2" data-testid="tab-measurement">
                <Scale className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t("research.tabMeasurementShort")}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personality" className="mt-6">
              <p className="text-xs text-muted-foreground mb-4">{t("research.personalityDesc")}</p>
              <div className="grid gap-4">
                {personalityStudies.map((study, i) => (
                  <StudyCard key={study.titleKey} study={study} index={i} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="perception" className="mt-6">
              <p className="text-xs text-muted-foreground mb-4">{t("research.perceptionDesc")}</p>
              <div className="grid gap-4">
                {perceptionStudies.map((study, i) => (
                  <StudyCard key={study.titleKey} study={study} index={i + 3} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="methods" className="mt-6">
              <p className="text-xs text-muted-foreground mb-4">{t("research.methodsDesc")}</p>
              <div className="grid gap-4">
                {methodStudies.map((study, i) => (
                  <StudyCard key={study.titleKey} study={study} index={i + 7} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="measurement" className="mt-6">
              <p className="text-xs text-muted-foreground mb-4">{t("research.measurementDesc")}</p>
              <div className="grid gap-4">
                {measurementStudies.map((study, i) => (
                  <StudyCard key={study.titleKey} study={study} index={i + 10} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-8 p-5 bg-primary/5 border border-primary/10 rounded-lg text-center"
          data-testid="research-disclaimer"
        >
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("research.disclaimer")}
          </p>
        </motion.div>
      </div>
    </div>
  );
}

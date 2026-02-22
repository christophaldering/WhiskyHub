import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { BookOpen, ExternalLink, FlaskConical, Brain, BarChart3, Users, Wine, Microscope } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

const personalityStudies: Study[] = [
  {
    titleKey: "research.studies.flavourBehaviour.title",
    journalKey: "research.studies.flavourBehaviour.journal",
    year: 2016,
    summaryKey: "research.studies.flavourBehaviour.summary",
    url: "https://blog.5pm.co.uk/2016/08/23877",
    tags: ["Big Five", "Whisky"],
  },
  {
    titleKey: "research.studies.personalityWine.title",
    journalKey: "research.studies.personalityWine.journal",
    year: 2025,
    summaryKey: "research.studies.personalityWine.summary",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11985116/",
    tags: ["Big Five", "Wine"],
  },
  {
    titleKey: "research.studies.contextPersonality.title",
    journalKey: "research.studies.contextPersonality.journal",
    year: 2020,
    summaryKey: "research.studies.contextPersonality.summary",
    url: "https://www.sciencedirect.com/science/article/abs/pii/S0950329320302470",
    tags: ["Personality", "Context"],
  },
];

const perceptionStudies: Study[] = [
  {
    titleKey: "research.studies.recencyEffect.title",
    journalKey: "research.studies.recencyEffect.journal",
    year: 2018,
    summaryKey: "research.studies.recencyEffect.summary",
    url: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0202732",
    tags: ["Bias", "Whisky"],
  },
  {
    titleKey: "research.studies.alcoholSensory.title",
    journalKey: "research.studies.alcoholSensory.journal",
    year: 2015,
    summaryKey: "research.studies.alcoholSensory.summary",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4388769/",
    tags: ["Sensory", "Alcohol"],
  },
  {
    titleKey: "research.studies.brainConnectivity.title",
    journalKey: "research.studies.brainConnectivity.journal",
    year: 2025,
    summaryKey: "research.studies.brainConnectivity.summary",
    url: "https://www.nature.com/articles/s41386-025-02058-7",
    tags: ["Neuroscience", "fMRI"],
  },
  {
    titleKey: "research.studies.expertConsumer.title",
    journalKey: "research.studies.expertConsumer.journal",
    year: 2023,
    summaryKey: "research.studies.expertConsumer.summary",
    url: "https://www.sciencedirect.com/science/article/abs/pii/S0950329323000861",
    tags: ["Language", "Whiskey"],
  },
];

const methodStudies: Study[] = [
  {
    titleKey: "research.studies.rapidMethods.title",
    journalKey: "research.studies.rapidMethods.journal",
    year: 2023,
    summaryKey: "research.studies.rapidMethods.summary",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10556146/",
    tags: ["RATA", "QDA"],
  },
  {
    titleKey: "research.studies.whiskyLexicon.title",
    journalKey: "research.studies.whiskyLexicon.journal",
    year: 2021,
    summaryKey: "research.studies.whiskyLexicon.summary",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8303687/",
    tags: ["NLP", "Deep Learning"],
  },
  {
    titleKey: "research.studies.flavourAssessment.title",
    journalKey: "research.studies.flavourAssessment.journal",
    year: 2021,
    summaryKey: "research.studies.flavourAssessment.summary",
    url: "https://www.mdpi.com/2076-3417/11/4/1410",
    tags: ["Scotch", "Methods"],
  },
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

export default function Research() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("personality");

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

      <div className="max-w-3xl mx-auto px-6 pb-16">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-sm text-muted-foreground leading-relaxed mb-8 text-center"
          data-testid="text-research-intro"
        >
          {t("research.intro")}
        </motion.p>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="personality" className="gap-1.5" data-testid="tab-personality">
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("research.tabPersonality")}</span>
              <span className="sm:hidden">{t("research.tabPersonalityShort")}</span>
            </TabsTrigger>
            <TabsTrigger value="perception" className="gap-1.5" data-testid="tab-perception">
              <Brain className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("research.tabPerception")}</span>
              <span className="sm:hidden">{t("research.tabPerceptionShort")}</span>
            </TabsTrigger>
            <TabsTrigger value="methods" className="gap-1.5" data-testid="tab-methods">
              <Microscope className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("research.tabMethods")}</span>
              <span className="sm:hidden">{t("research.tabMethodsShort")}</span>
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
        </Tabs>

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

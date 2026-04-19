import { useState } from "react";
import { BookMarked, ChevronLeft, Users, Brain, Microscope, Scale } from "lucide-react";
import BackLink from "@/labs/components/BackLink";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  StudyCard,
  personalityStudies,
  perceptionStudies,
  methodStudies,
  measurementStudies,
} from "@/pages/research";

export default function LabsLiterature() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("personality");

  return (
    <div className="px-5 py-6 mx-auto" style={{ maxWidth: 700 }} data-testid="labs-discover-literature-page">
      <BackLink href="/labs/discover/research" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-literature">
          <ChevronLeft className="w-4 h-4" /> {t("research.title", "Research")}
        </button>
      </BackLink>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <BookMarked style={{ width: 22, height: 22, color: "var(--labs-accent)" }} />
        <h1 className="labs-serif" style={{ fontSize: 22, fontWeight: 700, color: "var(--labs-text)", margin: 0 }} data-testid="text-literature-title">
          {t("research.subLiteratur", "Literature & Studies")}
        </h1>
      </div>
      <p style={{ fontSize: 13, color: "var(--labs-text-secondary)", marginBottom: 20, paddingLeft: 30 }} data-testid="text-literature-subtitle">
        {t("research.subLiteraturDesc", "Personality, perception & bias, methods, measurement")}
      </p>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
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
    </div>
  );
}

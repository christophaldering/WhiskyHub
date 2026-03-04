import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card rounded-lg border border-border/40 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/10 transition-colors" data-testid={`button-section-${title.slice(0, 20)}`}>
        <h2 className="text-lg font-serif font-semibold">{title}</h2>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-4">{children}</div>}
    </div>
  );
}

export default function Method() {
  const { t } = useTranslation();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8" data-testid="method-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-7 h-7 text-primary" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-primary">
            {t("methodPage.title")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">
          {t("methodPage.subtitle")}
        </p>

        <div className="space-y-6">
          <Section title={t("methodPage.forEnthusiasts")}>
            <div className="prose prose-sm max-w-none text-muted-foreground space-y-3">
              <p>
                {t("methodPage.introText")}
              </p>
              <p className="font-medium text-foreground">
                {t("methodPage.whatProfileShows")}
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t("methodPage.noTypologies")}</li>
                <li>{t("methodPage.multidimensional")}</li>
                <li>{t("methodPage.behaviorOnly")}</li>
                <li>{t("methodPage.comparisonsOptIn")}</li>
                <li>{t("methodPage.sampleSize")}</li>
              </ul>
              <p>
                {t("methodPage.livingDocument")}
              </p>
            </div>
          </Section>

          <Section title={t("methodPage.forExperts")} defaultOpen={false}>
            <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
              <div>
                <h3 className="text-sm font-serif font-semibold text-foreground mb-1">
                  {t("methodPage.dimensionalModel")}
                </h3>
                <p>
                  {t("methodPage.dimensionalModelText")}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-serif font-semibold text-foreground mb-1">
                  {t("methodPage.platformBasis")}
                </h3>
                <p>
                  {t("methodPage.platformBasisText")}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-serif font-semibold text-foreground mb-1">
                  {t("methodPage.iqr")}
                </h3>
                <p>
                  {t("methodPage.iqrText")}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-serif font-semibold text-foreground mb-1">
                  {t("methodPage.systematicDeviation")}
                </h3>
                <p className="font-mono text-xs bg-muted/30 p-2 rounded">
                  avg_delta = mean(UserScore_i − PlatformMedian_i) {t("methodPage.systematicDeviationFormula")}
                </p>
                <p>
                  {t("methodPage.systematicDeviationText")}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-serif font-semibold text-foreground mb-1">
                  {t("methodPage.stabilityLogic")}
                </h3>
                <p>
                  {t("methodPage.stabilityLogicText")}
                </p>
                <ul className="list-disc pl-5 space-y-1 font-mono text-xs">
                  <li>{t("methodPage.preliminary")}: N &lt; 5</li>
                  <li>{t("methodPage.tendency")}: 5 ≤ N &lt; 15</li>
                  <li>{t("methodPage.stable")}: N ≥ 15</li>
                </ul>
                <p className="font-mono text-xs bg-muted/30 p-2 rounded mt-2">
                  {t("methodPage.stabilityPercent")} = min(100, N × 6.67)
                </p>
              </div>

              <div>
                <h3 className="text-sm font-serif font-semibold text-foreground mb-1">
                  {t("methodPage.normalization")}
                </h3>
                <p>
                  {t("methodPage.normalizationText")}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-serif font-semibold text-foreground mb-1">
                  {t("methodPage.platformPopulation")}
                </h3>
                <p>
                  {t("methodPage.platformPopulationText")}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-serif font-semibold text-foreground mb-1">
                  {t("methodPage.noNormativeEvaluation")}
                </h3>
                <p>
                  {t("methodPage.noNormativeEvaluationText")}
                </p>
              </div>
            </div>
          </Section>
        </div>

        <div className="mt-8 text-center">
          <Link href="/flavor-profile" className="text-xs text-primary/70 hover:text-primary transition-colors" data-testid="link-back-profile">
            ← {t("methodPage.backToProfile")}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

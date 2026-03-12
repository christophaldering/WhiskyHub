import { useTranslation } from "react-i18next";
import { BookOpen, ChevronDown, ChevronUp, ChevronLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="labs-card" style={{ overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left" style={{ background: "transparent", border: "none", cursor: "pointer" }} data-testid={`button-section-${title.slice(0, 20)}`}>
        <h2 className="labs-serif" style={{ fontSize: 16, fontWeight: 600, color: "var(--labs-text)", margin: 0 }}>{title}</h2>
        {open ? <ChevronUp className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} />}
      </button>
      {open && <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>}
    </div>
  );
}

export default function LabsMethod() {
  const { t } = useTranslation();

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto labs-fade-in" data-testid="labs-method-page">
      <Link href="/labs/discover/rabbit-hole" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-method">
          <ChevronLeft className="w-4 h-4" /> Discover
        </button>
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <BookOpen style={{ width: 22, height: 22, color: "var(--labs-accent)" }} />
        <h1 className="labs-serif" style={{ fontSize: 22, fontWeight: 700, color: "var(--labs-text)", margin: 0 }}>
          {t("methodPage.title", "How Your Profile Is Built")}
        </h1>
      </div>
      <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: "0 0 24px", lineHeight: 1.5 }}>
        {t("methodPage.subtitle", "Transparency matters to us.")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Section title={t("methodPage.forEnthusiasts", "For Enthusiasts")}>
          <p style={{ fontSize: 13, color: "var(--labs-text-secondary)", lineHeight: 1.6, margin: 0 }}>
            {t("methodPage.introText")}
          </p>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)", margin: 0 }}>
            {t("methodPage.whatProfileShows")}
          </p>
          <ul style={{ fontSize: 13, color: "var(--labs-text-secondary)", lineHeight: 1.6, margin: 0, paddingLeft: 20 }}>
            <li>{t("methodPage.noTypologies")}</li>
            <li>{t("methodPage.multidimensional")}</li>
            <li>{t("methodPage.behaviorOnly")}</li>
            <li>{t("methodPage.comparisonsOptIn")}</li>
            <li>{t("methodPage.sampleSize")}</li>
          </ul>
          <p style={{ fontSize: 13, color: "var(--labs-text-secondary)", lineHeight: 1.6, margin: 0 }}>
            {t("methodPage.livingDocument")}
          </p>
        </Section>

        <Section title={t("methodPage.forExperts", "For Experts")} defaultOpen={false}>
          {[
            { title: "dimensionalModel", text: "dimensionalModelText" },
            { title: "platformBasis", text: "platformBasisText" },
            { title: "iqr", text: "iqrText" },
          ].map(({ title, text }) => (
            <div key={title}>
              <h3 className="labs-serif" style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)", marginBottom: 4 }}>
                {t(`methodPage.${title}`)}
              </h3>
              <p style={{ fontSize: 12, color: "var(--labs-text-secondary)", lineHeight: 1.6, margin: 0 }}>
                {t(`methodPage.${text}`)}
              </p>
            </div>
          ))}

          <div>
            <h3 className="labs-serif" style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)", marginBottom: 4 }}>
              {t("methodPage.systematicDeviation")}
            </h3>
            <p style={{ fontSize: 11, fontFamily: "monospace", padding: 8, borderRadius: 6, background: "var(--labs-surface-elevated)", color: "var(--labs-accent)", margin: "0 0 6px" }}>
              avg_delta = mean(UserScore_i − PlatformMedian_i) {t("methodPage.systematicDeviationFormula")}
            </p>
            <p style={{ fontSize: 12, color: "var(--labs-text-secondary)", lineHeight: 1.6, margin: 0 }}>
              {t("methodPage.systematicDeviationText")}
            </p>
          </div>

          <div>
            <h3 className="labs-serif" style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)", marginBottom: 4 }}>
              {t("methodPage.stabilityLogic")}
            </h3>
            <p style={{ fontSize: 12, color: "var(--labs-text-secondary)", lineHeight: 1.6, margin: "0 0 6px" }}>
              {t("methodPage.stabilityLogicText")}
            </p>
            <ul style={{ fontSize: 11, fontFamily: "monospace", color: "var(--labs-accent)", margin: "0 0 6px", paddingLeft: 20 }}>
              <li>{t("methodPage.preliminary")}: N &lt; 5</li>
              <li>{t("methodPage.tendency")}: 5 ≤ N &lt; 15</li>
              <li>{t("methodPage.stable")}: N ≥ 15</li>
            </ul>
            <p style={{ fontSize: 11, fontFamily: "monospace", padding: 8, borderRadius: 6, background: "var(--labs-surface-elevated)", color: "var(--labs-accent)", margin: 0 }}>
              {t("methodPage.stabilityPercent")} = min(100, N × 6.67)
            </p>
          </div>

          {[
            { title: "normalization", text: "normalizationText" },
            { title: "platformPopulation", text: "platformPopulationText" },
            { title: "noNormativeEvaluation", text: "noNormativeEvaluationText" },
          ].map(({ title, text }) => (
            <div key={title}>
              <h3 className="labs-serif" style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)", marginBottom: 4 }}>
                {t(`methodPage.${title}`)}
              </h3>
              <p style={{ fontSize: 12, color: "var(--labs-text-secondary)", lineHeight: 1.6, margin: 0 }}>
                {t(`methodPage.${text}`)}
              </p>
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}

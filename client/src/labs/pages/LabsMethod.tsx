import { useTranslation } from "react-i18next";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import DiscoverActionBar from "@/labs/components/DiscoverActionBar";
import conceptNormalization from "@/assets/images/concept-normalization.png";
import conceptFactorAnalysis from "@/assets/images/concept-factor-analysis.png";

function SectionHero({ src, alt }: { src: string; alt: string }) {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
      <img src={src} alt={alt} style={{ width: "100%", height: "auto", display: "block" }} loading="lazy" />
    </div>
  );
}

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
    <div className="labs-page labs-fade-in" data-testid="labs-method-page">
      <DiscoverActionBar active="bibliothek" />

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <BookOpen style={{ width: 22, height: 22, color: "var(--labs-accent)" }} />
        <h1 className="labs-h2" style={{ color: "var(--labs-text)", margin: 0 }}>
          {t("bibliothek.howProfileCalculated", "How a Profile Is Calculated")}
        </h1>
      </div>
      <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: "0 0 24px", lineHeight: 1.5 }}>
        {t("bibliothek.howProfileCalculatedDesc", "Scoring, profiles & dimensions")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div>
          <SectionHero src={conceptNormalization} alt={t("methodPage.forEnthusiasts", "For Enthusiasts")} />
        <Section title={t("methodPage.forEnthusiasts", "For Enthusiasts")}>
          <p style={{ fontSize: 13, color: "var(--labs-text-secondary)", lineHeight: 1.6, margin: 0 }}>
            {t("methodPage.introText", "CaskSense builds your taste profile from your actual tasting behaviour — your scores, your notes, and the whiskies you choose. There are no quizzes, no self-assessments, and no assumptions. Everything is derived from real data you generate during tastings.")}
          </p>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)", margin: 0 }}>
            {t("methodPage.whatProfileShows", "What your profile shows:")}
          </p>
          <ul style={{ fontSize: 13, color: "var(--labs-text-secondary)", lineHeight: 1.6, margin: 0, paddingLeft: 20 }}>
            <li>{t("methodPage.noTypologies", "No typologies — we don't label you as a \"peat lover\" or \"sherry head\".")}</li>
            <li>{t("methodPage.multidimensional", "Multidimensional radar — your preferences across nose, taste, and finish dimensions.")}</li>
            <li>{t("methodPage.behaviorOnly", "Behaviour only — derived purely from your scores and tasting notes, never from questionnaires.")}</li>
            <li>{t("methodPage.comparisonsOptIn", "Comparisons are opt-in — see how you relate to the community average, but only if you choose to.")}</li>
            <li>{t("methodPage.sampleSize", "Sample size matters — your profile becomes more stable and reliable as you taste more whiskies.")}</li>
          </ul>
          <p style={{ fontSize: 13, color: "var(--labs-text-secondary)", lineHeight: 1.6, margin: 0 }}>
            {t("methodPage.livingDocument", "This methodology is a living document. As CaskSense evolves, so does the way we analyse and present your data — always transparently.")}
          </p>
        </Section>
        </div>

        <div>
          <SectionHero src={conceptFactorAnalysis} alt={t("methodPage.forExperts", "For Experts")} />
        <Section title={t("methodPage.forExperts", "For Experts")} defaultOpen={false}>
          {[
            { title: "dimensionalModel", titleFb: "Dimensional Scoring Model", text: "dimensionalModelText", textFb: "Each whisky is scored across three dimensions: Nose, Taste, and Finish. These are not arbitrary — they reflect the standard evaluation framework used by professional blenders and competition judges." },
            { title: "platformBasis", titleFb: "Platform-Wide Basis", text: "platformBasisText", textFb: "Your scores are compared against the platform median for each whisky. This gives you a relative positioning without imposing any 'correct' way to taste." },
            { title: "iqr", titleFb: "Interquartile Range (IQR)", text: "iqrText", textFb: "We use IQR-based outlier detection to flag scores that deviate significantly from the community distribution, helping identify unique preferences rather than errors." },
          ].map(({ title, titleFb, text, textFb }) => (
            <div key={title}>
              <h3 className="labs-serif" style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)", marginBottom: 4 }}>
                {t(`methodPage.${title}`, titleFb)}
              </h3>
              <p style={{ fontSize: 12, color: "var(--labs-text-secondary)", lineHeight: 1.6, margin: 0 }}>
                {t(`methodPage.${text}`, textFb)}
              </p>
            </div>
          ))}

          <div>
            <h3 className="labs-serif" style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)", marginBottom: 4 }}>
              {t("methodPage.systematicDeviation", "Systematic Deviation")}
            </h3>
            <p style={{ fontSize: 11, fontFamily: "monospace", padding: 8, borderRadius: 6, background: "var(--labs-surface-elevated)", color: "var(--labs-accent)", margin: "0 0 6px" }}>
              avg_delta = mean(UserScore_i − PlatformMedian_i) {t("methodPage.systematicDeviationFormula", "for all whiskies i = 1..N")}
            </p>
            <p style={{ fontSize: 12, color: "var(--labs-text-secondary)", lineHeight: 1.6, margin: 0 }}>
              {t("methodPage.systematicDeviationText", "If you consistently score higher or lower than the platform median, this offset is applied to normalise your scores for fair comparison — without changing your actual ratings.")}
            </p>
          </div>

          <div>
            <h3 className="labs-serif" style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)", marginBottom: 4 }}>
              {t("methodPage.stabilityLogic", "Profile Stability Logic")}
            </h3>
            <p style={{ fontSize: 12, color: "var(--labs-text-secondary)", lineHeight: 1.6, margin: "0 0 6px" }}>
              {t("methodPage.stabilityLogicText", "Your profile stability depends on how many whiskies you have rated. More data points lead to a more reliable representation of your preferences.")}
            </p>
            <ul style={{ fontSize: 11, fontFamily: "monospace", color: "var(--labs-accent)", margin: "0 0 6px", paddingLeft: 20 }}>
              <li>{t("methodPage.preliminary", "Preliminary")}: N &lt; 5</li>
              <li>{t("methodPage.tendency", "Tendency")}: 5 ≤ N &lt; 15</li>
              <li>{t("methodPage.stable", "Stable")}: N ≥ 15</li>
            </ul>
            <p style={{ fontSize: 11, fontFamily: "monospace", padding: 8, borderRadius: 6, background: "var(--labs-surface-elevated)", color: "var(--labs-accent)", margin: 0 }}>
              {t("methodPage.stabilityPercent", "Stability %")} = min(100, N × 6.67)
            </p>
          </div>

          {[
            { title: "normalization", titleFb: "Score Normalisation", text: "normalizationText", textFb: "Normalisation adjusts for systematic scoring bias. If you tend to score 5 points above average, that offset is factored in so your profile accurately reflects preferences, not just generosity." },
            { title: "platformPopulation", titleFb: "Platform Population", text: "platformPopulationText", textFb: "Comparisons are made against all active CaskSense users. As the community grows, statistical confidence increases for each whisky's median and distribution." },
            { title: "noNormativeEvaluation", titleFb: "No Normative Evaluation", text: "noNormativeEvaluationText", textFb: "CaskSense does not tell you what is 'good' or 'bad'. Your profile describes your behaviour — not a judgement. There is no correct palate." },
          ].map(({ title, titleFb, text, textFb }) => (
            <div key={title}>
              <h3 className="labs-serif" style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)", marginBottom: 4 }}>
                {t(`methodPage.${title}`, titleFb)}
              </h3>
              <p style={{ fontSize: 12, color: "var(--labs-text-secondary)", lineHeight: 1.6, margin: 0 }}>
                {t(`methodPage.${text}`, textFb)}
              </p>
            </div>
          ))}
        </Section>
        </div>
      </div>
    </div>
  );
}

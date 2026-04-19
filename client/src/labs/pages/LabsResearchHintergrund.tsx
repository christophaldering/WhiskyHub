import { useTranslation } from "react-i18next";
import { Lightbulb, ChevronLeft, FlaskConical } from "lucide-react";
import BackLink from "@/labs/components/BackLink";

export default function LabsResearchHintergrund() {
  const { t } = useTranslation();
  return (
    <div className="labs-page labs-fade-in" data-testid="labs-research-hintergrund-page">
      <BackLink href="/labs/discover/research" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-research-hintergrund">
          <ChevronLeft className="w-4 h-4" /> {t("research.title", "Research")}
        </button>
      </BackLink>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <Lightbulb style={{ width: 22, height: 22, color: "var(--labs-accent)" }} />
        <h1 className="labs-serif" style={{ fontSize: 22, fontWeight: 700, color: "var(--labs-text)", margin: 0 }} data-testid="text-research-hintergrund-title">
          {t("research.subHintergrund", "Background")}
        </h1>
      </div>
      <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: "0 0 24px", lineHeight: 1.5 }}>
        {t("research.subHintergrundDesc", "The CaskSense idea — where curiosity meets perception")}
      </p>

      <div className="labs-card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color: "var(--labs-text-muted)", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase" }}>
          <FlaskConical style={{ width: 14, height: 14 }} />
          <span>CaskSense</span>
        </div>
        <h2 className="labs-serif" style={{ fontSize: 18, fontWeight: 600, color: "var(--labs-text)", margin: "0 0 8px" }} data-testid="text-research-hintergrund-headline">
          {t("research.subtitle", "Where curiosity about whisky meets curiosity about how we perceive.")}
        </h2>
        <p style={{ fontSize: 14, color: "var(--labs-text)", lineHeight: 1.65, margin: "0 0 16px" }} data-testid="text-research-hintergrund-intro">
          {t("research.intro", "CaskSense explores what happens when psychometric methods meet sensory experience.")}
        </p>
        <p style={{ fontSize: 13, color: "var(--labs-text-muted)", lineHeight: 1.6, margin: 0 }} data-testid="text-research-hintergrund-disclaimer">
          {t("research.disclaimer", "All listed studies are peer-reviewed.")}
        </p>
      </div>
    </div>
  );
}

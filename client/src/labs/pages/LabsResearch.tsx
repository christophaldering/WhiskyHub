import { FlaskConical, ChevronLeft } from "lucide-react";
import BackLink from "@/labs/components/BackLink";
import { useTranslation } from "react-i18next";
import Research from "@/pages/research";

export default function LabsResearch() {
  const { t } = useTranslation();
  return (
    <div className="px-5 py-6 mx-auto" style={{ maxWidth: 700 }} data-testid="labs-discover-research-page">
      <BackLink href="/labs/discover/rabbit-hole" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-research">
          <ChevronLeft className="w-4 h-4" /> {t("discover.rabbitHole", "Rabbit Hole")}
        </button>
      </BackLink>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <FlaskConical style={{ width: 22, height: 22, color: "var(--labs-accent)" }} />
        <h1 className="labs-serif" style={{ fontSize: 22, fontWeight: 700, color: "var(--labs-text)", margin: 0 }} data-testid="text-research-title">
          {t("research.title", "Research")}
        </h1>
      </div>
      <Research />
    </div>
  );
}

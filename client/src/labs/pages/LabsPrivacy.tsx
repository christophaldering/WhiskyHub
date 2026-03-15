import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Shield, ChevronLeft } from "lucide-react";

const SECTIONS = [
  "overview", "dataCollected", "purpose", "localStorage", "aiProcessing",
  "email", "thirdParty", "retention", "rights", "deletion", "dataExport",
  "children", "transfer", "security", "complaint", "changes", "contact",
] as const;

export default function LabsPrivacy() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto labs-fade-in" data-testid="labs-privacy-page">
      <button
        onClick={() => navigate("/labs/about")}
        className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4"
        style={{ color: "var(--labs-text-muted)" }}
        data-testid="labs-privacy-back"
      >
        <ChevronLeft className="w-4 h-4" /> About
      </button>

      <div className="flex items-center gap-3 mb-2">
        <Shield className="w-7 h-7" style={{ color: "var(--labs-accent)" }} />
        <h1 className="labs-h1" style={{ color: "var(--labs-accent)" }} data-testid="labs-privacy-title">
          {t("legal.privacy.title")}
        </h1>
      </div>

      <p className="text-xs mb-8" style={{ color: "var(--labs-text-muted)" }} data-testid="labs-privacy-updated">
        {t("legal.privacy.lastUpdated")}: {t("legal.privacy.lastUpdatedDate")}
      </p>

      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <section key={section}>
            <h2 className="labs-h3 mb-2" style={{ color: "var(--labs-accent)" }} data-testid={`labs-privacy-${section}-title`}>
              {t(`legal.privacy.${section}.title`)}
            </h2>
            <p className="text-sm whitespace-pre-line" style={{ color: "var(--labs-text-muted)", lineHeight: 1.7 }} data-testid={`labs-privacy-${section}-text`}>
              {t(`legal.privacy.${section}.text`)}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}

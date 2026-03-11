import { useTranslation } from "react-i18next";
import { Shield, ArrowLeft } from "lucide-react";

const SECTIONS = [
  "overview", "dataCollected", "purpose", "localStorage", "aiProcessing",
  "email", "thirdParty", "retention", "rights", "deletion", "dataExport",
  "children", "changes", "contact",
] as const;

export default function LabsPrivacy() {
  const { t } = useTranslation();

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto labs-fade-in" data-testid="labs-privacy-page">
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-1.5 text-xs mb-4"
        style={{ color: "var(--labs-text-muted)", background: "none", border: "none", cursor: "pointer" }}
        data-testid="labs-privacy-back"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      <div className="flex items-center gap-3 mb-2">
        <Shield className="w-7 h-7" style={{ color: "var(--labs-accent)" }} />
        <h1 className="labs-serif text-2xl font-bold" style={{ color: "var(--labs-accent)" }} data-testid="labs-privacy-title">
          {t("legal.privacy.title")}
        </h1>
      </div>

      <p className="text-xs mb-8" style={{ color: "var(--labs-text-muted)" }} data-testid="labs-privacy-updated">
        {t("legal.privacy.lastUpdated")}: {t("legal.privacy.lastUpdatedDate")}
      </p>

      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <section key={section}>
            <h2 className="labs-serif text-lg font-bold mb-2" style={{ color: "var(--labs-accent)" }} data-testid={`labs-privacy-${section}-title`}>
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

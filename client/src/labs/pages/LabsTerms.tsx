import { useTranslation } from "react-i18next";
import { useBackNavigation } from "@/labs/hooks/useBackNavigation";
import { FileText, ChevronLeft } from "lucide-react";

const SECTIONS = ["scope", "usage", "content", "liability", "changes"] as const;

export default function LabsTerms() {
  const goBackToAbout = useBackNavigation("/labs/about");
  const { t } = useTranslation();

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto labs-fade-in" data-testid="labs-terms-page">
      <button
        onClick={goBackToAbout}
        className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4"
        style={{ color: "var(--labs-text-muted)" }}
        data-testid="labs-terms-back"
      >
        <ChevronLeft className="w-4 h-4" /> About
      </button>

      <div className="flex items-center gap-3 mb-2">
        <FileText className="w-7 h-7" style={{ color: "var(--labs-accent)" }} />
        <h1 className="labs-h1" style={{ color: "var(--labs-accent)" }} data-testid="labs-terms-title">
          {t("legal.terms.title")}
        </h1>
      </div>

      <p className="text-xs mb-8" style={{ color: "var(--labs-text-muted)" }} data-testid="labs-terms-updated">
        {t("legal.terms.lastUpdated")}: {t("legal.terms.lastUpdatedDate")}
      </p>

      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <section key={section}>
            <h2 className="labs-h3 mb-2" style={{ color: "var(--labs-accent)" }} data-testid={`labs-terms-${section}-title`}>
              {t(`legal.terms.${section}.title`)}
            </h2>
            <p className="text-sm whitespace-pre-line" style={{ color: "var(--labs-text-muted)", lineHeight: 1.7 }} data-testid={`labs-terms-${section}-text`}>
              {t(`legal.terms.${section}.text`)}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}

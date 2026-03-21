import { useTranslation } from "react-i18next";
import { useBackNavigation } from "@/labs/hooks/useBackNavigation";
import { Mail, Linkedin, ChevronLeft } from "lucide-react";

export default function LabsImpressum() {
  const goBackToAbout = useBackNavigation("/labs/about");
  const { t } = useTranslation();

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto labs-fade-in" data-testid="labs-impressum-page">
      <button
        onClick={goBackToAbout}
        className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4"
        style={{ color: "var(--labs-text-muted)" }}
        data-testid="labs-impressum-back"
      >
        <ChevronLeft className="w-4 h-4" /> About
      </button>

      <h1 className="labs-h1 mb-8" style={{ color: "var(--labs-accent)" }} data-testid="labs-impressum-title">
        {t("legal.impressum.title")}
      </h1>

      <div className="space-y-8">
        <section>
          <h2 className="labs-h3 mb-2" style={{ color: "var(--labs-accent)" }} data-testid="labs-impressum-responsible">
            {t("legal.impressum.responsibleTitle")}
          </h2>
          <p style={{ color: "var(--labs-text)", lineHeight: 1.7 }} data-testid="labs-impressum-address">
            Christoph Aldering<br />
            Jakob-Troost-Straße 8<br />
            46446 Emmerich am Rhein<br />
            Germany
          </p>
        </section>

        <section>
          <h2 className="labs-h3 mb-2" style={{ color: "var(--labs-accent)" }} data-testid="labs-impressum-contact-title">
            {t("legal.impressum.contactTitle")}
          </h2>
          <div className="space-y-2">
            <a
              href="mailto:christoph.aldering@googlemail.com"
              className="flex items-center gap-2 text-sm"
              style={{ color: "var(--labs-accent)", textDecoration: "none" }}
              data-testid="labs-impressum-email"
            >
              <Mail className="w-4 h-4" />
              christoph.aldering@googlemail.com
            </a>
            <a
              href="https://www.linkedin.com/in/aldering"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm"
              style={{ color: "var(--labs-accent)", textDecoration: "none" }}
              data-testid="labs-impressum-linkedin"
            >
              <Linkedin className="w-4 h-4" />
              linkedin.com/in/aldering
            </a>
          </div>
        </section>

        <section>
          <h2 className="labs-h3 mb-2" style={{ color: "var(--labs-accent)" }} data-testid="labs-impressum-disclaimer-title">
            {t("legal.impressum.disclaimerTitle")}
          </h2>
          <p className="text-sm" style={{ color: "var(--labs-text-muted)", lineHeight: 1.7 }} data-testid="labs-impressum-disclaimer">
            {t("legal.impressum.disclaimerText")}
          </p>
        </section>

        <section>
          <h2 className="labs-h3 mb-2" style={{ color: "var(--labs-accent)" }} data-testid="labs-impressum-project-title">
            {t("legal.impressum.projectNoteTitle")}
          </h2>
          <p className="text-sm" style={{ color: "var(--labs-text-muted)", lineHeight: 1.7 }} data-testid="labs-impressum-project">
            {t("legal.impressum.projectNoteText")}
          </p>
        </section>
      </div>
    </div>
  );
}

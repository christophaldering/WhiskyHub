import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import MeineWeltActionBar from "@/labs/components/MeineWeltActionBar";
import LabsWhiskyDNA from "./LabsWhiskyDNA";
import LabsTasteProfile from "./LabsTasteProfile";

const sectionHeaderStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--labs-gold)",
  margin: "4px 0 12px",
};

export default function LabsProfile() {
  const { t } = useTranslation();
  return (
    <div className="labs-page" data-testid="labs-profile">
      <MeineWeltActionBar active="analytics" />

      <div className="labs-fade-in" style={{ marginBottom: 20 }}>
        <h1 className="labs-h2" style={{ color: "var(--labs-text)" }} data-testid="text-profile-merged-title">
          {t("labs.profile.mergedTitle", "Dein Profil")}
        </h1>
        <p style={{ color: "var(--labs-text-muted)", fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
          {t(
            "labs.profile.mergedSubtitle",
            "Aroma-Signatur, Struktur-Vorlieben und Bewertungs-Profil – dein Geschmacks-Fingerabdruck an einem Ort.",
          )}
        </p>
      </div>

      <p style={sectionHeaderStyle} data-testid="labs-profile-section-aroma">
        {t("labs.profile.sectionAroma", "Aroma-Signatur")}
      </p>
      <LabsWhiskyDNA embedded />

      <div style={{ marginTop: 24, borderTop: "1px solid var(--labs-border)" }} />
      <p style={{ ...sectionHeaderStyle, marginTop: 16 }} data-testid="labs-profile-section-rating">
        {t("labs.profile.sectionRating", "Bewertungs-Profil")}
      </p>
      <LabsTasteProfile embedded />
    </div>
  );
}

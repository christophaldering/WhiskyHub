import { useTranslation } from "react-i18next";
import { Mail, Linkedin } from "lucide-react";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";

export default function M2Impressum() {
  const { t } = useTranslation();

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 16px 48px" }}>
      <M2BackButton />

      <h1
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 28,
          fontWeight: 900,
          color: v.accent,
          marginBottom: 32,
          marginTop: 16,
        }}
        data-testid="text-m2-impressum-title"
      >
        {t("legal.impressum.title")}
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <section>
          <h2
            style={{
              fontSize: 18,
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 700,
              color: v.accent,
              marginBottom: 8,
            }}
            data-testid="text-m2-impressum-responsible"
          >
            {t("legal.impressum.responsibleTitle")}
          </h2>
          <p style={{ color: v.text, lineHeight: 1.7, margin: 0 }} data-testid="text-m2-impressum-address">
            Christoph Aldering<br />
            Jakob-Troost-Straße 8<br />
            46446 Emmerich am Rhein<br />
            Germany
          </p>
        </section>

        <section>
          <h2
            style={{
              fontSize: 18,
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 700,
              color: v.accent,
              marginBottom: 8,
            }}
            data-testid="text-m2-impressum-contact-title"
          >
            {t("legal.impressum.contactTitle")}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <a
              href="mailto:christoph.aldering@googlemail.com"
              style={{ display: "flex", alignItems: "center", gap: 8, color: v.accent, textDecoration: "none" }}
              data-testid="link-m2-impressum-email"
            >
              <Mail size={16} />
              christoph.aldering@googlemail.com
            </a>
            <a
              href="https://www.linkedin.com/in/aldering"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 8, color: v.accent, textDecoration: "none" }}
              data-testid="link-m2-impressum-linkedin"
            >
              <Linkedin size={16} />
              linkedin.com/in/aldering
            </a>
          </div>
        </section>

        <section>
          <h2
            style={{
              fontSize: 18,
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 700,
              color: v.accent,
              marginBottom: 8,
            }}
            data-testid="text-m2-impressum-disclaimer-title"
          >
            {t("legal.impressum.disclaimerTitle")}
          </h2>
          <p style={{ color: v.muted, fontSize: 14, lineHeight: 1.7, margin: 0 }} data-testid="text-m2-impressum-disclaimer">
            {t("legal.impressum.disclaimerText")}
          </p>
        </section>

        <section>
          <h2
            style={{
              fontSize: 18,
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 700,
              color: v.accent,
              marginBottom: 8,
            }}
            data-testid="text-m2-impressum-project-title"
          >
            {t("legal.impressum.projectNoteTitle")}
          </h2>
          <p style={{ color: v.muted, fontSize: 14, lineHeight: 1.7, margin: 0 }} data-testid="text-m2-impressum-project">
            {t("legal.impressum.projectNoteText")}
          </p>
        </section>
      </div>
    </div>
  );
}

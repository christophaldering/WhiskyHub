import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Wine, ArrowLeft, Mail, Linkedin } from "lucide-react";
import SimpleShell from "@/components/simple/simple-shell";
import { c } from "@/lib/theme";

export default function Impressum() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  return (
    <SimpleShell maxWidth={720}>
      <div style={{ paddingTop: 16, paddingBottom: 48 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <button
            onClick={() => navigate("/")}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}
            data-testid="impressum-logo"
          >
            <Wine size={20} color={c.accent} />
            <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: c.accent, fontSize: 16 }}>CaskSense</span>
          </button>
          <button
            onClick={() => window.history.back()}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${c.border}`, borderRadius: 8, color: c.muted, fontSize: 14, padding: "6px 14px", cursor: "pointer" }}
            data-testid="button-back-impressum"
          >
            <ArrowLeft size={16} />
            {t("legal.back")}
          </button>
        </div>

        <h1
          style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 900, color: c.accent, marginBottom: 32, margin: 0, marginTop: 0 }}
          data-testid="text-impressum-title"
        >
          {t("legal.impressum.title")}
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 32 }}>
          <section>
            <h2 style={{ fontSize: 18, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: c.accent, marginBottom: 8 }}>
              {t("legal.impressum.responsibleTitle")}
            </h2>
            <p style={{ color: c.text, lineHeight: 1.7, margin: 0 }}>
              Christoph Aldering<br />
              Jakob-Troost-Straße 8<br />
              46446 Emmerich am Rhein<br />
              Germany
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 18, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: c.accent, marginBottom: 8 }}>
              {t("legal.impressum.contactTitle")}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <a
                href="mailto:christoph.aldering@googlemail.com"
                style={{ display: "flex", alignItems: "center", gap: 8, color: c.accent, textDecoration: "none" }}
                data-testid="link-impressum-email"
              >
                <Mail size={16} />
                christoph.aldering@googlemail.com
              </a>
              <a
                href="https://www.linkedin.com/in/aldering"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 8, color: c.accent, textDecoration: "none" }}
                data-testid="link-impressum-linkedin"
              >
                <Linkedin size={16} />
                linkedin.com/in/aldering
              </a>
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: 18, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: c.accent, marginBottom: 8 }}>
              {t("legal.impressum.disclaimerTitle")}
            </h2>
            <p style={{ color: c.muted, fontSize: 14, lineHeight: 1.7, margin: 0 }}>
              {t("legal.impressum.disclaimerText")}
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 18, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: c.accent, marginBottom: 8 }}>
              {t("legal.impressum.projectNoteTitle")}
            </h2>
            <p style={{ color: c.muted, fontSize: 14, lineHeight: 1.7, margin: 0 }}>
              {t("legal.impressum.projectNoteText")}
            </p>
          </section>
        </div>
      </div>
    </SimpleShell>
  );
}

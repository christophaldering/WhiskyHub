import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Wine, ArrowLeft, Shield } from "lucide-react";
import SimpleShell from "@/components/simple/simple-shell";
import { c } from "@/lib/theme";

export default function Privacy() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const sections = [
    "overview",
    "dataCollected",
    "purpose",
    "localStorage",
    "aiProcessing",
    "email",
    "thirdParty",
    "retention",
    "rights",
    "deletion",
    "dataExport",
    "children",
    "transfer",
    "security",
    "complaint",
    "changes",
    "contact",
  ] as const;

  return (
    <SimpleShell maxWidth={720} hideNav>
      <div style={{ paddingTop: 16, paddingBottom: 48 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <button
            onClick={() => navigate("/")}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}
            data-testid="privacy-logo"
          >
            <Wine size={20} color={c.accent} />
            <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: c.accent, fontSize: 16 }}>CaskSense</span>
          </button>
          <button
            onClick={() => window.history.back()}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${c.border}`, borderRadius: 8, color: c.muted, fontSize: 14, padding: "6px 14px", cursor: "pointer" }}
            data-testid="button-back-privacy"
          >
            <ArrowLeft size={16} />
            {t("legal.back")}
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <Shield size={32} color={c.accent} />
          <h1
            style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 900, color: c.accent, margin: 0 }}
            data-testid="text-privacy-title"
          >
            {t("legal.privacy.title")}
          </h1>
        </div>

        <p style={{ fontSize: 13, color: c.muted, marginBottom: 32 }} data-testid="text-privacy-updated">
          {t("legal.privacy.lastUpdated")}: {t("legal.privacy.lastUpdatedDate")}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {sections.map((section) => (
            <section key={section} id={section}>
              <h2
                style={{ fontSize: 18, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: c.accent, marginBottom: 8 }}
                data-testid={`text-privacy-${section}-title`}
              >
                {t(`legal.privacy.${section}.title`)}
              </h2>
              <p
                style={{ color: c.muted, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-line", margin: 0 }}
                data-testid={`text-privacy-${section}-text`}
              >
                {t(`legal.privacy.${section}.text`)}
              </p>
            </section>
          ))}
        </div>
      </div>
    </SimpleShell>
  );
}

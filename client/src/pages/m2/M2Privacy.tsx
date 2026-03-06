import { useTranslation } from "react-i18next";
import { Shield } from "lucide-react";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";

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
  "changes",
  "contact",
] as const;

export default function M2Privacy() {
  const { t } = useTranslation();

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 16px 48px" }}>
      <M2BackButton />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, marginBottom: 8 }}>
        <Shield size={32} color={v.accent} />
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 28,
            fontWeight: 900,
            color: v.accent,
            margin: 0,
          }}
          data-testid="text-m2-privacy-title"
        >
          {t("legal.privacy.title")}
        </h1>
      </div>

      <p style={{ fontSize: 13, color: v.muted, marginBottom: 32 }} data-testid="text-m2-privacy-updated">
        {t("legal.privacy.lastUpdated")}: {t("legal.privacy.lastUpdatedDate")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {sections.map((section) => (
          <section key={section} id={section}>
            <h2
              style={{
                fontSize: 18,
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 700,
                color: v.accent,
                marginBottom: 8,
              }}
              data-testid={`text-m2-privacy-${section}-title`}
            >
              {t(`legal.privacy.${section}.title`)}
            </h2>
            <p
              style={{ color: v.muted, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-line", margin: 0 }}
              data-testid={`text-m2-privacy-${section}-text`}
            >
              {t(`legal.privacy.${section}.text`)}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}

import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Wine, ArrowLeft, FileText } from "lucide-react";
import SimpleShell from "@/components/simple/simple-shell";
import { c } from "@/lib/theme";

const SECTIONS = ["scope", "usage", "content", "liability", "changes"] as const;

export default function Terms() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  return (
    <SimpleShell maxWidth={720} hideNav>
      <div style={{ paddingTop: 16, paddingBottom: 48 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <button
            onClick={() => navigate("/")}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}
            data-testid="terms-logo"
          >
            <Wine size={20} color={c.accent} />
            <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: c.accent, fontSize: 16 }}>CaskSense</span>
          </button>
          <button
            onClick={() => window.history.back()}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${c.border}`, borderRadius: 8, color: c.muted, fontSize: 14, padding: "6px 14px", cursor: "pointer" }}
            data-testid="button-back-terms"
          >
            <ArrowLeft size={16} />
            {t("legal.back")}
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <FileText size={32} color={c.accent} />
          <h1
            style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 900, color: c.accent, margin: 0 }}
            data-testid="text-terms-title"
          >
            {t("legal.terms.title")}
          </h1>
        </div>

        <p style={{ fontSize: 13, color: c.muted, marginBottom: 32 }} data-testid="text-terms-updated">
          {t("legal.terms.lastUpdated")}: {t("legal.terms.lastUpdatedDate")}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {SECTIONS.map((section) => (
            <section key={section} id={section}>
              <h2
                style={{ fontSize: 18, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: c.accent, marginBottom: 8 }}
                data-testid={`text-terms-${section}-title`}
              >
                {t(`legal.terms.${section}.title`)}
              </h2>
              <p
                style={{ color: c.muted, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-line", margin: 0 }}
                data-testid={`text-terms-${section}-text`}
              >
                {t(`legal.terms.${section}.text`)}
              </p>
            </section>
          ))}
        </div>
      </div>
    </SimpleShell>
  );
}

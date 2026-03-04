import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import SimpleShell from "@/components/simple/simple-shell";
import { Wine, Crown } from "lucide-react";
import { c, pageTitleStyle, pageSubtitleStyle } from "@/lib/theme";

export default function TastingHubSimple() {
  const { t } = useTranslation();

  return (
    <SimpleShell showBack={false}>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20, paddingTop: 24 }}>
        <div style={{ marginBottom: 8, textAlign: "center" }}>
          <h1 style={pageTitleStyle} data-testid="text-tasting-hub-title">
            {t("tastingHub.title")}
          </h1>
          <p style={pageSubtitleStyle}>
            {t("tastingHub.subtitle")}
          </p>
        </div>

        <Link href="/enter">
          <div
            style={{
              background: c.card,
              border: `1px solid ${c.border}`,
              borderRadius: 16,
              padding: "32px 24px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              textAlign: "center",
              transition: "border-color 0.2s",
            }}
            data-testid="card-join-tasting"
          >
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: `${c.accent}15`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Wine style={{ width: 28, height: 28, color: c.accent }} strokeWidth={1.6} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: c.text, fontFamily: "'Playfair Display', serif" }}>
                {t("tastingHub.joinTitle")}
              </div>
              <div style={{ fontSize: 13, color: c.muted, marginTop: 6, lineHeight: 1.5 }}>
                {t("tastingHub.joinDesc")}
              </div>
            </div>
          </div>
        </Link>

        <Link href="/host">
          <div
            style={{
              background: c.card,
              border: `1px solid ${c.border}`,
              borderRadius: 16,
              padding: "32px 24px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              textAlign: "center",
              transition: "border-color 0.2s",
            }}
            data-testid="card-host-tasting"
          >
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: `${c.accent}15`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Crown style={{ width: 28, height: 28, color: c.accent }} strokeWidth={1.6} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: c.text, fontFamily: "'Playfair Display', serif" }}>
                {t("tastingHub.hostTitle")}
              </div>
              <div style={{ fontSize: 13, color: c.muted, marginTop: 6, lineHeight: 1.5 }}>
                {t("tastingHub.hostDesc")}
              </div>
            </div>
          </div>
        </Link>
      </div>
    </SimpleShell>
  );
}

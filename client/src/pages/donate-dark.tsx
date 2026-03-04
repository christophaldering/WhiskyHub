import { useTranslation } from "react-i18next";
import { Heart, ExternalLink, HandHeart, Eye } from "lucide-react";
import SimpleShell from "@/components/simple/simple-shell";
import { c, cardStyle } from "@/lib/theme";

const HOSPIZ_NAME = "Christina-Kleintjes-Hospiz-Stiftung";
const HOSPIZ_URL = "https://c-kleintjes-hospiz-stiftung.de";

export default function DonateDark() {
  const { t } = useTranslation();

  const sectionCard: React.CSSProperties = {
    ...cardStyle,
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
  };

  const iconWrap = (bg: string): React.CSSProperties => ({
    width: 40,
    height: 40,
    borderRadius: 12,
    background: bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  });

  return (
    <SimpleShell>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%" }}>
        <div>
          <h2
            style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: "'Playfair Display', serif", color: c.accent }}
            data-testid="text-donate-dark-title"
          >
            {t("donate.title")}
          </h2>
          <div style={{ width: 48, height: 3, background: `${c.accent}60`, borderRadius: 2, marginTop: 8 }} />
        </div>

        <div style={sectionCard}>
          <div style={iconWrap(`${c.accent}20`)}>
            <Heart style={{ width: 18, height: 18, color: c.accent }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: c.text, marginBottom: 6 }}>
              {t("donate.whyTitle")}
            </div>
            <p style={{ fontSize: 13, color: c.muted, lineHeight: 1.6, margin: 0, whiteSpace: "pre-line" }}>
              {t("donate.whyText")}
            </p>
          </div>
        </div>

        <div style={sectionCard}>
          <div style={iconWrap("rgba(106,154,91,0.15)")}>
            <HandHeart style={{ width: 18, height: 18, color: c.success }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: c.text, marginBottom: 6 }}>
              {t("donate.charityTitle")}
            </div>
            <p style={{ fontSize: 13, color: c.muted, lineHeight: 1.6, margin: 0, marginBottom: 8 }}>
              {t("donate.charityText", { name: HOSPIZ_NAME })}
            </p>
            <a
              href={HOSPIZ_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: c.accent,
                textDecoration: "none",
              }}
              data-testid="link-hospiz-dark"
            >
              {HOSPIZ_NAME}
              <ExternalLink style={{ width: 13, height: 13 }} />
            </a>
          </div>
        </div>

        <div style={sectionCard}>
          <div style={iconWrap("rgba(100,149,237,0.15)")}>
            <Eye style={{ width: 18, height: 18, color: "#6495ed" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: c.text, marginBottom: 6 }}>
              {t("donate.transparencyTitle")}
            </div>
            <p style={{ fontSize: 13, color: c.muted, lineHeight: 1.6, margin: 0 }}>
              {t("donate.transparencyText")}
            </p>
          </div>
        </div>

        <div
          style={{ display: "flex", justifyContent: "center", width: "100%" }}
          data-testid="donate-paypal-iframe-dark"
        >
          <div style={{ width: "100%", maxWidth: 382 }}>
            <iframe
              src="https://www.paypal.com/giving/campaigns?campaign_id=XGB4YN3CQEMFE"
              title="PayPal donate campaign card"
              frameBorder="0"
              width="100%"
              height={550}
              scrolling="no"
              style={{ borderRadius: 14, border: "none" }}
            />
          </div>
        </div>

        <p
          style={{ textAlign: "center", fontSize: 11, color: `${c.muted}99`, fontStyle: "italic", margin: 0 }}
          data-testid="text-donate-disclaimer-dark"
        >
          {t("donate.disclaimer")}
        </p>
      </div>
    </SimpleShell>
  );
}

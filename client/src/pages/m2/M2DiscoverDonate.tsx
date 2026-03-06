import { useTranslation } from "react-i18next";
import { v, alpha } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { Heart, ExternalLink, HandHeart, Eye } from "lucide-react";

const HOSPIZ_NAME = "Christina-Kleintjes-Hospiz-Stiftung";
const HOSPIZ_URL = "https://c-kleintjes-hospiz-stiftung.de";

const card: React.CSSProperties = { background: v.card, borderRadius: 14, border: `1px solid ${v.border}`, padding: 18, display: "flex", alignItems: "flex-start", gap: 12 };
const iconWrap = (bg: string): React.CSSProperties => ({ width: 38, height: 38, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 });

export default function M2DiscoverDonate() {
  const { t } = useTranslation();

  return (
    <div style={{ padding: "16px 16px 32px", maxWidth: 600, margin: "0 auto" }} data-testid="m2-discover-donate-page">
      <M2BackButton />

      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0 4px" }}>
        <Heart style={{ width: 22, height: 22, color: v.accent }} />
        <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: v.text, margin: 0 }} data-testid="text-m2-donate-title">
          {t("donate.title", "Donate")}
        </h1>
      </div>
      <div style={{ width: 48, height: 2, background: v.accent, opacity: 0.3, margin: "8px 0 20px" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={card}>
          <div style={iconWrap(alpha(v.accent, "20"))}><Heart style={{ width: 16, height: 16, color: v.accent }} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: v.text, marginBottom: 4 }}>{t("donate.whyTitle", "Why donate?")}</div>
            <p style={{ fontSize: 12, color: v.muted, lineHeight: 1.6, margin: 0, whiteSpace: "pre-line" }}>{t("donate.whyText")}</p>
          </div>
        </div>

        <div style={card}>
          <div style={iconWrap("rgba(106,154,91,0.15)")}><HandHeart style={{ width: 16, height: 16, color: v.success }} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: v.text, marginBottom: 4 }}>{t("donate.charityTitle", "Charity Partner")}</div>
            <p style={{ fontSize: 12, color: v.muted, lineHeight: 1.6, margin: "0 0 6px" }}>{t("donate.charityText", { name: HOSPIZ_NAME })}</p>
            <a href={HOSPIZ_URL} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: v.accent, textDecoration: "none" }} data-testid="m2-link-hospiz">
              {HOSPIZ_NAME}<ExternalLink style={{ width: 11, height: 11 }} />
            </a>
          </div>
        </div>

        <div style={card}>
          <div style={iconWrap("rgba(100,149,237,0.15)")}><Eye style={{ width: 16, height: 16, color: "#6495ed" }} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: v.text, marginBottom: 4 }}>{t("donate.transparencyTitle", "Transparency")}</div>
            <p style={{ fontSize: 12, color: v.muted, lineHeight: 1.6, margin: 0 }}>{t("donate.transparencyText")}</p>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", width: "100%", marginTop: 20 }} data-testid="m2-donate-paypal">
        <div style={{ width: "100%", maxWidth: 382 }}>
          <iframe src="https://www.paypal.com/giving/campaigns?campaign_id=XGB4YN3CQEMFE" title="PayPal donate" frameBorder="0" width="100%" height={550} scrolling="no" style={{ borderRadius: 14, border: "none" }} />
        </div>
      </div>

      <p style={{ textAlign: "center", fontSize: 10, color: v.mutedLight, fontStyle: "italic", marginTop: 16, opacity: 0.7 }} data-testid="m2-donate-disclaimer">
        {t("donate.disclaimer")}
      </p>
    </div>
  );
}

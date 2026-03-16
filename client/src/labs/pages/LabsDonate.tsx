import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Heart, ExternalLink, HandHeart, Eye, ChevronLeft } from "lucide-react";

const HOSPIZ_NAME = "Christina-Kleintjes-Hospiz-Stiftung";
const HOSPIZ_URL = "https://c-kleintjes-hospiz-stiftung.de";

export default function LabsDonate() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto labs-fade-in" data-testid="labs-donate-page">
      <button
        onClick={() => navigate("/labs/about")}
        className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4"
        style={{ color: "var(--labs-text-muted)" }}
        data-testid="labs-donate-back"
      >
        <ChevronLeft className="w-4 h-4" /> About
      </button>

      <div className="flex items-center gap-2.5 mb-1">
        <Heart className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
        <h1 className="labs-h2" style={{ color: "var(--labs-text)" }} data-testid="labs-donate-title">
          {t("donate.title", "Donate")}
        </h1>
      </div>
      <div className="w-12 h-0.5 rounded-full mb-6" style={{ background: "var(--labs-accent)", opacity: 0.75 }} />

      <div className="space-y-3">
        <div className="labs-card p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--labs-accent-muted)" }}>
            <Heart className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--labs-text)" }}>{t("donate.whyTitle", "Why donate?")}</p>
            <p className="text-xs whitespace-pre-line" style={{ color: "var(--labs-text-muted)", lineHeight: 1.6 }}>{t("donate.whyText")}</p>
          </div>
        </div>

        <div className="labs-card p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--labs-success-muted)" }}>
            <HandHeart className="w-4 h-4" style={{ color: "var(--labs-success)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--labs-text)" }}>{t("donate.charityTitle", "Charity Partner")}</p>
            <p className="text-xs mb-2" style={{ color: "var(--labs-text-muted)", lineHeight: 1.6 }}>{t("donate.charityText", { name: HOSPIZ_NAME })}</p>
            <a href={HOSPIZ_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs" style={{ color: "var(--labs-accent)", textDecoration: "none" }} data-testid="labs-donate-hospiz-link">
              {HOSPIZ_NAME} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="labs-card p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--labs-info-muted)" }}>
            <Eye className="w-4 h-4" style={{ color: "var(--labs-info)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--labs-text)" }}>{t("donate.transparencyTitle", "Transparency")}</p>
            <p className="text-xs" style={{ color: "var(--labs-text-muted)", lineHeight: 1.6 }}>{t("donate.transparencyText")}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center w-full mt-6" data-testid="labs-donate-paypal">
        <div className="w-full max-w-[382px]">
          <iframe
            src="https://www.paypal.com/giving/campaigns?campaign_id=XGB4YN3CQEMFE"
            title={t("m2.discover.donatePaypalTitle", "PayPal donate")}
            frameBorder="0"
            width="100%"
            height={550}
            scrolling="no"
            className="rounded-2xl border-none"
          />
        </div>
      </div>

      <p className="text-center text-[11px] italic mt-4" style={{ color: "var(--labs-text-muted)", opacity: 0.75 }} data-testid="labs-donate-disclaimer">
        {t("donate.disclaimer")}
      </p>
    </div>
  );
}

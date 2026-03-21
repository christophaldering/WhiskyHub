import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useBackNavigation } from "@/labs/hooks/useBackNavigation";
import { Heart, Info, ChevronLeft } from "lucide-react";
import authorPhoto from "@assets/22A3ABF8-0085-4C82-97DF-EAA0ACD46B4E_1771448218726.png";

type Block = { heading?: string; lines: string[]; italic?: boolean; accent?: boolean };

export default function LabsAbout() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const goBackToDiscover = useBackNavigation("/labs/entdecken");
  const blocks = t("about.blocks", { returnObjects: true }) as Block[];

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto labs-fade-in" data-testid="labs-about-page">
      <button
        onClick={goBackToDiscover}
        className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4"
        style={{ color: "var(--labs-text-muted)" }}
        data-testid="labs-about-back"
      >
        <ChevronLeft className="w-4 h-4" /> Discover
      </button>

      <div className="flex items-center gap-2.5 mb-1">
        <Info className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
        <h1 className="labs-h2" style={{ color: "var(--labs-text)" }} data-testid="labs-about-title">
          {t("about.title", "About CaskSense")}
        </h1>
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)" }}>
        {t("m2.discover.aboutSubtitle", "The story behind CaskSense")}
      </p>

      <div className="flex justify-center mb-8">
        <div className="max-w-[280px] w-full rounded-2xl overflow-hidden" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
          <img src={authorPhoto} alt="Christoph Aldering & Sammy" className="w-full h-auto block" data-testid="labs-about-author-photo" />
        </div>
      </div>

      <div className="space-y-5">
        {Array.isArray(blocks) && blocks.map((block, i) => (
          <div key={i} data-testid={`labs-about-block-${i}`}>
            {block.heading && (
              <h3 className="labs-h3 mb-1.5" style={{ color: "var(--labs-accent)" }}>
                {block.heading}
              </h3>
            )}
            {block.lines.map((line, j) => (
              <p
                key={j}
                className="text-[13px] leading-relaxed"
                style={{
                  color: block.accent ? "var(--labs-accent)" : block.italic ? "var(--labs-text-muted)" : "var(--labs-text)",
                  fontStyle: block.italic ? "italic" : "normal",
                  fontWeight: block.accent ? 600 : 400,
                  margin: 0,
                  marginTop: j > 0 ? 8 : 0,
                }}
              >
                {line}
              </p>
            ))}
          </div>
        ))}
      </div>

      <p className="labs-serif text-right text-sm font-semibold mt-5" style={{ color: "var(--labs-accent)" }} data-testid="labs-about-signature">
        — Christoph Aldering
      </p>

      <div className="labs-card p-4 mt-5" data-testid="labs-about-contact">
        <h3 className="labs-serif text-sm font-semibold mb-2" style={{ color: "var(--labs-accent)" }}>
          {t("about.contactTitle", "Contact")}
        </h3>
        <p className="text-xs mb-1.5" style={{ color: "var(--labs-text-muted)", lineHeight: 1.6 }}>{t("about.contactNotice")}</p>
        <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)", lineHeight: 1.6 }}>{t("about.contactFeedback")}</p>
        <div className="flex flex-wrap gap-3">
          <a href={`mailto:${t("about.contactEmail")}`} className="text-xs" style={{ color: "var(--labs-accent)", textDecoration: "none" }} data-testid="labs-about-email">
            {t("about.contactEmail")}
          </a>
          <a href={t("about.contactLinkedInUrl")} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: "var(--labs-accent)", textDecoration: "none" }} data-testid="labs-about-linkedin">
            {t("about.contactLinkedIn")}
          </a>
        </div>
      </div>

      <button
        onClick={() => navigate("/labs/donate")}
        className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
        style={{
          background: "var(--labs-accent-muted)",
          border: "1px solid var(--labs-accent)",
          color: "var(--labs-accent)",
          cursor: "pointer",
        }}
        data-testid="labs-about-donate-btn"
      >
        <Heart className="w-4 h-4" />
        {t("m2.discover.aboutDonateButton", "Donate / Hospice")}
      </button>
    </div>
  );
}

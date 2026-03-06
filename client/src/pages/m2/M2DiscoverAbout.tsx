import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { v, alpha } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { Heart, Info } from "lucide-react";
import authorPhoto from "@assets/22A3ABF8-0085-4C82-97DF-EAA0ACD46B4E_1771448218726.png";

type Block = { heading?: string; lines: string[]; italic?: boolean; accent?: boolean; };

const card: React.CSSProperties = { background: v.card, borderRadius: 14, border: `1px solid ${v.border}`, padding: 18 };

export default function M2DiscoverAbout() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const blocks = t("about.blocks", { returnObjects: true }) as Block[];

  return (
    <div style={{ padding: "16px 16px 32px", maxWidth: 600, margin: "0 auto" }} data-testid="m2-discover-about-page">
      <M2BackButton />

      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0 4px" }}>
        <Info style={{ width: 22, height: 22, color: v.accent }} />
        <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: v.text, margin: 0 }} data-testid="text-m2-about-title">
          {t("about.title", "About CaskSense")}
        </h1>
      </div>
      <p style={{ fontSize: 13, color: v.muted, margin: "0 0 20px" }}>The story behind CaskSense</p>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
        <div style={{ maxWidth: 280, width: "100%", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
          <img src={authorPhoto} alt="Christoph Aldering & Sammy" style={{ width: "100%", height: "auto", display: "block" }} data-testid="m2-img-about-author" />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {Array.isArray(blocks) && blocks.map((block, i) => (
          <div key={i} data-testid={`m2-about-block-${i}`}>
            {block.heading && <h3 style={{ fontSize: 16, fontWeight: 700, color: v.accent, marginBottom: 6, fontFamily: "'Playfair Display', serif" }}>{block.heading}</h3>}
            {block.lines.map((line, j) => (
              <p key={j} style={{ fontSize: 13, lineHeight: 1.7, color: block.accent ? v.accent : block.italic ? v.muted : v.text, fontStyle: block.italic ? "italic" : "normal", fontWeight: block.accent ? 600 : 400, margin: 0, ...(j > 0 ? { marginTop: 8 } : {}) }}>{line}</p>
            ))}
          </div>
        ))}
      </div>

      <p style={{ textAlign: "right", fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 600, color: v.accent, marginTop: 16 }} data-testid="m2-about-signature">— Christoph Aldering</p>

      <div style={{ ...card, marginTop: 16 }} data-testid="m2-about-contact">
        <h3 style={{ fontSize: 14, fontWeight: 600, color: v.accent, marginBottom: 6, fontFamily: "'Playfair Display', serif" }}>{t("about.contactTitle", "Contact")}</h3>
        <p style={{ fontSize: 12, color: v.muted, lineHeight: 1.6, margin: "0 0 6px" }}>{t("about.contactNotice")}</p>
        <p style={{ fontSize: 12, color: v.muted, lineHeight: 1.6, margin: "0 0 10px" }}>{t("about.contactFeedback")}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <a href={`mailto:${t("about.contactEmail")}`} style={{ fontSize: 12, color: v.accent, textDecoration: "none" }} data-testid="m2-about-email">{t("about.contactEmail")}</a>
          <a href={t("about.contactLinkedInUrl")} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: v.accent, textDecoration: "none" }} data-testid="m2-about-linkedin">{t("about.contactLinkedIn")}</a>
        </div>
      </div>

      <button
        onClick={() => navigate("/m2/discover/donate")}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "12px 18px", background: alpha(v.accent, "15"), border: `1px solid ${alpha(v.accent, "30")}`, borderRadius: 12, color: v.accent, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 16 }}
        data-testid="m2-about-donate"
      >
        <Heart style={{ width: 15, height: 15 }} />Spende / Hospiz
      </button>
    </div>
  );
}

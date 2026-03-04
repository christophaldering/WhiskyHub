import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Heart } from "lucide-react";
import SimpleShell from "@/components/simple/simple-shell";
import { c, cardStyle, pageTitleStyle, pageSubtitleStyle } from "@/lib/theme";
import authorPhoto from "@assets/22A3ABF8-0085-4C82-97DF-EAA0ACD46B4E_1771448218726.png";

type Block = {
  heading?: string;
  lines: string[];
  italic?: boolean;
  accent?: boolean;
};

export default function AboutDark() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const blocks = t("about.blocks", { returnObjects: true }) as Block[];

  return (
    <SimpleShell>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }} data-testid="about-dark-page">
        <div style={{ marginBottom: 8 }}>
          <h2 style={pageTitleStyle} data-testid="text-about-dark-title">
            {t("about.title")}
          </h2>
          <p style={pageSubtitleStyle}>
            The story behind CaskSense
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ maxWidth: 320, width: "100%", borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
            <img
              src={authorPhoto}
              alt="Christoph Aldering & Sammy"
              style={{ width: "100%", height: "auto", display: "block" }}
              data-testid="img-about-dark-author"
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {Array.isArray(blocks) && blocks.map((block, i) => (
            <div key={i} data-testid={`about-dark-block-${i}`}>
              {block.heading && (
                <h3 style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: c.accent,
                  marginBottom: 8,
                  fontFamily: "'Playfair Display', serif",
                }}>
                  {block.heading}
                </h3>
              )}
              {block.lines.map((line, j) => (
                <p
                  key={j}
                  style={{
                    fontSize: 14,
                    lineHeight: 1.7,
                    color: block.accent ? c.accent : (block.italic ? c.muted : c.text),
                    fontStyle: block.italic ? "italic" : "normal",
                    fontWeight: block.accent ? 600 : 400,
                    marginTop: j > 0 ? 10 : 0,
                    margin: 0,
                    ...(j > 0 ? { marginTop: 10 } : {}),
                  }}
                >
                  {line}
                </p>
              ))}
            </div>
          ))}
        </div>

        <p
          style={{
            textAlign: "right",
            fontFamily: "'Playfair Display', serif",
            fontSize: 16,
            fontWeight: 600,
            color: c.accent,
            marginTop: 8,
          }}
          data-testid="text-about-dark-signature"
        >
          — Christoph Aldering
        </p>

        <div style={{ ...cardStyle, marginTop: 8 }} data-testid="about-dark-contact">
          <h3 style={{ fontSize: 15, fontWeight: 600, color: c.accent, marginBottom: 8, fontFamily: "'Playfair Display', serif" }}>
            {t("about.contactTitle")}
          </h3>
          <p style={{ fontSize: 13, color: c.muted, lineHeight: 1.6, marginBottom: 8 }}>
            {t("about.contactNotice")}
          </p>
          <p style={{ fontSize: 13, color: c.muted, lineHeight: 1.6, marginBottom: 12 }}>
            {t("about.contactFeedback")}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <a
              href={`mailto:${t("about.contactEmail")}`}
              style={{ fontSize: 13, color: c.accent, textDecoration: "none" }}
              data-testid="link-about-dark-email"
            >
              {t("about.contactEmail")}
            </a>
            <a
              href={t("about.contactLinkedInUrl")}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 13, color: c.accent, textDecoration: "none" }}
              data-testid="link-about-dark-linkedin"
            >
              {t("about.contactLinkedIn")}
            </a>
          </div>
        </div>

        <button
          onClick={() => navigate("/discover/donate")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
            padding: "14px 20px",
            background: `${c.accent}15`,
            border: `1px solid ${c.accent}30`,
            borderRadius: 12,
            color: c.accent,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "system-ui, sans-serif",
          }}
          data-testid="button-about-dark-donate"
        >
          <Heart style={{ width: 16, height: 16 }} />
          Spende / Hospiz
        </button>
      </div>
    </SimpleShell>
  );
}

import { useTranslation } from "react-i18next";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { Map } from "lucide-react";
import aboutNose from "@/assets/images/about-nose.png";
import aboutTaste from "@/assets/images/about-taste.png";
import aboutReflect from "@/assets/images/about-reflect.png";
import aboutJournal from "@/assets/images/about-journal.png";

const sectionImages = [aboutNose, aboutTaste, aboutReflect, aboutJournal];
const sectionKeys = ["section1", "section2", "section3", "section4"];

export default function M2DiscoverGuide() {
  const { t } = useTranslation();

  return (
    <div style={{ padding: "16px 16px 32px", maxWidth: 600, margin: "0 auto" }} data-testid="m2-discover-guide-page">
      <M2BackButton />

      <div style={{ textAlign: "center", margin: "16px 0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 }}>
          <Map style={{ width: 22, height: 22, color: v.accent }} />
          <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: v.text, margin: 0 }} data-testid="text-m2-guide-title">
            {t("aboutMethod.heroTitle", "The Art of Tasting")}
          </h1>
        </div>
        <div style={{ width: 48, height: 1, background: v.accent, opacity: 0.3, margin: "12px auto 0" }} />
      </div>

      {sectionKeys.map((key, i) => {
        const paragraphs = t(`aboutMethod.${key}Paragraphs`, { returnObjects: true }) as string[];
        const title = t(`aboutMethod.${key}Title`);
        return (
          <div key={key} style={{ marginBottom: 32 }} data-testid={`m2-guide-section-${i}`}>
            <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
              <img src={sectionImages[i]} alt={title} style={{ width: "100%", height: "auto", display: "block" }} loading="lazy" />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: v.accent, fontFamily: "'Playfair Display', serif", marginBottom: 8 }}>{title}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {paragraphs.map((p, j) => (
                <p key={j} style={{ fontSize: 14, lineHeight: 1.7, color: v.textSecondary, margin: 0 }}>{p}</p>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

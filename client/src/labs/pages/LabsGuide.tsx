import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Map, ChevronLeft } from "lucide-react";
import aboutNose from "@/assets/images/about-nose.png";
import aboutTaste from "@/assets/images/about-taste.png";
import aboutReflect from "@/assets/images/about-reflect.png";
import aboutJournal from "@/assets/images/about-journal.png";

const sectionImages = [aboutNose, aboutTaste, aboutReflect, aboutJournal];
const sectionKeys = ["section1", "section2", "section3", "section4"];

export default function LabsGuide() {
  const { t } = useTranslation();

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto" data-testid="labs-discover-guide-page">
      <Link href="/labs/discover" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-guide">
          <ChevronLeft className="w-4 h-4" /> Discover
        </button>
      </Link>

      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 }}>
          <Map style={{ width: 22, height: 22, color: "var(--labs-accent)" }} />
          <h1 className="labs-serif" style={{ fontSize: 22, fontWeight: 700, color: "var(--labs-text)", margin: 0 }} data-testid="text-guide-title">
            {t("aboutMethod.heroTitle", "The Art of Tasting")}
          </h1>
        </div>
        <div style={{ width: 48, height: 1, background: "var(--labs-accent)", opacity: 0.75, margin: "12px auto 0" }} />
      </div>

      {sectionKeys.map((key, i) => {
        const paragraphs = t(`aboutMethod.${key}Paragraphs`, { returnObjects: true }) as string[];
        const title = t(`aboutMethod.${key}Title`);
        return (
          <div key={key} style={{ marginBottom: 32 }} data-testid={`labs-guide-section-${i}`}>
            <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
              <img src={sectionImages[i]} alt={title} style={{ width: "100%", height: "auto", display: "block" }} loading="lazy" />
            </div>
            <h2 className="labs-serif" style={{ fontSize: 18, fontWeight: 700, color: "var(--labs-accent)", marginBottom: 8 }}>{title}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {paragraphs.map((p, j) => (
                <p key={j} style={{ fontSize: 14, lineHeight: 1.7, color: "var(--labs-text-secondary)", margin: 0 }}>{p}</p>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

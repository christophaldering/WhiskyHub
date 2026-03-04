import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import SimpleShell from "@/components/simple/simple-shell";
import { c } from "@/lib/theme";
import aboutNose from "@/assets/images/about-nose.png";
import aboutTaste from "@/assets/images/about-taste.png";
import aboutReflect from "@/assets/images/about-reflect.png";
import aboutJournal from "@/assets/images/about-journal.png";

const sectionImages = [aboutNose, aboutTaste, aboutReflect, aboutJournal];
const sectionKeys = ["section1", "section2", "section3", "section4"];

function Section({
  image,
  title,
  paragraphs,
  reverse,
  index,
}: {
  image: string;
  title: string;
  paragraphs: string[];
  reverse?: boolean;
  index: number;
}) {
  return (
    <div
      style={{ padding: "32px 0" }}
      data-testid={`section-guide-${index}`}
    >
      <div
        style={{
          display: "flex",
          flexDirection: reverse ? "column-reverse" : "column",
          gap: 20,
        }}
      >
        <div style={{ borderRadius: 12, overflow: "hidden", position: "relative" }}>
          <img
            src={image}
            alt={title}
            style={{ width: "100%", height: "auto", display: "block" }}
            loading="lazy"
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.35), transparent)",
            }}
          />
        </div>
        <div>
          <h2
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 22,
              fontWeight: 700,
              color: c.accent,
              marginBottom: 12,
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {paragraphs.map((p, i) => (
              <p
                key={i}
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: 15,
                  lineHeight: 1.7,
                  color: c.mutedLight,
                  margin: 0,
                }}
              >
                {p}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TastingGuide() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  return (
    <SimpleShell>
      <div
        style={{ maxWidth: 560, margin: "0 auto", padding: "0 16px" }}
        data-testid="tasting-guide-page"
      >
        <div style={{ textAlign: "center", padding: "32px 0 16px" }}>
          <p
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.25em",
              color: c.muted,
              marginBottom: 8,
            }}
          >
            CaskSense
          </p>
          <h1
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 28,
              fontWeight: 700,
              color: c.accent,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
            data-testid="text-guide-title"
          >
            {t("aboutMethod.heroTitle")}
          </h1>
          <div
            style={{
              width: 48,
              height: 1,
              background: `${c.accent}44`,
              margin: "16px auto 0",
            }}
          />
        </div>

        {sectionKeys.map((key, i) => {
          const paragraphs = t(`aboutMethod.${key}Paragraphs`, { returnObjects: true }) as string[];
          return (
            <Section
              key={key}
              image={sectionImages[i]}
              title={t(`aboutMethod.${key}Title`)}
              paragraphs={paragraphs}
              reverse={i % 2 === 1}
              index={i + 1}
            />
          );
        })}

        <div
          style={{
            padding: "32px 0 48px",
            textAlign: "center",
            borderTop: `1px solid ${c.border}`,
          }}
        >
          <button
            onClick={() => navigate("/analyze")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 24px",
              border: `1px solid ${c.accent}66`,
              background: "transparent",
              color: c.accent,
              borderRadius: 6,
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 14,
              letterSpacing: "0.03em",
              cursor: "pointer",
            }}
            data-testid="button-guide-back"
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
            {t("aboutMethod.backToApp")}
          </button>
        </div>
      </div>
    </SimpleShell>
  );
}

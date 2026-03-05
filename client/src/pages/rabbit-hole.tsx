import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { FlaskConical, SlidersHorizontal, BarChart3, BookOpen } from "lucide-react";
import SimpleShell from "@/components/simple/simple-shell";
import BackButton from "@/components/back-button";
import HeroWhiskyBg from "@/components/hero-whisky-bg";
import { v, alpha } from "@/lib/themeVars";
import { pageTitleStyle } from "@/lib/theme";
import type { ElementType } from "react";

interface RabbitCard {
  icon: ElementType;
  titleKey: string;
  descKey: string;
  href: string;
  testId: string;
}

const CARDS: RabbitCard[] = [
  {
    icon: SlidersHorizontal,
    titleKey: "rabbitHole.ratingModelsTitle",
    descKey: "rabbitHole.ratingModelsDesc",
    href: "/method",
    testId: "link-rabbit-rating-models",
  },
  {
    icon: BarChart3,
    titleKey: "rabbitHole.statisticsTitle",
    descKey: "rabbitHole.statisticsDesc",
    href: "/background",
    testId: "link-rabbit-statistics",
  },
  {
    icon: BookOpen,
    titleKey: "rabbitHole.researchTitle",
    descKey: "rabbitHole.researchDesc",
    href: "/research",
    testId: "link-rabbit-research",
  },
];

export default function RabbitHole() {
  const { t } = useTranslation();

  return (
    <SimpleShell maxWidth={600}>
      <HeroWhiskyBg />
      <div data-testid="rabbit-hole-page" style={{ position: "relative", zIndex: 1 }}>
        <BackButton fallback="/my-taste" />

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <FlaskConical style={{ width: 26, height: 26, color: v.accent }} />
          <h1 style={pageTitleStyle} data-testid="text-rabbit-hole-title">
            {t("rabbitHole.title")}
          </h1>
        </div>
        <p style={{ fontSize: 13, color: v.muted, marginBottom: 28, lineHeight: 1.5 }}>
          {t("rabbitHole.subtitle")}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {CARDS.map((card) => (
            <Link key={card.testId} href={card.href} style={{ textDecoration: "none" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  padding: 16,
                  borderRadius: 12,
                  background: alpha(v.accent, "06"),
                  border: `1px solid ${alpha(v.accent, "15")}`,
                  cursor: "pointer",
                  transition: "border-color 0.2s",
                }}
                data-testid={card.testId}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: alpha(v.accent, "12"),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <card.icon style={{ width: 20, height: 20, color: v.accent }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: v.text, fontFamily: "'Playfair Display', Georgia, serif", marginBottom: 3 }}>
                    {t(card.titleKey)}
                  </div>
                  <div style={{ fontSize: 12, color: v.muted, lineHeight: 1.45 }}>
                    {t(card.descKey)}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </SimpleShell>
  );
}

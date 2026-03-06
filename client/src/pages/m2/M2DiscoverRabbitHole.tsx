import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { v, alpha } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { FlaskConical, SlidersHorizontal, BarChart3, BookOpen, ChevronRight } from "lucide-react";
import type { ElementType } from "react";

interface RCard { icon: ElementType; titleKey: string; descKey: string; href: string; testId: string; }

const CARDS: RCard[] = [
  { icon: SlidersHorizontal, titleKey: "rabbitHole.ratingModelsTitle", descKey: "rabbitHole.ratingModelsDesc", href: "/method", testId: "m2-rabbit-rating-models" },
  { icon: BarChart3, titleKey: "rabbitHole.statisticsTitle", descKey: "rabbitHole.statisticsDesc", href: "/background", testId: "m2-rabbit-statistics" },
  { icon: BookOpen, titleKey: "rabbitHole.researchTitle", descKey: "rabbitHole.researchDesc", href: "/m2/discover/research", testId: "m2-rabbit-research" },
];

export default function M2DiscoverRabbitHole() {
  const { t } = useTranslation();

  return (
    <div style={{ padding: "16px 16px 32px", maxWidth: 600, margin: "0 auto" }} data-testid="m2-discover-rabbit-hole-page">
      <M2BackButton />

      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0 4px" }}>
        <FlaskConical style={{ width: 22, height: 22, color: v.accent }} />
        <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: v.text, margin: 0 }} data-testid="text-m2-rabbit-hole-title">
          {t("rabbitHole.title", "Rabbit Hole")}
        </h1>
      </div>
      <p style={{ fontSize: 13, color: v.muted, margin: "0 0 20px", lineHeight: 1.5 }}>
        {t("rabbitHole.subtitle", "Dive deep into rating models, statistics & research")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {CARDS.map((card) => (
          <Link key={card.testId} href={card.href} style={{ textDecoration: "none" }}>
            <div
              style={{
                display: "flex", alignItems: "center", gap: 14, padding: 16, borderRadius: 12,
                background: alpha(v.accent, "06"), border: `1px solid ${alpha(v.accent, "15")}`, cursor: "pointer",
              }}
              data-testid={card.testId}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: alpha(v.accent, "12"), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <card.icon style={{ width: 20, height: 20, color: v.accent }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: v.text, fontFamily: "'Playfair Display', serif", marginBottom: 2 }}>{t(card.titleKey)}</div>
                <div style={{ fontSize: 12, color: v.muted, lineHeight: 1.4 }}>{t(card.descKey)}</div>
              </div>
              <ChevronRight style={{ width: 16, height: 16, color: v.muted, flexShrink: 0 }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

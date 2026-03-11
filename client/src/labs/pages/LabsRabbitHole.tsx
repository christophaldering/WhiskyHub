import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { FlaskConical, SlidersHorizontal, BarChart3, BookOpen, ChevronRight, ChevronLeft } from "lucide-react";
import type { ElementType } from "react";

interface RCard { icon: ElementType; titleKey: string; descKey: string; href: string; testId: string; }

const CARDS: RCard[] = [
  { icon: SlidersHorizontal, titleKey: "rabbitHole.ratingModelsTitle", descKey: "rabbitHole.ratingModelsDesc", href: "/labs/discover/method", testId: "labs-rabbit-rating-models" },
  { icon: BarChart3, titleKey: "rabbitHole.statisticsTitle", descKey: "rabbitHole.statisticsDesc", href: "/labs/discover/background", testId: "labs-rabbit-statistics" },
  { icon: BookOpen, titleKey: "rabbitHole.researchTitle", descKey: "rabbitHole.researchDesc", href: "/labs/discover/research", testId: "labs-rabbit-research" },
];

export default function LabsRabbitHole() {
  const { t } = useTranslation();

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto" data-testid="labs-discover-rabbit-hole-page">
      <Link href="/labs/discover" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-rabbit-hole">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <FlaskConical style={{ width: 22, height: 22, color: "var(--labs-accent)" }} />
        <h1 className="labs-serif" style={{ fontSize: 22, fontWeight: 700, color: "var(--labs-text)", margin: 0 }} data-testid="text-rabbit-hole-title">
          {t("rabbitHole.title", "Rabbit Hole")}
        </h1>
      </div>
      <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: "0 0 20px", lineHeight: 1.5 }}>
        {t("rabbitHole.subtitle", "Dive deep into rating models, statistics & research")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {CARDS.map((card) => (
          <Link key={card.testId} href={card.href} style={{ textDecoration: "none" }}>
            <div className="labs-card" style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, cursor: "pointer" }} data-testid={card.testId}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--labs-surface-elevated)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <card.icon style={{ width: 20, height: 20, color: "var(--labs-accent)" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="labs-serif" style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)", marginBottom: 2 }}>{t(card.titleKey)}</div>
                <div style={{ fontSize: 12, color: "var(--labs-text-muted)", lineHeight: 1.4 }}>{t(card.descKey)}</div>
              </div>
              <ChevronRight style={{ width: 16, height: 16, color: "var(--labs-text-muted)", flexShrink: 0 }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

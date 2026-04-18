import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { FlaskConical, Archive, ChevronLeft } from "lucide-react";
import BackLink from "@/labs/components/BackLink";
import type { ElementType } from "react";

interface RCard { icon: ElementType; titleKey: string; descKey: string; href: string; testId: string; }

const CARDS: RCard[] = [
  { icon: Archive, titleKey: "rabbitHole.themenspeicherTitle", descKey: "rabbitHole.themenspeicherDesc", href: "/labs/discover/rabbit-hole/themenspeicher", testId: "labs-rabbit-themenspeicher" },
];

export default function LabsRabbitHole() {
  const { t } = useTranslation();

  return (
    <div className="labs-page" data-testid="labs-discover-rabbit-hole-page">
      <BackLink href="/labs/bibliothek" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-rabbit-hole">
          <ChevronLeft className="w-4 h-4" /> {t("bibliothek.title", "Library")}
        </button>
      </BackLink>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <FlaskConical style={{ width: 22, height: 22, color: "var(--labs-accent)" }} />
        <h1 className="labs-serif" style={{ fontSize: 22, fontWeight: 700, color: "var(--labs-text)", margin: 0 }} data-testid="text-rabbit-hole-title">
          {t("rabbitHole.title", "Rabbit Hole")}
        </h1>
      </div>
      <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: "0 0 20px", lineHeight: 1.5 }}>
        {t("rabbitHole.subtitle", "Open questions and topics worth exploring later.")}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
        {CARDS.map((card) => (
          <Link key={card.testId} href={card.href} style={{ textDecoration: "none" }}>
            <div
              className="labs-card"
              data-testid={card.testId}
              style={{
                minHeight: 92,
                padding: "14px 16px",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                cursor: "pointer",
              }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--labs-surface-elevated)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <card.icon style={{ width: 18, height: 18, color: "var(--labs-accent)" }} strokeWidth={1.8} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="labs-serif" style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)", lineHeight: 1.25 }}>{t(card.titleKey)}</div>
                <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginTop: 3, lineHeight: 1.35 }}>{t(card.descKey)}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

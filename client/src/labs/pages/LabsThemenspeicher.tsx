import { useTranslation } from "react-i18next";
import { ChevronLeft, Archive, Lightbulb, Layers, Sparkles, HelpCircle } from "lucide-react";
import BackLink from "@/labs/components/BackLink";
import type { ElementType } from "react";

interface EntrySection {
  key: string;
  icon: ElementType;
  titleKey: string;
  bodyKey: string;
}

const SECTIONS: EntrySection[] = [
  { key: "variables", icon: Layers, titleKey: "rabbitHole.themenspeicher.entry1.variablesTitle", bodyKey: "rabbitHole.themenspeicher.entry1.variablesBody" },
  { key: "core", icon: Lightbulb, titleKey: "rabbitHole.themenspeicher.entry1.coreTitle", bodyKey: "rabbitHole.themenspeicher.entry1.coreBody" },
  { key: "idea", icon: Sparkles, titleKey: "rabbitHole.themenspeicher.entry1.ideaTitle", bodyKey: "rabbitHole.themenspeicher.entry1.ideaBody" },
  { key: "question", icon: HelpCircle, titleKey: "rabbitHole.themenspeicher.entry1.questionTitle", bodyKey: "rabbitHole.themenspeicher.entry1.questionBody" },
];

export default function LabsThemenspeicher() {
  const { t } = useTranslation();

  return (
    <div className="labs-page" data-testid="labs-themenspeicher-page">
      <BackLink href="/labs/discover/rabbit-hole" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-themenspeicher">
          <ChevronLeft className="w-4 h-4" /> {t("rabbitHole.title", "Rabbit Hole")}
        </button>
      </BackLink>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Archive style={{ width: 22, height: 22, color: "var(--labs-accent)" }} />
        <h1 className="labs-serif" style={{ fontSize: 22, fontWeight: 700, color: "var(--labs-text)", margin: 0 }} data-testid="text-themenspeicher-title">
          {t("rabbitHole.themenspeicherTitle", "Themenspeicher")}
        </h1>
      </div>
      <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: "0 0 20px", lineHeight: 1.5 }}>
        {t("rabbitHole.themenspeicherDesc", "Offene Fragen und Ideen zur späteren Vertiefung.")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <article className="labs-card" style={{ padding: 18 }} data-testid="entry-themenspeicher-context">
          <h2 className="labs-serif" style={{ fontSize: 16, fontWeight: 700, color: "var(--labs-text)", margin: "0 0 6px" }} data-testid="text-entry-title-context">
            {t("rabbitHole.themenspeicher.entry1.title", "Kontextabhängigkeit von Whisky-Bewertungen")}
          </h2>
          <p style={{ fontSize: 12, color: "var(--labs-text-muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
            {t("rabbitHole.themenspeicher.entry1.subtitle", "Wie Setting, Stimmung und Begleitung Bewertungen prägen.")}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {SECTIONS.map((section) => (
              <div key={section.key} style={{ borderTop: "1px solid var(--labs-border)", paddingTop: 12 }}>
                <h3 className="labs-serif" style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)", margin: "0 0 6px", display: "flex", alignItems: "center", gap: 6 }}>
                  <section.icon style={{ width: 14, height: 14, color: "var(--labs-accent)" }} />
                  {t(section.titleKey)}
                </h3>
                <p style={{ fontSize: 12, color: "var(--labs-text-secondary)", lineHeight: 1.6, margin: 0, whiteSpace: "pre-line" }}>
                  {t(section.bodyKey)}
                </p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}

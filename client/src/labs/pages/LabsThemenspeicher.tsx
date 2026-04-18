import { useTranslation } from "react-i18next";
import { ChevronLeft, Archive, Lightbulb, Layers, Sparkles, HelpCircle } from "lucide-react";
import BackLink from "@/labs/components/BackLink";
import type { ElementType } from "react";

interface EntrySection {
  key: string;
  icon: ElementType;
  titleSuffix: "variablesTitle" | "coreTitle" | "ideaTitle" | "questionTitle";
  bodySuffix: "variablesBody" | "coreBody" | "ideaBody" | "questionBody";
}

const SECTION_TEMPLATE: EntrySection[] = [
  { key: "variables", icon: Layers, titleSuffix: "variablesTitle", bodySuffix: "variablesBody" },
  { key: "core", icon: Lightbulb, titleSuffix: "coreTitle", bodySuffix: "coreBody" },
  { key: "idea", icon: Sparkles, titleSuffix: "ideaTitle", bodySuffix: "ideaBody" },
  { key: "question", icon: HelpCircle, titleSuffix: "questionTitle", bodySuffix: "questionBody" },
];

interface Entry {
  id: string;
  i18nKey: string;
  testId: string;
}

const ENTRIES: Entry[] = [
  { id: "context", i18nKey: "entry1", testId: "entry-themenspeicher-context" },
  { id: "learning", i18nKey: "entry2", testId: "entry-themenspeicher-learning" },
  { id: "language", i18nKey: "entry3", testId: "entry-themenspeicher-language" },
  { id: "expectations", i18nKey: "entry4", testId: "entry-themenspeicher-expectations" },
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
        {ENTRIES.map((entry) => (
          <article key={entry.id} className="labs-card" style={{ padding: 18 }} data-testid={entry.testId}>
            <h2 className="labs-serif" style={{ fontSize: 16, fontWeight: 700, color: "var(--labs-text)", margin: "0 0 6px" }} data-testid={`text-entry-title-${entry.id}`}>
              {t(`rabbitHole.themenspeicher.${entry.i18nKey}.title`)}
            </h2>
            <p style={{ fontSize: 12, color: "var(--labs-text-muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
              {t(`rabbitHole.themenspeicher.${entry.i18nKey}.subtitle`)}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {SECTION_TEMPLATE.map((section) => (
                <div key={section.key} style={{ borderTop: "1px solid var(--labs-border)", paddingTop: 12 }}>
                  <h3 className="labs-serif" style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)", margin: "0 0 6px", display: "flex", alignItems: "center", gap: 6 }}>
                    <section.icon style={{ width: 14, height: 14, color: "var(--labs-accent)" }} />
                    {t(`rabbitHole.themenspeicher.${entry.i18nKey}.${section.titleSuffix}`)}
                  </h3>
                  <p style={{ fontSize: 12, color: "var(--labs-text-secondary)", lineHeight: 1.6, margin: 0, whiteSpace: "pre-line" }}>
                    {t(`rabbitHole.themenspeicher.${entry.i18nKey}.${section.bodySuffix}`)}
                  </p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

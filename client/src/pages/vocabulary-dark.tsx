import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Check, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import SimpleShell from "@/components/simple/simple-shell";
import { c, cardStyle } from "@/lib/theme";

const CATEGORY_IDS = ["islay", "speyside", "sherry", "bourbon", "highland", "japanese"] as const;
const CATEGORY_ICONS: Record<string, string> = {
  islay: "🔥",
  speyside: "🍎",
  sherry: "🍷",
  bourbon: "🌽",
  highland: "⛰️",
  japanese: "🎌",
};

function VocabSection({
  title,
  terms,
  sectionId,
  copiedSection,
  onCopy,
}: {
  title: string;
  terms: string[];
  sectionId: string;
  copiedSection: string | null;
  onCopy: (text: string, sectionId: string) => void;
}) {
  const isCopied = copiedSection === sectionId;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: c.accent, textTransform: "uppercase", letterSpacing: 1 }}>
          {title}
        </span>
        <button
          onClick={() => onCopy(terms.join(", "), sectionId)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: isCopied ? c.success : c.muted }}
          data-testid={`button-copy-${sectionId}`}
        >
          {isCopied ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
        </button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {terms.map((term) => (
          <span
            key={term}
            style={{
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 20,
              background: `${c.accent}12`,
              color: c.text,
              border: `1px solid ${c.border}`,
            }}
          >
            {term}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function VocabularyDark() {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(sectionId);
      setTimeout(() => setCopiedSection(null), 2000);
    });
  };

  return (
    <SimpleShell maxWidth={600}>
      <div data-testid="vocabulary-page">
        <div style={{ marginBottom: 16 }}>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 22,
              fontWeight: 700,
              color: c.accent,
              marginBottom: 4,
            }}
            data-testid="text-vocabulary-title"
          >
            {t("vocabularyPage.title")}
          </h1>
          <p style={{ fontSize: 13, color: c.muted, margin: 0 }}>
            {t("vocabularyPage.subtitle")}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {CATEGORY_IDS.map((catId) => {
            const isExpanded = expandedId === catId;
            const name = t(`vocabCategories.${catId}.name`);
            const desc = t(`vocabCategories.${catId}.desc`);
            const noseTerms = t(`vocabCategories.${catId}.nose`, { returnObjects: true }) as string[];
            const palateTerms = t(`vocabCategories.${catId}.palate`, { returnObjects: true }) as string[];
            const finishTerms = t(`vocabCategories.${catId}.finish`, { returnObjects: true }) as string[];
            const tips = t(`vocabCategories.${catId}.tips`);

            return (
              <div
                key={catId}
                style={{
                  ...cardStyle,
                  padding: 0,
                  overflow: "hidden",
                }}
                data-testid={`card-vocab-${catId}`}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : catId)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "16px 18px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    color: c.text,
                  }}
                  data-testid={`button-vocab-${catId}`}
                >
                  <span style={{ fontSize: 24 }}>{CATEGORY_ICONS[catId]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 600 }}>
                      {name}
                    </div>
                    <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{desc}</div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp style={{ width: 18, height: 18, color: c.muted, flexShrink: 0 }} />
                  ) : (
                    <ChevronDown style={{ width: 18, height: 18, color: c.muted, flexShrink: 0 }} />
                  )}
                </button>

                {isExpanded && (
                  <div style={{ padding: "0 18px 18px", borderTop: `1px solid ${c.border}` }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 16 }}>
                      <VocabSection
                        title={t("vocabCategories.noseSection")}
                        terms={noseTerms}
                        sectionId={`${catId}-nose`}
                        copiedSection={copiedSection}
                        onCopy={copyToClipboard}
                      />
                      <VocabSection
                        title={t("vocabCategories.palateSection")}
                        terms={palateTerms}
                        sectionId={`${catId}-palate`}
                        copiedSection={copiedSection}
                        onCopy={copyToClipboard}
                      />
                      <VocabSection
                        title={t("vocabCategories.finishSection")}
                        terms={finishTerms}
                        sectionId={`${catId}-finish`}
                        copiedSection={copiedSection}
                        onCopy={copyToClipboard}
                      />
                    </div>

                    <div
                      style={{
                        marginTop: 20,
                        padding: "12px 14px",
                        background: `${c.accent}0a`,
                        borderRadius: 10,
                        border: `1px solid ${c.accent}20`,
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                      }}
                    >
                      <Lightbulb style={{ width: 14, height: 14, color: c.accent, marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: c.accent, marginBottom: 4 }}>
                          {t("vocabCategories.expertTip")}
                        </div>
                        <div style={{ fontSize: 12, color: c.muted, lineHeight: 1.5 }}>{tips}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </SimpleShell>
  );
}

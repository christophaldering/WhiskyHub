import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useState } from "react";
import { FileText, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_IDS = ["islay", "speyside", "sherry", "bourbon", "highland", "japanese"] as const;
const CATEGORY_ICONS: Record<string, string> = {
  islay: "🔥",
  speyside: "🍎",
  sherry: "🍷",
  bourbon: "🌽",
  highland: "⛰️",
  japanese: "🎌",
};

export default function TastingTemplates() {
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
    <div className="max-w-4xl mx-auto px-4 py-8 min-w-0 overflow-x-hidden" data-testid="templates-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-7 h-7 text-primary" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-templates-title">
            {t("tastingTemplates.title")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">{t("tastingTemplates.subtitle")}</p>

        <div className="space-y-4">
          {CATEGORY_IDS.map((catId, index) => {
            const isExpanded = expandedId === catId;
            const name = t(`vocabCategories.${catId}.name`);
            const desc = t(`vocabCategories.${catId}.desc`);
            const noseTerms = t(`vocabCategories.${catId}.nose`, { returnObjects: true }) as string[];
            const palateTerms = t(`vocabCategories.${catId}.palate`, { returnObjects: true }) as string[];
            const finishTerms = t(`vocabCategories.${catId}.finish`, { returnObjects: true }) as string[];
            const tips = t(`vocabCategories.${catId}.tips`);

            return (
              <motion.div
                key={catId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-card rounded-lg border border-border/40 overflow-hidden"
                data-testid={`card-template-${catId}`}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : catId)}
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-secondary/30 transition-colors"
                  data-testid={`button-template-${catId}`}
                >
                  <span className="text-2xl">{CATEGORY_ICONS[catId]}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-serif font-semibold text-foreground">{name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" /> : <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />}
                </button>

                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.3 }}
                    className="px-5 pb-5 border-t border-border/20"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4">
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

                    <div className="mt-5 p-4 bg-primary/5 rounded-md border border-primary/10">
                      <p className="text-xs font-serif font-semibold text-primary/80 mb-1">
                        💡 {t("vocabCategories.tip")}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{tips}</p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

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
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-serif font-semibold text-foreground uppercase tracking-wider">{title}</h4>
        <button
          onClick={() => onCopy(terms.join(", "), sectionId)}
          className="text-muted-foreground hover:text-primary transition-colors"
          title="Copy"
        >
          {isCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {terms.map((term) => (
          <span
            key={term}
            className="text-[11px] px-2 py-1 rounded-full bg-secondary/60 text-foreground/80 hover:bg-primary/10 hover:text-primary cursor-default transition-colors"
          >
            {term}
          </span>
        ))}
      </div>
    </div>
  );
}

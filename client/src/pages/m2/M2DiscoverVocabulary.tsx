import { useState } from "react";
import { useTranslation } from "react-i18next";
import { v, alpha } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { Copy, Check, ChevronDown, ChevronUp, Lightbulb, MessageSquare } from "lucide-react";

const CATEGORY_IDS = ["islay", "speyside", "sherry", "bourbon", "highland", "japanese"] as const;
const ICONS: Record<string, string> = { islay: "🔥", speyside: "🍎", sherry: "🍷", bourbon: "🌽", highland: "⛰️", japanese: "🎌" };

function VocabSection({ title, terms, id, copied, onCopy }: { title: string; terms: string[]; id: string; copied: string | null; onCopy: (t: string, id: string) => void }) {
  const isCopied = copied === id;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: v.accent, textTransform: "uppercase", letterSpacing: 1 }}>{title}</span>
        <button onClick={() => onCopy(terms.join(", "), id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 3, color: isCopied ? v.success : v.muted }} data-testid={`m2-vcopy-${id}`}>
          {isCopied ? <Check style={{ width: 13, height: 13 }} /> : <Copy style={{ width: 13, height: 13 }} />}
        </button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {terms.map((t) => <span key={t} style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20, background: alpha(v.accent, "12"), color: v.text, border: `1px solid ${v.border}` }}>{t}</span>)}
      </div>
    </div>
  );
}

export default function M2DiscoverVocabulary() {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(id); setTimeout(() => setCopied(null), 2000); });
  };

  return (
    <div style={{ padding: "16px 16px 32px", maxWidth: 600, margin: "0 auto" }} data-testid="m2-discover-vocabulary-page">
      <M2BackButton />
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0 4px" }}>
        <MessageSquare style={{ width: 22, height: 22, color: v.accent }} />
        <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: v.text, margin: 0 }} data-testid="text-m2-vocabulary-title">
          {t("vocabularyPage.title", "Vocabulary")}
        </h1>
      </div>
      <p style={{ fontSize: 13, color: v.muted, margin: "0 0 20px" }}>{t("vocabularyPage.subtitle", "Copy-paste vocabulary cards for your tasting notes")}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {CATEGORY_IDS.map((id) => {
          const isOpen = expandedId === id;
          const name = t(`vocabCategories.${id}.name`);
          const desc = t(`vocabCategories.${id}.desc`);
          const nose = t(`vocabCategories.${id}.nose`, { returnObjects: true }) as string[];
          const palate = t(`vocabCategories.${id}.palate`, { returnObjects: true }) as string[];
          const finish = t(`vocabCategories.${id}.finish`, { returnObjects: true }) as string[];
          const tips = t(`vocabCategories.${id}.tips`);

          return (
            <div key={id} style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, overflow: "hidden" }} data-testid={`m2-vocab-${id}`}>
              <button onClick={() => setExpandedId(isOpen ? null : id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", color: v.text, textAlign: "left" }}>
                <span style={{ fontSize: 22 }}>{ICONS[id]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 600 }}>{name}</div>
                  <div style={{ fontSize: 11, color: v.muted, marginTop: 1 }}>{desc}</div>
                </div>
                {isOpen ? <ChevronUp style={{ width: 14, height: 14, color: v.muted, flexShrink: 0 }} /> : <ChevronDown style={{ width: 14, height: 14, color: v.muted, flexShrink: 0 }} />}
              </button>
              {isOpen && (
                <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${v.border}` }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 14 }}>
                    <VocabSection title={t("vocabCategories.noseSection")} terms={nose} id={`${id}-nose`} copied={copied} onCopy={copy} />
                    <VocabSection title={t("vocabCategories.palateSection")} terms={palate} id={`${id}-palate`} copied={copied} onCopy={copy} />
                    <VocabSection title={t("vocabCategories.finishSection")} terms={finish} id={`${id}-finish`} copied={copied} onCopy={copy} />
                  </div>
                  <div style={{ marginTop: 16, padding: "10px 12px", background: alpha(v.accent, "08"), borderRadius: 8, border: `1px solid ${alpha(v.accent, "18")}`, display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <Lightbulb style={{ width: 12, height: 12, color: v.accent, marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: v.accent, marginBottom: 3 }}>{t("vocabCategories.expertTip", "Expert Tip")}</div>
                      <div style={{ fontSize: 11, color: v.muted, lineHeight: 1.5 }}>{tips}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

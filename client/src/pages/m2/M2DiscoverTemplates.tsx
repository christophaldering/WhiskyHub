import { useState } from "react";
import { useTranslation } from "react-i18next";
import { v, alpha } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { Copy, Check, ChevronDown, ChevronUp, Lightbulb, FileText } from "lucide-react";

const CATEGORY_IDS = ["islay", "speyside", "sherry", "bourbon", "highland", "japanese"] as const;
const ICONS: Record<string, string> = { islay: "🔥", speyside: "🍎", sherry: "🍷", bourbon: "🌽", highland: "⛰️", japanese: "🎌" };

function Pills({ terms }: { terms: string[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {terms.map((t) => <span key={t} style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20, background: alpha(v.accent, "12"), color: v.text, border: `1px solid ${v.border}` }}>{t}</span>)}
    </div>
  );
}

function Section({ title, terms, id, copied, onCopy }: { title: string; terms: string[]; id: string; copied: string | null; onCopy: (t: string, id: string) => void }) {
  const isCopied = copied === id;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: v.accent }}>{title}</span>
        <button onClick={() => onCopy(terms.join(", "), id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 3, color: isCopied ? v.success : v.muted }} data-testid={`m2-copy-${id}`}>
          {isCopied ? <Check style={{ width: 13, height: 13 }} /> : <Copy style={{ width: 13, height: 13 }} />}
        </button>
      </div>
      <Pills terms={terms} />
    </div>
  );
}

export default function M2DiscoverTemplates() {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(id); setTimeout(() => setCopied(null), 2000); });
  };

  return (
    <div style={{ padding: "16px 16px 32px", maxWidth: 600, margin: "0 auto" }} data-testid="m2-discover-templates-page">
      <M2BackButton />
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0 4px" }}>
        <FileText style={{ width: 22, height: 22, color: v.accent }} />
        <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: v.text, margin: 0 }} data-testid="text-m2-templates-title">
          {t("m2.discover.templates", "Tasting Templates")}
        </h1>
      </div>
      <p style={{ fontSize: 13, color: v.muted, margin: "0 0 20px" }}>{t("discoverTemplates.subtitle", "Copy-paste vocabulary for your tasting notes")}</p>

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
            <div key={id} style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, overflow: "hidden" }} data-testid={`m2-template-${id}`}>
              <button onClick={() => setExpandedId(isOpen ? null : id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", color: v.text, textAlign: "left" }}>
                <span style={{ fontSize: 22 }}>{ICONS[id]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "'Playfair Display', serif" }}>{name}</div>
                  <div style={{ fontSize: 11, color: v.muted, marginTop: 1 }}>{desc}</div>
                </div>
                {isOpen ? <ChevronUp style={{ width: 14, height: 14, color: v.muted, flexShrink: 0 }} /> : <ChevronDown style={{ width: 14, height: 14, color: v.muted, flexShrink: 0 }} />}
              </button>
              {isOpen && (
                <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${v.border}` }}>
                  <div style={{ marginTop: 14 }}>
                    <Section title={t("vocabCategories.noseSection")} terms={nose} id={`${id}-nose`} copied={copied} onCopy={copy} />
                    <Section title={t("vocabCategories.palateSection")} terms={palate} id={`${id}-palate`} copied={copied} onCopy={copy} />
                    <Section title={t("vocabCategories.finishSection")} terms={finish} id={`${id}-finish`} copied={copied} onCopy={copy} />
                  </div>
                  <div style={{ padding: "10px 12px", background: alpha(v.accent, "08"), borderRadius: 8, border: `1px solid ${alpha(v.accent, "18")}` }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: v.accent, marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}>
                      <Lightbulb style={{ width: 12, height: 12 }} />{t("vocabCategories.expertTip", "Expert Tip")}
                    </div>
                    <div style={{ fontSize: 11, color: v.muted, lineHeight: 1.5 }}>{tips}</div>
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

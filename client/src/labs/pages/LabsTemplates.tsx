import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Copy, Check, ChevronDown, ChevronUp, Lightbulb, FileText, ChevronLeft } from "lucide-react";

const CATEGORY_IDS = ["islay", "speyside", "sherry", "bourbon", "highland", "japanese"] as const;
const ICONS: Record<string, string> = { islay: "\uD83D\uDD25", speyside: "\uD83C\uDF4E", sherry: "\uD83C\uDF77", bourbon: "\uD83C\uDF3D", highland: "\u26F0\uFE0F", japanese: "\uD83C\uDDEF\uD83C\uDDF5" };

function Pills({ terms }: { terms: string[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {terms.map((t) => <span key={t} style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20, background: "var(--labs-surface-elevated)", color: "var(--labs-text)", border: "1px solid var(--labs-border)" }}>{t}</span>)}
    </div>
  );
}

function Section({ title, terms, id, copied, onCopy }: { title: string; terms: string[]; id: string; copied: string | null; onCopy: (t: string, id: string) => void }) {
  const isCopied = copied === id;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "var(--labs-accent)" }}>{title}</span>
        <button onClick={() => onCopy(terms.join(", "), id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 3, color: isCopied ? "var(--labs-success)" : "var(--labs-text-muted)" }} data-testid={`button-copy-${id}`}>
          {isCopied ? <Check style={{ width: 13, height: 13 }} /> : <Copy style={{ width: 13, height: 13 }} />}
        </button>
      </div>
      <Pills terms={terms} />
    </div>
  );
}

export default function LabsTemplates() {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(id); setTimeout(() => setCopied(null), 2000); });
  };

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto" data-testid="labs-discover-templates-page">
      <Link href="/labs/discover" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-templates">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <FileText style={{ width: 22, height: 22, color: "var(--labs-accent)" }} />
        <h1 className="labs-serif" style={{ fontSize: 22, fontWeight: 700, color: "var(--labs-text)", margin: 0 }} data-testid="text-templates-title">
          Tasting Templates
        </h1>
      </div>
      <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: "0 0 20px" }}>Copy-paste vocabulary for your tasting notes</p>

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
            <div key={id} className="labs-card" style={{ overflow: "hidden" }} data-testid={`labs-template-${id}`}>
              <button onClick={() => setExpandedId(isOpen ? null : id)} className="labs-btn-ghost" style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", textAlign: "left" }} data-testid={`button-toggle-template-${id}`}>
                <span style={{ fontSize: 22 }}>{ICONS[id]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="labs-serif" style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>{name}</div>
                  <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 1 }}>{desc}</div>
                </div>
                {isOpen ? <ChevronUp style={{ width: 14, height: 14, color: "var(--labs-text-muted)", flexShrink: 0 }} /> : <ChevronDown style={{ width: 14, height: 14, color: "var(--labs-text-muted)", flexShrink: 0 }} />}
              </button>
              {isOpen && (
                <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--labs-border)" }}>
                  <div style={{ marginTop: 14 }}>
                    <Section title={t("vocabCategories.noseSection")} terms={nose} id={`${id}-nose`} copied={copied} onCopy={copy} />
                    <Section title={t("vocabCategories.palateSection")} terms={palate} id={`${id}-palate`} copied={copied} onCopy={copy} />
                    <Section title={t("vocabCategories.finishSection")} terms={finish} id={`${id}-finish`} copied={copied} onCopy={copy} />
                  </div>
                  <div style={{ padding: "10px 12px", background: "var(--labs-surface-elevated)", borderRadius: 8, border: "1px solid var(--labs-border)" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--labs-accent)", marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}>
                      <Lightbulb style={{ width: 12, height: 12 }} />Expert Tip
                    </div>
                    <div style={{ fontSize: 11, color: "var(--labs-text-muted)", lineHeight: 1.5 }}>{tips}</div>
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

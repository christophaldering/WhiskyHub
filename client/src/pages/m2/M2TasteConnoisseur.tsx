import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { v, alpha } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { useSession } from "@/lib/session";
import { pidHeaders } from "@/lib/api";
import { Sparkles, Copy, Check, ChevronDown, Download, FileText, Trash2 } from "lucide-react";
import AILanguageSelector from "@/components/m2/AILanguageSelector";
import PromptEditor from "@/components/m2/PromptEditor";

interface ConnoisseurReport {
  id: string;
  participantId: string;
  generatedAt: string;
  reportContent: string;
  summary: string;
  dataSnapshot: Record<string, any> | null;
  language: string;
}

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} style={{ margin: "8px 0 16px 0", paddingLeft: 20 }}>
          {listItems.map((item, i) => (
            <li key={i} style={{ fontSize: 14, lineHeight: 1.7, color: v.text, marginBottom: 4, fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif" }}>
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const renderInline = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let idx = 0;
    const boldRegex = /\*\*(.+?)\*\*/g;
    let match;
    let lastIndex = 0;
    while ((match = boldRegex.exec(remaining)) !== null) {
      if (match.index > lastIndex) {
        parts.push(remaining.slice(lastIndex, match.index));
      }
      parts.push(<strong key={idx++} style={{ fontWeight: 600, color: v.text }}>{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < remaining.length) {
      parts.push(remaining.slice(lastIndex));
    }
    return parts.length > 0 ? parts : text;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.match(/^---+$/)) {
      flushList();
      elements.push(
        <hr key={`hr-${i}`} style={{ border: "none", borderTop: `1px solid ${v.border}`, margin: "24px 0" }} />
      );
      continue;
    }

    if (line.startsWith("### ")) {
      flushList();
      elements.push(
        <h3 key={`h3-${i}`} style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 16, fontWeight: 700, color: v.text, margin: "20px 0 8px" }}>
          {line.slice(4)}
        </h3>
      );
      continue;
    }

    if (line.startsWith("## ")) {
      flushList();
      elements.push(
        <h2 key={`h2-${i}`} style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 700, color: v.text, margin: "24px 0 10px" }}>
          {line.slice(3)}
        </h2>
      );
      continue;
    }

    if (line.startsWith("# ")) {
      flushList();
      elements.push(
        <h1 key={`h1-${i}`} style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 700, color: v.text, margin: "28px 0 12px" }}>
          {line.slice(2)}
        </h1>
      );
      continue;
    }

    if (line.match(/^[-*]\s/)) {
      listItems.push(line.replace(/^[-*]\s/, ""));
      continue;
    }

    flushList();

    if (line.trim() === "") {
      continue;
    }

    elements.push(
      <p key={`p-${i}`} style={{ fontSize: 14, lineHeight: 1.7, color: v.text, margin: "0 0 12px", fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif" }}>
        {renderInline(line)}
      </p>
    );
  }

  flushList();
  return <div>{elements}</div>;
}

function SkeletonLoader({ message }: { message: string }) {
  return (
    <div style={{ padding: "32px 0" }} data-testid="connoisseur-generating">
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <Sparkles style={{ width: 32, height: 32, color: v.accent, animation: "pulse 2s ease-in-out infinite" }} />
        <p style={{ fontSize: 15, color: v.accent, marginTop: 12, fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif", fontWeight: 500 }}>
          {message}
        </p>
      </div>
      {[100, 85, 92, 70, 88, 95, 60].map((w, i) => (
        <div
          key={i}
          style={{
            height: i === 0 ? 24 : 14,
            width: `${w}%`,
            background: alpha(v.accent, "10"),
            borderRadius: 6,
            marginBottom: i === 0 ? 16 : 10,
            animation: "pulse 2s ease-in-out infinite",
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
    </div>
  );
}

function SnapshotComparison({ latest, previous }: { latest: Record<string, any>; previous: Record<string, any> }) {
  const { t } = useTranslation();
  const keys = [
    { key: "totalRatings", label: "Ratings" },
    { key: "totalTastings", label: "Tastings" },
    { key: "topRegion", label: "Top Region" },
    { key: "collectionSize", label: "Collection" },
  ];

  return (
    <div style={{ marginTop: 16 }} data-testid="connoisseur-comparison">
      <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: v.muted, marginBottom: 12 }}>
        {t("m2.connoisseur.comparison", "Your Development")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, border: `1px solid ${v.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "10px 12px", background: alpha(v.accent, "06"), borderBottom: `1px solid ${v.border}` }}>
          <span style={{ fontSize: 11, color: v.muted }}>&nbsp;</span>
        </div>
        <div style={{ padding: "10px 12px", background: alpha(v.accent, "06"), borderBottom: `1px solid ${v.border}`, textAlign: "center" }}>
          <span style={{ fontSize: 11, color: v.muted, fontWeight: 600 }}>Previous</span>
        </div>
        <div style={{ padding: "10px 12px", background: alpha(v.accent, "06"), borderBottom: `1px solid ${v.border}`, textAlign: "center" }}>
          <span style={{ fontSize: 11, color: v.accent, fontWeight: 600 }}>Latest</span>
        </div>
        {keys.map((k) => {
          const prev = previous?.[k.key] ?? "—";
          const curr = latest?.[k.key] ?? "—";
          return [
            <div key={`${k.key}-label`} style={{ padding: "8px 12px", fontSize: 12, color: v.textSecondary, borderBottom: `1px solid ${v.border}` }}>{k.label}</div>,
            <div key={`${k.key}-prev`} style={{ padding: "8px 12px", fontSize: 13, color: v.muted, textAlign: "center", borderBottom: `1px solid ${v.border}`, fontVariantNumeric: "tabular-nums" }}>{typeof prev === "number" ? prev.toFixed(1) : prev}</div>,
            <div key={`${k.key}-curr`} style={{ padding: "8px 12px", fontSize: 13, color: v.text, textAlign: "center", borderBottom: `1px solid ${v.border}`, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{typeof curr === "number" ? curr.toFixed(1) : curr}</div>,
          ];
        })}
      </div>
    </div>
  );
}

export default function M2TasteConnoisseur() {
  const { t, i18n } = useTranslation();
  const session = useSession();
  const pid = session.pid;
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [aiLang, setAiLang] = useState<"de" | "en">(i18n.language?.startsWith("de") ? "de" : "en");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");

  const { data: reports = [], isLoading } = useQuery<ConnoisseurReport[]>({
    queryKey: ["connoisseur-reports", pid],
    queryFn: async () => {
      if (!pid) return [];
      const res = await fetch(`/api/participants/${pid}/connoisseur-reports`, { headers: pidHeaders() });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!pid,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      let res: Response;
      try {
        res = await fetch(`/api/participants/${pid}/connoisseur-report`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...pidHeaders() },
          body: JSON.stringify({ language: aiLang, ...(customPrompt.trim() ? { customPrompt: customPrompt.trim() } : {}) }),
        });
      } catch {
        throw new Error(t("m2.connoisseur.networkError", "Connection lost — the AI analysis takes ~15 seconds. Please check your connection and try again."));
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || t("m2.connoisseur.generationFailed", "Generation failed. Please try again."));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connoisseur-reports", pid] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const res = await fetch(`/api/participants/${pid}/connoisseur-reports/${reportId}`, {
        method: "DELETE",
        headers: pidHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Delete failed");
      }
    },
    onSuccess: () => {
      setConfirmDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["connoisseur-reports", pid] });
    },
  });

  const latestReport = reports.length > 0 ? reports[0] : null;
  const previousReports = reports.slice(1);

  const copySummary = async () => {
    if (!latestReport?.summary) return;
    try {
      await navigator.clipboard.writeText(latestReport.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const downloadPdf = async () => {
    if (!latestReport) return;
    try {
      const mod = await import("@/components/connoisseur-report-pdf");
      mod.generateConnoisseurReportPdf({
        report: latestReport as any,
        participantName: session.name || "Participant",
        language: latestReport.language || "en",
      });
    } catch (e) {
      console.error("PDF generation failed:", e);
    }
  };

  return (
    <div style={{ padding: "16px 16px 100px", maxWidth: 600, margin: "0 auto" }} data-testid="m2-taste-connoisseur">
      <M2BackButton />

      <div style={{ marginTop: 8, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Sparkles style={{ width: 24, height: 24, color: v.accent }} />
          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 28,
              fontWeight: 700,
              color: v.text,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
            data-testid="text-connoisseur-title"
          >
            {t("m2.connoisseur.title", "Connoisseur Report")}
          </h1>
        </div>
        <p style={{ fontSize: 14, color: v.textSecondary, margin: 0, fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif", lineHeight: 1.5 }}>
          {t("m2.connoisseur.subtitle", "Your personal whisky profile, analyzed by AI")}
        </p>
      </div>

      <AILanguageSelector value={aiLang} onChange={setAiLang} />

      <PromptEditor
        value={customPrompt}
        onChange={setCustomPrompt}
        basePromptKey="promptEditor.connoisseurBase"
        placeholderKey="customPrompt.connoisseurPlaceholder"
        placeholderFallback="e.g. 'Focus on smoky whiskies' or 'Compare with my last tasting'"
        testIdPrefix="connoisseur-prompt"
        variant="collapsible"
      />

      <button
        onClick={() => generateMutation.mutate()}
        disabled={generateMutation.isPending}
        style={{
          width: "100%",
          padding: "14px 20px",
          background: generateMutation.isPending ? alpha(v.accent, "40") : v.accent,
          color: v.bg,
          border: "none",
          borderRadius: 12,
          fontSize: 15,
          fontWeight: 600,
          cursor: generateMutation.isPending ? "wait" : "pointer",
          fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginBottom: 24,
          transition: "opacity 0.2s",
        }}
        data-testid="button-generate-report"
      >
        <Sparkles style={{ width: 18, height: 18 }} />
        {generateMutation.isPending
          ? t("m2.connoisseur.generating", "Analyzing your whisky journey...")
          : t("m2.connoisseur.generate", "Generate Report")}
      </button>

      {generateMutation.isPending && (
        <SkeletonLoader message={t("m2.connoisseur.generating", "Analyzing your whisky journey...")} />
      )}

      {generateMutation.isError && (
        <div
          style={{
            background: alpha(v.danger, "10"),
            border: `1px solid ${alpha(v.danger, "30")}`,
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 16,
            fontSize: 13,
            color: v.danger,
            lineHeight: 1.5,
          }}
          data-testid="text-connoisseur-error"
        >
          <div style={{ marginBottom: 10 }}>
            {generateMutation.error?.message || t("m2.connoisseur.generationFailed", "Generation failed. Please try again.")}
          </div>
          <button
            onClick={() => generateMutation.mutate()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              background: v.accent,
              color: v.bg,
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
            }}
            data-testid="button-retry-generate"
          >
            {t("m2.connoisseur.retry", "Try again")}
          </button>
        </div>
      )}

      {!generateMutation.isPending && latestReport && (
        <>
          <div
            style={{
              background: v.card,
              border: `1px solid ${v.accent}`,
              borderRadius: 16,
              padding: "16px",
              marginBottom: 16,
              position: "relative",
            }}
            data-testid="card-connoisseur-summary"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: v.accent }}>
                  Summary
                </div>
                <div style={{ fontSize: 12, color: v.muted, marginTop: 4, fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif" }} data-testid="text-report-timestamp">
                  {i18n.language?.startsWith("de")
                    ? `Erstellt am ${new Date(latestReport.generatedAt).toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric" })}`
                    : `Generated on ${new Date(latestReport.generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`}
                </div>
              </div>
              <button
                onClick={copySummary}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  color: copied ? v.success : v.muted,
                  padding: "4px 8px",
                  borderRadius: 6,
                  fontFamily: "system-ui, sans-serif",
                }}
                data-testid="button-copy-summary"
              >
                {copied ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
                {copied ? t("m2.connoisseur.copied", "Copied!") : t("m2.connoisseur.copySummary", "Copy Summary")}
              </button>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: v.text, margin: 0, fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif" }} data-testid="text-connoisseur-summary">
              {latestReport.summary}
            </p>
          </div>

          <div
            style={{
              background: v.card,
              border: `1px solid ${v.border}`,
              borderRadius: 16,
              padding: "20px 16px",
              marginBottom: 16,
            }}
            data-testid="card-connoisseur-report"
          >
            <MarkdownRenderer content={latestReport.reportContent} />
          </div>

          <button
            onClick={downloadPdf}
            style={{
              width: "100%",
              padding: "12px 20px",
              background: v.elevated,
              color: v.text,
              border: `1px solid ${v.border}`,
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginBottom: 24,
            }}
            data-testid="button-download-pdf"
          >
            <Download style={{ width: 16, height: 16 }} />
            {t("m2.connoisseur.downloadPdf", "Download PDF")}
          </button>

          <button
            onClick={() => setConfirmDeleteId(latestReport.id)}
            style={{
              width: "100%",
              padding: "10px 20px",
              background: "none",
              color: v.muted,
              border: "none",
              borderRadius: 12,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginBottom: 24,
            }}
            data-testid="button-delete-latest-report"
          >
            <Trash2 style={{ width: 14, height: 14 }} />
            {t("m2.connoisseur.deleteReport", "Delete Report")}
          </button>

          {latestReport.dataSnapshot && previousReports.length > 0 && previousReports[0].dataSnapshot && (
            <SnapshotComparison
              latest={latestReport.dataSnapshot as Record<string, any>}
              previous={previousReports[0].dataSnapshot as Record<string, any>}
            />
          )}
        </>
      )}

      {!generateMutation.isPending && !latestReport && !isLoading && (
        <div
          style={{
            background: v.card,
            border: `1px solid ${v.border}`,
            borderRadius: 16,
            padding: "32px 20px",
            textAlign: "center",
          }}
          data-testid="connoisseur-empty-state"
        >
          <Sparkles style={{ width: 40, height: 40, color: alpha(v.accent, "40"), marginBottom: 12 }} />
          <p style={{ fontSize: 14, color: v.muted, margin: 0, lineHeight: 1.6, fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif" }}>
            {t("m2.connoisseur.emptyState", "Generate your first report to discover your whisky personality.")}
          </p>
        </div>
      )}

      {previousReports.length > 0 && (
        <div style={{ marginTop: 24 }} data-testid="connoisseur-history">
          <button
            type="button"
            onClick={() => setHistoryOpen(!historyOpen)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 4px",
              background: "none",
              border: "none",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
            data-testid="button-toggle-history"
          >
            <FileText style={{ width: 16, height: 16, color: v.accent }} strokeWidth={2} />
            <span style={{ flex: 1, textAlign: "left", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: v.muted }}>
              {t("m2.connoisseur.history", "Previous Reports")} ({previousReports.length})
            </span>
            <ChevronDown
              style={{
                width: 16,
                height: 16,
                color: v.muted,
                transition: "transform 0.25s ease",
                transform: historyOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
              strokeWidth={2}
            />
          </button>

          <div style={{ display: "grid", gridTemplateRows: historyOpen ? "1fr" : "0fr", transition: "grid-template-rows 0.3s ease" }}>
            <div style={{ overflow: "hidden" }}>
              {previousReports.map((report) => (
                <div
                  key={report.id}
                  style={{
                    background: v.card,
                    border: `1px solid ${v.border}`,
                    borderRadius: 12,
                    marginBottom: 8,
                    overflow: "hidden",
                  }}
                  data-testid={`card-report-${report.id}`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      padding: "12px 16px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      gap: 12,
                      textAlign: "left",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: v.muted, marginBottom: 4, fontFamily: "system-ui, sans-serif" }}>
                        {new Date(report.generatedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                      </div>
                      <div style={{ fontSize: 13, color: v.textSecondary, lineHeight: 1.4, fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif" }}>
                        {report.summary.length > 120 ? report.summary.slice(0, 120) + "..." : report.summary}
                      </div>
                    </div>
                    <ChevronDown
                      style={{
                        width: 14,
                        height: 14,
                        color: v.muted,
                        flexShrink: 0,
                        transition: "transform 0.2s ease",
                        transform: expandedReport === report.id ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    />
                  </button>

                  {expandedReport === report.id && (
                    <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${v.border}` }}>
                      <div style={{ paddingTop: 16 }}>
                        <MarkdownRenderer content={report.reportContent} />
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(report.id); }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 12,
                          padding: "8px 12px",
                          background: "none",
                          border: `1px solid ${v.border}`,
                          borderRadius: 8,
                          fontSize: 12,
                          color: v.muted,
                          cursor: "pointer",
                          fontFamily: "system-ui, sans-serif",
                        }}
                        data-testid={`button-delete-report-${report.id}`}
                      >
                        <Trash2 style={{ width: 13, height: 13 }} />
                        {t("m2.connoisseur.deleteReport", "Delete Report")}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            padding: 24,
          }}
          onClick={() => setConfirmDeleteId(null)}
          data-testid="dialog-confirm-delete"
        >
          <div
            style={{
              background: v.card,
              border: `1px solid ${v.border}`,
              borderRadius: 16,
              padding: "24px 20px",
              maxWidth: 340,
              width: "100%",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Trash2 style={{ width: 28, height: 28, color: "#e55", marginBottom: 12 }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: v.text, margin: "0 0 8px", fontFamily: "'Playfair Display', serif" }}>
              {t("m2.connoisseur.deleteConfirmTitle", "Delete Report?")}
            </h3>
            <p style={{ fontSize: 13, color: v.muted, lineHeight: 1.5, margin: "0 0 20px", fontFamily: "system-ui, sans-serif" }}>
              {t("m2.connoisseur.deleteConfirmText", "This action cannot be undone. The report and its data snapshot will be permanently removed.")}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirmDeleteId(null)}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  background: v.elevated,
                  color: v.text,
                  border: `1px solid ${v.border}`,
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "system-ui, sans-serif",
                }}
                data-testid="button-cancel-delete"
              >
                {t("m2.connoisseur.cancel", "Cancel")}
              </button>
              <button
                onClick={() => deleteMutation.mutate(confirmDeleteId)}
                disabled={deleteMutation.isPending}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  background: "#e55",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: deleteMutation.isPending ? "wait" : "pointer",
                  opacity: deleteMutation.isPending ? 0.7 : 1,
                  fontFamily: "system-ui, sans-serif",
                }}
                data-testid="button-confirm-delete"
              >
                {deleteMutation.isPending
                  ? t("m2.connoisseur.deleting", "Deleting...")
                  : t("m2.connoisseur.delete", "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

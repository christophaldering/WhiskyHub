import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useSession } from "@/lib/session";
import { pidHeaders, profileApi } from "@/lib/api";
import { stripGuestSuffix } from "@/lib/utils";
import {
  ChevronLeft, Sparkles, Copy, Check, ChevronDown, Download,
  FileText, Trash2, Globe,
} from "lucide-react";

interface ConnoisseurReport {
  id: string;
  participantId: string;
  generatedAt: string;
  reportContent: string;
  summary: string;
  dataSnapshot: Record<string, string | number | null> | null;
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
            <li key={i} style={{ fontSize: 14, lineHeight: 1.7, color: "var(--labs-text)", marginBottom: 4 }}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const renderInline = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    const boldRegex = /\*\*(.+?)\*\*/g;
    let match;
    let lastIndex = 0;
    let idx = 0;
    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
      parts.push(<strong key={idx++} style={{ fontWeight: 600, color: "var(--labs-text)" }}>{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return parts.length > 0 ? parts : text;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^---+$/)) { flushList(); elements.push(<hr key={`hr-${i}`} style={{ border: "none", borderTop: "1px solid var(--labs-border)", margin: "24px 0" }} />); continue; }
    if (line.startsWith("### ")) { flushList(); elements.push(<h3 key={`h3-${i}`} className="labs-serif" style={{ fontSize: 16, fontWeight: 700, color: "var(--labs-text)", margin: "20px 0 8px" }}>{line.slice(4)}</h3>); continue; }
    if (line.startsWith("## ")) { flushList(); elements.push(<h2 key={`h2-${i}`} className="labs-serif" style={{ fontSize: 20, fontWeight: 700, color: "var(--labs-text)", margin: "24px 0 10px" }}>{line.slice(3)}</h2>); continue; }
    if (line.startsWith("# ")) { flushList(); elements.push(<h1 key={`h1-${i}`} className="labs-serif" style={{ fontSize: 24, fontWeight: 700, color: "var(--labs-text)", margin: "28px 0 12px" }}>{line.slice(2)}</h1>); continue; }
    if (line.match(/^[-*]\s/)) { listItems.push(line.replace(/^[-*]\s/, "")); continue; }
    flushList();
    if (line.trim() === "") continue;
    elements.push(<p key={`p-${i}`} style={{ fontSize: 14, lineHeight: 1.7, color: "var(--labs-text)", margin: "0 0 12px" }}>{renderInline(line)}</p>);
  }
  flushList();
  return <div>{elements}</div>;
}

function SkeletonLoader({ message }: { message: string }) {
  return (
    <div style={{ padding: "32px 0" }} data-testid="connoisseur-generating">
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <Sparkles className="w-8 h-8 mx-auto" style={{ color: "var(--labs-accent)", animation: "pulse 2s ease-in-out infinite" }} />
        <p className="text-sm mt-3 font-medium" style={{ color: "var(--labs-accent)" }}>{message}</p>
      </div>
      {[100, 85, 92, 70, 88, 95, 60].map((w, i) => (
        <div key={i} style={{ height: i === 0 ? 24 : 14, width: `${w}%`, background: "color-mix(in srgb, var(--labs-accent) 10%, transparent)", borderRadius: 6, marginBottom: i === 0 ? 16 : 10, animation: "pulse 2s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
      ))}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
    </div>
  );
}

function SnapshotComparison({ latest, previous }: { latest: Record<string, string | number | null>; previous: Record<string, string | number | null> }) {
  const keys = [
    { key: "totalRatings", label: "Ratings" },
    { key: "totalTastings", label: "Tastings" },
    { key: "topRegion", label: "Top Region" },
    { key: "collectionSize", label: "Collection" },
  ];
  return (
    <div style={{ marginTop: 16 }} data-testid="connoisseur-comparison">
      <p className="labs-section-label mb-3">Your Development</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", border: "1px solid var(--labs-border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "10px 12px", background: "color-mix(in srgb, var(--labs-accent) 6%, transparent)", borderBottom: "1px solid var(--labs-border)" }} />
        <div style={{ padding: "10px 12px", background: "color-mix(in srgb, var(--labs-accent) 6%, transparent)", borderBottom: "1px solid var(--labs-border)", textAlign: "center" }}>
          <span style={{ fontSize: 11, color: "var(--labs-text-muted)", fontWeight: 600 }}>Previous</span>
        </div>
        <div style={{ padding: "10px 12px", background: "color-mix(in srgb, var(--labs-accent) 6%, transparent)", borderBottom: "1px solid var(--labs-border)", textAlign: "center" }}>
          <span style={{ fontSize: 11, color: "var(--labs-accent)", fontWeight: 600 }}>Latest</span>
        </div>
        {keys.map(k => {
          const prev = previous?.[k.key] ?? "—";
          const curr = latest?.[k.key] ?? "—";
          return [
            <div key={`${k.key}-l`} style={{ padding: "8px 12px", fontSize: 12, color: "var(--labs-text-secondary)", borderBottom: "1px solid var(--labs-border)" }}>{k.label}</div>,
            <div key={`${k.key}-p`} style={{ padding: "8px 12px", fontSize: 13, color: "var(--labs-text-muted)", textAlign: "center", borderBottom: "1px solid var(--labs-border)", fontVariantNumeric: "tabular-nums" }}>{typeof prev === "number" ? prev.toFixed(1) : prev}</div>,
            <div key={`${k.key}-c`} style={{ padding: "8px 12px", fontSize: 13, color: "var(--labs-text)", textAlign: "center", borderBottom: "1px solid var(--labs-border)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{typeof curr === "number" ? curr.toFixed(1) : curr}</div>,
          ];
        })}
      </div>
    </div>
  );
}

export default function LabsConnoisseur() {
  const session = useSession();
  const pid = session.pid;
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [aiLang, setAiLang] = useState<"de" | "en">("en");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [promptOpen, setPromptOpen] = useState(false);

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
        throw new Error("Connection lost. Please check your connection and try again.");
      }
      if (!res.ok) {
        const err: Record<string, string> = await res.json().catch(() => ({}));
        throw new Error(err.message || "Generation failed. Please try again.");
      }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["connoisseur-reports", pid] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const res = await fetch(`/api/participants/${pid}/connoisseur-reports/${reportId}`, { method: "DELETE", headers: pidHeaders() });
      if (!res.ok) {
        const err: Record<string, string> = await res.json().catch(() => ({}));
        throw new Error(err.message || "Delete failed");
      }
    },
    onSuccess: () => { setConfirmDeleteId(null); queryClient.invalidateQueries({ queryKey: ["connoisseur-reports", pid] }); },
  });

  const latestReport = reports.length > 0 ? reports[0] : null;
  const previousReports = reports.slice(1);

  const copySummary = async () => {
    if (!latestReport?.summary) return;
    try { await navigator.clipboard.writeText(latestReport.summary); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  const downloadPdf = async () => {
    if (!latestReport) return;
    try {
      let participantPhotoUrl: string | undefined;
      if (pid) {
        try {
          const profile = await profileApi.get(pid);
          if (profile?.photoUrl) participantPhotoUrl = profile.photoUrl;
        } catch { /* photo is optional */ }
      }
      const mod = await import("@/components/connoisseur-report-pdf");
      await mod.generateConnoisseurReportPdf({
        report: latestReport as Parameters<typeof mod.generateConnoisseurReportPdf>[0]["report"],
        participantName: stripGuestSuffix(session.name || "Participant"),
        language: latestReport.language || "en",
        participantPhotoUrl,
      });
    } catch (e) { console.error("PDF generation failed:", e); }
  };

  if (!session.signedIn || !pid) {
    return (
      <div className="labs-empty" style={{ minHeight: "60vh" }}>
        <Sparkles className="w-12 h-12 mb-4" style={{ color: "var(--labs-accent)" }} />
        <p style={{ color: "var(--labs-text)", fontSize: 16, fontWeight: 600 }}>Palate Letter</p>
        <p style={{ color: "var(--labs-text-muted)", fontSize: 13 }}>Sign in to receive your personal whisky letter</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-6 pb-24 max-w-2xl mx-auto" data-testid="labs-connoisseur">
      <Link href="/labs/taste" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-connoisseur">
          <ChevronLeft className="w-4 h-4" /> Taste
        </button>
      </Link>

      <div className="mb-5 labs-fade-in">
        <div className="flex items-center gap-3 mb-1">
          <Sparkles className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
          <h1 className="labs-h2" style={{ color: "var(--labs-text)" }} data-testid="text-connoisseur-title">
            Palate Letter
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>
          A personal letter about your whisky journey
        </p>
      </div>

      <div className="labs-card p-4 mb-4 labs-fade-in">
        <div className="flex items-center gap-3 mb-3">
          <Globe className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--labs-text-muted)" }}>Language</span>
        </div>
        <div className="flex gap-2">
          {(["en", "de"] as const).map(lang => (
            <button
              key={lang}
              onClick={() => setAiLang(lang)}
              data-testid={`button-lang-${lang}`}
              style={{
                padding: "6px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                border: aiLang === lang ? "1px solid var(--labs-accent)" : "1px solid var(--labs-border)",
                background: aiLang === lang ? "color-mix(in srgb, var(--labs-accent) 15%, transparent)" : "transparent",
                color: aiLang === lang ? "var(--labs-accent)" : "var(--labs-text-muted)",
              }}
            >
              {lang === "en" ? "English" : "Deutsch"}
            </button>
          ))}
        </div>
      </div>

      <div className="labs-card p-4 mb-4 labs-fade-in">
        <button
          onClick={() => setPromptOpen(!promptOpen)}
          className="labs-btn-ghost w-full"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 0 }}
          data-testid="button-toggle-prompt"
        >
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--labs-text-muted)" }}>Custom Prompt</span>
          <ChevronDown className="w-4 h-4" style={{ color: "var(--labs-text-muted)", transition: "transform 0.2s", transform: promptOpen ? "rotate(180deg)" : "none" }} />
        </button>
        {promptOpen && (
          <textarea
            value={customPrompt}
            onChange={e => setCustomPrompt(e.target.value)}
            placeholder="e.g. 'Focus on smoky whiskies' or 'Compare with my last tasting'"
            data-testid="input-custom-prompt"
            style={{
              width: "100%", marginTop: 12, padding: 12, background: "var(--labs-bg)", border: "1px solid var(--labs-border)",
              borderRadius: 8, color: "var(--labs-text)", fontSize: 13, resize: "none", fontFamily: "inherit", outline: "none", minHeight: 60,
            }}
            rows={3}
          />
        )}
      </div>

      <button
        onClick={() => generateMutation.mutate()}
        disabled={generateMutation.isPending}
        className="labs-btn-primary w-full mb-6 labs-fade-in"
        style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: generateMutation.isPending ? 0.6 : 1 }}
        data-testid="button-generate-report"
      >
        <Sparkles className="w-4 h-4" />
        {generateMutation.isPending ? "Writing your letter..." : latestReport ? "Write a new letter" : "Write my Palate Letter"}
      </button>

      {generateMutation.isPending && <SkeletonLoader message="Writing your personal letter..." />}

      {generateMutation.isError && (
        <div className="labs-card mb-4" style={{ borderColor: "var(--labs-danger)", padding: 16 }} data-testid="text-connoisseur-error">
          <p className="text-sm mb-3" style={{ color: "var(--labs-danger)" }}>
            {generateMutation.error?.message || "Generation failed. Please try again."}
          </p>
          <button onClick={() => generateMutation.mutate()} className="labs-btn-primary" style={{ padding: "8px 16px", fontSize: 13 }} data-testid="button-retry-generate">
            Try again
          </button>
        </div>
      )}

      {!generateMutation.isPending && latestReport && (
        <>
          <div className="labs-fade-in" style={{ marginBottom: 24 }} data-testid="card-palate-letter">
            <div
              style={{
                padding: "28px 24px 28px 28px",
                borderLeft: "3px solid var(--labs-accent)",
                background: "color-mix(in srgb, var(--labs-accent) 3%, transparent)",
                borderRadius: "0 16px 16px 0",
              }}
            >
              <p
                className="labs-serif"
                style={{
                  fontSize: 15,
                  lineHeight: 1.8,
                  color: "var(--labs-text)",
                  fontWeight: 300,
                  fontStyle: "italic",
                  margin: 0,
                  whiteSpace: "pre-line",
                }}
                data-testid="text-palate-letter-content"
              >
                {latestReport.reportContent}
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, padding: "0 4px" }}>
              <p className="text-xs" style={{ color: "var(--labs-text-muted)", fontStyle: "italic" }} data-testid="text-report-timestamp">
                {new Date(latestReport.generatedAt).toLocaleDateString(latestReport.language === "de" ? "de-DE" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
              <button onClick={copySummary} className="labs-btn-ghost" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: copied ? "var(--labs-success)" : "var(--labs-text-muted)" }} data-testid="button-copy-summary">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            {latestReport.summary && (
              <p
                className="text-xs"
                style={{
                  color: "var(--labs-accent)",
                  fontStyle: "italic",
                  marginTop: 12,
                  padding: "0 4px",
                  lineHeight: 1.5,
                }}
                data-testid="text-connoisseur-summary"
              >
                "{latestReport.summary}"
              </p>
            )}
          </div>

          <div className="flex gap-3 mb-6 labs-fade-in">
            <button onClick={downloadPdf} className="labs-btn-secondary flex-1" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 16px" }} data-testid="button-download-pdf">
              <Download className="w-4 h-4" /> PDF
            </button>
            <button
              onClick={() => setConfirmDeleteId(latestReport.id)}
              className="labs-btn-ghost"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "var(--labs-text-muted)", padding: "12px 16px", border: "1px solid var(--labs-border)", borderRadius: 10 }}
              data-testid="button-delete-latest-report"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {latestReport.dataSnapshot && previousReports.length > 0 && previousReports[0].dataSnapshot && (
            <SnapshotComparison
              latest={latestReport.dataSnapshot}
              previous={previousReports[0].dataSnapshot as Record<string, string | number | null>}
            />
          )}
        </>
      )}

      {!generateMutation.isPending && !latestReport && !isLoading && (
        <div className="labs-card p-8 text-center labs-fade-in" data-testid="connoisseur-empty-state">
          <Sparkles className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--labs-accent)", opacity: 0.75 }} />
          <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>
            Your first letter awaits. A personal reflection on your palate.
          </p>
        </div>
      )}

      {previousReports.length > 0 && (
        <div style={{ marginTop: 24 }} data-testid="connoisseur-history">
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="w-full labs-btn-ghost"
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 4px" }}
            data-testid="button-toggle-history"
          >
            <FileText className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
            <span className="labs-section-label" style={{ flex: 1, textAlign: "left", marginBottom: 0 }}>
              Previous Letters ({previousReports.length})
            </span>
            <ChevronDown className="w-4 h-4" style={{ color: "var(--labs-text-muted)", transition: "transform 0.25s", transform: historyOpen ? "rotate(180deg)" : "none" }} />
          </button>

          <div style={{ display: "grid", gridTemplateRows: historyOpen ? "1fr" : "0fr", transition: "grid-template-rows 0.3s ease" }}>
            <div style={{ overflow: "hidden" }}>
              {previousReports.map(report => (
                <div key={report.id} className="labs-card mb-2" style={{ overflow: "hidden" }} data-testid={`card-report-${report.id}`}>
                  <button
                    onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
                    className="w-full labs-btn-ghost"
                    style={{ display: "flex", alignItems: "center", padding: "12px 16px", gap: 12, textAlign: "left" }}
                    data-testid={`button-expand-report-${report.id}`}
                  >
                    <div style={{ flex: 1 }}>
                      <p className="text-xs mb-1" style={{ color: "var(--labs-text-muted)" }}>
                        {new Date(report.generatedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                      </p>
                      <p className="text-xs" style={{ color: "var(--labs-text-secondary)", lineHeight: 1.4 }}>
                        {report.summary.length > 120 ? report.summary.slice(0, 120) + "..." : report.summary}
                      </p>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--labs-text-muted)", transition: "transform 0.2s", transform: expandedReport === report.id ? "rotate(180deg)" : "none" }} />
                  </button>
                  {expandedReport === report.id && (
                    <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--labs-border)" }}>
                      <div style={{ paddingTop: 16 }}>
                        <MarkdownRenderer content={report.reportContent} />
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeleteId(report.id); }}
                        className="labs-btn-ghost mt-3"
                        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, border: "1px solid var(--labs-border)", borderRadius: 8, padding: "8px 12px" }}
                        data-testid={`button-delete-report-${report.id}`}
                      >
                        <Trash2 className="w-3 h-3" /> Delete Letter
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
          style={{ position: "fixed", inset: 0, zIndex: "var(--z-overlay)", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--overlay-backdrop)", backdropFilter: "var(--overlay-blur)", WebkitBackdropFilter: "var(--overlay-blur)", padding: 24 }}
          onClick={() => setConfirmDeleteId(null)}
          data-testid="dialog-confirm-delete"
        >
          <div className="labs-card" style={{ padding: "24px 20px", maxWidth: 340, width: "100%", textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <Trash2 className="w-7 h-7 mx-auto mb-3" style={{ color: "var(--labs-danger)" }} />
            <h3 className="labs-h3 mb-2" style={{ color: "var(--labs-text)" }}>Delete Letter?</h3>
            <p className="text-xs mb-5" style={{ color: "var(--labs-text-muted)", lineHeight: 1.5 }}>
              This letter will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="labs-btn-secondary flex-1" data-testid="button-cancel-delete">Cancel</button>
              <button
                onClick={() => deleteMutation.mutate(confirmDeleteId)}
                disabled={deleteMutation.isPending}
                data-testid="button-confirm-delete"
                style={{
                  flex: 1, padding: "10px 16px", background: "var(--labs-danger)", color: "var(--labs-bg)", border: "none",
                  borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: deleteMutation.isPending ? "wait" : "pointer",
                  opacity: deleteMutation.isPending ? 0.7 : 1, fontFamily: "inherit",
                }}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

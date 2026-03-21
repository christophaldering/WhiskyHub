import { useState, useCallback, useMemo } from "react";
import type { ThemeTokens } from "../../tokens";
import { SP, FONT, RADIUS } from "../../tokens";
import type { Translations } from "../../i18n";
import type { V2Lang } from "../../i18n";

interface Report {
  id: string;
  reportContent: string;
  summary: string | null;
  language: string;
  generatedAt: string;
  dataSnapshot: Record<string, unknown> | null;
}

interface Props {
  th: ThemeTokens;
  t: Translations;
  participantId: string;
  lang: V2Lang;
}

type ReportTab = "report" | "whiskies" | "aromas" | "history";

function renderMarkdown(md: string, th: ThemeTokens): React.ReactNode[] {
  const lines = md.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();

    if (line.startsWith("### ")) {
      elements.push(
        <h4 key={i} style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 600, color: th.text, margin: `${SP.md}px 0 ${SP.sm}px` }}>
          {line.slice(4)}
        </h4>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h3 key={i} style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: 700, color: th.text, margin: `${SP.lg}px 0 ${SP.sm}px` }}>
          {line.slice(3)}
        </h3>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h2 key={i} style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 700, color: th.text, margin: `${SP.lg}px 0 ${SP.md}px` }}>
          {line.slice(2)}
        </h2>
      );
    } else if (line.match(/^[-*]\s+/)) {
      const text = line.replace(/^[-*]\s+/, "");
      elements.push(
        <div key={i} style={{ display: "flex", gap: SP.sm, marginBottom: SP.xs, paddingLeft: SP.md }}>
          <span style={{ color: th.gold }}>--</span>
          <span style={{ fontSize: 14, color: th.text, lineHeight: 1.5 }}>{formatInline(text, th)}</span>
        </div>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} style={{ height: SP.sm }} />);
    } else {
      elements.push(
        <p key={i} style={{ fontSize: 14, color: th.text, lineHeight: 1.6, margin: `0 0 ${SP.sm}px`, fontFamily: FONT.body }}>
          {formatInline(line, th)}
        </p>
      );
    }
  }

  return elements;
}

function formatInline(text: string, th: ThemeTokens): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|\*.*?\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const m = match[0];
    if (m.startsWith("**") && m.endsWith("**")) {
      parts.push(<strong key={key++} style={{ fontWeight: 700, color: th.gold }}>{m.slice(2, -2)}</strong>);
    } else if (m.startsWith("*") && m.endsWith("*")) {
      parts.push(<em key={key++} style={{ fontStyle: "italic" }}>{m.slice(1, -1)}</em>);
    }
    lastIndex = match.index + m.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? <>{parts}</> : text;
}

export default function ConnoisseurReport({ th, t, participantId, lang }: Props) {
  const [reports, setReports] = useState<Report[]>([]);
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<ReportTab>("report");
  const [reportLang, setReportLang] = useState<V2Lang>(lang);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/participants/${participantId}/connoisseur-reports`, {
        headers: { "x-participant-id": participantId },
      });
      if (!res.ok) throw new Error("Failed to load reports");
      const data = await res.json();
      setReports(data);
      if (data.length > 0) setCurrentReport(data[0]);
      setLoaded(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [participantId]);

  const generateReport = useCallback(async () => {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch(`/api/participants/${participantId}/connoisseur-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-participant-id": participantId,
        },
        body: JSON.stringify({ language: reportLang }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to generate report");
      }
      const report = await res.json();
      setCurrentReport(report);
      setReports((prev) => [report, ...prev]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setGenerating(false);
    }
  }, [participantId, reportLang]);

  if (!loaded && !loading) {
    fetchReports();
  }

  const snapshot = useMemo(() => {
    if (!currentReport?.dataSnapshot) return null;
    return currentReport.dataSnapshot as Record<string, unknown>;
  }, [currentReport]);

  const whiskySummaries = useMemo(() => {
    if (!snapshot?.whiskySummaries) return [];
    return snapshot.whiskySummaries as { name: string; distillery?: string; region?: string; scores: { nose?: number; taste?: number; finish?: number; overall?: number }; vsGroupOverall?: number }[];
  }, [snapshot]);

  const regionBreakdown = useMemo(() => {
    if (!snapshot?.regionBreakdown) return [];
    return snapshot.regionBreakdown as { region: string; count: number; avgScore: number }[];
  }, [snapshot]);

  const tabs: { id: ReportTab; label: string }[] = [
    { id: "report", label: t.resReportTab },
    { id: "whiskies", label: t.resWhiskiesTab },
    { id: "aromas", label: t.resAromasTab },
    { id: "history", label: t.resHistoryTab },
  ];

  if (loading) {
    return (
      <div data-testid="connoisseur-loading" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: SP.xxxl, fontFamily: FONT.body }}>
        <div style={{ color: th.muted, fontSize: 14 }}>{t.resLoading}</div>
      </div>
    );
  }

  if (!currentReport && loaded) {
    return (
      <div data-testid="connoisseur-empty" style={{ textAlign: "center", padding: SP.xxxl, fontFamily: FONT.body }}>
        <h3 style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: th.text, marginBottom: SP.sm }}>{t.resConnoisseurTitle}</h3>
        <p style={{ fontSize: 14, color: th.muted, marginBottom: SP.lg }}>{t.resConnoisseurEmpty}</p>
        <div style={{ display: "flex", gap: SP.sm, justifyContent: "center", alignItems: "center", marginBottom: SP.md }}>
          <button
            data-testid="button-lang-de"
            onClick={() => setReportLang("de")}
            style={{
              padding: `${SP.xs}px ${SP.md}px`,
              borderRadius: RADIUS.full,
              border: `1px solid ${reportLang === "de" ? th.gold : th.border}`,
              background: reportLang === "de" ? th.gold : "transparent",
              color: reportLang === "de" ? th.bg : th.muted,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: FONT.body,
            }}
          >
            DE
          </button>
          <button
            data-testid="button-lang-en"
            onClick={() => setReportLang("en")}
            style={{
              padding: `${SP.xs}px ${SP.md}px`,
              borderRadius: RADIUS.full,
              border: `1px solid ${reportLang === "en" ? th.gold : th.border}`,
              background: reportLang === "en" ? th.gold : "transparent",
              color: reportLang === "en" ? th.bg : th.muted,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: FONT.body,
            }}
          >
            EN
          </button>
        </div>
        <button
          data-testid="button-generate-report"
          onClick={generateReport}
          disabled={generating}
          style={{
            padding: `${SP.md}px ${SP.xl}px`,
            borderRadius: RADIUS.lg,
            border: "none",
            background: th.gold,
            color: th.bg,
            fontSize: 15,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: generating ? "wait" : "pointer",
            opacity: generating ? 0.6 : 1,
          }}
        >
          {generating ? t.resGenerating : t.resGenerate}
        </button>
        {error && <p style={{ color: th.amber, fontSize: 13, marginTop: SP.md }}>{error}</p>}
      </div>
    );
  }

  return (
    <div data-testid="connoisseur-report" style={{ fontFamily: FONT.body, padding: SP.md }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: SP.md }}>
        <h2 style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 700, color: th.text, margin: 0 }}>
          {t.resConnoisseurTitle}
        </h2>
        <div style={{ display: "flex", gap: SP.xs }}>
          <button
            data-testid="button-report-lang-de"
            onClick={() => setReportLang("de")}
            style={{
              width: 32, height: 28, borderRadius: RADIUS.sm,
              border: `1px solid ${reportLang === "de" ? th.gold : th.border}`,
              background: reportLang === "de" ? th.gold : "transparent",
              color: reportLang === "de" ? th.bg : th.muted,
              fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: FONT.body,
            }}
          >
            DE
          </button>
          <button
            data-testid="button-report-lang-en"
            onClick={() => setReportLang("en")}
            style={{
              width: 32, height: 28, borderRadius: RADIUS.sm,
              border: `1px solid ${reportLang === "en" ? th.gold : th.border}`,
              background: reportLang === "en" ? th.gold : "transparent",
              color: reportLang === "en" ? th.bg : th.muted,
              fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: FONT.body,
            }}
          >
            EN
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: SP.sm, marginBottom: SP.md, overflowX: "auto" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            data-testid={`button-report-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: `${SP.sm}px ${SP.md}px`,
              borderRadius: RADIUS.full,
              border: "none",
              cursor: "pointer",
              fontFamily: FONT.body,
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
              background: activeTab === tab.id ? th.gold : th.bgCard,
              color: activeTab === tab.id ? th.bg : th.muted,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "report" && currentReport && (
        <div data-testid="panel-report-content">
          {currentReport.summary && (
            <div
              style={{
                background: "rgba(212,168,71,0.06)",
                border: `1px solid rgba(212,168,71,0.15)`,
                borderRadius: RADIUS.lg,
                padding: SP.md,
                marginBottom: SP.md,
                fontStyle: "italic",
                fontSize: 14,
                color: th.text,
                lineHeight: 1.6,
              }}
            >
              {currentReport.summary}
            </div>
          )}
          {renderMarkdown(currentReport.reportContent, th)}
        </div>
      )}

      {activeTab === "whiskies" && (
        <div data-testid="panel-whiskies">
          {whiskySummaries.length === 0 ? (
            <p style={{ color: th.muted, fontSize: 13 }}>{t.resNoData}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: SP.sm }}>
              {whiskySummaries.map((w, i) => (
                <div
                  key={i}
                  data-testid={`card-whisky-${i}`}
                  style={{
                    background: th.bgCard,
                    borderRadius: RADIUS.md,
                    padding: SP.md,
                    border: `1px solid ${th.border}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: th.text }}>{w.name}</div>
                    <div style={{ fontSize: 12, color: th.muted }}>
                      {[w.distillery, w.region].filter(Boolean).join(" -- ")}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: FONT.display, color: th.gold }}>
                      {w.scores.overall?.toFixed(1) ?? "--"}
                    </div>
                    {w.vsGroupOverall != null && (
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        color: w.vsGroupOverall >= 0 ? th.green : th.amber,
                      }}>
                        {w.vsGroupOverall >= 0 ? "+" : ""}{w.vsGroupOverall.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "aromas" && (
        <div data-testid="panel-aromas">
          {regionBreakdown.length === 0 ? (
            <p style={{ color: th.muted, fontSize: 13 }}>{t.resNoData}</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: SP.md, justifyContent: "center", padding: SP.lg }}>
              {regionBreakdown.map((r, i) => {
                const size = Math.max(48, Math.min(100, r.count * 24));
                return (
                  <div
                    key={i}
                    data-testid={`bubble-region-${i}`}
                    style={{
                      width: size,
                      height: size,
                      borderRadius: RADIUS.full,
                      background: `rgba(212,168,71,${0.1 + r.count * 0.08})`,
                      border: `1px solid rgba(212,168,71,0.3)`,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div style={{ fontSize: size > 60 ? 11 : 9, fontWeight: 600, color: th.text, textAlign: "center" }}>{r.region}</div>
                    <div style={{ fontSize: size > 60 ? 10 : 8, color: th.gold }}>{r.avgScore.toFixed(1)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div data-testid="panel-history">
          {reports.length === 0 ? (
            <p style={{ color: th.muted, fontSize: 13 }}>{t.resNoData}</p>
          ) : (
            <div style={{ borderLeft: `2px solid ${th.border}`, marginLeft: SP.md, paddingLeft: SP.lg }}>
              {reports.map((r, i) => (
                <div
                  key={r.id}
                  data-testid={`timeline-item-${i}`}
                  onClick={() => setCurrentReport(r)}
                  style={{
                    cursor: "pointer",
                    padding: SP.md,
                    marginBottom: SP.md,
                    borderRadius: RADIUS.md,
                    background: currentReport?.id === r.id ? th.bgHover : "transparent",
                    border: `1px solid ${currentReport?.id === r.id ? th.gold : "transparent"}`,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: -SP.lg - SP.md + 3,
                      top: SP.md + 2,
                      width: 10,
                      height: 10,
                      borderRadius: RADIUS.full,
                      background: currentReport?.id === r.id ? th.gold : th.muted,
                    }}
                  />
                  <div style={{ fontSize: 12, color: th.muted, marginBottom: SP.xs }}>
                    {new Date(r.generatedAt).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: 13, color: th.text, lineHeight: 1.5 }}>
                    {r.summary || r.reportContent.slice(0, 100) + "..."}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: SP.lg, display: "flex", gap: SP.sm }}>
        <button
          data-testid="button-regenerate-report"
          onClick={generateReport}
          disabled={generating}
          style={{
            padding: `${SP.sm}px ${SP.md}px`,
            borderRadius: RADIUS.md,
            border: `1px solid ${th.border}`,
            background: th.bgCard,
            color: th.text,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: FONT.body,
            cursor: generating ? "wait" : "pointer",
            opacity: generating ? 0.6 : 1,
          }}
        >
          {generating ? t.resGenerating : t.resRegenerate}
        </button>
      </div>
      {error && <p style={{ color: th.amber, fontSize: 13, marginTop: SP.sm }}>{error}</p>}
    </div>
  );
}

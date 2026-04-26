import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileSpreadsheet, FileText, Download, BookOpen, Loader2 } from "lucide-react";
import {
  labsExportFromServer,
  labsExportPdf,
  labsExportPdfForTasting,
  labsExportStoryPdfForTasting,
} from "@/labs/utils/labsExports";

type Variant = "cards" | "buttons";

interface InlineData {
  tasting: any;
  whiskyResults: any[];
}

interface Props {
  tastingId: string;
  storyAvailable: boolean;
  inlineData?: InlineData;
  variant?: Variant;
  testIdPrefix?: string;
}

type Kind = "xlsx" | "csv" | "pdf" | "story";

export default function TastingDownloadGrid({
  tastingId,
  storyAvailable,
  inlineData,
  variant = "cards",
  testIdPrefix,
}: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const prefix = testIdPrefix ?? `tasting-download-${tastingId}`;

  const run = async (kind: Kind, fn: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await fn();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("downloads.toastExportFailed", "Download failed"));
    } finally {
      setBusy(null);
    }
  };

  const handlers: Record<Kind, () => Promise<void>> = {
    xlsx: () => labsExportFromServer(tastingId, "xlsx", t).then(() => undefined),
    csv: () => labsExportFromServer(tastingId, "csv", t).then(() => undefined),
    pdf: () =>
      inlineData
        ? labsExportPdf(inlineData.tasting, inlineData.whiskyResults, t)
        : labsExportPdfForTasting(tastingId, t),
    story: () => labsExportStoryPdfForTasting(tastingId, t),
  };

  const items: {
    kind: Kind;
    icon: React.ElementType;
    title: string;
    desc: string;
    badge: string;
    show: boolean;
  }[] = [
    {
      kind: "xlsx",
      icon: FileSpreadsheet,
      title: t("resultsUi.downloadExcelTitle", "Excel-Tabelle"),
      desc: t("resultsUi.downloadExcelDesc", "Alle Bewertungen tabellarisch für eigene Statistik-Auswertung"),
      badge: ".xlsx",
      show: true,
    },
    {
      kind: "csv",
      icon: FileText,
      title: t("resultsUi.downloadCsvTitle", "CSV-Datei"),
      desc: t("resultsUi.downloadCsvDesc", "Rohdaten für Import in andere Tools"),
      badge: ".csv",
      show: true,
    },
    {
      kind: "pdf",
      icon: Download,
      title: t("resultsUi.downloadPdfTitle", "Auswertungs-PDF"),
      desc: t("resultsUi.downloadPdfDesc", "Kompakte Rangliste & Statistiken (1-3 Seiten, ideal zum Versenden)"),
      badge: "PDF",
      show: true,
    },
    {
      kind: "story",
      icon: BookOpen,
      title: t("resultsUi.downloadStoryTitle", "Story-PDF"),
      desc: t("resultsUi.downloadStoryDesc", "Magazin-Stil mit Fotos, Geschichten und Profilen"),
      badge: t("resultsUi.formatStoryBadge", "Premium PDF"),
      show: storyAvailable,
    },
  ];

  const visible = items.filter(i => i.show);

  if (variant === "buttons") {
    return (
      <div data-testid={`${prefix}-row`}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 8,
          }}
        >
          {visible.map(item => {
            const Icon = item.icon;
            const isBusy = busy === item.kind;
            return (
              <button
                key={item.kind}
                onClick={() => run(item.kind, handlers[item.kind])}
                disabled={isBusy}
                title={`${item.title} · ${item.desc}`}
                aria-label={`${item.title}: ${item.desc}`}
                data-testid={`${prefix}-${item.kind}`}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  padding: "8px 12px", borderRadius: 8,
                  border: "1px solid var(--labs-border)",
                  background: "transparent",
                  color: isBusy ? "var(--labs-text-muted)" : "var(--labs-text)",
                  cursor: isBusy ? "not-allowed" : "pointer",
                  opacity: isBusy ? 0.6 : 1,
                  fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                {isBusy
                  ? <Loader2 className="w-4 h-4 mt-0.5" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />
                  : <Icon className="w-4 h-4 mt-0.5" style={{ color: "var(--labs-accent)", flexShrink: 0 }} />
                }
                <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</span>
                    <span style={{ fontSize: 10, color: "var(--labs-text-muted)" }}>{item.badge}</span>
                  </span>
                  <span style={{ fontSize: 11, color: "var(--labs-text-muted)", lineHeight: 1.3 }}>
                    {item.desc}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {error && (
          <p style={{ fontSize: 11, color: "var(--labs-danger)", marginTop: 6 }} data-testid={`${prefix}-error`}>
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div data-testid={`${prefix}-grid`}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 12,
        }}
      >
        {visible.map(item => {
          const Icon = item.icon;
          const isBusy = busy === item.kind;
          return (
            <div
              key={item.kind}
              className="labs-card"
              style={{
                padding: 16,
                display: "flex", flexDirection: "column", gap: 10,
              }}
              data-testid={`${prefix}-card-${item.kind}`}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "var(--labs-accent-muted)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <h3 style={{
                      fontSize: 14, fontWeight: 600, color: "var(--labs-text)",
                      margin: 0, lineHeight: 1.3,
                    }}>
                      {item.title}
                    </h3>
                    <span style={{
                      fontSize: 10, fontWeight: 600, letterSpacing: "0.04em",
                      color: "var(--labs-accent)",
                      background: "var(--labs-accent-muted)",
                      padding: "2px 6px", borderRadius: 4,
                    }}>
                      {item.badge}
                    </span>
                  </div>
                  <p style={{
                    fontSize: 12, color: "var(--labs-text-muted)",
                    margin: "4px 0 0", lineHeight: 1.4,
                  }}>
                    {item.desc}
                  </p>
                </div>
              </div>
              <button
                onClick={() => run(item.kind, handlers[item.kind])}
                disabled={isBusy}
                className="labs-btn-secondary"
                data-testid={`${prefix}-action-${item.kind}`}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  fontSize: 13, fontWeight: 500,
                  cursor: isBusy ? "not-allowed" : "pointer",
                  opacity: isBusy ? 0.6 : 1,
                }}
              >
                {isBusy
                  ? <Loader2 className="w-4 h-4" style={{ animation: "spin 1s linear infinite" }} />
                  : <Download className="w-4 h-4" />
                }
                {isBusy
                  ? t("resultsUi.downloadInProgress", "Wird vorbereitet…")
                  : t("resultsUi.downloadButton", "Herunterladen")}
              </button>
            </div>
          );
        })}
      </div>
      {error && (
        <p style={{ fontSize: 12, color: "var(--labs-danger)", marginTop: 10 }} data-testid={`${prefix}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

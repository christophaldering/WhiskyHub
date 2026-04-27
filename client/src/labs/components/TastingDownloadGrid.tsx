import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Loader2, ExternalLink } from "lucide-react";
import {
  DEFAULT_TASTING_KINDS,
  selectDescriptors,
  buildSourceHref,
  type DownloadKind,
  type DownloadDescriptor,
  type DownloadContext,
  type AvailabilityState,
} from "@/labs/utils/downloadMatrix";

type Variant = "cards" | "buttons";

interface InlineData {
  tasting: unknown;
  whiskyResults: unknown[];
}

interface Props {
  tastingId: string;
  participantId?: string | null;
  storyAvailable: boolean;
  presentationAvailable?: boolean;
  notesAvailable?: boolean;
  inlineData?: InlineData;
  variant?: Variant;
  testIdPrefix?: string;
  kinds?: DownloadKind[];
  sourceHref?: string;
  sourceLabel?: string;
}

export default function TastingDownloadGrid({
  tastingId,
  participantId,
  storyAvailable,
  presentationAvailable = false,
  notesAvailable = false,
  inlineData,
  variant = "cards",
  testIdPrefix,
  kinds = DEFAULT_TASTING_KINDS,
  sourceHref,
  sourceLabel,
}: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<DownloadKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const prefix = testIdPrefix ?? `tasting-download-${tastingId}`;

  const availability: AvailabilityState = {
    story: storyAvailable,
    presentation: presentationAvailable,
    notes: notesAvailable,
  };

  const ctx: DownloadContext = {
    tastingId,
    participantId,
    inlineData,
    t: t as DownloadContext["t"],
  };

  const runDescriptor = async (descriptor: DownloadDescriptor) => {
    setBusy(descriptor.kind);
    setError(null);
    try {
      await descriptor.run(ctx);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("downloads.toastExportFailed", "Download failed"));
    } finally {
      setBusy(null);
    }
  };

  const visible: DownloadDescriptor[] = selectDescriptors(kinds, availability, participantId);

  const renderBadge = (item: DownloadDescriptor) =>
    item.badgeKey ? t(item.badgeKey, item.badgeFallback) : item.badgeFallback;

  const renderTitle = (item: DownloadDescriptor) => t(item.titleKey, item.titleFallback);
  const renderDesc = (item: DownloadDescriptor) => t(item.descKey, item.descFallback);

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
            const title = renderTitle(item);
            const desc = renderDesc(item);
            const badge = renderBadge(item);
            const itemSourceHref = buildSourceHref(item.contentType, tastingId);
            return (
              <div
                key={item.kind}
                style={{
                  display: "flex", alignItems: "stretch", gap: 0,
                  borderRadius: 8,
                  border: "1px solid var(--labs-border)",
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => runDescriptor(item)}
                  disabled={isBusy}
                  title={`${title} · ${desc}`}
                  aria-label={`${title}: ${desc}`}
                  data-testid={`${prefix}-${item.kind}`}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 8,
                    padding: "8px 12px",
                    background: "transparent",
                    border: "none",
                    color: isBusy ? "var(--labs-text-muted)" : "var(--labs-text)",
                    cursor: isBusy ? "not-allowed" : "pointer",
                    opacity: isBusy ? 0.6 : 1,
                    fontFamily: "inherit",
                    textAlign: "left",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {isBusy
                    ? <Loader2 className="w-4 h-4 mt-0.5" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />
                    : <Icon className="w-4 h-4 mt-0.5" style={{ color: "var(--labs-accent)", flexShrink: 0 }} />
                  }
                  <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
                      <span style={{ fontSize: 10, color: "var(--labs-text-muted)" }}>{badge}</span>
                    </span>
                    <span style={{ fontSize: 11, color: "var(--labs-text-muted)", lineHeight: 1.3 }}>
                      {desc}
                    </span>
                  </span>
                </button>
                <a
                  href={itemSourceHref}
                  title={t("downloads.openSource", "Quelle öffnen")}
                  aria-label={t("downloads.openSource", "Quelle öffnen")}
                  data-testid={`${prefix}-${item.kind}-source`}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 10px",
                    borderLeft: "1px solid var(--labs-border)",
                    background: "transparent",
                    color: "var(--labs-accent)",
                    textDecoration: "none",
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            );
          })}
          {sourceHref && (
            <a
              href={sourceHref}
              data-testid={`${prefix}-source-link`}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px", borderRadius: 8,
                border: "1px dashed var(--labs-border)",
                background: "transparent",
                color: "var(--labs-text-muted)",
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                textDecoration: "none",
              }}
            >
              <ExternalLink className="w-4 h-4 mt-0.5" style={{ color: "var(--labs-accent)", flexShrink: 0 }} />
              <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {sourceLabel ?? t("downloads.openSource", "Quelle öffnen")}
                </span>
                <span style={{ fontSize: 11, color: "var(--labs-text-muted)", lineHeight: 1.3 }}>
                  {t("downloads.openSourceDesc", "Direkt zur Ergebnis-Ansicht des Tastings")}
                </span>
              </span>
            </a>
          )}
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
          const title = renderTitle(item);
          const desc = renderDesc(item);
          const badge = renderBadge(item);
          const itemSourceHref = buildSourceHref(item.contentType, tastingId);
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
                      {title}
                    </h3>
                    <span style={{
                      fontSize: 10, fontWeight: 600, letterSpacing: "0.04em",
                      color: "var(--labs-accent)",
                      background: "var(--labs-accent-muted)",
                      padding: "2px 6px", borderRadius: 4,
                    }}>
                      {badge}
                    </span>
                  </div>
                  <p style={{
                    fontSize: 12, color: "var(--labs-text-muted)",
                    margin: "4px 0 0", lineHeight: 1.4,
                  }}>
                    {desc}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "stretch", gap: 8 }}>
                <button
                  onClick={() => runDescriptor(item)}
                  disabled={isBusy}
                  className="labs-btn-secondary"
                  data-testid={`${prefix}-action-${item.kind}`}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    fontSize: 13, fontWeight: 500,
                    cursor: isBusy ? "not-allowed" : "pointer",
                    opacity: isBusy ? 0.6 : 1,
                    flex: 1,
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
                <a
                  href={itemSourceHref}
                  title={t("downloads.openSource", "Quelle öffnen")}
                  aria-label={t("downloads.openSource", "Quelle öffnen")}
                  data-testid={`${prefix}-card-${item.kind}-source`}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 10px",
                    borderRadius: 6,
                    border: "1px solid var(--labs-border)",
                    color: "var(--labs-accent)",
                    textDecoration: "none",
                    fontSize: 12,
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
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

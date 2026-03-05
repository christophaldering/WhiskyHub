import { useState } from "react";
import { useTranslation } from "react-i18next";
import { c, cardStyle, sectionHeadingStyle } from "@/lib/theme";
import SimpleShell from "@/components/simple/simple-shell";
import BackButton from "@/components/back-button";
import DataExportDark from "@/pages/data-export-dark";
import { generateBlankTastingSheet, generateBlankTastingMat } from "@/components/printable-tasting-sheets";
import {
  Download,
  FileText,
  ClipboardList,
  Loader2,
} from "lucide-react";

function TemplateButton({
  loading,
  onClick,
  icon: Icon,
  label,
}: {
  loading: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      data-testid={`button-template-${label.toLowerCase().replace(/\s+/g, "-")}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "14px 16px",
        borderRadius: 12,
        border: `1px solid ${c.border}`,
        background: c.card,
        color: loading ? c.muted : c.text,
        fontSize: 14,
        fontWeight: 500,
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.6 : 1,
        transition: "all 0.2s",
        fontFamily: "system-ui, -apple-system, sans-serif",
        textAlign: "left",
      }}
    >
      {loading ? (
        <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite", flexShrink: 0 }} />
      ) : (
        <Icon style={{ width: 18, height: 18, color: c.accent, flexShrink: 0 }} />
      )}
      <span>{label}</span>
      <Download style={{ width: 14, height: 14, marginLeft: "auto", color: c.muted, flexShrink: 0 }} />
    </button>
  );
}

export default function DownloadsExport() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("de") ? "de" : "en";
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [loadingMat, setLoadingMat] = useState(false);

  const handleSheet = async () => {
    setLoadingSheet(true);
    try {
      generateBlankTastingSheet(lang);
    } finally {
      setLoadingSheet(false);
    }
  };

  const handleMat = async () => {
    setLoadingMat(true);
    try {
      generateBlankTastingMat(lang);
    } finally {
      setLoadingMat(false);
    }
  };

  return (
    <SimpleShell maxWidth={900}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div data-testid="downloads-export-page">
        <BackButton fallback="/my-taste" />

        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <Download style={{ width: 24, height: 24, color: c.accent }} />
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: c.text,
                margin: 0,
                fontFamily: "'Playfair Display', serif",
              }}
              data-testid="text-downloads-title"
            >
              {t("downloads.title")}
            </h1>
          </div>
        </div>

        <div style={{ marginBottom: 32 }}>
          <h2 style={sectionHeadingStyle} data-testid="text-templates-heading">
            {t("downloads.templates")}
          </h2>
          <p style={{ fontSize: 13, color: c.muted, margin: "0 0 14px 0" }}>
            {t("downloads.templatesDesc")}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <TemplateButton
              loading={loadingSheet}
              onClick={handleSheet}
              icon={ClipboardList}
              label={t("downloads.scoreSheet")}
            />
            <TemplateButton
              loading={loadingMat}
              onClick={handleMat}
              icon={FileText}
              label={t("downloads.tastingMat")}
            />
          </div>
        </div>

        <div>
          <h2 style={sectionHeadingStyle} data-testid="text-data-export-heading">
            {t("downloads.dataExport")}
          </h2>
          <DataExportDark embedded />
        </div>
      </div>
    </SimpleShell>
  );
}

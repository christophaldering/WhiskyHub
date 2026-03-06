import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { v } from "@/lib/themeVars";
import { getSession } from "@/lib/session";
import { useAppStore } from "@/lib/store";
import { tastingApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { downloadBlob } from "@/lib/download";
import { generateBlankTastingSheet, generateBlankTastingMat } from "@/components/printable-tasting-sheets";
import M2BackButton from "@/components/m2/M2BackButton";
import {
  Download,
  FileText,
  FileSpreadsheet,
  ClipboardList,
  Loader2,
  User,
  NotebookPen,
  Star,
  Archive,
  Users,
  Wine,
  Shield,
  Lock,
  Package,
  HardDriveDownload,
} from "lucide-react";

type AccessLevel = "own" | "extended" | "admin";

interface ExportCard {
  type: string;
  titleKey: string;
  descKey: string;
  icon: React.ElementType;
  access: AccessLevel;
}

const EXPORT_CARDS: ExportCard[] = [
  { type: "profile", titleKey: "dataExport.profile", descKey: "dataExport.profileDesc", icon: User, access: "own" },
  { type: "journal", titleKey: "dataExport.journal", descKey: "dataExport.journalDesc", icon: NotebookPen, access: "own" },
  { type: "wishlist", titleKey: "dataExport.wishlist", descKey: "dataExport.wishlistDesc", icon: Star, access: "own" },
  { type: "collection", titleKey: "dataExport.collection", descKey: "dataExport.collectionDesc", icon: Archive, access: "own" },
  { type: "friends", titleKey: "dataExport.friends", descKey: "dataExport.friendsDesc", icon: Users, access: "own" },
  { type: "tastings", titleKey: "dataExport.tastings", descKey: "dataExport.tastingsDesc", icon: Wine, access: "extended" },
];

function DownloadButton({
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
      data-testid={`button-download-${label.toLowerCase().replace(/\s+/g, "-")}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "14px 16px",
        borderRadius: 12,
        border: `1px solid ${v.border}`,
        background: v.card,
        color: loading ? v.muted : v.text,
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
        <Icon style={{ width: 18, height: 18, color: v.accent, flexShrink: 0 }} />
      )}
      <span>{label}</span>
      <Download style={{ width: 14, height: 14, marginLeft: "auto", color: v.muted, flexShrink: 0 }} />
    </button>
  );
}

function ExportFormatButton({
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
      data-testid={`button-export-${label.toLowerCase().replace(/\s+/g, "-")}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 8,
        border: `1px solid ${v.border}`,
        background: "transparent",
        color: loading ? v.muted : v.text,
        fontSize: 12,
        fontWeight: 500,
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.6 : 1,
        transition: "all 0.2s",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {loading ? (
        <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
      ) : (
        <Icon style={{ width: 14, height: 14 }} />
      )}
      {label}
    </button>
  );
}

export default function M2TasteDownloads() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const session = getSession();
  const participantId = session.pid;
  const lang = i18n.language?.startsWith("de") ? "de" : "en";

  const [loadingSheet, setLoadingSheet] = useState(false);
  const [loadingMat, setLoadingMat] = useState(false);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const { data: allTastings = [] } = useQuery({
    queryKey: ["tastings", participantId],
    queryFn: () => tastingApi.getAll(participantId),
    enabled: !!participantId,
  });

  const { currentParticipant } = useAppStore();
  const isAdmin = currentParticipant?.role === "admin";
  const isHost = participantId && allTastings.some((t: any) => t.hostId === participantId);

  const hasAccess = useCallback(
    (level: AccessLevel) => {
      if (level === "own") return true;
      if (level === "extended") return isAdmin || !!isHost;
      if (level === "admin") return isAdmin;
      return false;
    },
    [isAdmin, isHost]
  );

  const setLoading = useCallback((key: string, value: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [key]: value }));
  }, []);

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

  const executeExport = useCallback(
    async (type: string, format: string) => {
      if (!participantId) return;
      const key = `${type}-${format}`;
      setLoading(key, true);
      try {
        const url =
          type === "all"
            ? `/api/export/all?participantId=${participantId}&format=${format}`
            : `/api/export/${type}?participantId=${participantId}&format=${format}`;
        const res = await fetch(url);
        if (res.status === 403) {
          toast({ description: t("dataExport.noPermission"), variant: "destructive" });
          return;
        }
        if (!res.ok) throw new Error("Export failed");
        const blob = await res.blob();
        downloadBlob(blob, `casksense_${type}_${new Date().toISOString().split("T")[0]}.${format === "xlsx" ? "xlsx" : format}`);
        toast({ description: t("dataExport.downloadReady") });
      } catch {
        toast({ description: t("dataExport.noData"), variant: "destructive" });
      } finally {
        setLoading(key, false);
      }
    },
    [participantId, setLoading, toast, t]
  );

  const executeFullBundle = useCallback(async () => {
    if (!participantId) return;
    setLoading("bundle-zip", true);
    try {
      const res = await fetch(`/api/export/all?participantId=${participantId}&format=zip`);
      if (res.status === 403) {
        toast({ description: t("dataExport.noPermission"), variant: "destructive" });
        return;
      }
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      downloadBlob(blob, `casksense_full_${new Date().toISOString().split("T")[0]}.zip`);
      toast({ description: t("dataExport.downloadReady") });
    } catch {
      toast({ description: t("dataExport.noData"), variant: "destructive" });
    } finally {
      setLoading("bundle-zip", false);
    }
  }, [participantId, setLoading, toast, t]);

  const cardBase: React.CSSProperties = {
    background: v.card,
    border: `1px solid ${v.border}`,
    borderRadius: 14,
    padding: 16,
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 600,
    color: v.text,
    margin: "0 0 4px 0",
    fontFamily: "system-ui, -apple-system, sans-serif",
  };

  const sectionDesc: React.CSSProperties = {
    fontSize: 13,
    color: v.muted,
    margin: "0 0 14px 0",
  };

  return (
    <div style={{ padding: "16px 16px 32px", maxWidth: 600, margin: "0 auto" }} data-testid="m2-taste-downloads-page">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <M2BackButton />

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Download style={{ width: 24, height: 24, color: v.accent }} />
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: v.text,
              margin: 0,
              fontFamily: "'Playfair Display', Georgia, serif",
            }}
            data-testid="text-m2-downloads-title"
          >
            {t("downloads.title", "Downloads & Export")}
          </h1>
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <h2 style={sectionTitle} data-testid="text-m2-templates-heading">
          {t("downloads.templates", "Printable Templates")}
        </h2>
        <p style={sectionDesc}>
          {t("downloads.templatesDesc", "Blank tasting sheets and mats for your next session — available in DE & EN.")}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <DownloadButton
            loading={loadingSheet}
            onClick={handleSheet}
            icon={ClipboardList}
            label={t("downloads.scoreSheet", "Blank Score Sheet (PDF)")}
          />
          <DownloadButton
            loading={loadingMat}
            onClick={handleMat}
            icon={FileText}
            label={t("downloads.tastingMat", "Tasting Mat (PDF)")}
          />
        </div>
      </div>

      {participantId && (
        <>
          <div style={{ marginBottom: 28 }}>
            <h2 style={sectionTitle} data-testid="text-m2-data-export-heading">
              {t("dataExport.title", "Data Export")}
            </h2>
            <p style={sectionDesc}>
              {t("dataExport.subtitle", "Export your data as CSV or Excel.")}
            </p>

            {isAdmin && (
              <div style={{ ...cardBase, marginBottom: 12 }} data-testid="card-m2-export-all">
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: `color-mix(in srgb, ${v.accent} 12%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <HardDriveDownload style={{ width: 20, height: 20, color: v.accent }} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: v.text }}>
                        {t("dataExport.exportAll", "Export All")}
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "2px 8px",
                          borderRadius: 6,
                          border: `1px solid ${v.border}`,
                          fontSize: 10,
                          color: v.muted,
                        }}
                      >
                        <Shield style={{ width: 10, height: 10 }} />
                        {t("dataExport.adminOnly", "Admin")}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: v.muted, margin: 0 }}>
                      {t("dataExport.exportAllDesc", "Complete platform data bundle.")}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <ExportFormatButton
                    loading={!!loadingStates["all-csv"]}
                    onClick={() => executeExport("all", "csv")}
                    icon={FileText}
                    label={loadingStates["all-csv"] ? t("dataExport.downloading", "...") : t("dataExport.formatCsv", "CSV")}
                  />
                  <ExportFormatButton
                    loading={!!loadingStates["all-xlsx"]}
                    onClick={() => executeExport("all", "xlsx")}
                    icon={FileSpreadsheet}
                    label={loadingStates["all-xlsx"] ? t("dataExport.downloading", "...") : t("dataExport.formatExcel", "Excel")}
                  />
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {EXPORT_CARDS.map((card) => {
                const Icon = card.icon;
                const csvKey = `${card.type}-csv`;
                const xlsxKey = `${card.type}-xlsx`;
                const accessible = hasAccess(card.access);

                return (
                  <div
                    key={card.type}
                    style={{
                      ...cardBase,
                      opacity: accessible ? 1 : 0.45,
                      transition: "border-color 0.2s",
                    }}
                    data-testid={`card-m2-export-${card.type}`}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: accessible ? 12 : 0 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: accessible
                            ? `color-mix(in srgb, ${v.accent} 12%, transparent)`
                            : `color-mix(in srgb, ${v.muted} 12%, transparent)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon style={{ width: 20, height: 20, color: accessible ? v.accent : v.muted }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 15, fontWeight: 600, color: v.text }}>
                            {t(card.titleKey)}
                          </span>
                          {card.access !== "own" && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "2px 8px",
                                borderRadius: 6,
                                border: `1px solid ${v.border}`,
                                fontSize: 10,
                                color: v.muted,
                              }}
                            >
                              <Shield style={{ width: 10, height: 10 }} />
                              {card.access === "extended"
                                ? t("dataExport.hostOnly", "Host")
                                : t("dataExport.adminOnly", "Admin")}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 12, color: v.muted, margin: 0 }}>
                          {t(card.descKey)}
                        </p>
                      </div>
                    </div>

                    {accessible ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <ExportFormatButton
                          loading={!!loadingStates[csvKey]}
                          onClick={() => executeExport(card.type, "csv")}
                          icon={FileText}
                          label={loadingStates[csvKey] ? t("dataExport.downloading", "...") : t("dataExport.formatCsv", "CSV")}
                        />
                        <ExportFormatButton
                          loading={!!loadingStates[xlsxKey]}
                          onClick={() => executeExport(card.type, "xlsx")}
                          icon={FileSpreadsheet}
                          label={loadingStates[xlsxKey] ? t("dataExport.downloading", "...") : t("dataExport.formatExcel", "Excel")}
                        />
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: v.muted }}>
                        <Lock style={{ width: 12, height: 12 }} />
                        {t("dataExport.noAccess", "No access")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <h2 style={sectionTitle} data-testid="text-m2-full-bundle-heading">
              {t("downloads.fullBundle", "Full Data Bundle")}
            </h2>
            <p style={sectionDesc}>
              {t("downloads.fullBundleDesc", "Download all your data in a single ZIP archive.")}
            </p>
            <DownloadButton
              loading={!!loadingStates["bundle-zip"]}
              onClick={executeFullBundle}
              icon={Package}
              label={t("downloads.downloadZip", "Full Bundle (ZIP)")}
            />
          </div>
        </>
      )}

      {!participantId && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <HardDriveDownload style={{ width: 48, height: 48, color: v.muted, marginBottom: 16 }} />
          <p style={{ fontSize: 14, color: v.muted }}>
            {t("dataExport.subtitle", "Sign in to export your data.")}
          </p>
        </div>
      )}
    </div>
  );
}

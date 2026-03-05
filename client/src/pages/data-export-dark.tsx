import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { tastingApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { c, cardStyle } from "@/lib/theme";
import { downloadBlob } from "@/lib/download";
import { getSession } from "@/lib/session";
import { useAppStore } from "@/lib/store";
import SimpleShell from "@/components/simple/simple-shell";
import BackButton from "@/components/back-button";
import {
  HardDriveDownload,
  Wine,
  NotebookPen,
  User,
  Users,
  Star,
  Archive,
  FileSpreadsheet,
  FileText,
  Loader2,
  Shield,
  Lock,
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

function ExportButton({
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
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 8,
        border: `1px solid ${c.border}`,
        background: "transparent",
        color: loading ? c.muted : c.text,
        fontSize: 12,
        fontWeight: 500,
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.6 : 1,
        transition: "all 0.2s",
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

export default function DataExportDark() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const session = getSession();
  const participantId = session.pid;

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

  if (!participantId) {
    return (
      <SimpleShell maxWidth={520}>
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <HardDriveDownload style={{ width: 48, height: 48, color: c.muted, marginBottom: 16 }} />
          <h2 style={{ fontSize: 20, fontWeight: 600, color: c.text, marginBottom: 8 }}>
            {t("dataExport.title")}
          </h2>
          <p style={{ fontSize: 14, color: c.muted }}>
            {t("dataExport.subtitle")}
          </p>
        </div>
      </SimpleShell>
    );
  }

  const accessBadge = (level: AccessLevel) => {
    if (level === "own") return null;
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "2px 8px",
          borderRadius: 6,
          border: `1px solid ${c.border}`,
          fontSize: 10,
          color: c.muted,
        }}
      >
        <Shield style={{ width: 10, height: 10 }} />
        {level === "extended" ? t("dataExport.hostOnly") : t("dataExport.adminOnly")}
      </span>
    );
  };

  return (
    <SimpleShell maxWidth={520}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div data-testid="data-export-dark-page">
        <BackButton />
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <HardDriveDownload style={{ width: 24, height: 24, color: c.accent }} />
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: c.text,
                margin: 0,
                fontFamily: "'Playfair Display', serif",
              }}
              data-testid="text-data-export-title"
            >
              {t("dataExport.title")}
            </h1>
          </div>
          <p style={{ fontSize: 13, color: c.muted, margin: 0 }}>
            {t("dataExport.subtitle")}
          </p>
        </div>

        {isAdmin && (
          <div
            style={{ ...cardStyle, marginBottom: 20 }}
            data-testid="card-export-all"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: `${c.accent}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <HardDriveDownload style={{ width: 20, height: 20, color: c.accent }} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: c.text }}>
                    {t("dataExport.exportAll")}
                  </span>
                  {accessBadge("admin")}
                </div>
                <p style={{ fontSize: 12, color: c.muted, margin: 0 }}>
                  {t("dataExport.exportAllDesc")}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <ExportButton
                loading={!!loadingStates["all-csv"]}
                onClick={() => executeExport("all", "csv")}
                icon={FileText}
                label={loadingStates["all-csv"] ? t("dataExport.downloading") : t("dataExport.formatCsv")}
              />
              <ExportButton
                loading={!!loadingStates["all-xlsx"]}
                onClick={() => executeExport("all", "xlsx")}
                icon={FileSpreadsheet}
                label={loadingStates["all-xlsx"] ? t("dataExport.downloading") : t("dataExport.formatExcel")}
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
                  ...cardStyle,
                  opacity: accessible ? 1 : 0.45,
                  transition: "border-color 0.2s",
                }}
                data-testid={`card-export-${card.type}`}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: accessible ? 12 : 0 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: accessible ? `${c.accent}15` : `${c.muted}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon style={{ width: 20, height: 20, color: accessible ? c.accent : c.muted }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: c.text }}>
                        {t(card.titleKey)}
                      </span>
                      {accessBadge(card.access)}
                    </div>
                    <p style={{ fontSize: 12, color: c.muted, margin: 0 }}>
                      {t(card.descKey)}
                    </p>
                  </div>
                </div>

                {accessible ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <ExportButton
                      loading={!!loadingStates[csvKey]}
                      onClick={() => executeExport(card.type, "csv")}
                      icon={FileText}
                      label={loadingStates[csvKey] ? t("dataExport.downloading") : t("dataExport.formatCsv")}
                    />
                    <ExportButton
                      loading={!!loadingStates[xlsxKey]}
                      onClick={() => executeExport(card.type, "xlsx")}
                      icon={FileSpreadsheet}
                      label={loadingStates[xlsxKey] ? t("dataExport.downloading") : t("dataExport.formatExcel")}
                    />
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: c.muted }}>
                    <Lock style={{ width: 12, height: 12 }} />
                    {t("dataExport.noAccess")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </SimpleShell>
  );
}

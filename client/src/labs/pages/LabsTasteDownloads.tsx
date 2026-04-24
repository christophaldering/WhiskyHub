import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/session";
import { useAppStore } from "@/lib/store";
import { tastingApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import MeineWeltActionBar from "@/labs/components/MeineWeltActionBar";
import { downloadBlob } from "@/lib/download";
import { generateBlankTastingSheet, generateBlankTastingMat } from "@/components/printable-tasting-sheets";
import { Link , useLocation } from "wouter";
import {
  Download, FileText, FileSpreadsheet, ClipboardList, Loader2,
  User, NotebookPen, Star, Archive, Users, Wine, ChevronLeft, Package,
} from "lucide-react";

type AccessLevel = "own" | "extended" | "admin";
interface ExportCard { type: string; titleKey: string; descKey: string; titleFallback: string; descFallback: string; icon: React.ElementType; access: AccessLevel; }

const EXPORT_CARDS: ExportCard[] = [
  { type: "profile", titleKey: "downloads.exportProfile", descKey: "downloads.exportProfileDesc", titleFallback: "Profile", descFallback: "Your profile data and preferences", icon: User, access: "own" },
  { type: "journal", titleKey: "downloads.exportDrams", descKey: "downloads.exportDramsDesc", titleFallback: "Drams", descFallback: "All your logged drams", icon: NotebookPen, access: "own" },
  { type: "wishlist", titleKey: "downloads.exportWishlist", descKey: "downloads.exportWishlistDesc", titleFallback: "Wishlist", descFallback: "Your wishlist entries", icon: Star, access: "own" },
  { type: "collection", titleKey: "downloads.exportCollection", descKey: "downloads.exportCollectionDesc", titleFallback: "Collection", descFallback: "Whisky collection data", icon: Archive, access: "own" },
  { type: "friends", titleKey: "downloads.exportFriends", descKey: "downloads.exportFriendsDesc", titleFallback: "Friends", descFallback: "Friends list and connections", icon: Users, access: "own" },
  { type: "tastings", titleKey: "downloads.exportTastings", descKey: "downloads.exportTastingsDesc", titleFallback: "Tastings", descFallback: "All tasting sessions and results", icon: Wine, access: "extended" },
];

export default function LabsTasteDownloads() {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const session = useSession();
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

  const hasAccess = useCallback((level: AccessLevel) => {
    if (level === "own") return true;
    if (level === "extended") return isAdmin || !!isHost;
    if (level === "admin") return isAdmin;
    return false;
  }, [isAdmin, isHost]);

  const setLoading = useCallback((key: string, value: boolean) => { setLoadingStates(prev => ({ ...prev, [key]: value })); }, []);

  const executeExport = useCallback(async (type: string, format: string) => {
    if (!participantId) return;
    const key = `${type}-${format}`;
    setLoading(key, true);
    try {
      const url = type === "all" ? `/api/export/all?participantId=${participantId}&format=${format}` : `/api/export/${type}?participantId=${participantId}&format=${format}`;
      const res = await fetch(url);
      if (res.status === 403) { toast({ description: t("downloads.toastNoPermission", "No permission"), variant: "destructive" }); return; }
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      downloadBlob(blob, `casksense_${type}_${new Date().toISOString().split("T")[0]}.${format === "xlsx" ? "xlsx" : format}`);
      toast({ description: t("downloads.toastDownloadReady", "Download ready") });
    } catch { toast({ description: t("downloads.toastNoData", "No data available"), variant: "destructive" }); }
    finally { setLoading(key, false); }
  }, [participantId, setLoading, toast, t]);

  const executeFullBundle = useCallback(async () => {
    if (!participantId) return;
    setLoading("bundle-zip", true);
    try {
      const res = await fetch(`/api/export/all?participantId=${participantId}&format=zip`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      downloadBlob(blob, `casksense_full_${new Date().toISOString().split("T")[0]}.zip`);
      toast({ description: t("downloads.toastDownloadReady", "Download ready") });
    } catch { toast({ description: t("downloads.toastExportFailed", "Export failed"), variant: "destructive" }); }
    finally { setLoading("bundle-zip", false); }
  }, [participantId, setLoading, toast, t]);

  return (
    <div className="labs-page" data-testid="labs-taste-downloads-page">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <MeineWeltActionBar active="analytics" />
      <div className="flex items-center gap-2 mb-1">
        <Download className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
        <h1 className="labs-h2" style={{ color: "var(--labs-text)" }} data-testid="labs-downloads-title">{t("downloads.title", "Downloads & Export")}</h1>
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)", marginLeft: 28 }}>{t("downloads.subtitle", "Export your data and download templates")}</p>

      <div className="mb-7">
        <p className="labs-section-label">{t("downloads.printableTemplates", "Printable Templates")}</p>
        <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)" }}>{t("downloads.printableTemplatesDesc", "Blank tasting sheets and mats for your next session")}</p>
        <div className="flex flex-col gap-2.5">
          <DownloadButton loading={loadingSheet} onClick={() => { setLoadingSheet(true); try { generateBlankTastingSheet(lang); } finally { setLoadingSheet(false); } }} icon={ClipboardList} label={t("downloads.blankScoreSheet", "Blank Score Sheet (PDF)")} testId="button-labs-download-sheet" />
          <DownloadButton loading={loadingMat} onClick={() => { setLoadingMat(true); try { generateBlankTastingMat(lang); } finally { setLoadingMat(false); } }} icon={FileText} label={t("downloads.blankTastingMat", "Blank Tasting Mat (PDF)")} testId="button-labs-download-mat" />
        </div>
      </div>

      <div className="mb-7">
        <p className="labs-section-label">{t("downloads.dataExport", "Data Export")}</p>
        <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)" }}>{t("downloads.dataExportDesc", "Download your data as CSV or Excel")}</p>
        <div className="flex flex-col gap-3">
          {EXPORT_CARDS.filter(c => hasAccess(c.access)).map(card => {
            const Icon = card.icon;
            return (
              <div key={card.type} className="labs-card p-4" data-testid={`labs-export-card-${card.type}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--labs-accent-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: "var(--labs-text)", margin: 0 }}>{t(card.titleKey, card.titleFallback)}</h3>
                    <p className="text-xs mt-0.5" style={{ color: "var(--labs-text-muted)" }}>{t(card.descKey, card.descFallback)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <ExportFormatButton loading={!!loadingStates[`${card.type}-csv`]} onClick={() => executeExport(card.type, "csv")} icon={FileText} label={t("downloads.formatCsv", "CSV")} testId={`button-labs-export-${card.type}-csv`} />
                  <ExportFormatButton loading={!!loadingStates[`${card.type}-xlsx`]} onClick={() => executeExport(card.type, "xlsx")} icon={FileSpreadsheet} label={t("downloads.formatExcel", "Excel")} testId={`button-labs-export-${card.type}-xlsx`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="labs-section-label">{t("downloads.fullBundle", "Full Data Bundle")}</p>
        <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)" }}>{t("downloads.fullBundleDesc", "Download everything as a single ZIP file")}</p>
        <DownloadButton loading={!!loadingStates["bundle-zip"]} onClick={executeFullBundle} icon={Package} label={t("downloads.downloadBundle", "Download Full Bundle (ZIP)")} testId="button-labs-download-bundle" />
      </div>
    </div>
  );
}

function DownloadButton({ loading, onClick, icon: Icon, label, testId }: { loading: boolean; onClick: () => void; icon: React.ElementType; label: string; testId: string }) {
  return (
    <button onClick={onClick} disabled={loading} data-testid={testId}
      className="labs-card labs-card-interactive flex items-center gap-2.5 w-full text-left"
      style={{ padding: "14px 16px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
      {loading ? <Loader2 className="w-4.5 h-4.5 flex-shrink-0" style={{ color: "var(--labs-text-muted)", animation: "spin 1s linear infinite" }} /> : <Icon className="w-4.5 h-4.5 flex-shrink-0" style={{ color: "var(--labs-accent)" }} />}
      <span className="text-sm" style={{ color: loading ? "var(--labs-text-muted)" : "var(--labs-text)" }}>{label}</span>
      <Download className="w-3.5 h-3.5 ml-auto flex-shrink-0" style={{ color: "var(--labs-text-muted)" }} />
    </button>
  );
}

function ExportFormatButton({ loading, onClick, icon: Icon, label, testId }: { loading: boolean; onClick: () => void; icon: React.ElementType; label: string; testId: string }) {
  return (
    <button onClick={onClick} disabled={loading} data-testid={testId}
      style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--labs-border)", background: "transparent", color: loading ? "var(--labs-text-muted)" : "var(--labs-text)", fontSize: 12, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
      {loading ? <Loader2 className="w-3.5 h-3.5" style={{ animation: "spin 1s linear infinite" }} /> : <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}

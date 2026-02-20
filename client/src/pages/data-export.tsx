import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { GuestPreview } from "@/components/guest-preview";
import { useToast } from "@/hooks/use-toast";
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
} from "lucide-react";

interface ExportCard {
  type: string;
  titleKey: string;
  descKey: string;
  icon: React.ElementType;
}

const EXPORT_CARDS: ExportCard[] = [
  { type: "tastings", titleKey: "dataExport.tastings", descKey: "dataExport.tastingsDesc", icon: Wine },
  { type: "journal", titleKey: "dataExport.journal", descKey: "dataExport.journalDesc", icon: NotebookPen },
  { type: "profile", titleKey: "dataExport.profile", descKey: "dataExport.profileDesc", icon: User },
  { type: "friends", titleKey: "dataExport.friends", descKey: "dataExport.friendsDesc", icon: Users },
  { type: "wishlist", titleKey: "dataExport.wishlist", descKey: "dataExport.wishlistDesc", icon: Star },
  { type: "collection", titleKey: "dataExport.collection", descKey: "dataExport.collectionDesc", icon: Archive },
];

export default function DataExport() {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const { toast } = useToast();
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const setLoading = useCallback((key: string, value: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [key]: value }));
  }, []);

  const downloadFile = useCallback(
    async (type: string, format: string) => {
      if (!currentParticipant) return;
      const key = `${type}-${format}`;
      setLoading(key, true);
      try {
        const res = await fetch(
          `/api/export/${type}?participantId=${currentParticipant.id}&format=${format}`
        );
        if (!res.ok) throw new Error("Export failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `casksense_${type}_${new Date().toISOString().split("T")[0]}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ description: t("dataExport.downloadReady") });
      } catch {
        toast({ description: t("dataExport.noData"), variant: "destructive" });
      } finally {
        setLoading(key, false);
      }
    },
    [currentParticipant, setLoading, toast, t]
  );

  const handleExportAll = useCallback(
    async (format: string) => {
      if (!currentParticipant) return;
      const key = `all-${format}`;
      setLoading(key, true);
      try {
        const res = await fetch(
          `/api/export/all?participantId=${currentParticipant.id}&format=${format}`
        );
        if (!res.ok) throw new Error("Export failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `casksense_all_${new Date().toISOString().split("T")[0]}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ description: t("dataExport.downloadReady") });
      } catch {
        toast({ description: t("dataExport.noData"), variant: "destructive" });
      } finally {
        setLoading(key, false);
      }
    },
    [currentParticipant, setLoading, toast, t]
  );

  if (!currentParticipant) {
    return (
      <GuestPreview
        featureTitle={t("dataExport.title")}
        featureDescription={t("dataExport.subtitle")}
      >
        <div className="space-y-4">
          <h1 className="text-2xl font-serif font-bold">{t("dataExport.title")}</h1>
          <div className="grid gap-3">
            {EXPORT_CARDS.slice(0, 3).map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.type}
                  className="bg-card rounded-xl border p-4 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-serif font-semibold">{t(card.titleKey)}</div>
                    <div className="text-sm text-muted-foreground">{t(card.descKey)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </GuestPreview>
    );
  }

  return (
    <div
      className="max-w-4xl mx-auto px-4 py-8 min-w-0 overflow-x-hidden"
      data-testid="data-export-page"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <HardDriveDownload className="w-7 h-7 text-primary" />
          <h1
            className="text-2xl md:text-3xl font-serif font-bold text-primary"
            data-testid="text-data-export-title"
          >
            {t("dataExport.title")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">{t("dataExport.subtitle")}</p>

        <div
          className="bg-card border border-border/40 rounded-lg p-5 mb-8"
          data-testid="card-export-all"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <HardDriveDownload className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-serif font-semibold text-foreground">
                  {t("dataExport.exportAll")}
                </h2>
                <p className="text-xs text-muted-foreground">{t("dataExport.exportAllDesc")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportAll("csv")}
                disabled={loadingStates["all-csv"]}
                data-testid="button-export-all-csv"
              >
                {loadingStates["all-csv"] ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                {loadingStates["all-csv"] ? t("dataExport.downloading") : t("dataExport.formatCsv")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportAll("xlsx")}
                disabled={loadingStates["all-xlsx"]}
                data-testid="button-export-all-xlsx"
              >
                {loadingStates["all-xlsx"] ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                )}
                {loadingStates["all-xlsx"]
                  ? t("dataExport.downloading")
                  : t("dataExport.formatExcel")}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {EXPORT_CARDS.map((card, index) => {
            const Icon = card.icon;
            const csvKey = `${card.type}-csv`;
            const xlsxKey = `${card.type}-xlsx`;
            return (
              <motion.div
                key={card.type}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-card border border-border/40 rounded-lg p-5 hover:border-primary/30 transition-colors"
                data-testid={`card-export-${card.type}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-serif font-semibold text-foreground">
                        {t(card.titleKey)}
                      </h3>
                      <p className="text-xs text-muted-foreground">{t(card.descKey)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadFile(card.type, "csv")}
                      disabled={loadingStates[csvKey]}
                      data-testid={`button-export-${card.type}-csv`}
                    >
                      {loadingStates[csvKey] ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4 mr-2" />
                      )}
                      {loadingStates[csvKey]
                        ? t("dataExport.downloading")
                        : t("dataExport.formatCsv")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadFile(card.type, "xlsx")}
                      disabled={loadingStates[xlsxKey]}
                      data-testid={`button-export-${card.type}-xlsx`}
                    >
                      {loadingStates[xlsxKey] ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                      )}
                      {loadingStates[xlsxKey]
                        ? t("dataExport.downloading")
                        : t("dataExport.formatExcel")}
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

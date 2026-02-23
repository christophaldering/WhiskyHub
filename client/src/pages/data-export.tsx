import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { tastingApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GuestPreview } from "@/components/guest-preview";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
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
  KeyRound,
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
  { type: "tastings", titleKey: "dataExport.tastings", descKey: "dataExport.tastingsDesc", icon: Wine, access: "extended" },
  { type: "friends", titleKey: "dataExport.friends", descKey: "dataExport.friendsDesc", icon: Users, access: "extended" },
];

export default function DataExport() {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const { toast } = useToast();
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [pendingExport, setPendingExport] = useState<{ type: string; format: string } | null>(null);
  const [verifiedPin, setVerifiedPin] = useState<string | null>(null);

  const { data: allTastings = [] } = useQuery({
    queryKey: ["tastings", currentParticipant?.id],
    queryFn: () => tastingApi.getAll(currentParticipant?.id),
    enabled: !!currentParticipant,
  });

  const isAdmin = currentParticipant?.role === "admin";
  const isHost = currentParticipant && allTastings.some((t: any) => t.hostId === currentParticipant.id);

  const hasAccess = useCallback((level: AccessLevel) => {
    if (level === "own") return true;
    if (level === "extended") return isAdmin || isHost;
    if (level === "admin") return isAdmin;
    return false;
  }, [isAdmin, isHost]);

  const setLoading = useCallback((key: string, value: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [key]: value }));
  }, []);

  const executeExport = useCallback(
    async (type: string, format: string, pin: string) => {
      if (!currentParticipant) return;
      const key = `${type}-${format}`;
      setLoading(key, true);
      try {
        const url = type === "all"
          ? `/api/export/all?participantId=${currentParticipant.id}&format=${format}&pin=${encodeURIComponent(pin)}`
          : `/api/export/${type}?participantId=${currentParticipant.id}&format=${format}&pin=${encodeURIComponent(pin)}`;
        const res = await fetch(url);
        if (res.status === 401) {
          setVerifiedPin(null);
          toast({ description: t("dataExport.pinInvalid"), variant: "destructive" });
          return;
        }
        if (res.status === 403) {
          toast({ description: t("dataExport.noPermission"), variant: "destructive" });
          return;
        }
        if (!res.ok) throw new Error("Export failed");
        const blob = await res.blob();
        const urlObj = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = urlObj;
        a.download = `casksense_${type}_${new Date().toISOString().split("T")[0]}.${format === "xlsx" ? "xlsx" : format}`;
        a.click();
        URL.revokeObjectURL(urlObj);
        toast({ description: t("dataExport.downloadReady") });
      } catch {
        toast({ description: t("dataExport.noData"), variant: "destructive" });
      } finally {
        setLoading(key, false);
      }
    },
    [currentParticipant, setLoading, toast, t]
  );

  const requestExport = useCallback((type: string, format: string) => {
    if (verifiedPin) {
      executeExport(type, format, verifiedPin);
    } else {
      setPendingExport({ type, format });
      setPinInput("");
      setPinError(false);
      setShowPinDialog(true);
    }
  }, [verifiedPin, executeExport]);

  const handlePinConfirm = useCallback(() => {
    if (pinInput.length < 4) return;
    setVerifiedPin(pinInput);
    setShowPinDialog(false);
    if (pendingExport) {
      executeExport(pendingExport.type, pendingExport.format, pinInput);
      setPendingExport(null);
    }
  }, [pinInput, pendingExport, executeExport]);

  const accessBadge = (level: AccessLevel) => {
    if (level === "own") return null;
    if (level === "extended") {
      return (
        <Badge variant="outline" className="text-[10px] gap-1 font-normal">
          <Shield className="w-3 h-3" />
          {t("dataExport.hostOnly")}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] gap-1 font-normal">
        <Shield className="w-3 h-3" />
        {t("dataExport.adminOnly")}
      </Badge>
    );
  };

  if (!currentParticipant) {
    return (
      <GuestPreview
        featureTitle={t("dataExport.title")}
        featureDescription={t("dataExport.subtitle")}
      >
        <div className="space-y-4">
          <h1 className="text-2xl font-serif font-bold">{t("dataExport.title")}</h1>
          <div className="grid gap-3">
            {EXPORT_CARDS.filter(c => c.access === "own").slice(0, 3).map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.type} className="bg-card rounded-xl border p-4 flex items-center gap-4">
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
    <div className="max-w-4xl mx-auto px-4 py-8 min-w-0 overflow-x-hidden" data-testid="data-export-page">
      <AlertDialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              {t("dataExport.pinTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("dataExport.pinDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder={t("dataExport.pinPlaceholder")}
              value={pinInput}
              onChange={(e) => { setPinInput(e.target.value); setPinError(false); }}
              className={pinError ? "border-destructive" : ""}
              onKeyDown={(e) => e.key === "Enter" && handlePinConfirm()}
              data-testid="input-export-pin"
              autoFocus
            />
            {pinError && (
              <p className="text-xs text-destructive">{t("dataExport.pinInvalid")}</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.cancel")}</AlertDialogCancel>
            <Button
              onClick={handlePinConfirm}
              disabled={pinInput.length < 4}
              data-testid="button-confirm-export-pin"
            >
              <KeyRound className="w-4 h-4 mr-1" />
              {t("dataExport.pinConfirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3 mb-2">
          <HardDriveDownload className="w-7 h-7 text-primary" />
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-data-export-title">
            {t("dataExport.title")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{t("dataExport.subtitle")}</p>

        <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/40 rounded-lg p-4 mb-8 flex items-start gap-3">
          <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
            <p className="font-semibold mb-1">{t("dataExport.securityTitle")}</p>
            <p>{t("dataExport.securityDesc")}</p>
          </div>
        </div>

        {verifiedPin && (
          <div className="flex items-center gap-2 mb-6 text-xs text-emerald-600 dark:text-emerald-400">
            <Shield className="w-3.5 h-3.5" />
            <span>{t("dataExport.pinVerified")}</span>
            <button
              onClick={() => setVerifiedPin(null)}
              className="text-muted-foreground hover:text-destructive underline ml-2"
              data-testid="button-lock-exports"
            >
              {t("dataExport.lockAgain")}
            </button>
          </div>
        )}

        {isAdmin && (
          <div className="bg-card border border-border/40 rounded-lg p-5 mb-6" data-testid="card-export-all">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <HardDriveDownload className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif font-semibold text-foreground">{t("dataExport.exportAll")}</h2>
                    {accessBadge("admin")}
                  </div>
                  <p className="text-xs text-muted-foreground">{t("dataExport.exportAllDesc")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => requestExport("all", "csv")}
                  disabled={loadingStates["all-csv"]}
                  data-testid="button-export-all-csv"
                >
                  {loadingStates["all-csv"] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                  {loadingStates["all-csv"] ? t("dataExport.downloading") : t("dataExport.formatCsv")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => requestExport("all", "xlsx")}
                  disabled={loadingStates["all-xlsx"]}
                  data-testid="button-export-all-xlsx"
                >
                  {loadingStates["all-xlsx"] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
                  {loadingStates["all-xlsx"] ? t("dataExport.downloading") : t("dataExport.formatExcel")}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {EXPORT_CARDS.map((card, index) => {
            const Icon = card.icon;
            const csvKey = `${card.type}-csv`;
            const xlsxKey = `${card.type}-xlsx`;
            const accessible = hasAccess(card.access);
            return (
              <motion.div
                key={card.type}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`bg-card border border-border/40 rounded-lg p-5 transition-colors ${accessible ? "hover:border-primary/30" : "opacity-50"}`}
                data-testid={`card-export-${card.type}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accessible ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif font-semibold text-foreground">{t(card.titleKey)}</h3>
                        {accessBadge(card.access)}
                      </div>
                      <p className="text-xs text-muted-foreground">{t(card.descKey)}</p>
                    </div>
                  </div>
                  {accessible ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => requestExport(card.type, "csv")}
                        disabled={loadingStates[csvKey]}
                        data-testid={`button-export-${card.type}-csv`}
                      >
                        {loadingStates[csvKey] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                        {loadingStates[csvKey] ? t("dataExport.downloading") : t("dataExport.formatCsv")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => requestExport(card.type, "xlsx")}
                        disabled={loadingStates[xlsxKey]}
                        data-testid={`button-export-${card.type}-xlsx`}
                      >
                        {loadingStates[xlsxKey] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
                        {loadingStates[xlsxKey] ? t("dataExport.downloading") : t("dataExport.formatExcel")}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Lock className="w-3.5 h-3.5" />
                      {t("dataExport.noAccess")}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

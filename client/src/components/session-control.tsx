import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { Play, Lock, Eye, Archive, ChevronRight, Glasses, Trash2, AlertTriangle, Settings2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { tastingApi, blindModeApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useAppStore } from "@/lib/store";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Tasting } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

interface SessionControlProps {
  tasting: Tasting;
  totalWhiskies: number;
}

export function SessionControl({ tasting, totalWhiskies }: SessionControlProps) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { currentParticipant } = useAppStore();
  const isMobile = useIsMobile();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPermanentDeleteDialog, setShowPermanentDeleteDialog] = useState(false);
  const [showRevealConfirm, setShowRevealConfirm] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  const isAdmin = currentParticipant?.role === "admin";

  const updateStatus = useMutation({
    mutationFn: (params: { status: string; currentAct?: string }) =>
      tastingApi.updateStatus(tasting.id, params.status, params.currentAct, tasting.hostId),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["tasting", tasting.id] });
      queryClient.invalidateQueries({ queryKey: ["tastings"] });
      if (vars.status === "deleted") {
        navigate("/sessions");
      }
    },
  });

  const hardDelete = useMutation({
    mutationFn: () => tastingApi.hardDelete(tasting.id, currentParticipant!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tastings"] });
      navigate("/sessions");
    },
  });

  const revealNext = useMutation({
    mutationFn: () => blindModeApi.revealNext(tasting.id, tasting.hostId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasting", tasting.id] });
    },
  });

  const handleNextState = () => {
    const status = tasting.status;
    const currentAct = tasting.currentAct || "act1";

    if (status === "draft") updateStatus.mutate({ status: "open" });
    else if (status === "open") updateStatus.mutate({ status: "closed" });
    else if (status === "closed") setShowRevealConfirm(true);
    else if (status === "reveal") {
      if (currentAct === "act1") updateStatus.mutate({ status: "reveal", currentAct: "act2" });
      else if (currentAct === "act2") updateStatus.mutate({ status: "reveal", currentAct: "act3" });
      else if (currentAct === "act3") updateStatus.mutate({ status: "reveal", currentAct: "act4" });
      else updateStatus.mutate({ status: "archived" });
    }
  };

  const handleArchive = () => {
    updateStatus.mutate({ status: "archived" });
  };

  const handleSoftDelete = () => {
    updateStatus.mutate({ status: "deleted" });
    setShowDeleteDialog(false);
  };

  const handlePermanentDelete = () => {
    hardDelete.mutate();
    setShowPermanentDeleteDialog(false);
    setConfirmName("");
  };

  const getButtonConfig = () => {
    const status = tasting.status;
    if (status === "draft") return { label: t('session.actions.start'), icon: Play };
    if (status === "open") return { label: t('session.actions.close'), icon: Lock };
    if (status === "closed") return { label: t('session.actions.reveal'), icon: Eye };
    if (status === "reveal") return { label: t('session.actions.nextAct'), icon: ChevronRight };
    return { label: t('session.actions.archive'), icon: Archive };
  };

  const { label, icon: Icon } = getButtonConfig();

  const showBlindControls = tasting.blindMode && (tasting.status === "draft" || tasting.status === "open" || tasting.status === "closed");
  const revealIndex = tasting.revealIndex ?? 0;
  const revealStep = tasting.revealStep ?? 0;
  const allRevealed = revealIndex >= totalWhiskies;

  const getStepLabel = () => {
    if (revealStep === 1) return t("blind.stepName");
    if (revealStep === 2) return t("blind.stepMeta");
    if (revealStep === 3) return t("blind.stepImage");
    return null;
  };

  const canDelete = tasting.status !== "open";
  const showArchiveDelete = tasting.status !== "archived" && tasting.status !== "deleted";

  const SoftDeleteDialog = () => (
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('session.actions.deleteConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('session.actions.deleteConfirmMessage')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('session.actions.deleteCancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSoftDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t('session.actions.deleteConfirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const RevealConfirmDialog = () => (
    <AlertDialog open={showRevealConfirm} onOpenChange={setShowRevealConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('session.actions.revealConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('session.actions.revealConfirmMessage')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('session.actions.deleteCancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              updateStatus.mutate({ status: "reveal", currentAct: "act1" });
              setShowRevealConfirm(false);
            }}
            data-testid="button-confirm-reveal"
          >
            {t('session.actions.revealConfirmAction')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const PermanentDeleteDialog = () => (
    <Dialog open={showPermanentDeleteDialog} onOpenChange={(open) => { setShowPermanentDeleteDialog(open); if (!open) setConfirmName(""); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            {t('session.actions.permanentDeleteTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('session.actions.permanentDeleteMessage')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <label className="text-sm font-medium text-foreground">
            {t('session.actions.permanentDeleteTypeName')}
          </label>
          <Input
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={tasting.title}
            className="font-mono"
            data-testid="input-confirm-delete-name"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setShowPermanentDeleteDialog(false); setConfirmName(""); }}>
            {t('session.actions.deleteCancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handlePermanentDelete}
            disabled={confirmName !== tasting.title || hardDelete.isPending}
            data-testid="button-confirm-permanent-delete"
          >
            {t('session.actions.permanentDeleteConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const BlindControlsContent = () => {
    if (!showBlindControls) return null;
    return (
      <div className="flex flex-col gap-2">
        <div className="text-xs text-muted-foreground font-mono" data-testid="text-blind-progress">
          {allRevealed
            ? t("blind.allRevealed")
            : t("blind.revealProgress", { current: revealIndex + 1, total: totalWhiskies })}
        </div>
        {!allRevealed && revealStep > 0 && (
          <div className="text-xs text-muted-foreground/80" data-testid="text-blind-step">
            {getStepLabel()}
          </div>
        )}
        <Button
          onClick={() => revealNext.mutate()}
          disabled={revealNext.isPending || allRevealed}
          variant="outline"
          className="w-full"
          data-testid="button-reveal-next"
        >
          <Glasses className="w-4 h-4 mr-2" /> {t("blind.revealNext")}
        </Button>
      </div>
    );
  };

  const SecondaryActions = () => {
    if (!showArchiveDelete) return null;
    return (
      <div className="flex flex-col gap-1">
        {tasting.status !== "draft" && tasting.status !== "open" && (
          <button
            onClick={() => { handleArchive(); setShowDrawer(false); }}
            className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-sm hover:bg-secondary/50 w-full"
            data-testid="button-archive-session"
          >
            <Archive className="w-3.5 h-3.5" />
            {t('session.actions.archive')}
          </button>
        )}
        <button
          onClick={() => { if (canDelete) { setShowDeleteDialog(true); setShowDrawer(false); } }}
          className={`flex items-center gap-2 px-3 py-2 text-xs rounded-sm w-full transition-colors ${canDelete ? "text-muted-foreground hover:text-destructive hover:bg-destructive/5 cursor-pointer" : "text-muted-foreground/40 cursor-not-allowed"}`}
          title={!canDelete ? t('session.actions.cannotDeleteActive') : undefined}
          data-testid="button-delete-session"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {t('session.actions.deleteSession')}
        </button>
      </div>
    );
  };

  if (tasting.status === "deleted") {
    if (!isAdmin) return null;
    return (
      <>
        <div className={`fixed inset-x-0 z-50 px-3 pb-2 ${isMobile ? "bottom-16" : "bottom-0 pb-4"}`}>
          <div className="bg-card border border-border/50 shadow-2xl rounded-xl px-4 py-3 flex items-center justify-between gap-3 mx-auto max-w-xl">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2 h-2 rounded-full bg-destructive/70 shrink-0" />
              <span className="text-xs font-mono text-destructive/70 truncate">{t('session.actions.deleteSession')}</span>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowPermanentDeleteDialog(true)}
              className="shrink-0 h-8 text-xs"
              data-testid="button-permanent-delete"
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
              {t('session.actions.permanentDelete')}
            </Button>
          </div>
        </div>
        <PermanentDeleteDialog />
      </>
    );
  }

  if (tasting.status === "archived") {
    return (
      <>
        <div className={`fixed inset-x-0 z-50 px-3 pb-2 ${isMobile ? "bottom-16" : "bottom-0 pb-4"}`}>
          <div className="bg-card border border-border/50 shadow-2xl rounded-xl px-4 py-3 flex items-center justify-between gap-3 mx-auto max-w-xl">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2 h-2 rounded-full bg-muted-foreground shrink-0" />
              <span className="text-xs font-serif font-bold text-primary truncate">{t(`session.status.${tasting.status}`)}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => canDelete ? setShowDeleteDialog(true) : undefined}
              className="shrink-0 h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
              data-testid="button-delete-session"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              {t('session.actions.deleteSession')}
            </Button>
          </div>
        </div>
        <SoftDeleteDialog />
      </>
    );
  }

  return (
    <>
      <div className={`fixed inset-x-0 z-50 px-3 pb-2 ${isMobile ? "bottom-16" : "bottom-0 pb-4"}`}>
        <div className="bg-card border border-border/50 shadow-2xl rounded-xl px-3 py-2.5 flex items-center gap-2 mx-auto max-w-xl">
          <div className="flex items-center gap-2 min-w-0 shrink">
            <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
            <span className="text-xs font-serif font-bold text-primary truncate">
              {t(`session.status.${tasting.status}`)}
              {tasting.status === "reveal" && tasting.currentAct && (
                <span className="ml-1 opacity-70">({t(`reveal.${tasting.currentAct}`)})</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {showBlindControls && !allRevealed && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => revealNext.mutate()}
                disabled={revealNext.isPending || allRevealed}
                className="h-8 text-xs px-2.5"
                data-testid="button-reveal-next"
              >
                <Glasses className="w-3.5 h-3.5 mr-1" />
                {t("blind.revealNext")}
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleNextState}
              disabled={updateStatus.isPending}
              className="h-8 text-xs px-3 bg-primary text-primary-foreground shadow-md"
              data-testid="button-next-state"
            >
              <Icon className="w-3.5 h-3.5 mr-1" /> {label}
            </Button>
            {(showArchiveDelete || showBlindControls) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDrawer(true)}
                className="h-8 w-8 p-0 text-muted-foreground"
                data-testid="button-host-drawer"
              >
                <Settings2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <Drawer open={showDrawer} onOpenChange={setShowDrawer}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="font-serif text-primary">Host Control</DrawerTitle>
            <DrawerDescription className="text-xs">
              {t(`session.status.${tasting.status}`)}
              {tasting.status === "reveal" && tasting.currentAct && (
                <span className="ml-1 opacity-70">({t(`reveal.${tasting.currentAct}`)})</span>
              )}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-4">
            <Button
              onClick={() => { handleNextState(); setShowDrawer(false); }}
              disabled={updateStatus.isPending}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg h-11"
              data-testid="button-next-state-drawer"
            >
              <Icon className="w-4 h-4 mr-2" /> {label}
            </Button>

            {showBlindControls && (
              <div className="pt-2 border-t border-border/50">
                <BlindControlsContent />
              </div>
            )}

            {showArchiveDelete && (
              <div className="pt-2 border-t border-border/50">
                <SecondaryActions />
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <SoftDeleteDialog />
      <RevealConfirmDialog />
    </>
  );
}

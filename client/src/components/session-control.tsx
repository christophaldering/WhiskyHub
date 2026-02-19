import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { Play, Lock, Eye, Archive, ChevronRight, Glasses, Trash2, AlertTriangle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { tastingApi, blindModeApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useAppStore } from "@/lib/store";
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

interface SessionControlProps {
  tasting: Tasting;
  totalWhiskies: number;
}

export function SessionControl({ tasting, totalWhiskies }: SessionControlProps) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { currentParticipant } = useAppStore();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPermanentDeleteDialog, setShowPermanentDeleteDialog] = useState(false);
  const [showRevealConfirm, setShowRevealConfirm] = useState(false);
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

  const showBlindControls = tasting.blindMode && (tasting.status === "open" || tasting.status === "closed");
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

  if (tasting.status === "deleted") {
    if (!isAdmin) return null;
    return (
      <div className="fixed bottom-20 md:bottom-6 right-6 z-50">
        <div className="bg-card border border-border/50 shadow-2xl p-4 rounded-lg flex flex-col gap-2 min-w-[200px]">
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">
            Host Control
          </div>
          <div className="text-sm font-serif font-bold text-destructive/70 mb-3">
            {t('session.actions.deleteSession')}
          </div>
          <button
            onClick={() => setShowPermanentDeleteDialog(true)}
            className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-destructive transition-colors rounded-sm hover:bg-destructive/5 w-full"
            data-testid="button-permanent-delete"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {t('session.actions.permanentDelete')}
          </button>
        </div>
        <PermanentDeleteDialog />
      </div>
    );
  }

  if (tasting.status === "archived") {
    return (
      <div className="fixed bottom-20 md:bottom-6 right-6 z-50">
        <div className="bg-card border border-border/50 shadow-2xl p-4 rounded-lg flex flex-col gap-2 min-w-[200px]">
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">
            Host Control
          </div>
          <div className="text-sm font-serif font-bold text-primary mb-3">
            {t(`session.status.${tasting.status}`)}
          </div>
          <button
            onClick={() => canDelete ? setShowDeleteDialog(true) : undefined}
            className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-destructive transition-colors rounded-sm hover:bg-destructive/5 w-full"
            data-testid="button-delete-session"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t('session.actions.deleteSession')}
          </button>
        </div>
        <SoftDeleteDialog />
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-50">
      <div className="bg-card border border-border/50 shadow-2xl p-4 rounded-lg flex flex-col gap-2 min-w-[200px]">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">
          Host Control
        </div>
        <div className="text-sm font-serif font-bold text-primary mb-3">
          {t(`session.status.${tasting.status}`)}
          {tasting.status === "reveal" && tasting.currentAct && (
            <span className="ml-2 opacity-70">({t(`reveal.${tasting.currentAct}`)})</span>
          )}
        </div>
        <Button
          onClick={handleNextState}
          disabled={updateStatus.isPending}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
          data-testid="button-next-state"
        >
          <Icon className="w-4 h-4 mr-2" /> {label}
        </Button>
        {showBlindControls && (
          <div className="mt-3 pt-3 border-t border-border/50 flex flex-col gap-2">
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
        )}

        {showArchiveDelete && (
          <div className="mt-3 pt-3 border-t border-border/50 flex flex-col gap-1">
            {tasting.status !== "draft" && tasting.status !== "open" && (
              <button
                onClick={handleArchive}
                className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-sm hover:bg-secondary/50 w-full"
                data-testid="button-archive-session"
              >
                <Archive className="w-3.5 h-3.5" />
                {t('session.actions.archive')}
              </button>
            )}
            <button
              onClick={() => canDelete ? setShowDeleteDialog(true) : undefined}
              className={`flex items-center gap-2 px-3 py-2 text-xs rounded-sm w-full transition-colors ${canDelete ? "text-muted-foreground hover:text-destructive hover:bg-destructive/5 cursor-pointer" : "text-muted-foreground/40 cursor-not-allowed"}`}
              title={!canDelete ? t('session.actions.cannotDeleteActive') : undefined}
              data-testid="button-delete-session"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t('session.actions.deleteSession')}
            </button>
          </div>
        )}
      </div>

      <SoftDeleteDialog />
      <RevealConfirmDialog />
    </div>
  );
}

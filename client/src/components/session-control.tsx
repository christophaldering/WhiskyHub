import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Play, Lock, Eye, Archive, ChevronRight, Glasses } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { tastingApi, blindModeApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import type { Tasting } from "@shared/schema";

interface SessionControlProps {
  tasting: Tasting;
  totalWhiskies: number;
}

export function SessionControl({ tasting, totalWhiskies }: SessionControlProps) {
  const { t } = useTranslation();

  const updateStatus = useMutation({
    mutationFn: (params: { status: string; currentAct?: string }) =>
      tastingApi.updateStatus(tasting.id, params.status, params.currentAct),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasting", tasting.id] });
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
    else if (status === "closed") updateStatus.mutate({ status: "reveal", currentAct: "act1" });
    else if (status === "reveal") {
      if (currentAct === "act1") updateStatus.mutate({ status: "reveal", currentAct: "act2" });
      else if (currentAct === "act2") updateStatus.mutate({ status: "reveal", currentAct: "act3" });
      else if (currentAct === "act3") updateStatus.mutate({ status: "reveal", currentAct: "act4" });
      else updateStatus.mutate({ status: "archived" });
    }
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

  if (tasting.status === "archived") return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
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
      </div>
    </div>
  );
}

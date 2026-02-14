import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Play, Lock, Eye, Archive, ChevronRight } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { tastingApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import type { Tasting } from "@shared/schema";

interface SessionControlProps {
  tasting: Tasting;
}

export function SessionControl({ tasting }: SessionControlProps) {
  const { t } = useTranslation();

  const updateStatus = useMutation({
    mutationFn: (params: { status: string; currentAct?: string }) =>
      tastingApi.updateStatus(tasting.id, params.status, params.currentAct),
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
      </div>
    </div>
  );
}

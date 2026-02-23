import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { useBlindState } from "@/hooks/use-blind-state";
import { tastingApi, blindModeApi } from "@/lib/api";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RevealView } from "./reveal-view";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Monitor,
  Smartphone,
  Users,
  Glasses,
  Check,
  Archive,
  Play,
  SkipForward,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useInputFocused } from "@/hooks/use-input-focused";
import type { Whisky, Tasting } from "@shared/schema";

interface RevealPresenterProps {
  tasting: Tasting;
  whiskies: Whisky[];
  onExit: () => void;
}

export function RevealPresenter({ tasting, whiskies, onExit }: RevealPresenterProps) {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const isHost = tasting.hostId === currentParticipant?.id;
  const [selectedWhiskyIdx, setSelectedWhiskyIdx] = useState(0);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);

  const currentAct = tasting.currentAct || "act1";
  const activeWhisky = whiskies[selectedWhiskyIdx] || whiskies[0];

  const inputFocused = useInputFocused();
  const { data: participants = [] } = useQuery({
    queryKey: ["tasting-participants", tasting.id],
    queryFn: () => tastingApi.getParticipants(tasting.id),
    refetchInterval: inputFocused ? false : 10000,
  });

  const updateStatus = useMutation({
    mutationFn: (params: { status: string; currentAct?: string }) =>
      tastingApi.updateStatus(tasting.id, params.status, params.currentAct, tasting.hostId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasting", tasting.id] });
      queryClient.invalidateQueries({ queryKey: ["tastings"] });
    },
  });

  const revealNext = useMutation({
    mutationFn: () => blindModeApi.revealNext(tasting.id, tasting.hostId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasting", tasting.id] });
    },
  });

  const handleNextAct = () => {
    if (currentAct === "act1") updateStatus.mutate({ status: "reveal", currentAct: "act2" });
    else if (currentAct === "act2") updateStatus.mutate({ status: "reveal", currentAct: "act3" });
    else if (currentAct === "act3") updateStatus.mutate({ status: "reveal", currentAct: "act4" });
    else updateStatus.mutate({ status: "archived" });
  };

  const handleGoToAct = (act: string) => {
    updateStatus.mutate({ status: "reveal", currentAct: act });
  };

  const acts = [
    { id: "act1", label: t("reveal.act1"), num: 1 },
    { id: "act2", label: t("reveal.act2Short", { defaultValue: t("reveal.act2") }), num: 2 },
    { id: "act3", label: t("reveal.act3Short", { defaultValue: t("reveal.act3") }), num: 3 },
    { id: "act4", label: t("reveal.act4Short", { defaultValue: t("reveal.act4") }), num: 4 },
  ];

  const currentActIdx = acts.findIndex(a => a.id === currentAct);
  const isLastAct = currentAct === "act4";

  const { revealIndex, revealStep, getBlindState: getBlindStateForWhisky } = useBlindState(
    tasting, isHost, { ignoreStatus: true, ignoreHost: true }
  );
  const allRevealed = revealIndex >= whiskies.length;
  const showBlindControls = tasting.blindMode;

  const getStepLabel = () => {
    if (revealStep === 1) return t("blind.stepName");
    if (revealStep === 2) return t("blind.stepMeta");
    if (revealStep === 3) return t("blind.stepImage");
    return t("presenter.allHidden");
  };

  if (!isHost) {
    return (
      <div className="fixed inset-0 bg-background z-50 overflow-y-auto" data-testid="reveal-presenter-participant">
        <div className="min-h-screen flex flex-col">
          <header className="flex items-center justify-between px-4 py-3 border-b border-border/30">
            <Button variant="ghost" size="sm" onClick={onExit} className="font-serif text-xs" data-testid="button-exit-presenter">
              <ChevronLeft className="w-4 h-4 mr-1" /> {t("presenter.backToRoom")}
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                {t(`reveal.${currentAct}`)}
              </span>
            </div>
          </header>

          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-4xl px-4">
              <div className="text-center mb-4">
                <h2 className="text-2xl sm:text-3xl font-serif font-black text-primary">{tasting.title}</h2>
              </div>
              <div className="flex items-center justify-center gap-2 mb-6 overflow-x-auto no-scrollbar">
                {whiskies.map((w, idx) => (
                  <button
                    key={w.id}
                    onClick={() => setSelectedWhiskyIdx(idx)}
                    className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-full text-xs font-serif font-bold transition-all",
                      idx === selectedWhiskyIdx
                        ? "bg-primary text-primary-foreground scale-110 shadow-md"
                        : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                    )}
                    data-testid={`presenter-whisky-${idx}`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
              {activeWhisky && <RevealView whisky={activeWhisky} tasting={tasting} />}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-hidden" data-testid="reveal-presenter-host">
      <div className="h-full flex flex-col">
        <header className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-card/50 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onExit} className="font-serif text-xs" data-testid="button-exit-presenter">
              <ChevronLeft className="w-4 h-4 mr-1" /> {t("presenter.backToRoom")}
            </Button>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <Monitor className="w-3.5 h-3.5" />
              <span className="font-serif">{t("presenter.mode")}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              <span>{participants.length}</span>
            </div>
            <span className="text-xs font-serif font-bold text-primary">{tasting.title}</span>
          </div>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <div className="flex-1 overflow-y-auto" data-testid="presenter-participant-view">
            <div className="p-4 lg:p-8">
              <div className="hidden lg:flex items-center gap-2 mb-3">
                <Smartphone className="w-4 h-4 text-muted-foreground/50" />
                <span className="text-xs font-serif text-muted-foreground/50 uppercase tracking-widest">
                  {t("presenter.participantView")}
                </span>
              </div>

              <div className="lg:border lg:border-border/30 lg:rounded-xl lg:bg-card/30 lg:p-6 lg:shadow-inner">
                <div className="flex items-center justify-center gap-2 mb-4 overflow-x-auto no-scrollbar">
                  {whiskies.map((w, idx) => (
                    <button
                      key={w.id}
                      onClick={() => setSelectedWhiskyIdx(idx)}
                      className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full text-xs font-serif font-bold transition-all",
                        idx === selectedWhiskyIdx
                          ? "bg-primary text-primary-foreground scale-110 shadow-md"
                          : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                      )}
                      data-testid={`presenter-whisky-${idx}`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
                {activeWhisky && <RevealView whisky={activeWhisky} tasting={tasting} />}
              </div>
            </div>
          </div>

          <div className={cn(
            "border-t lg:border-t-0 lg:border-l border-border/30 bg-card/80 backdrop-blur-sm flex-shrink-0 overflow-y-auto",
            controlsCollapsed ? "lg:w-16" : "lg:w-80"
          )}>
            <div className="lg:hidden">
              <button
                onClick={() => setControlsCollapsed(!controlsCollapsed)}
                className="w-full flex items-center justify-center py-1.5 text-muted-foreground/50"
              >
                <div className="w-10 h-1 rounded-full bg-border" />
              </button>
            </div>

            <div className="hidden lg:flex items-center justify-between px-4 py-2 border-b border-border/20">
              <span className="text-xs font-serif font-bold text-primary uppercase tracking-widest">
                {!controlsCollapsed && t("presenter.hostControls")}
              </span>
              <button
                onClick={() => setControlsCollapsed(!controlsCollapsed)}
                className="p-1 rounded hover:bg-secondary/50 text-muted-foreground"
                data-testid="button-toggle-controls"
              >
                {controlsCollapsed ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
            </div>

            {!controlsCollapsed && (
              <div className="p-4 space-y-5">
                <div data-testid="presenter-act-nav">
                  <span className="text-[10px] font-serif font-bold text-muted-foreground uppercase tracking-widest block mb-2">
                    {t("presenter.acts")}
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {acts.map((act, idx) => (
                      <button
                        key={act.id}
                        onClick={() => handleGoToAct(act.id)}
                        className={cn(
                          "flex flex-col items-center py-2 px-1 rounded-lg text-center transition-all",
                          act.id === currentAct
                            ? "bg-primary text-primary-foreground shadow-md"
                            : idx < currentActIdx
                              ? "bg-green-500/10 text-green-700 hover:bg-green-500/20"
                              : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                        )}
                        data-testid={`presenter-act-${act.id}`}
                      >
                        <span className="text-sm font-bold font-mono">{act.num}</span>
                        <span className="text-[9px] font-serif leading-tight mt-0.5 line-clamp-1">{act.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border/20 pt-4">
                  <Button
                    onClick={handleNextAct}
                    disabled={updateStatus.isPending}
                    className="w-full bg-primary text-primary-foreground font-serif gap-2"
                    data-testid="button-presenter-next-act"
                  >
                    {isLastAct ? (
                      <><Archive className="w-4 h-4" /> {t("presenter.finishReveal")}</>
                    ) : (
                      <><SkipForward className="w-4 h-4" /> {t("presenter.nextAct")}</>
                    )}
                  </Button>
                </div>

                <div data-testid="presenter-whisky-nav">
                  <span className="text-[10px] font-serif font-bold text-muted-foreground uppercase tracking-widest block mb-2">
                    {t("presenter.expressions")}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {whiskies.map((w, idx) => (
                      <button
                        key={w.id}
                        onClick={() => setSelectedWhiskyIdx(idx)}
                        className={cn(
                          "w-8 h-8 rounded-full text-xs font-serif font-bold transition-all",
                          idx === selectedWhiskyIdx
                            ? "bg-primary text-primary-foreground ring-2 ring-primary/30 scale-110"
                            : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                        )}
                        title={w.name}
                        data-testid={`presenter-ctrl-whisky-${idx}`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                  {activeWhisky && (
                    <p className="text-xs font-serif text-muted-foreground mt-2 truncate" data-testid="presenter-active-name">
                      {activeWhisky.name}
                    </p>
                  )}
                </div>

                {showBlindControls && (
                  <div className="border-t border-border/20 pt-4" data-testid="presenter-blind-controls">
                    <span className="text-[10px] font-serif font-bold text-muted-foreground uppercase tracking-widest block mb-2">
                      {t("presenter.blindReveal")}
                    </span>
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground font-mono" data-testid="presenter-blind-progress">
                        {allRevealed
                          ? t("blind.allRevealed")
                          : t("blind.revealProgress", { current: revealIndex + 1, total: whiskies.length })}
                      </div>
                      {!allRevealed && revealStep > 0 && (
                        <div className="text-xs text-muted-foreground/80">
                          {getStepLabel()}
                        </div>
                      )}
                      <Button
                        onClick={() => revealNext.mutate()}
                        disabled={revealNext.isPending || allRevealed}
                        variant="outline"
                        className="w-full font-serif text-xs gap-2"
                        data-testid="presenter-button-reveal-next"
                      >
                        <Glasses className="w-4 h-4" /> {t("blind.revealNext")}
                      </Button>
                    </div>
                  </div>
                )}

                {showBlindControls && activeWhisky && (
                  <div className="border-t border-border/20 pt-4" data-testid="presenter-host-preview">
                    <span className="text-[10px] font-serif font-bold text-amber-600 uppercase tracking-widest block mb-2">
                      {t("presenter.hostPreview")}
                    </span>
                    {(() => {
                      const blind = getBlindStateForWhisky(selectedWhiskyIdx, activeWhisky);
                      const nextStep = !blind.showName ? t("blind.stepName") : !blind.showMeta ? t("blind.stepMeta") : !blind.showImage ? t("blind.stepImage") : null;
                      return (
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 space-y-2">
                          {activeWhisky.imageUrl && (
                            <div className="flex justify-center">
                              <img
                                src={activeWhisky.imageUrl}
                                alt={activeWhisky.name}
                                className={cn("w-16 h-16 rounded-lg object-cover border", blind.showImage ? "border-green-500/40 opacity-100" : "border-amber-500/40 opacity-70")}
                                data-testid="presenter-preview-image"
                              />
                            </div>
                          )}
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              {blind.showName ? <Eye className="w-3 h-3 text-green-600 flex-shrink-0" /> : <EyeOff className="w-3 h-3 text-amber-600 flex-shrink-0" />}
                              <span className={cn("text-xs font-serif font-bold", blind.showName ? "text-foreground" : "text-amber-700")}>{activeWhisky.name}</span>
                            </div>
                            {activeWhisky.distillery && (
                              <div className="flex items-center gap-1.5">
                                {blind.showName ? <Eye className="w-3 h-3 text-green-600 flex-shrink-0" /> : <EyeOff className="w-3 h-3 text-amber-600 flex-shrink-0" />}
                                <span className={cn("text-[11px] font-serif italic", blind.showName ? "text-muted-foreground" : "text-amber-700/70")}>{activeWhisky.distillery}</span>
                              </div>
                            )}
                            {(activeWhisky.age || activeWhisky.abv != null || activeWhisky.caskInfluence) && (
                              <div className="flex items-center gap-1.5">
                                {blind.showMeta ? <Eye className="w-3 h-3 text-green-600 flex-shrink-0" /> : <EyeOff className="w-3 h-3 text-amber-600 flex-shrink-0" />}
                                <span className={cn("text-[11px] font-mono", blind.showMeta ? "text-muted-foreground" : "text-amber-700/70")}>
                                  {[
                                    activeWhisky.age && (activeWhisky.age === "NAS" ? "NAS" : `${activeWhisky.age}y`),
                                    activeWhisky.abv != null && `${activeWhisky.abv}%`,
                                    activeWhisky.caskInfluence,
                                    activeWhisky.region,
                                  ].filter(Boolean).join(" · ")}
                                </span>
                              </div>
                            )}
                          </div>
                          {nextStep && (
                            <div className="flex items-center gap-1.5 pt-1 border-t border-amber-500/10">
                              <ChevronRight className="w-3 h-3 text-amber-600" />
                              <span className="text-[10px] font-serif text-amber-600">
                                {t("presenter.nextRevealStep")}: {nextStep}
                              </span>
                            </div>
                          )}
                          {!nextStep && selectedWhiskyIdx < whiskies.length - 1 && !allRevealed && (
                            <div className="flex items-center gap-1.5 pt-1 border-t border-amber-500/10">
                              <ChevronRight className="w-3 h-3 text-amber-600" />
                              <span className="text-[10px] font-serif text-amber-600">
                                {t("presenter.nextWhiskyHint", { name: whiskies[revealIndex < whiskies.length ? revealIndex : selectedWhiskyIdx]?.name || "" })}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="border-t border-border/20 pt-4" data-testid="presenter-participants-see">
                  <span className="text-[10px] font-serif font-bold text-muted-foreground uppercase tracking-widest block mb-2">
                    {t("presenter.participantsSee")}
                  </span>
                  <div className="bg-secondary/30 rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <Eye className="w-3.5 h-3.5 text-primary" />
                      <span className="font-serif text-foreground/80">
                        {t(`reveal.${currentAct}`)}
                      </span>
                    </div>
                    {activeWhisky && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground font-serif">
                          {t("presenter.viewingWhisky")}: <span className="text-foreground font-medium">{activeWhisky.name}</span>
                        </span>
                      </div>
                    )}
                    {showBlindControls && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Glasses className="w-3 h-3" />
                        <span className="font-serif">
                          {allRevealed ? t("blind.allRevealed") : getStepLabel()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

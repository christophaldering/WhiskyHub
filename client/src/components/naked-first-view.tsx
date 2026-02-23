import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { ratingApi } from "@/lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { ProgressiveRevealDrawer } from "./progressive-reveal-drawer";
import { Check, X, ChevronUp, ChevronDown, Maximize2, Info, MessageSquare } from "lucide-react";
import type { Tasting, Whisky } from "@shared/schema";
import type { BlindState } from "@/hooks/use-blind-state";

interface NakedFirstViewProps {
  tasting: Tasting;
  whiskies: Whisky[];
  getBlindState: (idx: number, whisky?: Whisky, forEval?: boolean) => BlindState;
  isHost: boolean;
  onExpand: () => void;
}

function NakedWhiskyRatingCard({
  whisky,
  index,
  tasting,
  blindState,
  onInfoClick,
}: {
  whisky: Whisky;
  index: number;
  tasting: Tasting;
  blindState: BlindState;
  onInfoClick: () => void;
}) {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const participantId = currentParticipant?.id || "";
  const scale = tasting.ratingScale || 100;
  const step = scale <= 5 ? 0.5 : scale <= 10 ? 0.5 : scale <= 20 ? 1 : 1;
  const mid = Math.round(scale / 2);
  const isLocked = tasting.status !== "open" && tasting.status !== "draft";

  const { data: existingRating } = useQuery({
    queryKey: ["rating", participantId, whisky.id],
    queryFn: () => ratingApi.getMyRating(participantId, whisky.id),
    enabled: !!participantId && !!whisky.id,
  });

  const [scores, setScores] = useState<Record<string, number | null>>({
    nose: null, taste: null, finish: null, balance: null, overall: null,
  });
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [overallManual, setOverallManual] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (existingRating) {
      setScores({
        nose: existingRating.nose ?? null,
        taste: existingRating.taste ?? null,
        finish: existingRating.finish ?? null,
        balance: existingRating.balance ?? null,
        overall: existingRating.overall ?? null,
      });
      setNotes(existingRating.notes || "");
      if (existingRating.overall != null) setOverallManual(true);
    }
  }, [existingRating]);

  const computeAvg = useCallback((s: Record<string, number | null>) => {
    const vals = [s.nose, s.taste, s.finish, s.balance].filter(v => v !== null) as number[];
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * (1 / step)) / (1 / step);
  }, [step]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => ratingApi.upsert(data),
    onSuccess: () => {
      setSaved(true);
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ["rating", participantId, whisky.id] });
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      setScores(currentScores => {
        const hasAny = Object.values(currentScores).some(v => v !== null);
        if (hasAny && participantId) {
          saveMutation.mutate({
            participantId,
            whiskyId: whisky.id,
            tastingId: tasting.id,
            ...currentScores,
            notes,
          });
        }
        return currentScores;
      });
    }, 1500);
  }, [participantId, whisky.id, tasting.id, notes]);

  const handleScore = (key: string, val: number) => {
    setScores(prev => {
      const next = { ...prev, [key]: val };
      if (key === "overall") {
        setOverallManual(true);
      } else if (!overallManual) {
        next.overall = computeAvg(next);
      }
      return next;
    });
    setIsDirty(true);
    triggerAutoSave();
  };

  const clearScore = (key: string) => {
    setScores(prev => {
      const next = { ...prev, [key]: null };
      if (key === "overall") setOverallManual(false);
      if (key !== "overall" && !overallManual) next.overall = computeAvg(next);
      return next;
    });
    setIsDirty(true);
    triggerAutoSave();
  };

  const resetScore = (key: string) => handleScore(key, mid);

  const whiskyLabel = blindState.showName ? whisky.name : `Whisky ${index + 1}`;
  const showImage = blindState.showImage && whisky.imageUrl && !imgErr;

  const categories = [
    { id: "nose" as const, label: t("evaluation.nose"), emoji: "👃" },
    { id: "taste" as const, label: t("evaluation.taste"), emoji: "👅" },
    { id: "finish" as const, label: t("evaluation.finish"), emoji: "✨" },
    { id: "balance" as const, label: t("evaluation.balance"), emoji: "⚖️" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Card className="p-4 border-border/30 bg-card/70" data-testid={`naked-first-whisky-${whisky.id}`}>
        <div className="flex gap-3 mb-3">
          {showImage && (
            <img
              src={whisky.imageUrl!}
              alt={whiskyLabel}
              className="w-14 h-14 object-cover rounded-lg border border-border/50 flex-shrink-0"
              onError={() => setImgErr(true)}
              data-testid={`img-naked-first-whisky-${whisky.id}`}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center font-serif flex-shrink-0">
                  {index + 1}
                </span>
                <h3 className="font-serif font-bold text-primary text-sm truncate">{whiskyLabel}</h3>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {saved && (
                  <span className="text-[10px] text-green-600 flex items-center gap-1 font-mono">
                    <Check className="w-3 h-3" /> saved
                  </span>
                )}
                {existingRating && !saved && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    ✓ {t("evaluation.rated", "bewertet")}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                  onClick={onInfoClick}
                  data-testid={`button-info-${whisky.id}`}
                >
                  <Info className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            {blindState.showMeta && (whisky.distillery || whisky.age || whisky.abv) && (
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono uppercase">
                {[whisky.distillery, whisky.age ? `${whisky.age}y` : null, whisky.abv ? `${whisky.abv}%` : null].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>

        {!isLocked ? (
          <div className="space-y-3">
            {categories.map(cat => {
              const val = scores[cat.id];
              const isNull = val === null;
              return (
                <div key={cat.id} className="flex items-center gap-2">
                  <span className="text-[10px] font-serif font-bold text-muted-foreground uppercase w-12 flex-shrink-0">
                    {cat.emoji} {cat.label}
                  </span>
                  {isNull ? (
                    <button
                      onClick={() => resetScore(cat.id)}
                      className="flex-1 text-center text-[10px] text-muted-foreground/50 border border-dashed border-border/30 rounded py-1 hover:bg-secondary/30 transition-colors"
                      data-testid={`naked-first-restore-${cat.id}-${whisky.id}`}
                    >
                      {t("evaluation.tapToRate", "Tippen zum Bewerten")}
                    </button>
                  ) : (
                    <Slider
                      value={[val]}
                      max={scale}
                      step={step}
                      min={0}
                      onValueChange={(v) => handleScore(cat.id, v[0])}
                      className="flex-1"
                      data-testid={`naked-first-slider-${cat.id}-${whisky.id}`}
                    />
                  )}
                  <span className="text-xs font-mono font-bold w-8 text-right">{isNull ? "–" : val}</span>
                  <button
                    onClick={() => isNull ? resetScore(cat.id) : clearScore(cat.id)}
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                      isNull ? "text-muted-foreground/30 hover:text-primary" : "text-muted-foreground/40 hover:text-destructive"
                    )}
                    data-testid={`naked-first-clear-${cat.id}-${whisky.id}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
            <div className="flex items-center gap-2 pt-1 border-t border-border/20">
              <span className="text-[10px] font-serif font-bold text-primary uppercase w-12 flex-shrink-0">
                ⭐ {t("evaluation.overall")}
              </span>
              {scores.overall !== null ? (
                <Slider
                  value={[scores.overall]}
                  max={scale}
                  step={step}
                  min={0}
                  onValueChange={(v) => handleScore("overall", v[0])}
                  className="flex-1 [&_[role=slider]]:bg-primary [&_[data-orientation=horizontal]>span:first-child>span]:bg-primary/30"
                  data-testid={`naked-first-slider-overall-${whisky.id}`}
                />
              ) : (
                <button
                  onClick={() => resetScore("overall")}
                  className="flex-1 text-center text-[10px] text-muted-foreground/50 border border-dashed border-border/30 rounded py-1 hover:bg-secondary/30 transition-colors"
                  data-testid={`naked-first-restore-overall-${whisky.id}`}
                >
                  {t("evaluation.tapToRate", "Tippen zum Bewerten")}
                </button>
              )}
              <span className="text-xs font-mono font-bold w-8 text-right text-primary">
                {scores.overall !== null ? scores.overall : "–"}
              </span>
              <button
                onClick={() => scores.overall !== null ? clearScore("overall") : resetScore("overall")}
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                  scores.overall === null ? "text-muted-foreground/30 hover:text-primary" : "text-muted-foreground/40 hover:text-destructive"
                )}
                data-testid={`naked-first-clear-overall-${whisky.id}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            <button
              onClick={() => setShowNotes(!showNotes)}
              className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary transition-colors font-serif"
              data-testid={`button-toggle-notes-${whisky.id}`}
            >
              <MessageSquare className="w-3 h-3" />
              {t("nakedFirst.notes")}
              {showNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <AnimatePresence>
              {showNotes && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <Textarea
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                      setIsDirty(true);
                      triggerAutoSave();
                    }}
                    placeholder={t("nakedFirst.notesPlaceholder")}
                    className="text-xs min-h-[60px] bg-secondary/20 border-border/30 resize-none"
                    data-testid={`textarea-notes-${whisky.id}`}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-3">
            <p className="text-xs text-muted-foreground font-serif">{t("nakedFirst.locked")}</p>
            {scores.overall !== null && (
              <p className="text-lg font-serif font-bold text-primary mt-1">
                {scores.overall} / {scale}
              </p>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
}

export function NakedFirstView({ tasting, whiskies, getBlindState, isHost, onExpand }: NakedFirstViewProps) {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerWhiskyIdx, setDrawerWhiskyIdx] = useState(0);

  const canShowGroupComparison = useCallback((idx: number, hasUserRated: boolean, hostUnlocked: boolean) => {
    const blind = getBlindState(idx);
    if (blind.showName && blind.showMeta) return true;
    if (isHost) return true;
    if (hostUnlocked) return true;
    return blind.showName && hasUserRated;
  }, [getBlindState, isHost]);

  const ratedCount = useQuery({
    queryKey: ["my-ratings-count", tasting.id, currentParticipant?.id],
    queryFn: async () => {
      if (!currentParticipant?.id) return 0;
      let count = 0;
      for (const w of whiskies) {
        const r = queryClient.getQueryData(["rating", currentParticipant.id, w.id]) as any;
        if (r?.overall != null) count++;
      }
      return count;
    },
    enabled: !!currentParticipant?.id,
    refetchInterval: 5000,
  });

  const openDrawer = (idx: number) => {
    setDrawerWhiskyIdx(idx);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6" data-testid="naked-first-view">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif font-bold text-xl text-primary" data-testid="text-naked-first-title">
            {tasting.title}
          </h2>
          <p className="text-xs text-muted-foreground font-serif mt-1">
            {whiskies.length} {t("nakedFirst.whiskies")} · {ratedCount.data || 0}/{whiskies.length} {t("nakedFirst.rated")}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onExpand}
          className="font-serif text-xs gap-1.5"
          data-testid="button-expand-view"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          {t("nakedFirst.expand")}
        </Button>
      </div>

      <div className="space-y-3">
        {whiskies.map((whisky, idx) => (
          <NakedWhiskyRatingCard
            key={whisky.id}
            whisky={whisky}
            index={idx}
            tasting={tasting}
            blindState={getBlindState(idx, whisky)}
            onInfoClick={() => openDrawer(idx)}
          />
        ))}
      </div>

      <ProgressiveRevealDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        tasting={tasting}
        whiskies={whiskies}
        activeWhiskyIdx={drawerWhiskyIdx}
        getBlindState={getBlindState}
        isHost={isHost}
        canShowGroupComparison={canShowGroupComparison}
      />
    </div>
  );
}

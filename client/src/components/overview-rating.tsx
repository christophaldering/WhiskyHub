import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { ratingApi } from "@/lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { X, Lock, ImageIcon, Check } from "lucide-react";
import { useLayoutFullBleed } from "@/components/layout";
import { motion } from "framer-motion";
import type { Whisky, Tasting } from "@shared/schema";

type BlindState = { showName: boolean; showMeta: boolean; showImage: boolean };

interface OverviewRatingProps {
  tasting: Tasting;
  whiskies: Whisky[];
  onExit: () => void;
  getBlindState: (idx: number, whisky?: Whisky) => BlindState;
}

const DETAIL_KEYS = ["nose", "taste", "finish", "balance"] as const;
type ScoreKey = "nose" | "taste" | "finish" | "balance" | "overall";
type ScoreVal = number | null;
type Scores = Record<ScoreKey, ScoreVal>;

const EMOJI: Record<string, string> = { nose: "👃", taste: "👅", finish: "✨", balance: "⚖️" };

function WhiskyCard({
  whisky,
  index,
  tasting,
  participantId,
  blind,
  isLocked,
}: {
  whisky: Whisky;
  index: number;
  tasting: Tasting;
  participantId: string;
  blind: BlindState;
  isLocked: boolean;
}) {
  const { t } = useTranslation();
  const scale = tasting.ratingScale || 100;
  const mid = scale / 2;
  const step = scale >= 100 ? 1 : scale >= 20 ? 0.5 : 0.1;
  const [imgErr, setImgErr] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: existingRating } = useQuery({
    queryKey: ["rating", participantId, whisky.id],
    queryFn: () => ratingApi.getMyRating(participantId, whisky.id),
    enabled: !!participantId && !!whisky.id,
  });

  const [scores, setScores] = useState<Scores>({ nose: mid, taste: mid, finish: mid, balance: mid, overall: mid });
  const [isDirty, setIsDirty] = useState(false);
  const [overallManual, setOverallManual] = useState(false);

  const detailKeys = DETAIL_KEYS;

  const computeAvg = useCallback((s: Scores) => {
    const factor = step < 1 ? (1 / step) : 1;
    const keys = ["nose", "taste", "finish", "balance"];
    const vals = keys.map(k => s[k as ScoreKey]).filter((v): v is number => v !== null);
    if (vals.length === 0) return null;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Math.round(avg * factor) / factor;
  }, [step]);

  useEffect(() => {
    if (existingRating) {
      const loaded: Scores = {
        nose: existingRating.nose,
        taste: existingRating.taste,
        finish: existingRating.finish,
        balance: existingRating.balance,
        overall: existingRating.overall,
      };
      setScores(loaded);
      const avg = computeAvg(loaded);
      if (avg !== null && loaded.overall !== null) {
        setOverallManual(Math.abs(loaded.overall - avg) > 0.01);
      }
      setIsDirty(false);
    }
  }, [existingRating]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => ratingApi.upsert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rating", participantId, whisky.id] });
      queryClient.invalidateQueries({ queryKey: ["ratings", tasting.id] });
      queryClient.invalidateQueries({ queryKey: ["ratings-whisky", whisky.id] });
      setIsDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);
  const latestScoresRef = useRef(scores);
  latestScoresRef.current = scores;
  isDirtyRef.current = isDirty;

  const triggerAutoSave = useCallback(() => {
    if (!participantId || !whisky?.id || isLocked) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveMutation.mutate({
        tastingId: tasting.id,
        whiskyId: whisky.id,
        participantId,
        ...latestScoresRef.current,
        notes: existingRating?.notes || "",
        guessAbv: existingRating?.guessAbv ?? undefined,
        guessAge: existingRating?.guessAge || undefined,
      });
    }, 800);
  }, [participantId, whisky?.id, tasting.id, isLocked, existingRating]);

  useEffect(() => {
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, []);

  useEffect(() => {
    if (isLocked && isDirtyRef.current && whisky?.id) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      if (!participantId) return;
      ratingApi.upsert({
        tastingId: tasting.id,
        whiskyId: whisky.id,
        participantId,
        ...latestScoresRef.current,
        notes: existingRating?.notes || "",
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["rating", participantId, whisky.id] });
        queryClient.invalidateQueries({ queryKey: ["ratings", tasting.id] });
      });
    }
  }, [isLocked]);

  const handleScoreChange = useCallback((key: ScoreKey, value: number) => {
    const factor = step < 1 ? (1 / step) : 1;
    const clamped = Math.max(0, Math.min(scale, Math.round(value * factor) / factor));
    if (key === "overall") {
      setOverallManual(true);
      setScores(prev => ({ ...prev, overall: clamped }));
    } else {
      setScores(prev => {
        const next = { ...prev, [key]: clamped };
        if (!overallManual) {
          next.overall = computeAvg(next);
        }
        return next;
      });
    }
    setIsDirty(true);
    triggerAutoSave();
  }, [triggerAutoSave, scale, step, overallManual, computeAvg]);

  const clearScore = (key: ScoreKey) => {
    setScores(prev => {
      const next = { ...prev, [key]: null };
      if (key === "overall") {
        setOverallManual(false);
        next.overall = computeAvg(next);
      } else if (!overallManual) {
        next.overall = computeAvg(next);
      }
      return next;
    });
    setIsDirty(true);
    triggerAutoSave();
  };

  const resetScore = (key: ScoreKey) => {
    handleScoreChange(key, mid);
  };

  const label = blind.showName ? whisky.name : `#${index + 1}`;
  const showImage = blind.showImage && whisky.imageUrl && !imgErr;

  const categories = detailKeys.map(k => ({
    id: k as ScoreKey,
    label: t(`evaluation.${k}`),
    emoji: EMOJI[k],
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className={cn(
        "p-4 border-border/30 bg-card/70",
        existingRating ? "border-green-500/20" : ""
      )} data-testid={`overview-row-${whisky.id}`}>
        <div className="flex gap-3 mb-3">
          {showImage ? (
            <img
              src={whisky.imageUrl!}
              alt={label}
              className="w-12 h-12 object-cover rounded-lg border border-border/50 flex-shrink-0"
              onError={() => setImgErr(true)}
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-secondary/30 border border-border/30 flex items-center justify-center flex-shrink-0">
              <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center font-serif flex-shrink-0">{index + 1}</span>
                <h3 className="font-serif font-bold text-primary text-sm truncate">{label}</h3>
              </div>
              {saved && (
                <span className="text-[10px] text-green-600 flex items-center gap-1 font-mono flex-shrink-0">
                  <Check className="w-3 h-3" /> saved
                </span>
              )}
              {existingRating && !saved && (
                <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
                  ✓ {t("evaluation.rated", "bewertet")}
                </span>
              )}
              {isLocked && (
                <Lock className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
              )}
            </div>
            {blind.showMeta && (whisky.distillery || whisky.age || whisky.abv) && (
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
                  <span className="text-[10px] font-serif font-bold text-muted-foreground uppercase w-12 flex-shrink-0">{cat.emoji} {cat.label}</span>
                  {isNull ? (
                    <button
                      onClick={() => resetScore(cat.id)}
                      className="flex-1 text-center text-[10px] text-muted-foreground/50 border border-dashed border-border/30 rounded py-1 hover:bg-secondary/30 transition-colors"
                      data-testid={`overview-restore-${cat.id}-${whisky.id}`}
                    >
                      {t("evaluation.tapToRate", "Tippen zum Bewerten")}
                    </button>
                  ) : (
                    <Slider
                      value={[val]}
                      max={scale} step={step} min={0}
                      onValueChange={(v) => handleScoreChange(cat.id, v[0])}
                      className="flex-1"
                      data-testid={`overview-slider-${cat.id}-${whisky.id}`}
                    />
                  )}
                  <span className="text-xs font-mono font-bold w-8 text-right">{isNull ? "–" : val}</span>
                  <button
                    onClick={() => isNull ? resetScore(cat.id) : clearScore(cat.id)}
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                      isNull ? "text-muted-foreground/30 hover:text-primary" : "text-muted-foreground/40 hover:text-destructive"
                    )}
                    data-testid={`overview-clear-${cat.id}-${whisky.id}`}
                    title={isNull ? t("evaluation.tapToRate", "Bewerten") : t("evaluation.clearRating", "Bewertung entfernen")}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
            <div className="flex items-center gap-2 pt-1 border-t border-border/20">
              <span className="text-[10px] font-serif font-bold text-primary uppercase flex-shrink-0">{t("evaluation.overall")}</span>
              {scores.overall !== null ? (
                <Slider
                  value={[scores.overall]}
                  max={scale} step={step} min={0}
                  onValueChange={(v) => handleScoreChange("overall", v[0])}
                  className="flex-1 [&_[role=slider]]:bg-primary [&_[data-orientation=horizontal]>span:first-child>span]:bg-primary/30"
                  data-testid={`overview-slider-overall-${whisky.id}`}
                />
              ) : (
                <button
                  onClick={() => resetScore("overall")}
                  className="flex-1 text-center text-[10px] text-muted-foreground/50 border border-dashed border-border/30 rounded py-1 hover:bg-secondary/30"
                >
                  {t("evaluation.tapToRate", "Tippen zum Bewerten")}
                </button>
              )}
              <span className="text-sm font-mono font-black text-primary w-8 text-right">{scores.overall !== null ? scores.overall : "–"}</span>
              {overallManual && (
                <button
                  onClick={() => { setOverallManual(false); setScores(prev => ({ ...prev, overall: computeAvg(prev) })); setIsDirty(true); triggerAutoSave(); }}
                  className="text-[8px] text-primary/60 hover:text-primary font-mono flex-shrink-0"
                  title={t("evaluation.resetToAvg", "Auf Durchschnitt zurücksetzen")}
                >
                  ↺
                </button>
              )}
              <button
                onClick={() => scores.overall !== null ? clearScore("overall") : resetScore("overall")}
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-muted-foreground/40 hover:text-destructive transition-colors"
                data-testid={`overview-clear-overall-${whisky.id}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <span className="text-xs text-muted-foreground font-serif">{t("evaluation.locked", "Bewertung abgeschlossen")}</span>
            {existingRating && (
              <div className="mt-1 text-lg font-mono font-black text-primary">{existingRating.overall}</div>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
}

export function OverviewRating({ tasting, whiskies, onExit, getBlindState }: OverviewRatingProps) {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const participantId = currentParticipant?.id || "";
  const isLocked = tasting.status !== "open" && tasting.status !== "draft";

  useLayoutFullBleed(true);

  return (
    <div className="bg-background min-h-[calc(100dvh-4rem)]">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/30 px-3 sm:px-4 py-3">
        <div className="w-full flex items-center justify-between">
          <div>
            <h1 className="font-serif font-bold text-lg">{t("overview.title", "Alle bewerten")}</h1>
            <p className="text-xs text-muted-foreground font-serif">{tasting.title} · {whiskies.length} {t("overview.whiskies", "Whiskys")}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onExit} data-testid="button-exit-overview">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-3 sm:px-4 py-3 sm:py-4 pb-24">
        <div className="flex flex-col gap-3">
          {whiskies.map((whisky, idx) => {
            const blind = getBlindState(idx, whisky);
            return (
              <WhiskyCard
                key={whisky.id}
                whisky={whisky}
                index={idx}
                tasting={tasting}
                participantId={participantId}
                blind={blind}
                isLocked={isLocked}
              />
            );
          })}
          <p className="text-[10px] text-center text-muted-foreground/50 pt-2 font-serif">
            {t("naked.autoSave", "Bewertungen werden automatisch gespeichert")}
          </p>
        </div>
      </div>
    </div>
  );
}

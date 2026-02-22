import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { ratingApi } from "@/lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { X, Lock, ImageIcon, ChevronDown, ChevronsUpDown } from "lucide-react";
import { useInputFocused } from "@/hooks/use-input-focused";
import { useLayoutFullBleed } from "@/components/layout";
import type { Whisky, Tasting } from "@shared/schema";

type BlindState = { showName: boolean; showMeta: boolean; showImage: boolean };

interface OverviewRatingProps {
  tasting: Tasting;
  whiskies: Whisky[];
  onExit: () => void;
  getBlindState: (idx: number, whisky?: Whisky) => BlindState;
}

const SCORE_KEYS = ["nose", "taste", "finish", "balance", "overall"] as const;
type ScoreKey = typeof SCORE_KEYS[number];
type Scores = Record<ScoreKey, number>;

function WhiskyRow({
  whisky,
  index,
  tasting,
  participantId,
  blind,
  isLocked,
  expanded,
  onToggle,
}: {
  whisky: Whisky;
  index: number;
  tasting: Tasting;
  participantId: string;
  blind: BlindState;
  isLocked: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const scale = tasting.ratingScale || 100;
  const mid = scale / 2;
  const step = scale >= 100 ? 1 : scale >= 20 ? 0.5 : 0.1;
  const { currentParticipant } = useAppStore();
  const expLevel = currentParticipant?.experienceLevel;
  const isSimplified = expLevel === "guest" || expLevel === "explorer";
  const [imgErr, setImgErr] = useState(false);

  const inputFocused = useInputFocused();
  const { data: existingRating } = useQuery({
    queryKey: ["rating", participantId, whisky.id],
    queryFn: () => ratingApi.getMyRating(participantId, whisky.id),
    enabled: !!participantId && !!whisky.id,
  });

  const [scores, setScores] = useState<Scores>({ nose: mid, taste: mid, finish: mid, balance: mid, overall: mid });
  const [isDirty, setIsDirty] = useState(false);
  const [overallManual, setOverallManual] = useState(false);

  const computeAvg = useCallback((s: typeof scores) => {
    const factor = step < 1 ? (1 / step) : 1;
    const avg = isSimplified
      ? (s.nose + s.taste + s.finish) / 3
      : (s.nose + s.taste + s.finish + s.balance) / 4;
    return Math.round(avg * factor) / factor;
  }, [step, isSimplified]);

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
      setOverallManual(Math.abs(loaded.overall - avg) > 0.01);
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
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
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

  const label = blind.showName ? whisky.name : `#${index + 1}`;
  const hasRating = !!existingRating;

  const categories: { id: ScoreKey; short: string }[] = isSimplified
    ? [
        { id: "nose", short: t("evaluation.nose") },
        { id: "taste", short: t("evaluation.taste") },
        { id: "finish", short: t("evaluation.finish") },
        { id: "overall", short: t("evaluation.overall") },
      ]
    : [
        { id: "nose", short: t("evaluation.nose") },
        { id: "taste", short: t("evaluation.taste") },
        { id: "finish", short: t("evaluation.finish") },
        { id: "balance", short: t("evaluation.balance") },
        { id: "overall", short: t("evaluation.overall") },
      ];

  const overallCategory = categories.find(c => c.id === "overall")!;
  const detailCategories = categories.filter(c => c.id !== "overall");

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 sm:p-4 space-y-2 sm:space-y-3",
        hasRating ? "border-green-500/30 bg-green-500/5" : "border-border/40"
      )}
      data-testid={`overview-row-${whisky.id}`}
    >
      <div
        className="flex items-center gap-3 cursor-pointer md:cursor-default"
        onClick={onToggle}
        data-testid={`overview-toggle-${whisky.id}`}
      >
        {blind.showImage && whisky.imageUrl && !imgErr ? (
          <img
            src={whisky.imageUrl}
            alt={label}
            className="w-10 h-10 rounded-md object-cover border border-border/30 flex-shrink-0"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-10 h-10 rounded-md bg-secondary/30 border border-border/30 flex items-center justify-center flex-shrink-0">
            <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground/60 w-5 flex-shrink-0">#{index + 1}</span>
            <span className="font-serif font-bold text-sm truncate">{label}</span>
          </div>
          {blind.showMeta && (whisky.distillery || whisky.age || whisky.abv) && (
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
              {[whisky.distillery, whisky.age ? `${whisky.age}y` : null, whisky.abv ? `${whisky.abv}%` : null].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {!expanded && !isLocked && (
          <div className="flex items-center gap-1.5 md:hidden flex-shrink-0">
            <span className="text-[9px] font-serif font-bold text-muted-foreground uppercase">{overallCategory.short}</span>
            <span className="text-sm font-mono font-bold w-8 text-right">{scores.overall}</span>
          </div>
        )}

        {isLocked && (
          <Lock className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
        )}
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground/50 flex-shrink-0 transition-transform md:hidden",
            expanded && "rotate-180"
          )}
        />
      </div>

      <div className="hidden md:block">
        {!isLocked ? (
          <div className="grid grid-cols-5 gap-5">
            {categories.map((cat) => (
              <div key={cat.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-serif font-bold text-muted-foreground uppercase tracking-wider">{cat.short}</span>
                  <Input
                    type="number"
                    value={scores[cat.id]}
                    onChange={(e) => handleScoreChange(cat.id, parseFloat(e.target.value) || 0)}
                    className="w-12 text-right font-mono text-xs font-bold border-none bg-transparent h-5 p-0 focus:ring-0"
                    step={step} min={0} max={scale}
                    disabled={isLocked}
                    data-testid={`overview-input-${cat.id}-${whisky.id}`}
                  />
                </div>
                <Slider
                  value={[scores[cat.id]]}
                  max={scale} step={step} min={0}
                  onValueChange={(val) => handleScoreChange(cat.id, val[0])}
                  className={cn("cursor-pointer", cat.id === "overall" ? "[&_[role=slider]]:bg-primary [&_[data-orientation=horizontal]>span:first-child>span]:bg-primary/30" : "")}
                  disabled={isLocked}
                  data-testid={`overview-slider-${cat.id}-${whisky.id}`}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-5">
            {categories.map((cat) => (
              <div key={cat.id} className="text-center">
                <span className="text-[10px] font-serif text-muted-foreground uppercase block">{cat.short}</span>
                <span className="text-sm font-mono font-bold">{scores[cat.id]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {expanded && (
        <div className="md:hidden">
          {!isLocked ? (
            <div className="space-y-2.5 pt-1">
              {categories.map((cat) => (
                <div key={cat.id} className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-[10px] font-serif font-bold uppercase tracking-wider",
                      cat.id === "overall" ? "text-primary" : "text-muted-foreground"
                    )}>{cat.short}</span>
                    <Input
                      type="number"
                      value={scores[cat.id]}
                      onChange={(e) => handleScoreChange(cat.id, parseFloat(e.target.value) || 0)}
                      className="w-12 text-right font-mono text-xs font-bold border-none bg-transparent h-5 p-0 focus:ring-0"
                      step={step} min={0} max={scale}
                      disabled={isLocked}
                      data-testid={`overview-input-mobile-${cat.id}-${whisky.id}`}
                    />
                  </div>
                  <Slider
                    value={[scores[cat.id]]}
                    max={scale} step={step} min={0}
                    onValueChange={(val) => handleScoreChange(cat.id, val[0])}
                    className={cn("cursor-pointer", cat.id === "overall" ? "[&_[role=slider]]:bg-primary [&_[data-orientation=horizontal]>span:first-child>span]:bg-primary/30" : "")}
                    disabled={isLocked}
                    data-testid={`overview-slider-mobile-${cat.id}-${whisky.id}`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-4 pt-1">
              {categories.map((cat) => (
                <div key={cat.id} className="text-center">
                  <span className="text-[9px] font-serif text-muted-foreground uppercase block">{cat.short}</span>
                  <span className="text-sm font-mono font-bold">{scores[cat.id]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function OverviewRating({ tasting, whiskies, onExit, getBlindState }: OverviewRatingProps) {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const participantId = currentParticipant?.id || "";
  const isLocked = tasting.status !== "open" && tasting.status !== "draft";

  useLayoutFullBleed(true);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const allExpanded = expandedIds.size === whiskies.length;

  const toggleOne = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allExpanded) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(whiskies.map(w => w.id)));
    }
  }, [allExpanded, whiskies]);

  return (
    <div className="bg-background min-h-[calc(100dvh-4rem)]">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/30 px-3 sm:px-4 py-3">
        <div className="w-full flex items-center justify-between">
          <div>
            <h1 className="font-serif font-bold text-lg">{t("overview.title", "Alle bewerten")}</h1>
            <p className="text-xs text-muted-foreground font-serif">{tasting.title} · {whiskies.length} {t("overview.whiskies", "Whiskys")}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAll}
              className="md:hidden text-xs text-muted-foreground gap-1 h-8"
              data-testid="button-toggle-all-overview"
            >
              <ChevronsUpDown className="w-4 h-4" />
              {allExpanded ? t("overview.collapseAll", "Zuklappen") : t("overview.expandAll", "Aufklappen")}
            </Button>
            <Button variant="ghost" size="icon" onClick={onExit} data-testid="button-exit-overview">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="w-full px-3 sm:px-4 py-3 sm:py-4 pb-24">
        <div className="flex flex-col gap-3 sm:gap-4 w-full">
          {whiskies.map((whisky, idx) => {
            const blind = getBlindState(idx, whisky);
            return (
              <WhiskyRow
                key={whisky.id}
                whisky={whisky}
                index={idx}
                tasting={tasting}
                participantId={participantId}
                blind={blind}
                isLocked={isLocked}
                expanded={expandedIds.has(whisky.id)}
                onToggle={() => toggleOne(whisky.id)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

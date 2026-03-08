import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { useAIStatus } from "@/hooks/use-ai-status";
import { ratingApi, tastingApi, whiskyApi, blindModeApi } from "@/lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { TastingNoteGenerator } from "./tasting-note-generator";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  Users,
  Sparkles,
  Eye,
  EyeOff,
  Loader2,
  BookOpen,
  Lock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useInputFocused } from "@/hooks/use-input-focused";
import type { Whisky, Tasting } from "@shared/schema";
import {
  type BaselineType,
  type BaselineStats,
  type Dimension,
  type HistoricalRating,
  useBaselineComputation,
  parseComparableSettings,
  DEFAULT_SETTINGS,
} from "@/lib/comparable-baseline";

interface FocusedTastingProps {
  tasting: Tasting;
  whiskies: Whisky[];
  onExit: () => void;
  contextLevel?: 0 | 1 | 2;
}

function DramTimer({ startedAt, accumulated = 0 }: { startedAt: Date | string | null; accumulated?: number }) {
  const { t } = useTranslation();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) {
      setElapsed(0);
      return;
    }
    const start = new Date(startedAt).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const total = accumulated + elapsed;
  if (!startedAt && accumulated === 0) return null;

  const mins = Math.floor(total / 60);
  const secs = total % 60;

  return (
    <div className="flex items-center gap-1.5 text-muted-foreground/60 text-xs font-mono" data-testid="dram-timer">
      <Clock className="w-3 h-3" />
      <span>{mins}:{secs.toString().padStart(2, "0")}</span>
      <span className="text-[10px] font-serif italic ml-1">{t("focus.timeElapsed")}</span>
    </div>
  );
}

function RatingProgress({ tastingId, whiskyId, isHost, participantCount }: { tastingId: string; whiskyId: string; isHost: boolean; participantCount: number }) {
  const { t } = useTranslation();

  const inputFocused = useInputFocused();
  const { data: ratings = [] } = useQuery({
    queryKey: ["ratings-whisky", whiskyId],
    queryFn: () => ratingApi.getForWhisky(whiskyId),
    refetchInterval: inputFocused ? false : (isHost ? 5000 : 15000),
  });

  const ratedCount = new Set(ratings.map((r: any) => r.participantId)).size;
  const total = participantCount;
  const allRated = ratedCount >= total && total > 0;

  if (!isHost) return null;

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-serif",
      allRated ? "bg-green-500/10 text-green-700" : "bg-secondary/50 text-muted-foreground"
    )} data-testid="rating-progress">
      <Users className="w-3.5 h-3.5" />
      <span>{t("focus.ratingsProgress", { count: ratedCount, total })}</span>
      {allRated && <Check className="w-3.5 h-3.5" />}
    </div>
  );
}

function PersonalProgress({ tastingId, participantId, totalWhiskies }: { tastingId: string; participantId: string; totalWhiskies: number }) {
  const { t } = useTranslation();

  const inputFocused = useInputFocused();
  const { data: allRatings = [] } = useQuery({
    queryKey: ["ratings", tastingId],
    queryFn: () => ratingApi.getForTasting(tastingId),
    refetchInterval: inputFocused ? false : 10000,
  });

  const myRatedCount = new Set(allRatings.filter((r: any) => r.participantId === participantId).map((r: any) => r.whiskyId)).size;
  const allDone = myRatedCount >= totalWhiskies && totalWhiskies > 0;

  if (totalWhiskies === 0) return null;

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-serif",
      allDone ? "bg-green-500/10 text-green-700" : "bg-secondary/50 text-muted-foreground"
    )} data-testid="personal-rating-progress">
      <Check className="w-3.5 h-3.5" />
      <span>{t("focus.personalProgress", { count: myRatedCount, total: totalWhiskies })}</span>
    </div>
  );
}

function AiInsightsPanel({ whisky, tasting }: { whisky: Whisky; tasting: Tasting }) {
  const { t, i18n } = useTranslation();
  const { currentParticipant } = useAppStore();
  const { isFeatureDisabled } = useAIStatus();
  const aiDisabled = isFeatureDisabled("ai_insights");
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [insightsPrompt, setInsightsPrompt] = useState("");

  const fetchInsights = async (forceRefresh = false) => {
    if (insights && !forceRefresh) {
      setExpanded(!expanded);
      return;
    }
    setLoading(true);
    setExpanded(true);
    try {
      const res = await fetch("/api/whiskies/ai-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: currentParticipant?.id,
          whiskyId: whisky.id,
          whiskyName: whisky.name,
          distillery: whisky.distillery,
          region: whisky.region,
          age: whisky.age,
          abv: whisky.abv,
          caskInfluence: whisky.caskInfluence,
          category: whisky.category,
          peatLevel: whisky.peatLevel,
          language: i18n.language,
          customPrompt: insightsPrompt.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setInsights(data.insights);
    } catch {
      setInsights(t("focus.insightsError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2" data-testid="ai-insights-panel">
      <Button
        variant="ghost"
        size="sm"
        onClick={fetchInsights}
        disabled={loading || aiDisabled}
        className={`w-full justify-between font-serif text-xs text-muted-foreground hover:text-primary border border-dashed border-border/50 hover:border-primary/30 ${aiDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
        data-testid="button-ai-insights"
        title={aiDisabled ? t("admin.aiDisabledHint") : undefined}
      >
        <span className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          {t("focus.learnMore")}
        </span>
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : expanded ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
      </Button>
      {expanded && (
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={insightsPrompt}
            onChange={(e) => setInsightsPrompt(e.target.value)}
            maxLength={500}
            placeholder={t("customPrompt.insightsPlaceholder", "e.g. 'Focus on production process'")}
            className="flex-1 text-xs px-3 py-1.5 rounded-md border border-border/40 bg-background text-foreground placeholder:text-muted-foreground/50 outline-none"
            data-testid="input-insights-custom-prompt"
          />
          {insights && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchInsights(true)}
              disabled={loading}
              className="text-xs px-2 py-1 h-auto"
              data-testid="button-regenerate-insights"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : t("customPrompt.regenerate", "Refresh")}
            </Button>
          )}
        </div>
      )}
      <AnimatePresence>
        {expanded && insights && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-secondary/20 rounded-lg border border-border/30 text-sm font-serif leading-relaxed text-foreground/80 whitespace-pre-line" data-testid="text-ai-insights">
              {insights}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BaselineBand({ stats, scale, dimId }: { stats: BaselineStats | undefined; scale: number; dimId: string }) {
  if (!stats || stats.count === 0 || stats.state === "placeholder") return null;
  const p25Pct = (stats.p25 / scale) * 100;
  const p75Pct = (stats.p75 / scale) * 100;
  const medPct = (stats.median / scale) * 100;

  return (
    <div className="relative w-full h-2 mt-0.5" data-testid={`baseline-band-${dimId}`}>
      <div
        className="absolute top-0 h-full rounded-sm bg-amber-400/20 border border-amber-400/30"
        style={{ left: `${p25Pct}%`, width: `${Math.max(p75Pct - p25Pct, 0.5)}%` }}
      />
      <div
        className="absolute top-0 h-full w-0.5 bg-amber-500/60 rounded-full"
        style={{ left: `${medPct}%` }}
      />
    </div>
  );
}

export function FocusedTasting({ tasting, whiskies, onExit, contextLevel = 2 }: FocusedTastingProps) {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const participantId = currentParticipant?.id || "";
  const isHost = tasting.hostId === participantId;
  const scale = tasting.ratingScale || 100;
  const mid = scale / 2;
  const step = scale >= 100 ? 1 : scale >= 20 ? 0.5 : 0.1;


  const [activeIndex, setActiveIndex] = useState(() => {
    if (tasting.blindMode && tasting.revealIndex != null) return tasting.revealIndex;
    return 0;
  });

  const isBlind = tasting.blindMode && (tasting.status === "draft" || tasting.status === "open" || tasting.status === "closed");
  const revealIndex = tasting.revealIndex ?? 0;
  const revealStep = tasting.revealStep ?? 0;

  useEffect(() => {
    if (isBlind && !isHost) {
      setActiveIndex(revealIndex);
    }
  }, [revealIndex, isBlind, isHost]);

  const activeWhisky = whiskies[activeIndex] || whiskies[0];

  const [baselineType, setBaselineType] = useState<BaselineType>("overall");

  const { data: tastingHistory } = useQuery({
    queryKey: ["tasting-history-baseline", participantId],
    queryFn: async () => {
      const res = await fetch(`/api/participants/${participantId}/tasting-history`, { headers: { "x-participant-id": participantId } });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!participantId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: appSettings } = useQuery({
    queryKey: ["app-settings-public-baseline"],
    queryFn: async () => {
      const res = await fetch("/api/app-settings/public");
      if (!res.ok) return {};
      return res.json() as Promise<Record<string, string>>;
    },
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const comparableSettings = useMemo(
    () => (appSettings ? parseComparableSettings(appSettings) : DEFAULT_SETTINGS),
    [appSettings]
  );

  const historyRatings: HistoricalRating[] = useMemo(() => {
    if (!tastingHistory || !Array.isArray(tastingHistory)) return [];
    const ratings: HistoricalRating[] = [];
    for (const session of tastingHistory) {
      if (session.id === tasting.id) continue;
      for (const w of session.whiskies || []) {
        if (w.myRating) {
          ratings.push({
            whisky: {
              region: w.region,
              peatLevel: w.peatLevel,
              caskInfluence: w.caskInfluence,
              abv: w.abv,
              age: w.age,
            },
            nose: w.myRating.nose,
            taste: w.myRating.taste,
            finish: w.myRating.finish,
            balance: w.myRating.balance,
            overall: w.myRating.overall,
          });
        }
      }
    }
    return ratings;
  }, [tastingHistory, tasting.id]);

  const baselineDimensions: Dimension[] = useMemo(
    () => ["nose", "taste", "finish", "balance", "overall"],
    []
  );

  const whiskyMeta = useMemo(() => activeWhisky ? {
    region: activeWhisky.region,
    peatLevel: activeWhisky.peatLevel,
    caskInfluence: activeWhisky.caskInfluence,
    abv: activeWhisky.abv,
    age: activeWhisky.age,
  } : null, [activeWhisky?.id, activeWhisky?.region, activeWhisky?.peatLevel, activeWhisky?.caskInfluence, activeWhisky?.abv, activeWhisky?.age]);

  const baselineResult = useBaselineComputation(
    baselineType,
    whiskyMeta,
    historyRatings,
    baselineDimensions,
    comparableSettings,
    participantId
  );

  if (!activeWhisky) return null;

  const getBlindState = (idx: number, w?: Whisky, forEval = false) => {
    if (!isBlind) return { showName: true, showMeta: true, showImage: true };
    if (isHost && !forEval) return { showName: true, showMeta: true, showImage: true };
    if (idx < revealIndex) return { showName: true, showMeta: true, showImage: true };
    const photoRevealed = w?.photoRevealed ?? false;
    if (idx === revealIndex) return {
      showName: revealStep >= 1,
      showMeta: revealStep >= 2,
      showImage: revealStep >= 3 || photoRevealed,
    };
    return { showName: false, showMeta: false, showImage: photoRevealed };
  };

  const blind = getBlindState(activeIndex, activeWhisky);
  const evalBlind = getBlindState(activeIndex, activeWhisky, true);

  const inputFocused = useInputFocused();
  const { data: participants = [] } = useQuery({
    queryKey: ["tasting-participants", tasting.id],
    queryFn: () => tastingApi.getParticipants(tasting.id),
    refetchInterval: inputFocused ? false : 10000,
  });

  const { data: existingRating } = useQuery({
    queryKey: ["rating", participantId, activeWhisky.id],
    queryFn: () => ratingApi.getMyRating(participantId, activeWhisky.id),
    enabled: !!participantId && !!activeWhisky.id,
  });

  const [scores, setScores] = useState({ nose: mid, taste: mid, finish: mid, balance: mid, overall: mid });
  const [notes, setNotes] = useState("");
  const [guessAbv, setGuessAbv] = useState<number | null>(null);
  const [guessAge, setGuessAge] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [overallManual, setOverallManual] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const computeAvg = useCallback((s: typeof scores) => {
    const factor = step < 1 ? (1 / step) : 1;
    const avg = (s.nose + s.taste + s.finish + s.balance) / 4;
    return Math.round(avg * factor) / factor;
  }, [step]);

  const prevWhiskyIdForResetRef = useRef(activeWhisky.id);
  useEffect(() => {
    const whiskyChanged = prevWhiskyIdForResetRef.current !== activeWhisky.id;
    if (whiskyChanged) prevWhiskyIdForResetRef.current = activeWhisky.id;
    if (existingRating) {
      const loaded = { nose: existingRating.nose, taste: existingRating.taste, finish: existingRating.finish, balance: existingRating.balance, overall: existingRating.overall };
      setScores(loaded);
      const avg = computeAvg(loaded);
      setOverallManual(Math.abs(loaded.overall - avg) > 0.01);
      setNotes(existingRating.notes || "");
      setGuessAbv(existingRating.guessAbv ?? null);
      setGuessAge(existingRating.guessAge || "");
      setIsDirty(false);
    } else if (whiskyChanged) {
      setScores({ nose: mid, taste: mid, finish: mid, balance: mid, overall: mid });
      setOverallManual(false);
      setNotes("");
      setGuessAbv(null);
      setGuessAge("");
      setIsDirty(false);
    }
  }, [existingRating, activeWhisky.id]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => ratingApi.upsert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rating", participantId, activeWhisky.id] });
      queryClient.invalidateQueries({ queryKey: ["ratings", tasting.id] });
      queryClient.invalidateQueries({ queryKey: ["ratings-whisky", activeWhisky.id] });
      setIsDirty(false);
    },
  });

  const dramTimerMutation = useMutation({
    mutationFn: (whiskyId?: string) => fetch(`/api/tastings/${tasting.id}/dram-timer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId: participantId, whiskyId: whiskyId || activeWhisky?.id }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasting", tasting.id] });
    },
  });

  const revealNextMutation = useMutation({
    mutationFn: () => blindModeApi.revealNext(tasting.id, participantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasting", tasting.id] });
    },
  });

  const isLocked = tasting.status !== "open" && tasting.status !== "draft";

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);
  const latestScoresRef = useRef(scores);
  const latestNotesRef = useRef(notes);
  const latestGuessAbvRef = useRef(guessAbv);
  const latestGuessAgeRef = useRef(guessAge);
  const latestWhiskyIdRef = useRef(activeWhisky.id);
  latestScoresRef.current = scores;
  latestNotesRef.current = notes;
  latestGuessAbvRef.current = guessAbv;
  latestGuessAgeRef.current = guessAge;
  isDirtyRef.current = isDirty;

  const flushSave = useCallback((forWhiskyId: string) => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    if (!participantId || !isDirtyRef.current) return;
    ratingApi.upsert({
      tastingId: tasting.id,
      whiskyId: forWhiskyId,
      participantId,
      ...latestScoresRef.current,
      notes: latestNotesRef.current,
      guessAbv: latestGuessAbvRef.current ?? undefined,
      guessAge: latestGuessAgeRef.current || undefined,
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["rating", participantId, forWhiskyId] });
      queryClient.invalidateQueries({ queryKey: ["ratings", tasting.id] });
    });
  }, [participantId, tasting.id]);

  useEffect(() => {
    const prevWhiskyId = latestWhiskyIdRef.current;
    if (prevWhiskyId !== activeWhisky.id) {
      flushSave(prevWhiskyId);
      latestWhiskyIdRef.current = activeWhisky.id;
    }
  }, [activeWhisky.id, flushSave]);

  const triggerAutoSave = useCallback(() => {
    if (!participantId || !activeWhisky?.id || isLocked) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveMutation.mutate({
        tastingId: tasting.id,
        whiskyId: activeWhisky.id,
        participantId,
        ...latestScoresRef.current,
        notes: latestNotesRef.current,
        guessAbv: latestGuessAbvRef.current ?? undefined,
        guessAge: latestGuessAgeRef.current || undefined,
      });
    }, 800);
  }, [participantId, activeWhisky?.id, tasting.id, isLocked]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isLocked && isDirtyRef.current && activeWhisky?.id) {
      flushSave(activeWhisky.id);
    }
  }, [isLocked, activeWhisky?.id, flushSave]);

  const handleScoreChange = useCallback((key: string, value: number) => {
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


  const goToDram = (idx: number) => {
    if (idx >= 0 && idx < whiskies.length) {
      const targetWhisky = whiskies[idx];
      setActiveIndex(idx);
      if (isHost && targetWhisky) {
        dramTimerMutation.mutate(targetWhisky.id);
      }
    }
  };

  const dramTimers: Record<string, number> = tasting.dramTimers ? JSON.parse(tasting.dramTimers) : {};
  const currentAccumulated = dramTimers[activeWhisky.id] || 0;
  const isCurrentlyTimed = tasting.activeWhiskyId === activeWhisky.id;

  const categories = [
    { id: "nose", label: t("evaluation.nose"), emoji: "👃" },
    { id: "taste", label: t("evaluation.taste"), emoji: "👅" },
    { id: "finish", label: t("evaluation.finish"), emoji: "✨" },
    { id: "balance", label: t("evaluation.balance"), emoji: "⚖️" },
  ];

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto" style={{ height: '100dvh' }} data-testid="focused-tasting-screen">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/60 via-primary/40 to-amber-500/60" />
      <div className="flex flex-col max-w-2xl mx-auto px-4 pt-4 pb-[env(safe-area-inset-bottom,16px)]" style={{ minHeight: '100dvh' }}>
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onExit} className="font-serif text-xs gap-1" data-testid="button-exit-focus">
              <ChevronLeft className="w-4 h-4" /> {t("focus.backToRoom")}
            </Button>
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 rounded-full border border-amber-500/20">
              <Eye className="w-3 h-3 text-amber-600" />
              <span className="text-[10px] font-serif font-semibold text-amber-700 uppercase tracking-widest">{t("focus.enterFocus")}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DramTimer startedAt={isCurrentlyTimed ? tasting.dramStartedAt : null} accumulated={currentAccumulated} />
            {contextLevel >= 1 && (
              <PersonalProgress
                tastingId={tasting.id}
                participantId={participantId}
                totalWhiskies={whiskies.length}
              />
            )}
            {isHost && (
              <RatingProgress
                tastingId={tasting.id}
                whiskyId={activeWhisky.id}
                isHost={isHost}
                participantCount={participants.length}
              />
            )}
          </div>
        </header>


        {isHost && (
          <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/20" data-testid="focus-host-controls">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-serif font-bold text-primary uppercase tracking-widest">{t("guided.hostControl")}</span>
              <span className="text-xs font-mono text-muted-foreground">
                {t("focus.dramLabel", { current: activeIndex + 1, total: whiskies.length })}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {isBlind && (
                <Button
                  variant="outline"
                  size="sm"
                  className="font-serif text-xs border-primary/30 text-primary gap-1"
                  onClick={() => revealNextMutation.mutate()}
                  disabled={revealNextMutation.isPending}
                  data-testid="focus-host-reveal"
                >
                  <Eye className="w-3.5 h-3.5" /> {t("focus.revealNext")}
                </Button>
              )}
            </div>
            {isBlind && (() => {
              const participantBlind = getBlindState(activeIndex, activeWhisky, true);
              const nextStep = !participantBlind.showName ? t("blind.stepName") : !participantBlind.showMeta ? t("blind.stepMeta") : !participantBlind.showImage ? t("blind.stepImage") : null;
              if (!nextStep && participantBlind.showName && participantBlind.showMeta && participantBlind.showImage) return null;
              return (
                <div className="mt-3 bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5 space-y-1.5" data-testid="focus-host-preview">
                  <span className="text-[10px] font-serif font-bold text-amber-600 uppercase tracking-widest">{t("presenter.hostPreview")}</span>
                  <div className="flex items-start gap-2">
                    {activeWhisky.imageUrl && (
                      <img src={activeWhisky.imageUrl} alt={activeWhisky.name} className="w-10 h-10 rounded object-cover border border-amber-500/30 opacity-80 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1">
                        {participantBlind.showName ? <Eye className="w-2.5 h-2.5 text-green-600 flex-shrink-0" /> : <EyeOff className="w-2.5 h-2.5 text-amber-600 flex-shrink-0" />}
                        <span className="text-xs font-serif font-bold text-amber-700 truncate">{activeWhisky.name}</span>
                      </div>
                      {activeWhisky.distillery && (
                        <div className="flex items-center gap-1">
                          {participantBlind.showName ? <Eye className="w-2.5 h-2.5 text-green-600 flex-shrink-0" /> : <EyeOff className="w-2.5 h-2.5 text-amber-600 flex-shrink-0" />}
                          <span className="text-[11px] font-serif italic text-amber-700/70 truncate">{activeWhisky.distillery}</span>
                        </div>
                      )}
                      {(activeWhisky.age || activeWhisky.abv != null) && (
                        <div className="flex items-center gap-1">
                          {participantBlind.showMeta ? <Eye className="w-2.5 h-2.5 text-green-600 flex-shrink-0" /> : <EyeOff className="w-2.5 h-2.5 text-amber-600 flex-shrink-0" />}
                          <span className="text-[11px] font-mono text-amber-700/70">
                            {[activeWhisky.age && (activeWhisky.age === "NAS" ? "NAS" : `${activeWhisky.age}y`), activeWhisky.abv != null && `${activeWhisky.abv}%`, activeWhisky.caskInfluence].filter(Boolean).join(" · ")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {nextStep && (
                    <div className="flex items-center gap-1 text-[10px] font-serif text-amber-600 pt-0.5 border-t border-amber-500/10">
                      <ChevronRight className="w-2.5 h-2.5" />
                      <span>{t("presenter.nextRevealStep")}: {nextStep}</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        <div className="flex items-center justify-center gap-2 mb-4">
          {whiskies.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goToDram(idx)}
              className={cn(
                "w-8 h-8 rounded-full text-xs font-serif font-bold transition-all",
                idx === activeIndex
                  ? "bg-primary text-primary-foreground scale-110 shadow-md"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              )}
              data-testid={`focus-dram-${idx}`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeWhisky.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-1"
          >
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground/50 mb-2">
                <span>{t("focus.dramLabel", { current: activeIndex + 1, total: whiskies.length })}</span>
              </div>
              {activeWhisky.imageUrl && (!isBlind || evalBlind.showImage) && (
                <div className="flex justify-center mb-3">
                  <img
                    src={activeWhisky.imageUrl}
                    alt={evalBlind.showName ? activeWhisky.name : `${t("blind.expressionLabel")} ${activeIndex + 1}`}
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl object-cover border-2 border-amber-500/20 shadow-md"
                    data-testid="focus-whisky-image"
                  />
                </div>
              )}
              <h2 className="text-3xl sm:text-4xl font-serif font-black text-primary tracking-tight">
                {evalBlind.showName ? activeWhisky.name : `${t("blind.expressionLabel")} ${activeIndex + 1}`}
              </h2>
              {evalBlind.showName && activeWhisky.distillery && (
                <p className="text-muted-foreground font-serif italic mt-1">{activeWhisky.distillery}</p>
              )}
              {evalBlind.showMeta && (
                <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-sm font-mono text-muted-foreground">
                  {activeWhisky.age && <span>{activeWhisky.age === "NAS" ? "NAS" : `${activeWhisky.age}y`}</span>}
                  {activeWhisky.abv != null && <span>{activeWhisky.abv}%</span>}
                  {activeWhisky.bottler && <span className="text-primary/80">{activeWhisky.bottler}</span>}
                  {activeWhisky.vintage && <span>{activeWhisky.vintage}</span>}
                  {activeWhisky.region && <span>{activeWhisky.region}</span>}
                  {activeWhisky.category && <span>{activeWhisky.category}</span>}
                  {activeWhisky.price != null && <span>€{activeWhisky.price.toFixed(0)}</span>}
                  {activeWhisky.wbScore != null && <span className="text-primary font-bold">WB {activeWhisky.wbScore.toFixed(1)}</span>}
                </div>
              )}
              {!evalBlind.showName && isBlind && (
                <p className="text-xs text-muted-foreground font-serif italic mt-2">{t("blind.hidden")}</p>
              )}
            </div>

            {activeWhisky.hostNotes && (isHost || tasting.status === "reveal" || tasting.status === "archived") && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 rounded-lg"
                data-testid="host-notes-display"
              >
                <div className="flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-400">
                  <BookOpen className="w-4 h-4" />
                  <span className="text-xs font-serif font-bold uppercase tracking-widest">{t("focus.hostNotes")}</span>
                </div>
                <p className="text-sm font-serif leading-relaxed text-foreground/80 whitespace-pre-line">{activeWhisky.hostNotes}</p>
              </motion.div>
            )}

            {activeWhisky.hostSummary && evalBlind.showMeta && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg"
                data-testid="host-summary-display"
              >
                <div className="flex items-center gap-2 mb-2 text-primary">
                  <BookOpen className="w-4 h-4" />
                  <span className="text-xs font-serif font-bold uppercase tracking-widest">{t("whisky.hostSummary")}</span>
                </div>
                <p className="text-sm font-serif leading-relaxed text-foreground/80 whitespace-pre-line">{activeWhisky.hostSummary}</p>
              </motion.div>
            )}

            {!isLocked && (
              <div className="space-y-6 mb-6">
                {historyRatings.length > 0 && (
                  <div className="flex items-center gap-2 justify-end" data-testid="baseline-selector">
                    <span className="text-[10px] font-serif text-muted-foreground uppercase tracking-widest">{t("evaluation.baseline.label")}:</span>
                    <div className="flex rounded-full border border-border/50 overflow-hidden">
                      {(["overall", "comparable"] as const).map((bt) => (
                        <button
                          key={bt}
                          onClick={() => setBaselineType(bt)}
                          className={cn(
                            "px-2.5 py-0.5 text-[10px] font-serif font-medium transition-colors",
                            baselineType === bt
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          data-testid={`baseline-btn-${bt}`}
                        >
                          {t(`evaluation.baseline.${bt}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {baselineResult?.fallbackReason && baselineType === "comparable" && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-serif italic text-right" data-testid="baseline-fallback-note">
                    {baselineResult.fallbackReason === "no_comparable_data"
                      ? t("evaluation.baseline.fallbackNone")
                      : t("evaluation.baseline.fallbackInsufficient")}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {categories.map((cat) => {
                    const dimStats = baselineResult?.dimensions?.[cat.id as Dimension];
                    return (
                    <div key={cat.id} className="space-y-2 p-3 rounded-lg bg-card border border-border/30">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-serif font-bold text-muted-foreground uppercase tracking-widest">{cat.label}</Label>
                        <Input
                          type="number"
                          value={scores[cat.id as keyof typeof scores]}
                          onChange={(e) => handleScoreChange(cat.id, parseFloat(e.target.value) || 0)}
                          className="w-16 text-right font-mono font-bold border-none bg-transparent h-7 text-sm focus:ring-0 p-0"
                          step={step} min={0} max={scale}
                          disabled={isLocked}
                          data-testid={`focus-input-${cat.id}`}
                        />
                      </div>
                      <Slider
                        value={[scores[cat.id as keyof typeof scores]]}
                        max={scale} step={step} min={0}
                        onValueChange={(val) => handleScoreChange(cat.id, val[0])}
                        className="py-1 cursor-pointer"
                        disabled={isLocked}
                        data-testid={`focus-slider-${cat.id}`}
                      />
                      <BaselineBand stats={dimStats} scale={scale} dimId={cat.id} />
                    </div>
                    );
                  })}
                </div>

                <div className="p-4 rounded-lg bg-card border border-primary/20 text-center space-y-3">
                  <Label className="text-sm font-serif text-primary font-bold">{t("evaluation.overall")}</Label>
                  <Input
                    type="number"
                    value={scores.overall}
                    onChange={(e) => handleScoreChange("overall", parseFloat(e.target.value) || 0)}
                    className="w-28 mx-auto text-center text-3xl font-serif font-black border-none bg-transparent h-12 focus:ring-0 p-0 text-primary"
                    step={step} min={0} max={scale}
                    disabled={isLocked}
                    data-testid="focus-input-overall"
                  />
                  <Slider
                    value={[scores.overall]} max={scale} step={step} min={0}
                    onValueChange={(val) => handleScoreChange("overall", val[0])}
                    className="w-full max-w-sm mx-auto py-2 cursor-pointer"
                    disabled={isLocked}
                    data-testid="focus-slider-overall"
                  />
                  <div className="max-w-sm mx-auto">
                    <BaselineBand stats={baselineResult?.dimensions?.overall} scale={scale} dimId="overall" />
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => setShowNotes(!showNotes)}
                    className="flex items-center gap-2 text-xs font-serif text-muted-foreground hover:text-primary transition-colors mb-2"
                    data-testid="button-toggle-notes"
                  >
                    {showNotes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {t("evaluation.notes")} {notes && <Check className="w-3 h-3 text-green-500" />}
                  </button>
                  <AnimatePresence>
                    {showNotes && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <Textarea
                          placeholder={t("evaluation.notesPlaceholder") || "Aromas, palate, finish..."}
                          className="bg-secondary/10 min-h-[80px] border-border/50 focus:border-primary/50 resize-none font-serif leading-relaxed text-sm"
                          value={notes}
                          onChange={(e) => { setNotes(e.target.value); setIsDirty(true); triggerAutoSave(); }}
                          disabled={isLocked}
                          data-testid="focus-textarea-notes"
                        />
                        <TastingNoteGenerator
                          currentNotes={notes}
                          onInsertNote={(note) => { setNotes(note); setIsDirty(true); triggerAutoSave(); }}
                          disabled={isLocked}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {isBlind && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-amber-500/5 rounded-lg border border-amber-500/20">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t("evaluation.guessAbv")}</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 46.0"
                        value={guessAbv ?? ""}
                        onChange={(e) => { setGuessAbv(e.target.value ? parseFloat(e.target.value) : null); setIsDirty(true); triggerAutoSave(); }}
                        step={0.1} min={20} max={70}
                        disabled={isLocked}
                        className="font-mono h-8 text-sm"
                        data-testid="focus-guess-abv"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t("evaluation.guessAge")}</Label>
                      <Input
                        placeholder="e.g. 12, NAS"
                        value={guessAge}
                        onChange={(e) => { setGuessAge(e.target.value); setIsDirty(true); triggerAutoSave(); }}
                        disabled={isLocked}
                        className="font-mono h-8 text-sm"
                        data-testid="focus-guess-age"
                      />
                    </div>
                  </div>
                )}

              </div>
            )}

            {contextLevel >= 1 && (evalBlind.showName || !isBlind) && (
              <AiInsightsPanel whisky={activeWhisky} tasting={tasting} />
            )}
          </motion.div>
        </AnimatePresence>

        <footer className="flex items-center gap-3 pt-4 pb-4 border-t border-border/30 mt-auto">
          <Button
            variant="ghost"
            className="flex-1 border border-border/50 font-serif"
            onClick={() => goToDram(activeIndex - 1)}
            disabled={activeIndex === 0}
            data-testid="focus-prev"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> {t("focus.prev")}
          </Button>

          <Button
            variant="ghost"
            className="flex-1 border border-border/50 font-serif"
            onClick={() => goToDram(activeIndex + 1)}
            disabled={activeIndex >= whiskies.length - 1}
            data-testid="focus-next"
          >
            {t("focus.next")} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </footer>
      </div>
    </div>
  );
}

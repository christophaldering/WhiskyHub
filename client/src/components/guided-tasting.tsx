import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { ratingApi, tastingApi, guidedApi } from "@/lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  ExternalLink,
  Wine,
  Play,
  SkipForward,
  ChevronDown,
  ChevronUp,
  Globe,
  Info,
  Bell,
  Navigation,
} from "lucide-react";
import { useInputFocused } from "@/hooks/use-input-focused";
import type { Whisky, Tasting } from "@shared/schema";

interface GuidedTastingProps {
  tasting: Tasting;
  whiskies: Whisky[];
  onExit: () => void;
}

function GuidedRatingProgress({ tastingId, whiskyId, participantCount }: { tastingId: string; whiskyId: string; participantCount: number }) {
  const { t } = useTranslation();
  const inputFocused = useInputFocused();
  const { data: ratings = [] } = useQuery({
    queryKey: ["ratings-whisky", whiskyId],
    queryFn: () => ratingApi.getForWhisky(whiskyId),
    refetchInterval: inputFocused ? false : 5000,
  });

  const ratedCount = ratings.length;
  const allRated = ratedCount >= participantCount && participantCount > 0;

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-serif",
      allRated ? "bg-green-500/10 text-green-700" : "bg-secondary/50 text-muted-foreground"
    )} data-testid="guided-rating-progress">
      <Users className="w-3.5 h-3.5" />
      <span>{ratedCount}/{participantCount}</span>
      {allRated && <Check className="w-3.5 h-3.5" />}
    </div>
  );
}

function WhiskyEnrichment({ whisky }: { whisky: Whisky }) {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const [enrichment, setEnrichment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (whisky.aiFactsCache) {
      try {
        setEnrichment(JSON.parse(whisky.aiFactsCache));
        return;
      } catch {}
    }
    const fetchEnrichment = async () => {
      setLoading(true);
      try {
        const data = await guidedApi.enrichWhisky(whisky.id, currentParticipant?.id || "");
        setEnrichment(data);
      } catch {
        setEnrichment(null);
      } finally {
        setLoading(false);
      }
    };
    fetchEnrichment();
  }, [whisky.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="font-serif italic">{t("guided.loadingFacts")}</span>
      </div>
    );
  }

  if (!enrichment) return null;

  const wbUrl = enrichment.whiskybaseUrl || (whisky.whiskybaseId ? `https://www.whiskybase.com/whiskies/whisky/${whisky.whiskybaseId}` : null);
  const distUrl = enrichment.distilleryUrl || whisky.distilleryUrl;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-3"
      data-testid="whisky-enrichment"
    >
      {enrichment.didYouKnow && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 rounded-lg">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm font-serif leading-relaxed text-foreground/80">{enrichment.didYouKnow}</p>
          </div>
        </div>
      )}

      {enrichment.facts?.length > 0 && (
        <div className="space-y-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-xs font-serif text-muted-foreground hover:text-primary transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
            <span>{t("guided.interestingFacts")}</span>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.ul
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 pl-5 overflow-hidden"
              >
                {enrichment.facts.map((fact: string, i: number) => (
                  <li key={i} className="text-sm font-serif leading-relaxed text-foreground/70 list-disc">{fact}</li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {wbUrl && (
          <a
            href={wbUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-serif bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            data-testid="link-whiskybase"
          >
            <Globe className="w-3.5 h-3.5" />
            Whiskybase
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
        {distUrl && (
          <a
            href={distUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-serif bg-secondary text-foreground/70 hover:bg-secondary/80 transition-colors"
            data-testid="link-distillery"
          >
            <Globe className="w-3.5 h-3.5" />
            {whisky.distillery || t("guided.distillery")}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </motion.div>
  );
}

export function GuidedTasting({ tasting, whiskies, onExit }: GuidedTastingProps) {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const participantId = currentParticipant?.id || "";
  const isHost = tasting.hostId === participantId;

  const guidedIdx = tasting.guidedWhiskyIndex ?? -1;
  const guidedStep = tasting.guidedRevealStep ?? 0;
  const isWaiting = guidedIdx === -1;
  const activeWhisky = !isWaiting ? whiskies[guidedIdx] : null;

  const inputFocused = useInputFocused();
  const { data: participants = [] } = useQuery({
    queryKey: ["tasting-participants", tasting.id],
    queryFn: () => tastingApi.getParticipants(tasting.id),
    refetchInterval: inputFocused ? false : 10000,
  });

  const { data: existingRating } = useQuery({
    queryKey: ["rating", participantId, activeWhisky?.id],
    queryFn: () => ratingApi.getMyRating(participantId, activeWhisky!.id),
    enabled: !!participantId && !!activeWhisky?.id,
  });

  const [scores, setScores] = useState({ nose: 50.0, taste: 50.0, finish: 50.0, balance: 50.0, overall: 50.0 });
  const [notes, setNotes] = useState("");
  const [guessAbv, setGuessAbv] = useState<number | null>(null);
  const [guessAge, setGuessAge] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showNextConfirm, setShowNextConfirm] = useState(false);

  const prevWhiskyIdForResetRef = useRef(activeWhisky?.id);
  useEffect(() => {
    const whiskyChanged = prevWhiskyIdForResetRef.current !== activeWhisky?.id;
    if (whiskyChanged) prevWhiskyIdForResetRef.current = activeWhisky?.id;
    if (existingRating) {
      setScores({ nose: existingRating.nose, taste: existingRating.taste, finish: existingRating.finish, balance: existingRating.balance, overall: existingRating.overall });
      setNotes(existingRating.notes || "");
      setGuessAbv(existingRating.guessAbv ?? null);
      setGuessAge(existingRating.guessAge || "");
      setIsDirty(false);
    } else if (whiskyChanged) {
      setScores({ nose: 50.0, taste: 50.0, finish: 50.0, balance: 50.0, overall: 50.0 });
      setNotes("");
      setGuessAbv(null);
      setGuessAge("");
      setIsDirty(false);
    }
  }, [existingRating, activeWhisky?.id]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => ratingApi.upsert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rating", participantId, activeWhisky?.id] });
      queryClient.invalidateQueries({ queryKey: ["ratings", tasting.id] });
      queryClient.invalidateQueries({ queryKey: ["ratings-whisky", activeWhisky?.id] });
      setIsDirty(false);
    },
  });

  const advanceMutation = useMutation({
    mutationFn: () => guidedApi.advance(tasting.id, participantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasting", tasting.id] });
    },
  });

  const goToMutation = useMutation({
    mutationFn: ({ idx, step }: { idx: number; step?: number }) => guidedApi.goTo(tasting.id, participantId, idx, step),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasting", tasting.id] });
    },
  });

  const ratingPromptMutation = useMutation({
    mutationFn: (prompt: string | null) => fetch(`/api/tastings/${tasting.id}/rating-prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId: participantId, prompt }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasting", tasting.id] });
    },
  });

  const [promptDismissed, setPromptDismissed] = useState(false);

  const isLocked = tasting.status !== "open" && tasting.status !== "draft";

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);
  const latestScoresRef = useRef(scores);
  const latestNotesRef = useRef(notes);
  const latestGuessAbvRef = useRef(guessAbv);
  const latestGuessAgeRef = useRef(guessAge);
  const latestWhiskyIdRef = useRef(activeWhisky?.id);
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
    if (prevWhiskyId && activeWhisky?.id && prevWhiskyId !== activeWhisky.id) {
      flushSave(prevWhiskyId);
      latestWhiskyIdRef.current = activeWhisky.id;
    }
  }, [activeWhisky?.id, flushSave]);

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
    const clamped = Math.max(0, Math.min(100, Math.round(value * 10) / 10));
    setScores(prev => ({ ...prev, [key]: clamped }));
    setIsDirty(true);
    triggerAutoSave();
  }, [triggerAutoSave]);


  const getGuidedBlindState = (forEval = false) => {
    if (isHost && !forEval) return { showName: true, showMeta: true, showImage: true, showLinks: guidedStep >= 3 };
    return {
      showName: guidedStep >= 1,
      showMeta: guidedStep >= 2,
      showImage: guidedStep >= 3,
      showLinks: guidedStep >= 3,
    };
  };

  const blind = getGuidedBlindState();
  const evalBlind = getGuidedBlindState(true);

  const stepLabels = [
    t("guided.stepBlind"),
    t("guided.stepName"),
    t("guided.stepDetails"),
    t("guided.stepFull"),
  ];

  const categories = [
    { id: "nose", label: t("evaluation.nose"), emoji: "👃" },
    { id: "taste", label: t("evaluation.taste"), emoji: "👅" },
    { id: "finish", label: t("evaluation.finish"), emoji: "✨" },
    { id: "balance", label: t("evaluation.balance"), emoji: "⚖️" },
  ];

  if (isWaiting) {
    return (
      <div className="fixed inset-0 bg-background z-50 overflow-y-auto" style={{ height: '100dvh' }} data-testid="guided-tasting-screen">
        <div className="flex flex-col items-center justify-center max-w-lg mx-auto px-6 text-center" style={{ minHeight: '100dvh' }}>
          <Button variant="ghost" size="sm" onClick={onExit} className="absolute top-4 left-4 font-serif text-xs" data-testid="button-exit-guided">
            <ChevronLeft className="w-4 h-4 mr-1" /> {t("guided.backToRoom")}
          </Button>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Wine className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-black text-primary tracking-tight">{tasting.title}</h1>
              <p className="text-muted-foreground font-serif mt-2">{t("guided.welcomeMessage")}</p>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{t("guided.participantsJoined", { count: participants.length })}</span>
            </div>
            <div className="text-sm text-muted-foreground/60 font-serif italic">
              {whiskies.length} {t("guided.expressionsReady")}
            </div>

            {isHost && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Button
                  size="lg"
                  className="font-serif text-base px-8 gap-2"
                  onClick={() => advanceMutation.mutate()}
                  disabled={advanceMutation.isPending || whiskies.length === 0}
                  data-testid="button-start-journey"
                >
                  <Play className="w-5 h-5" />
                  {t("guided.startJourney")}
                </Button>
              </motion.div>
            )}

            {!isHost && (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex items-center gap-2 text-sm text-primary/60"
              >
                <Clock className="w-4 h-4" />
                <span className="font-serif italic">{t("guided.waitingForHost")}</span>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  if (!activeWhisky) return null;

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto" style={{ height: '100dvh' }} data-testid="guided-tasting-screen">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/60 via-primary/40 to-emerald-500/60" />
      <div className="flex flex-col max-w-2xl mx-auto px-4 pt-4 pb-[env(safe-area-inset-bottom,16px)]" style={{ minHeight: '100dvh' }}>
        <header className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onExit} className="font-serif text-xs gap-1" data-testid="button-exit-guided">
              <ChevronLeft className="w-4 h-4" /> {t("guided.backToRoom")}
            </Button>
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              <Navigation className="w-3 h-3 text-emerald-600" />
              <span className="text-[10px] font-serif font-semibold text-emerald-700 uppercase tracking-widest">{t("guided.enterGuided")}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isHost && (
              <GuidedRatingProgress
                tastingId={tasting.id}
                whiskyId={activeWhisky.id}
                participantCount={participants.length}
              />
            )}
          </div>
        </header>

        {isHost && (
          <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/20" data-testid="guided-host-controls">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-serif font-bold text-primary uppercase tracking-widest">{t("guided.hostControl")}</span>
              <span className="text-xs font-mono text-muted-foreground">
                {t("guided.dramLabel", { current: guidedIdx + 1, total: whiskies.length })} — {stepLabels[guidedStep]}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-3">
              {whiskies.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToMutation.mutate({ idx, step: 0 })}
                  className={cn(
                    "w-7 h-7 rounded-full text-[10px] font-serif font-bold transition-all",
                    idx === guidedIdx
                      ? "bg-primary text-primary-foreground scale-110 shadow-md"
                      : idx < guidedIdx
                        ? "bg-green-500/20 text-green-700 border border-green-500/30"
                        : "bg-secondary/50 text-muted-foreground"
                  )}
                  data-testid={`guided-host-dram-${idx}`}
                >
                  {idx < guidedIdx ? <Check className="w-3 h-3 mx-auto" /> : idx + 1}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 flex gap-1">
                {[0, 1, 2, 3].map(s => (
                  <button
                    key={s}
                    onClick={() => goToMutation.mutate({ idx: guidedIdx, step: s })}
                    className={cn(
                      "flex-1 h-1.5 rounded-full transition-all",
                      s <= guidedStep ? "bg-primary" : "bg-secondary"
                    )}
                    title={stepLabels[s]}
                    data-testid={`guided-step-indicator-${s}`}
                  />
                ))}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="font-serif text-xs gap-1 border-primary/30 text-primary"
                onClick={() => {
                  if (guidedStep >= 3 && guidedIdx < whiskies.length - 1) {
                    setShowNextConfirm(true);
                  } else {
                    advanceMutation.mutate();
                  }
                }}
                disabled={advanceMutation.isPending}
                data-testid="button-guided-advance"
              >
                {advanceMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : guidedStep < 3 ? (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    {t("guided.revealNext")}
                  </>
                ) : guidedIdx < whiskies.length - 1 ? (
                  <>
                    <SkipForward className="w-3.5 h-3.5" />
                    {t("guided.nextWhisky")}
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    {t("guided.allDone")}
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <div className="text-[10px] font-serif text-muted-foreground/60 flex items-center gap-1 flex-1">
                <Eye className="w-3 h-3" />
                {t("guided.participantsSee")}: {guidedStep === 0 ? t("guided.blindOnly") : guidedStep === 1 ? t("guided.nameVisible") : guidedStep === 2 ? t("guided.detailsVisible") : t("guided.everythingVisible")}
              </div>
              <Button
                variant={tasting.ratingPrompt === "rate" ? "default" : "outline"}
                size="sm"
                className="font-serif text-[10px] h-6 gap-1"
                onClick={() => ratingPromptMutation.mutate(tasting.ratingPrompt === "rate" ? null : "rate")}
                disabled={ratingPromptMutation.isPending}
                data-testid="guided-host-prompt-rate"
              >
                <Bell className="w-3 h-3" />
                {tasting.ratingPrompt === "rate" ? t("focus.hostPromptClear") : t("focus.hostPromptRate")}
              </Button>
              <Button
                variant={tasting.ratingPrompt === "final" ? "default" : "outline"}
                size="sm"
                className="font-serif text-[10px] h-6 gap-1"
                onClick={() => ratingPromptMutation.mutate(tasting.ratingPrompt === "final" ? null : "final")}
                disabled={ratingPromptMutation.isPending}
                data-testid="guided-host-prompt-final"
              >
                <Bell className="w-3 h-3" />
                {tasting.ratingPrompt === "final" ? t("focus.hostPromptClear") : t("focus.hostPromptFinal")}
              </Button>
            </div>
          </div>
        )}

        {!isHost && tasting.ratingPrompt && !promptDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between"
            data-testid="guided-rating-prompt-banner"
          >
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-serif text-amber-800">
                {tasting.ratingPrompt === "final" ? t("focus.promptFinalMessage") : t("focus.promptRateMessage")}
              </span>
            </div>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setPromptDismissed(true)} data-testid="guided-button-dismiss-prompt">
              {t("focus.promptDismiss")}
            </Button>
          </motion.div>
        )}

        {!isHost && (
          <div className="flex items-center justify-center gap-2 mb-3">
            {whiskies.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "w-6 h-6 rounded-full text-[10px] font-serif font-bold flex items-center justify-center",
                  idx === guidedIdx
                    ? "bg-primary text-primary-foreground scale-110 shadow-md"
                    : idx < guidedIdx
                      ? "bg-green-500/20 text-green-700"
                      : "bg-secondary/30 text-muted-foreground/40"
                )}
                data-testid={`guided-dram-indicator-${idx}`}
              >
                {idx < guidedIdx ? <Check className="w-3 h-3" /> : idx + 1}
              </div>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeWhisky.id}-${guidedStep}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="flex-1"
          >
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground/50 mb-2">
                <span>{t("guided.dramLabel", { current: guidedIdx + 1, total: whiskies.length })}</span>
              </div>

              {evalBlind.showImage && activeWhisky.imageUrl && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="mb-4"
                >
                  <img
                    src={activeWhisky.imageUrl}
                    alt={evalBlind.showName ? activeWhisky.name : ""}
                    className="w-32 h-40 object-contain mx-auto rounded-lg shadow-md"
                    data-testid="guided-whisky-image"
                  />
                </motion.div>
              )}

              {!evalBlind.showImage && !evalBlind.showName && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-32 h-40 mx-auto mb-4 rounded-lg bg-secondary/30 border-2 border-dashed border-border/50 flex items-center justify-center"
                >
                  <EyeOff className="w-8 h-8 text-muted-foreground/30" />
                </motion.div>
              )}

              <AnimatePresence mode="wait">
                {evalBlind.showName ? (
                  <motion.h2
                    key="name"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl sm:text-4xl font-serif font-black text-primary tracking-tight"
                    data-testid="guided-whisky-name"
                  >
                    {activeWhisky.name}
                  </motion.h2>
                ) : (
                  <motion.h2
                    key="blind"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl sm:text-4xl font-serif font-black text-primary/60 tracking-tight"
                  >
                    {t("blind.expressionLabel")} {guidedIdx + 1}
                  </motion.h2>
                )}
              </AnimatePresence>

              {evalBlind.showName && activeWhisky.distillery && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-muted-foreground font-serif italic mt-1"
                >
                  {activeWhisky.distillery}
                </motion.p>
              )}

              {evalBlind.showMeta && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="flex flex-wrap items-center justify-center gap-3 mt-2 text-sm font-mono text-muted-foreground"
                >
                  {activeWhisky.age && <span>{activeWhisky.age === "NAS" ? "NAS" : `${activeWhisky.age}y`}</span>}
                  {activeWhisky.abv != null && <span>{activeWhisky.abv}%</span>}
                  {activeWhisky.bottler && <span className="text-primary/80">{activeWhisky.bottler}</span>}
                  {activeWhisky.vintage && <span>{activeWhisky.vintage}</span>}
                  {activeWhisky.region && <span>{activeWhisky.region}</span>}
                  {activeWhisky.category && <span>{activeWhisky.category}</span>}
                  {activeWhisky.price != null && <span>€{activeWhisky.price.toFixed(0)}</span>}
                  {activeWhisky.wbScore != null && <span className="text-primary font-bold">WB {activeWhisky.wbScore.toFixed(1)}</span>}
                </motion.div>
              )}

              {!evalBlind.showName && (
                <p className="text-xs text-muted-foreground/50 font-serif italic mt-2">{t("guided.blindTasting")}</p>
              )}
            </div>

            {activeWhisky.hostNotes && (isHost || evalBlind.showLinks) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 rounded-lg"
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
                <div className="grid grid-cols-2 gap-4">
                  {categories.map((cat) => (
                    <div key={cat.id} className="space-y-2 p-3 rounded-lg bg-card border border-border/30">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-serif font-bold text-muted-foreground uppercase tracking-widest">{cat.label}</Label>
                        <Input
                          type="number"
                          value={scores[cat.id as keyof typeof scores]}
                          onChange={(e) => handleScoreChange(cat.id, parseFloat(e.target.value) || 0)}
                          className="w-16 text-right font-mono font-bold border-none bg-transparent h-7 text-sm focus:ring-0 p-0"
                          step={0.1} min={0} max={100}
                          disabled={isLocked}
                          data-testid={`guided-input-${cat.id}`}
                        />
                      </div>
                      <Slider
                        value={[scores[cat.id as keyof typeof scores]]}
                        max={100} step={0.1} min={0}
                        onValueChange={(val) => handleScoreChange(cat.id, val[0])}
                        className="py-1 cursor-pointer"
                        disabled={isLocked}
                        data-testid={`guided-slider-${cat.id}`}
                      />
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-lg bg-card border border-primary/20 text-center space-y-3">
                  <Label className="text-sm font-serif text-primary font-bold">{t("evaluation.overall")}</Label>
                  <Input
                    type="number"
                    value={scores.overall}
                    onChange={(e) => handleScoreChange("overall", parseFloat(e.target.value) || 0)}
                    className="w-28 mx-auto text-center text-3xl font-serif font-black border-none bg-transparent h-12 focus:ring-0 p-0 text-primary"
                    step={0.1} min={0} max={100}
                    disabled={isLocked}
                    data-testid="guided-input-overall"
                  />
                  <Slider
                    value={[scores.overall]} max={100} step={0.1} min={0}
                    onValueChange={(val) => handleScoreChange("overall", val[0])}
                    className="w-full max-w-sm mx-auto py-2 cursor-pointer"
                    disabled={isLocked}
                    data-testid="guided-slider-overall"
                  />
                </div>

                <div>
                  <button
                    onClick={() => setShowNotes(!showNotes)}
                    className="flex items-center gap-2 text-xs font-serif text-muted-foreground hover:text-primary transition-colors mb-2"
                    data-testid="guided-toggle-notes"
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
                          data-testid="guided-textarea-notes"
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

                {guidedStep === 0 && (
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
                        data-testid="guided-guess-abv"
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
                        data-testid="guided-guess-age"
                      />
                    </div>
                  </div>
                )}

              </div>
            )}

            {evalBlind.showLinks && (
              <WhiskyEnrichment whisky={activeWhisky} />
            )}
          </motion.div>
        </AnimatePresence>

        <AlertDialog open={showNextConfirm} onOpenChange={setShowNextConfirm}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-serif text-primary">
                {t("guided.confirmNextTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("guided.confirmNextMessage", {
                  current: activeWhisky?.name || `Dram ${guidedIdx + 1}`,
                  next: whiskies[guidedIdx + 1]?.name || `Dram ${guidedIdx + 2}`,
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="font-serif">{t("guided.stayHere")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setShowNextConfirm(false);
                  advanceMutation.mutate();
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-serif"
                data-testid="button-confirm-next-dram"
              >
                {t("guided.confirmNext")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
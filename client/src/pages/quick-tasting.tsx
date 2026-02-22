import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { tastingApi, whiskyApi, ratingApi, participantApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Wine, ArrowRight, ArrowLeft, Check, ChevronDown,
  Sparkles, User, Star, BookOpen, LogIn, Brain
} from "lucide-react";
import type { Whisky, Tasting } from "@shared/schema";

type InterestLevel = "guest" | "curious" | "enthusiast" | "scientist";

function NameEntry({ onJoin, loading }: { onJoin: (name: string, pin: string) => void; loading: boolean }) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");

  const canSubmit = name.trim().length > 0 && pin.length >= 4;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] px-4"
    >
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Wine className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-serif font-black text-primary">{t("quickTasting.welcome")}</h1>
          <p className="text-muted-foreground">{t("quickTasting.namePrompt")}</p>
        </div>
        <div className="space-y-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("quickTasting.namePlaceholder")}
            className="text-center text-lg h-12 font-serif"
            autoFocus
            data-testid="input-quick-name"
          />
          <div className="space-y-1">
            <Input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder={t("guestAuth.pinPlaceholder")}
              maxLength={6}
              className="text-center text-lg h-12 font-serif"
              onKeyDown={(e) => e.key === "Enter" && canSubmit && onJoin(name.trim(), pin)}
              data-testid="input-quick-pin"
            />
            <p className="text-[11px] text-muted-foreground/70">{t("guestAuth.pinReminder")}</p>
          </div>
          <p className="text-[10px] text-muted-foreground/60 leading-relaxed">{t('guestAuth.consentNotice')}</p>
          <Button
            size="lg"
            onClick={() => onJoin(name.trim(), pin)}
            disabled={!canSubmit || loading}
            className="w-full font-serif text-base gap-2"
            data-testid="button-quick-join"
          >
            {t("quickTasting.joinButton")}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="bg-secondary/30 rounded-lg p-3 text-left space-y-2">
          <p className="text-[11px] text-muted-foreground/80 leading-relaxed">{t("guestAuth.hobbyNotice")}</p>
        </div>
      </div>
    </motion.div>
  );
}

function WhiskySliderCard({
  whisky,
  tasting,
  participantId,
  isActive,
}: {
  whisky: Whisky;
  tasting: Tasting;
  participantId: string;
  isActive: boolean;
}) {
  const { t } = useTranslation();
  const scale = tasting.ratingScale || 100;
  const mid = scale / 2;
  const step = scale >= 100 ? 1 : scale >= 20 ? 0.5 : 0.1;
  const { currentParticipant } = useAppStore();
  const expLevel = currentParticipant?.experienceLevel;
  const isSimplified = expLevel === "guest" || expLevel === "curious";
  const { data: existingRating } = useQuery({
    queryKey: ["rating", participantId, whisky.id],
    queryFn: () => ratingApi.getMyRating(participantId, whisky.id),
    enabled: !!participantId && !!whisky.id,
  });

  const [scores, setScores] = useState({
    nose: mid, taste: mid, finish: mid, balance: mid, overall: mid,
  });
  const [notes, setNotes] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [overallManual, setOverallManual] = useState(false);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef({ scores, notes });
  latestRef.current = { scores, notes };

  const saveMutation = useMutation({
    mutationFn: (data: any) => ratingApi.upsert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rating", participantId, whisky.id] });
      queryClient.invalidateQueries({ queryKey: ["ratings", tasting.id] });
      setIsDirty(false);
    },
  });

  useEffect(() => {
    if (existingRating) {
      const loaded = {
        nose: existingRating.nose, taste: existingRating.taste,
        finish: existingRating.finish, balance: existingRating.balance,
        overall: existingRating.overall,
      };
      setScores(loaded);
      const avg = computeAvg(loaded);
      setOverallManual(Math.abs(loaded.overall - avg) > 0.01);
      setNotes(existingRating.notes || "");
      setIsDirty(false);
    } else {
      setOverallManual(false);
    }
  }, [existingRating]);

  const triggerAutoSave = useCallback(() => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      if (!participantId) return;
      saveMutation.mutate({
        tastingId: tasting.id,
        whiskyId: whisky.id,
        participantId,
        ...latestRef.current.scores,
        notes: latestRef.current.notes,
      });
    }, 800);
  }, [participantId, tasting.id, whisky.id, saveMutation]);

  useEffect(() => {
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, []);

  const computeAvg = (s: typeof scores) => {
    const factor = step < 1 ? (1 / step) : 1;
    const avg = isSimplified
      ? (s.nose + s.taste + s.finish) / 3
      : (s.nose + s.taste + s.finish + s.balance) / 4;
    return Math.round(avg * factor) / factor;
  };

  const handleScore = (key: string, value: number) => {
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
  };

  const isLocked = tasting.status !== "open" && tasting.status !== "draft";
  const categories = isSimplified
    ? [
        { id: "nose", label: t("evaluation.nose"), emoji: "👃" },
        { id: "taste", label: t("evaluation.taste"), emoji: "👅" },
        { id: "finish", label: t("evaluation.finish"), emoji: "✨" },
      ]
    : [
        { id: "nose", label: t("evaluation.nose"), emoji: "👃" },
        { id: "taste", label: t("evaluation.taste"), emoji: "👅" },
        { id: "finish", label: t("evaluation.finish"), emoji: "✨" },
        { id: "balance", label: t("evaluation.balance"), emoji: "⚖️" },
      ];

  const isBlind = tasting.blindMode && tasting.status === "open";
  const whiskyLabel = isBlind ? `${t("blind.expressionLabel", "Expression")}` : whisky.name;

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: isActive ? 1 : 0.3, x: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("w-full", !isActive && "pointer-events-none")}
    >
      <Card className="p-5 sm:p-6 border-border/40 bg-card/80 backdrop-blur-sm">
        <div className="space-y-5">
          <div className="text-center border-b border-border/20 pb-4">
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-primary">{whiskyLabel}</h3>
            {!isBlind && (
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground font-mono uppercase">
                {whisky.distillery && <span>{whisky.distillery}</span>}
                {whisky.age && <span>• {whisky.age} YO</span>}
                {whisky.abv && <span>• {whisky.abv}%</span>}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {categories.map(cat => (
              <div key={cat.id} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <span>{cat.emoji}</span> {cat.label}
                  </Label>
                  <span className="text-sm font-mono font-bold text-primary w-12 text-right">
                    {scores[cat.id as keyof typeof scores]}
                  </span>
                </div>
                <Slider
                  value={[scores[cat.id as keyof typeof scores]]}
                  max={scale} step={step} min={0}
                  onValueChange={(val) => handleScore(cat.id, val[0])}
                  disabled={isLocked}
                  data-testid={`quick-slider-${cat.id}`}
                />
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-border/20">
            <div className="flex flex-col items-center space-y-2">
              <Label className="text-base font-serif text-primary font-semibold">{t("evaluation.overall")}</Label>
              <div className="text-4xl font-serif font-black text-primary tabular-nums">
                {scores.overall}
              </div>
              <Slider
                value={[scores.overall]} max={scale} step={step} min={0}
                onValueChange={(val) => handleScore("overall", val[0])}
                className="w-full max-w-xs"
                disabled={isLocked}
                data-testid="quick-slider-overall"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t("evaluation.notes")}</Label>
            <Textarea
              placeholder={t("quickTasting.notesPlaceholder")}
              className="bg-secondary/10 min-h-[80px] border-border/30 resize-none text-sm"
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setIsDirty(true); triggerAutoSave(); }}
              disabled={isLocked}
              data-testid="quick-textarea-notes"
            />
          </div>

          {isDirty && (
            <div className="text-xs text-muted-foreground/50 text-center animate-pulse">
              {t("quickTasting.autoSaving")}
            </div>
          )}
          {existingRating && !isDirty && (
            <div className="text-xs text-green-500/70 text-center flex items-center justify-center gap-1">
              <Check className="w-3 h-3" /> {t("quickTasting.saved")}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

function InterestLevelPicker({ onSelect }: { onSelect: (level: InterestLevel) => void }) {
  const { t } = useTranslation();
  const levels: { id: InterestLevel; icon: any; gradient: string }[] = [
    { id: "guest", icon: User, gradient: "from-slate-500/20 to-slate-600/10" },
    { id: "curious", icon: Star, gradient: "from-amber-500/20 to-amber-600/10" },
    { id: "enthusiast", icon: Sparkles, gradient: "from-primary/20 to-primary/10" },
    { id: "scientist", icon: Brain, gradient: "from-violet-500/20 to-violet-600/10" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] px-4"
    >
      <div className="w-full max-w-lg space-y-6 text-center">
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-primary">{t("quickTasting.interestTitle")}</h2>
          <p className="text-muted-foreground">{t("quickTasting.interestSubtitle")}</p>
        </div>
        <div className="space-y-3">
          {levels.map((lvl, i) => (
            <motion.button
              key={lvl.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => onSelect(lvl.id)}
              className={cn(
                "w-full text-left p-4 rounded-xl border border-border/40 bg-gradient-to-r",
                lvl.gradient,
                "hover:border-primary/40 hover:shadow-md transition-all group"
              )}
              data-testid={`button-interest-${lvl.id}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-background/50 flex items-center justify-center flex-shrink-0">
                  <lvl.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-serif font-bold text-primary">{t(`quickTasting.level.${lvl.id}.title`)}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">{t(`quickTasting.level.${lvl.id}.desc`)}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary ml-auto mt-3 transition-colors" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function CompletionScreen({ tastingTitle, onGoFull, onStayMinimal }: { tastingTitle: string; onGoFull: () => void; onStayMinimal: () => void }) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center min-h-[60vh] px-4"
    >
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
          <Check className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-serif font-black text-primary">{t("quickTasting.complete")}</h2>
        <p className="text-muted-foreground">{t("quickTasting.completeDesc", { title: tastingTitle })}</p>
        <div className="space-y-3 pt-2">
          <Button size="lg" onClick={onGoFull} className="w-full font-serif text-base gap-2" data-testid="button-go-full">
            <Sparkles className="w-4 h-4" />
            {t("quickTasting.discoverMore")}
          </Button>
          <Button size="lg" variant="outline" onClick={onStayMinimal} className="w-full font-serif text-base gap-2" data-testid="button-stay-minimal">
            {t("quickTasting.done")}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function QuickTasting() {
  const { t } = useTranslation();
  const params = useParams<{ code: string }>();
  const [, navigate] = useLocation();
  const { currentParticipant, setParticipant } = useAppStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<"name" | "rating" | "interest" | "complete">(
    currentParticipant ? "rating" : "name"
  );
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("preview") === "true") {
      setIsPreviewMode(true);
    }
  }, []);

  const { data: tasting, isLoading: tastingLoading, error: tastingError } = useQuery<Tasting>({
    queryKey: ["tasting-by-code", params.code],
    queryFn: () => tastingApi.getByCode(params.code!),
    enabled: !!params.code,
  });

  const { data: whiskies = [] } = useQuery<Whisky[]>({
    queryKey: ["whiskies", tasting?.id],
    queryFn: () => whiskyApi.getForTasting(tasting!.id),
    enabled: !!tasting?.id,
  });

  const handleGuestJoin = async (name: string, pin: string) => {
    setJoining(true);
    setJoinError("");
    try {
      const participant = await participantApi.guestJoin(name, pin);
      setParticipant({
        id: participant.id,
        name: participant.name,
        role: participant.role,
        canAccessWhiskyDb: participant.canAccessWhiskyDb,
        experienceLevel: participant.experienceLevel || "guest",
      });
      if (tasting) {
        await tastingApi.join(tasting.id, participant.id, tasting.code);
      }
      setPhase("rating");
    } catch (e: any) {
      setJoinError(e.message);
    } finally {
      setJoining(false);
    }
  };

  useEffect(() => {
    if (currentParticipant && tasting && phase === "rating") {
      tastingApi.join(tasting.id, currentParticipant.id, tasting.code).catch(() => {});
    }
  }, [currentParticipant, tasting, phase]);

  const handleFinishRating = () => {
    if (currentParticipant?.experienceLevel === "enthusiast" || currentParticipant?.experienceLevel === "scientist" || isPreviewMode) {
      setPhase("complete");
    } else {
      setPhase("interest");
    }
  };

  const handleInterestSelect = async (level: InterestLevel) => {
    if (currentParticipant) {
      try {
        await participantApi.updateExperienceLevel(currentParticipant.id, level);
        setParticipant({ ...currentParticipant, experienceLevel: level });
      } catch {}
    }
    setPhase("complete");
  };

  const sortedWhiskies = [...whiskies].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  if (tastingLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (tastingError || !tasting) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md">
          <Wine className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <h1 className="text-2xl font-serif font-bold text-primary">{t("quickTasting.notFound")}</h1>
          <p className="text-muted-foreground">{t("quickTasting.notFoundDesc")}</p>
          <Button variant="outline" onClick={() => navigate("/")} data-testid="button-back-landing">
            {t("quickTasting.backToHome")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border/40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wine className="w-5 h-5 text-primary" />
            <span className="font-serif font-bold text-primary text-sm">CaskSense</span>
          </div>
          <div className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">
            {tasting.title}
          </div>
          {isPreviewMode && (
            <Button
              variant="ghost" size="sm"
              onClick={() => navigate(`/tasting/${tasting.id}`)}
              className="text-xs text-amber-500 gap-1"
              data-testid="button-exit-preview"
            >
              <ArrowLeft className="w-3 h-3" />
              {t("quickTasting.exitPreview")}
            </Button>
          )}
        </div>
      </header>

      {isPreviewMode && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center">
          <p className="text-xs text-amber-600 font-medium">{t("quickTasting.previewBanner")}</p>
        </div>
      )}

      <main className="max-w-lg mx-auto px-4 py-6">
        {phase === "name" && (
          <>
            <NameEntry onJoin={handleGuestJoin} loading={joining} />
            {joinError && (
              <p className="text-center text-sm text-destructive mt-2">{joinError}</p>
            )}
          </>
        )}

        {phase === "rating" && sortedWhiskies.length > 0 && currentParticipant && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground font-mono">
                {currentIndex + 1} / {sortedWhiskies.length}
              </div>
              <div className="flex gap-1">
                {sortedWhiskies.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      i === currentIndex ? "bg-primary w-6" : "bg-muted-foreground/30"
                    )}
                    data-testid={`dot-whisky-${i}`}
                  />
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <WhiskySliderCard
                key={sortedWhiskies[currentIndex].id}
                whisky={sortedWhiskies[currentIndex]}
                tasting={tasting}
                participantId={currentParticipant.id}
                isActive={true}
              />
            </AnimatePresence>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="flex-1 font-serif gap-1"
                data-testid="button-prev-whisky"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("quickTasting.prev")}
              </Button>
              {currentIndex < sortedWhiskies.length - 1 ? (
                <Button
                  onClick={() => setCurrentIndex(currentIndex + 1)}
                  className="flex-1 font-serif gap-1"
                  data-testid="button-next-whisky"
                >
                  {t("quickTasting.next")}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleFinishRating}
                  className="flex-1 font-serif gap-1 bg-green-600 hover:bg-green-700"
                  data-testid="button-finish-rating"
                >
                  <Check className="w-4 h-4" />
                  {t("quickTasting.finish")}
                </Button>
              )}
            </div>
          </div>
        )}

        {phase === "rating" && sortedWhiskies.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <Wine className="w-10 h-10 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground">{t("quickTasting.noWhiskies")}</p>
          </div>
        )}

        {phase === "interest" && (
          <InterestLevelPicker onSelect={handleInterestSelect} />
        )}

        {phase === "complete" && (
          <CompletionScreen
            tastingTitle={tasting.title}
            onGoFull={() => navigate("/app")}
            onStayMinimal={() => navigate("/")}
          />
        )}
      </main>

      {phase !== "complete" && phase !== "interest" && !isPreviewMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/95 to-transparent pt-8 pb-4 px-4">
          <div className="max-w-lg mx-auto">
            <div className="bg-card/80 backdrop-blur-sm border border-border/30 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">
                {t("quickTasting.fullVersionHint")}{" "}
                <button
                  onClick={() => navigate("/app")}
                  className="text-primary hover:underline font-semibold"
                  data-testid="link-full-version"
                >
                  {t("quickTasting.fullVersionLink")}
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


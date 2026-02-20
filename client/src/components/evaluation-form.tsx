import { useState, useEffect, useCallback, useRef } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Check, Lock, ChevronRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { ratingApi } from "@/lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Whisky, Tasting } from "@shared/schema";
import { TastingNoteGenerator } from "./tasting-note-generator";

interface BlindState {
  showName: boolean;
  showMeta: boolean;
  showImage: boolean;
}

interface EvaluationFormProps {
  whisky: Whisky;
  tasting: Tasting;
  blindState?: BlindState;
}

export function EvaluationForm({ whisky, tasting, blindState }: EvaluationFormProps) {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const participantId = currentParticipant?.id || "";

  const { data: existingRating } = useQuery({
    queryKey: ["rating", participantId, whisky.id],
    queryFn: () => ratingApi.getMyRating(participantId, whisky.id),
    enabled: !!participantId && !!whisky.id,
  });

  const [scores, setScores] = useState({
    nose: 50.0, taste: 50.0, finish: 50.0, balance: 50.0, overall: 50.0,
  });
  const [notes, setNotes] = useState("");
  const [guessAbv, setGuessAbv] = useState<number | null>(null);
  const [guessAge, setGuessAge] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);
  const latestScoresRef = useRef(scores);
  const latestNotesRef = useRef(notes);
  const latestGuessAbvRef = useRef(guessAbv);
  const latestGuessAgeRef = useRef(guessAge);
  const latestWhiskyIdRef = useRef(whisky.id);
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
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const prevWhiskyId = latestWhiskyIdRef.current;
    if (prevWhiskyId !== whisky.id) {
      flushSave(prevWhiskyId);
      latestWhiskyIdRef.current = whisky.id;
    } else if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    if (existingRating) {
      setScores({
        nose: existingRating.nose,
        taste: existingRating.taste,
        finish: existingRating.finish,
        balance: existingRating.balance,
        overall: existingRating.overall,
      });
      setNotes(existingRating.notes || "");
      setGuessAbv(existingRating.guessAbv ?? null);
      setGuessAge(existingRating.guessAge || "");
      setIsDirty(false);
    } else if (prevWhiskyId !== whisky.id) {
      setScores({ nose: 50.0, taste: 50.0, finish: 50.0, balance: 50.0, overall: 50.0 });
      setNotes("");
      setGuessAbv(null);
      setGuessAge("");
      setIsDirty(false);
    }
  }, [existingRating, whisky.id, flushSave]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => ratingApi.upsert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rating", participantId, whisky.id] });
      queryClient.invalidateQueries({ queryKey: ["ratings", tasting.id] });
      setIsDirty(false);
    },
  });

  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      if (!participantId) return;
      saveMutation.mutate({
        tastingId: tasting.id,
        whiskyId: whisky.id,
        participantId,
        ...latestScoresRef.current,
        notes: latestNotesRef.current,
        guessAbv: latestGuessAbvRef.current ?? undefined,
        guessAge: latestGuessAgeRef.current || undefined,
      });
    }, 800);
  }, [participantId, tasting.id, whisky.id, saveMutation]);

  const handleScoreChange = useCallback((key: string, value: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(value * 10) / 10));
    setScores(prev => ({ ...prev, [key]: clamped }));
    setIsDirty(true);
    triggerAutoSave();
  }, [triggerAutoSave]);

  const handleSave = () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    if (!participantId) return;
    saveMutation.mutate({
      tastingId: tasting.id,
      whiskyId: whisky.id,
      participantId,
      ...scores,
      notes,
      guessAbv: guessAbv ?? undefined,
      guessAge: guessAge || undefined,
    });
  };

  const isLocked = tasting.status !== "open" && tasting.status !== "draft";

  const categories = [
    { id: "nose", label: t('evaluation.nose') },
    { id: "taste", label: t('evaluation.taste') },
    { id: "finish", label: t('evaluation.finish') },
    { id: "balance", label: t('evaluation.balance') },
  ];

  return (
    <Card className="border-border/50 bg-card shadow-sm max-w-2xl mx-auto">
      <CardHeader className="pb-6 border-b border-border/10">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-serif font-bold text-primary mb-2">
              {blindState && !blindState.showName ? `${t("blind.expressionLabel", "Expression")}` : whisky.name}
            </h2>
            {(!blindState || blindState.showMeta) && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground font-mono uppercase tracking-wider">
                {whisky.distillery && <span>{whisky.distillery}</span>}
                {whisky.age && <span>• {whisky.age} YO</span>}
                {whisky.abv && <span>• {whisky.abv}%</span>}
                {whisky.category && <span>• {whisky.category}</span>}
              </div>
            )}
            {(!blindState || blindState.showMeta) && whisky.whiskybaseId && (
              <a
                href={`https://www.whiskybase.com/whiskies/whisky/${whisky.whiskybaseId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors mt-1 font-mono"
                data-testid="link-whiskybase-eval"
              >
                Whiskybase #{whisky.whiskybaseId} <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          {isLocked && (
            <div className="bg-secondary px-3 py-1 rounded-full flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Lock className="w-3 h-3" /> {t('evaluation.locked')}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-10 pt-8">
        <div className="grid gap-8 md:grid-cols-2">
          {categories.map((cat) => (
            <div key={cat.id} className="space-y-3">
              <div className="flex justify-between items-end">
                <Label className="text-sm font-serif font-bold text-muted-foreground uppercase tracking-widest">{cat.label}</Label>
                <Input
                  type="number"
                  value={scores[cat.id as keyof typeof scores]}
                  onChange={(e) => handleScoreChange(cat.id, parseFloat(e.target.value) || 0)}
                  className="w-20 text-right font-mono font-bold border-none bg-secondary/30 h-8 focus:ring-0"
                  step={0.1} min={0} max={100}
                  disabled={isLocked}
                  data-testid={`input-${cat.id}`}
                />
              </div>
              <Slider
                value={[scores[cat.id as keyof typeof scores]]}
                max={100} step={0.1} min={0}
                onValueChange={(val) => handleScoreChange(cat.id, val[0])}
                className={cn("py-2 cursor-pointer", isLocked && "opacity-50 cursor-not-allowed")}
                disabled={isLocked}
                data-testid={`slider-${cat.id}`}
              />
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-border/20">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Label className="text-lg font-serif text-primary">{t('evaluation.overall')}</Label>
            <Input
              type="number"
              value={scores.overall}
              onChange={(e) => handleScoreChange("overall", parseFloat(e.target.value) || 0)}
              className="w-32 text-center text-4xl font-serif font-black border-none bg-transparent h-16 focus:ring-0 p-0 text-primary"
              step={0.1} min={0} max={100}
              disabled={isLocked}
              data-testid="input-overall"
            />
            <Slider
              value={[scores.overall]} max={100} step={0.1} min={0}
              onValueChange={(val) => handleScoreChange("overall", val[0])}
              className={cn("w-full max-w-md py-4 cursor-pointer", isLocked && "opacity-50 cursor-not-allowed")}
              disabled={isLocked}
              data-testid="slider-overall"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-serif font-bold text-muted-foreground uppercase tracking-widest">{t('evaluation.notes')}</Label>
          <Textarea
            placeholder="Aromas, palate, finish..."
            className="bg-secondary/10 min-h-[120px] border-border/50 focus:border-primary/50 resize-none font-serif leading-relaxed"
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setIsDirty(true); triggerAutoSave(); }}
            disabled={isLocked}
            data-testid="textarea-notes"
          />
          <TastingNoteGenerator
            currentNotes={notes}
            onInsertNote={(note) => { setNotes(note); setIsDirty(true); triggerAutoSave(); }}
            disabled={isLocked}
          />
          {tasting.blindMode && (tasting.status === "open" || tasting.status === "draft") && (
            <div className="space-y-3 p-4 bg-amber-500/5 rounded-lg border border-amber-500/20" data-testid="div-blind-guesses">
              <h4 className="text-xs font-serif font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">{t('evaluation.blindGuesses')}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t('evaluation.guessAbv')}</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 46.0"
                    value={guessAbv ?? ""}
                    onChange={(e) => { setGuessAbv(e.target.value ? parseFloat(e.target.value) : null); setIsDirty(true); triggerAutoSave(); }}
                    step={0.1} min={20} max={70}
                    disabled={isLocked}
                    className="font-mono h-8"
                    data-testid="input-guess-abv"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t('evaluation.guessAge')}</Label>
                  <Input
                    placeholder="e.g. 12, NAS"
                    value={guessAge}
                    onChange={(e) => { setGuessAge(e.target.value); setIsDirty(true); triggerAutoSave(); }}
                    disabled={isLocked}
                    className="font-mono h-8"
                    data-testid="input-guess-age"
                  />
                </div>
              </div>
            </div>
          )}
          {tasting.blindMode && (tasting.status === "reveal" || tasting.status === "archived") && existingRating && (existingRating.guessAbv || existingRating.guessAge) && (
            <div className="space-y-2 p-4 bg-secondary/20 rounded-lg border border-border/30" data-testid="div-blind-results">
              <h4 className="text-xs font-serif font-bold text-muted-foreground uppercase tracking-widest">{t('evaluation.blindResults')}</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {existingRating.guessAbv != null && (
                  <div>
                    <span className="text-muted-foreground text-xs">{t('evaluation.guessAbv')}</span>
                    <p className="font-mono">
                      {t('evaluation.guessVsActual', { guess: existingRating.guessAbv, actual: whisky.abv ?? '?' })}
                    </p>
                  </div>
                )}
                {existingRating.guessAge && (
                  <div>
                    <span className="text-muted-foreground text-xs">{t('evaluation.guessAge')}</span>
                    <p className="font-mono">
                      {t('evaluation.guessVsActual', { guess: existingRating.guessAge, actual: whisky.age ?? '?' })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pb-8">
        <Button
          className={cn(
            "w-full h-12 text-lg font-serif transition-all duration-300 tracking-wide",
            !isDirty && existingRating ? "bg-secondary text-primary hover:bg-secondary" : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          onClick={handleSave}
          disabled={isLocked || (!isDirty && !!existingRating) || saveMutation.isPending}
          data-testid="button-save-rating"
        >
          {saveMutation.isPending ? "Saving..." : isDirty || !existingRating ? (
            <span className="flex items-center gap-2">{t('evaluation.save')} <ChevronRight className="w-4 h-4" /></span>
          ) : (
            <span className="flex items-center gap-2"><Check className="w-4 h-4" /> {t('evaluation.saved')}</span>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

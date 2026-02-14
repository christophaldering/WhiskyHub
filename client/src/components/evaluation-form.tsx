import { useState, useEffect, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Check, Lock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { ratingApi } from "@/lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Whisky, Tasting } from "@shared/schema";
import { TastingNoteGenerator } from "./tasting-note-generator";

interface EvaluationFormProps {
  whisky: Whisky;
  tasting: Tasting;
}

export function EvaluationForm({ whisky, tasting }: EvaluationFormProps) {
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
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (existingRating) {
      setScores({
        nose: existingRating.nose,
        taste: existingRating.taste,
        finish: existingRating.finish,
        balance: existingRating.balance,
        overall: existingRating.overall,
      });
      setNotes(existingRating.notes || "");
      setIsDirty(false);
    } else {
      setScores({ nose: 50.0, taste: 50.0, finish: 50.0, balance: 50.0, overall: 50.0 });
      setNotes("");
      setIsDirty(false);
    }
  }, [existingRating, whisky.id]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => ratingApi.upsert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rating", participantId, whisky.id] });
      queryClient.invalidateQueries({ queryKey: ["ratings", tasting.id] });
      setIsDirty(false);
    },
  });

  const handleScoreChange = useCallback((key: string, value: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(value * 10) / 10));
    setScores(prev => ({ ...prev, [key]: clamped }));
    setIsDirty(true);
  }, []);

  const handleSave = () => {
    if (!participantId) return;
    saveMutation.mutate({
      tastingId: tasting.id,
      whiskyId: whisky.id,
      participantId,
      ...scores,
      notes,
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
            <h2 className="text-3xl font-serif font-bold text-primary mb-2">{whisky.name}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground font-mono uppercase tracking-wider">
              {whisky.distillery && <span>{whisky.distillery}</span>}
              {whisky.age && <span>• {whisky.age} YO</span>}
              {whisky.abv && <span>• {whisky.abv}%</span>}
              {whisky.category && <span>• {whisky.category}</span>}
            </div>
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
            onChange={(e) => { setNotes(e.target.value); setIsDirty(true); }}
            disabled={isLocked}
            data-testid="textarea-notes"
          />
          <TastingNoteGenerator
            currentNotes={notes}
            onInsertNote={(note) => { setNotes(note); setIsDirty(true); }}
            disabled={isLocked}
          />
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

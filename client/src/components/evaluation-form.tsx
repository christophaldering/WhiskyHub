import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ExtendedWhisky, useSessionStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Lock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface EvaluationFormProps {
  whisky: ExtendedWhisky;
}

export function EvaluationForm({ whisky }: EvaluationFormProps) {
  const { t } = useTranslation();
  const { status, addRating, updateRating, ratings, currentUser } = useSessionStore();
  
  // Find existing rating for this user and whisky
  const existingRating = ratings.find(r => r.userId === currentUser?.id && r.whiskyId === whisky.id);

  const [scores, setScores] = useState({
    nose: existingRating?.nose || 50.0,
    taste: existingRating?.taste || 50.0,
    finish: existingRating?.finish || 50.0,
    balance: existingRating?.balance || 50.0,
    overall: existingRating?.overall || 50.0,
  });
  
  const [notes, setNotes] = useState(existingRating?.notes || "");
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
      setNotes(existingRating.notes);
    }
  }, [existingRating, whisky.id]);

  const handleScoreChange = (key: string, value: number) => {
    setScores(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    if (!currentUser) return;
    
    const ratingData = {
      userId: currentUser.id,
      whiskyId: whisky.id,
      ...scores,
      notes,
    };

    if (existingRating) {
      updateRating(ratingData);
    } else {
      addRating(ratingData);
    }
    setIsDirty(false);
  };

  const isLocked = status === 'closed' || status === 'reveal' || status === 'archived';

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
        {/* Main 4 Categories */}
        <div className="grid gap-8 md:grid-cols-2">
          {categories.map((cat) => (
            <div key={cat.id} className="space-y-3">
              <div className="flex justify-between items-end">
                <Label className="text-sm font-serif font-bold text-muted-foreground uppercase tracking-widest">{cat.label}</Label>
                <Input 
                  type="number" 
                  value={scores[cat.id as keyof typeof scores]} 
                  onChange={(e) => handleScoreChange(cat.id, parseFloat(e.target.value))}
                  className="w-20 text-right font-mono font-bold border-none bg-secondary/30 h-8 focus:ring-0"
                  step={0.1}
                  min={0}
                  max={100}
                  disabled={isLocked}
                />
              </div>
              <Slider
                value={[scores[cat.id as keyof typeof scores]]}
                max={100}
                step={0.1}
                min={0}
                onValueChange={(val) => handleScoreChange(cat.id, val[0])}
                className={cn("py-2 cursor-pointer", isLocked && "opacity-50 cursor-not-allowed")}
                disabled={isLocked}
              />
            </div>
          ))}
        </div>

        {/* Overall Score - Hero Section */}
        <div className="pt-6 border-t border-border/20">
           <div className="flex flex-col items-center justify-center space-y-4">
              <Label className="text-lg font-serif text-primary">{t('evaluation.overall')}</Label>
              <div className="relative flex items-center justify-center w-full">
                <Input 
                  type="number"
                  value={scores.overall}
                  onChange={(e) => handleScoreChange("overall", parseFloat(e.target.value))}
                  className="w-32 text-center text-4xl font-serif font-black border-none bg-transparent h-16 focus:ring-0 p-0 text-primary"
                  step={0.1}
                  min={0}
                  max={100}
                  disabled={isLocked}
                />
              </div>
              <Slider
                value={[scores.overall]}
                max={100}
                step={0.1}
                min={0}
                onValueChange={(val) => handleScoreChange("overall", val[0])}
                className={cn("w-full max-w-md py-4 cursor-pointer [&>.bg-primary]:bg-accent", isLocked && "opacity-50 cursor-not-allowed")}
                disabled={isLocked}
              />
            </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-serif font-bold text-muted-foreground uppercase tracking-widest">{t('evaluation.notes')}</Label>
          <Textarea 
            placeholder="Aromas, palate, finish..."
            className="bg-secondary/10 min-h-[120px] border-border/50 focus:border-primary/50 resize-none font-serif leading-relaxed"
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setIsDirty(true);
            }}
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
          disabled={isLocked || (!isDirty && !existingRating)}
        >
          {isDirty || !existingRating ? (
             <span className="flex items-center gap-2">
               {t('evaluation.save')} <ChevronRight className="w-4 h-4" />
             </span>
          ) : (
             <span className="flex items-center gap-2">
               <Check className="w-4 h-4" /> {t('evaluation.saved')}
             </span>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Whisky } from "@/lib/mock-data";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronRight, Save } from "lucide-react";
import { cn } from "@/lib/utils";

interface WhiskyRatingProps {
  whisky: Whisky;
  onSubmit: (ratings: any) => void;
}

export function WhiskyRating({ whisky, onSubmit }: WhiskyRatingProps) {
  const [ratings, setRatings] = useState({
    nose: 5,
    taste: 5,
    finish: 5,
    balance: 5,
    overall: 50,
    notes: "",
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSliderChange = (key: string, value: number[]) => {
    setRatings((prev) => ({ ...prev, [key]: value[0] }));
  };

  const handleSubmit = () => {
    setSubmitted(true);
    // Simulate API delay
    setTimeout(() => {
      onSubmit(ratings);
      setSubmitted(false);
    }, 1000);
  };

  const categories = [
    { id: "nose", label: "Nose", max: 10, step: 0.5, desc: "Aroma, bouquet, intensity" },
    { id: "taste", label: "Taste", max: 10, step: 0.5, desc: "Palate, flavor profile, mouthfeel" },
    { id: "finish", label: "Finish", max: 10, step: 0.5, desc: "Length, aftertaste, complexity" },
    { id: "balance", label: "Balance", max: 10, step: 0.5, desc: "Harmony between elements" },
  ];

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-xl">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-serif text-primary mb-1">{whisky.name}</h2>
            <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
              {whisky.distillery} • {typeof whisky.age === 'number' ? `${whisky.age} YO` : whisky.age} • {whisky.abv}%
            </p>
          </div>
          <div className="bg-secondary/50 px-3 py-1 rounded text-xs font-mono text-primary/80 border border-primary/20">
            {whisky.type}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-8 pt-6">
        {categories.map((cat, i) => (
          <motion.div 
            key={cat.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="space-y-4"
          >
            <div className="flex justify-between items-end">
              <div>
                <Label className="text-lg font-serif">{cat.label}</Label>
                <p className="text-xs text-muted-foreground">{cat.desc}</p>
              </div>
              <span className="text-2xl font-mono text-primary font-bold w-12 text-right">
                {ratings[cat.id as keyof typeof ratings]}
              </span>
            </div>
            <Slider
              value={[ratings[cat.id as keyof typeof ratings] as number]}
              max={cat.max}
              step={cat.step}
              min={0}
              onValueChange={(val) => handleSliderChange(cat.id, val)}
              className="py-2 cursor-pointer"
            />
          </motion.div>
        ))}

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="pt-4 border-t border-border/30"
        >
           <div className="flex justify-between items-end mb-4">
              <div>
                <Label className="text-lg font-serif text-primary">Overall Score</Label>
                <p className="text-xs text-muted-foreground">Personal subjective enjoyment (0-100)</p>
              </div>
              <span className="text-3xl font-mono text-primary font-bold w-16 text-right">
                {ratings.overall}
              </span>
            </div>
            <Slider
              value={[ratings.overall]}
              max={100}
              step={1}
              min={0}
              onValueChange={(val) => handleSliderChange("overall", val)}
              className="py-2 cursor-pointer [&>.bg-primary]:bg-primary"
            />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-2"
        >
          <Label className="text-base font-serif">Tasting Notes</Label>
          <Textarea 
            placeholder="Describe the nose, palate, and finish..."
            className="bg-background/50 min-h-[100px] border-primary/20 focus:border-primary/50 resize-none font-sans"
            value={ratings.notes}
            onChange={(e) => setRatings(prev => ({ ...prev, notes: e.target.value }))}
          />
        </motion.div>
      </CardContent>

      <CardFooter>
        <Button 
          className={cn(
            "w-full h-12 text-lg font-serif transition-all duration-300",
            submitted ? "bg-green-600 hover:bg-green-700 text-white" : "bg-primary hover:bg-primary/90 text-primary-foreground"
          )}
          onClick={handleSubmit}
          disabled={submitted}
        >
          {submitted ? (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Saved
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Save Evaluation <ChevronRight className="w-5 h-5" />
            </span>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

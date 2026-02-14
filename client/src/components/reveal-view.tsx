import { ExtendedWhisky, useSessionStore, RevealAct } from "@/lib/store";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface RevealViewProps {
  whisky: ExtendedWhisky;
}

export function RevealView({ whisky }: RevealViewProps) {
  const { t } = useTranslation();
  const { currentAct, ratings, sessions } = useSessionStore();
  
  // Filter ratings for this whisky
  const whiskyRatings = ratings.filter(r => r.whiskyId === whisky.id);
  const participantCount = sessions[0].participants.length; // Simplified: assume single session in mock
  const submittedCount = whiskyRatings.length;

  const averageScore = useMemo(() => {
    if (whiskyRatings.length === 0) return 0;
    return (whiskyRatings.reduce((acc, curr) => acc + curr.overall, 0) / whiskyRatings.length).toFixed(1);
  }, [whiskyRatings]);

  // Act 1: Completion View
  const Act1 = () => (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-8">
      <div className="relative w-48 h-48 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-secondary" />
          <circle 
            cx="96" cy="96" r="88" 
            stroke="currentColor" 
            strokeWidth="8" 
            fill="transparent" 
            strokeDasharray={2 * Math.PI * 88}
            strokeDashoffset={2 * Math.PI * 88 * (1 - submittedCount / participantCount)}
            className="text-primary transition-all duration-1000 ease-out" 
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-mono font-bold text-primary">{submittedCount}</span>
          <span className="text-sm text-muted-foreground uppercase tracking-widest">of {participantCount}</span>
        </div>
      </div>
      <h3 className="text-2xl font-serif text-center text-primary">Awaiting Consensus</h3>
    </div>
  );

  // Act 2: Perception (Averages & Divergence)
  const Act2 = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 min-h-[400px]">
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader>
          <CardTitle className="font-serif text-3xl text-primary text-center">{t('reveal.consensus')}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center">
           <div className="text-9xl font-serif font-black text-primary tracking-tighter">
             {averageScore}
           </div>
        </CardContent>
      </Card>

      <Card className="bg-secondary/20 border-border/50">
        <CardHeader>
          <CardTitle className="font-serif text-xl text-primary">{t('reveal.divergence')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <p className="font-serif italic text-lg leading-relaxed text-foreground/80">
              "We found this expression <span className="text-primary font-bold">complex</span> yet <span className="text-primary font-bold">approachable</span>, with significant disagreement on the <span className="text-accent font-bold">finish</span>."
            </p>
            <div className="h-40 w-full">
               {/* Micro-chart for distribution */}
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={whiskyRatings.map(r => ({ name: r.userId, value: r.overall }))}>
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[2,2,0,0]} opacity={0.8} />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#fff', borderColor: '#eee'}} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Act 3: Insight (Structured Data)
  const Act3 = () => (
    <div className="grid grid-cols-1 gap-6 min-h-[400px]">
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="font-serif text-2xl text-primary">Structured Insight</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-8">
           <div className="space-y-2">
             <span className="text-xs uppercase tracking-widest text-muted-foreground">Category</span>
             <div className="font-serif text-xl">{whisky.category || "Single Malt"}</div>
           </div>
           <div className="space-y-2">
             <span className="text-xs uppercase tracking-widest text-muted-foreground">Region</span>
             <div className="font-serif text-xl">{whisky.region || "Highland"}</div>
           </div>
           <div className="space-y-2">
             <span className="text-xs uppercase tracking-widest text-muted-foreground">Cask</span>
             <div className="font-serif text-xl">{whisky.caskInfluence || "Sherry & Bourbon"}</div>
           </div>
           <div className="space-y-2">
             <span className="text-xs uppercase tracking-widest text-muted-foreground">ABV Band</span>
             <div className="font-serif text-xl">{whisky.abvBand || "High Strength"}</div>
           </div>
           <div className="space-y-2">
             <span className="text-xs uppercase tracking-widest text-muted-foreground">Peat</span>
             <div className="font-serif text-xl">{whisky.peatLevel || "None"}</div>
           </div>
        </CardContent>
      </Card>
    </div>
  );

  // Act 4: Placement (Ranking)
  const Act4 = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8">
      <h3 className="text-3xl font-serif text-primary mb-8">Flight Ranking</h3>
      <div className="w-full max-w-2xl space-y-4">
        {[1, 2, 3, 4].map((rank) => (
          <div key={rank} className={cn(
            "flex items-center p-4 rounded-lg border",
            rank === 1 ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border/50"
          )}>
            <div className="font-mono text-2xl font-bold w-12 opacity-50">#{rank}</div>
            <div className="flex-1 font-serif text-lg">
              {rank === 1 ? whisky.name : "???"}
            </div>
            <div className="font-mono font-bold">
              {rank === 1 ? averageScore : "--.-"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const steps = {
    act1: Act1,
    act2: Act2,
    act3: Act3,
    act4: Act4
  };

  const CurrentComponent = steps[currentAct];

  return (
    <div className="w-full h-full p-4 md:p-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentAct}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5 }}
          className="h-full"
        >
          <CurrentComponent />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

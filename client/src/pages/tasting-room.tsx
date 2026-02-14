import { useParams } from "wouter";
import { useState } from "react";
import { useSessionStore } from "@/lib/store";
import { EvaluationForm } from "@/components/evaluation-form";
import { RevealView } from "@/components/reveal-view";
import { SessionControl } from "@/components/session-control";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TastingRoom() {
  const { id } = useParams();
  const { t } = useTranslation();
  
  // Store
  const { sessions, status, currentUser } = useSessionStore();
  
  // Local UI State
  const tasting = sessions.find(t => t.id === id) || sessions[0];
  const [activeWhiskyId, setActiveWhiskyId] = useState(tasting.whiskies[0].id);
  const activeWhisky = tasting.whiskies.find(w => w.id === activeWhiskyId) || tasting.whiskies[0];

  const nextWhisky = () => {
    const currentIndex = tasting.whiskies.findIndex(w => w.id === activeWhiskyId);
    if (currentIndex < tasting.whiskies.length - 1) {
      setActiveWhiskyId(tasting.whiskies[currentIndex + 1].id);
    }
  };

  const prevWhisky = () => {
    const currentIndex = tasting.whiskies.findIndex(w => w.id === activeWhiskyId);
    if (currentIndex > 0) {
      setActiveWhiskyId(tasting.whiskies[currentIndex - 1].id);
    }
  };

  const isReveal = status === 'reveal';
  const showAnalytics = status === 'reveal' || status === 'archived';

  // If we are in "Ritual Mode" (Draft/Open/Closed), we focus on the Whisky itself and Evaluation.
  // If we are in "Insight Mode" (Reveal/Archived), we show the Reveal View.

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <header className="mb-8 border-b border-border/50 pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
             <h1 className="text-4xl font-serif font-black text-primary tracking-tight">{tasting.title}</h1>
             <div className="flex items-center gap-2 text-muted-foreground font-serif italic mt-2 text-lg">
               <span>Hosted by {tasting.host}</span>
               <span>•</span>
               <span>{new Date(tasting.date).toLocaleDateString()}</span>
             </div>
          </div>
          <div className="flex flex-col items-end gap-2">
             <div className="text-xs text-muted-foreground uppercase tracking-widest font-sans">Session Status</div>
             <div className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm font-medium border border-border/50">
                {t(`session.status.${status}`)}
             </div>
          </div>
        </div>
      </header>

      {/* Flight Navigation */}
      <div className="flex overflow-x-auto pb-4 gap-4 no-scrollbar items-center justify-center">
        {tasting.whiskies.map((w, idx) => (
          <button
            key={w.id}
            onClick={() => setActiveWhiskyId(w.id)}
            className={cn(
              "flex flex-col items-center justify-center min-w-[60px] h-[60px] rounded-full border transition-all duration-500 relative",
              activeWhiskyId === w.id 
                ? "bg-primary text-primary-foreground border-primary scale-110 shadow-lg z-10" 
                : "bg-background border-border hover:border-primary/50 text-muted-foreground"
            )}
          >
            <span className="font-serif font-bold text-lg">{idx + 1}</span>
            {activeWhiskyId === w.id && (
               <motion.span 
                 layoutId="active-indicator"
                 className="absolute -bottom-2 w-1 h-1 bg-primary rounded-full"
               />
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Main Stage */}
        <div className="lg:col-span-8">
           <AnimatePresence mode="wait">
              <motion.div
                key={`${activeWhiskyId}-${status}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                {showAnalytics ? (
                   <RevealView whisky={activeWhisky} />
                ) : (
                   <EvaluationForm whisky={activeWhisky} />
                )}
              </motion.div>
           </AnimatePresence>
        </div>

        {/* Side Panel / Info Card */}
        <div className="hidden lg:block lg:col-span-4 space-y-8">
           <div className="sticky top-8 space-y-8">
             <div className="bg-card border border-border/50 shadow-sm p-8 text-center relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50"></div>
                
                <div className="w-40 h-40 mx-auto rounded-full bg-secondary/30 border border-secondary flex items-center justify-center mb-6 relative">
                  <span className="text-6xl font-serif text-primary opacity-80 group-hover:scale-110 transition-transform duration-700">🥃</span>
                </div>
                
                <h3 className="font-serif text-3xl font-bold mb-2 text-primary">{activeWhisky.name}</h3>
                <p className="text-muted-foreground font-serif italic mb-6 text-lg">{activeWhisky.distillery}</p>
                
                <div className="grid grid-cols-2 gap-4 text-left mt-8 pt-8 border-t border-border/30">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-muted-foreground block mb-1">ABV</span>
                    <span className="font-mono text-lg font-medium">{activeWhisky.abv}%</span>
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-widest text-muted-foreground block mb-1">Age</span>
                    <span className="font-mono text-lg font-medium">{activeWhisky.age} YO</span>
                  </div>
                </div>
             </div>

             <div className="flex justify-between gap-4">
                <Button variant="ghost" onClick={prevWhisky} disabled={tasting.whiskies[0].id === activeWhiskyId} className="flex-1 border border-border/50 hover:bg-secondary">
                  <ChevronLeft className="w-4 h-4 mr-2" /> Prev
                </Button>
                <Button variant="ghost" onClick={nextWhisky} disabled={tasting.whiskies[tasting.whiskies.length-1].id === activeWhiskyId} className="flex-1 border border-border/50 hover:bg-secondary">
                  Next <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
             </div>
           </div>
        </div>
      </div>

      {/* Host Controls */}
      {currentUser?.name === 'Host' && <SessionControl />}
    </div>
  );
}

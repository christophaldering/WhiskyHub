import { useParams } from "wouter";
import { MOCK_TASTINGS, MOCK_WHISKIES } from "@/lib/mock-data";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhiskyRating } from "@/components/whisky-rating";
import { LiveResults } from "@/components/live-results";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TastingRoom() {
  const { id } = useParams();
  const tasting = MOCK_TASTINGS.find(t => t.id === id) || MOCK_TASTINGS[0];
  const [activeWhiskyId, setActiveWhiskyId] = useState(tasting.whiskies[0].id);
  const activeWhisky = tasting.whiskies.find(w => w.id === activeWhiskyId) || tasting.whiskies[0];

  const handleRatingSubmit = (ratings: any) => {
    console.log("Submitted ratings:", ratings);
    // Here we would send to backend
  };

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

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
             <h1 className="text-3xl font-serif text-primary">{tasting.title}</h1>
             <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
               <span>Host: {tasting.host}</span>
               <span>•</span>
               <span>{tasting.location}</span>
               <span>•</span>
               <span>{new Date(tasting.date).toLocaleDateString()}</span>
             </div>
          </div>
          <div className="bg-card/50 px-4 py-2 rounded-lg border border-border/50 text-right">
             <div className="text-xs text-muted-foreground uppercase tracking-widest">Flight Progress</div>
             <div className="text-xl font-mono text-primary font-bold">
               {tasting.whiskies.findIndex(w => w.id === activeWhiskyId) + 1} / {tasting.whiskies.length}
             </div>
          </div>
        </div>
      </header>

      {/* Whisky Navigation Pills */}
      <div className="flex overflow-x-auto pb-4 gap-2 no-scrollbar">
        {tasting.whiskies.map((w, idx) => (
          <button
            key={w.id}
            onClick={() => setActiveWhiskyId(w.id)}
            className={cn(
              "flex flex-col items-start min-w-[140px] p-3 rounded-lg border transition-all duration-300 text-left",
              activeWhiskyId === w.id 
                ? "bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(255,170,0,0.2)]" 
                : "bg-card/40 border-border/50 text-muted-foreground hover:bg-card/80 hover:text-foreground"
            )}
          >
            <span className="text-xs opacity-70 font-mono mb-1">Dram {idx + 1}</span>
            <span className="font-serif font-semibold text-sm truncate w-full">{w.name}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Main Content Area */}
        <div className="md:col-span-12 lg:col-span-8">
          <Tabs defaultValue="rate" className="w-full">
            <TabsList className="w-full bg-card/30 border border-border/50 p-1 mb-6">
              <TabsTrigger value="rate" className="flex-1 font-serif data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Rate & Review</TabsTrigger>
              <TabsTrigger value="results" className="flex-1 font-serif data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Live Stats</TabsTrigger>
              <TabsTrigger value="info" className="flex-1 font-serif data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Distillery Info</TabsTrigger>
            </TabsList>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={activeWhiskyId}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
              >
                <TabsContent value="rate" className="mt-0">
                  <WhiskyRating whisky={activeWhisky} onSubmit={handleRatingSubmit} />
                </TabsContent>
                
                <TabsContent value="results" className="mt-0">
                  <LiveResults whisky={activeWhisky} />
                </TabsContent>

                <TabsContent value="info" className="mt-0">
                  <div className="bg-card/40 border border-border/50 rounded-lg p-8">
                    <h2 className="text-3xl font-serif text-primary mb-4">{activeWhisky.distillery}</h2>
                    <div className="prose prose-invert prose-amber max-w-none">
                      <p className="text-lg leading-relaxed text-foreground/90">
                        {activeWhisky.notes}
                      </p>
                      <div className="grid grid-cols-2 gap-4 mt-8">
                         <div className="p-4 bg-background/50 rounded border border-border/50">
                           <div className="text-muted-foreground text-sm uppercase">Region</div>
                           <div className="font-serif text-xl">Islay</div>
                         </div>
                         <div className="p-4 bg-background/50 rounded border border-border/50">
                           <div className="text-muted-foreground text-sm uppercase">Cask Type</div>
                           <div className="font-serif text-xl">Sherry Butt</div>
                         </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </Tabs>
        </div>

        {/* Desktop Side Panel / Context */}
        <div className="hidden lg:block lg:col-span-4 space-y-6">
           <div className="sticky top-6">
             <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-center mb-6">
                <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-b from-amber-500/20 to-transparent border border-amber-500/30 flex items-center justify-center mb-4">
                  <span className="text-4xl">🥃</span>
                </div>
                <h3 className="font-serif text-2xl mb-1">{activeWhisky.name}</h3>
                <p className="text-muted-foreground">{activeWhisky.distillery}</p>
             </div>

             <div className="flex justify-between gap-4">
                <Button variant="outline" onClick={prevWhisky} disabled={tasting.whiskies[0].id === activeWhiskyId} className="flex-1">
                  <ChevronLeft className="w-4 h-4 mr-2" /> Prev
                </Button>
                <Button variant="outline" onClick={nextWhisky} disabled={tasting.whiskies[tasting.whiskies.length-1].id === activeWhiskyId} className="flex-1">
                  Next <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}

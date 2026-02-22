import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { User, Star, Sparkles, Brain, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { participantApi } from "@/lib/api";

const LEVELS = [
  { id: "guest", icon: User, gradient: "from-slate-500/20 to-slate-600/10", color: "text-slate-500" },
  { id: "explorer", icon: Star, gradient: "from-amber-500/20 to-amber-600/10", color: "text-amber-500" },
  { id: "connoisseur", icon: Sparkles, gradient: "from-primary/20 to-primary/10", color: "text-primary" },
  { id: "analyst", icon: Brain, gradient: "from-violet-500/20 to-violet-600/10", color: "text-violet-500" },
] as const;

export function LevelOnboarding() {
  const { t } = useTranslation();
  const { currentParticipant, setParticipant } = useAppStore();
  const [visible, setVisible] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  if (!currentParticipant || !visible) return null;

  const hasChosenKey = `casksense_level_chosen_${currentParticipant.id}`;
  const hasChosen = localStorage.getItem(hasChosenKey);
  if (hasChosen) return null;

  const handleSelect = async (level: string) => {
    setSelected(level);
    try {
      await participantApi.updateExperienceLevel(currentParticipant.id, level);
      setParticipant({ ...currentParticipant, experienceLevel: level });
      localStorage.setItem(hasChosenKey, "true");
    } catch {}
    setTimeout(() => setVisible(false), 400);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
          data-testid="level-onboarding-overlay"
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full max-w-lg space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-serif font-black text-primary">
                {t("nav.levelOnboarding.title")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("nav.levelOnboarding.subtitle")}
              </p>
            </div>

            <div className="space-y-3">
              {LEVELS.map((lvl, i) => (
                <motion.button
                  key={lvl.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                  onClick={() => handleSelect(lvl.id)}
                  disabled={!!selected}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border border-border/40 bg-gradient-to-r transition-all group",
                    lvl.gradient,
                    selected === lvl.id
                      ? "border-primary ring-2 ring-primary/20 scale-[1.02]"
                      : selected
                        ? "opacity-40"
                        : "hover:border-primary/40 hover:shadow-md"
                  )}
                  data-testid={`button-onboarding-level-${lvl.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("w-10 h-10 rounded-lg bg-background/50 flex items-center justify-center flex-shrink-0")}>
                      <lvl.icon className={cn("w-5 h-5", lvl.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-serif font-bold text-primary">
                        {t(`quickTasting.level.${lvl.id}.title`)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        {t(`quickTasting.level.${lvl.id}.desc`)}
                      </div>
                    </div>
                    <ArrowRight className={cn(
                      "w-4 h-4 text-muted-foreground/50 ml-auto mt-3 transition-colors flex-shrink-0",
                      !selected && "group-hover:text-primary"
                    )} />
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

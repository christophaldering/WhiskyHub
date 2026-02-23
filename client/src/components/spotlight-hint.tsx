import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronRight, ChevronLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

export interface SpotlightHint {
  id: string;
  targetSelector: string;
  message: string;
  position?: "top" | "bottom" | "left" | "right";
}

export interface TourDefinition {
  id: string;
  level: "guest" | "explorer" | "connoisseur" | "analyst";
  steps: SpotlightHint[];
}

const STORAGE_KEY = "casksense_dismissed_hints";
const TOUR_STORAGE_KEY = "casksense_tour_state";
const TOUR_DISABLED_KEY = "casksense_tour_disabled";

function getDismissedHints(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function dismissHint(id: string) {
  const dismissed = getDismissedHints();
  if (!dismissed.includes(id)) {
    dismissed.push(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed));
  }
}

interface TourState {
  completedTours: string[];
  currentTourId: string | null;
  currentStepIndex: number;
}

function getTourState(): TourState {
  try {
    return JSON.parse(localStorage.getItem(TOUR_STORAGE_KEY) || '{"completedTours":[],"currentTourId":null,"currentStepIndex":0}');
  } catch {
    return { completedTours: [], currentTourId: null, currentStepIndex: 0 };
  }
}

function saveTourState(state: TourState) {
  localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(state));
}

function isTourDisabled(): boolean {
  try {
    return localStorage.getItem(TOUR_DISABLED_KEY) === "true";
  } catch {
    return false;
  }
}

function setTourDisabled(disabled: boolean) {
  localStorage.setItem(TOUR_DISABLED_KEY, disabled ? "true" : "false");
}

export function resetAllTours() {
  localStorage.removeItem(TOUR_STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(TOUR_DISABLED_KEY);
}

type Dir = "top" | "bottom" | "left" | "right";

function computeBestPosition(
  rect: DOMRect,
  tooltipWidth: number,
  tooltipHeight: number,
  preferred: Dir,
  gap: number
): { top: number; left: number; arrowDir: Dir } {
  const fits = {
    right: rect.right + gap + tooltipWidth < window.innerWidth,
    left: rect.left - gap - tooltipWidth > 0,
    top: rect.top - gap - tooltipHeight > 0,
    bottom: rect.bottom + gap + tooltipHeight < window.innerHeight,
  };

  const place = (dir: Dir): { top: number; left: number; arrowDir: Dir } => {
    switch (dir) {
      case "right":
        return { top: rect.top + rect.height / 2 - tooltipHeight / 2, left: rect.right + gap, arrowDir: "right" };
      case "left":
        return { top: rect.top + rect.height / 2 - tooltipHeight / 2, left: rect.left - gap - tooltipWidth, arrowDir: "left" };
      case "top":
        return { top: rect.top - gap - tooltipHeight, left: rect.left + rect.width / 2 - tooltipWidth / 2, arrowDir: "top" };
      case "bottom":
        return { top: rect.bottom + gap, left: rect.left + rect.width / 2 - tooltipWidth / 2, arrowDir: "bottom" };
    }
  };

  const order: Dir[] = [preferred, "right", "left", "top", "bottom"];
  const seen = new Map<Dir, boolean>();
  const unique = order.filter(d => { if (seen.has(d)) return false; seen.set(d, true); return true; });
  for (const dir of unique) {
    if (fits[dir as keyof typeof fits]) {
      const pos = place(dir);
      pos.top = Math.max(8, Math.min(pos.top, window.innerHeight - tooltipHeight - 8));
      pos.left = Math.max(8, Math.min(pos.left, window.innerWidth - tooltipWidth - 8));
      return pos;
    }
  }

  const fallback = place("bottom");
  fallback.top = Math.max(8, Math.min(fallback.top, window.innerHeight - tooltipHeight - 8));
  fallback.left = Math.max(8, Math.min(fallback.left, window.innerWidth - tooltipWidth - 8));
  return fallback;
}

function TourOverlay({
  hint,
  stepIndex,
  totalSteps,
  tourLevel,
  onNext,
  onPrev,
  onDismiss,
  onDontShowAgain,
  dontShowAgain,
}: {
  hint: SpotlightHint;
  stepIndex: number;
  totalSteps: number;
  tourLevel: string;
  onNext: () => void;
  onPrev: () => void;
  onDismiss: () => void;
  onDontShowAgain: (checked: boolean) => void;
  dontShowAgain: boolean;
}) {
  const { t } = useTranslation();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; arrowDir: Dir } | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const updatePosition = useCallback(() => {
    const el = document.querySelector(hint.targetSelector);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setTargetRect(rect);
    const tooltipEl = tooltipRef.current;
    const tooltipWidth = tooltipEl?.offsetWidth || 300;
    const tooltipHeight = tooltipEl?.offsetHeight || 180;
    setPos(computeBestPosition(rect, tooltipWidth, tooltipHeight, hint.position || "right", 12));
  }, [hint]);

  useEffect(() => {
    const timer = setTimeout(updatePosition, 300);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [updatePosition]);

  useEffect(() => {
    const applyGlow = () => {
      const el = document.querySelector(hint.targetSelector);
      if (el && !el.classList.contains("spotlight-target-glow")) {
        el.classList.add("spotlight-target-glow");
      }
    };
    applyGlow();
    const glowInterval = setInterval(applyGlow, 500);
    const glowTimeout = setTimeout(() => clearInterval(glowInterval), 5000);
    return () => {
      clearInterval(glowInterval);
      clearTimeout(glowTimeout);
      const el = document.querySelector(hint.targetSelector);
      if (el) el.classList.remove("spotlight-target-glow");
    };
  }, [hint.targetSelector]);

  const arrowClass = pos?.arrowDir === "right"
    ? "left-[-6px] top-1/2 -translate-y-1/2 border-r-amber-600/90 border-t-transparent border-b-transparent border-l-transparent border-r-[6px] border-t-[6px] border-b-[6px] border-l-0"
    : pos?.arrowDir === "left"
    ? "right-[-6px] top-1/2 -translate-y-1/2 border-l-amber-600/90 border-t-transparent border-b-transparent border-r-transparent border-l-[6px] border-t-[6px] border-b-[6px] border-r-0"
    : pos?.arrowDir === "top"
    ? "bottom-[-6px] left-1/2 -translate-x-1/2 border-t-amber-600/90 border-l-transparent border-r-transparent border-b-transparent border-t-[6px] border-l-[6px] border-r-[6px] border-b-0"
    : "top-[-6px] left-1/2 -translate-x-1/2 border-b-amber-600/90 border-l-transparent border-r-transparent border-t-transparent border-b-[6px] border-l-[6px] border-r-[6px] border-t-0";

  const isLast = stepIndex === totalSteps - 1;
  const isFirst = stepIndex === 0;

  const levelColors: Record<string, string> = {
    guest: "from-slate-50 to-gray-50 dark:from-slate-950/90 dark:to-gray-950/80 border-slate-400/40",
    explorer: "from-amber-50 to-orange-50 dark:from-amber-950/90 dark:to-orange-950/80 border-amber-500/40",
    connoisseur: "from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 border-primary/40",
    analyst: "from-violet-50 to-purple-50 dark:from-violet-950/90 dark:to-purple-950/80 border-violet-500/40",
  };

  const borderClass = levelColors[tourLevel] || levelColors.explorer;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9998] bg-black/20" onClick={onDismiss}>
        {targetRect && (
          <div
            className="absolute rounded-lg ring-2 ring-amber-500/60 ring-offset-2 ring-offset-background pointer-events-none"
            style={{
              top: targetRect.top - 4,
              left: targetRect.left - 4,
              width: targetRect.width + 8,
              height: targetRect.height + 8,
            }}
          />
        )}
      </div>
      <motion.div
        ref={tooltipRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={`fixed z-[9999] w-[300px] bg-gradient-to-br ${borderClass} border-2 rounded-xl shadow-xl shadow-black/10 p-4`}
        style={{
          top: pos?.top ?? -9999,
          left: pos?.left ?? -9999,
          visibility: pos ? "visible" : "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
        data-testid={`tour-step-${hint.id}`}
      >
        <div className={`absolute w-0 h-0 ${arrowClass}`} />
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 text-muted-foreground/60 hover:text-foreground transition-colors"
          data-testid={`tour-close-${hint.id}`}
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {t("tour.stepOf", { current: stepIndex + 1, total: totalSteps })}
          </span>
          <div className="flex-1 flex gap-0.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= stepIndex ? "bg-amber-500" : "bg-muted-foreground/20"
                }`}
              />
            ))}
          </div>
        </div>

        <p className="text-sm text-foreground leading-relaxed pr-4 mb-3">{hint.message}</p>

        <div className="flex items-center gap-2 mb-3">
          <Checkbox
            id={`tour-dontshow-${hint.id}`}
            checked={dontShowAgain}
            onCheckedChange={(checked) => onDontShowAgain(!!checked)}
            className="h-3.5 w-3.5"
            data-testid={`tour-checkbox-dontshow-${hint.id}`}
          />
          <label htmlFor={`tour-dontshow-${hint.id}`} className="text-[11px] text-muted-foreground cursor-pointer">
            {t("tour.dontShowAgain")}
          </label>
        </div>

        <div className="flex items-center gap-2">
          {!isFirst && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onPrev}
              className="text-xs gap-1"
              data-testid={`tour-prev-${hint.id}`}
            >
              <ChevronLeft className="w-3 h-3" />
              {t("tour.prev")}
            </Button>
          )}
          <div className="flex-1" />
          <Button
            size="sm"
            variant="outline"
            onClick={onNext}
            className="text-xs font-serif border-amber-400/50 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 gap-1"
            data-testid={`tour-next-${hint.id}`}
          >
            {isLast ? t("tour.finish") : t("tour.next")}
            {!isLast && <ChevronRight className="w-3 h-3" />}
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function TourProvider({ tours, paused = false }: { tours: TourDefinition[]; paused?: boolean }) {
  const { t } = useTranslation();
  const [tourState, setTourState] = useState<TourState>(getTourState);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [showLevelPrompt, setShowLevelPrompt] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const disabled = isTourDisabled();

  const currentTour = tourState.currentTourId
    ? tours.find(t => t.id === tourState.currentTourId)
    : null;

  useEffect(() => {
    if (disabled || paused || tourState.currentTourId || showLevelPrompt) return;

    const nextTour = tours.find(t => !tourState.completedTours.includes(t.id));
    if (!nextTour) return;

    const stopPolling = () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    };

    const check = () => {
      const firstStep = nextTour.steps[0];
      if (!firstStep) return false;
      const el = document.querySelector(firstStep.targetSelector);
      if (el) {
        const newState = { ...tourState, currentTourId: nextTour.id, currentStepIndex: 0 };
        setTourState(newState);
        saveTourState(newState);
        stopPolling();
        return true;
      }
      return false;
    };

    timeoutRef.current = setTimeout(() => {
      if (!check()) {
        intervalRef.current = setInterval(check, 2000);
        setTimeout(stopPolling, 30000);
      }
    }, 2000);

    return stopPolling;
  }, [tours, tourState, disabled, paused, showLevelPrompt]);

  const handleNext = useCallback(() => {
    if (!currentTour) return;
    const nextIndex = tourState.currentStepIndex + 1;

    if (nextIndex >= currentTour.steps.length) {
      const newCompleted = [...tourState.completedTours, currentTour.id];
      if (dontShowAgain) {
        setTourDisabled(true);
      }

      const levels = ["guest", "explorer", "connoisseur", "analyst"];
      const currentLevelIdx = levels.indexOf(currentTour.level);
      const nextLevel = levels[currentLevelIdx + 1];
      const nextLevelTour = nextLevel
        ? tours.find(t => t.level === nextLevel && !newCompleted.includes(t.id))
        : null;

      const newState: TourState = {
        completedTours: newCompleted,
        currentTourId: null,
        currentStepIndex: 0,
      };
      setTourState(newState);
      saveTourState(newState);
      setDontShowAgain(false);

      if (nextLevelTour && !dontShowAgain) {
        setShowLevelPrompt(nextLevelTour.id);
      }
      return;
    }

    const newState = { ...tourState, currentStepIndex: nextIndex };
    setTourState(newState);
    saveTourState(newState);
  }, [currentTour, tourState, dontShowAgain, tours]);

  const handlePrev = useCallback(() => {
    if (tourState.currentStepIndex <= 0) return;
    const newState = { ...tourState, currentStepIndex: tourState.currentStepIndex - 1 };
    setTourState(newState);
    saveTourState(newState);
  }, [tourState]);

  const handleDismiss = useCallback(() => {
    if (dontShowAgain) {
      setTourDisabled(true);
    }
    if (currentTour) {
      const newState: TourState = {
        completedTours: [...tourState.completedTours, currentTour.id],
        currentTourId: null,
        currentStepIndex: 0,
      };
      setTourState(newState);
      saveTourState(newState);
    }
    setDontShowAgain(false);
    setShowLevelPrompt(null);
  }, [currentTour, tourState, dontShowAgain]);

  const handleAcceptNextLevel = useCallback(() => {
    if (!showLevelPrompt) return;
    const tour = tours.find(t => t.id === showLevelPrompt);
    if (tour) {
      const newState: TourState = {
        ...tourState,
        currentTourId: tour.id,
        currentStepIndex: 0,
      };
      setTourState(newState);
      saveTourState(newState);
    }
    setShowLevelPrompt(null);
  }, [showLevelPrompt, tours, tourState]);

  const handleDeclineNextLevel = useCallback(() => {
    setShowLevelPrompt(null);
  }, []);

  if (showLevelPrompt) {
    const nextTour = tours.find(t => t.id === showLevelPrompt);
    const levelNames: Record<string, string> = {
      guest: t("nav.levelSelector.guest"),
      explorer: t("nav.levelSelector.explorer"),
      connoisseur: t("nav.levelSelector.connoisseur"),
      analyst: t("nav.levelSelector.analyst"),
    };

    return (
      <>
        <div className="fixed inset-0 z-[9998] bg-black/30" onClick={handleDeclineNextLevel} />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] bg-card border-2 border-amber-500/30 rounded-xl shadow-xl p-5"
          onClick={(e) => e.stopPropagation()}
          data-testid="tour-level-prompt"
        >
          <h3 className="text-base font-serif font-bold text-foreground mb-2">{t("tour.levelPromptTitle")}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t("tour.levelPromptDesc", { level: levelNames[nextTour?.level || "explorer"] || nextTour?.level })}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDeclineNextLevel}
              className="flex-1 text-xs"
              data-testid="tour-decline-next-level"
            >
              {t("tour.maybeLater")}
            </Button>
            <Button
              size="sm"
              onClick={handleAcceptNextLevel}
              className="flex-1 text-xs font-serif"
              data-testid="tour-accept-next-level"
            >
              {t("tour.showMe")}
            </Button>
          </div>
        </motion.div>
      </>
    );
  }

  if (!currentTour) return null;

  const currentStep = currentTour.steps[tourState.currentStepIndex];
  if (!currentStep) return null;

  return (
    <TourOverlay
      hint={currentStep}
      stepIndex={tourState.currentStepIndex}
      totalSteps={currentTour.steps.length}
      tourLevel={currentTour.level}
      onNext={handleNext}
      onPrev={handlePrev}
      onDismiss={handleDismiss}
      onDontShowAgain={setDontShowAgain}
      dontShowAgain={dontShowAgain}
    />
  );
}

export function SpotlightProvider({ hints, paused = false }: { hints: SpotlightHint[]; paused?: boolean }) {
  const [activeHintId, setActiveHintId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string[]>(() => getDismissedHints());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (paused) return;
    const pending = hints.filter(h => !dismissed.includes(h.id));
    if (pending.length === 0 || activeHintId) return;

    const stopPolling = () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    };

    const check = () => {
      for (const hint of pending) {
        const el = document.querySelector(hint.targetSelector);
        if (el) {
          setActiveHintId(hint.id);
          stopPolling();
          return true;
        }
      }
      return false;
    };

    timeoutRef.current = setTimeout(() => {
      if (!check()) {
        intervalRef.current = setInterval(() => {
          check();
        }, 2000);
        setTimeout(() => stopPolling(), 30000);
      }
    }, 1500);

    return stopPolling;
  }, [hints, dismissed, activeHintId, paused]);

  const handleDismiss = useCallback(() => {
    if (activeHintId) {
      dismissHint(activeHintId);
      setDismissed(prev => [...prev, activeHintId]);
      setActiveHintId(null);
    }
  }, [activeHintId]);

  const activeHint = hints.find(h => h.id === activeHintId);
  if (!activeHint) return null;

  return (
    <>
      <div className="fixed inset-0 z-[9998]" onClick={handleDismiss}>
        {(() => {
          const el = document.querySelector(activeHint.targetSelector);
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return (
            <div
              className="absolute rounded-lg ring-2 ring-amber-500/60 ring-offset-2 ring-offset-background pointer-events-none"
              style={{
                top: rect.top - 4,
                left: rect.left - 4,
                width: rect.width + 8,
                height: rect.height + 8,
              }}
            />
          );
        })()}
      </div>
      <SimpleTooltip hint={activeHint} onDismiss={handleDismiss} />
    </>
  );
}

function SimpleTooltip({ hint, onDismiss }: { hint: SpotlightHint; onDismiss: () => void }) {
  const { t } = useTranslation();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; arrowDir: Dir } | null>(null);

  const updatePosition = useCallback(() => {
    const el = document.querySelector(hint.targetSelector);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const tooltipEl = tooltipRef.current;
    const tooltipWidth = tooltipEl?.offsetWidth || 260;
    const tooltipHeight = tooltipEl?.offsetHeight || 100;
    setPos(computeBestPosition(rect, tooltipWidth, tooltipHeight, hint.position || "right", 12));
  }, [hint]);

  useEffect(() => {
    const timer = setTimeout(updatePosition, 300);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [updatePosition]);

  const arrowClass = pos?.arrowDir === "right"
    ? "left-[-6px] top-1/2 -translate-y-1/2 border-r-amber-600/90 border-t-transparent border-b-transparent border-l-transparent border-r-[6px] border-t-[6px] border-b-[6px] border-l-0"
    : pos?.arrowDir === "left"
    ? "right-[-6px] top-1/2 -translate-y-1/2 border-l-amber-600/90 border-t-transparent border-b-transparent border-r-transparent border-l-[6px] border-t-[6px] border-b-[6px] border-r-0"
    : pos?.arrowDir === "top"
    ? "bottom-[-6px] left-1/2 -translate-x-1/2 border-t-amber-600/90 border-l-transparent border-r-transparent border-b-transparent border-t-[6px] border-l-[6px] border-r-[6px] border-b-0"
    : "top-[-6px] left-1/2 -translate-x-1/2 border-b-amber-600/90 border-l-transparent border-r-transparent border-t-transparent border-b-[6px] border-l-[6px] border-r-[6px] border-t-0";

  return (
    <motion.div
      ref={tooltipRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="fixed z-[9999] w-[260px] bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/90 dark:to-orange-950/80 border-2 border-amber-500/40 rounded-xl shadow-xl shadow-amber-900/20 p-4"
      style={{
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        visibility: pos ? "visible" : "hidden",
      }}
      onClick={(e) => e.stopPropagation()}
      data-testid={`spotlight-hint-${hint.id}`}
    >
      <div className={`absolute w-0 h-0 ${arrowClass}`} />
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 text-muted-foreground/60 hover:text-foreground transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <p className="text-sm text-foreground leading-relaxed pr-4">{hint.message}</p>
      <Button
        size="sm"
        variant="outline"
        onClick={onDismiss}
        className="mt-3 w-full text-xs font-serif border-amber-400/50 hover:bg-amber-100/50 dark:hover:bg-amber-900/30"
      >
        {t("spotlight.dismiss")}
      </Button>
    </motion.div>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

export interface SpotlightHint {
  id: string;
  targetSelector: string;
  message: string;
  position?: "top" | "bottom" | "left" | "right";
}

const STORAGE_KEY = "casksense_dismissed_hints";

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

function SpotlightOverlay({ hint, onDismiss }: { hint: SpotlightHint; onDismiss: () => void }) {
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9998]" onClick={onDismiss}>
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
          data-testid={`spotlight-close-${hint.id}`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <p className="text-sm text-foreground leading-relaxed pr-4">{hint.message}</p>
        <Button
          size="sm"
          variant="outline"
          onClick={onDismiss}
          className="mt-3 w-full text-xs font-serif border-amber-400/50 hover:bg-amber-100/50 dark:hover:bg-amber-900/30"
          data-testid={`spotlight-dismiss-${hint.id}`}
        >
          {t("spotlight.dismiss")}
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}

export function SpotlightProvider({ hints }: { hints: SpotlightHint[] }) {
  const [activeHintId, setActiveHintId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string[]>(() => getDismissedHints());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
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
  }, [hints, dismissed, activeHintId]);

  const handleDismiss = useCallback(() => {
    if (activeHintId) {
      dismissHint(activeHintId);
      setDismissed(prev => [...prev, activeHintId]);
      setActiveHintId(null);
    }
  }, [activeHintId]);

  const activeHint = hints.find(h => h.id === activeHintId);
  if (!activeHint) return null;

  return <SpotlightOverlay hint={activeHint} onDismiss={handleDismiss} />;
}

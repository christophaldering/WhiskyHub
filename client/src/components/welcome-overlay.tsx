import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ChevronRight, ChevronLeft } from "lucide-react";

const WELCOME_FLAG = "casksense-welcomed";

interface WelcomeOverlayProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export function WelcomeOverlay({ forceOpen, onClose }: WelcomeOverlayProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      setStep(0);
      return;
    }
    const seen = localStorage.getItem(WELCOME_FLAG);
    if (!seen) {
      setOpen(true);
    }
  }, [forceOpen]);

  const handleClose = () => {
    localStorage.setItem(WELCOME_FLAG, "true");
    setOpen(false);
    setStep(0);
    onClose?.();
  };

  const steps = [
    {
      icon: "🥃",
      title: t("welcome.step1Title"),
      body: t("welcome.step1Body"),
    },
    {
      icon: "📝",
      title: t("welcome.step2Title"),
      body: t("welcome.step2Body"),
    },
    {
      icon: "📊",
      title: t("welcome.step3Title"),
      body: t("welcome.step3Body"),
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-lg bg-card border-border/50 p-0 overflow-hidden" data-testid="welcome-overlay" aria-describedby="welcome-desc">
        <DialogTitle className="sr-only">{t("app.name")}</DialogTitle>
        <DialogDescription id="welcome-desc" className="sr-only">{t("app.tagline")}</DialogDescription>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="px-8 pt-10 pb-2 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-sans mb-1">
            {t("welcome.subtitle")}
          </p>
          <h2 className="text-3xl font-serif font-black text-primary tracking-tight">
            {t("app.name")}
          </h2>
        </div>

        <div className="flex justify-center gap-2 py-3">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === step ? "w-8 bg-primary" : "w-2 bg-border"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="px-8 py-6 text-center min-h-[220px] flex flex-col items-center justify-center"
          >
            <div className="text-5xl mb-6">{current.icon}</div>
            <h3 className="text-xl font-serif font-bold text-primary mb-3">{current.title}</h3>
            <p className="text-muted-foreground font-serif leading-relaxed max-w-sm">{current.body}</p>
          </motion.div>
        </AnimatePresence>

        <div className="px-8 pb-8 flex gap-3">
          {step > 0 && (
            <Button
              variant="ghost"
              onClick={() => setStep(s => s - 1)}
              className="flex-1 font-serif border border-border/50"
              data-testid="button-welcome-back"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> {t("welcome.back")}
            </Button>
          )}
          {isLast ? (
            <Button
              onClick={handleClose}
              className="flex-1 bg-primary text-primary-foreground font-serif tracking-wide h-12 text-base"
              data-testid="button-welcome-enter"
            >
              {t("welcome.enter")}
            </Button>
          ) : (
            <Button
              onClick={() => setStep(s => s + 1)}
              className="flex-1 bg-primary text-primary-foreground font-serif tracking-wide"
              data-testid="button-welcome-continue"
            >
              {t("welcome.continue")} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

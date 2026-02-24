import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import whiskyBg from "@assets/PNG-Bild_1771095178148.png";
import { AmbientToggle } from "@/components/ambient-toggle";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const INTRO_SEEN_KEY = "casksense_intro_seen";

export function markIntroSeen() {
  localStorage.setItem(INTRO_SEEN_KEY, "true");
}

export function hasSeenIntro(): boolean {
  return localStorage.getItem(INTRO_SEEN_KEY) === "true";
}

function PageOne({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const { t } = useTranslation();

  return (
    <motion.div
      key="page1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12 text-center"
    >
      <div className="flex-1" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="space-y-4 mb-16"
      >
        <h1
          className="text-5xl md:text-7xl font-serif font-bold text-white/95 tracking-tight"
          data-testid="text-intro-title"
        >
          {t("intro.title")}
        </h1>
        <div className="h-px w-16 mx-auto bg-amber-500/50" />
        <p className="text-lg md:text-xl text-white/70 font-serif tracking-wide" data-testid="text-intro-tagline">
          {t("intro.tagline")}
        </p>
        <p className="text-sm text-white/40 italic" data-testid="text-intro-subline">
          {t("intro.subline")}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="flex flex-col items-center gap-4 mb-8"
      >
        <button
          onClick={onNext}
          className="group px-8 py-3 border border-amber-500/70 text-amber-100 rounded-sm font-serif text-sm tracking-wide hover:bg-amber-500/10 transition-colors flex items-center gap-2"
          data-testid="button-intro-next"
        >
          {t("intro.discover")}
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
        <button
          onClick={onSkip}
          className="text-xs text-white/40 hover:text-white/60 transition-colors"
          data-testid="button-skip-intro"
        >
          {t("intro.skip")}
        </button>
      </motion.div>

      <div className="flex-1" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="pb-8 flex items-center gap-3"
      >
        <IntroLanguageToggle />
        <AmbientToggle variant="intro" />
      </motion.div>
    </motion.div>
  );
}

function PageTwo({ onEnter, onBack }: { onEnter: () => void; onBack: () => void }) {
  const { t } = useTranslation();

  const features = [
    { key: "feature1", icon: "🥃" },
    { key: "feature2", icon: "📝" },
    { key: "feature3", icon: "🤝" },
  ];

  return (
    <motion.div
      key="page2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12 text-center"
    >
      <div className="flex-1" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.7 }}
        className="mb-10"
      >
        <h2 className="text-2xl md:text-3xl font-serif font-semibold text-white/90 mb-3" data-testid="text-intro-why-title">
          {t("intro.whyTitle")}
        </h2>
        <p className="text-sm leading-relaxed text-white/60 max-w-md mx-auto" data-testid="text-intro-why-body">
          {t("intro.whyBody")}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.7 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-2xl mx-auto mb-10"
      >
        {features.map((f, i) => (
          <motion.div
            key={f.key}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.15, duration: 0.5 }}
            className="bg-white/5 border border-white/10 rounded-lg px-5 py-5 backdrop-blur-sm"
            data-testid={`intro-${f.key}`}
          >
            <div className="text-2xl mb-2">{f.icon}</div>
            <h3 className="text-sm font-serif font-semibold text-white/85 mb-1">
              {t(`intro.${f.key}Title`)}
            </h3>
            <p className="text-xs text-white/50 leading-relaxed">
              {t(`intro.${f.key}Desc`)}
            </p>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.7 }}
        className="space-y-3 mb-10"
      >
        <div className="text-sm text-white/50 italic space-y-1">
          <p>{t("intro.notFaster")}</p>
          <p>{t("intro.butClearer")}</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.7 }}
        className="flex flex-col items-center gap-3 mb-8"
      >
        <button
          onClick={onEnter}
          className="px-10 py-3 bg-amber-600/80 hover:bg-amber-600/90 text-white rounded-sm font-serif text-sm tracking-wide transition-colors shadow-lg shadow-amber-900/20"
          data-testid="button-enter-circle"
        >
          {t("intro.enter")}
        </button>
        <button
          onClick={onBack}
          className="text-xs text-white/40 hover:text-white/60 transition-colors"
          data-testid="button-intro-back"
        >
          {t("intro.back")}
        </button>
      </motion.div>

      <div className="flex-1" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.7 }}
        className="pb-8 flex items-center gap-3"
      >
        <IntroLanguageToggle />
        <AmbientToggle variant="intro" />
      </motion.div>
    </motion.div>
  );
}

function IntroLanguageToggle() {
  const { i18n } = useTranslation();
  const toggle = () => i18n.changeLanguage(i18n.language === "en" ? "de" : "en");

  return (
    <button
      onClick={toggle}
      className="font-mono text-xs tracking-wider border border-white/20 rounded-sm px-3 py-1.5 hover:bg-white/10 transition-colors"
      data-testid="intro-language-toggle"
    >
      <span className={cn(i18n.language === "en" ? "font-bold text-white/90" : "text-white/40")}>EN</span>
      <span className="mx-1 text-white/20">|</span>
      <span className={cn(i18n.language === "de" ? "font-bold text-white/90" : "text-white/40")}>DE</span>
    </button>
  );
}

export default function Intro() {
  const [, navigate] = useLocation();
  const [page, setPage] = useState<1 | 2>(1);

  const handleEnter = () => {
    markIntroSeen();
    navigate("/about");
  };

  const handleSkip = () => {
    markIntroSeen();
    navigate("/tasting");
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center" data-testid="intro-screen">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${whiskyBg})` }}
      />
      <div className="absolute inset-0 bg-[rgba(44,31,23,0.45)]" />

      <AnimatePresence mode="wait">
        {page === 1 ? (
          <PageOne onNext={() => setPage(2)} onSkip={handleSkip} />
        ) : (
          <PageTwo onEnter={handleEnter} onBack={() => setPage(1)} />
        )}
      </AnimatePresence>
    </div>
  );
}

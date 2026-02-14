import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import whiskyBg from "@/assets/whisky-bg.png";

const INTRO_SEEN_KEY = "casksense_intro_seen";

export function markIntroSeen() {
  localStorage.setItem(INTRO_SEEN_KEY, "true");
}

export function hasSeenIntro(): boolean {
  return localStorage.getItem(INTRO_SEEN_KEY) === "true";
}

export default function Intro() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  const handleEnter = () => {
    markIntroSeen();
    navigate("/");
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center" data-testid="intro-screen">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${whiskyBg})` }}
      />
      <div className="absolute inset-0 bg-[rgba(44,31,23,0.4)]" />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12 text-center">
        <div className="flex-1" />

        <div className="space-y-3 mb-10">
          <h1
            className="text-4xl md:text-5xl font-serif font-bold text-white/95 tracking-tight"
            data-testid="text-intro-title"
          >
            {t("intro.title")}
          </h1>
          <p className="text-base md:text-lg text-white/70 font-serif tracking-wide" data-testid="text-intro-tagline">
            {t("intro.tagline")}
          </p>
          <p className="text-sm text-white/50 italic" data-testid="text-intro-subline">
            {t("intro.subline")}
          </p>
        </div>

        <div className="max-w-[500px] space-y-6 mb-12">
          <div>
            <h2 className="text-lg font-serif font-semibold text-white/90 mb-3" data-testid="text-intro-why-title">
              {t("intro.whyTitle")}
            </h2>
            <p className="text-sm leading-relaxed text-white/70" data-testid="text-intro-why-body">
              {t("intro.whyBody")}
            </p>
          </div>
          <div className="text-sm text-white/60 leading-relaxed italic space-y-1">
            <p>{t("intro.notFaster")}</p>
            <p>{t("intro.butClearer")}</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 mb-8">
          <button
            onClick={handleEnter}
            className="px-8 py-3 border border-amber-500/70 text-amber-100 rounded-sm font-serif text-sm tracking-wide hover:bg-amber-500/10 transition-colors"
            data-testid="button-enter-circle"
          >
            {t("intro.enter")}
          </button>
          <button
            onClick={handleEnter}
            className="text-xs text-white/40 hover:text-white/60 transition-colors"
            data-testid="button-skip-intro"
          >
            {t("intro.skip")}
          </button>
        </div>

        <div className="flex-1" />
      </div>
    </div>
  );
}

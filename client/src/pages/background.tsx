import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Wine, Search, Star, Beaker, ArrowLeft, BookOpen,
  SlidersHorizontal, Eye, PartyPopper, Radar, NotebookPen,
  Award, Heart, BarChart3, Activity, TrendingUp, ShieldCheck, Ban
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const sections = [
  { id: "tasting", icon: Wine, color: "bg-emerald-500/15 text-emerald-600", border: "border-emerald-500/30", accent: "emerald" },
  { id: "profile", icon: Search, color: "bg-blue-500/15 text-blue-600", border: "border-blue-500/30", accent: "blue" },
  { id: "dimensions", icon: Star, color: "bg-amber-500/15 text-amber-600", border: "border-amber-500/30", accent: "amber" },
  { id: "science", icon: Beaker, color: "bg-purple-500/15 text-purple-600", border: "border-purple-500/30", accent: "purple" },
] as const;

export default function Background() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (window.location.hash) {
      const el = document.getElementById(window.location.hash.slice(1));
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background" data-testid="background-page">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="font-serif text-xs gap-1.5" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
            {t("background.backToHome")}
          </Button>
          <nav className="hidden sm:flex gap-1">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="text-xs px-3 py-1.5 rounded-full hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors font-medium"
                data-testid={`nav-${s.id}`}
              >
                {t(`background.${s.id}.title`)}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="w-8 h-8 text-primary" />
            <h1 className="text-3xl sm:text-4xl font-serif font-black text-primary">{t("background.title")}</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t("background.subtitle")}</p>
        </motion.div>

        <div className="space-y-16">
          {/* Section 1: How a Tasting Works */}
          <motion.section id="tasting" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                <Wine className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-serif font-bold text-primary">{t("background.tasting.title")}</h2>
                <p className="text-sm text-emerald-600 font-medium">{t("background.tasting.tagline")}</p>
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-8">{t("background.tasting.intro")}</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { key: "step1", icon: Wine, num: "1" },
                { key: "step2", icon: SlidersHorizontal, num: "2" },
                { key: "step3", icon: Eye, num: "3" },
                { key: "step4", icon: PartyPopper, num: "4" },
              ].map((step) => (
                <div key={step.key} className="bg-card border border-emerald-500/20 rounded-lg p-5 relative overflow-hidden">
                  <div className="absolute top-3 right-3 text-4xl font-black text-emerald-500/10">{step.num}</div>
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <step.icon className="w-4 h-4 text-emerald-600" />
                      <h3 className="font-serif font-semibold text-sm text-primary">{t(`background.tasting.${step.key}title`)}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t(`background.tasting.${step.key}`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Section 2: Your Personal Profile */}
          <motion.section id="profile" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-serif font-bold text-primary">{t("background.profile.title")}</h2>
                <p className="text-sm text-blue-600 font-medium">{t("background.profile.tagline")}</p>
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-8">{t("background.profile.intro")}</p>
            <div className="space-y-4">
              {[
                { key: "flavor", icon: Radar },
                { key: "journal", icon: NotebookPen },
                { key: "badges", icon: Award },
                { key: "wishlist", icon: Heart },
              ].map((item) => (
                <div key={item.key} className="flex gap-4 bg-card border border-blue-500/20 rounded-lg p-5">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(`background.profile.${item.key}`)}</p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Section 3: Rating Dimensions */}
          <motion.section id="dimensions" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                <Star className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-serif font-bold text-primary">{t("background.dimensions.title")}</h2>
                <p className="text-sm text-amber-600 font-medium">{t("background.dimensions.tagline")}</p>
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-8">{t("background.dimensions.intro")}</p>
            <div className="space-y-3">
              {["nose", "palate", "finish", "overall"].map((dim) => (
                <div key={dim} className="bg-card border border-amber-500/20 rounded-lg p-5">
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(`background.dimensions.${dim}`)}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 bg-amber-500/5 border border-amber-500/20 rounded-lg p-5">
              <h3 className="font-serif font-semibold text-primary text-sm mb-2 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                {t("background.dimensions.scalesTitle")}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("background.dimensions.scales")}</p>
            </div>
          </motion.section>

          {/* Section 4: Scientific Basis */}
          <motion.section id="science" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-purple-500/15 text-purple-600 flex items-center justify-center">
                <Beaker className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-serif font-bold text-primary">{t("background.science.title")}</h2>
                <p className="text-sm text-purple-600 font-medium">{t("background.science.tagline")}</p>
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-8">{t("background.science.intro")}</p>
            <div className="space-y-4">
              {[
                { key: "norm", titleKey: "normTitle", icon: BarChart3 },
                { key: "median", titleKey: "medianTitle", icon: Activity },
                { key: "kendall", titleKey: "kendallTitle", icon: TrendingUp },
                { key: "correl", titleKey: "correlTitle", icon: TrendingUp },
                { key: "iqr", titleKey: "iqrTitle", icon: ShieldCheck },
                { key: "noRank", titleKey: "noRankTitle", icon: Ban },
              ].map((item) => (
                <div key={item.key} className="bg-card border border-purple-500/20 rounded-lg p-5">
                  <h3 className="font-serif font-semibold text-primary text-sm mb-2 flex items-center gap-2">
                    <item.icon className="w-4 h-4 text-purple-600" />
                    {t(`background.science.${item.titleKey}`)}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(`background.science.${item.key}`)}</p>
                </div>
              ))}
            </div>
          </motion.section>
        </div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="mt-16 text-center">
          <Button onClick={() => navigate("/app")} className="font-serif gap-2" data-testid="button-open-app">
            {t("landing.cta.button")}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

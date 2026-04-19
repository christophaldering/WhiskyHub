import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useEffect } from "react";
import {
  Wine, Search, Star, Beaker, BookOpen,
  SlidersHorizontal, Eye, PartyPopper, Radar, NotebookPen,
  Award, Heart, BarChart3, Activity, TrendingUp, ShieldCheck, Ban
} from "lucide-react";
import SimpleShell from "@/components/simple/simple-shell";
import BackButton from "@/components/back-button";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function Background() {
  const { t } = useTranslation();

  useEffect(() => {
    if (window.location.hash) {
      const el = document.getElementById(window.location.hash.slice(1));
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    }
  }, []);

  return (
    <SimpleShell maxWidth={700}>
      <div data-testid="background-page">
        <BackButton fallback="/labs/bibliothek" />

        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-7 h-7 text-primary" />
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-primary">{t("background.title")}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{t("background.subtitle")}</p>
        </motion.div>

        <div className="space-y-12">
          <motion.section id="tasting" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                <Wine className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-serif font-bold text-primary">{t("background.tasting.title")}</h2>
                <p className="text-xs text-emerald-600 font-medium">{t("background.tasting.tagline")}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">{t("background.tasting.intro")}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { key: "step1", icon: Wine, num: "1" },
                { key: "step2", icon: SlidersHorizontal, num: "2" },
                { key: "step3", icon: Eye, num: "3" },
                { key: "step4", icon: PartyPopper, num: "4" },
              ].map((step) => (
                <div key={step.key} className="bg-card border border-emerald-500/20 rounded-lg p-4 relative overflow-hidden">
                  <div className="absolute top-2 right-3 text-3xl font-black text-emerald-500/10">{step.num}</div>
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-1">
                      <step.icon className="w-4 h-4 text-emerald-600" />
                      <h3 className="font-serif font-semibold text-sm text-primary">{t(`background.tasting.${step.key}title`)}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{t(`background.tasting.${step.key}`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section id="profile" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-serif font-bold text-primary">{t("background.profile.title")}</h2>
                <p className="text-xs text-blue-600 font-medium">{t("background.profile.tagline")}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">{t("background.profile.intro")}</p>
            <div className="space-y-3">
              {[
                { key: "flavor", icon: Radar },
                { key: "journal", icon: NotebookPen },
                { key: "badges", icon: Award },
                { key: "wishlist", icon: Heart },
              ].map((item) => (
                <div key={item.key} className="flex gap-3 bg-card border border-blue-500/20 rounded-lg p-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t(`background.profile.${item.key}`)}</p>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section id="dimensions" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-serif font-bold text-primary">{t("background.dimensions.title")}</h2>
                <p className="text-xs text-amber-600 font-medium">{t("background.dimensions.tagline")}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">{t("background.dimensions.intro")}</p>
            <div className="space-y-3">
              {["nose", "palate", "finish", "overall"].map((dim) => (
                <div key={dim} className="bg-card border border-amber-500/20 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">{t(`background.dimensions.${dim}`)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
              <h3 className="font-serif font-semibold text-primary text-sm mb-2 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                {t("background.dimensions.scalesTitle")}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{t("background.dimensions.scales")}</p>
            </div>
          </motion.section>

          <motion.section id="science" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 flex items-center justify-center">
                <Beaker className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-serif font-bold text-primary">{t("background.science.title")}</h2>
                <p className="text-xs text-purple-600 font-medium">{t("background.science.tagline")}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">{t("background.science.intro")}</p>
            <div className="space-y-3">
              {[
                { key: "norm", titleKey: "normTitle", icon: BarChart3 },
                { key: "median", titleKey: "medianTitle", icon: Activity },
                { key: "kendall", titleKey: "kendallTitle", icon: TrendingUp },
                { key: "correl", titleKey: "correlTitle", icon: TrendingUp },
                { key: "iqr", titleKey: "iqrTitle", icon: ShieldCheck },
                { key: "noRank", titleKey: "noRankTitle", icon: Ban },
              ].map((item) => (
                <div key={item.key} className="bg-card border border-purple-500/20 rounded-lg p-4">
                  <h3 className="font-serif font-semibold text-primary text-sm mb-2 flex items-center gap-2">
                    <item.icon className="w-4 h-4 text-purple-600" />
                    {t(`background.science.${item.titleKey}`)}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t(`background.science.${item.key}`)}</p>
                </div>
              ))}
            </div>
          </motion.section>
        </div>
      </div>
    </SimpleShell>
  );
}

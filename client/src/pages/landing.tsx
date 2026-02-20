import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { platformStatsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/images/hero-whisky.png";
import christophImage from "@assets/22A3ABF8-0085-4C82-97DF-EAA0ACD46B4E_1771546683886.jpeg";
import {
  Glasses, BookOpen, Users, BarChart3, Brain, Camera,
  FileUp, Globe, ArrowRight, Wine,
  ChevronDown, Heart
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const },
  }),
};

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, type: "spring" }}
      className="tabular-nums"
    >
      {value.toLocaleString()}{suffix}
    </motion.span>
  );
}

export default function Landing() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const { data: stats } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: platformStatsApi.get,
    staleTime: 60_000,
  });

  const features = [
    { icon: Glasses, titleKey: "landing.features.blindTasting", descKey: "landing.features.blindTastingDesc", color: "text-amber-600 bg-amber-600/10" },
    { icon: Brain, titleKey: "landing.features.aiImport", descKey: "landing.features.aiImportDesc", color: "text-orange-500 bg-orange-500/10" },
    { icon: BookOpen, titleKey: "landing.features.journal", descKey: "landing.features.journalDesc", color: "text-amber-700 bg-amber-700/10" },
    { icon: BarChart3, titleKey: "landing.features.analytics", descKey: "landing.features.analyticsDesc", color: "text-yellow-600 bg-yellow-600/10" },
    { icon: Users, titleKey: "landing.features.community", descKey: "landing.features.communityDesc", color: "text-orange-600 bg-orange-600/10" },
    { icon: Globe, titleKey: "landing.features.encyclopedia", descKey: "landing.features.encyclopediaDesc", color: "text-amber-500 bg-amber-500/10" },
  ];

  const steps = [
    { icon: FileUp, titleKey: "landing.steps.create", descKey: "landing.steps.createDesc", num: "01" },
    { icon: Users, titleKey: "landing.steps.invite", descKey: "landing.steps.inviteDesc", num: "02" },
    { icon: Wine, titleKey: "landing.steps.taste", descKey: "landing.steps.tasteDesc", num: "03" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2.5" data-testid="landing-logo">
            <Wine className="w-6 h-6 text-primary" />
            <span className="font-serif font-black text-xl text-primary tracking-tight">CaskSense</span>
          </button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="font-serif text-sm" data-testid="landing-nav-explore">
              {t("landing.nav.explore")}
            </Button>
            <Button size="sm" onClick={() => navigate("/app")} className="font-serif text-sm gap-1.5" data-testid="landing-nav-start">
              {t("landing.nav.getStarted")}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/10 via-transparent to-orange-900/5" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 lg:py-32 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 bg-amber-500/15 text-amber-400 rounded-full px-4 py-1.5 text-sm font-medium">
                <Wine className="w-4 h-4" />
                {t("landing.hero.badge")}
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-black text-primary leading-tight tracking-tight">
                {t("landing.hero.title")}
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-lg">
                {t("landing.hero.subtitle")}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button size="lg" onClick={() => navigate("/app")} className="font-serif text-base gap-2 px-8" data-testid="landing-hero-cta">
                  {t("landing.hero.cta")}
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="font-serif text-base gap-2" data-testid="landing-hero-learn">
                  {t("landing.hero.learnMore")}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="relative hidden lg:block"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-amber-900/20 border border-amber-800/20">
                <img src={heroImage} alt="CaskSense" className="w-full h-auto object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Live Stats */}
      {stats && (stats.totalTastings > 0 || stats.totalParticipants > 0) && (
        <section className="border-y border-amber-800/20 bg-amber-900/5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: stats.totalTastings, labelKey: "landing.stats.tastings" },
                { value: stats.totalParticipants, labelKey: "landing.stats.participants" },
                { value: stats.totalWhiskies, labelKey: "landing.stats.whiskies" },
                { value: stats.totalRatings, labelKey: "landing.stats.ratings" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.labelKey}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i}
                  variants={fadeUp}
                  className="space-y-1"
                >
                  <div className="text-3xl sm:text-4xl font-serif font-black text-primary">
                    <AnimatedCounter value={stat.value} />
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">{t(stat.labelKey)}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-primary mb-4">{t("landing.features.title")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t("landing.features.subtitle")}</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.titleKey}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="bg-card border border-border/50 rounded-xl p-6 hover:shadow-md hover:border-amber-700/30 transition-all group"
                data-testid={`landing-feature-${i}`}
              >
                <div className={`w-12 h-12 rounded-lg ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-bold text-primary text-lg mb-2">{t(f.titleKey)}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{t(f.descKey)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 sm:py-28 bg-amber-900/5 border-y border-amber-800/15">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-primary mb-4">{t("landing.howItWorks.title")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t("landing.howItWorks.subtitle")}</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-amber-700/20 via-amber-600/40 to-amber-700/20" />
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="relative text-center"
                data-testid={`landing-step-${i}`}
              >
                <div className="w-16 h-16 rounded-full bg-amber-800/10 border-2 border-amber-700/30 flex items-center justify-center mx-auto mb-5 relative z-10 bg-background">
                  <span className="text-2xl font-serif font-black text-primary">{s.num}</span>
                </div>
                <h3 className="font-serif font-bold text-primary text-lg mb-2">{t(s.titleKey)}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">{t(s.descKey)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Origin Story */}
      <section className="py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-primary mb-4">{t("landing.story.title")}</h2>
          </motion.div>
          <div className="grid lg:grid-cols-5 gap-10 lg:gap-12 items-start">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0}
              variants={fadeUp}
              className="lg:col-span-2 space-y-3"
            >
              <div className="rounded-2xl overflow-hidden shadow-xl shadow-amber-900/15 border border-amber-800/20">
                <img src={christophImage} alt="Christoph & Sammy" className="w-full h-auto object-cover" />
              </div>
              <p className="text-sm text-muted-foreground/60 italic text-center">{t("landing.story.photoCaption")}</p>
            </motion.div>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={1}
              variants={fadeUp}
              className="lg:col-span-3 space-y-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <Heart className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-medium text-amber-500 uppercase tracking-widest">{t("landing.story.label")}</span>
              </div>
              <p className="text-muted-foreground leading-relaxed text-base">
                {t("landing.story.p1")}
              </p>
              <p className="text-muted-foreground leading-relaxed text-base">
                {t("landing.story.p2")}
              </p>
              <p className="text-muted-foreground leading-relaxed text-base">
                {t("landing.story.p3")}
              </p>
              <p className="text-muted-foreground leading-relaxed text-base">
                {t("landing.story.p4")}
              </p>
              <p className="text-muted-foreground leading-relaxed text-base">
                {t("landing.story.p5")}
              </p>
              <ul className="space-y-2 pl-1">
                <li className="flex items-start gap-3 text-muted-foreground text-base">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>{t("landing.story.bullet1")}</span>
                </li>
                <li className="flex items-start gap-3 text-muted-foreground text-base">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>{t("landing.story.bullet2")}</span>
                </li>
              </ul>
              <p className="text-muted-foreground/60 leading-relaxed text-sm italic pt-2 border-t border-amber-800/10 mt-4">
                {t("landing.story.tagline")}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* AI Highlight */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-amber-900/8 via-transparent to-orange-900/5 border-y border-amber-800/15">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0}
              variants={fadeUp}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-400 rounded-full px-4 py-1.5 text-sm font-medium">
                <Brain className="w-4 h-4" />
                {t("landing.ai.badge")}
              </div>
              <h2 className="text-3xl sm:text-4xl font-serif font-black text-primary leading-tight">
                {t("landing.ai.title")}
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {t("landing.ai.desc")}
              </p>
              <ul className="space-y-3">
                {["landing.ai.bullet1", "landing.ai.bullet2", "landing.ai.bullet3"].map((k) => (
                  <li key={k} className="flex items-start gap-3 text-muted-foreground">
                    <ArrowRight className="w-3 h-3 text-amber-500 mt-1.5 shrink-0" />
                    <span className="text-sm">{t(k)}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={1}
              variants={fadeUp}
              className="grid grid-cols-2 gap-4"
            >
              {[
                { icon: Camera, label: t("landing.ai.photo"), color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
                { icon: FileUp, label: t("landing.ai.file"), color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
                { icon: Globe, label: t("landing.ai.web"), color: "bg-yellow-600/10 text-yellow-600 border-yellow-600/20" },
                { icon: Wine, label: t("landing.ai.text"), color: "bg-amber-600/10 text-amber-600 border-amber-600/20" },
              ].map((item, i) => (
                <div key={i} className={`${item.color} border rounded-xl p-6 flex flex-col items-center gap-3 text-center`}>
                  <item.icon className="w-8 h-8" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
            className="space-y-6"
          >
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-primary">
              {t("landing.cta.title")}
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              {t("landing.cta.desc")}
            </p>
            <Button size="lg" onClick={() => navigate("/app")} className="font-serif text-base gap-2 px-10 py-6" data-testid="landing-cta-bottom">
              {t("landing.cta.button")}
              <ArrowRight className="w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-amber-800/15 bg-amber-900/5 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Wine className="w-5 h-5 text-primary" />
              <span className="font-serif font-bold text-primary">CaskSense</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <button onClick={() => navigate("/about")} className="hover:text-primary transition-colors">{t("landing.footer.about")}</button>
              <button onClick={() => navigate("/features")} className="hover:text-primary transition-colors">{t("landing.footer.features")}</button>
              <button onClick={() => navigate("/app")} className="hover:text-primary transition-colors">{t("landing.footer.app")}</button>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} CaskSense
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

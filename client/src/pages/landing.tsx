import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { platformStatsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/images/hero-whisky.png";
import {
  Glasses, BookOpen, Users, BarChart3, Brain, Camera,
  FileUp, Globe, ArrowRight, Wine, Star, Sparkles,
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
    { icon: Glasses, titleKey: "landing.features.blindTasting", descKey: "landing.features.blindTastingDesc", color: "text-amber-500 bg-amber-500/10" },
    { icon: Brain, titleKey: "landing.features.aiImport", descKey: "landing.features.aiImportDesc", color: "text-violet-500 bg-violet-500/10" },
    { icon: BookOpen, titleKey: "landing.features.journal", descKey: "landing.features.journalDesc", color: "text-emerald-500 bg-emerald-500/10" },
    { icon: BarChart3, titleKey: "landing.features.analytics", descKey: "landing.features.analyticsDesc", color: "text-blue-500 bg-blue-500/10" },
    { icon: Users, titleKey: "landing.features.community", descKey: "landing.features.communityDesc", color: "text-rose-500 bg-rose-500/10" },
    { icon: Globe, titleKey: "landing.features.encyclopedia", descKey: "landing.features.encyclopediaDesc", color: "text-teal-500 bg-teal-500/10" },
  ];

  const steps = [
    { icon: FileUp, titleKey: "landing.steps.create", descKey: "landing.steps.createDesc", num: "01" },
    { icon: Users, titleKey: "landing.steps.invite", descKey: "landing.steps.inviteDesc", num: "02" },
    { icon: Wine, titleKey: "landing.steps.taste", descKey: "landing.steps.tasteDesc", num: "03" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Sticky Nav Bar */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2.5" data-testid="landing-logo">
            <Wine className="w-6 h-6 text-primary" />
            <span className="font-serif font-black text-xl text-primary tracking-tight">CaskSense</span>
          </button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/app")} className="font-serif text-sm" data-testid="landing-nav-explore">
              {t("landing.nav.explore")}
            </Button>
            <Button size="sm" onClick={() => navigate("/app")} className="font-serif text-sm" data-testid="landing-nav-start">
              {t("landing.nav.getStarted")}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-amber-500/5" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 lg:py-32 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium">
                <Sparkles className="w-4 h-4" />
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
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 border border-border/30">
                <img src={heroImage} alt="CaskSense" className="w-full h-auto object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
              </div>
              <div className="absolute -bottom-4 -left-4 bg-card border border-border/50 rounded-xl p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Star className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-primary">4.8 / 5</div>
                    <div className="text-xs text-muted-foreground">{t("landing.hero.avgRating")}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Live Stats */}
      {stats && (stats.totalTastings > 0 || stats.totalParticipants > 0) && (
        <section className="border-y border-border/40 bg-secondary/20">
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
                className="bg-card border border-border/50 rounded-xl p-6 hover:shadow-md hover:border-primary/20 transition-all group"
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
      <section className="py-20 sm:py-28 bg-secondary/10 border-y border-border/30">
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
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />
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
                <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mx-auto mb-5 relative z-10 bg-background">
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
            className="text-center mb-10"
          >
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-primary mb-4">{t("landing.story.title")}</h2>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            variants={fadeUp}
            className="bg-card border border-border/50 rounded-2xl p-8 sm:p-12 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-500/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative space-y-5">
              <div className="flex items-center gap-3 mb-6">
                <Heart className="w-6 h-6 text-primary" />
                <span className="text-sm font-medium text-primary uppercase tracking-widest">{t("landing.story.label")}</span>
              </div>
              <p className="text-muted-foreground leading-relaxed text-base sm:text-lg">
                {t("landing.story.p1")}
              </p>
              <p className="text-muted-foreground leading-relaxed text-base sm:text-lg">
                {t("landing.story.p2")}
              </p>
              <p className="text-muted-foreground leading-relaxed text-base sm:text-lg">
                {t("landing.story.p3")}
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* AI Highlight */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-violet-500/5 via-transparent to-primary/5 border-y border-border/30">
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
              <div className="inline-flex items-center gap-2 bg-violet-500/10 text-violet-600 rounded-full px-4 py-1.5 text-sm font-medium">
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
                    <Sparkles className="w-4 h-4 text-violet-500 mt-1 shrink-0" />
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
                { icon: FileUp, label: t("landing.ai.file"), color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
                { icon: Globe, label: t("landing.ai.web"), color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
                { icon: Wine, label: t("landing.ai.text"), color: "bg-rose-500/10 text-rose-500 border-rose-500/20" },
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
      <footer className="border-t border-border/40 bg-secondary/10 py-10">
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

import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { platformStatsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoginDialog } from "@/components/login-dialog";
import heroImage from "@/assets/images/hero-whisky.png";
import christophImage from "@assets/22A3ABF8-0085-4C82-97DF-EAA0ACD46B4E_1771546683886.jpeg";
import slideBlind from "@/assets/tour/slide-blind.png";
import slideAnalytics from "@/assets/tour/slide-analytics.png";
import slideFlightboard from "@/assets/tour/slide-flightboard.png";
import { LanguageToggle } from "@/components/language-toggle";
import {
  ArrowRight, Wine, Heart,
  Presentation, Play,
  Zap, Layers, ClipboardList, Users, BarChart3, FlaskConical, Sparkles
} from "lucide-react";

const tourPreviewSlides = [slideBlind, slideFlightboard, slideAnalytics];

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
  const [tastingCode, setTastingCode] = useState("");
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: platformStatsApi.get,
    staleTime: 60_000,
  });


  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Sticky Nav with Login */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2.5" data-testid="landing-logo">
            <Wine className="w-6 h-6 text-primary" />
            <span className="font-serif font-black text-xl text-primary tracking-tight">CaskSense</span>
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageToggle />
            <Button variant="outline" size="sm" onClick={() => navigate("/tour")} className="font-serif text-xs sm:text-sm gap-1.5 border-amber-500/40 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700" data-testid="landing-nav-tour">
              <Presentation className="w-3.5 h-3.5" />
              {t("landing.nav.featureTour")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => document.getElementById("overview")?.scrollIntoView({ behavior: "smooth" })} className="font-serif text-sm hidden sm:inline-flex" data-testid="landing-nav-explore">
              {t("landing.nav.explore")}
            </Button>
            <Button size="sm" onClick={() => navigate("/app")} className="font-serif text-sm gap-1.5" data-testid="landing-nav-login">
              {t("landing.nav.login")}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/10 via-transparent to-orange-900/5" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 lg:py-16 relative">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="space-y-4"
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
              <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/60 dark:from-amber-950/20 dark:to-orange-950/10 rounded-xl border-2 border-amber-400/30 p-5 shadow-md max-w-md">
                <p className="text-base font-serif font-bold text-primary mb-1 flex items-center gap-2">
                  <Wine className="w-5 h-5 text-amber-600" />
                  {t("landing.quickJoin.label")}
                </p>
                <p className="text-sm text-muted-foreground mb-3">{t("landing.quickJoin.sublabel")}</p>
                <div className="flex gap-2">
                  <Input
                    value={tastingCode}
                    onChange={(e) => setTastingCode(e.target.value.toUpperCase())}
                    placeholder={t("landing.quickJoin.placeholder")}
                    className="font-mono text-base tracking-widest h-11 uppercase bg-white/90 dark:bg-background/80 border-amber-300/50 focus:border-amber-500"
                    onKeyDown={(e) => e.key === "Enter" && tastingCode.trim() && navigate(`/naked/${tastingCode.trim()}`)}
                    data-testid="input-quick-join-code"
                  />
                  <Button
                    size="lg"
                    onClick={() => tastingCode.trim() && navigate(`/naked/${tastingCode.trim()}`)}
                    disabled={!tastingCode.trim()}
                    className="font-serif gap-1.5 px-6 shrink-0 h-11"
                    data-testid="button-quick-join-go"
                  >
                    {t("landing.quickJoin.go")}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground/60 mt-2">{t("landing.quickJoin.hint")}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {t("landing.quickJoin.fullAccess")}{" "}
                  <button onClick={() => document.getElementById("your-pace")?.scrollIntoView({ behavior: "smooth" })} className="text-primary font-semibold hover:underline underline-offset-2 transition-colors" data-testid="link-no-code-signin">
                    {t("landing.quickJoin.noCodeLink")} ↓
                  </button>
                </p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="relative hidden md:block"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-amber-900/20 border border-amber-800/20">
                <img src={heroImage} alt="CaskSense" className="w-full h-auto object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Tour Teaser — compact 2-column */}
      <section className="py-8 sm:py-10 bg-gradient-to-br from-amber-900/10 via-amber-800/5 to-orange-900/8 border-y border-amber-700/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
            className="grid md:grid-cols-2 gap-6 items-center"
          >
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-500 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest">
                <Presentation className="w-3.5 h-3.5" />
                {t("landing.tourBanner.badge")}
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-black text-primary leading-tight">
                {t("landing.tourBanner.title")}
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                {t("landing.tourBanner.desc")}
              </p>
              <div className="flex items-center gap-3 pt-1">
                <Button
                  size="sm"
                  onClick={() => navigate("/tour")}
                  className="font-serif text-sm gap-2 px-5 bg-amber-600 hover:bg-amber-700 text-white shadow-md"
                  data-testid="landing-tour-cta"
                >
                  <Play className="w-4 h-4" />
                  {t("landing.tourBanner.cta")}
                </Button>
                <span className="text-xs text-muted-foreground/50">{t("landing.tourBanner.hint")}</span>
              </div>
            </div>
            <div className="flex justify-center gap-2 sm:gap-3">
              {tourPreviewSlides.map((src, i) => (
                <motion.button
                  key={i}
                  onClick={() => navigate("/tour")}
                  className="relative rounded-lg overflow-hidden border border-amber-500/20 hover:border-amber-500/50 shadow-md hover:shadow-lg transition-all group cursor-pointer flex-shrink-0"
                  style={{ width: i === 1 ? "180px" : "120px", height: i === 1 ? "110px" : "80px" }}
                  whileHover={{ scale: 1.05, y: -3 }}
                  data-testid={`tour-preview-${i}`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent group-hover:from-background/20 transition-all" />
                  {i === 1 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-9 h-9 rounded-full bg-amber-600/90 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 text-white ml-0.5" />
                      </div>
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Two Ways: Naked vs Full */}
      <section id="your-pace" className="py-10 sm:py-14 bg-gradient-to-b from-background via-amber-900/5 to-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
            className="text-center mb-10"
          >
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-primary mb-4">{t("landing.roles.title")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t("landing.roles.subtitle")}</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Naked Tasting Card */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0}
              variants={fadeUp}
              className="bg-card border-2 border-emerald-500/40 hover:border-emerald-500/60 rounded-xl p-6 sm:p-8 transition-all group relative overflow-hidden flex flex-col"
              data-testid="landing-mode-naked"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl -translate-y-12 translate-x-12 opacity-60" />
              <div className="relative flex flex-col flex-1">
                <div className="w-14 h-14 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Wine className="w-7 h-7" />
                </div>
                <h3 className="font-serif font-black text-primary text-xl sm:text-2xl mb-1">{t("landing.roles.naked.name")}</h3>
                <p className="text-emerald-700/80 dark:text-emerald-400/80 font-medium text-sm mb-3">{t("landing.roles.naked.tagline")}</p>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">{t("landing.roles.naked.desc")}</p>
                <div className="flex gap-2 mb-4 max-w-sm">
                  <Input
                    value={tastingCode}
                    onChange={(e) => setTastingCode(e.target.value.toUpperCase())}
                    placeholder={t("landing.quickJoin.placeholder")}
                    className="font-mono text-sm tracking-widest h-10 uppercase bg-white/90 dark:bg-background/80 border-emerald-300/50 focus:border-emerald-500"
                    onKeyDown={(e) => e.key === "Enter" && tastingCode.trim() && navigate(`/naked/${tastingCode.trim()}`)}
                    data-testid="input-naked-code"
                  />
                  <Button
                    size="sm"
                    className="text-sm gap-1.5 h-10 font-serif bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 px-5"
                    onClick={() => tastingCode.trim() && navigate(`/naked/${tastingCode.trim()}`)}
                    disabled={!tastingCode.trim()}
                    data-testid="button-naked-go"
                  >
                    {t("landing.roles.naked.cta")}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-auto">
                  {(t("landing.roles.naked.features") as string).split(", ").map((feat) => (
                    <span key={feat} className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-foreground/70 font-medium">
                      {feat}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Full Experience Card */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={1}
              variants={fadeUp}
              className="bg-card border-2 border-amber-500/30 hover:border-amber-500/50 rounded-xl p-6 sm:p-8 transition-all group relative overflow-hidden flex flex-col"
              data-testid="landing-mode-full"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl -translate-y-12 translate-x-12 opacity-60" />
              <div className="relative flex flex-col flex-1">
                <div className="w-14 h-14 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="font-serif font-black text-primary text-xl sm:text-2xl mb-1">{t("landing.roles.full.name")}</h3>
                <p className="text-amber-700/80 dark:text-amber-400/80 font-medium text-sm mb-3">{t("landing.roles.full.tagline")}</p>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">{t("landing.roles.full.desc")}</p>
                <Button
                  size="lg"
                  className="gap-2 font-serif bg-amber-600 hover:bg-amber-700 text-white mb-4 w-fit"
                  onClick={() => setShowLoginDialog(true)}
                  data-testid="button-full-signin"
                >
                  {t("landing.roles.full.cta")}
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <div className="flex flex-wrap gap-1.5 mt-auto">
                  {(t("landing.roles.full.features") as string).split(", ").map((feat) => (
                    <span key={feat} className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/10 text-foreground/70 font-medium">
                      {feat}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Switch hint */}
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={2}
            variants={fadeUp}
            className="text-center text-sm text-muted-foreground/60 mt-6 font-medium"
          >
            {t("landing.roles.switchHint")}
          </motion.p>
        </div>
      </section>

      <LoginDialog open={showLoginDialog} onClose={() => setShowLoginDialog(false)} />

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



      {/* CaskSense Overview */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-amber-50/30 to-background" id="overview">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
            className="text-center mb-14"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-medium text-amber-500 uppercase tracking-widest">{t("landing.overview.label")}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-primary">{t("landing.overview.title")}</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {([
              { key: "justTasting", icon: Zap, color: "text-emerald-600 bg-emerald-500/12", border: "border-emerald-500/25" },
              { key: "levels", icon: Layers, color: "text-blue-600 bg-blue-500/12", border: "border-blue-500/25" },
              { key: "hosting", icon: ClipboardList, color: "text-amber-600 bg-amber-500/12", border: "border-amber-500/25" },
              { key: "tasting", icon: Users, color: "text-orange-600 bg-orange-500/12", border: "border-orange-500/25" },
              { key: "reveal", icon: BarChart3, color: "text-purple-600 bg-purple-500/12", border: "border-purple-500/25" },
              { key: "science", icon: FlaskConical, color: "text-rose-600 bg-rose-500/12", border: "border-rose-500/25" },
            ] as const).map((tile, i) => (
              <motion.div
                key={tile.key}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className={`bg-card border ${tile.border} rounded-xl p-5 transition-all hover:shadow-md group`}
                data-testid={`overview-tile-${tile.key}`}
              >
                <div className={`w-11 h-11 rounded-lg ${tile.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <tile.icon className="w-5 h-5" />
                </div>
                <h3 className="font-serif font-bold text-primary text-base mb-1.5">{t(`landing.overview.${tile.key}`)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`landing.overview.${tile.key}Desc`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Origin Story */}
      <section className="py-20 sm:py-28" id="story">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
            className="text-center mb-14"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Heart className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-medium text-amber-500 uppercase tracking-widest">{t("landing.story.label")}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-primary">{t("landing.story.title")}</h2>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-10 lg:gap-12 items-start mb-14">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0}
              variants={fadeUp}
              className="lg:col-span-1 lg:sticky lg:top-24 space-y-3"
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
              className="lg:col-span-2 space-y-6"
            >
              <p className="text-muted-foreground leading-relaxed text-base lg:text-lg">
                {t("landing.story.p1")}
              </p>
              <p className="text-muted-foreground leading-relaxed text-base lg:text-lg">
                {t("landing.story.p2")}
              </p>
              <p className="text-muted-foreground leading-relaxed text-base lg:text-lg">
                {t("landing.story.p3")}
              </p>
              <blockquote className="border-l-3 border-amber-500/60 pl-5 py-2 my-6">
                <p className="text-primary font-serif text-lg lg:text-xl italic leading-relaxed">
                  {t("landing.story.quote1")}
                </p>
                <p className="text-primary font-serif text-lg lg:text-xl italic leading-relaxed">
                  {t("landing.story.quote1b")}
                </p>
                <p className="text-primary font-serif text-lg lg:text-xl italic leading-relaxed">
                  {t("landing.story.quote1c")}
                </p>
              </blockquote>
              <p className="text-muted-foreground leading-relaxed text-base lg:text-lg">
                {t("landing.story.p4")}
              </p>
              <blockquote className="border-l-3 border-amber-500/60 pl-5 py-2 my-6">
                <p className="text-primary font-serif text-lg lg:text-xl italic leading-relaxed">
                  {t("landing.story.quote2")}
                </p>
                <p className="text-primary font-serif text-lg lg:text-xl italic leading-relaxed">
                  {t("landing.story.quote2b")}
                </p>
              </blockquote>
              <p className="text-muted-foreground leading-relaxed text-base lg:text-lg">
                {t("landing.story.p5")}
              </p>
            </motion.div>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={2}
            variants={fadeUp}
            className="text-center space-y-4 pt-6"
          >
            <p className="text-muted-foreground text-base lg:text-lg">
              {t("landing.story.p6")}
            </p>
            <p className="text-2xl sm:text-3xl font-serif font-black text-primary">
              {t("landing.story.closingLine1")}
            </p>
            <p className="text-muted-foreground/70 text-base sm:text-lg italic max-w-lg mx-auto pt-4">
              {t("landing.story.closingLine2")}
            </p>
          </motion.div>
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
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-muted-foreground">
              <button onClick={() => navigate("/impressum")} className="hover:text-primary transition-colors" data-testid="link-footer-impressum">{t("legal.impressum.title")}</button>
              <a href="mailto:christoph.aldering@googlemail.com" className="hover:text-primary transition-colors" data-testid="link-footer-contact">{t("landing.footer.contact")}</a>
              <button onClick={() => navigate("/privacy")} className="hover:text-primary transition-colors" data-testid="link-footer-privacy">{t("legal.privacy.title")}</button>
              <span className="inline-flex items-center justify-center w-[20px] h-[20px] rounded-full border border-muted-foreground/30 text-[9px] font-bold text-muted-foreground/50" data-testid="text-age-notice-landing">18+</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-amber-800/10 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground/50 italic">{t("landing.footer.hobbyNotice")}</p>
            <p className="text-xs text-muted-foreground/50">
              &copy; {new Date().getFullYear()} CaskSense
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground/40 text-center mt-3" data-testid="text-ai-footnote">
            {t("landing.footer.aiFootnote")}
          </p>
        </div>
      </footer>

    </div>
  );
}

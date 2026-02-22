import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { platformStatsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import heroImage from "@/assets/images/hero-whisky.png";
import christophImage from "@assets/22A3ABF8-0085-4C82-97DF-EAA0ACD46B4E_1771546683886.jpeg";
import slideBlind from "@/assets/tour/slide-blind.png";
import slideAnalytics from "@/assets/tour/slide-analytics.png";
import slideFlightboard from "@/assets/tour/slide-flightboard.png";
import { LanguageToggle } from "@/components/language-toggle";
import {
  Brain, ArrowRight, Wine,
  ChevronDown, Heart,
  Presentation, Play, Star, Search, Beaker, CheckCircle2
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
  const { setPreviewExperienceLevel } = useAppStore();
  const [tastingCode, setTastingCode] = useState("");

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
            <Button variant="ghost" size="sm" onClick={() => document.getElementById("story")?.scrollIntoView({ behavior: "smooth" })} className="font-serif text-sm hidden sm:inline-flex" data-testid="landing-nav-explore">
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
                    onKeyDown={(e) => e.key === "Enter" && tastingCode.trim() && navigate(`/join/${tastingCode.trim()}`)}
                    data-testid="input-quick-join-code"
                  />
                  <Button
                    size="lg"
                    onClick={() => tastingCode.trim() && navigate(`/join/${tastingCode.trim()}`)}
                    disabled={!tastingCode.trim()}
                    className="font-serif gap-1.5 px-6 shrink-0 h-11"
                    data-testid="button-quick-join-go"
                  >
                    {t("landing.quickJoin.go")}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground/60 mt-2">{t("landing.quickJoin.hint")}</p>
                <p className="text-xs text-muted-foreground/70 mt-2">
                  {t("landing.quickJoin.noCode")}{" "}
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

      {/* Experience Levels */}
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
          {/* Just Tasting — full-width hero card */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
            className="bg-card border-2 border-emerald-500/40 hover:border-emerald-500/60 rounded-xl p-6 sm:p-8 transition-all group relative overflow-hidden cursor-pointer mb-6"
            data-testid="landing-role-guest"
            onClick={() => { setPreviewExperienceLevel("guest"); navigate("/app"); }}
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl -translate-y-12 translate-x-12 opacity-60" />
            <div className="relative flex flex-col sm:flex-row sm:items-start gap-5">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Wine className="w-7 h-7" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-serif font-black text-primary text-xl sm:text-2xl mb-1">{t("landing.roles.guest.name")}</h3>
                <Button
                  size="sm"
                  className="text-xs gap-1.5 h-8 font-serif bg-emerald-600 hover:bg-emerald-700 text-white mb-3"
                  onClick={(e) => { e.stopPropagation(); setPreviewExperienceLevel("guest"); navigate("/app"); }}
                  data-testid="button-try-view-guest"
                >
                  {t("landing.roles.tryGuest")}
                  <ArrowRight className="w-3 h-3" />
                </Button>
                <p className="text-emerald-700/80 dark:text-emerald-400/80 font-medium text-sm mb-2">{t("landing.roles.guest.tagline")}</p>
                <p className="text-muted-foreground text-sm leading-relaxed mb-3">{t("landing.roles.guest.desc")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(t("landing.roles.guest.features") as string).split(", ").map((feat) => (
                    <span key={feat} className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-foreground/70 font-medium">
                      {feat}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Separator — "Want more?" */}
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            variants={fadeUp}
            className="text-center text-sm text-muted-foreground/50 mb-6 font-medium"
          >
            {t("landing.roles.guest.name")} {String.fromCharCode(8594)} {t("landing.roles.analyst.name")} — {t("landing.roles.subtitle").split("—")[1]?.trim() || ""}
          </motion.p>

          {/* Explorer / Connoisseur / Analyst — three columns below */}
          <div className="grid sm:grid-cols-3 gap-5">
            {([
              { key: "explorer", icon: Search, color: "bg-blue-500/15 text-blue-600", borderColor: "border-blue-500/30 hover:border-blue-500/50", accent: "bg-blue-500/10", btnClass: "bg-blue-600 hover:bg-blue-700 text-white", ctaKey: "tryExplorer", anchor: "profile" },
              { key: "connoisseur", icon: Star, color: "bg-amber-500/15 text-amber-600", borderColor: "border-amber-500/30 hover:border-amber-500/50", accent: "bg-amber-500/10", btnClass: "bg-amber-600 hover:bg-amber-700 text-white", ctaKey: "tryConnoisseur", anchor: "dimensions" },
              { key: "analyst", icon: Beaker, color: "bg-purple-500/15 text-purple-600", borderColor: "border-purple-500/30 hover:border-purple-500/50", accent: "bg-purple-500/10", btnClass: "bg-purple-600 hover:bg-purple-700 text-white", ctaKey: "tryAnalyst", anchor: "science" },
            ] as const).map((role, i) => (
              <motion.div
                key={role.key}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i + 2}
                variants={fadeUp}
                className={`bg-card border ${role.borderColor} rounded-xl p-5 transition-all group relative overflow-hidden cursor-pointer flex flex-col`}
                data-testid={`landing-role-${role.key}`}
                onClick={() => { setPreviewExperienceLevel(role.key); navigate("/app"); }}
              >
                <div className={`absolute top-0 right-0 w-24 h-24 ${role.accent} rounded-full blur-2xl -translate-y-8 translate-x-8 opacity-60`} />
                <div className="relative flex flex-col flex-1">
                  <div className={`w-11 h-11 rounded-lg ${role.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <role.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif font-bold text-primary text-base mb-2">{t(`landing.roles.${role.key}.name`)}</h3>
                  <Button
                    size="sm"
                    className={`text-xs gap-1.5 h-7 font-serif ${role.btnClass} mb-3 w-fit`}
                    onClick={(e) => { e.stopPropagation(); setPreviewExperienceLevel(role.key); navigate("/app"); }}
                    data-testid={`button-try-view-${role.key}`}
                  >
                    {t(`landing.roles.${role.ctaKey}`)}
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-3">{t(`landing.roles.${role.key}.desc`)}</p>
                  <p className="text-[11px] text-muted-foreground/60 font-medium mb-1.5">{t(`landing.roles.${role.key}.plus`)}</p>
                  <div className="flex flex-wrap gap-1.5 mb-3 flex-1">
                    {(t(`landing.roles.${role.key}.features`) as string).split(", ").map((feat) => (
                      <span key={feat} className={`text-[11px] px-2 py-0.5 rounded-full ${role.accent} text-foreground/70 font-medium h-fit`}>
                        {feat}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/background#${role.anchor}`); }}
                    className="text-[11px] text-muted-foreground/60 hover:text-primary underline underline-offset-2 transition-colors mt-auto"
                    data-testid={`link-learn-more-${role.key}`}
                  >
                    {t("background.learnMore")} →
                  </button>
                </div>
              </motion.div>
            ))}
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
              <blockquote className="border-l-3 border-amber-500/60 pl-5 py-2 my-6">
                <p className="text-primary font-serif text-lg lg:text-xl italic leading-relaxed">
                  {t("landing.story.quote1")}
                </p>
              </blockquote>
              <p className="text-muted-foreground leading-relaxed text-base lg:text-lg">
                {t("landing.story.p3")}
              </p>
              <p className="text-muted-foreground leading-relaxed text-base lg:text-lg">
                {t("landing.story.p4")}
              </p>
              <blockquote className="border-l-3 border-amber-500/60 pl-5 py-2 my-6">
                <p className="text-primary font-serif text-lg lg:text-xl italic leading-relaxed">
                  {t("landing.story.quote2")}
                </p>
              </blockquote>
              <p className="text-muted-foreground leading-relaxed text-base lg:text-lg">
                {t("landing.story.p5")}
              </p>
              <p className="text-muted-foreground leading-relaxed text-base lg:text-lg">
                {t("landing.story.p6")}
              </p>
            </motion.div>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={2}
            variants={fadeUp}
            className="text-center space-y-8"
          >
            <p className="text-muted-foreground text-base lg:text-lg">
              {t("landing.story.p7")}
            </p>
            <div className="flex flex-col items-center gap-3 py-6">
              <span className="text-2xl sm:text-3xl font-serif font-black text-primary">{t("landing.story.joy1")}</span>
              <span className="text-2xl sm:text-3xl font-serif font-black text-amber-500">{t("landing.story.joy2")}</span>
              <span className="text-2xl sm:text-3xl font-serif font-black text-orange-500">{t("landing.story.joy3")}</span>
            </div>
            <p className="text-muted-foreground/70 text-sm sm:text-base italic max-w-lg mx-auto">
              {t("landing.story.closing")}
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
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-amber-800/10 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground/50 italic">{t("landing.footer.hobbyNotice")}</p>
            <p className="text-xs text-muted-foreground/50">
              &copy; {new Date().getFullYear()} CaskSense
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}

import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Wine, NotebookPen, Trophy, Activity, CircleDot, Sparkles, GitCompareArrows,
  FileText, Download, Puzzle, Users, Rss, Medal, Calendar, LayoutDashboard,
  ClipboardList, Database, Brain, Library, Landmark, Map, BookOpen, Heart,
  Eye, EyeOff, MessageSquare, Lightbulb, QrCode, Volume2,
  Sun, Globe, Smartphone, Camera, Star, Archive, Bell,
  ChevronLeft, ChevronRight, ArrowLeft, FileDown, Play, Pause
} from "lucide-react";
import { cn } from "@/lib/utils";

type SlideData = {
  type: "cover" | "group" | "feature" | "end";
  groupKey?: string;
  icon?: any;
  titleKey?: string;
  descKey?: string;
  color?: string;
  gradient?: string;
};

function buildSlides(): SlideData[] {
  const groups: { groupKey: string; gradient: string; features: { icon: any; titleKey: string; descKey: string; color: string }[] }[] = [
    {
      groupKey: "tasting",
      gradient: "from-amber-600/20 to-orange-600/10",
      features: [
        { icon: Wine, titleKey: "tastingSessions", descKey: "tastingSessionsDesc", color: "text-amber-600" },
        { icon: Eye, titleKey: "blindTasting", descKey: "blindTastingDesc", color: "text-violet-600" },
        { icon: EyeOff, titleKey: "revealPhase", descKey: "revealPhaseDesc", color: "text-purple-600" },
        { icon: MessageSquare, titleKey: "discussion", descKey: "discussionDesc", color: "text-sky-600" },
        { icon: Lightbulb, titleKey: "noteGenerator", descKey: "noteGeneratorDesc", color: "text-yellow-600" },
        { icon: QrCode, titleKey: "qrInvites", descKey: "qrInvitesDesc", color: "text-teal-600" },
        { icon: Camera, titleKey: "photoTasting", descKey: "photoTastingDesc", color: "text-amber-600" },
      ],
    },
    {
      groupKey: "personal",
      gradient: "from-emerald-600/20 to-teal-600/10",
      features: [
        { icon: NotebookPen, titleKey: "journal", descKey: "journalDesc", color: "text-emerald-600" },
        { icon: Activity, titleKey: "flavorProfile", descKey: "flavorProfileDesc", color: "text-rose-600" },
        { icon: CircleDot, titleKey: "flavorWheel", descKey: "flavorWheelDesc", color: "text-orange-600" },
        { icon: Trophy, titleKey: "badges", descKey: "badgesDesc", color: "text-amber-600" },
        { icon: FileText, titleKey: "templates", descKey: "templatesDesc", color: "text-slate-600" },
        { icon: Download, titleKey: "exportNotes", descKey: "exportNotesDesc", color: "text-blue-600" },
        { icon: Star, titleKey: "wishlist", descKey: "wishlistDesc", color: "text-yellow-600" },
        { icon: Archive, titleKey: "collection", descKey: "collectionDesc", color: "text-teal-600" },
      ],
    },
    {
      groupKey: "discovery",
      gradient: "from-pink-600/20 to-indigo-600/10",
      features: [
        { icon: Sparkles, titleKey: "recommendations", descKey: "recommendationsDesc", color: "text-pink-600" },
        { icon: GitCompareArrows, titleKey: "comparison", descKey: "comparisonDesc", color: "text-indigo-600" },
        { icon: Puzzle, titleKey: "pairings", descKey: "pairingsDesc", color: "text-lime-600" },
        { icon: Brain, titleKey: "benchmark", descKey: "benchmarkDesc", color: "text-cyan-600" },
      ],
    },
    {
      groupKey: "community",
      gradient: "from-blue-600/20 to-green-600/10",
      features: [
        { icon: Users, titleKey: "friends", descKey: "friendsDesc", color: "text-blue-600" },
        { icon: Rss, titleKey: "activityFeed", descKey: "activityFeedDesc", color: "text-green-600" },
        { icon: Medal, titleKey: "leaderboard", descKey: "leaderboardDesc", color: "text-yellow-600" },
        { icon: Calendar, titleKey: "calendar", descKey: "calendarDesc", color: "text-red-600" },
        { icon: Bell, titleKey: "remindersFeature", descKey: "remindersFeatureDesc", color: "text-violet-600" },
      ],
    },
    {
      groupKey: "hosting",
      gradient: "from-teal-600/20 to-fuchsia-600/10",
      features: [
        { icon: LayoutDashboard, titleKey: "hostDashboard", descKey: "hostDashboardDesc", color: "text-teal-600" },
        { icon: ClipboardList, titleKey: "recap", descKey: "recapDesc", color: "text-fuchsia-600" },
        { icon: Database, titleKey: "whiskyDatabase", descKey: "whiskyDatabaseDesc", color: "text-stone-600" },
      ],
    },
    {
      groupKey: "reference",
      gradient: "from-amber-700/20 to-emerald-700/10",
      features: [
        { icon: Library, titleKey: "lexicon", descKey: "lexiconDesc", color: "text-amber-700" },
        { icon: Landmark, titleKey: "distilleries", descKey: "distilleriesDesc", color: "text-emerald-700" },
        { icon: Map, titleKey: "distilleryMap", descKey: "distilleryMapDesc", color: "text-sky-700" },
        { icon: BookOpen, titleKey: "aboutMethod", descKey: "aboutMethodDesc", color: "text-violet-700" },
      ],
    },
    {
      groupKey: "extras",
      gradient: "from-orange-600/20 to-blue-600/10",
      features: [
        { icon: Volume2, titleKey: "soundscapes", descKey: "soundscapesDesc", color: "text-teal-600" },
        { icon: Sun, titleKey: "themes", descKey: "themesDesc", color: "text-orange-600" },
        { icon: Globe, titleKey: "languages", descKey: "languagesDesc", color: "text-blue-600" },
        { icon: Smartphone, titleKey: "pwa", descKey: "pwaDesc", color: "text-green-600" },
      ],
    },
  ];

  const slides: SlideData[] = [{ type: "cover" }];

  for (const group of groups) {
    slides.push({ type: "group", groupKey: group.groupKey, gradient: group.gradient });
    for (const f of group.features) {
      slides.push({
        type: "feature",
        groupKey: group.groupKey,
        icon: f.icon,
        titleKey: f.titleKey,
        descKey: f.descKey,
        color: f.color,
        gradient: group.gradient,
      });
    }
  }

  slides.push({ type: "end" });
  return slides;
}

const allSlides = buildSlides();

export default function FeatureTour() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [current, setCurrent] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const total = allSlides.length;
  const slide = allSlides[current];

  const next = useCallback(() => setCurrent((c) => Math.min(c + 1, total - 1)), [total]);
  const prev = useCallback(() => setCurrent((c) => Math.max(c - 1, 0)), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      if (e.key === "Escape") navigate("/");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, navigate]);

  useEffect(() => {
    if (!autoPlay) return;
    const id = setInterval(() => {
      setCurrent((c) => {
        if (c >= total - 1) { setAutoPlay(false); return c; }
        return c + 1;
      });
    }, 5000);
    return () => clearInterval(id);
  }, [autoPlay, total]);

  const handleDownloadPdf = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const slides = allSlides;
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>CaskSense Feature Tour</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@400;500;600&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Inter', sans-serif; color: #1a1a1a; background: #fff; }
      .page { page-break-after: always; padding: 60px; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; }
      .page:last-child { page-break-after: avoid; }
      h1 { font-family: 'Playfair Display', serif; font-size: 48px; color: #78350f; margin-bottom: 16px; }
      h2 { font-family: 'Playfair Display', serif; font-size: 36px; color: #78350f; margin-bottom: 12px; }
      h3 { font-family: 'Playfair Display', serif; font-size: 24px; color: #92400e; margin-bottom: 8px; }
      p { font-size: 16px; line-height: 1.7; color: #444; max-width: 600px; }
      .subtitle { font-size: 20px; color: #666; margin-bottom: 40px; }
      .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 24px; }
      .group-header { border-left: 4px solid #d97706; padding-left: 20px; margin-bottom: 20px; }
      .feature-card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; margin-bottom: 0; }
      .feature-num { font-family: 'Playfair Display', serif; font-size: 14px; color: #d97706; margin-bottom: 8px; }
      .footer { text-align: center; margin-top: 40px; font-size: 13px; color: #999; }
      .cover-center { text-align: center; }
      @media print { .page { min-height: auto; padding: 40px; } }
    </style></head><body>`;

    let featureNum = 0;
    for (const s of slides) {
      if (s.type === "cover") {
        html += `<div class="page cover-center">
          <div class="badge">Feature Tour</div>
          <h1>CaskSense</h1>
          <p class="subtitle" style="margin: 0 auto;">${t("featureTour.coverSubtitle")}</p>
        </div>`;
      } else if (s.type === "group") {
        html += `<div class="page">
          <div class="group-header">
            <div class="badge">${t("featureTour.category")}</div>
            <h2>${t(`features.group.${s.groupKey}`)}</h2>
          </div>
        </div>`;
      } else if (s.type === "feature") {
        featureNum++;
        html += `<div class="page">
          <div class="feature-card">
            <div class="feature-num">${String(featureNum).padStart(2, "0")}</div>
            <h3>${t(`features.item.${s.titleKey}`)}</h3>
            <p>${t(`features.desc.${s.descKey}`)}</p>
          </div>
        </div>`;
      } else if (s.type === "end") {
        html += `<div class="page cover-center">
          <h2>${t("featureTour.endTitle")}</h2>
          <p class="subtitle" style="margin: 0 auto;">${t("featureTour.endSubtitle")}</p>
          <div class="footer">&copy; ${new Date().getFullYear()} CaskSense</div>
        </div>`;
      }
    }

    html += `</body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const progress = ((current + 1) / total) * 100;

  let featureIndex = 0;
  for (let i = 0; i < current; i++) {
    if (allSlides[i].type === "feature") featureIndex++;
  }
  if (slide.type === "feature") featureIndex++;
  const totalFeatures = allSlides.filter((s) => s.type === "feature").length;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col" data-testid="feature-tour">
      <header className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-card/50 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="font-serif text-xs gap-1" data-testid="button-tour-back">
            <ArrowLeft className="w-4 h-4" />
            {t("featureTour.backToHome")}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground hidden sm:inline">
            {current + 1} / {total}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoPlay(!autoPlay)}
            className="text-xs gap-1"
            data-testid="button-tour-autoplay"
          >
            {autoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{autoPlay ? t("featureTour.pause") : t("featureTour.autoPlay")}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            className="text-xs gap-1 font-serif"
            data-testid="button-tour-pdf"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
        </div>
      </header>

      <div className="w-full h-0.5 bg-secondary/50 flex-shrink-0">
        <motion.div
          className="h-full bg-primary/70"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="flex-1 overflow-hidden relative" ref={printRef}>
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center p-4 sm:p-8"
          >
            {slide.type === "cover" && (
              <div className="text-center space-y-6 max-w-2xl">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                >
                  <Wine className="w-16 h-16 text-primary mx-auto mb-4" />
                </motion.div>
                <h1 className="text-4xl sm:text-6xl font-serif font-black text-primary tracking-tight" data-testid="text-tour-cover-title">
                  CaskSense
                </h1>
                <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
                  {t("featureTour.coverSubtitle")}
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground/60 pt-4">
                  <span className="font-mono">{totalFeatures} {t("featureTour.featuresCount")}</span>
                  <span>·</span>
                  <span className="font-mono">7 {t("featureTour.categoriesCount")}</span>
                </div>
                <p className="text-xs text-muted-foreground/40 pt-2">
                  {t("featureTour.navHint")}
                </p>
              </div>
            )}

            {slide.type === "group" && (
              <div className="text-center space-y-6 max-w-xl">
                <div className={cn("w-full h-1 rounded-full bg-gradient-to-r mx-auto max-w-xs", slide.gradient)} />
                <div className="inline-flex items-center gap-2 bg-primary/5 text-primary/60 rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-widest">
                  {t("featureTour.category")}
                </div>
                <h2 className="text-3xl sm:text-5xl font-serif font-black text-primary" data-testid="text-tour-group-title">
                  {t(`features.group.${slide.groupKey}`)}
                </h2>
                <div className={cn("w-full h-1 rounded-full bg-gradient-to-r mx-auto max-w-xs", slide.gradient)} />
              </div>
            )}

            {slide.type === "feature" && slide.icon && (
              <div className="max-w-2xl w-full space-y-6">
                <div className="flex items-center gap-3 text-xs text-muted-foreground/50 font-mono uppercase tracking-widest">
                  <span>{t(`features.group.${slide.groupKey}`)}</span>
                  <span>·</span>
                  <span>{featureIndex} / {totalFeatures}</span>
                </div>
                <div className="flex items-start gap-5">
                  <div className={cn("w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center flex-shrink-0", slide.color)}>
                    <slide.icon className="w-8 h-8" />
                  </div>
                  <div className="space-y-3 min-w-0">
                    <h3 className="text-2xl sm:text-3xl font-serif font-black text-primary leading-tight" data-testid="text-tour-feature-title">
                      {t(`features.item.${slide.titleKey}`)}
                    </h3>
                    <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                      {t(`features.desc.${slide.descKey}`)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {slide.type === "end" && (
              <div className="text-center space-y-6 max-w-xl">
                <Wine className="w-12 h-12 text-primary mx-auto" />
                <h2 className="text-3xl sm:text-5xl font-serif font-black text-primary" data-testid="text-tour-end-title">
                  {t("featureTour.endTitle")}
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {t("featureTour.endSubtitle")}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                  <Button onClick={() => navigate("/tasting")} className="font-serif gap-2" data-testid="button-tour-start">
                    {t("featureTour.startNow")}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" onClick={handleDownloadPdf} className="font-serif gap-2" data-testid="button-tour-download-pdf">
                    <FileDown className="w-4 h-4" />
                    {t("featureTour.downloadPdf")}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <button
          onClick={prev}
          disabled={current === 0}
          className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-card/80 border border-border/40 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-all disabled:opacity-20 disabled:cursor-not-allowed backdrop-blur-sm"
          data-testid="button-tour-prev"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={next}
          disabled={current === total - 1}
          className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-card/80 border border-border/40 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-all disabled:opacity-20 disabled:cursor-not-allowed backdrop-blur-sm"
          data-testid="button-tour-next"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <footer className="flex items-center justify-center gap-1 px-4 py-2 border-t border-border/20 flex-shrink-0">
        {allSlides.map((s, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={cn(
              "rounded-full transition-all",
              s.type === "group" || s.type === "cover" || s.type === "end"
                ? "w-3 h-3"
                : "w-1.5 h-1.5",
              i === current
                ? "bg-primary scale-125"
                : i < current
                  ? "bg-primary/30"
                  : "bg-border"
            )}
            data-testid={`tour-dot-${i}`}
          />
        ))}
      </footer>
    </div>
  );
}

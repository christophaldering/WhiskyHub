import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Wine, Eye, EyeOff, Camera, Brain, Users, BookOpen, LayoutDashboard,
  Smartphone, ChevronLeft, ChevronRight, ArrowLeft, FileDown, Play, Pause,
  List, X, Star, Sparkles, FileSpreadsheet, QrCode,
  Trophy, Rss, Calendar, Landmark, Map,
  MessageSquare, Volume2, Heart, Bell, Download, FileText,
  Shield, Layers, Search, BarChart3, HandHeart, GlassWater, Compass,
  FlaskConical, GraduationCap, TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

import slideCover from "@/assets/tour/slide-cover.png";
import slideTasting from "@/assets/tour/slide-tasting.png";
import slideBlind from "@/assets/tour/slide-blind.png";
import slideAi from "@/assets/tour/slide-ai.png";
import slideFlightboard from "@/assets/tour/slide-flightboard.png";
import slideAnalytics from "@/assets/tour/slide-analytics.png";
import slideCommunity from "@/assets/tour/slide-community.png";
import slideKnowledge from "@/assets/tour/slide-knowledge.png";
import slideHost from "@/assets/tour/slide-host.png";
import slideGuided from "@/assets/tour/slide-guided.png";
import slideMobile from "@/assets/tour/slide-mobile.png";
import slideCta from "@/assets/tour/slide-cta.png";

type FeatureItem = {
  icon: any;
  title: string;
  desc: string;
};

type SlideData = {
  type: "cover" | "content" | "cta";
  title: string;
  subtitle?: string;
  image: string;
  badge?: string;
  features?: FeatureItem[];
  layout?: "left" | "right" | "center";
};

function TOCPanel({ currentSlide, onSelect, onClose, slides, t }: { currentSlide: number; onSelect: (i: number) => void; onClose: () => void; slides: SlideData[]; t: (key: string) => string }) {
  return (
    <motion.div
      initial={{ x: -320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -320, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed left-0 top-0 bottom-0 w-80 bg-card/95 backdrop-blur-lg border-r border-border/30 z-[60] overflow-y-auto shadow-2xl"
    >
      <div className="flex items-center justify-between p-4 border-b border-border/20 sticky top-0 bg-card/95 backdrop-blur-lg">
        <h3 className="font-serif font-bold text-primary text-sm">{t("tourPage.tocLabel")}</h3>
        <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-accent/20 flex items-center justify-center" data-testid="button-toc-close">
          <X className="w-4 h-4" />
        </button>
      </div>
      <nav className="p-3 space-y-1">
        {slides.map((s, i) => (
          <button
            key={i}
            onClick={() => { onSelect(i); onClose(); }}
            className={cn(
              "w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm flex items-center gap-3",
              i === currentSlide
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
            )}
            data-testid={`toc-item-${i}`}
          >
            <span className="font-mono text-xs w-6 text-right opacity-50">{i + 1}</span>
            <span className="truncate">
              {s.type === "cover" ? t("tourPage.welcome") : s.type === "cta" ? t("tourPage.getStarted") : s.title}
            </span>
            {s.badge && s.type === "content" && (
              <span className="ml-auto text-[10px] bg-primary/5 text-primary/60 px-1.5 py-0.5 rounded-full whitespace-nowrap">{s.badge}</span>
            )}
          </button>
        ))}
      </nav>
    </motion.div>
  );
}

function SlideContent({ slide, direction, slides, t }: { slide: SlideData; direction: number; slides: SlideData[]; t: (key: string) => string }) {
  if (slide.type === "cover") {
    return (
      <div className="w-full h-full relative overflow-hidden">
        <img src={slide.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6 gap-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-widest mb-4">
              <Wine className="w-3.5 h-3.5" />
              {slide.badge}
            </div>
          </motion.div>
          <motion.h1
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-5xl sm:text-7xl lg:text-8xl font-serif font-black text-primary tracking-tight"
            data-testid="text-tour-cover-title"
          >
            {slide.title}
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed"
          >
            {slide.subtitle}
          </motion.p>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex items-center gap-2 text-sm text-muted-foreground/50 pt-4"
          >
            <span className="font-mono">{slides.filter(s => s.type === "content").length} {t("tourPage.topics")}</span>
            <span>·</span>
            <span className="font-mono">{slides.flatMap(s => s.features || []).length}+ {t("tourPage.functions")}</span>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="text-xs text-muted-foreground/30 pt-2"
          >
            {t("tourPage.navHint")}
          </motion.p>
        </div>
      </div>
    );
  }

  if (slide.type === "cta") {
    return (
      <div className="w-full h-full relative overflow-hidden">
        <img src={slide.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6 gap-6">
          <Wine className="w-12 h-12 text-primary" />
          <h2 className="text-3xl sm:text-5xl font-serif font-black text-primary" data-testid="text-tour-cta-title">
            {slide.title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
            {slide.subtitle}
          </p>
        </div>
      </div>
    );
  }

  const isRight = slide.layout === "right";

  return (
    <div className="w-full h-full flex flex-col lg:flex-row overflow-hidden">
      <div className={cn(
        "lg:w-1/2 flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-6 lg:py-0 overflow-y-auto",
        isRight ? "lg:order-1" : "lg:order-2"
      )}>
        <motion.div
          initial={{ opacity: 0, x: isRight ? -30 : 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="space-y-4 max-w-lg mx-auto lg:mx-0"
        >
          {slide.badge && (
            <span className="inline-block bg-primary/10 text-primary rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest">
              {slide.badge}
            </span>
          )}
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black text-primary leading-tight" data-testid="text-tour-slide-title">
            {slide.title}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {slide.subtitle}
          </p>
          {slide.features && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
              {slide.features.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.06, duration: 0.4 }}
                  className="flex items-start gap-3 bg-card/60 border border-border/20 rounded-xl px-4 py-3.5"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <f.icon className="w-5 h-5 text-primary/80" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight">{f.title}</p>
                    <p className="text-xs text-muted-foreground leading-snug mt-1">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <div className={cn(
        "lg:w-1/2 relative flex-shrink-0 h-48 sm:h-64 lg:h-full",
        isRight ? "lg:order-2" : "lg:order-1"
      )}>
        <motion.div
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="absolute inset-0"
        >
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover"
          />
          <div className={cn(
            "absolute inset-0",
            isRight
              ? "bg-gradient-to-l from-transparent via-transparent to-background/60"
              : "bg-gradient-to-r from-transparent via-transparent to-background/60"
          )} />
          <div className="absolute inset-0 bg-gradient-to-t from-background/30 via-transparent to-transparent lg:hidden" />
        </motion.div>
      </div>
    </div>
  );
}

export default function Tour() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const isAdmin = currentParticipant?.role === "admin";
  const [current, setCurrent] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [showTOC, setShowTOC] = useState(false);
  const [direction, setDirection] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadingPptx, setDownloadingPptx] = useState(false);

  const slides: SlideData[] = [
    {
      type: "cover",
      title: t("tourPage.cover.title"),
      subtitle: t("tourPage.cover.subtitle"),
      image: slideCover,
      badge: t("tourPage.cover.badge"),
      layout: "center",
    },
    {
      type: "content",
      title: t("tourPage.tasting.title"),
      subtitle: t("tourPage.tasting.subtitle"),
      image: slideTasting,
      badge: t("tourPage.tasting.badge"),
      layout: "right",
      features: [
        { icon: Wine, title: t("tourPage.tasting.f1Title"), desc: t("tourPage.tasting.f1Desc") },
        { icon: QrCode, title: t("tourPage.tasting.f2Title"), desc: t("tourPage.tasting.f2Desc") },
        { icon: HandHeart, title: t("tourPage.tasting.f3Title"), desc: t("tourPage.tasting.f3Desc") },
        { icon: GlassWater, title: t("tourPage.tasting.f4Title"), desc: t("tourPage.tasting.f4Desc") },
      ],
    },
    {
      type: "content",
      title: t("tourPage.levels.title"),
      subtitle: t("tourPage.levels.subtitle"),
      image: slideCommunity,
      badge: t("tourPage.levels.badge"),
      layout: "left",
      features: [
        { icon: Wine, title: t("tourPage.levels.f1Title"), desc: t("tourPage.levels.f1Desc") },
        { icon: Compass, title: t("tourPage.levels.f2Title"), desc: t("tourPage.levels.f2Desc") },
        { icon: Star, title: t("tourPage.levels.f3Title"), desc: t("tourPage.levels.f3Desc") },
        { icon: BarChart3, title: t("tourPage.levels.f4Title"), desc: t("tourPage.levels.f4Desc") },
      ],
    },
    {
      type: "content",
      title: t("tourPage.sessions.title"),
      subtitle: t("tourPage.sessions.subtitle"),
      image: slideTasting,
      badge: t("tourPage.sessions.badge"),
      layout: "right",
      features: [
        { icon: Wine, title: t("tourPage.sessions.f1Title"), desc: t("tourPage.sessions.f1Desc") },
        { icon: QrCode, title: t("tourPage.sessions.f2Title"), desc: t("tourPage.sessions.f2Desc") },
        { icon: Star, title: t("tourPage.sessions.f3Title"), desc: t("tourPage.sessions.f3Desc") },
        { icon: MessageSquare, title: t("tourPage.sessions.f4Title"), desc: t("tourPage.sessions.f4Desc") },
      ],
    },
    {
      type: "content",
      title: t("tourPage.guided.title"),
      subtitle: t("tourPage.guided.subtitle"),
      image: slideGuided,
      badge: t("tourPage.guided.badge"),
      layout: "left",
      features: [
        { icon: LayoutDashboard, title: t("tourPage.guided.f1Title"), desc: t("tourPage.guided.f1Desc") },
        { icon: Eye, title: t("tourPage.guided.f2Title"), desc: t("tourPage.guided.f2Desc") },
        { icon: Sparkles, title: t("tourPage.guided.f3Title"), desc: t("tourPage.guided.f3Desc") },
        { icon: Star, title: t("tourPage.guided.f4Title"), desc: t("tourPage.guided.f4Desc") },
      ],
    },
    {
      type: "content",
      title: t("tourPage.flightboard.title"),
      subtitle: t("tourPage.flightboard.subtitle"),
      image: slideFlightboard,
      badge: t("tourPage.flightboard.badge"),
      layout: "right",
      features: [
        { icon: LayoutDashboard, title: t("tourPage.flightboard.f1Title"), desc: t("tourPage.flightboard.f1Desc") },
        { icon: Camera, title: t("tourPage.flightboard.f2Title"), desc: t("tourPage.flightboard.f2Desc") },
        { icon: FileDown, title: t("tourPage.flightboard.f3Title"), desc: t("tourPage.flightboard.f3Desc") },
        { icon: Sparkles, title: t("tourPage.flightboard.f4Title"), desc: t("tourPage.flightboard.f4Desc") },
      ],
    },
    {
      type: "content",
      title: t("tourPage.blind.title"),
      subtitle: t("tourPage.blind.subtitle"),
      image: slideBlind,
      badge: t("tourPage.blind.badge"),
      layout: "left",
      features: [
        { icon: EyeOff, title: t("tourPage.blind.f1Title"), desc: t("tourPage.blind.f1Desc") },
        { icon: Eye, title: t("tourPage.blind.f2Title"), desc: t("tourPage.blind.f2Desc") },
        { icon: Sparkles, title: t("tourPage.blind.f3Title"), desc: t("tourPage.blind.f3Desc") },
        { icon: Camera, title: t("tourPage.blind.f4Title"), desc: t("tourPage.blind.f4Desc") },
      ],
    },
    {
      type: "content",
      title: t("tourPage.ai.title"),
      subtitle: t("tourPage.ai.subtitle"),
      image: slideAi,
      badge: t("tourPage.ai.badge"),
      layout: "right",
      features: [
        { icon: Camera, title: t("tourPage.ai.f1Title"), desc: t("tourPage.ai.f1Desc") },
        { icon: FileSpreadsheet, title: t("tourPage.ai.f2Title"), desc: t("tourPage.ai.f2Desc") },
        { icon: Brain, title: t("tourPage.ai.f3Title"), desc: t("tourPage.ai.f3Desc") },
        { icon: Download, title: t("tourPage.ai.f4Title"), desc: t("tourPage.ai.f4Desc") },
      ],
    },
    {
      type: "content",
      title: t("tourPage.science.title"),
      subtitle: t("tourPage.science.subtitle"),
      image: slideAnalytics,
      badge: t("tourPage.science.badge"),
      layout: "left",
      features: [
        { icon: FlaskConical, title: t("tourPage.science.f1Title"), desc: t("tourPage.science.f1Desc") },
        { icon: BarChart3, title: t("tourPage.science.f2Title"), desc: t("tourPage.science.f2Desc") },
        { icon: TrendingUp, title: t("tourPage.science.f3Title"), desc: t("tourPage.science.f3Desc") },
        { icon: Brain, title: t("tourPage.science.f4Title"), desc: t("tourPage.science.f4Desc") },
        { icon: GraduationCap, title: t("tourPage.science.f5Title"), desc: t("tourPage.science.f5Desc") },
      ],
    },
    {
      type: "content",
      title: t("tourPage.community.title"),
      subtitle: t("tourPage.community.subtitle"),
      image: slideCommunity,
      badge: t("tourPage.community.badge"),
      layout: "right",
      features: [
        { icon: Users, title: t("tourPage.community.f1Title"), desc: t("tourPage.community.f1Desc") },
        { icon: Rss, title: t("tourPage.community.f2Title"), desc: t("tourPage.community.f2Desc") },
        { icon: Trophy, title: t("tourPage.community.f3Title"), desc: t("tourPage.community.f3Desc") },
        { icon: Calendar, title: t("tourPage.community.f4Title"), desc: t("tourPage.community.f4Desc") },
        { icon: Bell, title: t("tourPage.community.f5Title"), desc: t("tourPage.community.f5Desc") },
      ],
    },
    {
      type: "content",
      title: t("tourPage.host.title"),
      subtitle: t("tourPage.host.subtitle"),
      image: slideHost,
      badge: t("tourPage.host.badge"),
      layout: "left",
      features: [
        { icon: LayoutDashboard, title: t("tourPage.host.f1Title"), desc: t("tourPage.host.f1Desc") },
        { icon: FileDown, title: t("tourPage.host.f2Title"), desc: t("tourPage.host.f2Desc") },
        { icon: Users, title: t("tourPage.host.f3Title"), desc: t("tourPage.host.f3Desc") },
        { icon: Volume2, title: t("tourPage.host.f4Title"), desc: t("tourPage.host.f4Desc") },
      ],
    },
    {
      type: "content",
      title: t("tourPage.knowledge.title"),
      subtitle: t("tourPage.knowledge.subtitle"),
      image: slideKnowledge,
      badge: t("tourPage.knowledge.badge"),
      layout: "right",
      features: [
        { icon: BookOpen, title: t("tourPage.knowledge.f1Title"), desc: t("tourPage.knowledge.f1Desc") },
        { icon: Landmark, title: t("tourPage.knowledge.f2Title"), desc: t("tourPage.knowledge.f2Desc") },
        { icon: Map, title: t("tourPage.knowledge.f3Title"), desc: t("tourPage.knowledge.f3Desc") },
        { icon: Heart, title: t("tourPage.knowledge.f4Title"), desc: t("tourPage.knowledge.f4Desc") },
      ],
    },
    {
      type: "content",
      title: t("tourPage.mobile.title"),
      subtitle: t("tourPage.mobile.subtitle"),
      image: slideMobile,
      badge: t("tourPage.mobile.badge"),
      layout: "left",
      features: [
        { icon: Smartphone, title: t("tourPage.mobile.f1Title"), desc: t("tourPage.mobile.f1Desc") },
        { icon: Sparkles, title: t("tourPage.mobile.f2Title"), desc: t("tourPage.mobile.f2Desc") },
        { icon: BookOpen, title: t("tourPage.mobile.f3Title"), desc: t("tourPage.mobile.f3Desc") },
        { icon: Eye, title: t("tourPage.mobile.f4Title"), desc: t("tourPage.mobile.f4Desc") },
      ],
    },
    {
      type: "content",
      title: t("tourPage.dataPrivacy.title"),
      subtitle: t("tourPage.dataPrivacy.subtitle"),
      image: slideMobile,
      badge: t("tourPage.dataPrivacy.badge"),
      layout: "right",
      features: [
        { icon: Shield, title: t("tourPage.dataPrivacy.f1Title"), desc: t("tourPage.dataPrivacy.f1Desc") },
        { icon: Brain, title: t("tourPage.dataPrivacy.f2Title"), desc: t("tourPage.dataPrivacy.f2Desc") },
        { icon: Download, title: t("tourPage.dataPrivacy.f3Title"), desc: t("tourPage.dataPrivacy.f3Desc") },
        { icon: Layers, title: t("tourPage.dataPrivacy.f4Title"), desc: t("tourPage.dataPrivacy.f4Desc") },
      ],
    },
    {
      type: "cta",
      title: t("tourPage.cta.title"),
      subtitle: t("tourPage.cta.subtitle"),
      image: slideCta,
      layout: "center",
    },
  ];

  const total = slides.length;

  const next = useCallback(() => {
    setDirection(1);
    setCurrent((c) => Math.min(c + 1, total - 1));
  }, [total]);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrent((c) => Math.max(c - 1, 0));
  }, []);

  const goTo = useCallback((i: number) => {
    setDirection(i > current ? 1 : -1);
    setCurrent(i);
  }, [current]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      if (e.key === "Escape") showTOC ? setShowTOC(false) : navigate("/");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, navigate, showTOC]);

  useEffect(() => {
    if (!autoPlay) return;
    const id = setInterval(() => {
      setCurrent((c) => {
        if (c >= total - 1) { setAutoPlay(false); return c; }
        return c + 1;
      });
      setDirection(1);
    }, 6000);
    return () => clearInterval(id);
  }, [autoPlay, total]);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/tour-pdf");
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "CaskSense-Rundgang.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PDF download error:", e);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPptx = async () => {
    setDownloadingPptx(true);
    try {
      const res = await fetch("/api/tour-pptx");
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "CaskSense-Rundgang.pptx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PPTX download error:", e);
    } finally {
      setDownloadingPptx(false);
    }
  };

  const progress = ((current + 1) / total) * 100;
  const slide = slides[current];

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col" data-testid="tour-rundgang">
      <header className="flex items-center justify-between px-3 sm:px-5 py-2 border-b border-border/20 bg-card/80 backdrop-blur-md flex-shrink-0 z-20">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="font-serif text-xs gap-1 px-2" data-testid="button-tour-back">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t("tourPage.back")}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowTOC(!showTOC)} className="text-xs gap-1 px-2" data-testid="button-tour-toc">
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">{t("tourPage.contentLabel")}</span>
          </Button>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="text-xs font-mono text-muted-foreground/60 tabular-nums">
            {current + 1}<span className="text-muted-foreground/30"> / </span>{total}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoPlay(!autoPlay)}
            className="text-xs gap-1 px-2"
            data-testid="button-tour-autoplay"
          >
            {autoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="text-xs gap-1 px-2 font-serif"
            data-testid="button-tour-download-pdf"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{downloading ? "..." : "PDF"}</span>
          </Button>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPptx}
              disabled={downloadingPptx}
              className="text-xs gap-1 px-2 font-serif"
              data-testid="button-tour-download-pptx"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{downloadingPptx ? "..." : "PPTX"}</span>
            </Button>
          )}
        </div>
      </header>

      <div className="w-full h-0.5 bg-secondary/30 flex-shrink-0">
        <motion.div
          className="h-full bg-primary/60"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            initial={{ opacity: 0, x: direction >= 0 ? 80 : -80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction >= 0 ? -80 : 80 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <SlideContent slide={slide} direction={direction} slides={slides} t={t} />
          </motion.div>
        </AnimatePresence>

        <button
          onClick={prev}
          disabled={current === 0}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-card/70 border border-border/30 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-card/90 transition-all disabled:opacity-10 disabled:cursor-not-allowed backdrop-blur-sm z-10"
          data-testid="button-tour-prev"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={next}
          disabled={current === total - 1}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-card/70 border border-border/30 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-card/90 transition-all disabled:opacity-10 disabled:cursor-not-allowed backdrop-blur-sm z-10"
          data-testid="button-tour-next"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <AnimatePresence>
          {showTOC && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-background/50 backdrop-blur-sm z-[55]"
                onClick={() => setShowTOC(false)}
              />
              <TOCPanel currentSlide={current} onSelect={goTo} onClose={() => setShowTOC(false)} slides={slides} t={t} />
            </>
          )}
        </AnimatePresence>
      </div>

      {slide.type === "cta" && (
        <div className="absolute bottom-20 left-0 right-0 flex flex-col items-center gap-3 z-10">
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => navigate("/")} className="font-serif gap-2" size="lg" data-testid="button-tour-back-landing">
              <ArrowLeft className="w-4 h-4" />
              {t("tourPage.backToOverview")}
            </Button>
            <Button variant="outline" onClick={() => navigate("/tasting")} className="font-serif gap-2" size="lg" data-testid="button-tour-start">
              {t("tourPage.directToTool")}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="ghost" onClick={handleDownloadPdf} disabled={downloading} className="font-serif gap-2 text-sm" size="sm" data-testid="button-tour-download-pdf-cta">
              <FileText className="w-4 h-4" />
              {downloading ? t("tourPage.creating") : t("tourPage.downloadPdf")}
            </Button>
            {isAdmin && (
              <Button variant="ghost" onClick={handleDownloadPptx} disabled={downloadingPptx} className="font-serif gap-2 text-sm" size="sm" data-testid="button-tour-download-pptx-cta">
                <FileDown className="w-4 h-4" />
                {downloadingPptx ? t("tourPage.creating") : t("tourPage.downloadPptx")}
              </Button>
            )}
          </div>
        </div>
      )}

      <footer className="flex items-center justify-center gap-1 px-4 py-2 border-t border-border/15 flex-shrink-0 bg-card/50 backdrop-blur-sm">
        {slides.map((s, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={cn(
              "rounded-full transition-all",
              s.type === "cover" || s.type === "cta" ? "w-3 h-3" : "w-2 h-2",
              i === current
                ? "bg-primary scale-125"
                : i < current
                  ? "bg-primary/30"
                  : "bg-border/50"
            )}
            data-testid={`tour-dot-${i}`}
          />
        ))}
      </footer>
    </div>
  );
}

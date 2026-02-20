import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Wine, Eye, EyeOff, Camera, Brain, Users, BookOpen, LayoutDashboard,
  Smartphone, ChevronLeft, ChevronRight, ArrowLeft, FileDown, Play, Pause,
  List, X, Star, Sparkles, FileSpreadsheet, QrCode, NotebookPen,
  Activity, Trophy, GitCompareArrows, Rss, Calendar, Landmark, Map,
  MessageSquare, Volume2, Heart, Bell, Download
} from "lucide-react";
import { cn } from "@/lib/utils";

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

const slides: SlideData[] = [
  {
    type: "cover",
    title: "CaskSense",
    subtitle: "Whisky gemeinsam erleben — strukturiert, persönlich, ohne Vorwissen.",
    image: slideCover,
    badge: "Produkt-Tour",
    layout: "center",
  },
  {
    type: "content",
    title: "Tasting-Sessions",
    subtitle: "Erstelle strukturierte Tastings, lade Gäste per QR-Code ein und bewerte gemeinsam — von der Nase bis zum Abgang.",
    image: slideTasting,
    badge: "Kernfunktion",
    layout: "right",
    features: [
      { icon: Wine, title: "Sessions erstellen", desc: "Name, Datum, Line-up — in Sekunden startklar" },
      { icon: QrCode, title: "QR-Code Einladungen", desc: "Scannen und sofort dabei — kein Konto nötig" },
      { icon: Star, title: "Strukturierte Bewertung", desc: "Nase, Geschmack, Abgang, Balance — auf einer Skala" },
      { icon: MessageSquare, title: "Live-Diskussion", desc: "Chat in Echtzeit während des Tastings" },
    ],
  },
  {
    type: "content",
    title: "Blind Tasting & Reveal",
    subtitle: "Whiskys ohne Vorurteile verkosten. Der Host steuert die Enthüllung — dramatisch, Flasche für Flasche.",
    image: slideBlind,
    badge: "Highlight",
    layout: "left",
    features: [
      { icon: EyeOff, title: "Blind-Modus", desc: "Etiketten ausblenden, Namen verbergen, fair bewerten" },
      { icon: Eye, title: "Multi-Act Reveal", desc: "Host enthüllt schrittweise — mit Charts und Scores" },
      { icon: Sparkles, title: "ABV & Alter raten", desc: "Extra-Challenge für erfahrene Gaumen" },
      { icon: Camera, title: "Cover-Bild Reveal", desc: "Gruppen- oder Sessionfoto als Überraschungsmoment" },
    ],
  },
  {
    type: "content",
    title: "KI-Import & Whisky-Verwaltung",
    subtitle: "Flaschenfoto, Excel-Tabelle oder Text — die KI erkennt deine Whiskys und übernimmt die Dateneingabe.",
    image: slideAi,
    badge: "KI-gestützt",
    layout: "right",
    features: [
      { icon: Camera, title: "Foto-Erkennung", desc: "GPT-4o liest Etiketten und identifiziert Flaschen" },
      { icon: FileSpreadsheet, title: "Excel/CSV Import", desc: "Tabellen hochladen, Spalten werden automatisch zugeordnet" },
      { icon: Brain, title: "Benchmark Analyzer", desc: "Reviews hochladen, KI extrahiert Scores und Notizen" },
      { icon: Download, title: "Whiskybase-Import", desc: "Sammlung per CSV importieren, mit Links und Preisen" },
    ],
  },
  {
    type: "content",
    title: "Flight Board & Präsentation",
    subtitle: "Das visuelle Herzstück: alle Whiskys im Überblick, mit Fotos, Nummern und der Möglichkeit, Bilder hochzuladen.",
    image: slideFlightboard,
    badge: "Visuell",
    layout: "left",
    features: [
      { icon: LayoutDashboard, title: "Flight Board", desc: "Alle Whiskys auf einen Blick — nummeriert und sortiert" },
      { icon: Camera, title: "Flaschenfotos", desc: "Bilder hochladen und in der Detailansicht verwalten" },
      { icon: FileDown, title: "PDF Tasting-Menü", desc: "Professionelles Menü als PDF exportieren" },
      { icon: Sparkles, title: "Tasting-Notiz Generator", desc: "Interaktives Tool mit vordefinierten Aromen" },
    ],
  },
  {
    type: "content",
    title: "Persönliche Analysen",
    subtitle: "Radar-Charts, Flavor Wheels, Geschmacksentwicklung — entdecke Muster in deinem Gaumen.",
    image: slideAnalytics,
    badge: "Deine Daten",
    layout: "right",
    features: [
      { icon: Activity, title: "Flavor-Profil", desc: "Radar-Chart deiner Vorlieben: Region, Fass, Torfgehalt" },
      { icon: Sparkles, title: "Flavor Wheel", desc: "Sunburst-Chart mit 8 Kategorien deiner Aromen" },
      { icon: NotebookPen, title: "Whisky-Tagebuch", desc: "Notizen, Fotos, Stimmung — deine persönliche Bibliothek" },
      { icon: Trophy, title: "37 Achievements", desc: "Vom ersten Rating bis zum 1.000sten Tasting" },
      { icon: GitCompareArrows, title: "Side-by-Side", desc: "2–3 Whiskys direkt vergleichen mit Overlays" },
      { icon: Star, title: "Empfehlungen", desc: "Personalisierte Vorschläge basierend auf deinem Profil" },
    ],
  },
  {
    type: "content",
    title: "Community & Social",
    subtitle: "Whisky-Freunde finden, Aktivitäten verfolgen, Rankings vergleichen — Whisky macht am Tisch mehr Sinn.",
    image: slideCommunity,
    badge: "Gemeinsam",
    layout: "left",
    features: [
      { icon: Users, title: "Freunde", desc: "Whisky-Freunde hinzufügen und deren Einträge sehen" },
      { icon: Rss, title: "Aktivitäts-Feed", desc: "Timeline der Journal-Einträge und Tastings deiner Freunde" },
      { icon: Trophy, title: "Leaderboard", desc: "Rankings: aktivster Bewerter, detaillierteste Notizen" },
      { icon: Calendar, title: "Tasting-Kalender", desc: "Monatsansicht aller Sessions mit Status-Badges" },
      { icon: Bell, title: "Erinnerungen", desc: "E-Mail-Reminder vor dem Tasting — flexibel einstellbar" },
    ],
  },
  {
    type: "content",
    title: "Wissensdatenbank",
    subtitle: "Lexikon, Destillerien-Enzyklopädie und interaktive Weltkarte — Hintergrundwissen beim Verkosten.",
    image: slideKnowledge,
    badge: "Referenz",
    layout: "right",
    features: [
      { icon: BookOpen, title: "Whisky-Lexikon", desc: "53 Einträge in 5 Kategorien — zweisprachig" },
      { icon: Landmark, title: "Destillerien", desc: "~100 Destillerien weltweit mit Geschichte und Details" },
      { icon: Map, title: "Interaktive Karte", desc: "Weltkarte mit Destillerie-Pins und verschiedenen Layern" },
      { icon: Heart, title: "Abfüller-Lexikon", desc: "Unabhängige Abfüller mit Beschreibungen und Infos" },
    ],
  },
  {
    type: "content",
    title: "Host-Tools & Dashboard",
    subtitle: "Überblick für Gastgeber: Statistiken, Top-Whiskys, Briefing-Notizen und Tasting-Kuration.",
    image: slideHost,
    badge: "Für Hosts",
    layout: "left",
    features: [
      { icon: LayoutDashboard, title: "Host Dashboard", desc: "Tastings, Teilnehmer, Durchschnittsbewertungen im Blick" },
      { icon: FileDown, title: "Tasting Recap", desc: "Zusammenfassung zum Teilen: Top-Whisky, Kontroversen" },
      { icon: Users, title: "Host-Delegation", desc: "Host-Rolle an anderen Teilnehmer übertragen" },
      { icon: Volume2, title: "Ambiente", desc: "Kaminfeuer, Regen oder Nacht — dezente Hintergrundklänge" },
    ],
  },
  {
    type: "content",
    title: "Guided Tasting & Presenter Mode",
    subtitle: "Live-Moderation mit Split-Screen für den Host und Vollbild-Ansicht für die Teilnehmer.",
    image: slideGuided,
    badge: "Presenter",
    layout: "right",
    features: [
      { icon: LayoutDashboard, title: "Split-Screen Host-Ansicht", desc: "Steuerung links, Präsentation rechts — alles im Blick" },
      { icon: Eye, title: "Vollbild Teilnehmer", desc: "Große, klare Darstellung auf Bildschirm oder Beamer" },
      { icon: Sparkles, title: "Progressive Reveal", desc: "Schrittweises Enthüllen mit Animations und Charts" },
      { icon: Star, title: "Automatische Aktivierung", desc: "Presenter Mode startet mit dem Reveal-Status" },
    ],
  },
  {
    type: "content",
    title: "Mobile & Mehrsprachig",
    subtitle: "Auf dem Handy installierbar, offline nutzbar, komplett zweisprachig — Deutsch und Englisch.",
    image: slideMobile,
    badge: "Überall",
    layout: "left",
    features: [
      { icon: Smartphone, title: "Progressive Web App", desc: "Auf dem Home-Screen installieren — wie eine echte App" },
      { icon: Sparkles, title: "Offline-Modus", desc: "Network-First Caching für unterbrechungsfreies Verkosten" },
      { icon: BookOpen, title: "Deutsch & Englisch", desc: "Vollständig zweisprachig — jederzeit umschaltbar" },
      { icon: Eye, title: "Dark & Light", desc: "Warmes Whisky-Dunkel oder helles Creme-Amber — wählbar" },
    ],
  },
  {
    type: "cta",
    title: "Bereit für das nächste Tasting?",
    subtitle: "Starte eine Session, lade Freunde ein und entdecke, was dein Gaumen wirklich wahrnimmt. Kostenlos — ohne Konto.",
    image: slideCta,
    layout: "center",
  },
];

function TOCPanel({ currentSlide, onSelect, onClose }: { currentSlide: number; onSelect: (i: number) => void; onClose: () => void }) {
  return (
    <motion.div
      initial={{ x: -320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -320, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed left-0 top-0 bottom-0 w-80 bg-card/95 backdrop-blur-lg border-r border-border/30 z-[60] overflow-y-auto shadow-2xl"
    >
      <div className="flex items-center justify-between p-4 border-b border-border/20 sticky top-0 bg-card/95 backdrop-blur-lg">
        <h3 className="font-serif font-bold text-primary text-sm">Inhaltsverzeichnis</h3>
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
              {s.type === "cover" ? "Willkommen" : s.type === "cta" ? "Loslegen" : s.title}
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

function SlideContent({ slide, direction }: { slide: SlideData; direction: number }) {
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
            <span className="font-mono">{slides.filter(s => s.type === "content").length} Themen</span>
            <span>·</span>
            <span className="font-mono">{slides.flatMap(s => s.features || []).length}+ Funktionen</span>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="text-xs text-muted-foreground/30 pt-2"
          >
            Pfeiltasten oder Klick zum Navigieren
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              {slide.features.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.06, duration: 0.4 }}
                  className="flex items-start gap-2.5 bg-card/60 border border-border/20 rounded-xl px-3 py-2.5"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <f.icon className="w-4 h-4 text-primary/70" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground leading-tight">{f.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{f.desc}</p>
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
  const [current, setCurrent] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [showTOC, setShowTOC] = useState(false);
  const [direction, setDirection] = useState(0);
  const [downloading, setDownloading] = useState(false);
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

  const handleDownloadPptx = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/tour-pptx");
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "CaskSense-Produkt-Tour.pptx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PPTX download error:", e);
    } finally {
      setDownloading(false);
    }
  };

  const progress = ((current + 1) / total) * 100;
  const slide = slides[current];

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col" data-testid="product-tour">
      <header className="flex items-center justify-between px-3 sm:px-5 py-2 border-b border-border/20 bg-card/80 backdrop-blur-md flex-shrink-0 z-20">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="font-serif text-xs gap-1 px-2" data-testid="button-tour-back">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Zurück</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowTOC(!showTOC)} className="text-xs gap-1 px-2" data-testid="button-tour-toc">
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Inhalt</span>
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
            onClick={handleDownloadPptx}
            disabled={downloading}
            className="text-xs gap-1 px-2 font-serif"
            data-testid="button-tour-download"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{downloading ? "..." : "PPTX"}</span>
          </Button>
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
            <SlideContent slide={slide} direction={direction} />
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
              <TOCPanel currentSlide={current} onSelect={goTo} onClose={() => setShowTOC(false)} />
            </>
          )}
        </AnimatePresence>
      </div>

      {slide.type === "cta" && (
        <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-3 z-10">
          <Button onClick={() => navigate("/app")} className="font-serif gap-2" size="lg" data-testid="button-tour-start">
            Jetzt starten
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={handleDownloadPptx} disabled={downloading} className="font-serif gap-2" size="lg" data-testid="button-tour-download-pptx">
            <FileDown className="w-4 h-4" />
            {downloading ? "Wird erstellt..." : "PPTX herunterladen"}
          </Button>
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

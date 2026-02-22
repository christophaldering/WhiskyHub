import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
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

const slides: SlideData[] = [
  {
    type: "cover",
    title: "CaskSense",
    subtitle: "Whisky gemeinsam erleben. Ohne Technik-Stress — der Moment am Tisch zählt.",
    image: slideCover,
    badge: "Rundgang",
    layout: "center",
  },
  {
    type: "content",
    title: "Erst mal verkosten",
    subtitle: "CaskSense ist kein Tech-Spielzeug. Es geht ums Schmecken, Riechen, Diskutieren — um den Moment, wenn sechs Leute am Tisch sitzen und jeder etwas anderes wahrnimmt. Die Technik bleibt im Hintergrund.",
    image: slideTasting,
    badge: "Das Wichtigste zuerst",
    layout: "right",
    features: [
      { icon: Wine, title: "Verkosten steht im Fokus", desc: "Kein Feature-Overload — nur das, was ein gutes Tasting besser macht" },
      { icon: QrCode, title: "Kein Konto nötig", desc: "QR-Code scannen, Name eingeben, mitmachen. Das war's." },
      { icon: HandHeart, title: "Kein Vorwissen nötig", desc: "Ob Neuling oder Kenner — jeder ist willkommen am Tisch" },
      { icon: GlassWater, title: "Whisky first", desc: "Die App soll helfen, nicht im Weg stehen. Versprochen." },
    ],
  },
  {
    type: "content",
    title: "Dein Tempo, dein Erlebnis",
    subtitle: "CaskSense wächst mit deiner Neugier. Manche wollen nur verkosten — andere wollen alles wissen. Beides ist richtig. Du entscheidest, wie tief du eintauchst.",
    image: slideCommunity,
    badge: "Von Einfach bis Analytisch",
    layout: "left",
    features: [
      { icon: Wine, title: "Just Tasting", desc: "Kommen, trinken, bewerten, gehen. Null Technik-Stress." },
      { icon: Compass, title: "Explorer", desc: "Dein Journal starten, Aromen entdecken, Favoriten merken." },
      { icon: Star, title: "Connoisseur", desc: "Geschmacksprofil aufbauen, Whiskys vergleichen, Empfehlungen bekommen." },
      { icon: BarChart3, title: "Analyst", desc: "Benchmarks, Statistiken, Muster — für alle, die Daten lieben." },
    ],
  },
  {
    type: "content",
    title: "Tasting-Sessions",
    subtitle: "Ein Gastgeber erstellt die Session, lädt per QR-Code oder Link ein — und alle bewerten gemeinsam, von der Nase bis zum Abgang.",
    image: slideTasting,
    badge: "Kernfunktion",
    layout: "right",
    features: [
      { icon: Wine, title: "Sessions erstellen", desc: "Name, Datum, Line-up — in Sekunden startklar" },
      { icon: QrCode, title: "QR-Code Einladungen", desc: "Scannen und sofort dabei — kein Konto nötig" },
      { icon: Star, title: "Strukturierte Bewertung", desc: "Nase, Geschmack, Abgang, Balance — auf deiner Wunschskala" },
      { icon: MessageSquare, title: "Live-Diskussion", desc: "Austausch in Echtzeit während des Tastings" },
    ],
  },
  {
    type: "content",
    title: "Geführtes Tasting & Präsentation",
    subtitle: "Für den großen Auftritt: geteilter Bildschirm für den Gastgeber, Vollbild-Ansicht für alle — perfekt mit Beamer oder Fernseher.",
    image: slideGuided,
    badge: "Showtime",
    layout: "left",
    features: [
      { icon: LayoutDashboard, title: "Geteilter Bildschirm", desc: "Steuerung links, Präsentation rechts — alles unter Kontrolle" },
      { icon: Eye, title: "Vollbild-Ansicht", desc: "Große, klare Darstellung — auch auf dem Fernseher" },
      { icon: Sparkles, title: "Schrittweise Enthüllung", desc: "Jede Flasche ein eigener Moment — mit Animationen" },
      { icon: Star, title: "Startet automatisch", desc: "Präsentationsmodus aktiviert sich mit der Enthüllungsphase" },
    ],
  },
  {
    type: "content",
    title: "Verkostungsbrett & Präsentation",
    subtitle: "Alle Whiskys auf einen Blick — nummeriert, mit Fotos und Notizen. Das visuelle Herzstück für jeden Tisch.",
    image: slideFlightboard,
    badge: "Visuell",
    layout: "right",
    features: [
      { icon: LayoutDashboard, title: "Verkostungsbrett", desc: "Überblick über alle Flaschen — klar nummeriert und sortiert" },
      { icon: Camera, title: "Flaschenfotos", desc: "Bilder hochladen — auch direkt vom Handy" },
      { icon: FileDown, title: "PDF Tasting-Menü", desc: "Professionelles Menü zum Ausdrucken oder Teilen" },
      { icon: Sparkles, title: "Tasting-Notiz Generator", desc: "Aromen auswählen statt formulieren — interaktiv und schnell" },
    ],
  },
  {
    type: "content",
    title: "Blind Tasting & Enthüllung",
    subtitle: "Ein beliebtes Extra: Whiskys ohne Vorurteile verkosten. Der Gastgeber enthüllt — dramatisch, Flasche für Flasche, mit Überraschungsgarantie.",
    image: slideBlind,
    badge: "Beliebtes Extra",
    layout: "left",
    features: [
      { icon: EyeOff, title: "Blind-Modus", desc: "Etiketten weg, Namen verborgen — nur dein Gaumen zählt" },
      { icon: Eye, title: "Schrittweise Enthüllung", desc: "Der Gastgeber bestimmt den Moment — mit Diagrammen und Wow-Effekt" },
      { icon: Sparkles, title: "ABV & Alter raten", desc: "Zusätzlicher Spaß für alle, die sich trauen" },
      { icon: Camera, title: "Cover-Bild Enthüllung", desc: "Gruppenfoto oder Flaschenbild als krönender Abschluss" },
    ],
  },
  {
    type: "content",
    title: "Clevere Helfer im Hintergrund",
    subtitle: "Niemand muss Daten eintippen. Die KI liest Etiketten, erkennt Flaschen und füllt Felder aus — damit du dich aufs Wesentliche konzentrieren kannst.",
    image: slideAi,
    badge: "Optional & hilfreich",
    layout: "right",
    features: [
      { icon: Camera, title: "Foto-Erkennung", desc: "Flasche fotografieren — KI erledigt die Dateneingabe" },
      { icon: FileSpreadsheet, title: "Excel/CSV Import", desc: "Tabellen hochladen, Spalten werden automatisch zugeordnet" },
      { icon: Brain, title: "Benchmark-Datenbank", desc: "Professionelle Bewertungen als Referenz — zum Vergleichen" },
      { icon: Download, title: "Whiskybase-Import", desc: "Bestehende Sammlung importieren — inklusive Links und Preise" },
    ],
  },
  {
    type: "content",
    title: "Mehr als Bauchgefühl",
    subtitle: "CaskSense kennt Methoden aus Psychometrie und Persönlichkeitsforschung — und macht sie zugänglich. Wer tiefer eintauchen will, findet hier Werkzeuge, die über Hobby hinausgehen.",
    image: slideAnalytics,
    badge: "Für Wissbegierige",
    layout: "left",
    features: [
      { icon: FlaskConical, title: "Psychometrische Skalen", desc: "Bewertungsskalen, die auf erprobten Methoden aufbauen — nicht zusammengewürfelt" },
      { icon: BarChart3, title: "Benchmark-Datenbank", desc: "Eigene Bewertungen im Kontext professioneller Referenzen einordnen" },
      { icon: TrendingUp, title: "Messqualität & Konsistenz", desc: "Wie zuverlässig bewertest du? CaskSense zeigt es — und hilft, präziser zu werden" },
      { icon: Brain, title: "KI-gestützte Mustererkennung", desc: "Zusammenhänge in deinen Bewertungen, die dir selbst nicht auffallen" },
      { icon: GraduationCap, title: "Wissenschaftliche Vertiefung", desc: "Ansätze aus Datenanalyse und prädiktiver Validität — bis hin zu wissenschaftlichen Publikationen" },
    ],
  },
  {
    type: "content",
    title: "Gemeinschaft & Austausch",
    subtitle: "Whisky trinkt man nicht allein. Finde Gleichgesinnte, teile Einträge und entdecke, was die anderen am Tisch anders schmecken.",
    image: slideCommunity,
    badge: "Gemeinsam",
    layout: "right",
    features: [
      { icon: Users, title: "Freunde", desc: "Whisky-Freunde hinzufügen und deren Einträge sehen" },
      { icon: Rss, title: "Aktivitäts-Feed", desc: "Was trinken die anderen? Timeline deiner Tasting-Runde" },
      { icon: Trophy, title: "Rangliste", desc: "Wer war am aktivsten? Wer hat die detailliertesten Notizen?" },
      { icon: Calendar, title: "Tasting-Kalender", desc: "Alle Sessions im Überblick — nie wieder ein Tasting verpassen" },
      { icon: Bell, title: "Erinnerungen", desc: "Freundlicher Reminder per E-Mail — flexibel einstellbar" },
    ],
  },
  {
    type: "content",
    title: "Gastgeber-Werkzeuge",
    subtitle: "Du organisierst das Tasting? CaskSense gibt dir alles an die Hand: Übersicht, Briefing, Zusammenfassung — und sogar dezente Hintergrundklänge.",
    image: slideHost,
    badge: "Für Gastgeber",
    layout: "left",
    features: [
      { icon: LayoutDashboard, title: "Dashboard", desc: "Teilnehmer, Bewertungen, Top-Whiskys — alles im Blick" },
      { icon: FileDown, title: "Zusammenfassung", desc: "Rückblick nach dem Tasting: Top-Whisky, Überraschungen, Kontroversen" },
      { icon: Users, title: "Gastgeber-Delegation", desc: "Rolle an jemand anderen übergeben — flexibel und unkompliziert" },
      { icon: Volume2, title: "Ambiente", desc: "Kaminfeuer, Regen oder Jazz — dezente Klänge für die richtige Stimmung" },
    ],
  },
  {
    type: "content",
    title: "Wissensdatenbank",
    subtitle: "Was ist ein Finish? Wo liegt Islay? Was macht Gordon & MacPhail besonders? Hintergrundwissen, wenn du es brauchst — nicht, wenn du es nicht brauchst.",
    image: slideKnowledge,
    badge: "Zum Stöbern",
    layout: "right",
    features: [
      { icon: BookOpen, title: "Whisky-Lexikon", desc: "53 Begriffe in 5 Kategorien — verständlich erklärt" },
      { icon: Landmark, title: "Destillerien", desc: "~100 Destillerien weltweit mit Geschichte und Charakter" },
      { icon: Map, title: "Interaktive Karte", desc: "Weltkarte mit Destillerie-Pins — zoomen und entdecken" },
      { icon: Heart, title: "Abfüller-Lexikon", desc: "Unabhängige Abfüller und was sie besonders macht" },
    ],
  },
  {
    type: "content",
    title: "Überall dabei",
    subtitle: "Auf dem Handy, am Tablet, am Laptop — CaskSense funktioniert überall. Installierbar wie eine App, nutzbar in Deutsch und Englisch.",
    image: slideMobile,
    badge: "Flexibel",
    layout: "left",
    features: [
      { icon: Smartphone, title: "Wie eine App", desc: "Auf dem Home-Screen installieren — kein App Store nötig" },
      { icon: Sparkles, title: "Auch offline nutzbar", desc: "Bewertungen gehen nicht verloren, auch wenn das WLAN streikt" },
      { icon: BookOpen, title: "Deutsch & Englisch", desc: "Komplett zweisprachig — jederzeit umschaltbar" },
      { icon: Eye, title: "Hell oder Dunkel", desc: "Warmes Whisky-Dunkel oder helles Creme-Amber — du wählst" },
    ],
  },
  {
    type: "content",
    title: "Deine Daten gehören dir",
    subtitle: "Kein Tracking, kein Verkauf, kein Kleingedrucktes. CaskSense ist DSGVO-konform, transparent bei KI-Nutzung und gibt dir volle Kontrolle über deine Daten.",
    image: slideMobile,
    badge: "Vertrauen",
    layout: "right",
    features: [
      { icon: Shield, title: "DSGVO-konform", desc: "Datenschutz nach europäischem Standard — ohne Kompromisse" },
      { icon: Brain, title: "Transparente KI", desc: "Du siehst immer, wenn KI im Spiel ist — und kannst selbst entscheiden" },
      { icon: Download, title: "Datenexport jederzeit", desc: "Alle deine Daten als JSON herunterladen — gehört alles dir" },
      { icon: Layers, title: "Speicher-Kontrolle", desc: "Du entscheidest, was gespeichert wird. Löschung auf Knopfdruck." },
    ],
  },
  {
    type: "cta",
    title: "Probier's beim nächsten Tasting",
    subtitle: "Lade ein paar Freunde ein, öffne eine gute Flasche und lass CaskSense den Rest machen. Kostenlos — ohne Konto, ohne Hürden.",
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
  const { currentParticipant } = useAppStore();
  const isAdmin = currentParticipant?.role === "admin";
  const [current, setCurrent] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [showTOC, setShowTOC] = useState(false);
  const [direction, setDirection] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadingPptx, setDownloadingPptx] = useState(false);
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
        <div className="absolute bottom-20 left-0 right-0 flex flex-col items-center gap-3 z-10">
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => navigate("/")} className="font-serif gap-2" size="lg" data-testid="button-tour-back-landing">
              <ArrowLeft className="w-4 h-4" />
              Zurück zur Übersicht
            </Button>
            <Button variant="outline" onClick={() => navigate("/app")} className="font-serif gap-2" size="lg" data-testid="button-tour-start">
              Direkt zum Tool
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="ghost" onClick={handleDownloadPdf} disabled={downloading} className="font-serif gap-2 text-sm" size="sm" data-testid="button-tour-download-pdf-cta">
              <FileText className="w-4 h-4" />
              {downloading ? "Wird erstellt..." : "PDF herunterladen"}
            </Button>
            {isAdmin && (
              <Button variant="ghost" onClick={handleDownloadPptx} disabled={downloadingPptx} className="font-serif gap-2 text-sm" size="sm" data-testid="button-tour-download-pptx-cta">
                <FileDown className="w-4 h-4" />
                {downloadingPptx ? "Wird erstellt..." : "PPTX herunterladen"}
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

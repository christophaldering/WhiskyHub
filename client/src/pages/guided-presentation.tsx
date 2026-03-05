import { useState, useCallback, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wine, PenLine, Users, BarChart3, Sparkles, Camera, Star,
  Radar, GitCompareArrows, ChevronRight, ChevronLeft, BookOpen,
  Trophy, Shield, Globe, Heart, Lightbulb, X, Play
} from "lucide-react";
import { v, alpha } from "@/lib/themeVars";

const ACCENT_RAW = "#c8a97e";

const font = {
  display: "'Playfair Display', Georgia, 'Times New Roman', serif",
  body: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
};

interface Slide {
  id: string;
  badge?: string;
  title: string;
  subtitle?: string;
  body: string[];
  icon: React.ElementType;
  accentColor?: string;
  illustration?: "radar" | "steps" | "group" | "glow" | "orbit" | "stack" | "wave" | "grid" | "ring" | "pulse" | "float" | "scatter" | "spiral";
}

const slides: Slide[] = [
  {
    id: "welcome",
    badge: "Welcome",
    title: "CaskSense",
    subtitle: "Where tasting becomes reflection.",
    body: [
      "A platform for people who love whisky — and want to understand what they taste.",
      "Whether alone at home or with friends at a tasting night.",
    ],
    icon: Wine,
    illustration: "glow",
  },
  {
    id: "problem",
    title: "The Problem",
    subtitle: "Great tastings deserve more than a fading memory.",
    body: [
      "You open a beautiful bottle. You share impressions. You discover something new.",
      "But the next morning? Most of it is gone.",
    ],
    icon: Lightbulb,
    illustration: "pulse",
  },
  {
    id: "solution",
    badge: "The Idea",
    title: "Capture Every Dram",
    body: [
      "CaskSense gives you a simple, beautiful way to record what you taste — nose, palate, finish, and your personal impression.",
      "Every dram becomes a memory you can revisit.",
    ],
    icon: PenLine,
    illustration: "float",
  },
  {
    id: "log",
    badge: "Feature",
    title: "Log a Dram",
    subtitle: "Your personal tasting journal.",
    body: [
      "Scan a bottle or type a name. Rate aroma, taste, and finish on intuitive sliders.",
      "Add personal notes, photos, and tags. Build your whisky diary over time.",
    ],
    icon: BookOpen,
    illustration: "stack",
  },
  {
    id: "scan",
    badge: "Feature",
    title: "Bottle Recognition",
    subtitle: "Point your camera. CaskSense does the rest.",
    body: [
      "AI-powered recognition identifies the bottle from a photo or barcode scan.",
      "Name, distillery, age, ABV — auto-filled in seconds.",
    ],
    icon: Camera,
    illustration: "ring",
  },
  {
    id: "tasting",
    badge: "Feature",
    title: "Host a Tasting",
    subtitle: "Bring structure to your tasting nights.",
    body: [
      "Create a guided or free-form tasting for your group. Share a link or QR code — no app download needed.",
      "Everyone rates in real time. Blind mode keeps it honest.",
    ],
    icon: Users,
    illustration: "group",
  },
  {
    id: "guided",
    badge: "Live Experience",
    title: "Guided Tasting Flow",
    subtitle: "Dram by dram, together.",
    body: [
      "As the host, you control the pace. Reveal whiskies one at a time.",
      "Participants see only what you want them to see — perfect for blind tastings.",
    ],
    icon: Play,
    illustration: "steps",
  },
  {
    id: "results",
    badge: "After the Tasting",
    title: "Tasting Results",
    subtitle: "The reveal is the best part.",
    body: [
      "Compare scores, discover the group favourite, see where opinions diverge.",
      "Export results as PDF, Excel, or share them with the group.",
    ],
    icon: Trophy,
    illustration: "scatter",
  },
  {
    id: "profile",
    badge: "Personal",
    title: "Your Flavour Profile",
    subtitle: "Discover what you really like.",
    body: [
      "Over time, CaskSense builds a radar chart of your preferences — smoky, fruity, sherried, coastal.",
      "It's not about being right. It's about understanding your palate.",
    ],
    icon: Radar,
    illustration: "radar",
  },
  {
    id: "analytics",
    badge: "Insights",
    title: "Taste Analytics",
    subtitle: "Patterns you didn't know you had.",
    body: [
      "How does your taste evolve? Which regions do you prefer? What's your sweet spot for ABV?",
      "Beautiful charts reveal the story behind your ratings.",
    ],
    icon: BarChart3,
    illustration: "wave",
  },
  {
    id: "ai",
    badge: "Intelligence",
    title: "AI-Powered Tools",
    subtitle: "Your personal tasting assistant.",
    body: [
      "Generate tasting notes, get food pairing suggestions, discover similar whiskies.",
      "AI that enhances your vocabulary — not replaces your judgment.",
    ],
    icon: Sparkles,
    illustration: "orbit",
  },
  {
    id: "compare",
    badge: "Social",
    title: "Compare & Connect",
    subtitle: "How does your palate compare?",
    body: [
      "Side-by-side comparisons across tastings and tasters.",
      "Find your taste twins — people who perceive whisky the same way you do.",
    ],
    icon: GitCompareArrows,
    illustration: "grid",
  },
  {
    id: "privacy",
    badge: "Trust",
    title: "Your Data, Your Control",
    subtitle: "Privacy by design.",
    body: [
      "Your ratings are yours. No public profiles unless you choose to share.",
      "Export everything. Delete anytime. Built with respect for your data.",
    ],
    icon: Shield,
    illustration: "spiral",
  },
  {
    id: "start",
    title: "Ready to Begin?",
    subtitle: "Start your whisky journey with CaskSense.",
    body: [
      "No account required to join a tasting. Create a free profile to save your personal data.",
      "Works on any device — phone, tablet, or desktop.",
    ],
    icon: Heart,
    illustration: "glow",
  },
];

const RADAR_INNER_SCALES = [0.72, 0.55, 0.78, 0.45, 0.68, 0.60];

function RadarIllustration() {
  const points = 6;
  const r = 60;
  const getPoint = (i: number, radius: number) => {
    const angle = (Math.PI * 2 * i) / points - Math.PI / 2;
    return { x: 80 + Math.cos(angle) * radius, y: 80 + Math.sin(angle) * radius };
  };
  const outerPath = Array.from({ length: points }, (_, i) => {
    const p = getPoint(i, r);
    return `${i === 0 ? "M" : "L"}${p.x},${p.y}`;
  }).join(" ") + "Z";
  const innerPath = Array.from({ length: points }, (_, i) => {
    const p = getPoint(i, r * RADAR_INNER_SCALES[i]);
    return `${i === 0 ? "M" : "L"}${p.x},${p.y}`;
  }).join(" ") + "Z";

  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      <motion.path d={outerPath} fill="none" stroke={ACCENT_RAW} strokeWidth="0.5" opacity={0.3}
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: "easeOut" }} />
      {[0.33, 0.66].map((s) => (
        <path key={s} d={Array.from({ length: points }, (_, i) => {
          const p = getPoint(i, r * s);
          return `${i === 0 ? "M" : "L"}${p.x},${p.y}`;
        }).join(" ") + "Z"} fill="none" stroke={ACCENT_RAW} strokeWidth="0.5" opacity={0.15} />
      ))}
      <motion.path d={innerPath} fill={`${ACCENT_RAW}15`} stroke={ACCENT_RAW} strokeWidth="1.5"
        initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.5 }} style={{ transformOrigin: "80px 80px" }} />
      {Array.from({ length: points }, (_, i) => {
        const p = getPoint(i, r);
        return <line key={i} x1="80" y1="80" x2={p.x} y2={p.y} stroke={ACCENT_RAW} strokeWidth="0.5" opacity={0.2} />;
      })}
    </svg>
  );
}

function StepsIllustration() {
  const steps = ["1", "2", "3", "4", "5"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {steps.map((s, i) => (
        <motion.div
          key={s}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 + i * 0.15, duration: 0.4, type: "spring" }}
          style={{
            width: 36, height: 36, borderRadius: "50%",
            background: i === 2 ? `${ACCENT_RAW}30` : "transparent",
            border: `1.5px solid ${i <= 2 ? ACCENT_RAW : `${ACCENT_RAW}30`}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 600, fontFamily: font.body,
            color: i <= 2 ? ACCENT_RAW : `${ACCENT_RAW}40`,
          }}
        >
          {s}
        </motion.div>
      ))}
    </div>
  );
}

function GroupIllustration() {
  const positions = [
    { x: 0, y: 0, size: 40, delay: 0.3 },
    { x: 50, y: -15, size: 36, delay: 0.45 },
    { x: 95, y: 5, size: 42, delay: 0.6 },
    { x: 45, y: 35, size: 34, delay: 0.75 },
  ];
  return (
    <div style={{ position: "relative", width: 140, height: 80 }}>
      {positions.map((p, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: p.delay, duration: 0.5 }}
          style={{
            position: "absolute", left: p.x, top: p.y,
            width: p.size, height: p.size, borderRadius: "50%",
            background: `${ACCENT_RAW}${15 + i * 5}`,
            border: `1px solid ${ACCENT_RAW}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Users style={{ width: 16, height: 16, color: ACCENT_RAW, opacity: 0.7 }} strokeWidth={1.5} />
        </motion.div>
      ))}
    </div>
  );
}

function GlowIllustration() {
  return (
    <div style={{ position: "relative", width: 160, height: 160 }}>
      <motion.div
        style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: `radial-gradient(circle, ${ACCENT_RAW}12 0%, transparent 70%)`,
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        style={{
          position: "absolute", inset: 20, borderRadius: "50%",
          border: `1px solid ${ACCENT_RAW}20`,
        }}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        alignItems: "center", justifyContent: "center",
      }}>
        <Wine style={{ width: 36, height: 36, color: ACCENT_RAW, opacity: 0.7 }} strokeWidth={1.2} />
      </div>
    </div>
  );
}

function OrbitIllustration() {
  const items = [Sparkles, Star, Lightbulb, BookOpen];
  return (
    <div style={{ position: "relative", width: 160, height: 160 }}>
      <motion.div
        style={{
          position: "absolute", inset: 10, borderRadius: "50%",
          border: `1px dashed ${ACCENT_RAW}20`,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        {items.map((Icon, i) => {
          const angle = (Math.PI * 2 * i) / items.length;
          const r = 60;
          return (
            <div key={i} style={{
              position: "absolute",
              left: 70 + Math.cos(angle) * r - 12,
              top: 70 + Math.sin(angle) * r - 12,
              width: 24, height: 24,
            }}>
              <Icon style={{ width: 16, height: 16, color: ACCENT_RAW, opacity: 0.6 }} strokeWidth={1.5} />
            </div>
          );
        })}
      </motion.div>
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        alignItems: "center", justifyContent: "center",
      }}>
        <Sparkles style={{ width: 28, height: 28, color: ACCENT_RAW, opacity: 0.8 }} strokeWidth={1.5} />
      </div>
    </div>
  );
}

function StackIllustration() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 140 }}>
      {[0.9, 0.7, 0.5, 0.35].map((w, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 + i * 0.12, duration: 0.5 }}
          style={{
            height: 8, borderRadius: 4,
            width: `${w * 100}%`,
            background: `${ACCENT_RAW}${30 + i * 10}`,
          }}
        />
      ))}
    </div>
  );
}

const WAVE_HEIGHTS = [35, 52, 60, 48, 70, 55, 40, 65, 50, 38, 58, 45];

function WaveIllustration() {
  return (
    <div style={{ display: "flex", alignItems: "end", gap: 4, height: 80 }}>
      {WAVE_HEIGHTS.map((h, i) => {
        return (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: h }}
            transition={{ delay: 0.2 + i * 0.06, duration: 0.6, type: "spring" }}
            style={{
              width: 8, borderRadius: 4,
              background: `${ACCENT_RAW}${25 + Math.floor(i * 4)}`,
            }}
          />
        );
      })}
    </div>
  );
}

function GridIllustration() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, width: 120 }}>
      {Array.from({ length: 9 }, (_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 + i * 0.06, duration: 0.3 }}
          style={{
            width: 36, height: 36, borderRadius: 8,
            background: i % 3 === 1 ? `${ACCENT_RAW}20` : `${ACCENT_RAW}08`,
            border: `1px solid ${ACCENT_RAW}15`,
          }}
        />
      ))}
    </div>
  );
}

function RingIllustration() {
  return (
    <div style={{ position: "relative", width: 140, height: 140 }}>
      {[60, 45, 30].map((r, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 + i * 0.2, duration: 0.6 }}
          style={{
            position: "absolute",
            left: 70 - r, top: 70 - r,
            width: r * 2, height: r * 2,
            borderRadius: "50%",
            border: `1px solid ${ACCENT_RAW}${20 + i * 10}`,
          }}
        />
      ))}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Camera style={{ width: 24, height: 24, color: ACCENT_RAW, opacity: 0.7 }} strokeWidth={1.5} />
      </div>
    </div>
  );
}

function PulseIllustration() {
  return (
    <div style={{ position: "relative", width: 120, height: 120 }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: `1px solid ${ACCENT_RAW}20`,
          }}
          animate={{ scale: [1, 1.4 + i * 0.2, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.8 }}
        />
      ))}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Lightbulb style={{ width: 28, height: 28, color: ACCENT_RAW, opacity: 0.7 }} strokeWidth={1.5} />
      </div>
    </div>
  );
}

function FloatIllustration() {
  return (
    <div style={{ position: "relative", width: 140, height: 100 }}>
      {[
        { x: 10, y: 10, s: 32, d: 0.3 },
        { x: 60, y: 30, s: 40, d: 0.5 },
        { x: 100, y: 5, s: 28, d: 0.7 },
      ].map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: [0, -6, 0] }}
          transition={{ delay: item.d, duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute", left: item.x, top: item.y,
            width: item.s, height: item.s * 1.2, borderRadius: 8,
            background: `${ACCENT_RAW}${10 + i * 6}`,
            border: `1px solid ${ACCENT_RAW}20`,
          }}
        />
      ))}
    </div>
  );
}

const SCATTER_DOTS = [
  { x: 25, y: 35, r: 5 }, { x: 55, y: 20, r: 4 }, { x: 90, y: 50, r: 6 },
  { x: 35, y: 70, r: 3.5 }, { x: 110, y: 30, r: 5 }, { x: 70, y: 65, r: 4.5 },
  { x: 45, y: 45, r: 7 }, { x: 120, y: 75, r: 3 }, { x: 80, y: 15, r: 4 },
  { x: 15, y: 55, r: 5.5 }, { x: 100, y: 60, r: 3.5 }, { x: 60, y: 80, r: 4 },
  { x: 130, y: 45, r: 5 }, { x: 40, y: 25, r: 6 }, { x: 95, y: 85, r: 3.5 },
];

function ScatterIllustration() {
  const dots = SCATTER_DOTS.map((d, i) => ({ ...d, d: 0.2 + i * 0.05 }));
  return (
    <svg width="150" height="100" viewBox="0 0 150 100">
      {dots.map((dot, i) => (
        <motion.circle
          key={i}
          cx={dot.x} cy={dot.y} r={dot.r}
          fill={i < 5 ? `${ACCENT_RAW}50` : `${ACCENT_RAW}20`}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: dot.d, duration: 0.4 }}
        />
      ))}
    </svg>
  );
}

function SpiralIllustration() {
  return (
    <div style={{ position: "relative", width: 140, height: 140 }}>
      <motion.div
        style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          border: `2px solid ${ACCENT_RAW}15`,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        style={{
          position: "absolute", inset: 20, borderRadius: "50%",
          border: `1.5px solid ${ACCENT_RAW}20`,
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Shield style={{ width: 28, height: 28, color: ACCENT_RAW, opacity: 0.6 }} strokeWidth={1.5} />
      </div>
    </div>
  );
}

function Illustration({ type }: { type: Slide["illustration"] }) {
  switch (type) {
    case "radar": return <RadarIllustration />;
    case "steps": return <StepsIllustration />;
    case "group": return <GroupIllustration />;
    case "glow": return <GlowIllustration />;
    case "orbit": return <OrbitIllustration />;
    case "stack": return <StackIllustration />;
    case "wave": return <WaveIllustration />;
    case "grid": return <GridIllustration />;
    case "ring": return <RingIllustration />;
    case "pulse": return <PulseIllustration />;
    case "float": return <FloatIllustration />;
    case "scatter": return <ScatterIllustration />;
    case "spiral": return <SpiralIllustration />;
    default: return null;
  }
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? 300 : -300, opacity: 0 }),
};

export default function GuidedPresentation() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const slide = slides[current];

  const go = useCallback((next: number) => {
    if (next < 0 || next >= slides.length) return;
    setDirection(next > current ? 1 : -1);
    setCurrent(next);
  }, [current]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") go(current + 1);
      if (e.key === "ArrowLeft") go(current - 1);
      if (e.key === "Escape") window.history.back();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current, go]);

  useEffect(() => {
    let startX = 0;
    const onStart = (e: TouchEvent) => { startX = e.touches[0].clientX; };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) go(dx < 0 ? current + 1 : current - 1);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [current, go]);

  const isLast = current === slides.length - 1;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: v.bg,
      display: "flex", flexDirection: "column",
      fontFamily: font.body,
      overflow: "hidden",
      userSelect: "none",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 24px", flexShrink: 0,
      }}>
        <Link href="/" data-testid="button-presentation-close" style={{
          display: "flex", alignItems: "center", gap: 6,
          color: v.muted, fontSize: 13, textDecoration: "none",
          fontFamily: font.body,
        }}>
          <X style={{ width: 18, height: 18 }} strokeWidth={1.5} />
          <span>Close</span>
        </Link>
        <div style={{
          fontSize: 12, color: v.mutedLight, fontFamily: font.body,
          fontVariantNumeric: "tabular-nums",
        }}>
          {current + 1} / {slides.length}
        </div>
      </div>

      <div style={{
        padding: "0 24px", flexShrink: 0,
      }}>
        <div style={{
          display: "flex", gap: 3, maxWidth: 600, margin: "0 auto",
        }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              data-testid={`button-slide-dot-${i}`}
              style={{
                flex: 1, height: 3, borderRadius: 2, border: "none",
                background: i <= current ? v.accent : v.border,
                cursor: "pointer", padding: 0,
                transition: "background 0.3s",
                opacity: i <= current ? 1 : 0.5,
              }}
            />
          ))}
        </div>
      </div>

      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
        padding: "24px",
      }}>
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={slide.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              maxWidth: 560,
              width: "100%",
              gap: 32,
            }}
          >
            <div style={{
              width: 160, height: 160,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Illustration type={slide.illustration} />
            </div>

            <div>
              {slide.badge && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  style={{
                    display: "inline-block",
                    fontSize: 11, fontWeight: 600,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: v.accent,
                    background: alpha(v.accent, "12"),
                    padding: "4px 14px",
                    borderRadius: 20,
                    marginBottom: 16,
                  }}
                >
                  {slide.badge}
                </motion.div>
              )}

              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                style={{
                  fontFamily: font.display,
                  fontSize: "clamp(28px, 5vw, 40px)",
                  fontWeight: 400,
                  color: v.text,
                  lineHeight: 1.15,
                  marginBottom: slide.subtitle ? 10 : 20,
                  letterSpacing: "-0.01em",
                }}
              >
                {slide.title}
              </motion.h2>

              {slide.subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  style={{
                    fontFamily: font.display,
                    fontSize: "clamp(16px, 2vw, 20px)",
                    fontStyle: "italic",
                    color: v.muted,
                    marginBottom: 20,
                    lineHeight: 1.4,
                  }}
                >
                  {slide.subtitle}
                </motion.p>
              )}

              {slide.body.map((p, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + i * 0.1 }}
                  style={{
                    fontSize: "clamp(14px, 1.6vw, 16px)",
                    color: v.mutedLight,
                    lineHeight: 1.7,
                    marginBottom: i < slide.body.length - 1 ? 12 : 0,
                    maxWidth: 480,
                    margin: "0 auto",
                    marginTop: i > 0 ? 12 : 0,
                  }}
                >
                  {p}
                </motion.p>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 24px 32px", flexShrink: 0,
        maxWidth: 560, width: "100%", margin: "0 auto",
      }}>
        <button
          onClick={() => go(current - 1)}
          disabled={current === 0}
          data-testid="button-presentation-prev"
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "10px 20px", borderRadius: 50,
            background: "transparent",
            border: `1px solid ${current === 0 ? v.border : v.accent}`,
            color: current === 0 ? v.muted : v.accent,
            fontSize: 14, fontWeight: 500,
            cursor: current === 0 ? "default" : "pointer",
            fontFamily: font.body,
            opacity: current === 0 ? 0.4 : 1,
            transition: "all 0.2s",
          }}
        >
          <ChevronLeft style={{ width: 16, height: 16 }} />
          Back
        </button>

        {isLast ? (
          <Link
            href="/enter"
            data-testid="button-presentation-start"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "12px 28px", borderRadius: 50,
              background: v.accent, color: v.bg,
              fontSize: 15, fontWeight: 600,
              textDecoration: "none",
              fontFamily: font.body,
            }}
          >
            Open App
            <ChevronRight style={{ width: 16, height: 16 }} />
          </Link>
        ) : (
          <button
            onClick={() => go(current + 1)}
            data-testid="button-presentation-next"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "12px 28px", borderRadius: 50,
              background: v.accent, color: v.bg,
              fontSize: 15, fontWeight: 600, border: "none",
              cursor: "pointer",
              fontFamily: font.body,
              transition: "transform 0.2s",
            }}
          >
            Next
            <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        )}
      </div>
    </div>
  );
}

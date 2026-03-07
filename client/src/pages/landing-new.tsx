import { useRef, useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  ChevronRight, BarChart3, Star, Sparkles,
  Camera, Heart, BookOpen, Download, QrCode, Play,
} from "lucide-react";
import { v } from "@/lib/themeVars";
import heroImage from "@/assets/images/hero-whisky.png";
import { generateCaskSensePresentation } from "@/components/casksense-presentation-pdf";

const ACCENT = "#c8a97e";
const ACCENT_DIM = "#a8834a";

const font = {
  display: "'Playfair Display', Georgia, 'Times New Roman', serif",
  body: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
};

const container: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "0 24px",
};

function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

function HeroSection() {
  return (
    <section style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      position: "relative",
      overflow: "hidden",
      padding: "80px 24px",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse 80% 60% at 50% 40%, ${ACCENT}08 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <motion.div
        style={{
          position: "absolute", width: 600, height: 600, borderRadius: "50%",
          background: `radial-gradient(circle, ${ACCENT}06 0%, transparent 70%)`,
          top: "20%", left: "50%", transform: "translateX(-50%)", pointerEvents: "none",
        }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <FadeUp>
        <div style={{ width: "min(420px, 80vw)", marginBottom: -24, position: "relative", zIndex: 1 }}>
          <img src={heroImage} alt="" style={{
            width: "100%", height: "auto", display: "block", objectFit: "cover",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 45%, black 30%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 45%, black 30%, transparent 75%)",
            opacity: 0.45,
          }} />
        </div>
      </FadeUp>

      <FadeUp delay={0.1}>
        <div style={{
          fontSize: 13, fontFamily: font.body, fontWeight: 500,
          letterSpacing: "0.15em", textTransform: "uppercase",
          color: v.accent, marginBottom: 24, position: "relative", zIndex: 2,
        }}>
          Whisky Tasting Platform
        </div>
      </FadeUp>

      <FadeUp delay={0.15}>
        <h1 style={{
          fontFamily: font.display, fontSize: "clamp(48px, 8vw, 88px)",
          fontWeight: 400, color: v.text, letterSpacing: "-0.02em",
          lineHeight: 1.05, marginBottom: 24,
        }}>
          CaskSense
        </h1>
      </FadeUp>

      <FadeUp delay={0.3}>
        <p style={{
          fontFamily: font.display, fontSize: "clamp(18px, 2.5vw, 26px)",
          fontWeight: 400, fontStyle: "italic", color: v.muted,
          marginBottom: 16, letterSpacing: "0.01em",
        }}>
          Where tasting becomes reflection.
        </p>
      </FadeUp>

      <FadeUp delay={0.45}>
        <p style={{
          fontFamily: font.body, fontSize: "clamp(15px, 1.6vw, 18px)",
          color: v.mutedLight, lineHeight: 1.6, maxWidth: 420,
          margin: "0 auto 48px",
        }}>
          The most thoughtful way to explore whisky — alone or together.
        </p>
      </FadeUp>

      <FadeUp delay={0.6}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <a
            href="#demo-section"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("demo-section")?.scrollIntoView({ behavior: "smooth" });
            }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              padding: "18px 48px", background: v.accent, color: v.bg,
              fontFamily: font.body, fontSize: 17, fontWeight: 600,
              borderRadius: 50, textDecoration: "none",
              transition: "transform 0.2s, box-shadow 0.2s",
              cursor: "pointer",
            }}
            data-testid="link-hero-demo"
          >
            Try the Demo <ChevronRight style={{ width: 18, height: 18 }} />
          </a>
          <Link href="/m2" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 0",
            fontFamily: font.body, fontSize: 14, fontWeight: 400,
            color: v.muted, textDecoration: "none",
            transition: "color 0.2s",
          }} data-testid="link-hero-start">
            Start Tasting →
          </Link>
        </div>
      </FadeUp>

      <motion.div
        style={{ position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)" }}
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <div style={{
          width: 28, height: 44, borderRadius: 14,
          border: `2px solid ${v.border}`,
          display: "flex", justifyContent: "center", paddingTop: 8,
        }}>
          <div style={{ width: 3, height: 8, borderRadius: 2, background: v.muted }} />
        </div>
      </motion.div>
    </section>
  );
}

const pillars = [
  {
    icon: <QrCode style={{ width: 22, height: 22 }} />,
    title: "Join",
    sub: "Scan a QR code. You're in.",
  },
  {
    icon: <Play style={{ width: 22, height: 22 }} />,
    title: "Host",
    sub: "Create a blind tasting in 60 seconds.",
  },
  {
    icon: <BookOpen style={{ width: 22, height: 22 }} />,
    title: "Solo",
    sub: "Log a dram. Build your journal.",
  },
  {
    icon: <BarChart3 style={{ width: 22, height: 22 }} />,
    title: "Analyse",
    sub: "Your flavor profile grows with every sip.",
  },
  {
    icon: <Camera style={{ width: 22, height: 22 }} />,
    title: "AI",
    sub: "Point your camera. We identify the bottle.",
  },
  {
    icon: <Heart style={{ width: 22, height: 22 }} />,
    title: "Circle",
    sub: "Find your Taste Twins. Compare palates.",
  },
];

function PillarsSection() {
  return (
    <section style={{ padding: "100px 24px" }}>
      <div style={container}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2 style={{
              fontFamily: font.display, fontSize: "clamp(28px, 4vw, 44px)",
              fontWeight: 400, color: v.text, letterSpacing: "-0.02em",
              lineHeight: 1.15, marginBottom: 16,
            }}>
              Everything you need.
            </h2>
            <p style={{ fontFamily: font.body, fontSize: 16, color: v.muted }}>
              Six ways to explore whisky — together or alone.
            </p>
          </div>
        </FadeUp>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20, maxWidth: 940, margin: "0 auto",
        }}>
          {pillars.map((p, i) => (
            <FadeUp key={p.title} delay={0.06 + i * 0.06}>
              <div style={{
                background: v.card, border: `1px solid ${v.border}`,
                borderRadius: 14, padding: "28px 24px",
              }} data-testid={`card-pillar-${p.title.toLowerCase()}`}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `${ACCENT}10`, display: "flex",
                  alignItems: "center", justifyContent: "center",
                  color: ACCENT, marginBottom: 16,
                }}>{p.icon}</div>
                <h3 style={{
                  fontFamily: font.display, fontSize: 22, fontWeight: 500,
                  color: v.text, marginBottom: 8, letterSpacing: "-0.01em",
                }}>{p.title}</h3>
                <p style={{ fontFamily: font.body, fontSize: 13, color: v.muted, lineHeight: 1.6 }}>
                  {p.sub}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

const REVEAL_NAME = "Talisker 10";

function RevealSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setCharCount(i);
      if (i >= REVEAL_NAME.length) clearInterval(interval);
    }, 120);
    return () => clearInterval(interval);
  }, [inView]);

  return (
    <section style={{ padding: "100px 24px" }} ref={ref}>
      <div style={{ ...container, maxWidth: 640, textAlign: "center" }}>
        <FadeUp>
          <p style={{
            fontFamily: font.body, fontSize: 14, fontWeight: 500,
            letterSpacing: "0.1em", textTransform: "uppercase",
            color: ACCENT_DIM, marginBottom: 24,
          }}>
            The Reveal Moment
          </p>
          <h2 style={{
            fontFamily: font.display, fontSize: "clamp(26px, 4vw, 40px)",
            fontWeight: 400, color: v.text, letterSpacing: "-0.02em",
            lineHeight: 1.2, marginBottom: 40,
          }}>
            Then the host reveals the whisky.
          </h2>
        </FadeUp>

        <FadeUp delay={0.15}>
          <div style={{
            background: v.card, border: `1px solid ${v.border}`,
            borderRadius: 20, padding: "48px 32px",
          }} data-testid="reveal-card">
            <div style={{
              fontFamily: font.body, fontSize: 12, fontWeight: 500,
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: v.muted, marginBottom: 16,
            }}>
              It was...
            </div>
            <div style={{
              fontFamily: font.display,
              fontSize: "clamp(36px, 6vw, 56px)",
              fontWeight: 400,
              color: v.text,
              letterSpacing: "-0.02em",
              minHeight: "1.2em",
            }} data-testid="text-reveal">
              {inView ? REVEAL_NAME.slice(0, charCount) : ""}
              {inView && charCount < REVEAL_NAME.length && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  style={{ color: ACCENT }}
                >|</motion.span>
              )}
            </div>
            <motion.div
              initial={{ width: 0 }}
              animate={inView ? { width: "60%" } : {}}
              transition={{ duration: 1.5, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{
                height: 1, margin: "24px auto 0",
                background: `linear-gradient(90deg, transparent, ${ACCENT}40, transparent)`,
              }}
            />
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

function DemoSection() {
  const [aroma, setAroma] = useState(65);
  const [flavor, setFlavor] = useState(72);
  const [finish, setFinish] = useState(58);
  const [revealed, setRevealed] = useState(false);

  const overall = Math.round((aroma + flavor + finish) / 3);

  return (
    <section id="demo-section" style={{ padding: "100px 24px" }}>
      <div style={{ ...container, maxWidth: 480, textAlign: "center" }}>
        <FadeUp>
          <h2 style={{
            fontFamily: font.display, fontSize: "clamp(28px, 4vw, 44px)",
            fontWeight: 400, color: v.text, letterSpacing: "-0.02em",
            lineHeight: 1.15, marginBottom: 16,
          }}>
            Try it yourself.
          </h2>
          <p style={{ fontFamily: font.body, fontSize: 16, color: v.muted, marginBottom: 40 }}>
            Rate a mystery dram. Then reveal the bottle.
          </p>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div style={{
            background: v.card, border: `1px solid ${v.border}`,
            borderRadius: 20, padding: "32px 28px", textAlign: "left",
          }} data-testid="demo-container">

            {[
              { label: "Aroma", value: aroma, set: setAroma },
              { label: "Flavor", value: flavor, set: setFlavor },
              { label: "Finish", value: finish, set: setFinish },
            ].map((s) => (
              <div key={s.label} style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontFamily: font.body, fontSize: 14, fontWeight: 500, color: v.text }}>
                    {s.label}
                  </span>
                  <span style={{ fontFamily: font.display, fontSize: 18, fontWeight: 500, color: ACCENT }}>
                    {s.value}
                  </span>
                </div>
                <input
                  type="range" min="0" max="100"
                  value={s.value}
                  onChange={(e) => { s.set(Number(e.target.value)); setRevealed(false); }}
                  aria-label={s.label}
                  data-testid={`slider-${s.label.toLowerCase()}`}
                  style={{ width: "100%", height: 4, cursor: "pointer" }}
                />
              </div>
            ))}

            <div style={{
              textAlign: "center", padding: "16px 0 8px",
              borderTop: `1px solid ${v.border}`, marginTop: 8,
            }}>
              <div style={{ fontFamily: font.body, fontSize: 12, color: v.muted, marginBottom: 4 }}>
                Overall
              </div>
              <div style={{
                fontFamily: font.display, fontSize: 36, fontWeight: 400, color: ACCENT,
              }} data-testid="text-demo-overall">
                {overall}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setRevealed(true)}
              style={{
                width: "100%", padding: "14px", marginTop: 16,
                borderRadius: 12, border: "none",
                background: revealed ? `${ACCENT}15` : v.accent,
                color: revealed ? ACCENT : v.bg,
                fontFamily: font.body, fontSize: 15, fontWeight: 600,
                cursor: "pointer", transition: "all 0.3s",
              }}
              data-testid="button-reveal-demo"
            >
              {revealed ? "Revealed!" : "Reveal the whisky"}
            </button>

            <Link
              href="/m2/tastings/join/DEMO"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", padding: "14px", marginTop: 12,
                borderRadius: 12, border: `1px solid ${ACCENT}30`,
                background: "transparent",
                color: ACCENT,
                fontFamily: font.body, fontSize: 15, fontWeight: 600,
                cursor: "pointer", transition: "all 0.3s",
                textDecoration: "none",
              }}
              data-testid="link-demo-tasting"
            >
              <Sparkles style={{ width: 16, height: 16 }} />
              Try the full Demo Tasting
            </Link>

            <AnimatePresence>
              {revealed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.4 }}
                  style={{ overflow: "hidden" }}
                >
                  <div style={{ textAlign: "center", padding: "24px 0 8px" }}>
                    <div style={{ fontFamily: font.body, fontSize: 12, color: v.muted, marginBottom: 4 }}>
                      It was...
                    </div>
                    <div style={{
                      fontFamily: font.display, fontSize: 28, fontWeight: 400,
                      color: v.text, marginBottom: 6,
                    }}>
                      Ardbeg Uigeadail
                    </div>
                    <div style={{ fontFamily: font.body, fontSize: 13, color: v.muted }}>
                      Islay · 54.2% ABV · Non-chill filtered
                    </div>
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      marginTop: 16, padding: "8px 16px", borderRadius: 8,
                      background: `${ACCENT}12`, border: `1px solid ${ACCENT}25`,
                    }}>
                      <Star style={{ width: 14, height: 14, color: ACCENT }} />
                      <span style={{ fontFamily: font.body, fontSize: 13, fontWeight: 600, color: ACCENT }}>
                        Your score: {overall}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

function CTASection() {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await generateCaskSensePresentation();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section style={{ padding: "100px 24px 80px", textAlign: "center" }}>
      <div style={container}>
        <FadeUp>
          <h2 style={{
            fontFamily: font.display, fontSize: "clamp(28px, 4vw, 48px)",
            fontWeight: 400, color: v.text, letterSpacing: "-0.02em",
            lineHeight: 1.15, marginBottom: 40,
          }}>
            Start your next tasting.
          </h2>
        </FadeUp>
        <FadeUp delay={0.15}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <Link href="/m2" style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              padding: "18px 48px", background: v.accent, color: v.bg,
              fontFamily: font.body, fontSize: 17, fontWeight: 600,
              borderRadius: 50, textDecoration: "none",
              transition: "transform 0.2s, box-shadow 0.2s",
            }} data-testid="cta-start">
              Open CaskSense <ChevronRight style={{ width: 18, height: 18 }} />
            </Link>
            <Link href="/m2/tastings/join/DEMO" style={{
              fontFamily: font.body, fontSize: 14, fontWeight: 400,
              color: v.muted, textDecoration: "none",
            }} data-testid="cta-demo">
              or jump straight into the demo →
            </Link>
          </div>
        </FadeUp>

        <FadeUp delay={0.3}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 24, marginTop: 40, flexWrap: "wrap",
          }}>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "10px 20px", borderRadius: 10,
                background: "transparent", border: `1px solid ${v.border}`,
                color: v.muted, fontFamily: font.body, fontSize: 13, fontWeight: 500,
                cursor: downloading ? "not-allowed" : "pointer",
                opacity: downloading ? 0.5 : 1,
                transition: "all 0.2s",
              }}
              data-testid="button-download-presentation"
            >
              <Download style={{ width: 14, height: 14 }} />
              {downloading ? "Creating PDF..." : "Download Presentation"}
            </button>
            <Link href="/presentation" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontFamily: font.body, fontSize: 13, fontWeight: 500,
              color: v.muted, textDecoration: "none",
            }} data-testid="cta-explore">
              Explore all features <ChevronRight style={{ width: 14, height: 14 }} />
            </Link>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ padding: "40px 24px", textAlign: "center", borderTop: `1px solid ${v.border}` }}>
      <div style={container}>
        <p style={{ fontFamily: font.body, fontSize: 13, color: v.mutedLight }}>
          CaskSense — Where tasting becomes reflection.
        </p>
        <div style={{ display: "flex", gap: 24, justifyContent: "center", marginTop: 12 }}>
          <Link href="/impressum" data-testid="link-footer-impressum" style={{ fontFamily: font.body, fontSize: 12, color: v.muted, textDecoration: "none" }}>Impressum</Link>
          <Link href="/privacy" data-testid="link-footer-privacy" style={{ fontFamily: font.body, fontSize: 12, color: v.muted, textDecoration: "none" }}>Privacy</Link>
        </div>
      </div>
    </footer>
  );
}

export default function LandingNew() {
  return (
    <div style={{
      background: v.bg, color: v.text,
      minHeight: "100dvh", overflowX: "hidden",
    }}>
      <style>{`
        input[type="range"] { -webkit-appearance: none; appearance: none; height: 4px; border-radius: 2px; background: ${v.border}; outline: none; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 22px; height: 22px; border-radius: 50%; background: ${ACCENT}; cursor: pointer; border: 2px solid ${v.bg}; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
        input[type="range"]::-moz-range-thumb { width: 22px; height: 22px; border-radius: 50%; background: ${ACCENT}; cursor: pointer; border: 2px solid ${v.bg}; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
      `}</style>
      <HeroSection />
      <PillarsSection />
      <RevealSection />
      <DemoSection />
      <CTASection />
      <Footer />
    </div>
  );
}

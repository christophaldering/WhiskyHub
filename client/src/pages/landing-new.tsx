import { useRef, useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  ChevronRight, EyeOff, BarChart3, Star,
  ClipboardList, Camera, Heart, BookOpen, Download,
} from "lucide-react";
import { v } from "@/lib/themeVars";
import heroImage from "@/assets/images/hero-whisky.png";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
} from "recharts";
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
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
            <Link href="/presentation" data-testid="link-hero-tour" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "16px 40px", background: v.accent, color: v.bg,
              fontFamily: font.body, fontSize: 16, fontWeight: 600,
              borderRadius: 50, textDecoration: "none",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}>
              Explore Features <ChevronRight style={{ width: 18, height: 18 }} />
            </Link>
            <Link href="/m2" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "16px 40px", background: "transparent", color: v.accent,
              fontFamily: font.body, fontSize: 16, fontWeight: 500,
              borderRadius: 50, textDecoration: "none",
              border: `1px solid ${v.border}`, transition: "border-color 0.2s",
            }} data-testid="link-hero-start">
              Start Tasting
            </Link>
          </div>
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

function FlowSection() {
  const stages = [
    { num: "01", word: "Gather", sub: "Invite friends. Join via QR code." },
    { num: "02", word: "Pour", sub: "Blind. No labels. No bias." },
    { num: "03", word: "Reflect", sub: "Rate nose, taste, finish, balance." },
    { num: "04", word: "Reveal", sub: "The host unveils the bottle." },
    { num: "05", word: "Discover", sub: "See who loved what — and why." },
  ];

  return (
    <section style={{ padding: "120px 24px" }}>
      <div style={container}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 72 }}>
            <h2 style={{
              fontFamily: font.display, fontSize: "clamp(28px, 4vw, 44px)",
              fontWeight: 400, color: v.text, letterSpacing: "-0.02em",
              lineHeight: 1.15, marginBottom: 16,
            }}>
              Five stages. One experience.
            </h2>
            <p style={{ fontFamily: font.body, fontSize: 16, color: v.muted }}>
              Every CaskSense tasting follows the same elegant flow.
            </p>
          </div>
        </FadeUp>

        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          gap: 0, flexWrap: "wrap",
        }}>
          {stages.map((s, i) => (
            <FadeUp key={s.num} delay={0.06 + i * 0.08}>
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                textAlign: "center", width: 160, padding: "0 8px",
              }}>
                <div style={{
                  fontFamily: font.body, fontSize: 11, fontWeight: 600,
                  letterSpacing: "0.12em", color: ACCENT_DIM, marginBottom: 12,
                }}>{s.num}</div>
                <div style={{
                  fontFamily: font.display, fontSize: 26, fontWeight: 400,
                  color: v.text, marginBottom: 10, letterSpacing: "-0.01em",
                }}>{s.word}</div>
                <div style={{
                  width: 40, height: 1, marginBottom: 10,
                  background: `linear-gradient(90deg, transparent, ${ACCENT}35, transparent)`,
                }} />
                <p style={{
                  fontFamily: font.body, fontSize: 13, color: v.muted,
                  lineHeight: 1.5, maxWidth: 140,
                }}>{s.sub}</p>
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
    <section style={{ padding: "120px 24px" }} ref={ref}>
      <div style={{ ...container, maxWidth: 700, textAlign: "center" }}>
        <FadeUp>
          <h2 style={{
            fontFamily: font.display, fontSize: "clamp(28px, 4vw, 44px)",
            fontWeight: 400, color: v.text, letterSpacing: "-0.02em",
            lineHeight: 1.15, marginBottom: 32,
          }}>
            The moment everyone waits for.
          </h2>
        </FadeUp>

        <FadeUp delay={0.1}>
          <p style={{
            fontFamily: font.body, fontSize: "clamp(15px, 1.8vw, 18px)",
            color: v.muted, lineHeight: 1.8, maxWidth: 480,
            margin: "0 auto 56px",
          }}>
            The expensive dram loses. The unknown one wins.
            CaskSense captures that moment — and shows the ranking instantly.
          </p>
        </FadeUp>

        <div style={{
          padding: "40px 24px", borderRadius: 16,
          background: v.card, border: `1px solid ${v.border}`,
          display: "inline-block", minWidth: 280,
        }}>
          <div style={{
            fontFamily: font.body, fontSize: 12, fontWeight: 600,
            letterSpacing: "0.1em", textTransform: "uppercase",
            color: ACCENT_DIM, marginBottom: 16,
          }}>
            The winner is...
          </div>
          <div style={{
            fontFamily: font.display, fontSize: "clamp(32px, 5vw, 48px)",
            fontWeight: 400, color: v.text, letterSpacing: "-0.01em",
            minHeight: 56,
          }} data-testid="text-reveal-name">
            {REVEAL_NAME.slice(0, charCount)}
            {charCount < REVEAL_NAME.length && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                style={{ color: ACCENT }}
              >|</motion.span>
            )}
          </div>
          {charCount >= REVEAL_NAME.length && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{
                fontFamily: font.body, fontSize: 14, color: v.muted, marginTop: 12,
              }}
            >
              Isle of Skye · 45.8% · Score: 91
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

const radarData = [
  { axis: "Nose", value: 82 },
  { axis: "Taste", value: 88 },
  { axis: "Finish", value: 75 },
  { axis: "Balance", value: 80 },
  { axis: "Overall", value: 85 },
];

function CoreFeaturesSection() {
  return (
    <section style={{ padding: "120px 24px" }}>
      <div style={container}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{
              fontFamily: font.display, fontSize: "clamp(28px, 4vw, 44px)",
              fontWeight: 400, color: v.text, letterSpacing: "-0.02em",
              lineHeight: 1.15, marginBottom: 16,
            }}>
              What CaskSense does.
            </h2>
            <p style={{ fontFamily: font.body, fontSize: 16, color: v.muted }}>
              Three features that change how you taste whisky.
            </p>
          </div>
        </FadeUp>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 24, maxWidth: 1000, margin: "0 auto",
        }}>
          <FadeUp delay={0.1}>
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.25 }}
              style={{
                background: v.card, border: `1px solid ${v.border}`,
                borderRadius: 16, padding: "36px 28px", cursor: "default",
              }}
              data-testid="card-core-blind"
            >
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: `${ACCENT}10`, display: "flex",
                alignItems: "center", justifyContent: "center",
                color: ACCENT, marginBottom: 20,
              }}>
                <EyeOff style={{ width: 24, height: 24 }} />
              </div>
              <h3 style={{
                fontFamily: font.display, fontSize: 22, fontWeight: 500,
                color: v.text, marginBottom: 10,
              }}>Blind Flights</h3>
              <p style={{ fontFamily: font.body, fontSize: 14, color: v.muted, lineHeight: 1.6 }}>
                Four-stage reveal: number → name → details → bottle image.
                Discover what people really think — without the label bias.
              </p>
            </motion.div>
          </FadeUp>

          <FadeUp delay={0.2}>
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.25 }}
              style={{
                background: v.card, border: `1px solid ${v.border}`,
                borderRadius: 16, padding: "36px 28px", cursor: "default",
              }}
              data-testid="card-core-rating"
            >
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: `${ACCENT}10`, display: "flex",
                alignItems: "center", justifyContent: "center",
                color: ACCENT, marginBottom: 20,
              }}>
                <ClipboardList style={{ width: 24, height: 24 }} />
              </div>
              <h3 style={{
                fontFamily: font.display, fontSize: 22, fontWeight: 500,
                color: v.text, marginBottom: 10,
              }}>Live Rating</h3>
              <p style={{ fontFamily: font.body, fontSize: 14, color: v.muted, lineHeight: 1.6 }}>
                Nose, taste, finish, balance — plus flavor chips and voice notes.
                Everyone rates. The host reveals. The discussion begins.
              </p>
            </motion.div>
          </FadeUp>

          <FadeUp delay={0.3}>
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.25 }}
              style={{
                background: v.card, border: `1px solid ${v.border}`,
                borderRadius: 16, padding: "36px 28px", cursor: "default",
              }}
              data-testid="card-core-profile"
            >
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: `${ACCENT}10`, display: "flex",
                alignItems: "center", justifyContent: "center",
                color: ACCENT, marginBottom: 20,
              }}>
                <BarChart3 style={{ width: 24, height: 24 }} />
              </div>
              <h3 style={{
                fontFamily: font.display, fontSize: 22, fontWeight: 500,
                color: v.text, marginBottom: 10,
              }}>Your Taste Profile</h3>
              <div style={{ width: "100%", height: 180, marginBottom: 12 }}>
                <ResponsiveContainer>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="65%">
                    <PolarGrid stroke={`${ACCENT}20`} />
                    <PolarAngleAxis dataKey="axis" tick={{ fill: v.muted, fontSize: 11, fontFamily: font.body }} />
                    <Radar dataKey="value" stroke={ACCENT} fill={ACCENT} fillOpacity={0.15} strokeWidth={1.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <p style={{ fontFamily: font.body, fontSize: 14, color: v.muted, lineHeight: 1.6 }}>
                A personal flavor profile that grows with every dram you taste.
                Compare yourself to friends or the global community.
              </p>
            </motion.div>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}

function SurprisesSection() {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await generateCaskSensePresentation();
    } finally {
      setDownloading(false);
    }
  };

  const surprises = [
    {
      icon: <Camera style={{ width: 22, height: 22 }} />,
      title: "AI Bottle Recognition",
      text: "Point your camera at any bottle. CaskSense identifies the whisky, fills in every detail, and estimates the market price.",
    },
    {
      icon: <Heart style={{ width: 22, height: 22 }} />,
      title: "Taste Twins",
      text: "Discover who in your circle shares your palate. A correlation engine that matches your ratings with your friends'.",
    },
    {
      icon: <BookOpen style={{ width: 22, height: 22 }} />,
      title: "Whisky Journal",
      text: "Every dram you taste — solo or in a group — becomes part of your personal archive. With AI-generated tasting notes.",
    },
  ];

  return (
    <section style={{ padding: "120px 24px" }}>
      <div style={container}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{
              fontFamily: font.display, fontSize: "clamp(28px, 4vw, 44px)",
              fontWeight: 400, color: v.text, letterSpacing: "-0.02em",
              lineHeight: 1.15, marginBottom: 16,
            }}>
              What surprises you.
            </h2>
            <p style={{ fontFamily: font.body, fontSize: 16, color: v.muted }}>
              Beyond the tasting — features you didn't expect.
            </p>
          </div>
        </FadeUp>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20, maxWidth: 920, margin: "0 auto 48px",
        }}>
          {surprises.map((s, i) => (
            <FadeUp key={s.title} delay={0.1 + i * 0.08}>
              <div style={{
                background: v.card, border: `1px solid ${v.border}`,
                borderRadius: 14, padding: "28px 24px",
              }} data-testid={`card-surprise-${i}`}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `${ACCENT}10`, display: "flex",
                  alignItems: "center", justifyContent: "center",
                  color: ACCENT, marginBottom: 16,
                }}>{s.icon}</div>
                <h3 style={{
                  fontFamily: font.display, fontSize: 18, fontWeight: 500,
                  color: v.text, marginBottom: 8,
                }}>{s.title}</h3>
                <p style={{ fontFamily: font.body, fontSize: 13, color: v.muted, lineHeight: 1.6 }}>
                  {s.text}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>

        <FadeUp delay={0.4}>
          <div style={{
            textAlign: "center", padding: "32px 24px",
            background: v.card, border: `1px solid ${v.border}`,
            borderRadius: 16, maxWidth: 520, margin: "0 auto",
          }}>
            <div style={{
              fontFamily: font.display, fontSize: 20, fontWeight: 500,
              color: v.text, marginBottom: 8,
            }}>
              42+ features in total.
            </div>
            <p style={{
              fontFamily: font.body, fontSize: 14, color: v.muted,
              lineHeight: 1.6, marginBottom: 20, maxWidth: 380, margin: "0 auto 20px",
            }}>
              From AI tasting notes to collection analysis, from community insights to guided mode — download the complete feature overview.
            </p>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "12px 28px", borderRadius: 10,
                background: `${ACCENT}15`, border: `1px solid ${ACCENT}30`,
                color: ACCENT, fontFamily: font.body, fontSize: 14, fontWeight: 600,
                cursor: downloading ? "not-allowed" : "pointer",
                opacity: downloading ? 0.6 : 1,
                transition: "all 0.2s",
              }}
              data-testid="button-download-presentation"
            >
              <Download style={{ width: 16, height: 16 }} />
              {downloading ? "Creating PDF..." : "Download Feature Presentation (PDF)"}
            </button>
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
    <section style={{ padding: "120px 24px" }}>
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
  return (
    <section style={{ padding: "120px 24px 80px", textAlign: "center" }}>
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
          <Link href="/m2" style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "18px 48px", background: v.accent, color: v.bg,
            fontFamily: font.body, fontSize: 17, fontWeight: 600,
            borderRadius: 50, textDecoration: "none",
            transition: "transform 0.2s, box-shadow 0.2s",
          }} data-testid="cta-start">
            Open CaskSense <ChevronRight style={{ width: 18, height: 18 }} />
          </Link>
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
      <FlowSection />
      <CoreFeaturesSection />
      <DemoSection />
      <RevealSection />
      <SurprisesSection />
      <CTASection />
      <Footer />
    </div>
  );
}

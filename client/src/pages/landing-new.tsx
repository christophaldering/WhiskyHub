import { useRef, useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  ChevronRight, EyeOff, BarChart3, Sparkles, Wine,
  Users, Star, Trophy, ClipboardList,
} from "lucide-react";
import { v } from "@/lib/themeVars";
import i18n from "i18next";
import heroImage from "@/assets/images/hero-whisky.png";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
} from "recharts";

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
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

function SectionHeadline({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: font.display,
      fontSize: "clamp(28px, 4vw, 48px)",
      fontWeight: 400,
      color: v.text,
      lineHeight: 1.15,
      letterSpacing: "-0.02em",
      marginBottom: 24,
    }}>
      {children}
    </h2>
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
        position: "absolute",
        inset: 0,
        background: `radial-gradient(ellipse 80% 60% at 50% 40%, ${ACCENT}08 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <motion.div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${ACCENT}06 0%, transparent 70%)`,
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          pointerEvents: "none",
        }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <FadeUp>
        <div style={{
          width: "min(420px, 80vw)",
          marginBottom: -24,
          position: "relative",
          zIndex: 1,
        }}>
          <img
            src={heroImage}
            alt=""
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              objectFit: "cover",
              maskImage: "radial-gradient(ellipse 70% 60% at 50% 45%, black 30%, transparent 75%)",
              WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 45%, black 30%, transparent 75%)",
              opacity: 0.45,
            }}
          />
        </div>
      </FadeUp>

      <FadeUp delay={0.1}>
        <div style={{
          fontSize: 13,
          fontFamily: font.body,
          fontWeight: 500,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: v.accent,
          marginBottom: 24,
          position: "relative",
          zIndex: 2,
        }}>
          Whisky Tasting Platform
        </div>
      </FadeUp>

      <FadeUp delay={0.15}>
        <h1 style={{
          fontFamily: font.display,
          fontSize: "clamp(48px, 8vw, 88px)",
          fontWeight: 400,
          color: v.text,
          letterSpacing: "-0.02em",
          lineHeight: 1.05,
          marginBottom: 24,
        }}>
          CaskSense
        </h1>
      </FadeUp>

      <FadeUp delay={0.3}>
        <p style={{
          fontFamily: font.display,
          fontSize: "clamp(18px, 2.5vw, 26px)",
          fontWeight: 400,
          fontStyle: "italic",
          color: v.muted,
          marginBottom: 16,
          letterSpacing: "0.01em",
        }}>
          Where tasting becomes reflection.
        </p>
      </FadeUp>

      <FadeUp delay={0.45}>
        <p style={{
          fontFamily: font.body,
          fontSize: "clamp(15px, 1.6vw, 18px)",
          color: v.mutedLight,
          lineHeight: 1.6,
          maxWidth: 420,
          margin: "0 auto 48px",
        }}>
          The most thoughtful way to explore whisky — alone or together.
        </p>
      </FadeUp>

      <FadeUp delay={0.6}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/tasting" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "14px 36px",
            background: v.accent,
            color: v.bg,
            fontFamily: font.body,
            fontSize: 15,
            fontWeight: 600,
            borderRadius: 50,
            textDecoration: "none",
            transition: "transform 0.2s, box-shadow 0.2s",
          }} data-testid="link-hero-open-app">
            Open App <ChevronRight style={{ width: 16, height: 16 }} />
          </Link>
          <Link href="/presentation" data-testid="link-hero-presentation" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "14px 36px",
            background: "transparent",
            color: v.accent,
            fontFamily: font.body,
            fontSize: 15,
            fontWeight: 500,
            borderRadius: 50,
            textDecoration: "none",
            border: `1px solid ${v.border}`,
            transition: "border-color 0.2s",
          }}>
            Guided Tour
          </Link>
          <Link href="/landing-v2" data-testid="link-hero-landing-v2" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "14px 36px",
            background: "transparent",
            color: v.mutedLight,
            fontFamily: font.body,
            fontSize: 14,
            fontWeight: 500,
            borderRadius: 50,
            textDecoration: "none",
            border: `1px solid ${v.border}`,
            transition: "border-color 0.2s",
          }}>
            Interactive Version
          </Link>
          <Link href="/m2" data-testid="link-hero-module2" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "14px 36px",
            background: "transparent",
            color: v.accent,
            fontFamily: font.body,
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 50,
            textDecoration: "none",
            border: `2px solid ${v.accent}`,
            transition: "border-color 0.2s, background 0.2s",
          }}>
            {i18n.language === "de" ? "Modul 2 testen (05.03.26)" : "Try Module 2 (05.03.26)"}
          </Link>
        </div>
      </FadeUp>

      <motion.div
        style={{
          position: "absolute",
          bottom: 40,
          left: "50%",
          transform: "translateX(-50%)",
        }}
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <div style={{
          width: 28,
          height: 44,
          borderRadius: 14,
          border: `2px solid ${v.border}`,
          display: "flex",
          justifyContent: "center",
          paddingTop: 8,
        }}>
          <div style={{
            width: 3,
            height: 8,
            borderRadius: 2,
            background: v.muted,
          }} />
        </div>
      </motion.div>
    </section>
  );
}

function DiscoverySection() {
  const cards = [
    {
      icon: <EyeOff style={{ width: 28, height: 28 }} />,
      title: "Blind Flights",
      text: "Serve whiskies blind and discover what people really think.",
    },
    {
      icon: <BarChart3 style={{ width: 28, height: 28 }} />,
      title: "Live Scoring",
      text: "Everyone rates each dram. Flavor, balance, finish and overall score.",
    },
    {
      icon: <Sparkles style={{ width: 28, height: 28 }} />,
      title: "The Reveal",
      text: "Once ratings are locked the host reveals the bottle. That's when the discussion begins.",
    },
  ];

  return (
    <section style={{ padding: "120px 24px", textAlign: "center" }}>
      <div style={container}>
        <FadeUp>
          <SectionHeadline>
            Turn every whisky tasting<br />into a discovery.
          </SectionHeadline>
        </FadeUp>
        <FadeUp delay={0.1}>
          <p style={{
            fontFamily: font.body,
            fontSize: "clamp(15px, 1.8vw, 18px)",
            color: v.muted,
            lineHeight: 1.8,
            maxWidth: 520,
            margin: "0 auto 64px",
            whiteSpace: "pre-line",
          }}>
            {"Blind flights.\nLive scoring.\nUnexpected winners.\n\nAnd the moment when the room realizes\nthey all loved the same dram."}
          </p>
        </FadeUp>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 24,
          maxWidth: 960,
          margin: "0 auto",
        }}>
          {cards.map((card, i) => (
            <FadeUp key={card.title} delay={0.15 + i * 0.1}>
              <motion.div
                whileHover={{ y: -6, boxShadow: `0 20px 60px ${ACCENT}12` }}
                transition={{ duration: 0.3 }}
                style={{
                  background: v.card,
                  border: `1px solid ${v.border}`,
                  borderRadius: 16,
                  padding: "40px 32px",
                  textAlign: "left",
                  cursor: "default",
                  transition: "border-color 0.3s",
                }}
                data-testid={`card-feature-${i}`}
              >
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: `${ACCENT}12`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: ACCENT,
                  marginBottom: 24,
                }}>
                  {card.icon}
                </div>
                <h3 style={{
                  fontFamily: font.display,
                  fontSize: 22,
                  fontWeight: 500,
                  color: v.text,
                  marginBottom: 12,
                }}>
                  {card.title}
                </h3>
                <p style={{
                  fontFamily: font.body,
                  fontSize: 15,
                  color: v.muted,
                  lineHeight: 1.6,
                }}>
                  {card.text}
                </p>
              </motion.div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

function TastingFlowSection() {
  const steps = [
    { num: "01", label: "Host a tasting", icon: <Users style={{ width: 22, height: 22 }} /> },
    { num: "02", label: "Pour blind", icon: <EyeOff style={{ width: 22, height: 22 }} /> },
    { num: "03", label: "Rate together", icon: <Star style={{ width: 22, height: 22 }} /> },
    { num: "04", label: "Reveal the dram", icon: <Sparkles style={{ width: 22, height: 22 }} /> },
    { num: "05", label: "See the results", icon: <Trophy style={{ width: 22, height: 22 }} /> },
  ];

  return (
    <section style={{ padding: "120px 24px", overflow: "hidden" }}>
      <div style={container}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <SectionHeadline>The perfect tasting flow</SectionHeadline>
          </div>
        </FadeUp>

        <div style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 0,
          overflowX: "auto",
          paddingBottom: 16,
          scrollbarWidth: "none",
        }}>
          {steps.map((step, i) => (
            <FadeUp key={step.num} delay={0.1 + i * 0.12}>
              <div style={{
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
              }}>
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  minWidth: 160,
                  padding: "0 8px",
                }}>
                  <motion.div
                    whileHover={{ scale: 1.08 }}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: "50%",
                      border: `2px solid ${ACCENT}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: ACCENT,
                      marginBottom: 16,
                      background: `${ACCENT}08`,
                    }}
                    data-testid={`step-flow-${i}`}
                  >
                    {step.icon}
                  </motion.div>
                  <div style={{
                    fontFamily: font.body,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    color: ACCENT_DIM,
                    marginBottom: 6,
                  }}>
                    {step.num}
                  </div>
                  <div style={{
                    fontFamily: font.display,
                    fontSize: 16,
                    fontWeight: 500,
                    color: v.text,
                    lineHeight: 1.3,
                  }}>
                    {step.label}
                  </div>
                </div>

                {i < steps.length - 1 && (
                  <div style={{
                    width: 48,
                    height: 1,
                    background: `linear-gradient(90deg, ${ACCENT}40, ${ACCENT}10)`,
                    flexShrink: 0,
                    marginTop: -24,
                  }} />
                )}
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

function RevealMomentSection() {
  return (
    <section style={{ padding: "120px 24px" }}>
      <div style={{ ...container, maxWidth: 800, textAlign: "center" }}>
        <FadeUp>
          <SectionHeadline>The moment everyone waits for</SectionHeadline>
        </FadeUp>
        <FadeUp delay={0.1}>
          <p style={{
            fontFamily: font.body,
            fontSize: "clamp(16px, 1.8vw, 19px)",
            color: v.muted,
            lineHeight: 1.8,
            maxWidth: 560,
            margin: "0 auto 56px",
            whiteSpace: "pre-line",
          }}>
            {"In many tastings the favorite bottle surprises everyone.\n\nThe expensive dram loses.\nThe unknown one wins.\n\nCaskSense captures that moment\nand shows the ranking instantly."}
          </p>
        </FadeUp>

        <FadeUp delay={0.2}>
          <div style={{
            position: "relative",
            width: 200,
            height: 240,
            margin: "0 auto",
          }}>
            <svg viewBox="0 0 200 240" fill="none" style={{ width: "100%", height: "100%" }}>
              <defs>
                <linearGradient id="glassGrad" x1="100" y1="0" x2="100" y2="240" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity="0.05" />
                </linearGradient>
              </defs>
              <path d="M70 220 L65 100 Q65 60 100 50 Q135 60 135 100 L130 220 Z" fill="url(#glassGrad)" stroke={ACCENT} strokeWidth="1" strokeOpacity="0.4" />
              <ellipse cx="100" cy="50" rx="35" ry="8" fill="none" stroke={ACCENT} strokeWidth="1" strokeOpacity="0.3" />
              <line x1="100" y1="220" x2="100" y2="235" stroke={ACCENT} strokeWidth="1.5" strokeOpacity="0.3" />
              <ellipse cx="100" cy="237" rx="28" ry="3" fill="none" stroke={ACCENT} strokeWidth="1" strokeOpacity="0.25" />
              <motion.ellipse
                cx="100" cy="90" rx="20" ry="4"
                fill={ACCENT}
                fillOpacity="0.15"
                animate={{ ry: [3, 5, 3], fillOpacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
            </svg>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

const radarData = [
  { axis: "Smoke", value: 72 },
  { axis: "Fruit", value: 88 },
  { axis: "Spice", value: 65 },
  { axis: "Vanilla", value: 80 },
  { axis: "Honey", value: 75 },
  { axis: "Floral", value: 45 },
];

const rankingData = [
  { rank: 1, name: "Talisker 10", score: 91 },
  { rank: 2, name: "Ardbeg Uigeadail", score: 88 },
  { rank: 3, name: "Glenfiddich 18", score: 85 },
];

const flavorChips = ["Honey", "Smoke", "Vanilla", "Dark Fruit", "Citrus", "Toffee", "Pepper", "Oak"];

function AnalyticsSection() {
  return (
    <section style={{ padding: "120px 24px" }}>
      <div style={container}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <SectionHeadline>Understand your whisky taste</SectionHeadline>
            <p style={{
              fontFamily: font.body,
              fontSize: "clamp(15px, 1.6vw, 18px)",
              color: v.muted,
              lineHeight: 1.7,
              maxWidth: 480,
              margin: "0 auto",
              whiteSpace: "pre-line",
            }}>
              {"Over time CaskSense learns what you love.\n\nNot just ratings.\nYour personal whisky taste profile."}
            </p>
          </div>
        </FadeUp>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 24,
          maxWidth: 960,
          margin: "0 auto",
        }}>
          <FadeUp delay={0.1}>
            <div style={{
              background: v.card,
              border: `1px solid ${v.border}`,
              borderRadius: 16,
              padding: 32,
            }} data-testid="card-analytics-radar">
              <h3 style={{ fontFamily: font.display, fontSize: 18, fontWeight: 500, color: v.text, marginBottom: 24 }}>
                Flavor Profile
              </h3>
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke={`${ACCENT}20`} />
                    <PolarAngleAxis
                      dataKey="axis"
                      tick={{ fill: v.muted, fontSize: 11, fontFamily: font.body }}
                    />
                    <Radar
                      dataKey="value"
                      stroke={ACCENT}
                      fill={ACCENT}
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </FadeUp>

          <FadeUp delay={0.2}>
            <div style={{
              background: v.card,
              border: `1px solid ${v.border}`,
              borderRadius: 16,
              padding: 32,
            }} data-testid="card-analytics-ranking">
              <h3 style={{ fontFamily: font.display, fontSize: 18, fontWeight: 500, color: v.text, marginBottom: 24 }}>
                Top Ranking
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {rankingData.map((item) => (
                  <div key={item.rank} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: item.rank === 1 ? `${ACCENT}20` : `${v.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: font.display, fontSize: 14, fontWeight: 600,
                      color: item.rank === 1 ? ACCENT : v.muted,
                    }}>
                      {item.rank}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: font.body, fontSize: 14, fontWeight: 500, color: v.text }}>
                        {item.name}
                      </div>
                    </div>
                    <div style={{
                      fontFamily: font.display, fontSize: 20, fontWeight: 500,
                      color: item.rank === 1 ? ACCENT : v.text,
                    }}>
                      {item.score}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>

          <FadeUp delay={0.3}>
            <div style={{
              background: v.card,
              border: `1px solid ${v.border}`,
              borderRadius: 16,
              padding: 32,
            }} data-testid="card-analytics-flavors">
              <h3 style={{ fontFamily: font.display, fontSize: 18, fontWeight: 500, color: v.text, marginBottom: 24 }}>
                Your Flavors
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {flavorChips.map((chip, i) => (
                  <motion.span
                    key={chip}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 * i, duration: 0.3 }}
                    viewport={{ once: true }}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 20,
                      fontSize: 13,
                      fontFamily: font.body,
                      fontWeight: 500,
                      background: i < 3 ? `${ACCENT}18` : `${v.border}`,
                      color: i < 3 ? ACCENT : v.muted,
                      border: `1px solid ${i < 3 ? `${ACCENT}30` : v.border}`,
                    }}
                  >
                    {chip}
                  </motion.span>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}

function GuidedTourSection() {
  const steps = [
    {
      num: "1",
      title: "Host a tasting",
      text: "Choose whiskies and invite your friends.",
      icon: <Users style={{ width: 24, height: 24 }} />,
    },
    {
      num: "2",
      title: "Rate the drams",
      text: "Participants score aroma, flavor, balance and finish.",
      icon: <ClipboardList style={{ width: 24, height: 24 }} />,
    },
    {
      num: "3",
      title: "Reveal the whisky",
      text: "The host reveals the bottle.",
      icon: <Sparkles style={{ width: 24, height: 24 }} />,
    },
    {
      num: "4",
      title: "See the ranking",
      text: "Instant results and surprising winners.",
      icon: <Trophy style={{ width: 24, height: 24 }} />,
    },
  ];

  return (
    <section style={{ padding: "120px 24px" }}>
      <div style={container}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <SectionHeadline>How a tasting works</SectionHeadline>
          </div>
        </FadeUp>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 32,
          maxWidth: 1000,
          margin: "0 auto",
        }}>
          {steps.map((step, i) => (
            <FadeUp key={step.num} delay={0.1 + i * 0.1}>
              <div style={{ textAlign: "center" }} data-testid={`step-tour-${i}`}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: `${ACCENT}10`,
                  border: `1px solid ${ACCENT}25`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: ACCENT,
                  margin: "0 auto 20px",
                }}>
                  {step.icon}
                </div>
                <div style={{
                  fontFamily: font.body,
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  color: ACCENT_DIM,
                  marginBottom: 8,
                  textTransform: "uppercase",
                }}>
                  Step {step.num}
                </div>
                <h3 style={{
                  fontFamily: font.display,
                  fontSize: 20,
                  fontWeight: 500,
                  color: v.text,
                  marginBottom: 8,
                }}>
                  {step.title}
                </h3>
                <p style={{
                  fontFamily: font.body,
                  fontSize: 14,
                  color: v.muted,
                  lineHeight: 1.5,
                }}>
                  {step.text}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

const DEMO_WHISKIES = [
  { name: "Dram A", color: "#c8a97e" },
  { name: "Dram B", color: "#a8834a" },
  { name: "Dram C", color: "#e0b36a" },
];

const DEMO_SCORES = [
  [82, 78, 85],
  [90, 88, 76],
  [85, 91, 80],
];

const DEMO_REVEAL = ["Talisker 10", "Lagavulin 16", "Oban 14"];

function MicroDemoSection() {
  const [phase, setPhase] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (!inView) return;
    const timer = setInterval(() => {
      setPhase((p) => (p + 1) % 5);
    }, 2500);
    return () => clearInterval(timer);
  }, [inView]);

  const phaseLabels = ["Pouring...", "Rating...", "Scores updating...", "Revealing...", "Final ranking"];

  return (
    <section style={{ padding: "120px 24px" }} ref={ref}>
      <div style={{ ...container, maxWidth: 600, textAlign: "center" }}>
        <FadeUp>
          <div style={{
            fontSize: 12,
            fontFamily: font.body,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: ACCENT_DIM,
            marginBottom: 12,
          }}>
            Live Preview
          </div>
          <SectionHeadline>See it in action</SectionHeadline>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div style={{
            background: v.card,
            border: `1px solid ${v.border}`,
            borderRadius: 20,
            padding: "32px 24px",
            marginTop: 32,
            minHeight: 280,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }} data-testid="demo-container">
            <div style={{
              fontFamily: font.body,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: ACCENT,
              marginBottom: 24,
            }}>
              {phaseLabels[phase]}
            </div>

            <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap", justifyContent: "center" }}>
              {DEMO_WHISKIES.map((w, i) => (
                <div key={i} style={{ textAlign: "center", minWidth: 100 }}>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${i}-${phase}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.4 }}
                    >
                      <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: `${w.color}${phase >= 1 ? "30" : "15"}`,
                        border: `1px solid ${w.color}${phase >= 3 ? "60" : "25"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 8px",
                        transition: "all 0.5s",
                      }}>
                        <Wine style={{
                          width: 20, height: 20,
                          color: w.color,
                          opacity: phase === 0 ? 0.4 : 1,
                          transition: "opacity 0.4s",
                        }} />
                      </div>

                      <div style={{
                        fontFamily: font.body,
                        fontSize: 13,
                        fontWeight: 500,
                        color: phase >= 3 ? v.text : v.muted,
                        marginBottom: 4,
                        transition: "color 0.4s",
                      }}>
                        {phase >= 3 ? DEMO_REVEAL[i] : w.name}
                      </div>

                      {phase >= 1 && phase <= 4 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          style={{
                            fontFamily: font.display,
                            fontSize: 22,
                            fontWeight: 500,
                            color: phase === 4 && i === 1 ? ACCENT : v.text,
                          }}
                        >
                          {phase === 1 ? "..." : DEMO_SCORES[i][phase >= 2 ? 2 : 1]}
                        </motion.div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {phase === 4 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 20px",
                  borderRadius: 12,
                  background: `${ACCENT}15`,
                  border: `1px solid ${ACCENT}30`,
                }}
              >
                <Trophy style={{ width: 16, height: 16, color: ACCENT }} />
                <span style={{ fontFamily: font.body, fontSize: 14, fontWeight: 600, color: ACCENT }}>
                  Winner: Lagavulin 16
                </span>
              </motion.div>
            )}

            <div style={{ display: "flex", gap: 6, marginTop: 20 }}>
              {[0, 1, 2, 3, 4].map((p) => (
                <div
                  key={p}
                  style={{
                    width: phase === p ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: phase === p ? ACCENT : `${ACCENT}30`,
                    transition: "all 0.3s",
                  }}
                />
              ))}
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

function CTASection() {
  const btnBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "16px 32px",
    fontFamily: font.body,
    fontSize: 15,
    fontWeight: 600,
    borderRadius: 50,
    textDecoration: "none",
    transition: "transform 0.2s, box-shadow 0.2s",
    cursor: "pointer",
    border: "none",
  };

  return (
    <section style={{ padding: "120px 24px 80px", textAlign: "center" }}>
      <div style={container}>
        <FadeUp>
          <SectionHeadline>Ready for your next tasting?</SectionHeadline>
        </FadeUp>
        <FadeUp delay={0.15}>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginTop: 40 }}>
            <Link href="/tasting" style={{ ...btnBase, background: v.accent, color: v.bg }} data-testid="cta-host">
              Host a tasting <ChevronRight style={{ width: 16, height: 16 }} />
            </Link>
            <Link href="/tasting" style={{ ...btnBase, background: "transparent", color: v.accent, border: `1px solid ${v.accent}` }} data-testid="cta-join">
              Join a tasting
            </Link>
            <Link href="/tasting" style={{ ...btnBase, background: "transparent", color: v.muted, border: `1px solid ${v.border}` }} data-testid="cta-log">
              Log a dram
            </Link>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{
      padding: "40px 24px",
      textAlign: "center",
      borderTop: `1px solid ${v.border}`,
    }}>
      <div style={container}>
        <p style={{
          fontFamily: font.body,
          fontSize: 13,
          color: v.mutedLight,
        }}>
          CaskSense — Where tasting becomes reflection.
        </p>
        <div style={{
          display: "flex",
          gap: 24,
          justifyContent: "center",
          marginTop: 12,
        }}>
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
      background: v.bg,
      color: v.text,
      minHeight: "100dvh",
      overflowX: "hidden",
    }}>
      <HeroSection />
      <DiscoverySection />
      <TastingFlowSection />
      <RevealMomentSection />
      <AnalyticsSection />
      <GuidedTourSection />
      <MicroDemoSection />
      <CTASection />
      <Footer />
    </div>
  );
}

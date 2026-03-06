import { useRef, useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  ChevronRight, EyeOff, BarChart3, Sparkles, Wine,
  Users, Star, Trophy, ClipboardList, BookOpen, Layers,
  PenLine, Radar as RadarIcon, UserCheck, Download,
  FileText, Presentation, Heart, Search,
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
      transition={{ duration: 0.8, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
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

function Divider() {
  return (
    <div style={{
      width: 48,
      height: 1,
      background: `linear-gradient(90deg, transparent, ${ACCENT}40, transparent)`,
      margin: "0 auto",
    }} />
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
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "14px 36px", background: v.accent, color: v.bg,
            fontFamily: font.body, fontSize: 15, fontWeight: 600,
            borderRadius: 50, textDecoration: "none",
            transition: "transform 0.2s, box-shadow 0.2s",
          }} data-testid="link-hero-open-app">
            Open App <ChevronRight style={{ width: 16, height: 16 }} />
          </Link>
          <Link href="/presentation" data-testid="link-hero-presentation" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "14px 36px", background: "transparent", color: v.accent,
            fontFamily: font.body, fontSize: 15, fontWeight: 500,
            borderRadius: 50, textDecoration: "none",
            border: `1px solid ${v.border}`, transition: "border-color 0.2s",
          }}>
            Guided Tour
          </Link>
          <Link href="/landing-v2" data-testid="link-hero-landing-v2" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "14px 36px", background: "transparent", color: v.mutedLight,
            fontFamily: font.body, fontSize: 14, fontWeight: 500,
            borderRadius: 50, textDecoration: "none",
            border: `1px solid ${v.border}`, transition: "border-color 0.2s",
          }}>
            Interactive Version
          </Link>
          <Link href="/m2" data-testid="link-hero-module2" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "14px 36px", background: "transparent", color: v.accent,
            fontFamily: font.body, fontSize: 14, fontWeight: 600,
            borderRadius: 50, textDecoration: "none",
            border: `2px solid ${v.accent}`,
            transition: "border-color 0.2s, background 0.2s",
          }}>
            {i18n.language === "de" ? "Modul 2 testen (05.03.26)" : "Try Module 2 (05.03.26)"}
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

function QuietTableSection() {
  return (
    <section style={{ padding: "120px 24px" }}>
      <div style={{ ...container, maxWidth: 800, textAlign: "center" }}>
        <FadeUp>
          <SectionHeadline>Every whisky tasting deserves structure.</SectionHeadline>
        </FadeUp>
        <FadeUp delay={0.1}>
          <p style={{
            fontFamily: font.body,
            fontSize: "clamp(15px, 1.8vw, 18px)",
            color: v.muted,
            lineHeight: 1.9,
            maxWidth: 540,
            margin: "0 auto 48px",
            whiteSpace: "pre-line",
          }}>
            {"Most tastings drift.\n\nNotes are lost.\nOpinions fade.\nGreat bottles disappear into memory.\n\nCaskSense turns a tasting into an experience\nworth remembering."}
          </p>
        </FadeUp>
        <FadeUp delay={0.2}>
          <div style={{ display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
            {[
              { icon: <Wine style={{ width: 24, height: 24 }} />, label: "Glencairn glasses" },
              { icon: <PenLine style={{ width: 24, height: 24 }} />, label: "Tasting notes" },
              { icon: <BarChart3 style={{ width: 24, height: 24 }} />, label: "Live analytics" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 * i, duration: 0.6 }}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
                  padding: "24px 20px", borderRadius: 16,
                  background: v.card, border: `1px solid ${v.border}`,
                  minWidth: 140,
                }}
              >
                <div style={{ color: ACCENT }}>{item.icon}</div>
                <span style={{ fontFamily: font.body, fontSize: 13, color: v.muted, fontWeight: 500 }}>
                  {item.label}
                </span>
              </motion.div>
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

function TastingFlowSection() {
  const stages = [
    { num: "01", title: "Gather", text: "Invite your friends.\nEveryone joins the tasting.\n\nQR code entry supported.", icon: <Users style={{ width: 22, height: 22 }} /> },
    { num: "02", title: "Pour", text: "The host pours the dram.\n\nBlind.\n\nNo labels.\nNo expectations.", icon: <Wine style={{ width: 22, height: 22 }} /> },
    { num: "03", title: "Reflect", text: "Participants rate the whisky.\n\nAroma · Flavor · Balance\nFinish · Overall", icon: <ClipboardList style={{ width: 22, height: 22 }} /> },
    { num: "04", title: "Reveal", text: "The host reveals the bottle.\n\nGasps.\nLaughter.\nDebate.", icon: <Sparkles style={{ width: 22, height: 22 }} /> },
    { num: "05", title: "Discover", text: "The ranking appears.\n\nSometimes the legend wins.\nSometimes the outsider.", icon: <Trophy style={{ width: 22, height: 22 }} /> },
  ];

  return (
    <section style={{ padding: "120px 24px", overflow: "hidden" }}>
      <div style={container}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <SectionHeadline>What happens in a CaskSense tasting</SectionHeadline>
          </div>
        </FadeUp>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
        }}>
          {stages.map((stage, i) => (
            <FadeUp key={stage.num} delay={0.08 + i * 0.1}>
              <div style={{
                background: v.card,
                border: `1px solid ${v.border}`,
                borderRadius: 16,
                padding: "32px 24px",
                textAlign: "center",
                position: "relative",
                minHeight: 240,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }} data-testid={`stage-flow-${i}`}>
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  style={{
                    width: 56, height: 56, borderRadius: "50%",
                    border: `1.5px solid ${ACCENT}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: ACCENT, marginBottom: 16,
                    background: `${ACCENT}08`,
                  }}
                >
                  {stage.icon}
                </motion.div>
                <div style={{
                  fontFamily: font.body, fontSize: 11, fontWeight: 600,
                  letterSpacing: "0.1em", color: ACCENT_DIM, marginBottom: 8,
                }}>
                  {stage.num}
                </div>
                <h3 style={{
                  fontFamily: font.display, fontSize: 20, fontWeight: 500,
                  color: v.text, marginBottom: 12,
                }}>
                  {stage.title}
                </h3>
                <p style={{
                  fontFamily: font.body, fontSize: 13, color: v.muted,
                  lineHeight: 1.6, whiteSpace: "pre-line", flex: 1,
                }}>
                  {stage.text}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

function RevealSection() {
  return (
    <section style={{ padding: "120px 24px" }}>
      <div style={{ ...container, maxWidth: 800, textAlign: "center" }}>
        <FadeUp>
          <SectionHeadline>The reveal changes everything.</SectionHeadline>
        </FadeUp>
        <FadeUp delay={0.1}>
          <p style={{
            fontFamily: font.body,
            fontSize: "clamp(15px, 1.8vw, 18px)",
            color: v.muted,
            lineHeight: 1.9,
            maxWidth: 520,
            margin: "0 auto 56px",
            whiteSpace: "pre-line",
          }}>
            {"Great tastings are not about being right.\n\nThey are about discovering how different\nour perceptions are.\n\nCaskSense captures that moment\nand turns it into insight."}
          </p>
        </FadeUp>
        <FadeUp delay={0.2}>
          <div style={{ position: "relative", width: 180, height: 220, margin: "0 auto" }}>
            <svg viewBox="0 0 180 220" fill="none" style={{ width: "100%", height: "100%" }}>
              <defs>
                <linearGradient id="revealGlass" x1="90" y1="0" x2="90" y2="220" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity="0.03" />
                </linearGradient>
              </defs>
              <path d="M60 200 L56 90 Q56 52 90 42 Q124 52 124 90 L120 200 Z" fill="url(#revealGlass)" stroke={ACCENT} strokeWidth="0.8" strokeOpacity="0.35" />
              <ellipse cx="90" cy="42" rx="34" ry="7" fill="none" stroke={ACCENT} strokeWidth="0.8" strokeOpacity="0.25" />
              <line x1="90" y1="200" x2="90" y2="212" stroke={ACCENT} strokeWidth="1.2" strokeOpacity="0.25" />
              <ellipse cx="90" cy="214" rx="24" ry="3" fill="none" stroke={ACCENT} strokeWidth="0.8" strokeOpacity="0.2" />
              <motion.ellipse
                cx="90" cy="80" rx="18" ry="3.5"
                fill={ACCENT} fillOpacity="0.12"
                animate={{ ry: [2.5, 4.5, 2.5], fillOpacity: [0.08, 0.18, 0.08] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
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

function TasteIntelligenceSection() {
  return (
    <section style={{ padding: "120px 24px" }}>
      <div style={container}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <SectionHeadline>Understand your whisky taste.</SectionHeadline>
          </div>
        </FadeUp>
        <FadeUp delay={0.05}>
          <p style={{
            fontFamily: font.body, fontSize: "clamp(15px, 1.6vw, 17px)",
            color: v.muted, lineHeight: 1.8, maxWidth: 460,
            margin: "0 auto 56px", textAlign: "center", whiteSpace: "pre-line",
          }}>
            {"Over time CaskSense learns your palate.\n\nWhich distilleries you love.\nWhich casks surprise you.\nWhich friends share your taste."}
          </p>
        </FadeUp>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 24, maxWidth: 960, margin: "0 auto",
        }}>
          <FadeUp delay={0.1}>
            <div style={{
              background: v.card, border: `1px solid ${v.border}`,
              borderRadius: 16, padding: 32,
            }} data-testid="card-taste-radar">
              <h3 style={{ fontFamily: font.display, fontSize: 18, fontWeight: 500, color: v.text, marginBottom: 24 }}>
                Flavor Profile
              </h3>
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke={`${ACCENT}20`} />
                    <PolarAngleAxis dataKey="axis" tick={{ fill: v.muted, fontSize: 11, fontFamily: font.body }} />
                    <Radar dataKey="value" stroke={ACCENT} fill={ACCENT} fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </FadeUp>

          <FadeUp delay={0.2}>
            <div style={{
              background: v.card, border: `1px solid ${v.border}`,
              borderRadius: 16, padding: 32,
            }} data-testid="card-taste-ranking">
              <h3 style={{ fontFamily: font.display, fontSize: 18, fontWeight: 500, color: v.text, marginBottom: 24 }}>
                Top Ranking
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {rankingData.map((item) => (
                  <div key={item.rank} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: item.rank === 1 ? `${ACCENT}20` : v.border,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: font.display, fontSize: 14, fontWeight: 600,
                      color: item.rank === 1 ? ACCENT : v.muted,
                    }}>{item.rank}</div>
                    <div style={{ flex: 1, fontFamily: font.body, fontSize: 14, fontWeight: 500, color: v.text }}>
                      {item.name}
                    </div>
                    <div style={{ fontFamily: font.display, fontSize: 20, fontWeight: 500, color: item.rank === 1 ? ACCENT : v.text }}>
                      {item.score}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>

          <FadeUp delay={0.3}>
            <div style={{
              background: v.card, border: `1px solid ${v.border}`,
              borderRadius: 16, padding: 32,
            }} data-testid="card-taste-flavors">
              <h3 style={{ fontFamily: font.display, fontSize: 18, fontWeight: 500, color: v.text, marginBottom: 24 }}>
                Your Flavors
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {flavorChips.map((chip, i) => (
                  <motion.span
                    key={chip}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.04 * i, duration: 0.3 }}
                    viewport={{ once: true }}
                    style={{
                      padding: "8px 16px", borderRadius: 20, fontSize: 13,
                      fontFamily: font.body, fontWeight: 500,
                      background: i < 3 ? `${ACCENT}18` : v.border,
                      color: i < 3 ? ACCENT : v.muted,
                      border: `1px solid ${i < 3 ? `${ACCENT}30` : v.border}`,
                    }}
                  >{chip}</motion.span>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}

function ConnoisseurFeatures() {
  const features = [
    { icon: <EyeOff style={{ width: 22, height: 22 }} />, title: "Blind Flight Engine", text: "Structure tastings into flights." },
    { icon: <Layers style={{ width: 22, height: 22 }} />, title: "Multi-Stage Reveal", text: "Reveal information step by step." },
    { icon: <PenLine style={{ width: 22, height: 22 }} />, title: "Deep Tasting Notes", text: "Capture aroma, flavor, balance and finish." },
    { icon: <BookOpen style={{ width: 22, height: 22 }} />, title: "Personal Whisky Journal", text: "Build a long-term tasting archive." },
    { icon: <Users style={{ width: 22, height: 22 }} />, title: "Community Insights", text: "Compare results with your tasting group." },
  ];

  return (
    <section style={{ padding: "120px 24px" }}>
      <div style={container}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <SectionHeadline>Designed for connoisseurs.</SectionHeadline>
          </div>
        </FadeUp>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 20, maxWidth: 960, margin: "0 auto",
        }}>
          {features.map((f, i) => (
            <FadeUp key={f.title} delay={0.08 + i * 0.08}>
              <motion.div
                whileHover={{ y: -4, borderColor: `${ACCENT}40` }}
                transition={{ duration: 0.25 }}
                style={{
                  background: v.card, border: `1px solid ${v.border}`,
                  borderRadius: 14, padding: "28px 24px",
                  cursor: "default", transition: "border-color 0.3s",
                }}
                data-testid={`card-connoisseur-${i}`}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `${ACCENT}10`, display: "flex",
                  alignItems: "center", justifyContent: "center",
                  color: ACCENT, marginBottom: 16,
                }}>{f.icon}</div>
                <h3 style={{ fontFamily: font.display, fontSize: 17, fontWeight: 500, color: v.text, marginBottom: 8 }}>
                  {f.title}
                </h3>
                <p style={{ fontFamily: font.body, fontSize: 13, color: v.muted, lineHeight: 1.5 }}>
                  {f.text}
                </p>
              </motion.div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

function GuidedTourSection() {
  const steps = [
    { num: "1", title: "Create a tasting", icon: <Users style={{ width: 22, height: 22 }} /> },
    { num: "2", title: "Participants rate the dram", icon: <ClipboardList style={{ width: 22, height: 22 }} /> },
    { num: "3", title: "Host reveals the bottle", icon: <Sparkles style={{ width: 22, height: 22 }} /> },
    { num: "4", title: "Ranking appears", icon: <Trophy style={{ width: 22, height: 22 }} /> },
  ];

  return (
    <section style={{ padding: "120px 24px" }}>
      <div style={container}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <SectionHeadline>Walk through a tasting.</SectionHeadline>
          </div>
        </FadeUp>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 32, maxWidth: 960, margin: "0 auto",
        }}>
          {steps.map((step, i) => (
            <FadeUp key={step.num} delay={0.1 + i * 0.12}>
              <div style={{ textAlign: "center" }} data-testid={`step-tour-${i}`}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: `${ACCENT}10`, border: `1px solid ${ACCENT}20`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: ACCENT, margin: "0 auto 16px",
                }}>{step.icon}</div>
                <div style={{
                  fontFamily: font.body, fontSize: 11, fontWeight: 600,
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  color: ACCENT_DIM, marginBottom: 8,
                }}>Step {step.num}</div>
                <h3 style={{ fontFamily: font.display, fontSize: 18, fontWeight: 500, color: v.text }}>
                  {step.title}
                </h3>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

function InteractiveDemoSection() {
  const [aroma, setAroma] = useState(50);
  const [flavor, setFlavor] = useState(50);
  const [finish, setFinish] = useState(50);
  const [revealed, setRevealed] = useState(false);

  const overall = Math.round((aroma + flavor + finish) / 3);

  const sliderStyle: React.CSSProperties = {
    width: "100%", height: 4, appearance: "none" as const,
    background: v.border, borderRadius: 2, outline: "none",
    cursor: "pointer",
  };

  return (
    <section style={{ padding: "120px 24px" }}>
      <div style={{ ...container, maxWidth: 520, textAlign: "center" }}>
        <FadeUp>
          <div style={{
            fontSize: 12, fontFamily: font.body, fontWeight: 600,
            letterSpacing: "0.1em", textTransform: "uppercase",
            color: ACCENT_DIM, marginBottom: 12,
          }}>Try it now</div>
          <SectionHeadline>Rate a sample dram.</SectionHeadline>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div style={{
            background: v.card, border: `1px solid ${v.border}`,
            borderRadius: 20, padding: "32px 28px", marginTop: 32,
            textAlign: "left",
          }} data-testid="demo-interactive">
            <div style={{
              fontFamily: font.display, fontSize: 16, fontWeight: 500,
              color: v.muted, marginBottom: 4, textAlign: "center",
            }}>
              Mystery Dram
            </div>
            <div style={{
              fontFamily: font.body, fontSize: 12, color: v.mutedLight,
              textAlign: "center", marginBottom: 32,
            }}>
              Rate this whisky blindly
            </div>

            {[
              { label: "Aroma", value: aroma, set: setAroma },
              { label: "Flavor", value: flavor, set: setFlavor },
              { label: "Finish", value: finish, set: setFinish },
            ].map((s) => (
              <div key={s.label} style={{ marginBottom: 24 }}>
                <div style={{
                  display: "flex", justifyContent: "space-between", marginBottom: 8,
                }}>
                  <span style={{ fontFamily: font.body, fontSize: 13, fontWeight: 500, color: v.text }}>
                    {s.label}
                  </span>
                  <span style={{ fontFamily: font.display, fontSize: 16, fontWeight: 500, color: ACCENT }}>
                    {s.value}
                  </span>
                </div>
                <input
                  type="range" min="0" max="100"
                  value={s.value}
                  onChange={(e) => { s.set(Number(e.target.value)); setRevealed(false); }}
                  style={sliderStyle}
                  aria-label={s.label}
                  data-testid={`slider-${s.label.toLowerCase()}`}
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
              <div style={{ fontFamily: font.display, fontSize: 32, fontWeight: 500, color: ACCENT }}>
                {overall}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setRevealed(true)}
              style={{
                width: "100%", padding: "14px", marginTop: 20,
                borderRadius: 12, border: "none",
                background: revealed ? `${ACCENT}15` : v.accent,
                color: revealed ? ACCENT : v.bg,
                fontFamily: font.body, fontSize: 14, fontWeight: 600,
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
                  <div style={{
                    textAlign: "center", padding: "24px 0 8px",
                  }}>
                    <div style={{ fontFamily: font.body, fontSize: 12, color: v.muted, marginBottom: 4 }}>
                      It was...
                    </div>
                    <div style={{ fontFamily: font.display, fontSize: 24, fontWeight: 500, color: v.text, marginBottom: 4 }}>
                      Talisker 10
                    </div>
                    <div style={{ fontFamily: font.body, fontSize: 13, color: v.muted }}>
                      Isle of Skye · 45.8% ABV · Maritime single malt
                    </div>
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      marginTop: 12, padding: "8px 16px", borderRadius: 8,
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

function CompanionSection() {
  return (
    <section style={{ padding: "120px 24px" }}>
      <div style={{ ...container, maxWidth: 700, textAlign: "center" }}>
        <FadeUp>
          <SectionHeadline>Explore whisky alone.</SectionHeadline>
        </FadeUp>
        <FadeUp delay={0.1}>
          <p style={{
            fontFamily: font.body, fontSize: "clamp(15px, 1.8vw, 18px)",
            color: v.muted, lineHeight: 1.9, maxWidth: 440,
            margin: "0 auto", whiteSpace: "pre-line",
          }}>
            {"Not every whisky needs a tasting.\n\nSometimes it is just you.\n\nA quiet evening.\nA single dram.\n\nCaskSense captures those moments too."}
          </p>
        </FadeUp>
      </div>
    </section>
  );
}

function CircleSection() {
  const features = [
    { title: "Taste Twins", text: "Find friends who taste like you.", icon: <Heart style={{ width: 20, height: 20 }} /> },
    { title: "Community Rankings", text: "See how the group ranked each dram.", icon: <BarChart3 style={{ width: 20, height: 20 }} /> },
    { title: "Shared Tastings", text: "Browse past tastings together.", icon: <Users style={{ width: 20, height: 20 }} /> },
  ];

  return (
    <section style={{ padding: "120px 24px" }}>
      <div style={container}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <SectionHeadline>Taste together.</SectionHeadline>
          </div>
        </FadeUp>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 24, maxWidth: 800, margin: "0 auto",
        }}>
          {features.map((f, i) => (
            <FadeUp key={f.title} delay={0.1 + i * 0.1}>
              <div style={{
                background: v.card, border: `1px solid ${v.border}`,
                borderRadius: 14, padding: "28px 24px", textAlign: "center",
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: `${ACCENT}10`, display: "flex",
                  alignItems: "center", justifyContent: "center",
                  color: ACCENT, margin: "0 auto 16px",
                }}>{f.icon}</div>
                <h3 style={{ fontFamily: font.display, fontSize: 18, fontWeight: 500, color: v.text, marginBottom: 8 }}>
                  {f.title}
                </h3>
                <p style={{ fontFamily: font.body, fontSize: 13, color: v.muted, lineHeight: 1.5 }}>
                  {f.text}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>

        <FadeUp delay={0.4}>
          <div style={{ textAlign: "center", marginTop: 48 }}>
            <svg viewBox="0 0 300 100" fill="none" style={{ width: 240, height: 80, margin: "0 auto" }}>
              {[50, 120, 190, 85, 155, 225].map((cx, i) => {
                const cy = i < 3 ? 35 : 65;
                return (
                  <g key={i}>
                    <circle cx={cx} cy={cy} r="14" fill={`${ACCENT}10`} stroke={ACCENT} strokeWidth="0.5" strokeOpacity="0.3" />
                    <circle cx={cx} cy={cy} r="5" fill={ACCENT} fillOpacity="0.25" />
                  </g>
                );
              })}
              {[[50,35,85,65],[120,35,85,65],[120,35,155,65],[190,35,155,65],[190,35,225,65]].map(([x1,y1,x2,y2], i) => (
                <line key={`l${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={ACCENT} strokeWidth="0.5" strokeOpacity="0.15" />
              ))}
            </svg>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

function DownloadSection() {
  const downloads = [
    {
      icon: <FileText style={{ width: 22, height: 22 }} />,
      title: "CaskSense Tasting Kit",
      desc: "Tasting guide, blind label templates, flight structure and host checklist.",
    },
    {
      icon: <Presentation style={{ width: 22, height: 22 }} />,
      title: "Host Presentation",
      desc: "Introduce CaskSense to your tasting group. What it is, how it works, how to join.",
    },
  ];

  return (
    <section style={{ padding: "120px 24px" }}>
      <div style={{ ...container, maxWidth: 700 }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <SectionHeadline>Download your tasting tools.</SectionHeadline>
          </div>
        </FadeUp>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {downloads.map((d, i) => (
            <FadeUp key={d.title} delay={0.1 + i * 0.1}>
              <motion.div
                whileHover={{ y: -3, borderColor: `${ACCENT}40` }}
                style={{
                  background: v.card, border: `1px solid ${v.border}`,
                  borderRadius: 16, padding: "28px 24px",
                  cursor: "default", transition: "border-color 0.3s",
                  display: "flex", gap: 16, alignItems: "flex-start",
                }}
                data-testid={`card-download-${i}`}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: `${ACCENT}10`, display: "flex",
                  alignItems: "center", justifyContent: "center",
                  color: ACCENT, flexShrink: 0,
                }}>{d.icon}</div>
                <div>
                  <h3 style={{ fontFamily: font.display, fontSize: 17, fontWeight: 500, color: v.text, marginBottom: 6 }}>
                    {d.title}
                  </h3>
                  <p style={{ fontFamily: font.body, fontSize: 13, color: v.muted, lineHeight: 1.5, marginBottom: 12 }}>
                    {d.desc}
                  </p>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    fontFamily: font.body, fontSize: 12, fontWeight: 600,
                    color: ACCENT, opacity: 0.6,
                  }}>
                    <Download style={{ width: 14, height: 14 }} /> Coming soon
                  </span>
                </div>
              </motion.div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

function UserRolesSection() {
  const roles = [
    {
      title: "For Tasting Hosts",
      items: ["Organize flights", "Control reveals", "Manage the session"],
      icon: <UserCheck style={{ width: 22, height: 22 }} />,
    },
    {
      title: "For Participants",
      items: ["Rate drams", "Capture notes", "Compare results"],
      icon: <Star style={{ width: 22, height: 22 }} />,
    },
    {
      title: "For Whisky Enthusiasts",
      items: ["Track taste profile", "Build a whisky journal", "Discover new preferences"],
      icon: <Search style={{ width: 22, height: 22 }} />,
    },
  ];

  return (
    <section style={{ padding: "120px 24px" }}>
      <div style={container}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <SectionHeadline>Designed for every role in a tasting.</SectionHeadline>
          </div>
        </FadeUp>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 24, maxWidth: 900, margin: "0 auto",
        }}>
          {roles.map((role, i) => (
            <FadeUp key={role.title} delay={0.1 + i * 0.1}>
              <div style={{
                background: v.card, border: `1px solid ${v.border}`,
                borderRadius: 16, padding: "32px 28px",
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: `${ACCENT}10`, display: "flex",
                  alignItems: "center", justifyContent: "center",
                  color: ACCENT, marginBottom: 20,
                }}>{role.icon}</div>
                <h3 style={{ fontFamily: font.display, fontSize: 19, fontWeight: 500, color: v.text, marginBottom: 16 }}>
                  {role.title}
                </h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {role.items.map((item) => (
                    <li key={item} style={{
                      fontFamily: font.body, fontSize: 14, color: v.muted,
                      lineHeight: 1.4, padding: "6px 0",
                      borderBottom: `1px solid ${v.border}`,
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <div style={{ width: 4, height: 4, borderRadius: "50%", background: ACCENT, flexShrink: 0 }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

function PhilosophySection() {
  return (
    <section style={{ padding: "120px 24px" }}>
      <div style={{ ...container, maxWidth: 640, textAlign: "center" }}>
        <FadeUp>
          <Divider />
          <div style={{ height: 48 }} />
          <SectionHeadline>Where tasting becomes reflection.</SectionHeadline>
        </FadeUp>
        <FadeUp delay={0.1}>
          <p style={{
            fontFamily: font.display, fontSize: "clamp(16px, 2vw, 20px)",
            fontStyle: "italic", color: v.muted, lineHeight: 1.9,
            maxWidth: 440, margin: "0 auto", whiteSpace: "pre-line",
          }}>
            {"Whisky invites attention.\n\nAroma.\nTexture.\nMemory.\n\nCaskSense helps you slow down\nand notice what you taste."}
          </p>
        </FadeUp>
      </div>
    </section>
  );
}

function FinalCTA() {
  const btnBase: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "16px 32px", fontFamily: font.body, fontSize: 15, fontWeight: 600,
    borderRadius: 50, textDecoration: "none",
    transition: "transform 0.2s, box-shadow 0.2s",
    cursor: "pointer", border: "none",
  };

  return (
    <section style={{ padding: "120px 24px 80px", textAlign: "center" }}>
      <div style={container}>
        <FadeUp>
          <SectionHeadline>Start your next tasting.</SectionHeadline>
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
      background: v.bg,
      color: v.text,
      minHeight: "100dvh",
      overflowX: "hidden",
    }}>
      <style>{`
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          border-radius: 2px;
          background: ${v.border};
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${ACCENT};
          cursor: pointer;
          border: 2px solid ${v.bg};
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${ACCENT};
          cursor: pointer;
          border: 2px solid ${v.bg};
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
      <HeroSection />
      <QuietTableSection />
      <TastingFlowSection />
      <RevealSection />
      <TasteIntelligenceSection />
      <ConnoisseurFeatures />
      <GuidedTourSection />
      <InteractiveDemoSection />
      <CompanionSection />
      <CircleSection />
      <DownloadSection />
      <UserRolesSection />
      <PhilosophySection />
      <FinalCTA />
      <Footer />
    </div>
  );
}

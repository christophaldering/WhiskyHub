import { useRef } from "react";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import {
  Wine, PenLine, Users, BarChart3, Sparkles, Search, Camera,
  ClipboardList, Radar, GitCompareArrows, ChevronRight, Star,
  FlaskConical, Trophy, FileText, Layers
} from "lucide-react";
import { v, alpha } from "@/lib/themeVars";
import i18n from "i18next";
import heroImage from "@/assets/images/hero-whisky.png";

const ACCENT_RAW = "#c8a97e";
const BG_RAW = "#1a1714";

const font = {
  display: "'Playfair Display', Georgia, 'Times New Roman', serif",
  body: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
};

const container: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "0 24px",
};

function FadeUp({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: font.display,
      fontSize: "clamp(28px, 4vw, 42px)",
      fontWeight: 500,
      color: v.text,
      lineHeight: 1.2,
      marginBottom: 20,
      letterSpacing: "-0.01em",
    }}>
      {children}
    </h2>
  );
}

function SectionSub({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: font.body,
      fontSize: "clamp(15px, 1.8vw, 18px)",
      color: v.muted,
      lineHeight: 1.7,
      maxWidth: 640,
    }}>
      {children}
    </p>
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
        background: `radial-gradient(ellipse 80% 60% at 50% 40%, ${ACCENT_RAW}08 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <motion.div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${ACCENT_RAW}06 0%, transparent 70%)`,
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
          <Link href="/labs/home" data-testid="link-hero-labs" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "14px 36px",
            background: "#1a1714",
            color: "#d4a256",
            fontFamily: font.body,
            fontSize: 15,
            fontWeight: 600,
            borderRadius: 50,
            textDecoration: "none",
            border: "2px solid #d4a256",
            transition: "transform 0.2s, box-shadow 0.2s",
            letterSpacing: "0.02em",
          }}>
            <FlaskConical style={{ width: 16, height: 16 }} />
            Labs
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

function ProblemSection() {
  return (
    <section style={{ padding: "120px 24px", textAlign: "center" }}>
      <div style={container}>
        <FadeUp>
          <SectionTitle>
            Most whisky tastings<br />disappear the next day.
          </SectionTitle>
        </FadeUp>
        <FadeUp delay={0.15}>
          <div style={{
            maxWidth: 560,
            margin: "0 auto",
            fontFamily: font.body,
            fontSize: "clamp(15px, 1.6vw, 17px)",
            color: v.mutedLight,
            lineHeight: 1.8,
          }}>
            <p style={{ marginBottom: 24 }}>
              Great bottles are opened. Conversations unfold. Impressions are shared.
            </p>
            <p style={{
              fontFamily: font.display,
              fontStyle: "italic",
              fontSize: "clamp(20px, 2.5vw, 26px)",
              color: v.text,
              marginBottom: 24,
            }}>
              But what remains?
            </p>
            <p style={{ marginBottom: 0 }}>
              Usually only a memory. CaskSense helps you capture the moment — and discover patterns in your taste.
            </p>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

function TwoWaysSection() {
  const cardBase: React.CSSProperties = {
    flex: 1,
    minWidth: 280,
    background: v.card,
    border: `1px solid ${v.border}`,
    borderRadius: 20,
    padding: "48px 36px",
    textAlign: "left",
    transition: "transform 0.3s, box-shadow 0.3s, border-color 0.3s",
    cursor: "default",
  };

  const items = [
    {
      icon: <PenLine style={{ width: 28, height: 28, color: v.accent }} strokeWidth={1.5} />,
      title: "Private Dram",
      desc: "Log a whisky you're tasting alone.",
      features: ["Tasting notes", "Aroma structure", "Personal ratings", "Flavour memory"],
    },
    {
      icon: <Users style={{ width: 28, height: 28, color: v.accent }} strokeWidth={1.5} />,
      title: "Tasting Night",
      desc: "Host a structured tasting with friends.",
      features: ["Guided tasting flow", "Live comparison", "Shared impressions", "Tasting recap"],
    },
  ];

  return (
    <section style={{ padding: "120px 24px" }}>
      <div style={container}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <SectionTitle>Two ways to use CaskSense</SectionTitle>
          </div>
        </FadeUp>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
          {items.map((item, i) => (
            <FadeUp key={item.title} delay={i * 0.15}>
              <motion.div
                style={cardBase}
                whileHover={{
                  y: -6,
                  boxShadow: `0 20px 60px ${ACCENT_RAW}10`,
                  borderColor: `${ACCENT_RAW}30`,
                }}
              >
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: alpha(v.accent, "12"),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 24,
                }}>
                  {item.icon}
                </div>
                <h3 style={{
                  fontFamily: font.display,
                  fontSize: 24,
                  fontWeight: 500,
                  color: v.text,
                  marginBottom: 8,
                }}>
                  {item.title}
                </h3>
                <p style={{
                  fontFamily: font.body,
                  fontSize: 15,
                  color: v.muted,
                  marginBottom: 24,
                  lineHeight: 1.5,
                }}>
                  {item.desc}
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {item.features.map((f) => (
                    <li key={f} style={{
                      fontFamily: font.body,
                      fontSize: 14,
                      color: v.mutedLight,
                      padding: "6px 0",
                      borderBottom: `1px solid ${v.border}`,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}>
                      <span style={{ color: v.accent, fontSize: 10 }}>●</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureGrid() {
  const features = [
    { icon: PenLine, title: "Log a Dram", desc: "Capture every sip with structured notes and personal reflections." },
    { icon: Users, title: "Host Tastings", desc: "Create guided or free-form tastings for your group." },
    { icon: BarChart3, title: "Flavor Analytics", desc: "Visualize your palate with radar charts and trend data." },
    { icon: Sparkles, title: "AI Tasting Notes", desc: "AI-generated descriptions to inspire your vocabulary." },
    { icon: Search, title: "Whisky Discovery", desc: "Explore distilleries, regions, and bottle profiles." },
    { icon: GitCompareArrows, title: "Compare Tastings", desc: "Side-by-side analysis across sessions and participants." },
  ];

  return (
    <section id="features" style={{ padding: "120px 24px" }}>
      <div style={container}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <SectionTitle>Everything you need</SectionTitle>
            <SectionSub>Powerful tools for every stage of your whisky journey.</SectionSub>
          </div>
        </FadeUp>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 20,
        }}>
          {features.map((f, i) => (
            <FadeUp key={f.title} delay={i * 0.08}>
              <motion.div
                style={{
                  background: v.card,
                  border: `1px solid ${v.border}`,
                  borderRadius: 16,
                  padding: "32px 28px",
                  transition: "transform 0.3s, box-shadow 0.3s",
                  cursor: "default",
                  height: "100%",
                }}
                whileHover={{
                  y: -4,
                  boxShadow: `0 16px 48px ${ACCENT_RAW}08`,
                }}
              >
                <f.icon style={{ width: 24, height: 24, color: v.accent, marginBottom: 16 }} strokeWidth={1.5} />
                <h3 style={{
                  fontFamily: font.display,
                  fontSize: 18,
                  fontWeight: 500,
                  color: v.text,
                  marginBottom: 8,
                }}>
                  {f.title}
                </h3>
                <p style={{
                  fontFamily: font.body,
                  fontSize: 14,
                  color: v.muted,
                  lineHeight: 1.6,
                  margin: 0,
                }}>
                  {f.desc}
                </p>
              </motion.div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

function ExperienceFlow() {
  const steps = [
    { icon: Camera, label: "Scan Bottle" },
    { icon: PenLine, label: "Log Dram" },
    { icon: Star, label: "Rate Aroma" },
    { icon: GitCompareArrows, label: "Compare" },
    { icon: Radar, label: "Discover Profile" },
  ];

  return (
    <section style={{ padding: "120px 24px", overflow: "hidden" }}>
      <div style={container}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <SectionTitle>How it works</SectionTitle>
            <SectionSub>From bottle to insight in five simple steps.</SectionSub>
          </div>
        </FadeUp>
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: 0,
          flexWrap: "wrap",
          position: "relative",
        }}>
          {steps.map((step, i) => (
            <FadeUp key={step.label} delay={i * 0.12}>
              <div style={{
                display: "flex",
                alignItems: "center",
                flexDirection: "row",
              }}>
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  padding: "0 16px",
                  minWidth: 100,
                }}>
                  <motion.div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      background: alpha(v.accent, "10"),
                      border: `1px solid ${v.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    whileHover={{ scale: 1.08, borderColor: `${ACCENT_RAW}40` }}
                  >
                    <step.icon style={{ width: 24, height: 24, color: v.accent }} strokeWidth={1.5} />
                  </motion.div>
                  <span style={{
                    fontFamily: font.body,
                    fontSize: 13,
                    fontWeight: 500,
                    color: v.mutedLight,
                    textAlign: "center",
                  }}>
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div style={{
                    width: 40,
                    height: 1,
                    background: v.border,
                    flexShrink: 0,
                    marginBottom: 24,
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

function ScienceSection() {
  const points = [
    "Personal flavour preferences",
    "Recurring patterns across sessions",
    "Similarities between tasters",
    "Hidden whisky profiles",
  ];

  return (
    <section style={{ padding: "120px 24px" }}>
      <div style={{ ...container, display: "flex", gap: 64, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 320 }}>
          <FadeUp>
            <SectionTitle>
              Taste is personal —<br />but patterns emerge.
            </SectionTitle>
          </FadeUp>
          <FadeUp delay={0.15}>
            <SectionSub>
              CaskSense transforms tasting impressions into structured data.
              Over time, it reveals:
            </SectionSub>
          </FadeUp>
          <FadeUp delay={0.3}>
            <ul style={{ listStyle: "none", padding: 0, margin: "32px 0 0" }}>
              {points.map((p, i) => (
                <motion.li
                  key={p}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
                  style={{
                    fontFamily: font.body,
                    fontSize: 15,
                    color: v.text,
                    padding: "12px 0",
                    borderBottom: `1px solid ${v.border}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: v.accent,
                    flexShrink: 0,
                  }} />
                  {p}
                </motion.li>
              ))}
            </ul>
          </FadeUp>
          <FadeUp delay={0.5}>
            <p style={{
              fontFamily: font.body,
              fontSize: 13,
              color: v.mutedLight,
              fontStyle: "italic",
              marginTop: 24,
            }}>
              Inspired by principles from psychology and empirical social research.
            </p>
          </FadeUp>
        </div>
        <div style={{ flex: 1, minWidth: 280, display: "flex", justifyContent: "center" }}>
          <FadeUp delay={0.2}>
            <div style={{
              width: 280,
              height: 280,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${ACCENT_RAW}0a 0%, transparent 70%)`,
              border: `1px solid ${v.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}>
              <Radar style={{ width: 80, height: 80, color: v.accent, opacity: 0.6 }} strokeWidth={1} />
              <motion.div
                style={{
                  position: "absolute",
                  inset: -1,
                  borderRadius: "50%",
                  border: `1px solid ${ACCENT_RAW}20`,
                }}
                animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}

function AdvancedSection() {
  const capabilities = [
    { icon: ClipboardList, label: "Structured tasting panels" },
    { icon: Layers, label: "Historical tasting archive" },
    { icon: Radar, label: "Radar flavour maps" },
    { icon: FlaskConical, label: "Benchmark comparisons" },
    { icon: Trophy, label: "Panel scoring insights" },
  ];

  return (
    <section style={{ padding: "120px 24px" }}>
      <div style={container}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <SectionTitle>For serious whisky explorers</SectionTitle>
            <SectionSub>Advanced tools that grow with your palate.</SectionSub>
          </div>
        </FadeUp>
        <div style={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 16,
        }}>
          {capabilities.map((cap, i) => (
            <FadeUp key={cap.label} delay={i * 0.08}>
              <motion.div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "16px 24px",
                  background: v.card,
                  border: `1px solid ${v.border}`,
                  borderRadius: 12,
                  minWidth: 240,
                  transition: "border-color 0.2s",
                }}
                whileHover={{ borderColor: `${ACCENT_RAW}40` }}
              >
                <cap.icon style={{ width: 20, height: 20, color: v.accent, flexShrink: 0 }} strokeWidth={1.5} />
                <span style={{
                  fontFamily: font.body,
                  fontSize: 14,
                  fontWeight: 500,
                  color: v.text,
                }}>
                  {cap.label}
                </span>
              </motion.div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section style={{ padding: "120px 24px 160px" }}>
      <div style={{ ...container, textAlign: "center" }}>
        <FadeUp>
          <SectionTitle>
            Start your next tasting<br />with CaskSense.
          </SectionTitle>
        </FadeUp>
        <FadeUp delay={0.15}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", marginTop: 40 }}>
            <Link href="/tasting" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "16px 40px",
              background: v.accent,
              color: v.bg,
              fontFamily: font.body,
              fontSize: 16,
              fontWeight: 600,
              borderRadius: 50,
              textDecoration: "none",
              transition: "transform 0.2s",
            }} data-testid="link-cta-open-app">
              Open App <ChevronRight style={{ width: 18, height: 18 }} />
            </Link>
            <Link href="/host?from=/tasting" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "16px 40px",
              background: "transparent",
              color: v.accent,
              fontFamily: font.body,
              fontSize: 16,
              fontWeight: 500,
              borderRadius: 50,
              textDecoration: "none",
              border: `1px solid ${v.border}`,
              transition: "border-color 0.2s",
            }} data-testid="link-cta-host">
              Host a Tasting
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
      borderTop: `1px solid ${v.border}`,
      padding: "40px 24px",
      textAlign: "center",
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
          <Link href="/terms" data-testid="link-footer-terms" style={{ fontFamily: font.body, fontSize: 12, color: v.muted, textDecoration: "none" }}>Terms</Link>
        </div>
      </div>
    </footer>
  );
}

export default function PublicLanding() {
  return (
    <div style={{
      background: v.bg,
      color: v.text,
      minHeight: "100dvh",
      overflowX: "hidden",
    }}>
      <HeroSection />
      <ProblemSection />
      <TwoWaysSection />
      <FeatureGrid />
      <ExperienceFlow />
      <ScienceSection />
      <AdvancedSection />
      <CTASection />
      <Footer />
    </div>
  );
}

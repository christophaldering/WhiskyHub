import { useRef, useState, lazy, Suspense } from "react";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import {
  Wine, PenLine, Users, BarChart3, Sparkles, Camera, ChevronRight,
  Search, GitCompareArrows, FileDown, Radar, Star, ClipboardList,
  FlaskConical, Trophy, Layers, Eye, Archive, QrCode
} from "lucide-react";
import { v, alpha } from "@/lib/themeVars";
import heroImage from "@/assets/images/hero-whisky.png";

const DemoDramLogger = lazy(() => import("@/components/landing/DemoDramLogger"));
const DemoPanelCompare = lazy(() => import("@/components/landing/DemoPanelCompare"));

const A = "#c8a97e";
const font = {
  display: "'Playfair Display', Georgia, 'Times New Roman', serif",
  body: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
};
const container: React.CSSProperties = { maxWidth: 1100, margin: "0 auto", padding: "0 24px" };

function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >{children}</motion.div>
  );
}

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "inline-block", fontSize: 11, fontWeight: 600,
      letterSpacing: "0.12em", textTransform: "uppercase",
      color: v.accent, background: alpha(v.accent, "10"),
      padding: "4px 14px", borderRadius: 20, marginBottom: 16,
    }}>{children}</div>
  );
}

function STitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: font.display, fontSize: "clamp(28px, 4vw, 42px)",
      fontWeight: 500, color: v.text, lineHeight: 1.2, marginBottom: 16, letterSpacing: "-0.01em",
    }}>{children}</h2>
  );
}

function SSub({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: font.body, fontSize: "clamp(15px, 1.8vw, 18px)",
      color: v.muted, lineHeight: 1.7, maxWidth: 640,
    }}>{children}</p>
  );
}

function LazySection({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "200px" });
  return <div ref={ref}>{inView ? children : <div style={{ minHeight: 400 }} />}</div>;
}

function Hero() {
  return (
    <section style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", textAlign: "center",
      position: "relative", overflow: "hidden", padding: "80px 24px",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse 80% 60% at 50% 40%, ${A}08 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <motion.div
        style={{
          position: "absolute", width: 600, height: 600, borderRadius: "50%",
          background: `radial-gradient(circle, ${A}06 0%, transparent 70%)`,
          top: "20%", left: "50%", transform: "translateX(-50%)", pointerEvents: "none",
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
        <div style={{ fontSize: 13, fontFamily: font.body, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: v.accent, marginBottom: 24, position: "relative", zIndex: 2 }}>
          Whisky Tasting Platform
        </div>
      </FadeUp>
      <FadeUp delay={0.15}>
        <h1 style={{ fontFamily: font.display, fontSize: "clamp(48px, 8vw, 88px)", fontWeight: 400, color: v.text, letterSpacing: "-0.02em", lineHeight: 1.05, marginBottom: 24 }}>
          CaskSense
        </h1>
      </FadeUp>
      <FadeUp delay={0.3}>
        <p style={{ fontFamily: font.display, fontSize: "clamp(18px, 2.5vw, 26px)", fontWeight: 400, fontStyle: "italic", color: v.muted, marginBottom: 16 }}>
          Where tasting becomes reflection.
        </p>
      </FadeUp>
      <FadeUp delay={0.45}>
        <p style={{ fontFamily: font.body, fontSize: "clamp(15px, 1.6vw, 18px)", color: v.mutedLight, lineHeight: 1.6, maxWidth: 420, margin: "0 auto 20px" }}>
          The most thoughtful way to explore whisky — alone or together.
        </p>
      </FadeUp>
      <FadeUp delay={0.55}>
        <div style={{
          display: "inline-block", background: alpha(v.accent, "08"), border: `1px solid ${v.border}`,
          borderRadius: 20, padding: "6px 16px", fontSize: 12, color: v.mutedLight,
          fontFamily: font.body, fontStyle: "italic", marginBottom: 40,
        }}>
          Built for tasting nights with friends — and for the nerds who love patterns.
        </div>
      </FadeUp>
      <FadeUp delay={0.65}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/enter" data-testid="link-v2-hero-app" style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 36px",
            background: v.accent, color: v.bg, fontFamily: font.body, fontSize: 15,
            fontWeight: 600, borderRadius: 50, textDecoration: "none",
          }}>
            Open the App <ChevronRight style={{ width: 16, height: 16 }} />
          </Link>
          <a href="#demo-logger" data-testid="link-v2-hero-demo" style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 36px",
            background: "transparent", color: v.accent, fontFamily: font.body, fontSize: 15,
            fontWeight: 500, borderRadius: 50, textDecoration: "none", border: `1px solid ${v.border}`,
          }}>
            See it in action
          </a>
        </div>
      </FadeUp>

      <motion.div style={{ position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)" }}
        animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <div style={{ width: 28, height: 44, borderRadius: 14, border: `2px solid ${v.border}`, display: "flex", justifyContent: "center", paddingTop: 8 }}>
          <div style={{ width: 3, height: 8, borderRadius: 2, background: v.muted }} />
        </div>
      </motion.div>
    </section>
  );
}

function OnFirstGlance() {
  const cards = [
    {
      icon: <PenLine style={{ width: 24, height: 24, color: A }} strokeWidth={1.5} />,
      title: "Private Dram",
      desc: "Log a whisky you taste on your own.",
      bullets: ["Structured notes", "5-dimension scoring", "Flavour memory over time"],
    },
    {
      icon: <Users style={{ width: 24, height: 24, color: A }} strokeWidth={1.5} />,
      title: "Tasting Night",
      desc: "Host a structured tasting with friends.",
      bullets: ["Join via code or QR", "Guided tasting room", "Recap & comparison"],
    },
  ];

  return (
    <section style={{ padding: "120px 24px" }}>
      <div style={container}>
        <FadeUp><div style={{ textAlign: "center", marginBottom: 56 }}><STitle>Two ways to use CaskSense</STitle></div></FadeUp>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
          {cards.map((c, i) => (
            <FadeUp key={c.title} delay={i * 0.15}>
              <motion.div
                whileHover={{ y: -6, boxShadow: `0 20px 60px ${A}10`, borderColor: `${A}30` }}
                style={{
                  flex: "1 1 320px", maxWidth: 480, background: v.card,
                  border: `1px solid ${v.border}`, borderRadius: 20,
                  padding: "40px 32px", transition: "all 0.3s",
                }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 14, background: alpha(v.accent, "12"), display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                  {c.icon}
                </div>
                <h3 style={{ fontFamily: font.display, fontSize: 22, fontWeight: 500, color: v.text, marginBottom: 6 }}>{c.title}</h3>
                <p style={{ fontFamily: font.body, fontSize: 14, color: v.muted, marginBottom: 20, lineHeight: 1.5 }}>{c.desc}</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {c.bullets.map((b) => (
                    <li key={b} style={{ fontFamily: font.body, fontSize: 13, color: v.mutedLight, padding: "5px 0", borderBottom: `1px solid ${v.border}`, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: A, fontSize: 8 }}>●</span>{b}
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
  const [expanded, setExpanded] = useState(false);
  const features = [
    { icon: Camera, title: "Log a Dram", short: "Photo, barcode, or manual entry.", detail: "AI bottle recognition, Whiskybase auto-fill." },
    { icon: Users, title: "Host Tastings", short: "Wizard setup, live controls.", detail: "Status machine, multi-act reveal, blind mode." },
    { icon: Radar, title: "Flavor Profile", short: "Radar chart & aroma wheel.", detail: "Built from your ratings over time." },
    { icon: BarChart3, title: "Analytics", short: "Benchmarks & comparisons.", detail: "Region, ABV, cask type trends." },
    { icon: Sparkles, title: "AI Companion", short: "Notes generator & curation.", detail: "Lineup suggestions, food pairings." },
    { icon: FileDown, title: "Export", short: "PDF, Excel, CSV.", detail: "Scoresheets, tasting mats, full data." },
  ];

  return (
    <section id="features" style={{ padding: "120px 24px" }}>
      <div style={container}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <STitle>Everything you need</STitle>
            <SSub>Powerful tools for every stage of your whisky journey.</SSub>
          </div>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <button
              onClick={() => setExpanded(!expanded)}
              data-testid="button-toggle-details"
              style={{
                background: expanded ? alpha(v.accent, "12") : "transparent",
                border: `1px solid ${expanded ? v.accent : v.border}`,
                borderRadius: 20, padding: "6px 16px", fontSize: 12,
                color: expanded ? v.accent : v.muted, cursor: "pointer",
                fontFamily: font.body, fontWeight: 500, transition: "all 0.2s",
              }}
            >
              {expanded ? "Less detail" : "For heavy users ↓"}
            </button>
          </div>
        </FadeUp>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          {features.map((f, i) => (
            <FadeUp key={f.title} delay={i * 0.06}>
              <motion.div
                whileHover={{ y: -4, boxShadow: `0 16px 48px ${A}08` }}
                style={{
                  background: v.card, border: `1px solid ${v.border}`, borderRadius: 16,
                  padding: "28px 24px", transition: "all 0.3s", height: "100%",
                }}
              >
                <f.icon style={{ width: 22, height: 22, color: A, marginBottom: 12 }} strokeWidth={1.5} />
                <h3 style={{ fontFamily: font.display, fontSize: 17, fontWeight: 500, color: v.text, marginBottom: 6 }}>{f.title}</h3>
                <p style={{ fontFamily: font.body, fontSize: 13, color: v.muted, lineHeight: 1.5, margin: 0 }}>{f.short}</p>
                {expanded && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    style={{ fontFamily: font.body, fontSize: 12, color: v.mutedLight, lineHeight: 1.5, marginTop: 8 }}
                  >
                    {f.detail}
                  </motion.p>
                )}
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
    { icon: QrCode, label: "Join", desc: "Scan a code or enter a PIN." },
    { icon: PenLine, label: "Log", desc: "Rate nose, palate, finish." },
    { icon: Star, label: "Rate", desc: "Score each dimension." },
    { icon: GitCompareArrows, label: "Compare", desc: "See how others rated." },
    { icon: Radar, label: "Discover", desc: "Your flavour profile grows." },
  ];

  return (
    <section style={{ padding: "120px 24px", overflow: "hidden" }}>
      <div style={container}>
        <FadeUp><div style={{ textAlign: "center", marginBottom: 56 }}><SectionTag>The Experience</SectionTag><STitle>How it works</STitle></div></FadeUp>
        <div style={{ display: "flex", justifyContent: "center", gap: 0, flexWrap: "wrap" }}>
          {steps.map((s, i) => (
            <FadeUp key={s.label} delay={i * 0.12}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "0 14px", minWidth: 90, textAlign: "center" }}>
                  <motion.div
                    whileHover={{ scale: 1.08, borderColor: `${A}40` }}
                    style={{ width: 56, height: 56, borderRadius: "50%", background: alpha(v.accent, "10"), border: `1px solid ${v.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <s.icon style={{ width: 22, height: 22, color: A }} strokeWidth={1.5} />
                  </motion.div>
                  <span style={{ fontFamily: font.body, fontSize: 13, fontWeight: 600, color: v.text }}>{s.label}</span>
                  <span style={{ fontFamily: font.body, fontSize: 11, color: v.mutedLight, lineHeight: 1.3, maxWidth: 100 }}>{s.desc}</span>
                </div>
                {i < steps.length - 1 && (
                  <div style={{ width: 32, height: 1, background: v.border, flexShrink: 0, marginBottom: 50 }} />
                )}
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

function DemoLoggerSection() {
  return (
    <section id="demo-logger" style={{ padding: "120px 24px" }}>
      <div style={container}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <SectionTag>Interactive Demo</SectionTag>
            <STitle>Try the Dram Logger</STitle>
            <SSub>Move the sliders — watch your taste signature and generated tasting note update in real time.</SSub>
          </div>
        </FadeUp>
        <LazySection>
          <FadeUp>
            <Suspense fallback={<div style={{ textAlign: "center", color: v.muted, padding: 40 }}>Loading demo...</div>}>
              <DemoDramLogger />
            </Suspense>
          </FadeUp>
        </LazySection>
      </div>
    </section>
  );
}

function DemoCompareSection() {
  return (
    <section style={{ padding: "120px 24px" }}>
      <div style={container}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <SectionTag>Interactive Demo</SectionTag>
            <STitle>Panel Comparison</STitle>
            <SSub>See how four tasters experience the same whisky — and who your taste twin is.</SSub>
          </div>
        </FadeUp>
        <LazySection>
          <FadeUp>
            <Suspense fallback={<div style={{ textAlign: "center", color: v.muted, padding: 40 }}>Loading demo...</div>}>
              <DemoPanelCompare />
            </Suspense>
          </FadeUp>
        </LazySection>
      </div>
    </section>
  );
}

function ScienceSection() {
  const methods = [
    {
      title: "Context Effects",
      desc: "Does knowing the label change your perception? Naked vs. Full mode reveals your bias — or lack of it.",
    },
    {
      title: "Scale Usage",
      desc: "Some raters stay in the middle, others use extremes. We detect your tendency and normalize for fair comparison.",
    },
    {
      title: "Stability Over Time",
      desc: "Your preferences shift. We track drift across sessions so you can see how your palate evolves.",
    },
  ];

  return (
    <section style={{ padding: "120px 24px" }}>
      <div style={container}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <SectionTag>The Science</SectionTag>
            <STitle>Taste is personal —<br />but patterns emerge.</STitle>
            <SSub>CaskSense transforms tasting impressions into structured data. Over time, it reveals personal baselines, context effects, and panel variance as signal — not noise.</SSub>
          </div>
        </FadeUp>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginTop: 48 }}>
          {methods.map((m, i) => (
            <FadeUp key={m.title} delay={i * 0.1}>
              <div style={{
                background: v.card, border: `1px solid ${v.border}`, borderRadius: 16,
                padding: "28px 24px", height: "100%",
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: alpha(v.accent, "12"), display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <FlaskConical style={{ width: 16, height: 16, color: A }} strokeWidth={1.5} />
                </div>
                <h3 style={{ fontFamily: font.display, fontSize: 17, fontWeight: 500, color: v.text, marginBottom: 8 }}>{m.title}</h3>
                <p style={{ fontFamily: font.body, fontSize: 13, color: v.muted, lineHeight: 1.6, margin: 0 }}>{m.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
        <FadeUp delay={0.3}>
          <div style={{ textAlign: "center", marginTop: 32 }}>
            <div style={{
              display: "inline-block", background: alpha(v.accent, "08"), border: `1px solid ${v.border}`,
              borderRadius: 20, padding: "6px 16px", fontSize: 12, color: v.mutedLight,
              fontFamily: font.body, fontStyle: "italic",
            }}>
              For the measurement nerds: yes, we care about reliability and validity.
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

function HeavyUsersSection() {
  const tools = [
    { icon: Layers, label: "Flight design with multi-act reveal" },
    { icon: Eye, label: "Live tracking — who rated what" },
    { icon: ClipboardList, label: "Structured tasting panels" },
    { icon: FileDown, label: "Recap exports: PDF, Excel, CSV" },
    { icon: GitCompareArrows, label: "Benchmarks across sessions" },
    { icon: Archive, label: "Whiskybase collection import" },
  ];

  return (
    <section style={{ padding: "120px 24px" }}>
      <div style={container}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <SectionTag>For Heavy Users</SectionTag>
            <STitle>Your whisky toolkit</STitle>
            <SSub>Advanced tools that grow with your group. Not a game — a serious platform.</SSub>
          </div>
        </FadeUp>
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 12 }}>
          {tools.map((t, i) => (
            <FadeUp key={t.label} delay={i * 0.06}>
              <motion.div
                whileHover={{ borderColor: `${A}40` }}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "14px 20px",
                  background: v.card, border: `1px solid ${v.border}`, borderRadius: 12,
                  minWidth: 260, transition: "border-color 0.2s",
                }}
              >
                <t.icon style={{ width: 18, height: 18, color: A, flexShrink: 0 }} strokeWidth={1.5} />
                <span style={{ fontFamily: font.body, fontSize: 13, fontWeight: 500, color: v.text }}>{t.label}</span>
              </motion.div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

function SocialProof() {
  const quotes = [
    "Finally, our tastings don't vanish the next day.",
    "The radar profile alone is worth it.",
    "It's like Strava for whisky — but calmer.",
  ];

  return (
    <section style={{ padding: "100px 24px" }}>
      <div style={container}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: v.mutedLight }}>
              Beta group impressions
            </span>
          </div>
        </FadeUp>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", marginTop: 24 }}>
          {quotes.map((q, i) => (
            <FadeUp key={i} delay={i * 0.1}>
              <div style={{
                flex: "1 1 260px", maxWidth: 320, background: v.card,
                border: `1px solid ${v.border}`, borderRadius: 16, padding: "24px 20px",
                textAlign: "center",
              }}>
                <p style={{
                  fontFamily: font.display, fontSize: 16, fontStyle: "italic",
                  color: v.text, lineHeight: 1.5, margin: 0,
                }}>
                  "{q}"
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section style={{ padding: "120px 24px 80px" }}>
      <div style={{ ...container, textAlign: "center" }}>
        <FadeUp><STitle>Ready for your next tasting night?</STitle></FadeUp>
        <FadeUp delay={0.15}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", marginTop: 36 }}>
            <Link href="/enter" data-testid="link-v2-cta-app" style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 40px",
              background: v.accent, color: v.bg, fontFamily: font.body, fontSize: 16,
              fontWeight: 600, borderRadius: 50, textDecoration: "none",
            }}>
              Open the App <ChevronRight style={{ width: 18, height: 18 }} />
            </Link>
            <Link href="/host" data-testid="link-v2-cta-host" style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 40px",
              background: "transparent", color: v.accent, fontFamily: font.body, fontSize: 16,
              fontWeight: 500, borderRadius: 50, textDecoration: "none",
              border: `1px solid ${v.border}`,
            }}>
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
    <footer style={{ borderTop: `1px solid ${v.border}`, padding: "40px 24px", textAlign: "center" }}>
      <div style={container}>
        <div style={{ display: "flex", gap: 24, justifyContent: "center", marginBottom: 16 }}>
          <Link href="/discover/about" data-testid="link-v2-footer-about" style={{ fontFamily: font.body, fontSize: 12, color: v.muted, textDecoration: "none" }}>About</Link>
          <Link href="/privacy" data-testid="link-v2-footer-privacy" style={{ fontFamily: font.body, fontSize: 12, color: v.muted, textDecoration: "none" }}>Privacy</Link>
          <Link href="/impressum" data-testid="link-v2-footer-impressum" style={{ fontFamily: font.body, fontSize: 12, color: v.muted, textDecoration: "none" }}>Impressum</Link>
        </div>
        <p style={{ fontFamily: font.body, fontSize: 12, color: v.mutedLight, fontStyle: "italic", margin: 0 }}>
          Made in Germany. Built with love for whisky and data.
        </p>
      </div>
    </footer>
  );
}

export default function LandingV2() {
  return (
    <div style={{ background: v.bg, color: v.text, minHeight: "100dvh", overflowX: "hidden" }}>
      <Hero />
      <OnFirstGlance />
      <FeatureGrid />
      <ExperienceFlow />
      <DemoLoggerSection />
      <DemoCompareSection />
      <ScienceSection />
      <HeavyUsersSection />
      <SocialProof />
      <FinalCTA />
      <Footer />
    </div>
  );
}

import { useRef, useEffect, useState } from "react";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { generateCaskSensePresentation } from "@/components/casksense-presentation-pdf";

const A = "#c8a97e";
const A2 = "#a8834a";
const BG = "#1a1714";
const BG2 = "#211e19";
const TXT = "#f0ebe3";
const TXT_M = "#b8a99a";
const TXT_DIM = "#7a6e62";

const font = {
  display: "'Playfair Display', Georgia, 'Times New Roman', serif",
  body: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
};

const sec: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "0 24px",
};

function FadeUp({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 32 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.75, delay, ease: [0.25, 0.46, 0.45, 0.94] }} style={style}>
      {children}
    </motion.div>
  );
}

function ScaleIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, scale: 0.85 }} animate={inView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }} style={style}>
      {children}
    </motion.div>
  );
}

function CountUp({ target, suffix = "", duration = 2 }: { target: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / (duration * 60);
    const id = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(id); }
      else setVal(Math.floor(start));
    }, 1000 / 60);
    return () => clearInterval(id);
  }, [inView, target, duration]);
  return <span ref={ref}>{val}{suffix}</span>;
}

function GoldenParticles() {
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: 2 + Math.random() * 3,
    dur: 12 + Math.random() * 18,
    delay: Math.random() * 10,
    opacity: 0.15 + Math.random() * 0.25,
  }));
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      <style>{`
        @keyframes gpFloat {
          0%, 100% { transform: translateY(0) translateX(0); opacity: var(--po); }
          25% { transform: translateY(-40px) translateX(15px); opacity: calc(var(--po) * 1.5); }
          50% { transform: translateY(-20px) translateX(-10px); opacity: var(--po); }
          75% { transform: translateY(-60px) translateX(20px); opacity: calc(var(--po) * 0.6); }
        }
        @keyframes gpGlow1 { 0%,100%{transform:translate(-50%,-50%) scale(1)} 50%{transform:translate(-50%,-50%) scale(1.15)} }
        @keyframes gpGlow2 { 0%,100%{transform:translate(-50%,-50%) scale(1) rotate(0deg)} 50%{transform:translate(-50%,-50%) scale(1.1) rotate(5deg)} }
        @media (prefers-reduced-motion: reduce) {
          .gp-particle, .gp-glow { animation: none !important; }
        }
      `}</style>
      {particles.map(p => (
        <div key={p.id} className="gp-particle" style={{
          position: "absolute", left: p.left, top: p.top,
          width: p.size, height: p.size, borderRadius: "50%",
          background: A, ["--po" as any]: p.opacity,
          opacity: p.opacity,
          animation: `gpFloat ${p.dur}s ${p.delay}s ease-in-out infinite`,
        }} />
      ))}
      <div className="gp-glow" style={{
        position: "absolute", left: "30%", top: "15%", width: 600, height: 600, borderRadius: "50%",
        background: `radial-gradient(circle, ${A}08 0%, transparent 70%)`,
        animation: "gpGlow1 20s ease-in-out infinite",
        transform: "translate(-50%, -50%)",
      }} />
      <div className="gp-glow" style={{
        position: "absolute", left: "70%", top: "60%", width: 500, height: 500, borderRadius: "50%",
        background: `radial-gradient(circle, ${A}06 0%, transparent 70%)`,
        animation: "gpGlow2 25s ease-in-out infinite",
        transform: "translate(-50%, -50%)",
      }} />
    </div>
  );
}

function HeroSection() {
  const letters = "CaskSense".split("");
  return (
    <section style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", textAlign: "center",
      position: "relative", padding: "100px 24px 60px", zIndex: 1,
    }}>
      <div style={{
        position: "absolute", width: 700, height: 700, borderRadius: "50%",
        background: `radial-gradient(circle, ${A}0a 0%, transparent 70%)`,
        top: "30%", left: "50%", transform: "translate(-50%, -50%)",
        pointerEvents: "none",
      }} />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2 }}
        style={{
          fontSize: 12, fontFamily: font.body, fontWeight: 500,
          letterSpacing: "0.2em", textTransform: "uppercase",
          color: A, marginBottom: 32,
        }}>
        Whisky Tasting Platform
      </motion.div>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
        {letters.map((l, i) => (
          <motion.span key={i} initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 + i * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              fontFamily: font.display, fontSize: "clamp(52px, 10vw, 100px)",
              fontWeight: 400, color: TXT, letterSpacing: "-0.02em", lineHeight: 1,
            }}>
            {l}
          </motion.span>
        ))}
      </div>

      <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1 }}
        style={{
          fontFamily: font.display, fontSize: "clamp(18px, 2.5vw, 26px)",
          fontWeight: 400, fontStyle: "italic", color: TXT_M,
          marginBottom: 16,
        }}>
        Where tasting becomes reflection.
      </motion.p>

      <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.3 }}
        style={{
          fontFamily: font.body, fontSize: "clamp(15px, 1.6vw, 18px)",
          color: TXT_DIM, lineHeight: 1.6, maxWidth: 440,
        }}>
        42 features that change how you taste whisky.
      </motion.p>

      <motion.div
        style={{ position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)" }}
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
        <ChevronDown style={{ width: 28, height: 28, color: TXT_DIM, opacity: 0.5 }} />
      </motion.div>
    </section>
  );
}

const flowStages = [
  { title: "Gather", tag: "Set the table", icon: "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5z" },
  { title: "Pour", tag: "Choose your drams", icon: "M8 2v2H6v2l2 12h8l2-12V4h-2V2H8z" },
  { title: "Reflect", tag: "Rate every note", icon: "M14 2H6a2 2 0 0 0-2 2v16l8-4 8 4V4a2 2 0 0 0-2-2z" },
  { title: "Reveal", tag: "Unmask the truth", icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" },
  { title: "Discover", tag: "Explore your palate", icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" },
];

function FlowSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <section ref={ref} style={{ padding: "100px 24px 120px", position: "relative", zIndex: 1 }}>
      <div style={sec}>
        <FadeUp>
          <h2 style={{
            fontFamily: font.display, fontSize: "clamp(28px, 4vw, 44px)",
            fontWeight: 400, color: TXT, textAlign: "center", marginBottom: 12,
          }}>
            Five stages. One experience.
          </h2>
          <p style={{
            fontFamily: font.body, fontSize: 16, color: TXT_DIM,
            textAlign: "center", marginBottom: 72, maxWidth: 420, margin: "0 auto 72px",
          }}>
            Every CaskSense tasting follows a natural rhythm.
          </p>
        </FadeUp>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 0, flexWrap: "wrap", position: "relative" }}>
          {flowStages.map((s, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                width: 160, position: "relative", padding: "0 8px",
              }}>
              {i > 0 && (
                <motion.div
                  initial={{ scaleX: 0 }} animate={inView ? { scaleX: 1 } : {}}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.15 }}
                  style={{
                    position: "absolute", top: 28, right: "50%", width: "100%", height: 1,
                    background: `linear-gradient(to right, ${A}40, ${A}15)`,
                    transformOrigin: "right",
                    zIndex: 0,
                  }} />
              )}
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                border: `1.5px solid ${A}50`,
                background: `${A}0a`,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 16, position: "relative", zIndex: 1,
              }}>
                <span style={{ fontFamily: font.display, fontSize: 20, color: A, fontWeight: 400 }}>
                  {i + 1}
                </span>
              </div>
              <span style={{
                fontFamily: font.display, fontSize: 17, color: TXT, fontWeight: 400, marginBottom: 4,
              }}>
                {s.title}
              </span>
              <span style={{ fontFamily: font.body, fontSize: 13, color: TXT_DIM, textAlign: "center" }}>
                {s.tag}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

interface Feature {
  title: string;
  desc: string;
  quote: string;
}

const chapA: Feature[] = [
  { title: "Tasting Setup", desc: "Create with title, date, location. Configure everything before inviting.", quote: "Set the stage." },
  { title: "Rating Scales", desc: "Choose 5, 10, 20, or 100-point professional scales.", quote: "Precision, your way." },
  { title: "Guided Mode", desc: "Everyone moves together. Pace synchronized in real time.", quote: "One pace. One moment." },
  { title: "Session Modes", desc: "Three ways: free Flow, locked Focus, or guided Journal.", quote: "Flow. Focus. Journal." },
  { title: "QR Code & Join", desc: "Join via QR scan or 6-digit code. No app download needed.", quote: "Scan or type. Instantly in." },
  { title: "Blind Mode", desc: "Four-stage reveal: number, ABV, age, then the full name.", quote: "Mystery, unveiled in acts." },
  { title: "Live Rating", desc: "Rate nose, taste, finish, balance. Select flavor chips. Voice notes.", quote: "Every sense, captured live." },
  { title: "Voice-to-Text", desc: "Dictate impressions hands-free. Speech recognition instant.", quote: "Speak. Notes appear." },
  { title: "Discussion Panel", desc: "Live chat during the session. Debate flavors together.", quote: "Debate in real time." },
  { title: "Multi-Act Reveal", desc: "4-act show: participation, consensus, details, final ranking.", quote: "A reveal like a finale." },
  { title: "Results & Export", desc: "Gold, silver, bronze medals. Export as PDF, Excel, CSV.", quote: "Celebrate, then share." },
  { title: "Flight Board", desc: "Visual lineup overview. See blind/revealed, navigate with a tap.", quote: "See the whole flight." },
  { title: "Printable Templates", desc: "Tasting sheets, mats, AI menu cards with cover images.", quote: "Print the ritual." },
  { title: "Solo Dram Logger", desc: "Rate whiskies outside group sessions. Every note captured.", quote: "Your private dram diary." },
  { title: "Guest Mode", desc: "Standard Naked or Ultra Naked. Choose your visibility.", quote: "Choose your visibility." },
];

const chapB: Feature[] = [
  { title: "Flavor Radar", desc: "Interactive radar chart mapping nose, taste, finish, balance, overall.", quote: "Shape your palate." },
  { title: "Profile Comparison", desc: "Overlay your radar against friends or the community.", quote: "You vs. everyone." },
  { title: "Taste Evolution", desc: "Trend line showing how your ratings develop over months.", quote: "Taste evolves over time." },
  { title: "Consistency Score", desc: "Standard deviation, range, spread. How steady is your palate?", quote: "How steady is your palate?" },
  { title: "Palate DNA", desc: "Your favorite region and cask combination from highest scores.", quote: "Your flavor fingerprint." },
  { title: "Whisky Journal", desc: "Every dram logged with notes, scores, and metadata.", quote: "Every dram remembered." },
  { title: "Recommendations", desc: "Factor-based engine weighing region, cask, peat, ratings.", quote: "Recommendations with reasons." },
  { title: "Side-by-Side", desc: "Overlay up to 3 whiskies on a single radar chart.", quote: "Three drams, one glance." },
  { title: "Collection Analysis", desc: "Value, region, age, ABV spectrum, vintage timeline.", quote: "Know your cellar's story." },
];

const chapC: Feature[] = [
  { title: "Bottle Recognition", desc: "Camera identifies whisky. Fills distillery, age, ABV, cask.", quote: "Point. Identify. Done." },
  { title: "Label OCR", desc: "Reads text from labels, menus, handwritten notes.", quote: "Labels become data." },
  { title: "AI Tasting Notes", desc: "Select flavor keywords, AI generates professional notes.", quote: "From hints to prose." },
  { title: "AI Enrichment", desc: "Facts, food pairings, and serving recommendations for every whisky.", quote: "Facts and pairings, instantly." },
  { title: "Market Price", desc: "AI estimates market value based on distillery, age, rarity.", quote: "Market value, estimated smartly." },
  { title: "AI Menu Card", desc: "DALL-E generates context-aware cover images for menus.", quote: "Menus with imagination." },
  { title: "AI Tasting Import", desc: "Parse PDFs, Excel, photos into structured tasting events.", quote: "Chaos in, structure out." },
  { title: "Barcode Scanner", desc: "Camera-based scanning for instant bottle lookup.", quote: "Scan shelf to profile." },
];

const chapD: Feature[] = [
  { title: "Taste Twins", desc: "Correlation engine: Twin (80%+), Similar (50%+), Related, Different.", quote: "Find your taste twin." },
  { title: "Leaderboards", desc: "Most Active, Most Detailed, Highest Rated, Explorer. Medals.", quote: "Climb every leaderboard." },
  { title: "Activity Feed", desc: "Real-time stream of friends' tastings, drams, badges.", quote: "See what friends sip." },
  { title: "Friend Management", desc: "Search, add friends. See online status. Build your circle.", quote: "Build your tasting circle." },
  { title: "Community Rankings", desc: "Aggregated scores by region. Your score vs. group average.", quote: "The crowd's whisky verdict." },
];

const chapE: Feature[] = [
  { title: "Whiskybase Integration", desc: "Lookup by ID, CSV import, deep links, auto image fetching.", quote: "Connected to whisky knowledge." },
  { title: "Collection Sync", desc: "CSV re-upload. Auto-detects new, removed, changed items.", quote: "Reupload. Auto-sync." },
  { title: "Knowledge Hub", desc: "Lexicon, distillery map, bottler database, tasting guide.", quote: "Learn the whole world." },
  { title: "Wishlist", desc: "Track bottles to find. Integrated with collection and journal.", quote: "Track the next bottle." },
  { title: "Historical Tastings", desc: "Searchable archive with cross-tasting analytics and trends.", quote: "Past tastings, new insights." },
];

function ChapterHeader({ letter, title, count, accent = A }: { letter: string; title: string; count: number; accent?: string }) {
  return (
    <FadeUp style={{ textAlign: "center", marginBottom: 64 }}>
      <div style={{
        fontFamily: font.display, fontSize: "clamp(80px, 12vw, 140px)",
        fontWeight: 400, color: `${accent}15`,
        lineHeight: 1, marginBottom: -20, position: "relative",
      }}>
        {letter}
      </div>
      <h2 style={{
        fontFamily: font.display, fontSize: "clamp(26px, 3.5vw, 40px)",
        fontWeight: 400, color: TXT, marginBottom: 8, position: "relative",
      }}>
        {title}
      </h2>
      <span style={{
        fontFamily: font.body, fontSize: 14, color: accent,
        letterSpacing: "0.1em", textTransform: "uppercase",
      }}>
        {count} features
      </span>
    </FadeUp>
  );
}

function FeatureCard({ f, delay = 0 }: { f: Feature; delay?: number }) {
  return (
    <FadeUp delay={delay} style={{ flex: "1 1 280px", maxWidth: 360 }}>
      <div style={{
        padding: "24px 20px", borderRadius: 16,
        background: `${A}06`, border: `1px solid ${A}10`,
        height: "100%",
      }}>
        <div style={{
          fontFamily: font.body, fontSize: 11, color: A,
          letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8, fontWeight: 500,
        }}>
          {f.quote}
        </div>
        <div style={{
          fontFamily: font.display, fontSize: 18, color: TXT,
          fontWeight: 400, marginBottom: 8,
        }}>
          {f.title}
        </div>
        <div style={{
          fontFamily: font.body, fontSize: 14, color: TXT_DIM,
          lineHeight: 1.5,
        }}>
          {f.desc}
        </div>
      </div>
    </FadeUp>
  );
}

function FeatureGrid({ features }: { features: Feature[] }) {
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 16,
      justifyContent: "center", marginTop: 48,
    }}>
      {features.map((f, i) => (
        <FeatureCard key={i} f={f} delay={i * 0.06} />
      ))}
    </div>
  );
}

function BlindModeDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const stages = [
    { label: "?", sub: "Dram #1" },
    { label: "45.8%", sub: "ABV" },
    { label: "10 Years", sub: "Age" },
    { label: "Talisker", sub: "Revealed" },
  ];
  return (
    <FadeUp>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <span style={{ fontFamily: font.body, fontSize: 12, color: A, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Blind Mode
        </span>
      </div>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: font.display, fontSize: 22, color: TXT }}>
          Mystery, unveiled in acts.
        </span>
      </div>
      <p style={{ fontFamily: font.body, fontSize: 14, color: TXT_DIM, textAlign: "center", maxWidth: 400, margin: "0 auto 32px" }}>
        Four-stage reveal: only the dram number, then ABV, then age, then the full name. Bias eliminated.
      </p>
      <div ref={ref} style={{
        display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap",
        padding: "32px 0",
      }}>
        {stages.map((s, i) => (
          <motion.div key={i}
            initial={{ rotateY: 180, opacity: 0 }}
            animate={inView ? { rotateY: 0, opacity: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.3 + i * 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              width: 120, height: 160, borderRadius: 16,
              background: i === 0 ? `linear-gradient(135deg, ${A}15, ${A}08)` : `linear-gradient(135deg, ${A}0c, ${A}05)`,
              border: `1px solid ${i === 0 ? A + "40" : A + "18"}`,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              perspective: 1000, transformStyle: "preserve-3d",
            }}>
            <div style={{
              fontFamily: i === 0 ? font.display : font.body,
              fontSize: i === 0 ? 40 : 16,
              color: i === 0 ? A : TXT,
              fontWeight: i === 0 ? 400 : 500,
              marginBottom: 8,
            }}>
              {s.label}
            </div>
            <div style={{ fontFamily: font.body, fontSize: 11, color: TXT_DIM }}>
              {s.sub}
            </div>
            <div style={{
              position: "absolute", top: 8, right: 10,
              fontFamily: font.body, fontSize: 10, color: `${A}50`,
            }}>
              Act {i + 1}
            </div>
          </motion.div>
        ))}
      </div>
    </FadeUp>
  );
}

function LiveRatingDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const bars = [
    { label: "Nose", pct: 82, color: A },
    { label: "Taste", pct: 90, color: "#d4a256" },
    { label: "Finish", pct: 76, color: A2 },
    { label: "Balance", pct: 85, color: A },
    { label: "Overall", pct: 88, color: "#d4a256" },
  ];
  const chips = ["Smoky", "Honey", "Vanilla", "Maritime"];
  return (
    <FadeUp>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <span style={{ fontFamily: font.body, fontSize: 12, color: A, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Live Rating
        </span>
      </div>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: font.display, fontSize: 22, color: TXT }}>
          Every sense, captured live.
        </span>
      </div>
      <p style={{ fontFamily: font.body, fontSize: 14, color: TXT_DIM, textAlign: "center", maxWidth: 400, margin: "0 auto 32px" }}>
        Rate nose, taste, finish, balance, and overall. Select flavor chips. Dictate voice notes. All captured live.
      </p>
      <div ref={ref} style={{
        maxWidth: 400, margin: "0 auto", padding: "24px",
        background: `${A}06`, borderRadius: 20, border: `1px solid ${A}10`,
      }}>
        {bars.map((b, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{
              display: "flex", justifyContent: "space-between", marginBottom: 4,
            }}>
              <span style={{ fontFamily: font.body, fontSize: 13, color: TXT_M }}>{b.label}</span>
              <motion.span
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: 1 } : {}}
                transition={{ delay: 0.5 + i * 0.12 }}
                style={{ fontFamily: font.body, fontSize: 13, color: A }}>
                {b.pct}
              </motion.span>
            </div>
            <div style={{
              height: 6, borderRadius: 3, background: `${A}12`, overflow: "hidden",
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={inView ? { width: `${b.pct}%` } : {}}
                transition={{ duration: 0.8, delay: 0.3 + i * 0.12, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{
                  height: "100%", borderRadius: 3,
                  background: `linear-gradient(to right, ${b.color}80, ${b.color})`,
                }} />
            </div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 20 }}>
          {chips.map((c, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.4, delay: 1.2 + i * 0.1 }}
              style={{
                padding: "5px 14px", borderRadius: 20,
                background: `${A}15`, border: `1px solid ${A}25`,
                fontFamily: font.body, fontSize: 12, color: A,
              }}>
              {c}
            </motion.div>
          ))}
        </div>
      </div>
    </FadeUp>
  );
}

function RevealActsDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const acts = ["Stats", "Consensus", "Details", "Ranking"];
  return (
    <FadeUp>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <span style={{ fontFamily: font.body, fontSize: 12, color: A, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Multi-Act Reveal
        </span>
      </div>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: font.display, fontSize: 22, color: TXT }}>
          A reveal like a finale.
        </span>
      </div>
      <p style={{ fontFamily: font.body, fontSize: 14, color: TXT_DIM, textAlign: "center", maxWidth: 400, margin: "0 auto 32px" }}>
        The reveal is a 4-act show: participation stats, group consensus, technical details, then the final ranking.
      </p>
      <div ref={ref} style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 0, padding: "32px 0",
      }}>
        {acts.map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center" }}>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={inView ? { scale: 1, opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.25, type: "spring", stiffness: 200 }}
              style={{
                width: i === 3 ? 64 : 52, height: i === 3 ? 64 : 52,
                borderRadius: "50%",
                background: i === 3 ? `linear-gradient(135deg, ${A}30, ${A}15)` : `${A}0c`,
                border: `1.5px solid ${i === 3 ? A : A + "30"}`,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                boxShadow: i === 3 ? `0 0 20px ${A}20` : "none",
                position: "relative",
              }}>
              <span style={{
                fontFamily: font.body, fontSize: 10, color: i === 3 ? A : TXT_DIM,
                letterSpacing: "0.05em",
              }}>
                Act {i + 1}
              </span>
              <span style={{
                fontFamily: font.body, fontSize: 9, color: TXT_DIM,
                position: "absolute", bottom: -20, whiteSpace: "nowrap",
              }}>
                {a}
              </span>
            </motion.div>
            {i < 3 && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={inView ? { scaleX: 1 } : {}}
                transition={{ duration: 0.3, delay: 0.5 + i * 0.25 }}
                style={{
                  width: 32, height: 1, background: `${A}30`,
                  transformOrigin: "left",
                }} />
            )}
          </div>
        ))}
      </div>
    </FadeUp>
  );
}

function RadarChartDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const cx = 150, cy = 150, r = 100;
  const labels = ["Nose", "Taste", "Finish", "Balance", "Overall"];
  const values = [0.82, 0.9, 0.76, 0.85, 0.88];
  const angles = labels.map((_, i) => (Math.PI * 2 * i) / labels.length - Math.PI / 2);
  const pts = values.map((v, i) => ({
    x: cx + Math.cos(angles[i]) * r * v,
    y: cy + Math.sin(angles[i]) * r * v,
  }));
  const poly = pts.map(p => `${p.x},${p.y}`).join(" ");
  const gridRings = [0.25, 0.5, 0.75, 1];

  return (
    <FadeUp>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <span style={{ fontFamily: font.body, fontSize: 12, color: A, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Flavor Radar
        </span>
      </div>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: font.display, fontSize: 22, color: TXT }}>
          Shape your palate.
        </span>
      </div>
      <p style={{ fontFamily: font.body, fontSize: 14, color: TXT_DIM, textAlign: "center", maxWidth: 400, margin: "0 auto 32px" }}>
        Interactive radar chart mapping your averages across nose, taste, finish, balance, and overall.
      </p>
      <div ref={ref} style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
        <svg viewBox="0 0 300 300" style={{ width: 280, height: 280 }}>
          {gridRings.map((ring, ri) => {
            const gPts = angles.map(a => `${cx + Math.cos(a) * r * ring},${cy + Math.sin(a) * r * ring}`).join(" ");
            return (
              <motion.polygon key={ri} points={gPts} fill="none" stroke={`${A}15`} strokeWidth="0.8"
                initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
                transition={{ duration: 0.4, delay: ri * 0.1 }} />
            );
          })}
          {angles.map((a, i) => (
            <motion.line key={i} x1={cx} y1={cy}
              x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r}
              stroke={`${A}12`} strokeWidth="0.8"
              initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.3, delay: 0.4 + i * 0.05 }} />
          ))}
          <motion.polygon points={poly}
            fill={`${A}18`} stroke={A} strokeWidth="1.5"
            initial={{ opacity: 0, scale: 0 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
          {pts.map((p, i) => (
            <motion.circle key={i} cx={p.x} cy={p.y} r="4"
              fill={A} stroke={BG} strokeWidth="2"
              initial={{ opacity: 0, scale: 0 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.3, delay: 0.9 + i * 0.08, type: "spring" }}
            />
          ))}
          {labels.map((l, i) => {
            const lx = cx + Math.cos(angles[i]) * (r + 22);
            const ly = cy + Math.sin(angles[i]) * (r + 22);
            return (
              <motion.text key={i} x={lx} y={ly}
                textAnchor="middle" dominantBaseline="middle"
                fill={TXT_DIM} fontSize="11" fontFamily={font.body}
                initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
                transition={{ delay: 1.2 + i * 0.05 }}>
                {l}
              </motion.text>
            );
          })}
        </svg>
      </div>
    </FadeUp>
  );
}

function TrendLineDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const vals = [72, 78, 75, 82, 80, 86];
  const w = 360, h = 160, pad = 40;
  const xStep = (w - pad * 2) / (months.length - 1);
  const minV = 65, maxV = 95;
  const yScale = (v: number) => h - pad - ((v - minV) / (maxV - minV)) * (h - pad * 2);
  const pathD = vals.map((v, i) => `${i === 0 ? "M" : "L"}${pad + i * xStep},${yScale(v)}`).join(" ");

  return (
    <FadeUp>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <span style={{ fontFamily: font.body, fontSize: 12, color: A, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Taste Evolution
        </span>
      </div>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: font.display, fontSize: 22, color: TXT }}>
          Taste evolves over time.
        </span>
      </div>
      <p style={{ fontFamily: font.body, fontSize: 14, color: TXT_DIM, textAlign: "center", maxWidth: 400, margin: "0 auto 32px" }}>
        A trend line showing how your average ratings develop over months.
      </p>
      <div ref={ref} style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: Math.min(w, 360), height: h }}>
          <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke={`${A}15`} strokeWidth="1" />
          <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke={`${A}15`} strokeWidth="1" />
          {months.map((m, i) => (
            <motion.text key={i} x={pad + i * xStep} y={h - pad + 18}
              textAnchor="middle" fill={TXT_DIM} fontSize="10" fontFamily={font.body}
              initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.2 + i * 0.08 }}>
              {m}
            </motion.text>
          ))}
          <motion.path d={pathD} fill="none" stroke={A} strokeWidth="2" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={inView ? { pathLength: 1 } : {}}
            transition={{ duration: 1.5, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }} />
          {vals.map((v, i) => (
            <motion.circle key={i} cx={pad + i * xStep} cy={yScale(v)} r="4"
              fill={A} stroke={BG} strokeWidth="2"
              initial={{ opacity: 0, scale: 0 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 1 + i * 0.12, type: "spring" }} />
          ))}
        </svg>
      </div>
    </FadeUp>
  );
}

function ScannerDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <FadeUp>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <span style={{ fontFamily: font.body, fontSize: 12, color: A, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Bottle Recognition
        </span>
      </div>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: font.display, fontSize: 22, color: TXT }}>
          Point. Identify. Done.
        </span>
      </div>
      <p style={{ fontFamily: font.body, fontSize: 14, color: TXT_DIM, textAlign: "center", maxWidth: 400, margin: "0 auto 32px" }}>
        Point your camera at any label. GPT-4o Vision identifies the whisky and fills in all metadata.
      </p>
      <div ref={ref} style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
        <div style={{
          width: 220, height: 220, position: "relative",
          background: `${A}05`, borderRadius: 20,
          overflow: "hidden",
        }}>
          <style>{`
            @keyframes scanLine { 0%{top:10%} 50%{top:80%} 100%{top:10%} }
            @media (prefers-reduced-motion: reduce) { .scan-line { animation: none !important; } }
          `}</style>
          <div style={{
            position: "absolute", top: 12, left: 12, width: 28, height: 28,
            borderTop: `2px solid ${A}60`, borderLeft: `2px solid ${A}60`, borderRadius: "4px 0 0 0",
          }} />
          <div style={{
            position: "absolute", top: 12, right: 12, width: 28, height: 28,
            borderTop: `2px solid ${A}60`, borderRight: `2px solid ${A}60`, borderRadius: "0 4px 0 0",
          }} />
          <div style={{
            position: "absolute", bottom: 12, left: 12, width: 28, height: 28,
            borderBottom: `2px solid ${A}60`, borderLeft: `2px solid ${A}60`, borderRadius: "0 0 0 4px",
          }} />
          <div style={{
            position: "absolute", bottom: 12, right: 12, width: 28, height: 28,
            borderBottom: `2px solid ${A}60`, borderRight: `2px solid ${A}60`, borderRadius: "0 0 4px 0",
          }} />

          {inView && (
            <div className="scan-line" style={{
              position: "absolute", left: 16, right: 16, height: 2,
              background: `linear-gradient(to right, transparent, ${A}80, transparent)`,
              animation: "scanLine 2.5s ease-in-out infinite",
              boxShadow: `0 0 12px ${A}40`,
            }} />
          )}

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 1.5, duration: 0.6 }}
            style={{
              position: "absolute", bottom: 20, left: 16, right: 16,
              padding: "12px", borderRadius: 12,
              background: `${BG}e0`, border: `1px solid ${A}25`,
              backdropFilter: "blur(8px)",
            }}>
            <div style={{ fontFamily: font.body, fontSize: 13, color: TXT, fontWeight: 500, marginBottom: 2 }}>
              Talisker 10
            </div>
            <div style={{ fontFamily: font.body, fontSize: 11, color: TXT_DIM }}>
              45.8% · Isle of Skye · Single Malt
            </div>
          </motion.div>
        </div>
      </div>
    </FadeUp>
  );
}

function TasteTwinsDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const cx = 150, cy = 150, r = 90;
  const labels = ["N", "T", "F", "B", "O"];
  const v1 = [0.82, 0.9, 0.76, 0.85, 0.88];
  const v2 = [0.78, 0.88, 0.80, 0.82, 0.84];
  const angles = labels.map((_, i) => (Math.PI * 2 * i) / labels.length - Math.PI / 2);
  const toPoly = (vals: number[]) =>
    vals.map((v, i) => `${cx + Math.cos(angles[i]) * r * v},${cy + Math.sin(angles[i]) * r * v}`).join(" ");

  return (
    <FadeUp>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <span style={{ fontFamily: font.body, fontSize: 12, color: A, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Taste Twins
        </span>
      </div>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: font.display, fontSize: 22, color: TXT }}>
          Find your taste twin.
        </span>
      </div>
      <p style={{ fontFamily: font.body, fontSize: 14, color: TXT_DIM, textAlign: "center", maxWidth: 400, margin: "0 auto 32px" }}>
        Correlation engine matching your ratings with others. Discover who shares your palate.
      </p>
      <div ref={ref} style={{ display: "flex", justifyContent: "center", position: "relative", padding: "16px 0" }}>
        <svg viewBox="0 0 300 300" style={{ width: 260, height: 260 }}>
          {[0.5, 1].map((ring, ri) => {
            const gPts = angles.map(a => `${cx + Math.cos(a) * r * ring},${cy + Math.sin(a) * r * ring}`).join(" ");
            return <polygon key={ri} points={gPts} fill="none" stroke={`${A}12`} strokeWidth="0.8" />;
          })}
          <motion.polygon points={toPoly(v1)}
            fill={`${A}15`} stroke={A} strokeWidth="1.5"
            initial={{ opacity: 0, scale: 0 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.3 }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
          <motion.polygon points={toPoly(v2)}
            fill="#6b8cff12" stroke="#6b8cff" strokeWidth="1.5" strokeDasharray="4 3"
            initial={{ opacity: 0, scale: 0 }}
            animate={inView ? { opacity: 0.7, scale: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.6 }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
          {labels.map((l, i) => (
            <text key={i} x={cx + Math.cos(angles[i]) * (r + 18)} y={cy + Math.sin(angles[i]) * (r + 18)}
              textAnchor="middle" dominantBaseline="middle" fill={TXT_DIM} fontSize="11" fontFamily={font.body}>
              {l}
            </text>
          ))}
        </svg>
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 1.2, duration: 0.5, type: "spring" }}
          style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            padding: "8px 16px", borderRadius: 20,
            background: `${A}25`, border: `1px solid ${A}40`,
            fontFamily: font.body, fontSize: 16, fontWeight: 600, color: A,
          }}>
          <CountUp target={82} suffix="%" />
        </motion.div>
      </div>
      <div style={{
        display: "flex", justifyContent: "center", gap: 24, marginTop: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 12, height: 3, background: A, borderRadius: 2 }} />
          <span style={{ fontFamily: font.body, fontSize: 12, color: TXT_DIM }}>You</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 12, height: 3, background: "#6b8cff", borderRadius: 2 }} />
          <span style={{ fontFamily: font.body, fontSize: 12, color: TXT_DIM }}>Twin</span>
        </div>
      </div>
    </FadeUp>
  );
}

function ChapterASection() {
  const heroFeatures = chapA.filter(f => ["Blind Mode", "Live Rating", "Multi-Act Reveal"].includes(f.title));
  const gridFeatures = chapA.filter(f => !["Blind Mode", "Live Rating", "Multi-Act Reveal"].includes(f.title));
  return (
    <section style={{ padding: "100px 0 80px", position: "relative", zIndex: 1 }}>
      <div style={sec}>
        <ChapterHeader letter="A" title="The Tasting Engine" count={15} />
        <div style={{ display: "flex", flexDirection: "column", gap: 80 }}>
          <RevealActsDemo />
          <BlindModeDemo />
          <LiveRatingDemo />
        </div>
        <FeatureGrid features={gridFeatures} />
      </div>
    </section>
  );
}

function ChapterBSection() {
  const gridFeatures = chapB.filter(f => !["Flavor Radar", "Taste Evolution"].includes(f.title));
  return (
    <section style={{ padding: "100px 0 80px", position: "relative", zIndex: 1 }}>
      <div style={sec}>
        <ChapterHeader letter="B" title="Personal Taste Analysis" count={9} />
        <div style={{ display: "flex", flexDirection: "column", gap: 80 }}>
          <RadarChartDemo />
          <TrendLineDemo />
        </div>
        <FeatureGrid features={gridFeatures} />
      </div>
    </section>
  );
}

function ChapterCSection() {
  const gridFeatures = chapC.filter(f => f.title !== "Bottle Recognition");
  return (
    <section style={{ padding: "100px 0 80px", position: "relative", zIndex: 1 }}>
      <div style={sec}>
        <ChapterHeader letter="C" title="AI-Powered Features" count={8} />
        <ScannerDemo />
        <FeatureGrid features={gridFeatures} />
      </div>
    </section>
  );
}

function ChapterDSection() {
  const gridFeatures = chapD.filter(f => f.title !== "Taste Twins");
  return (
    <section style={{ padding: "100px 0 80px", position: "relative", zIndex: 1 }}>
      <div style={sec}>
        <ChapterHeader letter="D" title="Community & Circle" count={5} />
        <TasteTwinsDemo />
        <FeatureGrid features={gridFeatures} />
      </div>
    </section>
  );
}

function ChapterESection() {
  return (
    <section style={{ padding: "100px 0 80px", position: "relative", zIndex: 1 }}>
      <div style={sec}>
        <ChapterHeader letter="E" title="Whisky Database & Collection" count={5} />
        <FeatureGrid features={chapE} />
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section style={{
      padding: "80px 24px", position: "relative", zIndex: 1,
      background: `linear-gradient(180deg, transparent 0%, ${A}05 50%, transparent 100%)`,
    }}>
      <div style={{
        ...sec, display: "flex", justifyContent: "center", gap: 64, flexWrap: "wrap",
      }}>
        {[
          { n: 42, s: "+", label: "Features" },
          { n: 5, s: "", label: "Categories" },
          { n: 2, s: "", label: "Languages" },
        ].map((st, i) => (
          <ScaleIn key={i} delay={i * 0.1}>
            <div style={{ textAlign: "center", minWidth: 120 }}>
              <div style={{
                fontFamily: font.display, fontSize: "clamp(40px, 6vw, 64px)",
                fontWeight: 400, color: A, lineHeight: 1.1,
              }}>
                <CountUp target={st.n} suffix={st.s} />
              </div>
              <div style={{
                fontFamily: font.body, fontSize: 14, color: TXT_DIM,
                marginTop: 4, letterSpacing: "0.05em",
              }}>
                {st.label}
              </div>
            </div>
          </ScaleIn>
        ))}
      </div>
    </section>
  );
}

function CTASection() {
  const [downloading, setDownloading] = useState(false);
  const handlePDF = async () => {
    setDownloading(true);
    try { await generateCaskSensePresentation(); } finally { setDownloading(false); }
  };
  return (
    <section style={{
      padding: "100px 24px 120px", position: "relative", zIndex: 1,
      textAlign: "center",
    }}>
      <div style={{
        position: "absolute", width: 500, height: 500, borderRadius: "50%",
        background: `radial-gradient(circle, ${A}0a 0%, transparent 70%)`,
        top: "40%", left: "50%", transform: "translate(-50%, -50%)",
        pointerEvents: "none",
      }} />
      <FadeUp>
        <h2 style={{
          fontFamily: font.display, fontSize: "clamp(30px, 5vw, 48px)",
          fontWeight: 400, color: TXT, marginBottom: 16,
        }}>
          Start your whisky journey.
        </h2>
      </FadeUp>
      <FadeUp delay={0.15}>
        <p style={{
          fontFamily: font.body, fontSize: 16, color: TXT_DIM,
          maxWidth: 440, margin: "0 auto 40px", lineHeight: 1.6,
        }}>
          Open CaskSense and create your first session in under a minute.
        </p>
      </FadeUp>
      <FadeUp delay={0.3}>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/m2" data-testid="link-cta-open" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "16px 44px", background: A, color: BG,
            fontFamily: font.body, fontSize: 16, fontWeight: 600,
            borderRadius: 50, textDecoration: "none",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}>
            Open App
          </Link>
          <button onClick={handlePDF} disabled={downloading} data-testid="btn-cta-pdf" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "16px 44px", background: "transparent", color: A,
            fontFamily: font.body, fontSize: 16, fontWeight: 500,
            borderRadius: 50, border: `1px solid ${A}40`,
            cursor: downloading ? "wait" : "pointer",
            transition: "border-color 0.2s",
            opacity: downloading ? 0.6 : 1,
          }}>
            {downloading ? "Generating..." : "Download PDF"}
          </button>
        </div>
      </FadeUp>
    </section>
  );
}

function DividerLine() {
  return (
    <FadeUp>
      <div style={{
        width: 60, height: 1, background: `${A}25`,
        margin: "0 auto",
      }} />
    </FadeUp>
  );
}

export default function GuidedPresentation() {
  return (
    <div style={{
      background: BG, minHeight: "100vh", color: TXT,
      position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.001s !important; transition-duration: 0.001s !important; }
        }
      `}</style>
      <GoldenParticles />
      <HeroSection />
      <FlowSection />
      <DividerLine />
      <ChapterASection />
      <DividerLine />
      <ChapterBSection />
      <DividerLine />
      <ChapterCSection />
      <DividerLine />
      <ChapterDSection />
      <DividerLine />
      <ChapterESection />
      <StatsSection />
      <CTASection />
    </div>
  );
}

import { useRef, useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { motion, useInView } from "framer-motion";
import { ChevronRight, Wine, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { v } from "@/lib/themeVars";
import heroImage from "@/assets/images/hero-whisky.png";

const ACCENT = "#c8a97e";
const ACCENT_DIM = "#a8834a";

const font = {
  display: "'Playfair Display', Georgia, 'Times New Roman', serif",
  body: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
};

const container: React.CSSProperties = {
  maxWidth: 1000,
  margin: "0 auto",
  padding: "0 24px",
};

function FadeUp({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

function LangSwitch() {
  const { i18n } = useTranslation();
  const isDE = i18n.language?.startsWith("de");

  const switchLang = (lang: string) => {
    const scrollY = window.scrollY;
    i18n.changeLanguage(lang).then(() => {
      requestAnimationFrame(() => window.scrollTo(0, scrollY));
    });
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        right: 24,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        gap: 2,
        fontFamily: font.body,
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: "0.06em",
      }}
      data-testid="lang-switch"
    >
      <button
        onClick={() => switchLang("de")}
        style={{
          padding: "6px 10px",
          borderRadius: "8px 0 0 8px",
          border: `1px solid ${isDE ? ACCENT + "50" : v.border}`,
          borderRight: "none",
          background: isDE ? `${ACCENT}12` : "transparent",
          color: isDE ? ACCENT : v.muted,
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        data-testid="button-lang-de"
      >
        DE
      </button>
      <button
        onClick={() => switchLang("en")}
        style={{
          padding: "6px 10px",
          borderRadius: "0 8px 8px 0",
          border: `1px solid ${!isDE ? ACCENT + "50" : v.border}`,
          background: !isDE ? `${ACCENT}12` : "transparent",
          color: !isDE ? ACCENT : v.muted,
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        data-testid="button-lang-en"
      >
        EN
      </button>
    </div>
  );
}

function JoinCodeInput() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [code, setCode] = useState("");

  const handleJoin = useCallback(() => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed) {
      navigate(`/quick/${trimmed}`);
    }
  }, [code, navigate]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <p
        style={{
          fontFamily: font.body,
          fontSize: 12,
          color: v.mutedLight,
          letterSpacing: "0.04em",
        }}
      >
        {t("landing.quickJoin.sublabel")}
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          borderRadius: 50,
          border: `1.5px solid ${v.border}`,
          overflow: "hidden",
          background: `${ACCENT}06`,
        }}
      >
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          placeholder="CODE"
          style={{
            width: 160,
            padding: "11px 18px",
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: font.body,
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: "0.12em",
            color: v.text,
            textTransform: "uppercase",
          }}
          data-testid="input-join-code"
        />
        <button
          onClick={handleJoin}
          disabled={!code.trim()}
          style={{
            padding: "11px 20px",
            border: "none",
            borderLeft: `1px solid ${v.border}`,
            background: code.trim() ? ACCENT : "transparent",
            color: code.trim() ? v.bg : v.muted,
            fontFamily: font.body,
            fontSize: 13,
            fontWeight: 600,
            cursor: code.trim() ? "pointer" : "default",
            transition: "all 0.2s",
            letterSpacing: "0.02em",
          }}
          data-testid="button-join-code"
        >
          {t("landing.quickJoin.go")}
        </button>
      </div>
    </div>
  );
}

function AnimatedNumber({ value, suffix = "", delay = 0 }: { value: number; suffix?: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const startTime = Date.now() + delay;
    const duration = 1400;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed < 0) return;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress >= 1) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [inView, value, delay]);

  return <span ref={ref}>{inView ? display.toLocaleString() : "0"}{suffix}</span>;
}

function HeroSection() {
  const { t } = useTranslation();

  return (
    <section
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
        padding: "60px 24px 80px",
      }}
      data-testid="section-hero"
    >
      <LangSwitch />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 70% 50% at 50% 45%, ${ACCENT}05 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <motion.div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${ACCENT}04 0%, transparent 60%)`,
          top: "25%",
          left: "50%",
          transform: "translateX(-50%)",
          pointerEvents: "none",
        }}
        animate={{ scale: [1, 1.06, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <FadeUp>
        <div style={{ width: "min(280px, 60vw)", marginBottom: -12, position: "relative", zIndex: 1 }}>
          <img
            src={heroImage}
            alt=""
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              objectFit: "cover",
              maskImage: "radial-gradient(ellipse 65% 55% at 50% 50%, black 20%, transparent 70%)",
              WebkitMaskImage: "radial-gradient(ellipse 65% 55% at 50% 50%, black 20%, transparent 70%)",
              opacity: 0.3,
            }}
          />
        </div>
      </FadeUp>

      <FadeUp delay={0.1}>
        <p
          style={{
            fontFamily: font.body,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: ACCENT_DIM,
            marginBottom: 20,
            position: "relative",
            zIndex: 2,
          }}
        >
          {t("landing.hero.eyebrow")}
        </p>
      </FadeUp>

      <FadeUp delay={0.15}>
        <h1
          style={{
            fontFamily: font.display,
            fontSize: "clamp(52px, 9vw, 96px)",
            fontWeight: 400,
            color: v.text,
            letterSpacing: "-0.03em",
            lineHeight: 1.0,
            marginBottom: 20,
            position: "relative",
            zIndex: 2,
          }}
        >
          CaskSense
        </h1>
      </FadeUp>

      <FadeUp delay={0.3}>
        <p
          style={{
            fontFamily: font.display,
            fontSize: "clamp(17px, 2.2vw, 24px)",
            fontWeight: 400,
            fontStyle: "italic",
            color: v.muted,
            marginBottom: 12,
            letterSpacing: "0.01em",
            position: "relative",
            zIndex: 2,
          }}
        >
          {t("landing.hero.subline")}
        </p>
      </FadeUp>

      <FadeUp delay={0.45}>
        <p
          style={{
            fontFamily: font.body,
            fontSize: "clamp(14px, 1.5vw, 17px)",
            color: v.mutedLight,
            lineHeight: 1.65,
            maxWidth: 440,
            margin: "0 auto 44px",
            position: "relative",
            zIndex: 2,
          }}
        >
          {t("landing.hero.body")}
        </p>
      </FadeUp>

      <FadeUp delay={0.6}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            position: "relative",
            zIndex: 2,
          }}
        >
          <Link
            href="/labs/home"
            data-testid="cta-hero-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "17px 52px",
              background: ACCENT,
              color: v.bg,
              fontFamily: font.body,
              fontSize: 16,
              fontWeight: 600,
              borderRadius: 50,
              textDecoration: "none",
              boxShadow: `0 4px 24px ${ACCENT}30, 0 1px 3px rgba(0,0,0,0.2)`,
              transition: "transform 0.2s, box-shadow 0.2s",
              letterSpacing: "0.01em",
            }}
          >
            {t("landing.hero.startTasting")}
            <ChevronRight style={{ width: 17, height: 17 }} />
          </Link>

          <JoinCodeInput />
        </div>
      </FadeUp>

      <motion.div
        style={{
          position: "absolute",
          bottom: 32,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 2,
        }}
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <div
          style={{
            width: 24,
            height: 38,
            borderRadius: 12,
            border: `1.5px solid ${v.border}`,
            display: "flex",
            justifyContent: "center",
            paddingTop: 8,
          }}
        >
          <div
            style={{
              width: 2.5,
              height: 7,
              borderRadius: 2,
              background: v.muted,
              opacity: 0.6,
            }}
          />
        </div>
      </motion.div>
    </section>
  );
}

function TwoWaysSection() {
  const { t } = useTranslation();

  const cards = [
    {
      icon: <Wine style={{ width: 28, height: 28 }} />,
      title: t("landing.twoways.solo.title"),
      desc: t("landing.twoways.solo.text"),
      href: "/labs/tastings/solo",
      testId: "card-solo",
    },
    {
      icon: <Users style={{ width: 28, height: 28 }} />,
      title: t("landing.twoways.together.title"),
      desc: t("landing.twoways.together.text"),
      href: "/labs/onboarding",
      testId: "card-together",
    },
  ];

  return (
    <section style={{ padding: "80px 24px" }} data-testid="section-two-ways">
      <div style={{ ...container, maxWidth: 760 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
          }}
        >
          {cards.map((card, i) => (
            <FadeUp key={i} delay={i * 0.1}>
              <Link href={card.href} style={{ textDecoration: "none", display: "block", height: "100%" }} data-testid={`link-${card.testId}`}>
                <div
                  style={{
                    padding: "40px 32px",
                    borderRadius: 20,
                    border: `1px solid rgba(201,151,43,0.18)`,
                    background: "rgba(255,255,255,0.02)",
                    backdropFilter: "blur(12px)",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    textAlign: "center",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 16,
                  }}
                  data-testid={card.testId}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(201,151,43,0.4)";
                    e.currentTarget.style.boxShadow = `0 0 40px rgba(201,151,43,0.08)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(201,151,43,0.18)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 16,
                      background: `${ACCENT}0a`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: ACCENT,
                    }}
                  >
                    {card.icon}
                  </div>
                  <h3
                    style={{
                      fontFamily: font.display,
                      fontSize: 24,
                      fontWeight: 500,
                      color: v.text,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {card.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: font.body,
                      fontSize: 15,
                      color: v.muted,
                      lineHeight: 1.6,
                      maxWidth: 260,
                    }}
                  >
                    {card.desc}
                  </p>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: ACCENT,
                      marginTop: "auto",
                      paddingTop: 8,
                    }}
                  >
                    {t("landing.hero.cta")}
                    <ChevronRight style={{ width: 14, height: 14 }} />
                  </span>
                </div>
              </Link>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

const REVEAL_NAME = "Talisker 10";
const REVEAL_SCORE = "87.4";

function RevealMomentSection() {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [charCount, setCharCount] = useState(0);
  const [scoreCount, setScoreCount] = useState(0);
  const [showScore, setShowScore] = useState(false);

  useEffect(() => {
    if (!inView) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setCharCount(i);
      if (i >= REVEAL_NAME.length) {
        clearInterval(interval);
        setTimeout(() => {
          setShowScore(true);
          let s = 0;
          const scoreInterval = setInterval(() => {
            s++;
            setScoreCount(s);
            if (s >= REVEAL_SCORE.length) clearInterval(scoreInterval);
          }, 100);
        }, 400);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [inView]);

  return (
    <section
      ref={ref}
      style={{
        padding: "100px 24px",
        position: "relative",
        overflow: "hidden",
      }}
      data-testid="section-reveal"
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${ACCENT}06 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <div style={{ ...container, maxWidth: 700, textAlign: "center", position: "relative", zIndex: 1 }}>
        <FadeUp>
          <div
            style={{
              background: v.card,
              border: `1px solid ${v.border}`,
              borderRadius: 20,
              padding: "56px 32px",
              marginBottom: 40,
            }}
            data-testid="reveal-card"
          >
            <div
              style={{
                fontFamily: font.body,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: v.muted,
                marginBottom: 14,
              }}
            >
              {t("landing.reveal.label")}
            </div>
            <div
              style={{
                fontFamily: font.display,
                fontSize: "clamp(32px, 5vw, 52px)",
                fontWeight: 400,
                color: v.text,
                letterSpacing: "-0.02em",
                minHeight: "1.2em",
                marginBottom: 8,
              }}
              data-testid="text-reveal"
            >
              {inView ? REVEAL_NAME.slice(0, charCount) : ""}
              {inView && charCount < REVEAL_NAME.length && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  style={{ color: ACCENT }}
                >
                  |
                </motion.span>
              )}
            </div>
            {showScore && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                data-testid="text-reveal-score"
                style={{
                  fontFamily: font.body,
                  fontSize: "clamp(40px, 6vw, 64px)",
                  fontWeight: 700,
                  color: ACCENT,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {REVEAL_SCORE.slice(0, scoreCount)}
                {scoreCount < REVEAL_SCORE.length && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    style={{ color: ACCENT }}
                  >
                    |
                  </motion.span>
                )}
              </motion.div>
            )}
            <motion.div
              initial={{ width: 0 }}
              animate={inView ? { width: "50%" } : {}}
              transition={{ duration: 1.5, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{
                height: 1,
                margin: "24px auto 0",
                background: `linear-gradient(90deg, transparent, ${ACCENT}35, transparent)`,
              }}
            />
          </div>
        </FadeUp>

        <FadeUp delay={0.15}>
          <p
            style={{
              fontFamily: font.display,
              fontSize: "clamp(18px, 2.5vw, 26px)",
              fontWeight: 400,
              fontStyle: "italic",
              color: v.textSecondary,
              lineHeight: 1.5,
              maxWidth: 500,
              margin: "0 auto",
            }}
          >
            {t("landing.reveal.quote")}
          </p>
        </FadeUp>
      </div>
    </section>
  );
}

function BenchmarkSection() {
  const { t } = useTranslation();

  return (
    <section style={{ padding: "80px 24px" }} data-testid="section-benchmark">
      <div style={{ ...container, maxWidth: 920 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 32,
          }}
        >
          <FadeUp>
            <div
              style={{
                padding: "36px 32px",
                borderRadius: 20,
                border: `1px solid ${v.border}`,
                background: v.card,
                height: "100%",
              }}
              data-testid="card-benchmark-community"
            >
              <p
                style={{
                  fontFamily: font.body,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: ACCENT_DIM,
                  marginBottom: 12,
                }}
              >
                {t("landing.benchmark.community.eyebrow")}
              </p>
              <h3
                style={{
                  fontFamily: font.display,
                  fontSize: "clamp(20px, 2.5vw, 28px)",
                  fontWeight: 400,
                  color: v.text,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                  marginBottom: 28,
                }}
              >
                {t("landing.benchmark.community.title")}
              </h3>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "20px 16px",
                  borderRadius: 14,
                  background: `${ACCENT}06`,
                  border: `1px solid ${ACCENT}15`,
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    border: `3px solid ${ACCENT}40`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontFamily: font.body, fontSize: 22, fontWeight: 700, color: ACCENT, fontVariantNumeric: "tabular-nums" }}>
                    84.2
                  </span>
                </div>
                <div>
                  <div style={{ fontFamily: font.display, fontSize: 16, fontWeight: 600, color: v.text, marginBottom: 4 }}>
                    Lagavulin 16
                  </div>
                  <div style={{ fontFamily: font.body, fontSize: 12, color: v.muted, lineHeight: 1.4 }}>
                    Islay · 16y · 43% · 127 {t("landing.benchmark.ratings")}
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                    {[
                      { label: t("landing.benchmark.nose"), val: "86" },
                      { label: t("landing.benchmark.taste"), val: "85" },
                      { label: t("landing.benchmark.finish"), val: "82" },
                    ].map((d) => (
                      <div key={d.label} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: v.text, fontVariantNumeric: "tabular-nums" }}>{d.val}</div>
                        <div style={{ fontSize: 9, color: v.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{d.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeUp>

          <FadeUp delay={0.12}>
            <div
              style={{
                padding: "36px 32px",
                borderRadius: 20,
                border: `1px solid ${v.border}`,
                background: v.card,
                height: "100%",
              }}
              data-testid="card-benchmark-palate"
            >
              <p
                style={{
                  fontFamily: font.body,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: ACCENT_DIM,
                  marginBottom: 12,
                }}
              >
                {t("landing.benchmark.palate.eyebrow")}
              </p>
              <h3
                style={{
                  fontFamily: font.display,
                  fontSize: "clamp(20px, 2.5vw, 28px)",
                  fontWeight: 400,
                  color: v.text,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                  marginBottom: 28,
                }}
              >
                {t("landing.benchmark.palate.title")}
              </h3>

              <div
                style={{
                  padding: "20px 16px",
                  borderRadius: 14,
                  background: `${ACCENT}06`,
                  border: `1px solid ${ACCENT}15`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <span style={{ fontFamily: font.display, fontSize: 14, fontWeight: 600, color: v.text }}>{t("landing.benchmark.palate.heading")}</span>
                  <span style={{ fontSize: 11, color: v.muted }}>{t("landing.benchmark.palate.dims")}</span>
                </div>
                {[
                  { label: t("landing.benchmark.smoke"), you: 78, avg: 62, delta: "+16" },
                  { label: t("landing.benchmark.sweetness"), you: 45, avg: 58, delta: "−13" },
                  { label: t("landing.benchmark.fruit"), you: 72, avg: 70, delta: "+2" },
                  { label: t("landing.benchmark.spice"), you: 68, avg: 55, delta: "+13" },
                  { label: t("landing.benchmark.body"), you: 82, avg: 71, delta: "+11" },
                ].map((dim) => (
                  <div key={dim.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ width: 64, fontSize: 12, fontWeight: 500, color: v.muted, textAlign: "right" }}>{dim.label}</span>
                    <div style={{ flex: 1, height: 5, borderRadius: 3, background: `${ACCENT}10`, position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${dim.avg}%`, background: `${ACCENT}25`, borderRadius: 3 }} />
                      <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${dim.you}%`, background: ACCENT, borderRadius: 3 }} />
                    </div>
                    <span style={{
                      width: 32, fontSize: 11, fontWeight: 700, textAlign: "right",
                      color: dim.delta.startsWith("+") ? v.success : dim.delta.startsWith("−") ? v.danger : v.muted,
                      fontVariantNumeric: "tabular-nums",
                    }}>
                      {dim.delta}
                    </span>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 12 }}>
                  <span style={{ fontSize: 10, color: v.muted, display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 12, height: 3, borderRadius: 2, background: ACCENT, display: "inline-block" }} /> {t("landing.benchmark.palate.you")}
                  </span>
                  <span style={{ fontSize: 10, color: v.muted, display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 12, height: 3, borderRadius: 2, background: `${ACCENT}25`, display: "inline-block" }} /> {t("landing.benchmark.palate.communityLabel")}
                  </span>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}

function SocialProofSection() {
  const { t } = useTranslation();

  const stats = [
    { value: 1580, suffix: "+", label: t("landing.proof.whiskies") },
    { value: 21, suffix: "", label: t("landing.proof.regions") },
    { value: 5, suffix: "", label: t("landing.proof.dimensions") },
  ];

  return (
    <section style={{ padding: "80px 24px", textAlign: "center" }} data-testid="section-proof">
      <div style={container}>
        <FadeUp>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "clamp(32px, 6vw, 80px)",
              marginBottom: 40,
              flexWrap: "wrap",
            }}
          >
            {stats.map((stat, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontFamily: font.display,
                    fontSize: "clamp(36px, 6vw, 64px)",
                    fontWeight: 400,
                    color: v.text,
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                    marginBottom: 8,
                    fontVariantNumeric: "tabular-nums",
                  }}
                  data-testid={`stat-${i}`}
                >
                  <AnimatedNumber value={stat.value} suffix={stat.suffix} delay={i * 200} />
                </div>
                <div
                  style={{
                    fontFamily: font.body,
                    fontSize: 13,
                    fontWeight: 500,
                    color: v.muted,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </FadeUp>
        <FadeUp delay={0.15}>
          <p
            style={{
              fontFamily: font.display,
              fontSize: "clamp(16px, 2vw, 22px)",
              fontWeight: 400,
              fontStyle: "italic",
              color: v.muted,
              maxWidth: 480,
              margin: "0 auto",
              lineHeight: 1.5,
            }}
          >
            {t("landing.proof.tagline")}
          </p>
        </FadeUp>
      </div>
    </section>
  );
}

function CTASection() {
  const { t } = useTranslation();

  return (
    <section
      style={{
        padding: "100px 24px 60px",
        textAlign: "center",
        position: "relative",
      }}
      data-testid="section-cta"
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 60% 50% at 50% 40%, ${ACCENT}04 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <div style={{ ...container, position: "relative", zIndex: 1 }}>
        <FadeUp>
          <h2
            style={{
              fontFamily: font.display,
              fontSize: "clamp(28px, 4.5vw, 48px)",
              fontWeight: 400,
              fontStyle: "italic",
              color: v.text,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              marginBottom: 40,
            }}
          >
            {t("landing.cta.title")}
          </h2>
        </FadeUp>
        <FadeUp delay={0.1}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 24,
            }}
          >
            <Link
              href="/labs/home"
              data-testid="cta-final-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "17px 52px",
                background: ACCENT,
                color: v.bg,
                fontFamily: font.body,
                fontSize: 16,
                fontWeight: 600,
                borderRadius: 50,
                textDecoration: "none",
                boxShadow: `0 4px 24px ${ACCENT}30, 0 1px 3px rgba(0,0,0,0.2)`,
                transition: "transform 0.2s, box-shadow 0.2s",
                letterSpacing: "0.01em",
              }}
            >
              {t("landing.cta.button")}
              <ChevronRight style={{ width: 17, height: 17 }} />
            </Link>

            <JoinCodeInput />
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

function Footer() {
  const { t } = useTranslation();

  return (
    <footer
      style={{
        padding: "32px 24px",
        textAlign: "center",
        borderTop: `1px solid ${v.border}`,
      }}
      data-testid="section-footer"
    >
      <div style={container}>
        <p
          style={{
            fontFamily: font.body,
            fontSize: 13,
            color: v.mutedLight,
            marginBottom: 4,
          }}
        >
          {t("premium.footerTagline")}
        </p>
        <p
          style={{
            fontFamily: font.body,
            fontSize: 11,
            color: v.mutedLight,
            opacity: 0.6,
            marginBottom: 12,
          }}
        >
          {t("premium.footerHobby")}
        </p>
        <div
          style={{
            display: "flex",
            gap: 24,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/feature-overview"
            data-testid="link-footer-features"
            style={{
              fontFamily: font.body,
              fontSize: 12,
              color: v.muted,
              textDecoration: "none",
            }}
          >
            {t("premium.footerFeatures")}
          </Link>
          <Link
            href="/impressum"
            data-testid="link-footer-impressum"
            style={{
              fontFamily: font.body,
              fontSize: 12,
              color: v.muted,
              textDecoration: "none",
            }}
          >
            Impressum
          </Link>
          <Link
            href="/privacy"
            data-testid="link-footer-privacy"
            style={{
              fontFamily: font.body,
              fontSize: 12,
              color: v.muted,
              textDecoration: "none",
            }}
          >
            {t("premium.footerPrivacy")}
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default function LandingNew() {
  return (
    <div
      style={{
        background: v.bg,
        color: v.text,
        minHeight: "100dvh",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
      <HeroSection />
      <TwoWaysSection />
      <RevealMomentSection />
      <BenchmarkSection />
      <SocialProofSection />
      <CTASection />
      <Footer />
    </div>
  );
}

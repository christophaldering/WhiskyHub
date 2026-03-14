import { useRef, useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { motion, useInView } from "framer-motion";
import {
  ChevronRight, Eye,
  Users, FileText, Download,
  Sparkles, BookOpen, BarChart3,
  Camera, Lock, Printer,
} from "lucide-react";
import { useTranslation } from "react-i18next";
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
        Have a tasting code? Join instantly — no account needed.
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
          Join
        </button>
      </div>
    </div>
  );
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
          Whisky Tasting Platform
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
          Where tasting becomes reflection.
        </p>
      </FadeUp>

      <FadeUp delay={0.45}>
        <p
          style={{
            fontFamily: font.body,
            fontSize: "clamp(14px, 1.5vw, 17px)",
            color: v.mutedLight,
            lineHeight: 1.65,
            maxWidth: 400,
            margin: "0 auto 44px",
            position: "relative",
            zIndex: 2,
          }}
        >
          The most thoughtful way to explore whisky — alone or together.
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
            Start Tasting
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

function ValueProofSection() {
  const { t } = useTranslation();

  const cards = [
    {
      icon: <Users style={{ width: 22, height: 22 }} />,
      title: t("premium.proofHostTitle"),
      desc: t("premium.proofHostDesc"),
    },
    {
      icon: <BarChart3 style={{ width: 22, height: 22 }} />,
      title: t("premium.proofTasteTitle"),
      desc: t("premium.proofTasteDesc"),
    },
    {
      icon: <Printer style={{ width: 22, height: 22 }} />,
      title: t("premium.proofBeautyTitle"),
      desc: t("premium.proofBeautyDesc"),
    },
  ];

  return (
    <section style={{ padding: "80px 24px" }} data-testid="section-value-proof">
      <div style={container}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
            maxWidth: 920,
            margin: "0 auto",
          }}
        >
          {cards.map((card, i) => (
            <FadeUp key={i} delay={0.06 + i * 0.08}>
              <div
                style={{
                  background: v.card,
                  border: `1px solid ${v.border}`,
                  borderRadius: 16,
                  padding: "32px 28px",
                  textAlign: "center",
                  height: "100%",
                }}
                data-testid={`card-proof-${i}`}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: `${ACCENT}0a`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: ACCENT,
                    margin: "0 auto 20px",
                  }}
                >
                  {card.icon}
                </div>
                <h3
                  style={{
                    fontFamily: font.display,
                    fontSize: 20,
                    fontWeight: 500,
                    color: v.text,
                    marginBottom: 10,
                    letterSpacing: "-0.01em",
                    lineHeight: 1.3,
                  }}
                >
                  {card.title}
                </h3>
                <p
                  style={{
                    fontFamily: font.body,
                    fontSize: 14,
                    color: v.muted,
                    lineHeight: 1.6,
                  }}
                >
                  {card.desc}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const { t } = useTranslation();

  const steps = [
    {
      num: "1",
      title: t("premium.step1Title"),
      desc: t("premium.step1Desc"),
    },
    {
      num: "2",
      title: t("premium.step2Title"),
      desc: t("premium.step2Desc"),
    },
    {
      num: "3",
      title: t("premium.step3Title"),
      desc: t("premium.step3Desc"),
    },
  ];

  return (
    <section style={{ padding: "80px 24px" }} data-testid="section-how-it-works">
      <div style={container}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p
              style={{
                fontFamily: font.body,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: ACCENT_DIM,
                marginBottom: 14,
              }}
            >
              {t("premium.howEyebrow")}
            </p>
            <h2
              style={{
                fontFamily: font.display,
                fontSize: "clamp(26px, 4vw, 40px)",
                fontWeight: 400,
                color: v.text,
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                marginBottom: 12,
              }}
            >
              {t("premium.howTitle")}
            </h2>
            <p
              style={{
                fontFamily: font.body,
                fontSize: 15,
                color: v.muted,
                lineHeight: 1.6,
                maxWidth: 440,
                margin: "0 auto",
              }}
            >
              {t("premium.howSub")}
            </p>
          </div>
        </FadeUp>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 20,
            maxWidth: 820,
            margin: "0 auto",
          }}
        >
          {steps.map((step, i) => (
            <FadeUp key={step.num} delay={0.06 + i * 0.08}>
              <div
                style={{
                  position: "relative",
                  padding: "28px 24px",
                  background: v.card,
                  border: `1px solid ${v.border}`,
                  borderRadius: 14,
                  textAlign: "center",
                }}
                data-testid={`card-step-${step.num}`}
              >
                <div
                  style={{
                    fontFamily: font.display,
                    fontSize: 48,
                    fontWeight: 300,
                    color: `${ACCENT}15`,
                    lineHeight: 1,
                    position: "absolute",
                    top: 12,
                    right: 16,
                  }}
                >
                  {step.num}
                </div>
                <h3
                  style={{
                    fontFamily: font.display,
                    fontSize: 20,
                    fontWeight: 500,
                    color: v.text,
                    marginBottom: 8,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontFamily: font.body,
                    fontSize: 13,
                    color: v.muted,
                    lineHeight: 1.55,
                  }}
                >
                  {step.desc}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

function ExperienceSection() {
  const { t } = useTranslation();

  const features = [
    {
      icon: <Eye style={{ width: 18, height: 18 }} />,
      title: t("premium.expBlindTitle"),
      desc: t("premium.expBlindDesc"),
    },
    {
      icon: <Sparkles style={{ width: 18, height: 18 }} />,
      title: t("premium.expRevealTitle"),
      desc: t("premium.expRevealDesc"),
    },
    {
      icon: <Camera style={{ width: 18, height: 18 }} />,
      title: t("premium.expJournalTitle"),
      desc: t("premium.expJournalDesc"),
    },
    {
      icon: <BarChart3 style={{ width: 18, height: 18 }} />,
      title: t("premium.expAnalyticsTitle"),
      desc: t("premium.expAnalyticsDesc"),
    },
    {
      icon: <BookOpen style={{ width: 18, height: 18 }} />,
      title: t("premium.expKnowledgeTitle"),
      desc: t("premium.expKnowledgeDesc"),
    },
    {
      icon: <Lock style={{ width: 18, height: 18 }} />,
      title: t("premium.expCircleTitle"),
      desc: t("premium.expCircleDesc"),
    },
  ];

  return (
    <section style={{ padding: "80px 24px" }} data-testid="section-experience">
      <div style={{ ...container, maxWidth: 860 }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p
              style={{
                fontFamily: font.body,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: ACCENT_DIM,
                marginBottom: 14,
              }}
            >
              {t("premium.expEyebrow")}
            </p>
            <h2
              style={{
                fontFamily: font.display,
                fontSize: "clamp(26px, 4vw, 40px)",
                fontWeight: 400,
                color: v.text,
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                marginBottom: 12,
              }}
            >
              {t("premium.expTitle")}
            </h2>
            <p
              style={{
                fontFamily: font.body,
                fontSize: 15,
                color: v.muted,
                lineHeight: 1.6,
                maxWidth: 460,
                margin: "0 auto",
              }}
            >
              {t("premium.expSub")}
            </p>
          </div>
        </FadeUp>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {features.map((feat, i) => (
            <FadeUp key={i} delay={0.04 + i * 0.05}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  padding: "20px 18px",
                  background: v.card,
                  border: `1px solid ${v.border}`,
                  borderRadius: 12,
                  height: "100%",
                }}
                data-testid={`card-exp-${i}`}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    flexShrink: 0,
                    background: `${ACCENT}08`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: ACCENT,
                  }}
                >
                  {feat.icon}
                </div>
                <div>
                  <h4
                    style={{
                      fontFamily: font.body,
                      fontSize: 14,
                      fontWeight: 600,
                      color: v.text,
                      marginBottom: 4,
                    }}
                  >
                    {feat.title}
                  </h4>
                  <p
                    style={{
                      fontFamily: font.body,
                      fontSize: 13,
                      color: v.muted,
                      lineHeight: 1.5,
                    }}
                  >
                    {feat.desc}
                  </p>
                </div>
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
  const { t } = useTranslation();
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
    <section style={{ padding: "80px 24px" }} ref={ref} data-testid="section-reveal">
      <div style={{ ...container, maxWidth: 560, textAlign: "center" }}>
        <FadeUp>
          <p
            style={{
              fontFamily: font.body,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: ACCENT_DIM,
              marginBottom: 16,
            }}
          >
            {t("premium.revealEyebrow")}
          </p>
          <h2
            style={{
              fontFamily: font.display,
              fontSize: "clamp(24px, 3.5vw, 36px)",
              fontWeight: 400,
              color: v.text,
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              marginBottom: 36,
            }}
          >
            {t("premium.revealTitle")}
          </h2>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div
            style={{
              background: v.card,
              border: `1px solid ${v.border}`,
              borderRadius: 16,
              padding: "44px 28px",
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
              {t("premium.revealLabel")}
            </div>
            <div
              style={{
                fontFamily: font.display,
                fontSize: "clamp(32px, 5vw, 48px)",
                fontWeight: 400,
                color: v.text,
                letterSpacing: "-0.02em",
                minHeight: "1.2em",
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
            <motion.div
              initial={{ width: 0 }}
              animate={inView ? { width: "50%" } : {}}
              transition={{ duration: 1.5, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{
                height: 1,
                margin: "20px auto 0",
                background: `linear-gradient(90deg, transparent, ${ACCENT}35, transparent)`,
              }}
            />
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

function PhilosophySection() {
  const { t } = useTranslation();

  return (
    <section style={{ padding: "80px 24px" }} data-testid="section-philosophy">
      <div style={{ ...container, maxWidth: 600, textAlign: "center" }}>
        <FadeUp>
          <p
            style={{
              fontFamily: font.body,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: ACCENT_DIM,
              marginBottom: 14,
            }}
          >
            {t("premium.philEyebrow")}
          </p>
          <h2
            style={{
              fontFamily: font.display,
              fontSize: "clamp(24px, 3.5vw, 36px)",
              fontWeight: 400,
              color: v.text,
              letterSpacing: "-0.02em",
              lineHeight: 1.25,
              marginBottom: 20,
            }}
          >
            {t("premium.philTitle")}
          </h2>
          <p
            style={{
              fontFamily: font.body,
              fontSize: 15,
              color: v.muted,
              lineHeight: 1.7,
              marginBottom: 12,
            }}
          >
            {t("premium.philP1")}
          </p>
          <p
            style={{
              fontFamily: font.display,
              fontSize: 17,
              fontStyle: "italic",
              color: v.textSecondary,
              lineHeight: 1.5,
            }}
          >
            {t("premium.philQuote")}
          </p>
        </FadeUp>
      </div>
    </section>
  );
}

function DownloadsSection() {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);

  const handleFeatureDownload = async () => {
    setDownloading(true);
    try {
      await generateCaskSensePresentation();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section style={{ padding: "48px 24px" }} data-testid="section-downloads">
      <div style={{ ...container, maxWidth: 560, textAlign: "center" }}>
        <FadeUp>
          <p
            style={{
              fontFamily: font.body,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: ACCENT_DIM,
              marginBottom: 20,
            }}
          >
            {t("premium.downloadTitle")}
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={handleFeatureDownload}
              disabled={downloading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 24px",
                borderRadius: 10,
                background: "transparent",
                border: `1px solid ${v.border}`,
                color: v.muted,
                fontFamily: font.body,
                fontSize: 13,
                fontWeight: 500,
                cursor: downloading ? "not-allowed" : "pointer",
                opacity: downloading ? 0.5 : 1,
                transition: "all 0.2s",
              }}
              data-testid="button-download-feature-pdf"
            >
              <Download style={{ width: 14, height: 14 }} />
              {downloading ? t("premium.downloadCreating") : t("premium.downloadFeature")}
            </button>
            <button
              type="button"
              disabled
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 24px",
                borderRadius: 10,
                background: "transparent",
                border: `1px solid ${v.border}`,
                color: v.muted,
                fontFamily: font.body,
                fontSize: 13,
                fontWeight: 500,
                cursor: "default",
                opacity: 0.45,
                transition: "all 0.2s",
              }}
              data-testid="button-download-guided-pdf"
            >
              <FileText style={{ width: 14, height: 14 }} />
              {t("premium.downloadGuided")}
            </button>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

function CTASection() {
  const { t } = useTranslation();

  return (
    <section style={{ padding: "80px 24px 60px", textAlign: "center" }} data-testid="section-cta">
      <div style={container}>
        <FadeUp>
          <h2
            style={{
              fontFamily: font.display,
              fontSize: "clamp(26px, 4vw, 42px)",
              fontWeight: 400,
              color: v.text,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              marginBottom: 32,
            }}
          >
            {t("premium.finalCtaTitle")}
          </h2>
        </FadeUp>
        <FadeUp delay={0.1}>
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
            {t("premium.ctaPrimary")}
            <ChevronRight style={{ width: 17, height: 17 }} />
          </Link>
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
      <ValueProofSection />
      <HowItWorksSection />
      <ExperienceSection />
      <RevealSection />
      <PhilosophySection />
      <DownloadsSection />
      <CTASection />
      <Footer />
    </div>
  );
}

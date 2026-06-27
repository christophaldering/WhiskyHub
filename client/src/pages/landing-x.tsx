import { useRef, useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { motion, useInView } from "framer-motion";
import { ChevronRight, Wine, Users, Mic, SplitSquareVertical, Sun, Moon, ClipboardList } from "lucide-react";
import { useTranslation } from "react-i18next";
import { v } from "@/lib/themeVars";
import { useAppStore } from "@/lib/store";
import { getSession } from "@/lib/session";
import heroImage from "@/assets/images/hero-whisky.png";
import arc1 from "@/assets/images/arc-1-erleben.png";
import arc2 from "@/assets/images/arc-2-vergleich.png";
import arc3 from "@/assets/images/arc-3-muster.png";

const ACCENT = "#C9A961";
const ACCENT_DIM = "#8E7640";

const font = {
  display: "'EB Garamond', Georgia, 'Times New Roman', serif",
  body: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
};

const FILM_GRAIN_BG = "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

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

function HeaderNav() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme, currentParticipant } = useAppStore();
  const [, navigate] = useLocation();
  const [code, setCode] = useState("");
  const isDE = i18n.language?.startsWith("de");
  const session = getSession();
  const signedIn = session.signedIn || !!currentParticipant;

  const switchLang = (lang: string) => {
    const scrollY = window.scrollY;
    i18n.changeLanguage(lang).then(() => {
      requestAnimationFrame(() => window.scrollTo(0, scrollY));
    });
  };

  const handleJoin = useCallback(() => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed) {
      navigate(`/labs/join/${trimmed}`);
    }
  }, [code, navigate]);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: v.bg,
        borderBottom: `1px solid ${v.border}`,
        padding: "16px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
      }}
      data-testid="header-nav"
    >
      <div style={{ fontFamily: font.display, fontSize: 18, fontWeight: 600, color: v.text }}>CaskSense</div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Link
          href="/labs/onboarding"
          style={{
            padding: "8px 16px",
            borderRadius: 6,
            background: ACCENT,
            color: "#0b0906",
            fontWeight: 500,
            fontSize: 12,
            textDecoration: "none",
            border: "none",
            cursor: "pointer",
            transition: "all 0.3s",
          }}
          data-testid="link-header-solo-cta"
        >
          Solo verkosten — mit Cooper
        </Link>

        <div style={{ display: "flex", gap: 0, alignItems: "center", borderRadius: 6, overflow: "hidden", border: `1.5px solid ${v.border}`, background: `${ACCENT}06` }}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            placeholder="CODE"
            style={{
              width: 110,
              padding: "8px 14px",
              border: "none",
              outline: "none",
              background: "transparent",
              fontFamily: font.body,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "0.08em",
              color: v.text,
              textTransform: "uppercase",
            }}
            data-testid="input-header-join-code"
          />
          <button
            onClick={handleJoin}
            disabled={!code.trim()}
            style={{
              padding: "8px 14px",
              border: `1px solid ${v.border}`,
              borderLeft: `1px solid ${v.border}`,
              background: code.trim() ? ACCENT : "transparent",
              color: code.trim() ? "#0b0906" : v.muted,
              fontFamily: font.body,
              fontSize: 12,
              fontWeight: 600,
              cursor: code.trim() ? "pointer" : "not-allowed",
              transition: "all 0.2s",
            }}
            data-testid="button-header-join"
          >
            Beitreten
          </button>
        </div>

        <button
          onClick={toggleTheme}
          style={{
            padding: "6px 8px",
            borderRadius: 6,
            border: `1px solid ${v.border}`,
            background: "transparent",
            color: v.muted,
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="Toggle theme"
          data-testid="button-theme-toggle"
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section style={{ padding: "120px 24px 80px", textAlign: "center" }} data-testid="section-hero">
      <div style={{ ...container }}>
        <div
          style={{
            fontFamily: font.body,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: ACCENT_DIM,
            marginBottom: 20,
          }}
        >
          Für alle, die Whisky bewusst genießen
        </div>

        <h1
          style={{
            fontFamily: font.display,
            fontSize: "clamp(40px, 6vw, 56px)",
            fontWeight: 400,
            color: v.text,
            letterSpacing: "-0.01em",
            marginBottom: 12,
            lineHeight: 1,
          }}
        >
          CaskSense
        </h1>

        <p
          style={{
            fontFamily: font.body,
            fontSize: 20,
            fontStyle: "italic",
            color: ACCENT,
            marginBottom: 24,
          }}
        >
          Where tasting becomes reflection.
        </p>

        <p
          style={{
            fontFamily: font.body,
            fontSize: "clamp(15px, 1.6vw, 17px)",
            lineHeight: 1.7,
            color: v.muted,
            maxWidth: 600,
            margin: "0 auto",
          }}
        >
          Verkosten, Worte finden, beschreiben, vergleichen und den eigenen Geschmack immer besser verstehen.
        </p>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const cards = [
    {
      icon: "🥃",
      title: "Solo verkosten",
      desc: "Dein persönliches Tasting-Tagebuch mit Cooper als Begleiter.",
      testId: "card-solo",
    },
    {
      icon: "👥",
      title: "Mit Freunden",
      desc: "Live tastings in der Gruppe, blind oder offen, mit Ergebnisse.",
      testId: "card-together",
    },
    {
      icon: "🎙️",
      title: "Host Cockpit",
      desc: "Steuere Tastings, sehe Live-Bewertungen, moderiere die Runde.",
      testId: "card-hosting",
    },
    {
      icon: "📊",
      title: "Vergleichen & analysieren",
      desc: "Deine Noten vs. Community, Palate-Profile, Benchmark-Vergleiche.",
      testId: "card-sharing",
    },
  ];

  return (
    <section style={{ padding: "80px 24px", background: v.bg }} data-testid="section-features">
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
              <Link href="/labs/onboarding" style={{ textDecoration: "none", display: "block", height: "100%" }} data-testid={`link-${card.testId}`}>
                <div
                  style={{
                    padding: "40px 32px",
                    borderRadius: 20,
                    border: `1px solid ${ACCENT}30`,
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
                    e.currentTarget.style.borderColor = `${ACCENT}60`;
                    e.currentTarget.style.boxShadow = `0 0 40px ${ACCENT}15`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${ACCENT}30`;
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
                      fontSize: 28,
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
                    Loslegen
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

function BenchmarkSection() {
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
                Community Benchmark
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
                Lagavulin 16
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
                    Islay · 16y · 43% · 127 Bewertungen
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                    {[
                      { label: "Nase", val: "86" },
                      { label: "Gaumen", val: "85" },
                      { label: "Abgang", val: "82" },
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
                Dein Palate Profil
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
                Deine Aromen
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
                  <span style={{ fontFamily: font.display, fontSize: 14, fontWeight: 600, color: v.text }}>Aroma-Dimensionen</span>
                  <span style={{ fontSize: 11, color: v.muted }}>Dein Score · Community Ø</span>
                </div>
                {[
                  { label: "Rauch", you: 78, avg: 62, delta: "+16" },
                  { label: "Süße", you: 45, avg: 58, delta: "−13" },
                  { label: "Frucht", you: 72, avg: 70, delta: "+2" },
                  { label: "Würze", you: 68, avg: 55, delta: "+13" },
                  { label: "Körper", you: 82, avg: 71, delta: "+11" },
                ].map((dim) => (
                  <div key={dim.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ width: 64, fontSize: 12, fontWeight: 500, color: v.muted, textAlign: "right" }}>{dim.label}</span>
                    <div style={{ flex: 1, height: 5, borderRadius: 3, background: `${ACCENT}10`, position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${dim.avg}%`, background: `${ACCENT}25`, borderRadius: 3 }} />
                      <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${dim.you}%`, background: ACCENT, borderRadius: 3 }} />
                    </div>
                    <span
                      style={{
                        width: 32,
                        fontSize: 11,
                        fontWeight: 700,
                        textAlign: "right",
                        color: dim.delta.startsWith("+") ? v.success : dim.delta.startsWith("−") ? v.danger : v.muted,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {dim.delta}
                    </span>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 12 }}>
                  <span style={{ fontSize: 10, color: v.muted, display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 12, height: 3, borderRadius: 2, background: ACCENT, display: "inline-block" }} /> Dein Score
                  </span>
                  <span style={{ fontSize: 10, color: v.muted, display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 12, height: 3, borderRadius: 2, background: `${ACCENT}25`, display: "inline-block" }} /> Community Ø
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

function ArcSection() {
  const steps = [
    {
      num: "01",
      img: arc1,
      eyebrow: "Erleben wird Benennen",
      title: "Aus einem Schluck werden Worte.",
      body: "Du genießt, beschreibst, hältst fest. Wenn du magst, schärft Cooper mit — ein ruhiger KI-Begleiter, der nichts vorgibt.",
      praxis: "Halt jede Verkostung fest — solo oder in der Gruppe — und finde für jedes Aroma das treffende Wort.",
    },
    {
      num: "02",
      img: arc2,
      eyebrow: "Benennen wird Vergleichen",
      title: "Aus Worten wird Vergleich.",
      body: "Deine Worte werden vergleichbar — über die Zeit, in der Runde, in der Community.",
      praxis: "Veranstalte eigene Tastings, werte sie aus und vergleiche — über die Zeit und mit der ganzen Community.",
    },
    {
      num: "03",
      img: arc3,
      eyebrow: "Vergleichen wird Erkennen",
      title: "Aus Vergleich werden Muster.",
      body: "Einzelne Eindrücke sind subjektiv. Viele zusammen werden zu Erkenntnis.",
      praxis: "Eine Datenbank, die mit jedem Dram wächst — und zeigt, welche Whiskys sich ähneln und wie dein Gaumen tickt.",
    },
  ];

  return (
    <section style={{ padding: "96px 24px" }} data-testid="section-arc">
      <style>{`
        .arc-step { display: grid; grid-template-columns: 1fr; gap: 28px; align-items: center; }
        @media (min-width: 760px) {
          .arc-step { grid-template-columns: 240px 1fr; gap: 48px; }
        }
      `}</style>
      <div style={{ ...container, maxWidth: 920 }}>
        {steps.map((s, i) => (
          <FadeUp key={i} delay={i * 0.1}>
            <div
              className="arc-step"
              style={{
                paddingBottom: i < steps.length - 1 ? 56 : 0,
                marginBottom: i < steps.length - 1 ? 56 : 0,
                borderBottom: i < steps.length - 1 ? `1px solid ${v.border}` : "none",
              }}
            >
              <img
                src={s.img}
                alt=""
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  borderRadius: 16,
                  aspectRatio: "1 / 1",
                  objectFit: "cover",
                  maskImage: "radial-gradient(ellipse 88% 88% at 50% 50%, black 66%, transparent 100%)",
                  WebkitMaskImage: "radial-gradient(ellipse 88% 88% at 50% 50%, black 66%, transparent 100%)",
                }}
              />
              <div>
                <span
                  style={{
                    fontFamily: font.display,
                    fontSize: "clamp(28px, 4.5vw, 40px)",
                    fontWeight: 400,
                    color: `${ACCENT}40`,
                    lineHeight: 1,
                    display: "block",
                    marginBottom: 14,
                  }}
                >
                  {s.num}
                </span>
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
                  {s.eyebrow}
                </p>
                <h2
                  style={{
                    fontFamily: font.display,
                    fontSize: "clamp(23px, 3.2vw, 32px)",
                    fontWeight: 400,
                    color: v.text,
                    letterSpacing: "-0.01em",
                    lineHeight: 1.2,
                    marginBottom: 14,
                  }}
                >
                  {s.title}
                </h2>
                <p
                  style={{
                    fontFamily: font.body,
                    fontSize: "clamp(15px, 1.6vw, 17px)",
                    lineHeight: 1.7,
                    color: v.muted,
                  }}
                >
                  {s.body}
                </p>
                <div
                  style={{
                    marginTop: 22,
                    paddingTop: 18,
                    borderTop: `1px solid ${ACCENT}24`,
                  }}
                >
                  <p
                    style={{
                      fontFamily: font.body,
                      fontSize: 10.5,
                      fontWeight: 600,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: ACCENT_DIM,
                      marginBottom: 8,
                    }}
                  >
                    In der Praxis
                  </p>
                  <p
                    style={{
                      fontFamily: font.body,
                      fontSize: "clamp(15px, 1.6vw, 17px)",
                      lineHeight: 1.7,
                      color: v.muted,
                    }}
                  >
                    {s.praxis}
                  </p>
                </div>
              </div>
            </div>
          </FadeUp>
        ))}
      </div>
    </section>
  );
}

function LiveStatsSection() {
  return (
    <section style={{ padding: "80px 24px", textAlign: "center" }} data-testid="section-stats">
      <div style={{ ...container, maxWidth: 620 }}>
        <FadeUp>
          <p
            style={{
              fontFamily: font.body,
              fontSize: "clamp(16px, 2vw, 18px)",
              color: v.text,
              marginBottom: 32,
              fontWeight: 500,
            }}
          >
            Gemeinsam entsteht, was keiner allein hätte.
          </p>
        </FadeUp>
        <FadeUp delay={0.1}>
          <p
            style={{
              fontFamily: font.body,
              fontSize: "clamp(15px, 1.6vw, 17px)",
              lineHeight: 1.7,
              color: v.muted,
            }}
          >
            Eine Wissensbasis über Whisky, die mit jedem Dram wächst.
          </p>
        </FadeUp>
      </div>
    </section>
  );
}

function StanceSection() {
  return (
    <section style={{ padding: "80px 24px 96px" }} data-testid="section-stance">
      <div style={{ ...container, maxWidth: 620, textAlign: "center" }}>
        <FadeUp>
          <h2
            style={{
              fontFamily: font.display,
              fontSize: "clamp(22px, 3vw, 30px)",
              fontWeight: 400,
              fontStyle: "italic",
              color: v.text,
              letterSpacing: "-0.01em",
              lineHeight: 1.3,
              marginBottom: 18,
            }}
          >
            Ein privates Projekt aus Leidenschaft.
          </h2>
        </FadeUp>
        <FadeUp delay={0.1}>
          <p
            style={{
              fontFamily: font.body,
              fontSize: "clamp(15px, 1.6vw, 17px)",
              lineHeight: 1.7,
              color: v.muted,
              maxWidth: 480,
              margin: "0 auto",
            }}
          >
            Keine kommerzielle Absicht, kein Tracking, keine Werbung. CaskSense folgt einer einfachen Überzeugung: Ein Eindruck wird klarer, wenn man ihn benennt — und das verdient einen Ort, der dir nichts verkaufen will.
          </p>
        </FadeUp>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ padding: "40px 24px", borderTop: `1px solid ${v.border}`, textAlign: "center" }} data-testid="footer">
      <div style={{ ...container, maxWidth: 920 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 24, fontSize: 12 }}>
            <Link
              href="/imprint"
              data-testid="link-footer-imprint"
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
              Datenschutz
            </Link>
            <Link
              href="/terms"
              data-testid="link-footer-terms"
              style={{
                fontFamily: font.body,
                fontSize: 12,
                color: v.muted,
                textDecoration: "none",
              }}
            >
              Nutzungsbedingungen
            </Link>
          </div>
          <p style={{ fontFamily: font.body, fontSize: 12, color: v.muted, margin: 0, fontStyle: "italic" }}>
            CaskSense — Where tasting becomes reflection.
          </p>
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
        fontFamily: font.body,
        position: "relative",
      }}
      data-testid="landing-root"
    >
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 999,
          opacity: 0.04,
          mixBlendMode: "overlay",
          backgroundImage: FILM_GRAIN_BG,
        }}
      />
      <HeaderNav />
      <HeroSection />
      <ArcSection />
      <FeaturesSection />
      <BenchmarkSection />
      <LiveStatsSection />
      <StanceSection />
      <Footer />
    </div>
  );
}
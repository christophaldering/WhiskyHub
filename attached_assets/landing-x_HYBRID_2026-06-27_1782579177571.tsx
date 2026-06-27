import { useRef, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { motion, useInView } from "framer-motion";
import { ChevronRight, Wine, PenLine, SplitSquareVertical, Users, Mic, Sun, Moon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { v } from "@/lib/themeVars";
import { useAppStore } from "@/lib/store";
import { getSession } from "@/lib/session";
import heroImage from "@/assets/images/hero-whisky.png";

const ACCENT = "#C9A961";
const ACCENT_DIM = "#8E7640";

const font = {
  display: "'Playfair Display', 'EB Garamond', Georgia, serif",
  voice: "'Cormorant Garamond', Georgia, serif",
  body: "'DM Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
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
  const isDE = i18n.language?.startsWith("de");
  const session = getSession();
  const signedIn = session.signedIn || !!currentParticipant;

  const switchLang = (lang: string) => {
    const scrollY = window.scrollY;
    i18n.changeLanguage(lang).then(() => {
      requestAnimationFrame(() => window.scrollTo(0, scrollY));
    });
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: v.bg,
        borderBottom: `1px solid ${v.border}`,
        padding: "14px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
      }}
      data-testid="header-nav"
    >
      <div style={{ fontFamily: font.display, fontSize: 19, fontWeight: 500, color: v.text, letterSpacing: "0.01em" }}>
        CaskSense
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        {!signedIn && (
          <Link
            href="/login"
            data-testid="link-header-signin"
            style={{
              fontFamily: font.body,
              fontSize: 13,
              fontWeight: 500,
              color: v.muted,
              textDecoration: "none",
              letterSpacing: "0.02em",
            }}
          >
            {t("auth.signIn", "Anmelden")}
          </Link>
        )}
        {signedIn && (
          <Link
            href="/labs/tastings"
            data-testid="link-header-app"
            style={{
              fontFamily: font.body,
              fontSize: 13,
              fontWeight: 600,
              color: ACCENT,
              textDecoration: "none",
              letterSpacing: "0.02em",
            }}
          >
            {t("auth.toApp", "Zur App")}
          </Link>
        )}

        <button
          onClick={toggleTheme}
          style={{
            padding: "6px 8px",
            borderRadius: 8,
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

        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
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
              fontFamily: font.body,
              fontSize: 12,
              fontWeight: 500,
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
              fontFamily: font.body,
              fontSize: 12,
              fontWeight: 500,
              transition: "all 0.2s",
            }}
            data-testid="button-lang-en"
          >
            EN
          </button>
        </div>
      </div>
    </header>
  );
}

function ScreenshotFrame({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      style={{
        width: "100%",
        aspectRatio: "4 / 3",
        borderRadius: 14,
        border: `1px solid ${ACCENT}24`,
        background: `${ACCENT}06`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        color: ACCENT_DIM,
      }}
      data-testid="screenshot-frame"
    >
      <span style={{ color: ACCENT, opacity: 0.7 }}>{icon}</span>
      <span style={{ fontFamily: font.body, fontSize: 12, letterSpacing: "0.04em", color: v.muted }}>{label}</span>
    </div>
  );
}

function HeroSection() {
  const [, navigate] = useLocation();

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
        padding: "72px 24px 88px",
      }}
      data-testid="section-hero"
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 70% 50% at 50% 38%, ${ACCENT}08 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <motion.div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${ACCENT}05 0%, transparent 60%)`,
          top: "10%",
          left: "50%",
          transform: "translateX(-50%)",
          pointerEvents: "none",
        }}
        animate={{ scale: [1, 1.06, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <FadeUp>
        <div style={{ width: "min(280px, 60vw)", marginBottom: 12, position: "relative", zIndex: 1 }}>
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
        <div
          style={{
            fontFamily: font.body,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: ACCENT_DIM,
            marginBottom: 18,
            position: "relative",
            zIndex: 2,
          }}
        >
          Für alle, die Whisky bewusst genießen
        </div>
      </FadeUp>

      <FadeUp delay={0.18}>
        <h1
          style={{
            fontFamily: font.display,
            fontSize: "clamp(52px, 9vw, 96px)",
            fontWeight: 400,
            color: v.text,
            letterSpacing: "-0.03em",
            lineHeight: 1.0,
            marginBottom: 18,
            position: "relative",
            zIndex: 2,
          }}
        >
          CaskSense
        </h1>
      </FadeUp>

      <FadeUp delay={0.28}>
        <p
          style={{
            fontFamily: font.voice,
            fontSize: "clamp(19px, 2.4vw, 26px)",
            fontWeight: 400,
            fontStyle: "italic",
            color: ACCENT,
            marginBottom: 22,
            letterSpacing: "0.01em",
            position: "relative",
            zIndex: 2,
          }}
        >
          Where tasting becomes reflection.
        </p>
      </FadeUp>

      <FadeUp delay={0.38}>
        <p
          style={{
            fontFamily: font.body,
            fontSize: "clamp(15px, 1.6vw, 17px)",
            lineHeight: 1.6,
            fontWeight: 400,
            color: v.muted,
            maxWidth: 540,
            margin: "0 auto 36px",
            position: "relative",
            zIndex: 2,
          }}
        >
          Verkosten, Worte finden, beschreiben, vergleichen und den eigenen Geschmack immer besser verstehen.
        </p>
      </FadeUp>

      <FadeUp delay={0.5}>
        <div
          style={{
            display: "flex",
            gap: 14,
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            marginBottom: 16,
            position: "relative",
            zIndex: 2,
          }}
        >
          <Link
            href="/labs/onboarding"
            data-testid="cta-hero-solo"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              padding: "16px 36px",
              background: ACCENT,
              color: v.bg,
              fontFamily: font.body,
              fontSize: 15,
              fontWeight: 600,
              borderRadius: 50,
              textDecoration: "none",
              boxShadow: `0 4px 24px ${ACCENT}30, 0 1px 3px rgba(0,0,0,0.2)`,
              transition: "transform 0.2s, box-shadow 0.2s",
              letterSpacing: "0.01em",
            }}
          >
            <Wine style={{ width: 17, height: 17 }} />
            Solo verkosten
          </Link>

          <Link
            href="/labs/join"
            data-testid="cta-hero-join"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              padding: "16px 36px",
              background: `${ACCENT}10`,
              color: v.text,
              fontFamily: font.body,
              fontSize: 15,
              fontWeight: 600,
              borderRadius: 50,
              border: `1.5px solid ${ACCENT}55`,
              textDecoration: "none",
              transition: "background 0.2s, border-color 0.2s, transform 0.2s",
              letterSpacing: "0.01em",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${ACCENT}1f`;
              e.currentTarget.style.borderColor = `${ACCENT}88`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `${ACCENT}10`;
              e.currentTarget.style.borderColor = `${ACCENT}55`;
            }}
          >
            <Users style={{ width: 17, height: 17, color: ACCENT }} />
            Einem Tasting beitreten
          </Link>
        </div>
      </FadeUp>

      <FadeUp delay={0.6}>
        <p
          style={{
            fontFamily: font.body,
            fontSize: 12,
            color: v.mutedLight,
            letterSpacing: "0.04em",
            position: "relative",
            zIndex: 2,
            margin: 0,
          }}
        >
          Kostenlos · Werbefrei · Kein Tracking
        </p>
      </FadeUp>
    </section>
  );
}

function BeatsSection() {
  return (
    <section style={{ padding: "40px 24px 8px" }} data-testid="section-beats">
      <style>{`
        .beat { display: grid; grid-template-columns: 1fr; gap: 28px; align-items: center; }
        @media (min-width: 760px) {
          .beat { grid-template-columns: 1fr 300px; gap: 48px; }
          .beat.reverse { grid-template-columns: 300px 1fr; }
          .beat.reverse > .beat-media { order: -1; }
        }
      `}</style>

      <div style={{ ...container, maxWidth: 900 }}>
        <FadeUp>
          <p
            style={{
              fontFamily: font.voice,
              fontStyle: "italic",
              fontSize: "clamp(18px, 2.2vw, 22px)",
              color: v.muted,
              textAlign: "center",
              marginBottom: 56,
            }}
          >
            Drei Schritte — vom Schluck zur Erkenntnis.
          </p>
        </FadeUp>

        <FadeUp>
          <div
            className="beat"
            style={{ paddingBottom: 56, marginBottom: 56, borderBottom: `1px solid ${v.border}` }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <Wine style={{ width: 20, height: 20, color: ACCENT_DIM }} />
                <span style={{ fontFamily: font.body, fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: ACCENT_DIM }}>
                  01 · Erleben
                </span>
              </div>
              <h2 style={{ fontFamily: font.display, fontSize: "clamp(24px, 3.2vw, 30px)", fontWeight: 500, color: v.text, lineHeight: 1.2, letterSpacing: "-0.01em", marginBottom: 14 }}>
                Halte den Moment fest, bevor er verfliegt.
              </h2>
              <p style={{ fontFamily: font.body, fontSize: "clamp(15px, 1.6vw, 17px)", lineHeight: 1.65, color: v.muted, marginBottom: 16 }}>
                Du genießt, beschreibst, hältst fest — in deinen eigenen Worten. Wenn du magst, ist Cooper dabei: ein ruhiger Begleiter, der dir nie vorsagt, was du schmeckst, sondern hilft, deinen Eindruck zu schärfen.
              </p>
              <p style={{ fontFamily: font.voice, fontStyle: "italic", fontSize: "clamp(16px, 1.8vw, 18px)", lineHeight: 1.5, color: ACCENT }}>
                „Dein erster ehrlicher Eindruck — festgehalten, bevor ihn irgendwas verfälscht."
              </p>
            </div>
            <div className="beat-media">
              <ScreenshotFrame icon={<Wine style={{ width: 22, height: 22 }} />} label="Screenshot: Eindruck festhalten" />
            </div>
          </div>
        </FadeUp>

        <FadeUp>
          <div
            className="beat reverse"
            style={{ paddingBottom: 56, marginBottom: 56, borderBottom: `1px solid ${v.border}` }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <PenLine style={{ width: 20, height: 20, color: ACCENT_DIM }} />
                <span style={{ fontFamily: font.body, fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: ACCENT_DIM }}>
                  02 · Benennen
                </span>
              </div>
              <h2 style={{ fontFamily: font.display, fontSize: "clamp(24px, 3.2vw, 30px)", fontWeight: 500, color: v.text, lineHeight: 1.2, letterSpacing: "-0.01em", marginBottom: 14 }}>
                Aus Eindrücken werden präzise Worte.
              </h2>
              <p style={{ fontFamily: font.body, fontSize: "clamp(15px, 1.6vw, 17px)", lineHeight: 1.65, color: v.muted, marginBottom: 16 }}>
                Nose, Palate, Finish — die Sprache, die du ohnehin sprichst, nur präziser. Mit einem Wortschatz aus der Flavour-Taxonomie, der mit dir wächst.
              </p>
              <p style={{ fontFamily: font.voice, fontStyle: "italic", fontSize: "clamp(16px, 1.8vw, 18px)", lineHeight: 1.5, color: ACCENT }}>
                „Für jedes Aroma das treffende Wort — solo oder in der Gruppe."
              </p>
            </div>
            <div className="beat-media">
              <ScreenshotFrame icon={<PenLine style={{ width: 22, height: 22 }} />} label="Screenshot: Dram · Nose/Palate/Finish" />
            </div>
          </div>
        </FadeUp>

        <FadeUp>
          <div style={{ paddingBottom: 8 }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <SplitSquareVertical style={{ width: 20, height: 20, color: ACCENT_DIM }} />
                <span style={{ fontFamily: font.body, fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: ACCENT_DIM }}>
                  03 · Vergleichen
                </span>
              </div>
              <h2 style={{ fontFamily: font.display, fontSize: "clamp(24px, 3.2vw, 30px)", fontWeight: 500, color: v.text, lineHeight: 1.2, letterSpacing: "-0.01em" }}>
                Dein Geschmack, im Spiegel der Community und der Zeit.
              </h2>
              <p style={{ fontFamily: font.voice, fontStyle: "italic", fontSize: "clamp(17px, 1.9vw, 19px)", color: ACCENT, marginTop: 10, maxWidth: 560, marginLeft: "auto", marginRight: "auto", lineHeight: 1.5 }}>
                „Aus hunderten Eindrücken wird ein Muster, das ein Notizbuch nie zeigen kann."
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
              <div style={{ padding: "32px 28px", borderRadius: 20, border: `1px solid ${v.border}`, background: v.card }} data-testid="card-benchmark-community">
                <p style={{ fontFamily: font.body, fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: ACCENT_DIM, marginBottom: 18 }}>
                  Community Benchmark
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "20px 16px", borderRadius: 14, background: `${ACCENT}06`, border: `1px solid ${ACCENT}15` }}>
                  <div style={{ width: 72, height: 72, borderRadius: "50%", border: `3px solid ${ACCENT}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontFamily: font.body, fontSize: 22, fontWeight: 700, color: ACCENT, fontVariantNumeric: "tabular-nums" }}>84.2</span>
                  </div>
                  <div>
                    <div style={{ fontFamily: font.display, fontSize: 16, fontWeight: 600, color: v.text, marginBottom: 4 }}>Lagavulin 16</div>
                    <div style={{ fontFamily: font.body, fontSize: 12, color: v.muted, lineHeight: 1.4 }}>Islay · 16y · 43% · 127 Bewertungen</div>
                    <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                      {[
                        { label: "Nose", val: "86" },
                        { label: "Palate", val: "85" },
                        { label: "Finish", val: "82" },
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

              <div style={{ padding: "32px 28px", borderRadius: 20, border: `1px solid ${v.border}`, background: v.card }} data-testid="card-benchmark-palate">
                <p style={{ fontFamily: font.body, fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: ACCENT_DIM, marginBottom: 18 }}>
                  Dein Palate-Profil
                </p>
                <div style={{ padding: "20px 16px", borderRadius: 14, background: `${ACCENT}06`, border: `1px solid ${ACCENT}15` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <span style={{ fontFamily: font.display, fontSize: 14, fontWeight: 600, color: v.text }}>Aroma-Dimensionen</span>
                    <span style={{ fontSize: 11, color: v.muted }}>Du · Community Ø</span>
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
                      <span style={{ width: 12, height: 3, borderRadius: 2, background: ACCENT, display: "inline-block" }} /> Du
                    </span>
                    <span style={{ fontSize: 10, color: v.muted, display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 12, height: 3, borderRadius: 2, background: `${ACCENT}25`, display: "inline-block" }} /> Community Ø
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

function HostSection() {
  return (
    <section style={{ padding: "64px 24px", background: `${ACCENT}05`, borderTop: `1px solid ${v.border}`, borderBottom: `1px solid ${v.border}` }} data-testid="section-host">
      <style>{`
        .host-grid { display: grid; grid-template-columns: 1fr; gap: 32px; align-items: center; }
        @media (min-width: 760px) { .host-grid { grid-template-columns: 1fr 300px; gap: 48px; } }
      `}</style>
      <div style={{ ...container, maxWidth: 900 }}>
        <FadeUp>
          <div className="host-grid">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <Users style={{ width: 20, height: 20, color: ACCENT_DIM }} />
                <span style={{ fontFamily: font.body, fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: ACCENT_DIM }}>
                  Und in der Runde?
                </span>
              </div>
              <h2 style={{ fontFamily: font.display, fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 500, color: v.text, lineHeight: 1.2, letterSpacing: "-0.01em", marginBottom: 14 }}>
                Tastings, die zusammenführen.
              </h2>
              <p style={{ fontFamily: font.body, fontSize: "clamp(15px, 1.6vw, 17px)", lineHeight: 1.65, color: v.muted }}>
                Lade per Code ein — ganz ohne Konto für deine Gäste. Steuere blind oder offen aus dem Host-Cockpit, lies Live-Bewertungen mit und enthülle die Flights im großen Moment.
              </p>
            </div>
            <ScreenshotFrame icon={<Mic style={{ width: 22, height: 22 }} />} label="Screenshot: Host-Cockpit" />
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

function StanceSection() {
  return (
    <section style={{ padding: "80px 24px 88px" }} data-testid="section-stance">
      <div style={{ ...container, maxWidth: 600, textAlign: "center" }}>
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
              margin: "0 auto 32px",
            }}
          >
            Keine kommerzielle Absicht, kein Tracking, keine Werbung. CaskSense folgt einer einfachen Überzeugung: Ein Eindruck wird klarer, wenn man ihn benennt — und das verdient einen Ort, der dir nichts verkaufen will.
          </p>
        </FadeUp>
        <FadeUp delay={0.2}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/labs/onboarding"
              data-testid="cta-footer-solo"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                padding: "15px 34px",
                background: ACCENT,
                color: v.bg,
                fontFamily: font.body,
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 50,
                textDecoration: "none",
                boxShadow: `0 4px 24px ${ACCENT}30, 0 1px 3px rgba(0,0,0,0.2)`,
                letterSpacing: "0.01em",
              }}
            >
              <Wine style={{ width: 17, height: 17 }} />
              Solo verkosten
            </Link>
            <Link
              href="/labs/join"
              data-testid="cta-footer-join"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                padding: "15px 34px",
                background: `${ACCENT}10`,
                color: v.text,
                fontFamily: font.body,
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 50,
                border: `1.5px solid ${ACCENT}55`,
                textDecoration: "none",
                letterSpacing: "0.01em",
              }}
            >
              <Users style={{ width: 17, height: 17, color: ACCENT }} />
              Einem Tasting beitreten
            </Link>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

function Footer() {
  const { t } = useTranslation();
  return (
    <footer style={{ padding: "32px 24px", borderTop: `1px solid ${v.border}` }} data-testid="footer">
      <div style={{ ...container, maxWidth: 900 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 22 }}>
            <Link href="/imprint" data-testid="link-footer-imprint" style={{ fontFamily: font.body, fontSize: 12, color: v.muted, textDecoration: "none" }}>
              {t("premium.footerImprint", "Impressum")}
            </Link>
            <Link href="/privacy" data-testid="link-footer-privacy" style={{ fontFamily: font.body, fontSize: 12, color: v.muted, textDecoration: "none" }}>
              {t("premium.footerPrivacy", "Datenschutz")}
            </Link>
            <Link href="/terms" data-testid="link-footer-terms" style={{ fontFamily: font.body, fontSize: 12, color: v.muted, textDecoration: "none" }}>
              {t("premium.footerTerms", "Nutzungsbedingungen")}
            </Link>
          </div>
          <p style={{ fontFamily: font.voice, fontStyle: "italic", fontSize: 13, color: v.muted, margin: 0 }}>
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
      <BeatsSection />
      <HostSection />
      <StanceSection />
      <Footer />
    </div>
  );
}

import { useRef, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { motion, useInView } from "framer-motion";
import {
  ChevronRight, ChevronLeft, ChevronDown, Wine, PenLine, SplitSquareVertical,
  Users, Mic, Sun, Moon, EyeOff, MoreHorizontal, Archive, Sparkles, BarChart3,
  Activity, PieChart, GitCompare, Globe, Compass, ArrowRight, CircleUser, Info,
} from "lucide-react";
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

const container: React.CSSProperties = { maxWidth: 1000, margin: "0 auto", padding: "0 24px" };

function useTx() {
  const { i18n } = useTranslation();
  const isDE = (i18n.language || "de").startsWith("de");
  return (de: string, en: string) => (isDE ? de : en);
}

function FadeUp({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div ref={ref} className={className} initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}>
      {children}
    </motion.div>
  );
}

function ScreenCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 290, width: "100%", margin: "0 auto", background: v.elevated, borderRadius: 30, border: `1px solid ${v.border}`, padding: 8, boxShadow: v.shadow }}>
      <div style={{ background: v.card, borderRadius: 24, overflow: "hidden", border: `1px solid ${v.subtleBorder}` }}>
        {children}
      </div>
    </div>
  );
}

const eyebrow: React.CSSProperties = { fontFamily: font.body, fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: ACCENT_DIM };

function CooperPreview() {
  const tx = useTx();
  return (
    <ScreenCard>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${v.divider}` }}>
        <ChevronLeft size={18} color={v.muted} />
        <span style={{ fontFamily: font.body, fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: v.textSecondary }}>{tx("Solo-Tasting", "Solo tasting")}</span>
        <span style={{ fontFamily: font.body, fontSize: 11, color: v.subtleText }}>3 / 6</span>
      </div>
      <div style={{ textAlign: "center", padding: "20px 20px 12px" }}>
        <div style={{ width: 46, height: 46, margin: "0 auto 10px", borderRadius: "50%", border: `1px solid ${v.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: ACCENT_DIM }}><Wine size={20} /></div>
        <div style={{ fontFamily: font.display, fontSize: 22, fontWeight: 500, color: v.text }}>Dram 3</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 5, fontFamily: font.body, fontSize: 10.5, color: v.subtleText }}><EyeOff size={13} />{tx("Cooper verkostet blind — kein Anker", "Cooper tastes blind — no anchor")}</div>
      </div>
      <div style={{ display: "flex", gap: 24, justifyContent: "center", padding: "0 20px 6px", fontFamily: font.body, fontSize: 12 }}>
        <span style={{ color: ACCENT, fontWeight: 500, paddingBottom: 7, borderBottom: `2px solid ${ACCENT}` }}>Nose</span>
        <span style={{ color: v.subtleText, paddingBottom: 7 }}>Palate</span>
        <span style={{ color: v.subtleText, paddingBottom: 7 }}>Finish</span>
      </div>
      <div style={{ padding: "16px 18px 6px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", border: `1px solid ${ACCENT_DIM}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT, display: "block" }} /></div>
          <div><div style={{ ...eyebrow, fontSize: 9, marginBottom: 4 }}>Cooper</div><div style={{ fontFamily: font.voice, fontStyle: "italic", fontSize: 17, lineHeight: 1.4, color: v.textSecondary }}>{tx("Lass dir Zeit. Was steigt dir zuerst in die Nase — noch ohne Namen?", "Take your time. What reaches your nose first — before naming it?")}</div></div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, paddingLeft: 29 }}>
          {[tx("Honig", "Honey"), tx("reife Birne", "ripe pear")].map((c) => (
            <span key={c} style={{ fontFamily: font.body, fontSize: 12, color: v.text, padding: "5px 12px", borderRadius: 50, border: `1px solid ${ACCENT}55`, background: `${ACCENT}12` }}>{c}</span>
          ))}
          <span style={{ fontFamily: font.body, fontSize: 12, color: v.bg, padding: "5px 12px", borderRadius: 50, border: `1px solid ${ACCENT}`, background: ACCENT, fontWeight: 500 }}>{tx("Rauch", "Smoke")}</span>
        </div>
        <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", border: `1px solid ${ACCENT_DIM}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT, display: "block" }} /></div>
          <div><div style={{ ...eyebrow, fontSize: 9, marginBottom: 4 }}>Cooper</div><div style={{ fontFamily: font.voice, fontStyle: "italic", fontSize: 17, lineHeight: 1.4, color: v.textSecondary }}>{tx("„Rauch“ — eher Lagerfeuer, Torf oder etwas Maritimes?", "‘Smoke’ — campfire, peat or something maritime?")}</div></div>
        </div>
      </div>
      <div style={{ padding: "12px 16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${v.border}`, borderRadius: 50, padding: "5px 5px 5px 16px", background: v.inputBg }}>
          <span style={{ flex: 1, fontFamily: font.body, fontSize: 13, color: v.placeholder }}>{tx("Beschreibe, was du wahrnimmst …", "Describe what you notice …")}</span>
          <span style={{ width: 34, height: 34, borderRadius: "50%", background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", color: v.bg }}><Mic size={17} /></span>
        </div>
        <div style={{ textAlign: "center", marginTop: 9, fontFamily: font.body, fontSize: 10.5, color: v.subtleText }}>{tx("Tippen oder sprechen — deine Worte, nicht Coopers.", "Type or speak — your words, not Cooper’s.")}</div>
      </div>
    </ScreenCard>
  );
}

function DramPreview() {
  const tx = useTx();
  const subs = [{ l: "Nose", v: 89 }, { l: "Palate", v: 88 }, { l: "Finish", v: 85 }];
  const aromas = [tx("Lagerfeuer-Rauch", "campfire smoke"), tx("Seetang", "seaweed"), tx("dunkle Schokolade", "dark chocolate"), tx("Meersalz", "sea salt")];
  return (
    <ScreenCard>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${v.divider}` }}>
        <ChevronLeft size={18} color={v.muted} />
        <span style={{ fontFamily: font.body, fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: v.textSecondary }}>Dram 3</span>
        <MoreHorizontal size={18} color={v.muted} />
      </div>
      <div style={{ textAlign: "center", padding: "18px 20px 6px" }}>
        <div style={{ fontFamily: font.display, fontSize: 24, fontWeight: 600, color: v.text }}>Lagavulin 16</div>
        <div style={{ fontFamily: font.body, fontSize: 11, color: v.subtleText, marginTop: 2 }}>Islay · 16y · 43%</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: "6px 20px 4px" }}>
        <div style={{ width: 78, height: 78, borderRadius: "50%", border: `3px solid ${ACCENT}55`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: font.display, fontSize: 27, fontWeight: 600, color: ACCENT, lineHeight: 1 }}>88</span>
          <span style={{ fontFamily: font.body, fontSize: 9, color: v.subtleText, letterSpacing: "0.1em" }}>/ 100</span>
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ ...eyebrow, marginBottom: 6 }}>Overall</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 11px", borderRadius: 50, background: `${v.success}14`, border: `1px solid ${v.success}33` }}>
            <span style={{ fontFamily: font.body, fontSize: 11, color: v.muted }}>{tx("Community Ø 84.2", "Community avg 84.2")}</span>
            <span style={{ fontFamily: font.body, fontSize: 11, fontWeight: 700, color: v.success }}>+3.8</span>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", padding: "16px 20px 4px" }}>
        {subs.map((s, i) => (
          <div key={s.l} style={{ flex: 1, textAlign: "center", borderRight: i < 2 ? `1px solid ${v.divider}` : "none" }}>
            <div style={{ fontFamily: font.display, fontSize: 19, fontWeight: 600, color: v.text }}>{s.v}</div>
            <div style={{ fontFamily: font.body, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: v.subtleText, marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "16px 20px 4px" }}>
        <div style={{ ...eyebrow, marginBottom: 9 }}>{tx("Deine Aromen", "Your flavours")}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {aromas.map((a) => (
            <span key={a} style={{ fontFamily: font.body, fontSize: 11.5, color: v.text, padding: "4px 11px", borderRadius: 50, border: `1px solid ${ACCENT}55`, background: `${ACCENT}12` }}>{a}</span>
          ))}
        </div>
      </div>
      <div style={{ padding: "12px 20px 20px" }}>
        <div style={{ borderLeft: `2px solid ${ACCENT}55`, paddingLeft: 13 }}>
          <div style={{ fontFamily: font.voice, fontStyle: "italic", fontSize: 16.5, lineHeight: 1.45, color: v.textSecondary }}>{tx("Maritimer Torfrauch über einer öligen Süße — der Abgang bleibt lang, trocken und salzig.", "Maritime peat smoke over an oily sweetness — the finish stays long, dry and salty.")}</div>
        </div>
      </div>
    </ScreenCard>
  );
}

function HostPreview() {
  const tx = useTx();
  const rows = [
    { n: "Doris", s: 90, self: false }, { n: "Du", s: 88, self: true },
    { n: "Michael", s: 86, self: false }, { n: "Rudi", s: 84, self: false },
    { n: "Dirk", s: 81, self: false },
  ];
  const avg = 86;
  return (
    <ScreenCard>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${v.divider}` }}>
        <ChevronLeft size={18} color={v.muted} />
        <span style={{ fontFamily: font.body, fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: v.textSecondary }}>{tx("Islay-Runde · Host", "Islay round · host")}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: v.success, display: "block" }} /><span style={{ fontFamily: font.body, fontSize: 10, color: v.success }}>live</span></span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 12px" }}>
        <div>
          <div style={{ ...eyebrow, marginBottom: 3 }}>{tx("Dram 3 von 6", "Dram 3 of 6")}</div>
          <div style={{ fontFamily: font.display, fontSize: 21, fontWeight: 600, color: v.text }}>Lagavulin 16</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: font.display, fontSize: 25, fontWeight: 600, color: ACCENT, lineHeight: 1 }}>{avg}</div>
          <div style={{ fontFamily: font.body, fontSize: 9, color: v.subtleText, letterSpacing: "0.08em", textTransform: "uppercase" }}>{tx("Ø Gruppe", "Group avg")}</div>
        </div>
      </div>
      <div style={{ padding: "0 18px 4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 11 }}>
          <span style={{ fontFamily: font.body, fontSize: 10.5, color: v.muted }}>{tx("5 von 6 haben bewertet", "5 of 6 have rated")}</span>
          <span style={{ fontFamily: font.body, fontSize: 10.5, color: v.subtleText }}>{tx("Spannweite 81–90", "Range 81–90")}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((r) => (
            <div key={r.n} style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ width: 56, fontFamily: font.body, fontSize: 11.5, color: r.self ? ACCENT : v.textSecondary, fontWeight: r.self ? 500 : 400 }}>{r.self ? tx("Du", "You") : r.n}</span>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: `${ACCENT}1f`, position: "relative" }}>
                <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${r.s}%`, background: ACCENT, borderRadius: 3 }} />
                <div style={{ position: "absolute", left: `${avg}%`, top: -3, width: 2, height: 12, background: v.muted }} />
              </div>
              <span style={{ width: 22, textAlign: "right", fontFamily: font.body, fontSize: 11.5, fontWeight: 700, color: r.self ? ACCENT : v.text }}>{r.s}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 9, opacity: 0.5 }}>
            <span style={{ width: 56, fontFamily: font.body, fontSize: 11.5, color: v.muted }}>Axel</span>
            <span style={{ flex: 1, fontFamily: font.body, fontSize: 10.5, fontStyle: "italic", color: v.subtleText }}>{tx("verkostet noch …", "still tasting …")}</span>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 18px 6px", fontFamily: font.body, fontSize: 10.5, color: v.subtleText }}>
        <span style={{ width: 2, height: 11, background: v.muted, display: "inline-block" }} />{tx("Markierung = Gruppenschnitt", "Marker = group average")}
      </div>
      <div style={{ padding: "6px 16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: ACCENT, color: v.bg, borderRadius: 50, padding: 12, fontFamily: font.body, fontSize: 13, fontWeight: 600 }}><ArrowRight size={17} />{tx("Weiter zu Dram 4", "Next: Dram 4")}</div>
      </div>
    </ScreenCard>
  );
}

function WeltPreview() {
  const tx = useTx();
  const cats = [
    { I: Wine, t: tx("Tastings & Drams", "Tastings & Drams"), s: tx("Tagebuch & Abende", "Journal & evenings"), a: false },
    { I: Archive, t: tx("Sammlung", "Collection"), s: tx("Flaschen & Wunschliste", "Bottles & wishlist"), a: false },
    { I: Sparkles, t: tx("KI", "AI"), s: tx("Reports & Analysen", "Reports & analysis"), a: false },
    { I: BarChart3, t: tx("Analyse", "Analytics"), s: tx("Statistik & Profil", "Stats & profile"), a: true },
  ];
  const tiles = [
    { I: Activity, t: tx("Whisky-DNA", "Whisky DNA") },
    { I: PieChart, t: tx("Aromen & Wortschatz", "Flavours & vocabulary") },
    { I: CircleUser, t: tx("Dein Profil / Gaumen", "Your profile / palate") },
    { I: GitCompare, t: tx("Vergleichen", "Compare") },
  ];
  const nav = [
    { I: Wine, t: "Tasting", a: false }, { I: Globe, t: tx("Meine Welt", "My World"), a: true },
    { I: Compass, t: tx("Entdecken", "Discover"), a: false }, { I: Users, t: "Circle", a: false },
  ];
  return (
    <ScreenCard>
      <div style={{ padding: "16px 18px 14px" }}>
        <div style={{ fontFamily: font.display, fontSize: 24, fontWeight: 600, color: v.text }}>{tx("Meine Welt", "My World")}</div>
        <div style={{ fontFamily: font.voice, fontStyle: "italic", fontSize: 15, color: v.muted, marginTop: 2 }}>{tx("Dein persönliches Whisky-Universum", "Your personal whisky universe")}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, padding: "0 16px 12px" }}>
        {cats.map((c) => {
          const Icon = c.I;
          return (
            <div key={c.t} style={{ padding: 13, borderRadius: 14, border: `1px solid ${c.a ? ACCENT + "55" : v.border}`, background: c.a ? `${ACCENT}12` : v.inputBg, textAlign: "center", boxShadow: c.a ? `inset 0 -2px 0 ${ACCENT}` : "none" }}>
              <Icon size={19} color={ACCENT} />
              <div style={{ fontFamily: font.body, fontSize: 12, fontWeight: 500, color: c.a ? ACCENT : v.text, marginTop: 7 }}>{c.t}</div>
              <div style={{ fontFamily: font.body, fontSize: 10, color: v.subtleText, marginTop: 2 }}>{c.s}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "0 16px 14px" }}>
        {tiles.map((t) => {
          const Icon = t.I;
          return (
            <div key={t.t} style={{ padding: "12px 11px", borderRadius: 12, border: `1px solid ${v.border}`, background: v.inputBg, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div><Icon size={17} color={ACCENT} /><div style={{ fontFamily: font.body, fontSize: 11.5, fontWeight: 500, color: v.text, marginTop: 7 }}>{t.t}</div></div>
              <ChevronDown size={14} color={v.subtleText} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", padding: "11px 12px 14px", borderTop: `1px solid ${v.divider}` }}>
        {nav.map((n) => {
          const Icon = n.I;
          return (
            <div key={n.t} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: n.a ? ACCENT : v.subtleText }}>
              <Icon size={19} /><span style={{ fontFamily: font.body, fontSize: 9 }}>{n.t}</span>
            </div>
          );
        })}
      </div>
    </ScreenCard>
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
    i18n.changeLanguage(lang).then(() => { requestAnimationFrame(() => window.scrollTo(0, scrollY)); });
  };
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 100, background: v.bg, borderBottom: `1px solid ${v.border}`, padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }} data-testid="header-nav">
      <div style={{ fontFamily: font.display, fontSize: 19, fontWeight: 500, color: v.text, letterSpacing: "0.01em" }}>CaskSense</div>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        {!signedIn && (<Link href="/login" data-testid="link-header-signin" style={{ fontFamily: font.body, fontSize: 13, fontWeight: 500, color: v.muted, textDecoration: "none", letterSpacing: "0.02em" }}>{t("auth.signIn", "Anmelden")}</Link>)}
        {signedIn && (<Link href="/labs/tastings" data-testid="link-header-app" style={{ fontFamily: font.body, fontSize: 13, fontWeight: 600, color: ACCENT, textDecoration: "none", letterSpacing: "0.02em" }}>{t("auth.toApp", "Zur App")}</Link>)}
        <button onClick={toggleTheme} style={{ padding: "6px 8px", borderRadius: 8, border: `1px solid ${v.border}`, background: "transparent", color: v.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Toggle theme" data-testid="button-theme-toggle">
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <button onClick={() => switchLang("de")} style={{ padding: "6px 10px", borderRadius: "8px 0 0 8px", border: `1px solid ${isDE ? ACCENT + "50" : v.border}`, borderRight: "none", background: isDE ? `${ACCENT}12` : "transparent", color: isDE ? ACCENT : v.muted, cursor: "pointer", fontFamily: font.body, fontSize: 12, fontWeight: 500 }} data-testid="button-lang-de">DE</button>
          <button onClick={() => switchLang("en")} style={{ padding: "6px 10px", borderRadius: "0 8px 8px 0", border: `1px solid ${!isDE ? ACCENT + "50" : v.border}`, background: !isDE ? `${ACCENT}12` : "transparent", color: !isDE ? ACCENT : v.muted, cursor: "pointer", fontFamily: font.body, fontSize: 12, fontWeight: 500 }} data-testid="button-lang-en">EN</button>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  const tx = useTx();
  return (
    <section style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative", overflow: "hidden", padding: "72px 24px 88px" }} data-testid="section-hero">
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 70% 50% at 50% 38%, ${ACCENT}08 0%, transparent 70%)`, pointerEvents: "none" }} />
      <motion.div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${ACCENT}05 0%, transparent 60%)`, top: "10%", left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }} animate={{ scale: [1, 1.06, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />
      <FadeUp>
        <div style={{ width: "min(380px, 74vw)", marginBottom: 16, position: "relative", zIndex: 1 }}>
          <img src={heroImage} alt="" style={{ width: "100%", height: "auto", display: "block", objectFit: "cover", maskImage: "radial-gradient(ellipse 65% 55% at 50% 50%, black 20%, transparent 70%)", WebkitMaskImage: "radial-gradient(ellipse 65% 55% at 50% 50%, black 20%, transparent 70%)", opacity: 0.3 }} />
        </div>
      </FadeUp>
      <FadeUp delay={0.1}>
        <div style={{ fontFamily: font.body, fontSize: 12, fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: ACCENT_DIM, marginBottom: 18, position: "relative", zIndex: 2 }}>{tx("Für alle, die Whisky bewusst genießen", "For everyone who tastes whisky with intention")}</div>
      </FadeUp>
      <FadeUp delay={0.18}>
        <h1 style={{ fontFamily: font.display, fontSize: "clamp(52px, 9vw, 96px)", fontWeight: 400, color: v.text, letterSpacing: "-0.03em", lineHeight: 1.0, marginBottom: 18, position: "relative", zIndex: 2 }}>CaskSense</h1>
      </FadeUp>
      <FadeUp delay={0.28}>
        <p style={{ fontFamily: font.voice, fontSize: "clamp(19px, 2.4vw, 26px)", fontWeight: 400, fontStyle: "italic", color: ACCENT, marginBottom: 22, letterSpacing: "0.01em", position: "relative", zIndex: 2 }}>Where tasting becomes reflection.</p>
      </FadeUp>
      <FadeUp delay={0.38}>
        <p style={{ fontFamily: font.body, fontSize: "clamp(15px, 1.6vw, 17px)", lineHeight: 1.6, fontWeight: 400, color: v.muted, maxWidth: 540, margin: "0 auto 36px", position: "relative", zIndex: 2 }}>{tx("Verkosten, Worte finden, beschreiben, vergleichen und den eigenen Geschmack immer besser einordnen können.", "Taste, find words, describe, compare — and learn to place your own palate ever more precisely.")}</p>
      </FadeUp>
      <FadeUp delay={0.5}>
        <div style={{ display: "flex", gap: 14, alignItems: "center", justifyContent: "center", flexWrap: "wrap", marginBottom: 16, position: "relative", zIndex: 2 }}>
          <Link href="/labs/tastings?tab=solo" data-testid="cta-hero-solo" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "16px 36px", background: ACCENT, color: v.bg, fontFamily: font.body, fontSize: 15, fontWeight: 600, borderRadius: 50, textDecoration: "none", boxShadow: `0 4px 24px ${ACCENT}30, 0 1px 3px rgba(0,0,0,0.2)`, letterSpacing: "0.01em" }}>
            <Wine style={{ width: 17, height: 17 }} />{tx("Solo verkosten", "Taste solo")}
          </Link>
          <Link href="/labs/tastings?tab=join" data-testid="cta-hero-join" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "16px 36px", background: `${ACCENT}10`, color: v.text, fontFamily: font.body, fontSize: 15, fontWeight: 600, borderRadius: 50, border: `1.5px solid ${ACCENT}55`, textDecoration: "none", letterSpacing: "0.01em" }}>
            <Users style={{ width: 17, height: 17, color: ACCENT }} />{tx("Einem Tasting beitreten", "Join a tasting")}
          </Link>
        </div>
      </FadeUp>
      <FadeUp delay={0.6}>
        <p style={{ fontFamily: font.body, fontSize: 12, color: v.mutedLight, letterSpacing: "0.04em", position: "relative", zIndex: 2, margin: 0 }}>{tx("Kostenlos · Werbefrei · Kein Tracking", "Free · Ad-free · No tracking")}</p>
      </FadeUp>
    </section>
  );
}

function BeatRow({ reverse, eyebrowText, Icon, title, body, payoff, media }: { reverse?: boolean; eyebrowText: string; Icon: any; title: string; body: string; payoff: string; media: React.ReactNode }) {
  return (
    <div className={`beat${reverse ? " reverse" : ""}`} style={{ paddingBottom: 56, marginBottom: 56, borderBottom: `1px solid ${v.border}` }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}><Icon style={{ width: 20, height: 20, color: ACCENT_DIM }} /><span style={{ ...eyebrow, fontSize: 11, letterSpacing: "0.16em" }}>{eyebrowText}</span></div>
        <h2 style={{ fontFamily: font.display, fontSize: "clamp(24px, 3.2vw, 30px)", fontWeight: 500, color: v.text, lineHeight: 1.2, letterSpacing: "-0.01em", marginBottom: 14 }}>{title}</h2>
        <p style={{ fontFamily: font.body, fontSize: "clamp(15px, 1.6vw, 17px)", lineHeight: 1.65, color: v.muted, marginBottom: 16 }}>{body}</p>
        <p style={{ fontFamily: font.voice, fontStyle: "italic", fontSize: "clamp(16px, 1.8vw, 18px)", lineHeight: 1.5, color: ACCENT }}>{payoff}</p>
      </div>
      <div className="beat-media">{media}</div>
    </div>
  );
}

function BeatsSection() {
  const tx = useTx();
  const dims = [
    { label: tx("Rauch", "Smoke"), you: 78, avg: 62, delta: "+16" },
    { label: tx("Süße", "Sweetness"), you: 45, avg: 58, delta: "−13" },
    { label: tx("Frucht", "Fruit"), you: 72, avg: 70, delta: "+2" },
    { label: tx("Würze", "Spice"), you: 68, avg: 55, delta: "+13" },
    { label: tx("Körper", "Body"), you: 82, avg: 71, delta: "+11" },
  ];
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
        <FadeUp><p style={{ fontFamily: font.voice, fontStyle: "italic", fontSize: "clamp(18px, 2.2vw, 22px)", color: v.muted, textAlign: "center", marginBottom: 56 }}>{tx("Drei Schritte — vom Schluck zur Erkenntnis.", "Three steps — from the first sip to insight.")}</p></FadeUp>

        <FadeUp><BeatRow eyebrowText={tx("01 · Erleben", "01 · Experience")} Icon={Wine}
          title={tx("Halte den Moment fest, bevor er verfliegt.", "Capture the moment before it fades.")}
          body={tx("Du genießt, beschreibst, hältst fest — in deinen eigenen Worten. Wenn du magst, ist Cooper dabei: ein ruhiger Begleiter, der dir nie vorsagt, was du schmeckst, sondern hilft, deinen Eindruck zu schärfen.", "You enjoy, describe, record — in your own words. If you like, Cooper is there: a quiet companion that never tells you what you taste, but helps you sharpen your impression.")}
          payoff={tx("„Dein erster ehrlicher Eindruck — festgehalten, bevor ihn irgendwas verfälscht.“", "“Your first honest impression — captured before anything can distort it.”")}
          media={<CooperPreview />} /></FadeUp>

        <FadeUp><BeatRow reverse eyebrowText={tx("02 · Benennen", "02 · Name it")} Icon={PenLine}
          title={tx("Aus Eindrücken werden präzise Worte.", "Impressions become precise words.")}
          body={tx("Nose, Palate, Finish — die Sprache, die du ohnehin sprichst, nur präziser. Mit einem Wortschatz aus der Flavour-Taxonomie, der mit dir wächst.", "Nose, Palate, Finish — the language you already speak, only more precise. With a vocabulary from the flavour taxonomy that grows with you.")}
          payoff={tx("„Für jedes Aroma das treffende Wort — solo oder in der Gruppe.“", "“The right word for every aroma — solo or in a group.”")}
          media={<DramPreview />} /></FadeUp>

        <FadeUp>
          <div style={{ paddingBottom: 8 }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 12 }}><SplitSquareVertical style={{ width: 20, height: 20, color: ACCENT_DIM }} /><span style={{ ...eyebrow, fontSize: 11, letterSpacing: "0.16em" }}>{tx("03 · Vergleichen", "03 · Compare")}</span></div>
              <h2 style={{ fontFamily: font.display, fontSize: "clamp(24px, 3.2vw, 30px)", fontWeight: 500, color: v.text, lineHeight: 1.2, letterSpacing: "-0.01em" }}>{tx("Dein Geschmack, im Spiegel der Community und der Zeit.", "Your palate, mirrored against the community and over time.")}</h2>
              <p style={{ fontFamily: font.voice, fontStyle: "italic", fontSize: "clamp(17px, 1.9vw, 19px)", color: ACCENT, marginTop: 10, maxWidth: 560, marginLeft: "auto", marginRight: "auto", lineHeight: 1.5 }}>{tx("„Aus hunderten Eindrücken wird ein Muster, das ein Notizbuch nie zeigen kann.“", "“Hundreds of impressions become a pattern no notebook could ever show.”")}</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
              <div style={{ padding: "32px 28px", borderRadius: 20, border: `1px solid ${v.border}`, background: v.card }} data-testid="card-benchmark-community">
                <p style={{ ...eyebrow, marginBottom: 18 }}>{tx("Community Benchmark", "Community benchmark")}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "20px 16px", borderRadius: 14, background: `${ACCENT}06`, border: `1px solid ${ACCENT}15` }}>
                  <div style={{ width: 72, height: 72, borderRadius: "50%", border: `3px solid ${ACCENT}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontFamily: font.body, fontSize: 22, fontWeight: 700, color: ACCENT, fontVariantNumeric: "tabular-nums" }}>84.2</span>
                  </div>
                  <div>
                    <div style={{ fontFamily: font.display, fontSize: 16, fontWeight: 600, color: v.text, marginBottom: 4 }}>Lagavulin 16</div>
                    <div style={{ fontFamily: font.body, fontSize: 12, color: v.muted, lineHeight: 1.4 }}>Islay · 16y · 43% · 127 {tx("Bewertungen", "ratings")}</div>
                    <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                      {[{ label: "Nose", val: "86" }, { label: "Palate", val: "85" }, { label: "Finish", val: "82" }].map((d) => (
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
                <p style={{ ...eyebrow, marginBottom: 18 }}>{tx("Dein Palate-Profil", "Your palate profile")}</p>
                <div style={{ padding: "20px 16px", borderRadius: 14, background: `${ACCENT}06`, border: `1px solid ${ACCENT}15` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <span style={{ fontFamily: font.display, fontSize: 14, fontWeight: 600, color: v.text }}>{tx("Aroma-Dimensionen", "Flavour dimensions")}</span>
                    <span style={{ fontSize: 11, color: v.muted }}>{tx("Du · Community Ø", "You · community avg")}</span>
                  </div>
                  {dims.map((dim) => (
                    <div key={dim.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <span style={{ width: 64, fontSize: 12, fontWeight: 500, color: v.muted, textAlign: "right" }}>{dim.label}</span>
                      <div style={{ flex: 1, height: 5, borderRadius: 3, background: `${ACCENT}10`, position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${dim.avg}%`, background: `${ACCENT}25`, borderRadius: 3 }} />
                        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${dim.you}%`, background: ACCENT, borderRadius: 3 }} />
                      </div>
                      <span style={{ width: 32, fontSize: 11, fontWeight: 700, textAlign: "right", color: dim.delta.startsWith("+") ? v.success : dim.delta.startsWith("−") ? v.danger : v.muted, fontVariantNumeric: "tabular-nums" }}>{dim.delta}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 12 }}>
                    <span style={{ fontSize: 10, color: v.muted, display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 3, borderRadius: 2, background: ACCENT, display: "inline-block" }} /> {tx("Du", "You")}</span>
                    <span style={{ fontSize: 10, color: v.muted, display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 3, borderRadius: 2, background: `${ACCENT}25`, display: "inline-block" }} /> {tx("Community Ø", "Community avg")}</span>
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
  const tx = useTx();
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
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}><Users style={{ width: 20, height: 20, color: ACCENT_DIM }} /><span style={{ ...eyebrow, fontSize: 11, letterSpacing: "0.16em" }}>{tx("Und in der Runde?", "And in the round?")}</span></div>
              <h2 style={{ fontFamily: font.display, fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 500, color: v.text, lineHeight: 1.2, letterSpacing: "-0.01em", marginBottom: 14 }}>{tx("Tastings, die zusammenführen.", "Tastings that bring people together.")}</h2>
              <p style={{ fontFamily: font.body, fontSize: "clamp(15px, 1.6vw, 17px)", lineHeight: 1.65, color: v.muted }}>{tx("Lade per Code ein — ganz ohne Konto für deine Gäste. Steuere blind oder offen aus dem Host-Cockpit und sieh auf einen Blick, wo die Runde übereinstimmt und wo sie auseinandergeht.", "Invite by code — no account needed for your guests. Run it blind or open from the host cockpit and see at a glance where the round agrees and where it diverges.")}</p>
            </div>
            <div className="beat-media"><HostPreview /></div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

function WeltSection() {
  const tx = useTx();
  return (
    <section style={{ padding: "72px 24px" }} data-testid="section-welt">
      <style>{`
        .welt-grid { display: grid; grid-template-columns: 1fr; gap: 32px; align-items: center; }
        @media (min-width: 760px) { .welt-grid { grid-template-columns: 300px 1fr; gap: 48px; } .welt-grid > .welt-media { order: -1; } }
      `}</style>
      <div style={{ ...container, maxWidth: 900 }}>
        <FadeUp>
          <div className="welt-grid">
            <div className="welt-media"><WeltPreview /></div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}><Globe style={{ width: 20, height: 20, color: ACCENT_DIM }} /><span style={{ ...eyebrow, fontSize: 11, letterSpacing: "0.16em" }}>{tx("Meine Welt", "My World")}</span></div>
              <h2 style={{ fontFamily: font.display, fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 500, color: v.text, lineHeight: 1.2, letterSpacing: "-0.01em", marginBottom: 14 }}>{tx("Alles an einem Ort — deine Welt, die wächst.", "Everything in one place — your world, growing.")}</h2>
              <p style={{ fontFamily: font.body, fontSize: "clamp(15px, 1.6vw, 17px)", lineHeight: 1.65, color: v.muted }}>{tx("Tastings, Sammlung, Analysen, dein Profil und deine Runde — in „Meine Welt“ läuft alles zusammen und wird mit jedem Dram reicher.", "Tastings, collection, analytics, your profile and your circle — “My World” brings it all together and grows richer with every dram.")}</p>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

function StanceSection() {
  const tx = useTx();
  return (
    <section style={{ padding: "40px 24px 88px" }} data-testid="section-stance">
      <div style={{ ...container, maxWidth: 600, textAlign: "center" }}>
        <FadeUp>
          <h2 style={{ fontFamily: font.display, fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 400, fontStyle: "italic", color: v.text, letterSpacing: "-0.01em", lineHeight: 1.3, marginBottom: 18 }}>{tx("Ein privates Projekt aus Leidenschaft.", "A private project, made with passion.")}</h2>
        </FadeUp>
        <FadeUp delay={0.1}>
          <p style={{ fontFamily: font.body, fontSize: "clamp(15px, 1.6vw, 17px)", lineHeight: 1.7, color: v.muted, maxWidth: 480, margin: "0 auto 32px" }}>{tx("Keine kommerzielle Absicht, kein Tracking, keine Werbung. CaskSense folgt einer einfachen Überzeugung: Ein Eindruck wird klarer, wenn man ihn benennt — und das verdient einen Ort, der dir nichts verkaufen will.", "No commercial intent, no tracking, no ads. CaskSense follows one simple conviction: an impression becomes clearer once you name it — and that deserves a place that isn’t trying to sell you anything.")}</p>
        </FadeUp>
        <FadeUp delay={0.2}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/labs/tastings?tab=solo" data-testid="cta-footer-solo" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "15px 34px", background: ACCENT, color: v.bg, fontFamily: font.body, fontSize: 15, fontWeight: 600, borderRadius: 50, textDecoration: "none", boxShadow: `0 4px 24px ${ACCENT}30, 0 1px 3px rgba(0,0,0,0.2)`, letterSpacing: "0.01em" }}>
              <Wine style={{ width: 17, height: 17 }} />{tx("Solo verkosten", "Taste solo")}
            </Link>
            <Link href="/labs/tastings?tab=join" data-testid="cta-footer-join" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "15px 34px", background: `${ACCENT}10`, color: v.text, fontFamily: font.body, fontSize: 15, fontWeight: 600, borderRadius: 50, border: `1.5px solid ${ACCENT}55`, textDecoration: "none", letterSpacing: "0.01em" }}>
              <Users style={{ width: 17, height: 17, color: ACCENT }} />{tx("Einem Tasting beitreten", "Join a tasting")}
            </Link>
          </div>
        </FadeUp>
        <FadeUp delay={0.32}>
          <div style={{ marginTop: 48, paddingTop: 38, borderTop: `1px solid ${v.border}` }}>
            <Link
              href="/labs/about"
              data-testid="cta-footer-about"
              style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "16px 38px", background: v.card, color: v.text, fontFamily: font.body, fontSize: 16, fontWeight: 600, borderRadius: 50, border: `1.5px solid ${v.border}`, textDecoration: "none", letterSpacing: "0.01em", boxShadow: v.shadow }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${ACCENT}88`; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = v.border; }}
            >
              <Info style={{ width: 18, height: 18, color: ACCENT }} />
              {tx("Mehr über CaskSense", "More about CaskSense")}
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
            <Link href="/imprint" data-testid="link-footer-imprint" style={{ fontFamily: font.body, fontSize: 12, color: v.muted, textDecoration: "none" }}>{t("premium.footerImprint", "Impressum")}</Link>
            <Link href="/privacy" data-testid="link-footer-privacy" style={{ fontFamily: font.body, fontSize: 12, color: v.muted, textDecoration: "none" }}>{t("premium.footerPrivacy", "Datenschutz")}</Link>
            <Link href="/terms" data-testid="link-footer-terms" style={{ fontFamily: font.body, fontSize: 12, color: v.muted, textDecoration: "none" }}>{t("premium.footerTerms", "Nutzungsbedingungen")}</Link>
          </div>
          <p style={{ fontFamily: font.voice, fontStyle: "italic", fontSize: 13, color: v.muted, margin: 0 }}>CaskSense — Where tasting becomes reflection.</p>
        </div>
      </div>
    </footer>
  );
}

export default function LandingNew() {
  return (
    <div style={{ background: v.bg, color: v.text, minHeight: "100dvh", overflowX: "hidden", fontFamily: font.body, position: "relative" }} data-testid="landing-root">
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 999, opacity: 0.04, mixBlendMode: "overlay", backgroundImage: FILM_GRAIN_BG }} />
      <HeaderNav />
      <HeroSection />
      <BeatsSection />
      <HostSection />
      <WeltSection />
      <StanceSection />
      <Footer />
    </div>
  );
}

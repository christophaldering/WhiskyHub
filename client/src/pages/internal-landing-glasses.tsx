import { useRef } from "react";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { v } from "@/lib/themeVars";

const ACCENT_RAW = "#c8a97e";
const BG_RAW = "#1a1714";

const font = {
  display: "'Playfair Display', Georgia, 'Times New Roman', serif",
  body: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
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

function GlencairnGlass({ fillLevel = 0.35, glowIntensity = 0.5, delay = 0 }: { fillLevel?: number; glowIntensity?: number; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.8 + delay, ease: "easeOut" }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <svg width="52" height="88" viewBox="0 0 52 88" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`whisky-${delay}`} x1="26" y1={48 - fillLevel * 36} x2="26" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={`rgba(218, 165, 80, ${glowIntensity * 0.7})`} />
            <stop offset="60%" stopColor={`rgba(190, 130, 50, ${glowIntensity * 0.55})`} />
            <stop offset="100%" stopColor={`rgba(160, 100, 30, ${glowIntensity * 0.4})`} />
          </linearGradient>
          <radialGradient id={`glow-${delay}`} cx="26" cy="30" r="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={`rgba(218, 175, 100, ${glowIntensity * 0.15})`} />
            <stop offset="100%" stopColor="rgba(218, 175, 100, 0)" />
          </radialGradient>
        </defs>

        <circle cx="26" cy="30" r="28" fill={`url(#glow-${delay})`} />

        <path
          d="M12 8 C12 8 8 20 10 35 C11 42 14 48 20 50 L22 50 L22 72 L18 74 C16 75 16 78 18 78 L34 78 C36 78 36 75 34 74 L30 72 L30 50 L32 50 C38 48 41 42 42 35 C44 20 40 8 40 8 Z"
          fill="none"
          stroke="rgba(200, 175, 140, 0.35)"
          strokeWidth="1.2"
        />

        <clipPath id={`bowl-${delay}`}>
          <path d="M13 9 C13 9 9 20 11 35 C12 42 15 48 20 50 L32 50 C37 48 40 42 41 35 C43 20 39 9 39 9 Z" />
        </clipPath>
        <rect
          x="8" y={48 - fillLevel * 38}
          width="36" height={fillLevel * 40}
          fill={`url(#whisky-${delay})`}
          clipPath={`url(#bowl-${delay})`}
        />

        <line
          x1="16" y1={48 - fillLevel * 36}
          x2="36" y2={48 - fillLevel * 36}
          stroke={`rgba(255, 220, 160, ${glowIntensity * 0.4})`}
          strokeWidth="0.8"
          strokeLinecap="round"
        />

        <ellipse
          cx="26" cy="78" rx="10" ry="2.5"
          fill="none"
          stroke="rgba(200, 175, 140, 0.2)"
          strokeWidth="0.8"
        />
      </svg>
    </motion.div>
  );
}

function TastingFlight() {
  const glasses = [
    { fillLevel: 0.4, glowIntensity: 0.7, delay: 0 },
    { fillLevel: 0.6, glowIntensity: 1.0, delay: 0.1 },
    { fillLevel: 0.35, glowIntensity: 0.85, delay: 0.2 },
    { fillLevel: 0.5, glowIntensity: 0.75, delay: 0.3 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, delay: 0.6 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginTop: 56,
      }}
    >
      <div style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 28,
        position: "relative",
        paddingBottom: 8,
      }}>
        {glasses.map((g, i) => (
          <GlencairnGlass key={i} {...g} />
        ))}

        <div style={{
          position: "absolute",
          bottom: 0,
          left: -20,
          right: -20,
          height: 2,
          background: `linear-gradient(90deg, transparent, rgba(200, 169, 126, 0.3) 15%, rgba(200, 169, 126, 0.45) 50%, rgba(200, 169, 126, 0.3) 85%, transparent)`,
          borderRadius: 1,
        }} />
      </div>

      <div style={{
        width: 260,
        height: 40,
        marginTop: -4,
        background: `radial-gradient(ellipse 100% 100% at 50% 0%, rgba(200, 169, 126, 0.08) 0%, transparent 80%)`,
        pointerEvents: "none",
      }} />
    </motion.div>
  );
}

export default function InternalLandingGlasses() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: BG_RAW,
        color: v.text,
        position: "relative",
        overflow: "hidden",
      }}
      data-testid="internal-landing-glasses-page"
    >
      <div style={{
        position: "absolute",
        top: 16,
        right: 20,
        zIndex: 10,
        padding: "5px 14px",
        fontSize: 10,
        fontFamily: font.body,
        fontWeight: 600,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: ACCENT_RAW,
        border: `1px solid rgba(200, 169, 126, 0.3)`,
        borderRadius: 50,
        background: "rgba(200, 169, 126, 0.06)",
      }} data-testid="badge-internal-preview">
        Internal Preview
      </div>

      <section style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
        padding: "80px 24px 40px",
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
            fontSize: 13,
            fontFamily: font.body,
            fontWeight: 500,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: v.accent,
            marginBottom: 24,
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
            <Link href="/enter" style={{
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
            }} data-testid="link-internal-open-app">
              Open App <ChevronRight style={{ width: 16, height: 16 }} />
            </Link>
            <Link href="/presentation" data-testid="link-internal-presentation" style={{
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
            <Link href="/landing-v2" data-testid="link-internal-landing-v2" style={{
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
          </div>
        </FadeUp>

        <TastingFlight />
      </section>

      <div style={{
        textAlign: "center",
        padding: "24px 24px 16px",
      }}>
        <Link href="/" style={{
          fontFamily: font.body,
          fontSize: 13,
          color: v.accent,
          textDecoration: "none",
          opacity: 0.7,
          transition: "opacity 0.2s",
        }} data-testid="link-return-main-landing">
          ← Return to main landing
        </Link>
      </div>

      <div style={{
        textAlign: "center",
        padding: "16px 24px 32px",
      }}>
        <p style={{
          fontFamily: font.body,
          fontSize: 11,
          color: v.muted,
          opacity: 0.4,
          letterSpacing: "0.02em",
        }}>
          Internal concept test: visual whisky cue.
        </p>
      </div>
    </div>
  );
}

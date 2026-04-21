import { useRef } from "react";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { v } from "@/lib/themeVars";
import heroImage from "@/assets/images/hero-whisky.png";

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
        <motion.div
          style={{
            position: "absolute",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${ACCENT_RAW}0a 0%, transparent 70%)`,
            top: "25%",
            left: "50%",
            transform: "translateX(-50%)",
            pointerEvents: "none",
          }}
          animate={{ scale: [1, 1.06, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        <div style={{ position: "relative", zIndex: 2 }}>
          <FadeUp>
            <div style={{
              width: "min(420px, 80vw)",
              marginBottom: -24,
              marginLeft: "auto",
              marginRight: "auto",
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

          <FadeUp delay={0.15}>
            <h1 style={{
              fontFamily: font.display,
              fontSize: "clamp(48px, 8vw, 88px)",
              fontWeight: 400,
              color: v.text,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              marginBottom: 24,
              textShadow: `0 2px 40px ${BG_RAW}, 0 0px 80px ${BG_RAW}`,
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
              textShadow: `0 1px 20px ${BG_RAW}`,
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
              textShadow: `0 1px 16px ${BG_RAW}`,
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
                background: "rgba(26, 23, 20, 0.6)",
                color: v.accent,
                fontFamily: font.body,
                fontSize: 15,
                fontWeight: 500,
                borderRadius: 50,
                textDecoration: "none",
                border: `1px solid ${v.border}`,
                backdropFilter: "blur(8px)",
                transition: "border-color 0.2s",
              }}>
                Guided Tour
              </Link>
              <Link href="/landing-v2" data-testid="link-internal-landing-v2" style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "14px 36px",
                background: "rgba(26, 23, 20, 0.6)",
                color: v.mutedLight,
                fontFamily: font.body,
                fontSize: 14,
                fontWeight: 500,
                borderRadius: 50,
                textDecoration: "none",
                border: `1px solid ${v.border}`,
                backdropFilter: "blur(8px)",
                transition: "border-color 0.2s",
              }}>
                Interactive Version
              </Link>
            </div>
          </FadeUp>
        </div>
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

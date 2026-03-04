import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { KeyRound, User } from "lucide-react";
import { getSession, tryAutoResume } from "@/lib/session";
import SessionSheet from "@/components/session-sheet";

const HERO_BG_ENABLED = false;
const HERO_BG_URL = "/images/landing-hero.jpg";

export default function Landing() {
  const { t } = useTranslation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [session, setSession] = useState(() => getSession());

  const refreshSession = useCallback(() => setSession(getSession()), []);

  useEffect(() => {
    tryAutoResume().then(() => refreshSession());
    window.addEventListener("session-change", refreshSession);
    return () => window.removeEventListener("session-change", refreshSession);
  }, [refreshSession]);

  return (
    <div
      style={{
        background: HERO_BG_ENABLED
          ? `linear-gradient(rgba(26,23,20,0.88), rgba(26,23,20,0.94)), url(${HERO_BG_URL}) center/cover no-repeat`
          : "#1a1714",
        color: "#f5f0e8",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1.5rem",
        fontFamily: "'Playfair Display', Georgia, serif",
        position: "relative",
      }}
    >
      <button
        onClick={() => setSheetOpen(true)}
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "6px 10px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: session.signedIn ? "#d4a256" : "#6b6354",
          opacity: session.signedIn ? 1 : 0.7,
          transition: "opacity 0.2s, color 0.2s",
          fontFamily: "system-ui, sans-serif",
          fontSize: 13,
          fontWeight: 500,
          borderRadius: 8,
        }}
        data-testid="button-session-key"
        aria-label="Tasting"
      >
        {session.signedIn ? (
          <>
            <User style={{ width: 16, height: 16 }} strokeWidth={2} />
            <span>{session.name || t("landingPage.signedIn")}</span>
          </>
        ) : (
          <>
            <KeyRound style={{ width: 16, height: 16 }} strokeWidth={1.6} />
            <span>{t("landingPage.signIn")}</span>
          </>
        )}
      </button>

      <SessionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSessionChange={refreshSession}
        variant="dark"
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "3rem",
          width: "100%",
          maxWidth: "320px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontSize: "2.25rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            CaskSense
          </h1>
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: "#b8af90",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {t("landingPage.tagline")}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            width: "100%",
          }}
        >
          <Link href="/enter">
            <motion.div
              whileTap={{ scale: 0.97 }}
              style={{
                display: "block",
                width: "100%",
                padding: "0.875rem",
                textAlign: "center",
                fontSize: "0.95rem",
                fontWeight: 600,
                fontFamily: "system-ui, sans-serif",
                background: "#d4a256",
                color: "#1a1714",
                borderRadius: "12px",
                cursor: "pointer",
                border: "none",
              }}
              data-testid="button-join-tasting"
            >
              {t("landingPage.joinTasting")}
            </motion.div>
          </Link>

          <Link href="/log-simple">
            <motion.div
              whileTap={{ scale: 0.97 }}
              style={{
                display: "block",
                width: "100%",
                padding: "0.875rem",
                textAlign: "center",
                fontSize: "0.95rem",
                fontWeight: 600,
                fontFamily: "system-ui, sans-serif",
                background: "transparent",
                color: "#d4a256",
                borderRadius: "12px",
                cursor: "pointer",
                border: "1px solid #d4a256",
              }}
              data-testid="button-log-whisky"
            >
              {t("landingPage.logWhisky")}
            </motion.div>
          </Link>

          <Link href="/host">
            <motion.div
              whileTap={{ scale: 0.97 }}
              style={{
                display: "block",
                width: "100%",
                padding: "0.875rem",
                textAlign: "center",
                fontSize: "0.95rem",
                fontWeight: 600,
                fontFamily: "system-ui, sans-serif",
                background: "transparent",
                color: "#d4a256",
                borderRadius: "12px",
                cursor: "pointer",
                border: "1px solid #d4a256",
              }}
              data-testid="button-host-tasting"
            >
              {t("landingPage.hostTasting")}
            </motion.div>
          </Link>

          <Link href="/my-taste">
            <motion.div
              whileTap={{ scale: 0.97 }}
              style={{
                display: "block",
                width: "100%",
                padding: "0.875rem",
                textAlign: "center",
                fontSize: "0.95rem",
                fontWeight: 600,
                fontFamily: "system-ui, sans-serif",
                background: "transparent",
                color: "#d4a256",
                borderRadius: "12px",
                cursor: "pointer",
                border: "1px solid #d4a256",
              }}
              data-testid="button-my-taste"
            >
              {t("landingPage.myTaste")}
            </motion.div>
          </Link>

          <Link href="/discover">
            <motion.div
              whileTap={{ scale: 0.97 }}
              style={{
                display: "block",
                width: "100%",
                padding: "0.875rem",
                textAlign: "center",
                fontSize: "0.95rem",
                fontWeight: 600,
                fontFamily: "system-ui, sans-serif",
                background: "transparent",
                color: "#d4a256",
                borderRadius: "12px",
                cursor: "pointer",
                border: "1px solid #d4a256",
              }}
              data-testid="button-discover"
            >
              {t("landingPage.discover")}
            </motion.div>
          </Link>
        </div>
      </motion.div>

    </div>
  );
}

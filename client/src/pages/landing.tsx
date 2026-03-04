import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { KeyRound, User, Wine, PenLine, Crown, Settings } from "lucide-react";
import { getSession, tryAutoResume } from "@/lib/session";
import SessionSheet from "@/components/session-sheet";
import { NAV_VERSION, LANDING_VERSION } from "@/lib/config";

const HERO_BG_ENABLED = false;
const HERO_BG_URL = "/images/landing-hero.jpg";

const btnPrimary = {
  display: "block" as const,
  width: "100%",
  padding: "0.875rem",
  textAlign: "center" as const,
  fontSize: "0.95rem",
  fontWeight: 600,
  fontFamily: "system-ui, sans-serif",
  background: "#d4a256",
  color: "#1a1714",
  borderRadius: "12px",
  cursor: "pointer",
  border: "none",
};

const btnOutline = {
  ...btnPrimary,
  background: "transparent",
  color: "#d4a256",
  border: "1px solid #d4a256",
};

const btnSubtle = {
  display: "block" as const,
  width: "100%",
  padding: "0.625rem",
  textAlign: "center" as const,
  fontSize: "0.8rem",
  fontWeight: 500,
  fontFamily: "system-ui, sans-serif",
  background: "transparent",
  color: "#8a8070",
  borderRadius: "10px",
  cursor: "pointer",
  border: "1px solid #2e281f",
};

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

  const isTwoScreen = LANDING_VERSION === "two_screen_start";

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
          {isTwoScreen ? (
            <>
              <Link href="/enter">
                <motion.div whileTap={{ scale: 0.97 }} style={{ ...btnPrimary, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} data-testid="button-join-tasting">
                  <Wine style={{ width: 18, height: 18 }} strokeWidth={2} />
                  {t("landingPage.joinTasting")}
                </motion.div>
              </Link>

              <Link href="/my-taste/log">
                <motion.div whileTap={{ scale: 0.97 }} style={{ ...btnOutline, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} data-testid="button-add-dram">
                  <PenLine style={{ width: 18, height: 18 }} strokeWidth={2} />
                  {t("landingPage.addDram")}
                </motion.div>
              </Link>

              <Link href="/host">
                <motion.div whileTap={{ scale: 0.97 }} style={{ ...btnOutline, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} data-testid="button-host-tasting">
                  <Crown style={{ width: 18, height: 18 }} strokeWidth={2} />
                  {t("landingPage.hostTasting")}
                </motion.div>
              </Link>

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                <Link href="/my-taste" style={{ flex: 1 }}>
                  <motion.div whileTap={{ scale: 0.97 }} style={btnSubtle} data-testid="button-my-taste">
                    {t("landingPage.myTaste")}
                  </motion.div>
                </Link>
                <Link href="/my-taste/settings" style={{ flex: 1 }}>
                  <motion.div whileTap={{ scale: 0.97 }} style={{ ...btnSubtle, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }} data-testid="button-settings">
                    <Settings style={{ width: 14, height: 14 }} strokeWidth={1.6} />
                    {t("landingPage.profileSettings")}
                  </motion.div>
                </Link>
              </div>
            </>
          ) : NAV_VERSION === "v2_simplified" ? (
            <>
              <Link href="/tasting">
                <motion.div whileTap={{ scale: 0.97 }} style={btnPrimary} data-testid="button-tasting">
                  {t("landingPage.tasting")}
                </motion.div>
              </Link>

              <Link href="/my-taste">
                <motion.div whileTap={{ scale: 0.97 }} style={btnOutline} data-testid="button-my-taste">
                  {t("landingPage.myTaste")}
                </motion.div>
              </Link>

              <Link href="/analyze">
                <motion.div whileTap={{ scale: 0.97 }} style={btnOutline} data-testid="button-explore">
                  {t("landingPage.explore")}
                </motion.div>
              </Link>
            </>
          ) : (
            <>
              <Link href="/enter">
                <motion.div whileTap={{ scale: 0.97 }} style={btnPrimary} data-testid="button-join-tasting">
                  {t("landingPage.joinTasting")}
                </motion.div>
              </Link>

              <Link href="/log-simple">
                <motion.div whileTap={{ scale: 0.97 }} style={btnOutline} data-testid="button-log-whisky">
                  {t("landingPage.logWhisky")}
                </motion.div>
              </Link>

              <Link href="/host">
                <motion.div whileTap={{ scale: 0.97 }} style={btnOutline} data-testid="button-host-tasting">
                  {t("landingPage.hostTasting")}
                </motion.div>
              </Link>

              <Link href="/my-taste">
                <motion.div whileTap={{ scale: 0.97 }} style={btnOutline} data-testid="button-my-taste">
                  {t("landingPage.myTaste")}
                </motion.div>
              </Link>

              <Link href="/discover">
                <motion.div whileTap={{ scale: 0.97 }} style={btnOutline} data-testid="button-discover">
                  {t("landingPage.discover")}
                </motion.div>
              </Link>
            </>
          )}
        </div>
      </motion.div>

    </div>
  );
}

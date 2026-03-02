import { Link } from "wouter";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div
      style={{
        background: "#1a1714",
        color: "#f5f0e8",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1.5rem",
        fontFamily: "'Playfair Display', Georgia, serif",
      }}
    >
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
            Where tasting becomes reflection
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            width: "100%",
          }}
        >
          <Link href="/tasting">
            <motion.div
              whileTap={{ scale: 0.97 }}
              style={{
                display: "block",
                width: "100%",
                padding: "1rem",
                textAlign: "center",
                fontSize: "1rem",
                fontWeight: 600,
                fontFamily: "system-ui, sans-serif",
                background: "#d4a256",
                color: "#1a1714",
                borderRadius: "12px",
                cursor: "pointer",
                border: "none",
              }}
              data-testid="button-start-tasting"
            >
              Start Tasting
            </motion.div>
          </Link>

          <Link href="/my/journal">
            <motion.div
              whileTap={{ scale: 0.97 }}
              style={{
                display: "block",
                width: "100%",
                padding: "1rem",
                textAlign: "center",
                fontSize: "1rem",
                fontWeight: 600,
                fontFamily: "system-ui, sans-serif",
                background: "transparent",
                color: "#f5f0e8",
                borderRadius: "12px",
                cursor: "pointer",
                border: "1px solid #3d3529",
              }}
              data-testid="button-log-whisky"
            >
              Log a Whisky
            </motion.div>
          </Link>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        style={{
          position: "fixed",
          bottom: "2rem",
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        <Link
          href="/legacy"
          style={{
            fontSize: "0.75rem",
            color: "#6b6354",
            textDecoration: "none",
            fontFamily: "system-ui, sans-serif",
          }}
          data-testid="link-legacy"
        >
          Already using CaskSense?
        </Link>
      </motion.div>
    </div>
  );
}

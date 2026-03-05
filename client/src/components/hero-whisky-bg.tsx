import { motion } from "framer-motion";
import heroImage from "@/assets/images/hero-whisky.png";

const BG_RAW = "#1a1714";

export default function HeroWhiskyBg() {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        style={{
          position: "fixed",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(600px, 100vw)",
          height: "40vh",
          backgroundImage: `url(${heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center 35%",
          backgroundRepeat: "no-repeat",
          opacity: 0.2,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "50vh",
        background: `
          radial-gradient(ellipse 60% 40% at 50% 15%, transparent 0%, ${BG_RAW}ee 70%),
          linear-gradient(to bottom, ${BG_RAW}bb 0%, transparent 25%)
        `,
        pointerEvents: "none",
        zIndex: 0,
      }} />
      <div style={{
        position: "fixed",
        top: "35vh",
        left: 0,
        right: 0,
        height: "15vh",
        background: `linear-gradient(to bottom, transparent 0%, ${BG_RAW} 100%)`,
        pointerEvents: "none",
        zIndex: 0,
      }} />
    </>
  );
}

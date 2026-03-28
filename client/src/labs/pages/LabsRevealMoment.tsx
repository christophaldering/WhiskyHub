import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface RevealMomentProps {
  whiskyName: string;
  distillery?: string;
  age?: string;
  region?: string;
  imageUrl?: string;
  stepLabel?: string;
  caskType?: string;
  abv?: string;
  category?: string;
  bottler?: string;
  distilledYear?: string;
  peatLevel?: string;
  country?: string;
  ppm?: string;
  price?: string;
  onDismiss: () => void;
}

export default function LabsRevealMoment({
  whiskyName,
  distillery,
  age,
  region,
  imageUrl,
  stepLabel,
  caskType,
  abv,
  category,
  bottler,
  distilledYear,
  peatLevel,
  country,
  ppm,
  price,
  onDismiss,
}: RevealMomentProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<"enter" | "show" | "exit">("enter");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("show"), 50);
    const t2 = setTimeout(() => {
      setPhase("exit");
      setTimeout(onDismiss, 500);
    }, 4500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDismiss]);

  const dismiss = useCallback(() => {
    setPhase("exit");
    setTimeout(onDismiss, 500);
  }, [onDismiss]);

  const opacity = phase === "show" ? 1 : 0;
  const scale = phase === "show" ? 1 : phase === "enter" ? 0.92 : 1.04;

  const detailParts = [age, region, country, abv, category, caskType, bottler, distilledYear, peatLevel, ppm, price].filter(Boolean);

  return createPortal(
    <div
      onClick={dismiss}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(10,8,6,0.92)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        opacity,
        transition: "opacity 0.5s cubic-bezier(0.16,1,0.3,1)",
        cursor: "pointer",
        padding: "24px",
        boxSizing: "border-box",
        overflow: "auto",
      }}
      data-testid="reveal-moment-overlay"
    >
      <button
        onClick={(e) => { e.stopPropagation(); dismiss(); }}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          background: "rgba(255,255,255,0.08)",
          border: "none",
          borderRadius: "50%",
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "rgba(255,255,255,0.6)",
          zIndex: 1,
          flexShrink: 0,
        }}
        data-testid="button-reveal-dismiss"
      >
        <X size={20} />
      </button>

      {stepLabel && (
        <div
          style={{
            fontSize: "clamp(11px, 2.5vw, 13px)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 2,
            color: "var(--labs-accent, #c8a97e)",
            marginBottom: "clamp(12px, 3vh, 24px)",
            opacity,
            transform: `scale(${scale}) translateY(${phase === "show" ? 0 : -10}px)`,
            transition: "all 0.7s cubic-bezier(0.16,1,0.3,1)",
            flexShrink: 0,
          }}
          data-testid="text-reveal-step"
        >
          {stepLabel}
        </div>
      )}

      {imageUrl && (
        <div
          style={{
            width: "clamp(80px, 20vw, 140px)",
            height: "clamp(80px, 20vw, 140px)",
            borderRadius: 20,
            overflow: "hidden",
            marginBottom: "clamp(16px, 3vh, 28px)",
            border: "2px solid rgba(200,169,126,0.3)",
            boxShadow: "0 0 60px rgba(200,169,126,0.2)",
            opacity,
            transform: `scale(${scale})`,
            transition: "all 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s",
            flexShrink: 0,
          }}
          data-testid="img-reveal-whisky"
        >
          <img
            src={imageUrl}
            alt={whiskyName}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}

      <h1
        style={{
          fontSize: "clamp(22px, 5vw, 32px)",
          fontWeight: 700,
          color: "#fff",
          textAlign: "center",
          margin: "0 0 8px",
          fontFamily: "'Playfair Display', serif",
          lineHeight: 1.2,
          opacity,
          transform: `scale(${scale}) translateY(${phase === "show" ? 0 : 15}px)`,
          transition: "all 0.8s cubic-bezier(0.16,1,0.3,1) 0.15s",
          flexShrink: 0,
          maxWidth: "100%",
          wordBreak: "break-word",
        }}
        data-testid="text-reveal-name"
      >
        {whiskyName}
      </h1>

      {distillery && (
        <p
          style={{
            fontSize: "clamp(13px, 2.5vw, 16px)",
            color: "rgba(255,255,255,0.65)",
            textAlign: "center",
            margin: "0 0 6px",
            opacity,
            transform: `translateY(${phase === "show" ? 0 : 10}px)`,
            transition: "all 0.7s cubic-bezier(0.16,1,0.3,1) 0.25s",
            flexShrink: 0,
          }}
          data-testid="text-reveal-distillery"
        >
          {distillery}
        </p>
      )}

      {detailParts.length > 0 && (
        <p
          style={{
            fontSize: "clamp(12px, 2vw, 14px)",
            color: "rgba(255,255,255,0.45)",
            textAlign: "center",
            margin: 0,
            opacity,
            transform: `translateY(${phase === "show" ? 0 : 10}px)`,
            transition: "all 0.7s cubic-bezier(0.16,1,0.3,1) 0.35s",
            flexShrink: 0,
          }}
          data-testid="text-reveal-details"
        >
          {detailParts.join(" · ")}
        </p>
      )}

      <div
        style={{
          position: "absolute",
          bottom: "clamp(20px, 4vh, 40px)",
          fontSize: 12,
          color: "rgba(255,255,255,0.3)",
          opacity,
          transition: "opacity 0.5s ease 1s",
        }}
      >
        {t("revealUi.tapToContinue")}
      </div>
    </div>,
    document.body
  );
}

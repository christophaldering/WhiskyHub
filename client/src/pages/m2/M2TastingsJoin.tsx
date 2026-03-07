import { useTranslation } from "react-i18next";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { tastingApi } from "@/lib/api";
import { getSession, useSession } from "@/lib/session";

export default function M2TastingsJoin() {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [, navigate] = useLocation();
  const session = useSession();
  const params = useParams<{ code?: string }>();
  const scannerRef = useRef<any>(null);
  const videoRef = useRef<HTMLDivElement>(null);

  const joinWithCode = useCallback(async (joinCode: string) => {
    if (!joinCode.trim()) return;
    setError("");
    setLoading(true);
    try {
      const tasting = await tastingApi.getByCode(joinCode.trim().toUpperCase());
      if (tasting && tasting.id) {
        const isDemo = joinCode.trim().toUpperCase() === "DEMO";
        if (session.pid) {
          await tastingApi.join(tasting.id, session.pid, joinCode.trim().toUpperCase());
        }
        if (isDemo && !session.pid) {
          navigate(`/m2/tastings/session/${tasting.id}/play`);
        } else {
          navigate(`/m2/tastings/session/${tasting.id}`);
        }
      }
    } catch (e: any) {
      setError(e.message || t("m2.join.error", "Could not find tasting"));
    } finally {
      setLoading(false);
    }
  }, [session.pid, navigate, t]);

  useEffect(() => {
    if (params.code) {
      setCode(params.code.toUpperCase());
      joinWithCode(params.code);
    }
  }, [params.code, joinWithCode]);

  const extractCodeFromUrl = (text: string): string | null => {
    try {
      const url = new URL(text);
      const pathParts = url.pathname.split("/").filter(Boolean);
      const joinIdx = pathParts.indexOf("join");
      if (joinIdx >= 0 && pathParts[joinIdx + 1]) {
        return pathParts[joinIdx + 1].toUpperCase();
      }
      const codeParam = url.searchParams.get("code");
      if (codeParam) return codeParam.toUpperCase();
    } catch {
      // not a URL
    }
    const cleaned = text.trim().toUpperCase();
    if (/^[A-Z0-9]{4,8}$/.test(cleaned)) {
      return cleaned;
    }
    return null;
  };

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {
        // ignore cleanup errors
      }
      scannerRef.current = null;
    }
    setScannerActive(false);
  }, []);

  const startScanner = useCallback(async () => {
    setCameraError("");
    setError("");
    setScannerActive(true);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      await new Promise((resolve) => setTimeout(resolve, 100));

      if (!videoRef.current) {
        setCameraError(t("m2.join.cameraUnavailable", "Camera container not available"));
        setScannerActive(false);
        return;
      }

      const scannerId = "m2-qr-reader";
      let container = document.getElementById(scannerId);
      if (!container) {
        container = document.createElement("div");
        container.id = scannerId;
        videoRef.current.appendChild(container);
      }

      const scanner = new Html5Qrcode(scannerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText: string) => {
          const extracted = extractCodeFromUrl(decodedText);
          if (extracted) {
            setCode(extracted);
            stopScanner();
            joinWithCode(extracted);
          }
        },
        () => {}
      );
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
        setCameraError(t("m2.join.cameraPermission", "Camera permission denied. Please allow camera access."));
      } else if (msg.includes("NotFoundError") || msg.includes("no camera")) {
        setCameraError(t("m2.join.noCamera", "No camera found on this device."));
      } else {
        setCameraError(t("m2.join.cameraError", "Could not start camera. Try entering the code manually."));
      }
      setScannerActive(false);
    }
  }, [t, joinWithCode, stopScanner]);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === 2) {
            scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(() => {});
          } else {
            scannerRef.current.clear();
          }
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const handleJoin = () => joinWithCode(code);

  return (
    <div style={{ padding: "16px", maxWidth: 480, margin: "0 auto" }} data-testid="m2-join-page">
      <M2BackButton />
      <h1
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 24,
          fontWeight: 700,
          color: v.text,
          margin: "16px 0",
        }}
        data-testid="text-m2-join-title"
      >
        {t("m2.join.title", "Joyn")}
      </h1>
      <p style={{ fontSize: 14, color: v.textSecondary, marginBottom: 20 }}>
        {t("m2.join.subtitle", "Scan a QR code or enter the tasting code to join")}
      </p>

      {!scannerActive && (
        <button
          onClick={startScanner}
          style={{
            width: "100%",
            padding: "14px 20px",
            borderRadius: 12,
            border: `1px solid ${v.border}`,
            background: v.card,
            color: v.text,
            fontWeight: 600,
            fontSize: 15,
            cursor: "pointer",
            fontFamily: "system-ui, sans-serif",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginBottom: 16,
            transition: "background 0.2s",
          }}
          data-testid="button-open-scanner"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <rect x="7" y="7" width="10" height="10" rx="1" />
          </svg>
          {t("m2.join.scanQR", "Scan QR Code")}
        </button>
      )}

      {scannerActive && (
        <div
          style={{
            marginBottom: 16,
            borderRadius: 12,
            overflow: "hidden",
            border: `1px solid ${v.border}`,
            background: "#000",
            position: "relative",
          }}
          data-testid="qr-scanner-container"
        >
          <div
            ref={videoRef}
            style={{
              width: "100%",
              minHeight: 300,
            }}
          />
          <button
            onClick={stopScanner}
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "none",
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              fontSize: 18,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
            }}
            data-testid="button-close-scanner"
          >
            ✕
          </button>
          <p
            style={{
              textAlign: "center",
              color: "#fff",
              fontSize: 13,
              padding: "8px 12px",
              margin: 0,
              background: "rgba(0,0,0,0.4)",
            }}
          >
            {t("m2.join.scanHint", "Point your camera at the QR code")}
          </p>
        </div>
      )}

      {cameraError && (
        <div
          style={{
            color: v.error,
            fontSize: 13,
            marginBottom: 12,
            padding: "10px 14px",
            borderRadius: 8,
            background: `color-mix(in srgb, ${v.error} 10%, transparent)`,
          }}
          data-testid="text-camera-error"
        >
          {cameraError}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          margin: "16px 0",
        }}
      >
        <div style={{ flex: 1, height: 1, background: v.border }} />
        <span style={{ color: v.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          {t("m2.join.or", "or")}
        </span>
        <div style={{ flex: 1, height: 1, background: v.border }} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => { if (e.key === "Enter") handleJoin(); }}
          placeholder={t("m2.join.placeholder", "Tasting Code")}
          style={{
            flex: 1,
            padding: "12px 14px",
            borderRadius: 10,
            border: `1px solid ${v.border}`,
            background: v.inputBg,
            color: v.text,
            fontSize: 16,
            fontFamily: "system-ui, sans-serif",
            letterSpacing: "0.1em",
            outline: "none",
          }}
          data-testid="input-join-code"
        />
        <button
          onClick={handleJoin}
          disabled={loading || !code.trim()}
          style={{
            padding: "12px 20px",
            borderRadius: 10,
            border: "none",
            background: v.accent,
            color: v.bg,
            fontWeight: 600,
            fontSize: 14,
            cursor: loading ? "wait" : "pointer",
            opacity: loading || !code.trim() ? 0.5 : 1,
            fontFamily: "system-ui, sans-serif",
          }}
          data-testid="button-join-submit"
        >
          {loading ? "…" : t("m2.join.button", "Joyn")}
        </button>
      </div>

      {error && (
        <div style={{ color: v.error, fontSize: 13, marginTop: 8 }} data-testid="text-join-error">
          {error}
        </div>
      )}

      <div
        style={{
          marginTop: 24,
          padding: "14px 16px",
          borderRadius: 12,
          background: v.card,
          border: `1px solid ${v.border}`,
        }}
        data-testid="join-help-section"
      >
        <p style={{ fontSize: 13, color: v.muted, margin: 0, lineHeight: 1.5 }}>
          {t("m2.join.help", "Ask the host for a QR code or tasting code. You can also join via a direct link shared by the host.")}
        </p>
      </div>
    </div>
  );
}

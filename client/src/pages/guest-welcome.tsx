import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useTranslation } from "react-i18next";
import { tastingApi } from "@/lib/api";
import { getSession, setGuestSession } from "@/lib/session";
import { trackEvent } from "@/lib/funnelTracker";

// Gast-Eingang nach QR-Scan / Einladungslink.
// Messlatte (Fahrplan WP 1): zwei Screens zwischen Scan und erstem Tisch-Tap, null Menüs.
// Diese Seite ist Screen 1; Screen 2 ist die chromelose Lobby (LabsLayout-Gast-Zweig).

interface WelcomeData {
  id: string;
  title: string;
  date: string | null;
  location: string | null;
  status: string;
  guestMode: string;
  hostName: string | null;
  code?: string;
}

const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const FONT_SERIF = "'Cormorant Garamond', Georgia, serif";
const FONT_BODY = "'DM Sans', system-ui, -apple-system, sans-serif";

export default function GuestWelcome() {
  const params = useParams<{ id: string }>();
  const tastingId = params.id || "";
  const [, navigate] = useLocation();
  const { t, i18n } = useTranslation();

  const [data, setData] = useState<WelcomeData | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "notfound">("loading");
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [showRejoinDialog, setShowRejoinDialog] = useState(false);
  const [detectedRejoinCode, setDetectedRejoinCode] = useState<string | null>(null);
  const [rejoining, setRejoining] = useState(false);
  const [rejoinError, setRejoinError] = useState("");
  const viewTracked = useRef(false);

  useEffect(() => {
    let cancelled = false;
    if (!tastingId) {
      setLoadState("notfound");
      return;
    }
    fetch(`/api/tastings/${tastingId}/welcome`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: WelcomeData) => {
        if (cancelled) return;
        setData(d);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("notfound");
      });
    return () => {
      cancelled = true;
    };
  }, [tastingId]);

  // Angemeldete Nutzer (z.B. der Host scannt den eigenen QR) gehen direkt zur Detailseite.
  useEffect(() => {
    try {
      if (getSession().signedIn && tastingId) {
        navigate(`/labs/tastings/${tastingId}`, { replace: true });
      }
    } catch {}
  }, [tastingId, navigate]);

  useEffect(() => {
    if (loadState === "ready" && !viewTracked.current) {
      viewTracked.current = true;
      trackEvent("guest_welcome_view", { page: `/welcome/${tastingId}` });
    }
  }, [loadState, tastingId]);

  const formattedDate = (() => {
    if (!data?.date) return null;
    try {
      const d = new Date(data.date);
      if (isNaN(d.getTime())) return data.date;
      return d.toLocaleDateString(i18n.language === "de" ? "de-DE" : "en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    } catch {
      return data.date;
    }
  })();

  const canGuestJoin = data?.guestMode === "ultra" && !!data?.code && data?.status !== "archived" && data?.status !== "deleted";

  // Rueckkehr erkennen: war dieser Gast schon hier? Reihenfolge: URL > localStorage > sessionStorage.
  useEffect(() => {
    if (loadState !== "ready" || !data || !canGuestJoin) return;
    try { if (getSession().signedIn) return; } catch {}
    let code: string | null = null;
    try { code = new URLSearchParams(window.location.search).get("rejoin"); } catch {}
    if (!code) { try { code = localStorage.getItem(`cs_guest_rejoin_${data.id}`); } catch {} }
    if (!code) { try { code = sessionStorage.getItem(`cs_guest_rejoin_${data.id}`); } catch {} }
    if (code) {
      setDetectedRejoinCode(code);
      setShowRejoinDialog(true);
    }
  }, [loadState, data, canGuestJoin]);

  const handleJoin = async () => {
    if (!data || !canGuestJoin || joining) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setJoinError(t("guestWelcome.nameRequired", "Bitte gib deinen Namen ein."));
      return;
    }
    setJoinError("");
    setJoining(true);
    try {
      const result = await tastingApi.guestJoin(data.id, trimmed, data.code!);
      setGuestSession(result.id, result.name);
      try {
        sessionStorage.setItem("cs_guest_shell", "1");
      } catch {}
      try {
        let rejoinCode = result.rejoinCode;
        if (!rejoinCode) {
          const fallback = await tastingApi.getMyRejoinCode(data.id).catch(() => null);
          rejoinCode = fallback?.rejoinCode ?? null;
        }
        if (rejoinCode) {
          localStorage.setItem(`cs_guest_rejoin_${data.id}`, rejoinCode);
          try { sessionStorage.setItem(`cs_guest_rejoin_${data.id}`, rejoinCode); } catch {}
          try {
            const url = new URL(window.location.href);
            url.searchParams.set("rejoin", rejoinCode);
            window.history.replaceState(null, "", url.toString());
          } catch {}
        }
      } catch {}
      trackEvent("guest_join_success", { page: `/welcome/${tastingId}` });
      navigate(`/labs/live/${data.id}`);
    } catch (e: unknown) {
      const msg = (e as Error)?.message || "";
      setJoinError(msg || t("guestWelcome.joinFailed", "Beitritt nicht möglich. Bitte versuche es erneut."));
      setJoining(false);
    }
  };

  const clearRejoinFromUrl = () => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("rejoin")) {
        url.searchParams.delete("rejoin");
        window.history.replaceState(null, "", url.toString());
      }
    } catch {}
  };

  const handleStartFresh = () => {
    setShowRejoinDialog(false);
    setRejoinError("");
    if (data) {
      try { localStorage.removeItem(`cs_guest_rejoin_${data.id}`); } catch {}
      try { sessionStorage.removeItem(`cs_guest_rejoin_${data.id}`); } catch {}
    }
    clearRejoinFromUrl();
  };

  const handleRejoin = async () => {
    if (!data || !detectedRejoinCode || rejoining) return;
    setRejoinError("");
    setRejoining(true);
    try {
      const result = await tastingApi.guestRejoin(data.id, detectedRejoinCode);
      setGuestSession(result.id, result.name);
      try { sessionStorage.setItem("cs_guest_shell", "1"); } catch {}
      try {
        const code = result.rejoinCode || detectedRejoinCode;
        localStorage.setItem(`cs_guest_rejoin_${data.id}`, code);
        sessionStorage.setItem(`cs_guest_rejoin_${data.id}`, code);
      } catch {}
      trackEvent("guest_rejoin_success", { page: `/welcome/${tastingId}` });
      navigate(`/labs/live/${data.id}`);
    } catch (e: unknown) {
      // Code ungueltig/abgelaufen → stale Code entfernen, sauber neu anfangen lassen.
      try { localStorage.removeItem(`cs_guest_rejoin_${data.id}`); } catch {}
      try { sessionStorage.removeItem(`cs_guest_rejoin_${data.id}`); } catch {}
      clearRejoinFromUrl();
      const msg = (e as Error)?.message || "";
      setRejoinError(msg || t("guestWelcome.rejoinFailed", "Wiedereinstieg nicht möglich. Bitte fang neu an."));
      setRejoining(false);
    }
  };

  const shell = (inner: React.ReactNode) => (
    <div
      style={{
        minHeight: "100dvh",
        background: "#0B0906",
        color: "#F5EDE0",
        fontFamily: FONT_BODY,
        display: "flex",
        flexDirection: "column",
        padding: "max(28px, env(safe-area-inset-top)) 24px max(28px, env(safe-area-inset-bottom))",
      }}
      data-testid="guest-welcome-page"
    >
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, textAlign: "center" }}>
        Cask<span style={{ color: "#D4A847" }}>Sense</span>
      </div>
      {inner}
    </div>
  );

  if (loadState === "loading") {
    return shell(
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", color: "rgba(245,237,224,0.5)" }} data-testid="guest-welcome-loading">
          {t("guestWelcome.loading", "Einen Moment …")}
        </div>
      </div>
    );
  }

  if (loadState === "notfound" || !data) {
    return shell(
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 12 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22 }} data-testid="guest-welcome-notfound">
          {t("guestWelcome.notFoundTitle", "Diese Einladung kennen wir nicht.")}
        </div>
        <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 15, color: "rgba(245,237,224,0.55)" }}>
          {t("guestWelcome.notFoundSub", "Frag deinen Gastgeber nach einem neuen Link oder Code.")}
        </div>
        <button
          onClick={() => navigate("/labs/join")}
          style={{
            marginTop: 16,
            minHeight: 44,
            padding: "0 22px",
            borderRadius: 999,
            border: "1px solid #D4A847",
            background: "none",
            color: "#D4A847",
            fontFamily: FONT_BODY,
            fontSize: 14,
            cursor: "pointer",
          }}
          data-testid="guest-welcome-to-join"
        >
          {t("guestWelcome.enterCode", "Code eingeben")}
        </button>
      </div>
    );
  }

  return shell(
    <>
      {showRejoinDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(11,9,6,0.92)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          data-testid="guest-rejoin-dialog"
        >
          <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.26em", textTransform: "uppercase", color: "#D4A847" }}>
              {t("guestWelcome.rejoinEyebrow", "Willkommen zurück")}
            </div>
            <h2
              style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 24, lineHeight: 1.25, margin: "12px 0 0" }}
              data-testid="guest-rejoin-title"
            >
              {t("guestWelcome.rejoinTitle", "Du warst hier schon — weitermachen?")}
            </h2>
            <p style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 15, color: "rgba(245,237,224,0.6)", marginTop: 10 }}>
              {t("guestWelcome.rejoinBody", "Deine Bewertungen sind noch da.")}
            </p>
            {rejoinError && (
              <div style={{ marginTop: 10, fontSize: 13, color: "#e8a3a3" }} data-testid="guest-rejoin-error">
                {rejoinError}
              </div>
            )}
            <button
              onClick={handleRejoin}
              disabled={rejoining}
              data-testid="guest-rejoin-continue"
              style={{
                width: "100%",
                height: 52,
                marginTop: 18,
                borderRadius: 12,
                border: "none",
                background: "#D4A847",
                color: "#0B0906",
                fontFamily: FONT_BODY,
                fontSize: 16,
                fontWeight: 700,
                cursor: rejoining ? "wait" : "pointer",
                opacity: rejoining ? 0.7 : 1,
              }}
            >
              {rejoining ? t("guestWelcome.joining", "Einen Moment …") : t("guestWelcome.rejoinYes", "Ja, weitermachen")}
            </button>
            <button
              onClick={handleStartFresh}
              disabled={rejoining}
              data-testid="guest-rejoin-fresh"
              style={{
                width: "100%",
                height: 48,
                marginTop: 10,
                borderRadius: 12,
                border: "1px solid rgba(245,237,224,0.28)",
                background: "none",
                color: "rgba(245,237,224,0.7)",
                fontFamily: FONT_BODY,
                fontSize: 14,
                cursor: rejoining ? "default" : "pointer",
              }}
            >
              {t("guestWelcome.rejoinNo", "Neu anfangen")}
            </button>
          </div>
        </div>
      )}
      <div style={{ marginTop: 44, textAlign: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.26em", textTransform: "uppercase", color: "#D4A847" }} data-testid="guest-welcome-eyebrow">
          {t("guestWelcome.invited", "Du bist eingeladen")}
        </div>
        <h1
          style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: "clamp(26px, 7vw, 34px)", lineHeight: 1.2, margin: "12px 0 0" }}
          data-testid="guest-welcome-title"
        >
          {data.title}
        </h1>
        <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 15, color: "rgba(245,237,224,0.6)", marginTop: 8 }} data-testid="guest-welcome-meta">
          {[
            data.hostName ? t("guestWelcome.hostedBy", "Gastgeber: {{name}}", { name: data.hostName }) : null,
            formattedDate,
            data.location,
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {canGuestJoin ? (
        <div style={{ width: "100%", maxWidth: 420, margin: "0 auto" }}>
          <label
            htmlFor="guest-welcome-name"
            style={{ display: "block", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(245,237,224,0.45)", marginBottom: 8 }}
          >
            {t("guestWelcome.yourName", "Dein Name")}
          </label>
          <input
            id="guest-welcome-name"
            data-testid="guest-welcome-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleJoin();
            }}
            autoComplete="given-name"
            enterKeyHint="go"
            style={{
              width: "100%",
              height: 48,
              borderRadius: 12,
              border: "1px solid rgba(245,237,224,0.28)",
              background: "rgba(255,255,255,0.04)",
              color: "#F5EDE0",
              fontFamily: FONT_SERIF,
              fontStyle: "italic",
              fontSize: 18,
              padding: "0 14px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {joinError && (
            <div style={{ marginTop: 10, fontSize: 13, color: "#e8a3a3" }} data-testid="guest-welcome-error">
              {joinError}
            </div>
          )}
          <button
            onClick={handleJoin}
            disabled={joining}
            data-testid="guest-welcome-join"
            style={{
              width: "100%",
              height: 52,
              marginTop: 14,
              borderRadius: 12,
              border: "none",
              background: "#D4A847",
              color: "#0B0906",
              fontFamily: FONT_BODY,
              fontSize: 16,
              fontWeight: 700,
              cursor: joining ? "wait" : "pointer",
              opacity: joining ? 0.7 : 1,
            }}
          >
            {joining ? t("guestWelcome.joining", "Einen Moment …") : t("guestWelcome.toTable", "An den Tisch")}
          </button>
          <div style={{ textAlign: "center", fontSize: 12, color: "rgba(245,237,224,0.4)", marginTop: 14 }} data-testid="guest-welcome-noaccount">
            {t("guestWelcome.noAccount", "Kein Konto nötig")}
          </div>
        </div>
      ) : (
        <div style={{ width: "100%", maxWidth: 420, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 15, color: "rgba(245,237,224,0.6)", marginBottom: 14 }} data-testid="guest-welcome-signin-hint">
            {t("guestWelcome.signinRequired", "Für dieses Tasting bittet dich dein Gastgeber, dich kurz anzumelden.")}
          </div>
          <button
            onClick={() => navigate(`/labs/join/${data.code || ""}`)}
            data-testid="guest-welcome-signin"
            style={{
              width: "100%",
              height: 52,
              borderRadius: 12,
              border: "1px solid #D4A847",
              background: "none",
              color: "#D4A847",
              fontFamily: FONT_BODY,
              fontSize: 15,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {t("guestWelcome.continueSignin", "Weiter zur Anmeldung")}
          </button>
        </div>
      )}
    </>
  );
}

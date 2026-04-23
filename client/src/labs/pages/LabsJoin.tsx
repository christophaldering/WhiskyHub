import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useLabsBack } from "@/labs/LabsLayout";
import { Wine, ArrowRight, AlertCircle, LogIn, ChevronLeft, User, Mail, Calendar, KeyRound, MailCheck, Copy, Check, RotateCcw, Camera, Printer, Download, Upload, ShieldCheck } from "lucide-react";
import { formatRejoinCode as fmtRejoinCode, extractRejoinCodeFromText as extractRejoin } from "@/labs/utils/rejoinCode";
import { useSession, getSession, setGuestSession } from "@/lib/session";
import { useIsEmbeddedInTastings } from "@/labs/embeddedTastingsContext";
import { useAppStore } from "@/lib/store";
import { tastingApi, inviteApi } from "@/lib/api";
import { signIn } from "@/lib/session";
import { useTranslation } from "react-i18next";

interface PendingTasting {
  id: string;
  guestMode: string;
}

interface MyInvite {
  inviteId: string;
  token: string;
  tastingId: string;
  tastingName: string;
  hostName: string;
  date: string;
}

export default function LabsJoin() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const goBack = useLabsBack("/labs/tastings");
  const isEmbedded = useIsEmbeddedInTastings();
  const session = useSession();
  const { currentParticipant } = useAppStore();
  const params = useParams<{ code?: string }>();

  const queryCode = params.code || new URLSearchParams(window.location.search).get("code") || "";
  const [code, setCode] = useState(queryCode);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showGuestName, setShowGuestName] = useState(false);
  const [pendingCode, setPendingCode] = useState("");
  const [pendingTasting, setPendingTasting] = useState<PendingTasting | null>(null);

  const [loginPin, setLoginPin] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [guestName, setGuestName] = useState("");
  const [guestError, setGuestError] = useState("");
  const [guestLoading, setGuestLoading] = useState(false);

  const [showRejoinCodeScreen, setShowRejoinCodeScreen] = useState(false);
  const [issuedRejoinCode, setIssuedRejoinCode] = useState<string>("");
  const [rejoinCodeCopied, setRejoinCodeCopied] = useState(false);
  const [rejoinCodeAcknowledged, setRejoinCodeAcknowledged] = useState(false);

  const [showRejoinCodeUnavailable, setShowRejoinCodeUnavailable] = useState(false);
  const [rejoinCodeRetryLoading, setRejoinCodeRetryLoading] = useState(false);
  const [rejoinCodeRetryFailed, setRejoinCodeRetryFailed] = useState(false);

  const [showRejoinInput, setShowRejoinInput] = useState(false);
  const [rejoinCodeInput, setRejoinCodeInput] = useState("");
  const [rejoinError, setRejoinError] = useState("");
  const [rejoinLoading, setRejoinLoading] = useState(false);

  const formatRejoinCode = fmtRejoinCode;

  const isLoggedIn = session.signedIn && !!currentParticipant;
  const [autoJoinAttempted, setAutoJoinAttempted] = useState(false);

  const [myInvites, setMyInvites] = useState<MyInvite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [acceptingInviteId, setAcceptingInviteId] = useState<string | null>(null);
  const [highlightedSection, setHighlightedSection] = useState<"code" | "invites" | null>(null);

  const codeInputRef = useRef<HTMLInputElement>(null);
  const codeSectionRef = useRef<HTMLDivElement>(null);
  const invitesSectionRef = useRef<HTMLDivElement>(null);

  const focusSection = (which: "code" | "invites") => {
    setHighlightedSection(which);
    const target = which === "code" ? codeSectionRef.current : invitesSectionRef.current;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (which === "code") {
      setTimeout(() => codeInputRef.current?.focus(), 200);
    }
    setTimeout(() => setHighlightedSection(null), 1600);
  };

  useEffect(() => {
    if (isLoggedIn) {
      setInvitesLoading(true);
      inviteApi.getMyInvites()
        .then((data: MyInvite[]) => setMyInvites(data || []))
        .catch(() => setMyInvites([]))
        .finally(() => setInvitesLoading(false));
    }
  }, [isLoggedIn]);

  const handleAcceptInvite = async (invite: MyInvite) => {
    setAcceptingInviteId(invite.inviteId);
    try {
      await inviteApi.accept(invite.token, currentParticipant!.id);
      navigate(`/labs/tastings/${invite.tastingId}`);
    } catch (e: any) {
      const msg = (e as Error).message || "";
      if (msg.toLowerCase().includes("already")) {
        navigate(`/labs/tastings/${invite.tastingId}`);
      } else {
        setError(msg || "Could not accept invitation. Please try again.");
      }
      setAcceptingInviteId(null);
    }
  };

  useEffect(() => {
    if (queryCode && !autoJoinAttempted) {
      setAutoJoinAttempted(true);
      handleJoinWithCode(queryCode);
    }
  }, [queryCode, autoJoinAttempted]);

  const showAuthOrGuest = (tasting: PendingTasting, trimmedCode: string) => {
    setPendingCode(trimmedCode);
    setPendingTasting(tasting);
    if (tasting.guestMode === "ultra") {
      setShowGuestName(true);
      setShowLogin(false);
    } else {
      setShowLogin(true);
      setShowGuestName(false);
    }
  };

  const handleJoinWithCode = async (joinCode: string) => {
    const trimmed = joinCode.trim().toUpperCase();
    if (!trimmed) return;
    setError("");
    setLoading(true);
    try {
      const tasting = await tastingApi.getByCode(trimmed);
      if (!tasting || !tasting.id) {
        setError("No tasting found with this code. Please check and try again.");
        setLoading(false);
        return;
      }
      if (!isLoggedIn) {
        showAuthOrGuest({ id: tasting.id, guestMode: tasting.guestMode || "standard" }, trimmed);
        setLoading(false);
        return;
      }
      await tastingApi.join(tasting.id, currentParticipant!.id, trimmed);
      navigate(`/labs/tastings/${tasting.id}`);
    } catch (e: unknown) {
      const msg = (e as Error).message || "";
      if (msg.toLowerCase().includes("already")) {
        const tasting = await tastingApi.getByCode(trimmed).catch(() => null);
        if (tasting?.id) { navigate(`/labs/tastings/${tasting.id}`); return; }
      }
      if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("invalid")) {
        setError("No tasting found with this code.");
      } else {
        setError(msg || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError("Please enter a tasting code.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const tasting = await tastingApi.getByCode(trimmed);

      if (!tasting || !tasting.id) {
        setError("No tasting found with this code. Please check and try again.");
        setLoading(false);
        return;
      }

      if (!isLoggedIn) {
        showAuthOrGuest({ id: tasting.id, guestMode: tasting.guestMode || "standard" }, trimmed);
        setLoading(false);
        return;
      }

      await tastingApi.join(tasting.id, currentParticipant!.id, trimmed);
      navigate(`/labs/tastings/${tasting.id}`);
    } catch (e: unknown) {
      const msg = (e as Error).message || "";
      if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("invalid")) {
        setError("No tasting found with this code. Double-check the code and try again.");
      } else if (msg.toLowerCase().includes("session code") || msg.toLowerCase().includes("invitation")) {
        setError("This code wasn't accepted. Make sure you have the correct code from your host.");
      } else if (msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch")) {
        setError("Connection issue — please check your internet and try again.");
      } else {
        setError(msg || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestJoin = async () => {
    if (!guestName.trim()) {
      setGuestError("Please enter your name.");
      return;
    }
    if (!pendingTasting) return;

    setGuestError("");
    setGuestLoading(true);

    try {
      const result = await tastingApi.guestJoin(pendingTasting.id, guestName.trim(), pendingCode);
      setGuestSession(result.id, result.name);
      let rejoinCode = result.rejoinCode;
      if (!rejoinCode) {
        try {
          const fallback = await tastingApi.getMyRejoinCode(pendingTasting.id);
          rejoinCode = fallback.rejoinCode ?? null;
        } catch (fallbackErr) {
          console.warn("[LabsJoin] Fallback rejoin-code fetch failed:", fallbackErr);
        }
      }
      if (rejoinCode) {
        setIssuedRejoinCode(rejoinCode);
        setShowGuestName(false);
        setShowRejoinCodeScreen(true);
      } else {
        setShowGuestName(false);
        setShowRejoinCodeUnavailable(true);
      }
    } catch (e: unknown) {
      const msg = (e as Error).message || "";
      setGuestError(msg || "Could not join. Please try again.");
    } finally {
      setGuestLoading(false);
    }
  };

  const handleRetryRejoinCode = async () => {
    if (!pendingTasting) return;
    setRejoinCodeRetryLoading(true);
    setRejoinCodeRetryFailed(false);
    try {
      const fallback = await tastingApi.getMyRejoinCode(pendingTasting.id);
      const rejoinCode = fallback.rejoinCode ?? null;
      if (rejoinCode) {
        setIssuedRejoinCode(rejoinCode);
        setShowRejoinCodeUnavailable(false);
        setShowRejoinCodeScreen(true);
      } else {
        setRejoinCodeRetryFailed(true);
      }
    } catch (err) {
      console.warn("[LabsJoin] Retry rejoin-code fetch failed:", err);
      setRejoinCodeRetryFailed(true);
    } finally {
      setRejoinCodeRetryLoading(false);
    }
  };

  const handleGuestRejoin = async () => {
    if (!pendingTasting) return;
    const code = rejoinCodeInput.trim();
    if (!code) {
      setRejoinError(t("labs.rejoin.enterCode", "Bitte gib deinen Wiedereinstiegs-Code ein."));
      return;
    }
    setRejoinError("");
    setRejoinLoading(true);
    try {
      const result = await tastingApi.guestRejoin(pendingTasting.id, code);
      setGuestSession(result.id, result.name);
      navigate(`/labs/tastings/${pendingTasting.id}`);
    } catch (e: any) {
      const msg = (e as Error).message || "";
      setRejoinError(msg || t("labs.rejoin.notFound", "Code nicht gefunden. Bitte prüfe deine Eingabe."));
    } finally {
      setRejoinLoading(false);
    }
  };

  const handleCopyRejoinCode = async () => {
    try {
      await navigator.clipboard.writeText(formatRejoinCode(issuedRejoinCode));
      setRejoinCodeCopied(true);
      setTimeout(() => setRejoinCodeCopied(false), 2000);
    } catch {}
  };

  const buildRejoinFileContent = () => {
    const code = formatRejoinCode(issuedRejoinCode);
    const lines = [
      "CASKSENSE — WIEDEREINSTIEGS-CODE",
      "==================================",
      "",
      `Code:           ${code}`,
      pendingCode ? `Tasting-Code:   ${pendingCode.toUpperCase()}` : "",
      guestName.trim() ? `Name:           ${guestName.trim()}` : "",
      `Ausgestellt am: ${new Date().toLocaleString("de-DE")}`,
      "",
      "So nutzt du diesen Code:",
      "1. Öffne CaskSense erneut (z. B. auf einem anderen Gerät).",
      "2. Wähle 'Tasting beitreten' und gib den Tasting-Code ein.",
      "3. Klicke auf 'Schon dabei? Wiedereinstiegs-Code eingeben'.",
      "4. Tippe diesen Code ein – oder lade diese Datei hoch.",
      "",
      "Bewahre diese Datei sicher auf, damit du jederzeit zu deinen",
      "Bewertungen zurückkehren kannst.",
      "",
    ].filter(Boolean);
    return lines.join("\n");
  };

  const handleDownloadRejoinFile = () => {
    try {
      const content = buildRejoinFileContent();
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `casksense-wiedereinstieg-${formatRejoinCode(issuedRejoinCode).replace(/-/g, "")}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {}
  };

  const handlePrintRejoinCode = () => {
    try { window.print(); } catch {}
  };

  const extractRejoinCodeFromText = extractRejoin;

  const rejoinFileInputRef = useRef<HTMLInputElement>(null);

  const handleRejoinFileUpload = async (file: File | null) => {
    if (!file) return;
    setRejoinError("");
    const MAX_BYTES = 256 * 1024;
    if (file.size > MAX_BYTES) {
      setRejoinError(t("labs.rejoin.fileTooLarge", "Datei ist zu groß. Bitte eine kleine Textdatei (.txt) wählen."));
      return;
    }
    try {
      const text = await file.text();
      const code = extractRejoinCodeFromText(text);
      if (!code) {
        setRejoinError(t("labs.rejoin.fileNoCode", "In dieser Datei wurde kein gültiger Wiedereinstiegs-Code gefunden."));
        return;
      }
      setRejoinCodeInput(code);
    } catch {
      setRejoinError(t("labs.rejoin.fileReadError", "Datei konnte nicht gelesen werden."));
    }
  };

  const handleContinueAfterRejoinCode = () => {
    if (!pendingTasting) return;
    setShowRejoinCodeScreen(false);
    navigate(`/labs/tastings/${pendingTasting.id}`);
  };

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPin.trim()) {
      setLoginError("Please enter your email and PIN.");
      return;
    }

    setLoginError("");
    setLoginLoading(true);

    try {
      const result = await signIn({
        pin: loginPin,
        email: loginEmail.trim(),
        mode: "tasting",
        remember: true,
      });

      if (!result.ok) {
        setLoginError(result.error || "Sign in failed.");
        setLoginLoading(false);
        return;
      }

      setShowLogin(false);
      setLoginPin("");
      setLoginEmail("");

      if (pendingCode) {
        setTimeout(async () => {
          try {
            const s = getSession();
            const tasting = await tastingApi.getByCode(pendingCode);
            if (tasting?.id && s.pid) {
              await tastingApi.join(tasting.id, s.pid, pendingCode);
              navigate(`/labs/tastings/${tasting.id}`);
            }
          } catch (e: any) {
            const msg = e.message || "";
            if (msg.toLowerCase().includes("already")) {
              navigate(`/labs/tastings`);
            } else {
              setError(msg || "Could not join the tasting after signing in. Please try entering the code again.");
            }
          }
        }, 300);
      }
    } catch (e: any) {
      setLoginError(e.message || "Sign in failed.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleJoin();
    }
  };

  const handleLoginKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  const handleGuestKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleGuestJoin();
    }
  };

  if (showRejoinCodeUnavailable) {
    return (
      <div className="labs-page labs-fade-in" data-testid="labs-join-rejoin-unavailable">
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--labs-warning-muted, var(--labs-accent-muted))" }}
          >
            <AlertCircle className="w-7 h-7" style={{ color: "var(--labs-warning, var(--labs-accent))" }} />
          </div>
          <h1
            className="labs-h1 mb-2"
            style={{ color: "var(--labs-text)", fontSize: "1.5rem" }}
            data-testid="labs-join-rejoin-unavailable-title"
          >
            {t("labs.rejoin.unavailableTitle", "Code konnte nicht geladen werden")}
          </h1>
          <p
            className="text-sm max-w-sm mx-auto leading-relaxed"
            style={{ color: "var(--labs-text-muted)" }}
            data-testid="labs-join-rejoin-unavailable-desc"
          >
            {t(
              "labs.rejoin.unavailableDesc",
              "Dein Wiedereinstiegs-Code konnte leider nicht abgerufen werden. Du kannst es erneut versuchen oder direkt zum Tasting weitergehen – dein Beitritt war erfolgreich."
            )}
          </p>
        </div>

        <button
          className="labs-btn-primary w-full flex items-center justify-center gap-2 mb-3"
          onClick={handleRetryRejoinCode}
          disabled={rejoinCodeRetryLoading}
          data-testid="labs-join-rejoin-unavailable-retry"
        >
          {rejoinCodeRetryLoading ? (
            <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
          ) : (
            <RotateCcw className="w-4 h-4" />
          )}
          {rejoinCodeRetryLoading
            ? t("labs.rejoin.retrying", "Wird geladen…")
            : t("labs.rejoin.retry", "Erneut versuchen")}
        </button>

        {rejoinCodeRetryFailed && (
          <p
            className="text-xs text-center mb-3"
            style={{ color: "var(--labs-warning, var(--labs-text-muted))" }}
            data-testid="labs-join-rejoin-unavailable-retry-failed"
          >
            {t("labs.rejoin.retryFailed", "Der Code ist leider weiterhin nicht verfügbar. Du kannst trotzdem am Tasting teilnehmen.")}
          </p>
        )}

        <button
          className="labs-btn-ghost w-full flex items-center justify-center gap-2"
          onClick={() => pendingTasting && navigate(`/labs/tastings/${pendingTasting.id}`)}
          data-testid="labs-join-rejoin-unavailable-continue"
        >
          <ArrowRight className="w-4 h-4" />
          {t("labs.rejoin.continueWithout", "Ohne Code weiter")}
        </button>
      </div>
    );
  }

  if (showRejoinCodeScreen) {
    return (
      <div className="labs-page labs-fade-in" data-testid="labs-join-rejoin-hero">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #rejoin-hero-print, #rejoin-hero-print * { visibility: visible; }
            #rejoin-hero-print { position: absolute; left: 0; top: 0; width: 100%; padding: 32px; }
            .no-print { display: none !important; }
          }
        `}</style>

        <div id="rejoin-hero-print">
          <div className="text-center mb-4">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
              style={{ background: "var(--labs-success-muted)", color: "var(--labs-success)" }}
            >
              <Check className="w-3.5 h-3.5" />
              {t("labs.rejoin.joinedBadge", "Beitritt erfolgreich")}
            </div>
            <h1
              className="labs-h1 mb-2"
              style={{ color: "var(--labs-text)", fontSize: "1.75rem" }}
              data-testid="labs-join-rejoin-code-title"
            >
              {t("labs.rejoin.savedTitle", "Dein Wiedereinstiegs-Code")}
            </h1>
            <p
              className="text-sm max-w-md mx-auto"
              style={{ color: "var(--labs-text-muted)" }}
            >
              {t("labs.rejoin.heroIntro", "Mit diesem persönlichen Code kommst du jederzeit zurück zu deinem Teilnehmer – auch von einem anderen Gerät oder Browser. Alle deine Bewertungen bleiben erhalten.")}
            </p>
          </div>

          <div
            className="rounded-3xl p-8 sm:p-12 text-center mb-5"
            style={{
              background: "linear-gradient(135deg, var(--labs-accent-muted) 0%, var(--labs-surface) 100%)",
              border: "2px solid var(--labs-accent)",
              boxShadow: "0 10px 40px -10px rgba(0,0,0,0.15)",
            }}
          >
            <div
              className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] mb-3"
              style={{ color: "var(--labs-accent)" }}
            >
              {t("labs.rejoin.codeLabelLong", "Dein Wiedereinstiegs-Code")}
            </div>
            <div
              className="font-bold mb-4 select-all leading-none break-all"
              style={{
                color: "var(--labs-accent)",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                letterSpacing: "0.12em",
                fontSize: "clamp(2.75rem, 12vw, 5.5rem)",
              }}
              data-testid="labs-join-rejoin-code-value"
            >
              {formatRejoinCode(issuedRejoinCode)}
            </div>
            {(pendingCode || guestName.trim()) && (
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs mb-5" style={{ color: "var(--labs-text-muted)" }}>
                {guestName.trim() && (
                  <span>{t("labs.rejoin.heroFor", "Für")}: <strong style={{ color: "var(--labs-text)" }}>{guestName.trim()}</strong></span>
                )}
                {pendingCode && (
                  <span>{t("labs.rejoin.heroTasting", "Tasting-Code")}: <strong style={{ color: "var(--labs-text)" }}>{pendingCode.toUpperCase()}</strong></span>
                )}
              </div>
            )}
            <button
              className="labs-btn-ghost inline-flex items-center gap-2 text-sm no-print"
              onClick={handleCopyRejoinCode}
              data-testid="labs-join-rejoin-code-copy"
            >
              {rejoinCodeCopied ? (
                <><Check className="w-4 h-4" />{t("labs.rejoin.copied", "Kopiert")}</>
              ) : (
                <><Copy className="w-4 h-4" />{t("labs.rejoin.copy", "Code kopieren")}</>
              )}
            </button>
          </div>

          <div
            className="rounded-2xl p-4 mb-5 flex items-start gap-3 no-print"
            style={{
              background: "var(--labs-warning-muted, var(--labs-accent-muted))",
              border: "1px solid var(--labs-warning, var(--labs-accent))",
            }}
            data-testid="labs-join-rejoin-screenshot-hint"
          >
            <Camera className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: "var(--labs-warning, var(--labs-accent))" }} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm mb-0.5" style={{ color: "var(--labs-text)" }}>
                {t("labs.rejoin.screenshotTitle", "Mach jetzt einen Screenshot!")}
              </div>
              <div className="text-xs leading-relaxed" style={{ color: "var(--labs-text-muted)" }}>
                {t("labs.rejoin.screenshotDesc", "Speichere diesen Bildschirm als Foto in deiner Galerie – das ist der schnellste Weg, den Code wiederzufinden. Alternativ kannst du ihn unten drucken oder als Datei speichern.")}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-5 no-print">
            <button
              className="labs-btn-ghost flex items-center justify-center gap-2 py-3 text-sm"
              onClick={handlePrintRejoinCode}
              data-testid="labs-join-rejoin-print"
              style={{ border: "1px solid var(--labs-border-subtle)" }}
            >
              <Printer className="w-4 h-4" />
              {t("labs.rejoin.print", "Drucken")}
            </button>
            <button
              className="labs-btn-ghost flex items-center justify-center gap-2 py-3 text-sm"
              onClick={handleDownloadRejoinFile}
              data-testid="labs-join-rejoin-download"
              style={{ border: "1px solid var(--labs-border-subtle)" }}
            >
              <Download className="w-4 h-4" />
              {t("labs.rejoin.download", "Als Datei speichern")}
            </button>
          </div>

          <label
            className="flex items-start gap-3 mb-4 cursor-pointer no-print"
            data-testid="labs-join-rejoin-ack-label"
          >
            <div className="relative mt-0.5 flex-shrink-0">
              <input
                type="checkbox"
                className="sr-only"
                checked={rejoinCodeAcknowledged}
                onChange={(e) => setRejoinCodeAcknowledged(e.target.checked)}
                data-testid="labs-join-rejoin-ack-checkbox"
              />
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  border: `2px solid ${rejoinCodeAcknowledged ? "var(--labs-accent)" : "var(--labs-border)"}`,
                  background: rejoinCodeAcknowledged ? "var(--labs-accent)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s",
                }}
              >
                {rejoinCodeAcknowledged && <Check className="w-3.5 h-3.5" style={{ color: "var(--labs-on-accent, #fff)" }} />}
              </div>
            </div>
            <span className="text-sm leading-snug" style={{ color: "var(--labs-text)" }}>
              {t("labs.rejoin.ackLabel", "Ich habe meinen Wiedereinstiegs-Code gespeichert (Screenshot, Notiz oder Datei). Ohne diesen Code kann ich nicht zurückkehren.")}
            </span>
          </label>

          <button
            className="labs-btn-primary w-full flex items-center justify-center gap-2 no-print"
            onClick={handleContinueAfterRejoinCode}
            disabled={!rejoinCodeAcknowledged}
            style={{ opacity: rejoinCodeAcknowledged ? 1 : 0.45, transition: "opacity 0.2s" }}
            data-testid="labs-join-rejoin-code-continue"
          >
            {t("labs.rejoin.continue", "Weiter zum Tasting")}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (showGuestName) {
    return (
      <div className="labs-page labs-fade-in">
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--labs-accent-muted)" }}
          >
            <User className="w-7 h-7" style={{ color: "var(--labs-accent)" }} />
          </div>
          <h1
            className="labs-h1 mb-2"
            style={{ color: "var(--labs-text)" }}
            data-testid="labs-join-guest-title"
          >
            {showRejoinInput ? t("labs.rejoin.title", "Schon dabei? Code eingeben") : "Join as Guest"}
          </h1>
          <p
            className="text-sm"
            style={{ color: "var(--labs-text-muted)" }}
          >
            {showRejoinInput
              ? t("labs.rejoin.inputDesc", "Gib den 6-stelligen Wiedereinstiegs-Code ein, den du beim ersten Beitritt erhalten hast.")
              : "Enter your name to join the tasting — no account needed."}
          </p>
        </div>

        {showRejoinInput ? (
          <div className="space-y-4">
            <div>
              <label
                className="text-xs font-medium mb-1.5 block"
                style={{ color: "var(--labs-text-muted)" }}
              >
                {t("labs.rejoin.codeLabel", "Wiedereinstiegs-Code")}
              </label>
              <input
                className="labs-input text-center tracking-widest"
                style={{ fontFamily: "monospace", fontSize: "1.25rem" }}
                type="text"
                placeholder="XK7-PM2"
                value={rejoinCodeInput}
                onChange={(e) => setRejoinCodeInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter") handleGuestRejoin(); }}
                maxLength={8}
                autoFocus
                data-testid="labs-join-rejoin-input"
              />
            </div>

            <div className="text-center">
              <button
                type="button"
                className="labs-btn-ghost inline-flex items-center gap-2 text-xs"
                onClick={() => rejoinFileInputRef.current?.click()}
                data-testid="labs-join-rejoin-upload-label"
              >
                <Upload className="w-3.5 h-3.5" />
                {t("labs.rejoin.uploadFile", "Wiedereinstiegs-Datei hochladen")}
              </button>
              <input
                ref={rejoinFileInputRef}
                type="file"
                accept=".txt,text/plain"
                style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", border: 0 }}
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  handleRejoinFileUpload(file);
                  e.target.value = "";
                }}
                data-testid="labs-join-rejoin-upload-input"
              />
            </div>

            {rejoinError && (
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{ background: "var(--labs-danger-muted)", color: "var(--labs-danger)" }}
                data-testid="labs-join-rejoin-error"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {rejoinError}
              </div>
            )}

            <button
              className="labs-btn-primary w-full flex items-center justify-center gap-2"
              onClick={handleGuestRejoin}
              disabled={rejoinLoading || !rejoinCodeInput.trim()}
              data-testid="labs-join-rejoin-submit"
            >
              {rejoinLoading ? "..." : (
                <>
                  {t("labs.rejoin.submit", "Wiedereinstieg")}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              className="labs-btn-ghost w-full text-sm"
              onClick={() => { setShowRejoinInput(false); setRejoinError(""); }}
              data-testid="labs-join-rejoin-switch-back"
            >
              {t("labs.rejoin.switchToName", "Stattdessen mit Namen beitreten")}
            </button>
          </div>
        ) : (
        <div className="space-y-4">
          <div>
            <label
              className="text-xs font-medium mb-1.5 block"
              style={{ color: "var(--labs-text-muted)" }}
            >
              Your Name
            </label>
            <input
              className="labs-input"
              type="text"
              placeholder="e.g. Max Mustermann"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              onKeyDown={handleGuestKeyDown}
              autoFocus
              data-testid="labs-join-guest-name"
            />
          </div>

          {guestError && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
              style={{
                background: "var(--labs-danger-muted)",
                color: "var(--labs-danger)",
              }}
              data-testid="labs-join-guest-error"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {guestError}
            </div>
          )}

          <button
            className="labs-btn-primary w-full flex items-center justify-center gap-2"
            onClick={handleGuestJoin}
            disabled={guestLoading || !guestName.trim()}
            data-testid="labs-join-guest-submit"
          >
            {guestLoading ? "Joining..." : (
              <>
                Join Tasting
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <button
            className="labs-btn-ghost w-full"
            onClick={() => {
              setShowGuestName(false);
              setGuestError("");
              setGuestName("");
            }}
            data-testid="labs-join-guest-back"
          >
            Back
          </button>

          <div className="pt-2 text-center" style={{ borderTop: "1px solid var(--labs-border-subtle)" }}>
            <button
              className="labs-btn-ghost text-sm inline-flex items-center gap-1.5 mt-2"
              onClick={() => { setShowRejoinInput(true); setGuestError(""); }}
              data-testid="labs-join-rejoin-switch"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t("labs.rejoin.haveCode", "Schon dabei? Wiedereinstiegs-Code eingeben")}
            </button>
          </div>
        </div>
        )}
      </div>
    );
  }

  if (showLogin) {
    return (
      <div className="labs-page labs-fade-in">
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--labs-accent-muted)" }}
          >
            <LogIn className="w-7 h-7" style={{ color: "var(--labs-accent)" }} />
          </div>
          <h1
            className="labs-h1 mb-2"
            style={{ color: "var(--labs-text)" }}
            data-testid="labs-join-login-title"
          >
            Sign In to Join
          </h1>
          <p
            className="text-sm"
            style={{ color: "var(--labs-text-muted)" }}
          >
            Sign in with your CaskSense account to join the tasting.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label
              className="text-xs font-medium mb-1.5 block"
              style={{ color: "var(--labs-text-muted)" }}
            >
              Email
            </label>
            <input
              className="labs-input"
              type="text"
              inputMode="email"
              autoComplete="email"
              placeholder="your@email.com"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              onKeyDown={handleLoginKeyDown}
              autoFocus
              data-testid="labs-join-login-email"
            />
          </div>

          <div>
            <label
              className="text-xs font-medium mb-1.5 block"
              style={{ color: "var(--labs-text-muted)" }}
            >
              PIN
            </label>
            <input
              className="labs-input"
              type="password"
              placeholder={t("m2.join.pinPlaceholder")}
              value={loginPin}
              onChange={(e) => setLoginPin(e.target.value)}
              onKeyDown={handleLoginKeyDown}
              data-testid="labs-join-login-pin"
            />
          </div>

          {loginError && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
              style={{
                background: "var(--labs-danger-muted)",
                color: "var(--labs-danger)",
              }}
              data-testid="labs-join-login-error"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {loginError}
            </div>
          )}

          <button
            className="labs-btn-primary w-full flex items-center justify-center gap-2"
            onClick={handleLogin}
            disabled={loginLoading}
            data-testid="labs-join-login-submit"
          >
            {loginLoading ? "Signing in..." : "Sign In & Join"}
          </button>

          <button
            className="labs-btn-ghost w-full"
            onClick={() => {
              setShowLogin(false);
              setLoginError("");
            }}
            data-testid="labs-join-login-back"
          >
            Back
          </button>

          <div
            className="flex items-center justify-center gap-3 pt-2 text-xs"
            style={{ color: "var(--labs-text-muted)" }}
          >
            <Link
              href="/login"
              data-testid="labs-join-link-login-page"
              style={{ color: "var(--labs-text-muted)", textDecoration: "underline", textUnderlineOffset: 4 }}
            >
              {t("auth.openSignInPage", "Anmeldeseite öffnen")}
            </Link>
            <span style={{ opacity: 0.5 }}>·</span>
            <Link
              href="/register"
              data-testid="labs-join-link-register-page"
              style={{ color: "var(--labs-text-muted)", textDecoration: "underline", textUnderlineOffset: 4 }}
            >
              {t("auth.openRegisterPage", "Registrierungsseite öffnen")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="labs-page labs-fade-in">
      {!isEmbedded && (
        <button
          onClick={goBack}
          className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4"
          style={{ color: "var(--labs-text-muted)" }}
          data-testid="labs-join-back"
        >
          <ChevronLeft className="w-4 h-4" />
          Tastings
        </button>
      )}
      <h1
        className="labs-h2 mb-2"
        style={{ color: "var(--labs-text)" }}
        data-testid="labs-join-title"
      >
        {t("m2.join.title", "Join a Tasting")}
      </h1>
      <p
        className="text-sm mb-6"
        style={{ color: "var(--labs-text-secondary)" }}
        data-testid="labs-join-subtitle"
      >
        {isLoggedIn
          ? t("m2.join.subtitleLoggedIn", "Accept an invitation or enter the code from your host.")
          : t("m2.join.subtitleGuest", "Enter the code your host shared with you.")}
      </p>

      {isLoggedIn && (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 labs-stagger-1 labs-fade-in"
          data-testid="labs-join-tiles"
        >
          <button
            type="button"
            onClick={() => focusSection("code")}
            className="labs-card text-left p-4 flex items-start gap-3 transition-transform active:scale-[0.98]"
            style={{ cursor: "pointer" }}
            data-testid="labs-join-tile-code"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--labs-accent-muted)" }}
            >
              <KeyRound className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="font-medium text-sm"
                style={{ color: "var(--labs-text)" }}
              >
                {t("m2.join.tileBlindTitle", "Blind (with code)")}
              </div>
              <div
                className="text-xs mt-0.5"
                style={{ color: "var(--labs-text-muted)" }}
              >
                {t("m2.join.tileBlindDesc", "Enter the code from your host")}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => focusSection("invites")}
            className="labs-card text-left p-4 flex items-start gap-3 transition-transform active:scale-[0.98]"
            style={{ cursor: "pointer" }}
            data-testid="labs-join-tile-invite"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--labs-accent-muted)" }}
            >
              <MailCheck className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="font-medium text-sm"
                style={{ color: "var(--labs-text)" }}
              >
                {t("m2.join.tileInviteTitle", "Pick an invitation")}
              </div>
              <div
                className="text-xs mt-0.5"
                style={{ color: "var(--labs-text-muted)" }}
              >
                {t("m2.join.tileInviteDesc", "Choose from your open invitations")}
              </div>
            </div>
          </button>
        </div>
      )}

      {isLoggedIn && (
        <div
          ref={invitesSectionRef}
          className="mb-6 labs-stagger-1 labs-fade-in rounded-2xl transition-shadow"
          style={{
            boxShadow:
              highlightedSection === "invites"
                ? "0 0 0 2px var(--labs-accent)"
                : "0 0 0 0 transparent",
            padding: highlightedSection === "invites" ? 4 : 0,
          }}
          data-testid="labs-join-invites-section"
        >
          <div className="flex items-center gap-2 mb-3 px-1">
            <Mail className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--labs-text-muted)" }}
              data-testid="text-open-invites-label"
            >
              {t("m2.join.upcomingTastings", "Upcoming Tastings")}
            </span>
          </div>
          {invitesLoading ? (
            <div className="labs-card p-4 text-center">
              <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{t("m2.join.loadingInvitations")}</span>
            </div>
          ) : myInvites.length === 0 ? (
            <div
              className="labs-card p-6 text-center"
              data-testid="labs-join-invites-empty"
            >
              <Mail
                className="w-6 h-6 mx-auto mb-2"
                style={{ color: "var(--labs-text-muted)" }}
              />
              <div
                className="text-sm"
                style={{ color: "var(--labs-text)" }}
              >
                {t("m2.join.invitesEmptyTitle", "No open invitations")}
              </div>
              <div
                className="text-xs mt-1"
                style={{ color: "var(--labs-text-muted)" }}
              >
                {t(
                  "m2.join.invitesEmptyDesc",
                  "Invitations from hosts will appear here.",
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="hidden md:block labs-card overflow-hidden">
                <table
                  className="w-full text-sm"
                  data-testid="labs-join-invites-table"
                >
                  <thead>
                    <tr
                      className="text-left"
                      style={{ color: "var(--labs-text-muted)" }}
                    >
                      <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider">
                        {t("m2.join.tableName", "Tasting")}
                      </th>
                      <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider">
                        {t("m2.join.tableHost", "Host")}
                      </th>
                      <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider">
                        {t("m2.join.tableDate", "Date")}
                      </th>
                      <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-right">
                        {t("m2.join.tableAction", "Action")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {myInvites.map((invite) => (
                      <tr
                        key={invite.inviteId}
                        onClick={() => {
                          if (acceptingInviteId) return;
                          handleAcceptInvite(invite);
                        }}
                        className="cursor-pointer transition-colors"
                        style={{
                          borderTop: "1px solid var(--labs-border)",
                          opacity:
                            acceptingInviteId &&
                            acceptingInviteId !== invite.inviteId
                              ? 0.5
                              : 1,
                          pointerEvents:
                            acceptingInviteId &&
                            acceptingInviteId !== invite.inviteId
                              ? "none"
                              : "auto",
                        }}
                        data-testid={`row-invite-${invite.inviteId}`}
                      >
                        <td
                          className="px-4 py-3 font-medium"
                          style={{ color: "var(--labs-text)" }}
                          data-testid={`text-invite-name-${invite.inviteId}`}
                        >
                          {invite.tastingName}
                        </td>
                        <td
                          className="px-4 py-3"
                          style={{ color: "var(--labs-text-muted)" }}
                          data-testid={`text-invite-host-${invite.inviteId}`}
                        >
                          {invite.hostName}
                        </td>
                        <td
                          className="px-4 py-3"
                          style={{ color: "var(--labs-text-muted)" }}
                          data-testid={`text-invite-date-${invite.inviteId}`}
                        >
                          {invite.date || "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            className="labs-btn-primary inline-flex items-center gap-1.5 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptInvite(invite);
                            }}
                            disabled={acceptingInviteId === invite.inviteId}
                            data-testid={`button-invite-join-${invite.inviteId}`}
                          >
                            {acceptingInviteId === invite.inviteId
                              ? t("m2.join.joining")
                              : t("m2.join.tableJoin", "Join")}
                            {acceptingInviteId !== invite.inviteId && (
                              <ArrowRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-2">
                {myInvites.map((invite) => (
                  <button
                    key={invite.inviteId}
                    className="labs-card w-full text-left p-4 flex items-center gap-3 transition-transform active:scale-[0.98]"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleAcceptInvite(invite)}
                    disabled={acceptingInviteId === invite.inviteId}
                    data-testid={`card-invite-${invite.inviteId}`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--labs-accent-muted)" }}
                    >
                      <Wine className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-medium text-sm truncate"
                        style={{ color: "var(--labs-text)" }}
                      >
                        {invite.tastingName}
                      </div>
                      <div
                        className="text-xs flex items-center gap-2 mt-0.5"
                        style={{ color: "var(--labs-text-muted)" }}
                      >
                        <span>{invite.hostName}</span>
                        {invite.date && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {invite.date}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {acceptingInviteId === invite.inviteId ? (
                        <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{t("m2.join.joining")}</span>
                      ) : (
                        <ArrowRight className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div
        ref={codeSectionRef}
        className="labs-card p-6 labs-stagger-1 labs-fade-in transition-shadow"
        style={{
          boxShadow:
            highlightedSection === "code"
              ? "0 0 0 2px var(--labs-accent)"
              : undefined,
        }}
      >
        <label
          className="labs-section-label"
          style={{ display: "block", marginBottom: 8 }}
        >
          {t("m2.join.placeholder", "Tasting Code")}
        </label>
        <input
          ref={codeInputRef}
          className="labs-input text-center text-lg tracking-widest font-semibold"
          placeholder={t("m2.join.codePlaceholder")}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError("");
          }}
          onKeyDown={handleKeyDown}
          maxLength={10}
          autoFocus={!isLoggedIn}
          style={{ letterSpacing: "0.2em", textTransform: "uppercase" }}
          data-testid="labs-join-code-input"
        />

        {error && (
          <div
            className="flex items-center gap-2 mt-3 px-4 py-3 rounded-xl text-sm"
            style={{
              background: "var(--labs-danger-muted)",
              color: "var(--labs-danger)",
            }}
            data-testid="labs-join-error"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          className="labs-btn-primary w-full mt-4 flex items-center justify-center gap-2"
          onClick={handleJoin}
          disabled={loading || !code.trim()}
          data-testid="labs-join-submit"
        >
          {loading ? (
            "Looking up tasting..."
          ) : (
            <>
              Join Tasting
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {!isLoggedIn && (
        <p
          className="text-center text-xs mt-6 labs-stagger-2 labs-fade-in"
          style={{ color: "var(--labs-text-muted)" }}
          data-testid="labs-join-login-hint"
        >
          You'll be asked to sign in before joining.
        </p>
      )}

      {isLoggedIn && (
        <p
          className="text-center text-xs mt-6 labs-stagger-2 labs-fade-in"
          style={{ color: "var(--labs-text-muted)" }}
          data-testid="labs-join-signed-in-hint"
        >
          {t("m2.join.signedInAs", "Signed in as")} <span style={{ color: "var(--labs-accent)" }}>{currentParticipant?.name}</span>
        </p>
      )}
    </div>
  );
}

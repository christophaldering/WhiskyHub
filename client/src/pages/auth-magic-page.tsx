import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ChevronLeft, CheckCircle, AlertTriangle, Loader2, Shield } from "lucide-react";
import { participantApi } from "@/lib/api";
import { setSessionAndSync } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

type Status = "loading" | "consent" | "success" | "error";

interface PendingParticipant {
  id: string;
  name: string;
  role?: string;
  photoUrl?: string;
}

export default function AuthMagicPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [pendingParticipant, setPendingParticipant] = useState<PendingParticipant | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);

  const finishLogin = (p: PendingParticipant) => {
    setSessionAndSync("log", p.name, p.id, p.role, p.photoUrl);
    try { localStorage.setItem("casksense_participant_id", p.id); } catch {}
    window.dispatchEvent(new Event("session-change"));
    setStatus("success");
    let returnTo: string | null = null;
    try {
      returnTo = sessionStorage.getItem("returnTo");
      sessionStorage.removeItem("returnTo");
      sessionStorage.removeItem("returnFrom");
    } catch {}
    const target = returnTo && returnTo.startsWith("/labs/") ? returnTo : "/labs/tastings";
    window.setTimeout(() => navigate(target), 800);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    // Strip the token from the URL immediately so it does not linger in browser
    // history, screenshots, referer headers, or shared links.
    if (token) {
      try {
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState(null, "", cleanUrl);
      } catch {}
    }
    if (!token) {
      setStatus("error");
      setErrorMsg(t("magicLink.missingToken", "Dieser Link ist unvollständig oder ungültig."));
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const participant = await participantApi.consumeLoginLink(token);
        if (cancelled) return;
        // Mirror the PIN-login flow: any account without privacyConsentAt must
        // accept consent before the session is granted.
        if (!participant.privacyConsentAt) {
          setPendingParticipant({
            id: participant.id,
            name: participant.name,
            role: participant.role,
            photoUrl: participant.photoUrl,
          });
          setStatus("consent");
          return;
        }
        finishLogin(participant);
      } catch (e: unknown) {
        if (cancelled) return;
        const err = e as { message?: string };
        setStatus("error");
        setErrorMsg(err.message || t("magicLink.invalidToken", "Dieser Link ist ungültig oder abgelaufen."));
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, t]);

  const handleAcceptConsent = async () => {
    if (!pendingParticipant) return;
    setConsentLoading(true);
    try {
      await participantApi.acceptPrivacyConsent(pendingParticipant.id);
      finishLogin(pendingParticipant);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setStatus("error");
      setErrorMsg(err.message || t("magicLink.consentFailed", "Speichern der Einwilligung fehlgeschlagen."));
    } finally {
      setConsentLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md mb-4 self-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          data-testid="link-back-home"
        >
          <ChevronLeft className="w-3 h-3" />
          CaskSense
        </Link>
      </div>
      <div className="w-full max-w-md p-8 rounded-2xl border border-border bg-card text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
            <h1 className="font-serif text-xl text-primary" data-testid="text-magic-loading">
              {t("magicLink.consuming", "Du wirst angemeldet…")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("magicLink.consumingHint", "Wir prüfen deinen Login-Link.")}
            </p>
          </>
        )}
        {status === "consent" && pendingParticipant && (
          <>
            <Shield className="w-10 h-10 mx-auto text-primary" />
            <h1 className="font-serif text-xl text-primary" data-testid="text-magic-consent-title">
              {t("legal.privacy.title")}
            </h1>
            <p className="text-sm text-muted-foreground text-left">
              {t("login.privacyConsentRequired")}
            </p>
            <div className="flex items-start gap-2 text-left">
              <Checkbox
                id="magicConsent"
                checked={consentChecked}
                onCheckedChange={(c) => setConsentChecked(c === true)}
                data-testid="checkbox-magic-consent"
              />
              <label htmlFor="magicConsent" className="text-sm text-muted-foreground leading-snug cursor-pointer">
                {t("login.privacyConsentLabel")}{" "}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80">{t("login.privacyConsentLink")}</a>{" "}
                {t("login.andThe")}{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80">{t("login.termsConsentLink")}</a>
              </label>
            </div>
            <Button
              onClick={handleAcceptConsent}
              disabled={!consentChecked || consentLoading}
              className="w-full font-serif"
              data-testid="button-magic-accept-consent"
            >
              {consentLoading ? t("login.joining") : t("login.enterReturning")}
            </Button>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="w-10 h-10 mx-auto text-green-500" />
            <h1 className="font-serif text-xl text-primary" data-testid="text-magic-success">
              {t("magicLink.successTitle", "Willkommen zurück")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("magicLink.successHint", "Du wirst gleich weitergeleitet…")}
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <AlertTriangle className="w-10 h-10 mx-auto text-destructive" />
            <h1 className="font-serif text-xl text-destructive" data-testid="text-magic-error">
              {t("magicLink.errorTitle", "Login fehlgeschlagen")}
            </h1>
            <p className="text-sm text-muted-foreground" data-testid="text-magic-error-message">{errorMsg}</p>
            <Button
              onClick={() => navigate("/login")}
              className="w-full font-serif"
              data-testid="button-magic-back-to-login"
            >
              {t("magicLink.backToLogin", "Zurück zur Anmeldung")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

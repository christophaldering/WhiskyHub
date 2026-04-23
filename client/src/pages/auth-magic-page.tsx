import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ChevronLeft, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { participantApi } from "@/lib/api";
import { setSessionAndSync } from "@/lib/session";
import { Button } from "@/components/ui/button";

type Status = "loading" | "success" | "error";

export default function AuthMagicPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");

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
        setSessionAndSync("log", participant.name, participant.id, participant.role, participant.photoUrl);
        try { localStorage.setItem("casksense_participant_id", participant.id); } catch {}
        window.dispatchEvent(new Event("session-change"));
        setStatus("success");

        let returnTo: string | null = null;
        try {
          returnTo = sessionStorage.getItem("returnTo");
          sessionStorage.removeItem("returnTo");
          sessionStorage.removeItem("returnFrom");
        } catch {}
        const target = returnTo && returnTo.startsWith("/labs/") ? returnTo : "/labs/tastings";
        window.setTimeout(() => {
          if (!cancelled) navigate(target);
        }, 800);
      } catch (e: unknown) {
        if (cancelled) return;
        const err = e as { message?: string };
        setStatus("error");
        setErrorMsg(err.message || t("magicLink.invalidToken", "Dieser Link ist ungültig oder abgelaufen."));
      }
    })();

    return () => { cancelled = true; };
  }, [navigate, t]);

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

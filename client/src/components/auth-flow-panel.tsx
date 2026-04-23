import { useState, useEffect, useCallback, type ReactNode } from "react";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { participantApi } from "@/lib/api";
import { setSessionAndSync } from "@/lib/session";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, ArrowLeft, CheckCircle, Shield, AlertTriangle, Eye, EyeOff, ExternalLink, Sparkles } from "lucide-react";
import { useLocation, Link } from "wouter";

const scrollInputIntoView = (e: React.FocusEvent<HTMLInputElement>) => {
  const el = e.currentTarget;
  setTimeout(() => {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 350);
};

export type AuthInitialTab = "signin" | "register";

interface PanelHeaderProps {
  dialogMode: boolean;
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  titleClassName: string;
}

function PanelHeader({ dialogMode, icon, title, description, titleClassName }: PanelHeaderProps) {
  if (dialogMode) {
    return (
      <DialogHeader>
        <DialogTitle className={titleClassName}>
          {icon}
          {title}
        </DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>
    );
  }
  return (
    <header className="space-y-2 text-center">
      <h1 className={titleClassName}>
        {icon}
        {title}
      </h1>
      {description && (
        <p className="text-sm text-muted-foreground" data-testid="text-auth-description">
          {description}
        </p>
      )}
    </header>
  );
}

export interface AuthFlowPanelProps {
  dialogMode: boolean;
  initialTab: AuthInitialTab;
  /** Called after successful auth (verify, login, register). Receives optional returnTo path. */
  onSuccess?: (returnTo: string | null) => void;
  /** Called when the user backs out (only meaningful for dialog mode). */
  onClose?: () => void;
  /** Whether to show the "open on dedicated page" link (dialog only). */
  showOpenOnPageLink?: boolean;
  /** Optional override for the "open on dedicated page" action. Gets the target tab. */
  onOpenOnPage?: (tab: AuthInitialTab) => void;
}

export function AuthFlowPanel({
  dialogMode,
  initialTab,
  onSuccess,
  onClose,
  showOpenOnPageLink = false,
  onOpenOnPage,
}: AuthFlowPanelProps) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const handleAuthSuccess = useCallback(() => {
    let returnTo: string | null = null;
    try {
      returnTo = sessionStorage.getItem("returnTo");
      sessionStorage.removeItem("returnTo");
      sessionStorage.removeItem("returnFrom");
    } catch {}
    if (onSuccess) {
      onSuccess(returnTo);
      return;
    }
    // Default: navigate to returnTo or labs/tastings
    if (returnTo && returnTo.startsWith("/labs/")) {
      navigate(returnTo);
    } else if (!dialogMode) {
      navigate("/labs/tastings");
    }
  }, [onSuccess, navigate, dialogMode]);

  const handleClose = useCallback(() => {
    let returnFrom: string | null = null;
    try {
      returnFrom = sessionStorage.getItem("returnFrom");
      sessionStorage.removeItem("returnFrom");
      sessionStorage.removeItem("returnTo");
    } catch {}
    if (onClose) onClose();
    if (returnFrom && returnFrom.startsWith("/labs/")) {
      navigate(returnFrom);
    }
  }, [onClose, navigate]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isReturning, setIsReturning] = useState(initialTab !== "register");

  useEffect(() => {
    setIsReturning(initialTab !== "register");
  }, [initialTab]);

  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);

  const [consentGate, setConsentGate] = useState(false);
  const [pendingLoginParticipant, setPendingLoginParticipant] = useState<{ id: string; name: string; role?: string; canAccessWhiskyDb?: boolean; photoUrl?: string } | null>(null);
  const [verifyMode, setVerifyMode] = useState(false);
  const [pendingParticipant, setPendingParticipant] = useState<{ id: string; name: string; role?: string; email?: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const [forgotPinMode, setForgotPinMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPin, setNewPin] = useState("");
  const [resetStep, setResetStep] = useState<"request" | "verify" | "done">("request");
  const [resetError, setResetError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetParticipantId, setResetParticipantId] = useState("");

  const [verificationBlocked, setVerificationBlocked] = useState(false);
  const [blockedAdminEmail, setBlockedAdminEmail] = useState("");
  const [blockedParticipantId, setBlockedParticipantId] = useState("");
  const [blockedResendLoading, setBlockedResendLoading] = useState(false);
  const [blockedResendSuccess, setBlockedResendSuccess] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);

  const [magicLinkMode, setMagicLinkMode] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [magicLinkError, setMagicLinkError] = useState("");

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleSubmit = async () => {
    setError("");

    if (!email.trim()) {
      setError(t("login.emailRequired"));
      return;
    }
    if (!validateEmail(email.trim())) {
      setError(t("login.invalidEmail"));
      return;
    }
    if (!pin.trim()) {
      setError(t("login.pinRequired"));
      return;
    }

    if (isReturning) {
      setLoading(true);
      try {
        const participant = await participantApi.loginByEmail(email.trim(), pin);
        if (!participant.privacyConsentAt) {
          setPendingLoginParticipant(participant);
          setConsentGate(true);
          setPrivacyConsent(false);
        } else {
          setSessionAndSync("log", participant.name, participant.id, participant.role, participant.photoUrl);
          try { localStorage.setItem("casksense_participant_id", participant.id); } catch {}
          window.dispatchEvent(new Event("session-change"));
          handleAuthSuccess();
        }
      } catch (e: unknown) {
        const err = e as { code?: string; message?: string; adminEmail?: string; participantId?: string };
        if (err.code === "EMAIL_VERIFICATION_EXPIRED" || (err.message && err.message.includes("nicht rechtzeitig bestätigt"))) {
          setVerificationBlocked(true);
          setBlockedAdminEmail(err.adminEmail || "");
          setBlockedParticipantId(err.participantId || "");
        } else {
          setError(err.message || "Login failed");
        }
      } finally {
        setLoading(false);
      }
    } else {
      if (!name.trim()) {
        setError(t("login.nameRequired"));
        return;
      }
      if (!privacyConsent) {
        setError(t("login.privacyConsentRequired"));
        return;
      }

      setLoading(true);
      try {
        const participant = await participantApi.loginOrCreate(
          name.trim(),
          pin,
          email.trim(),
          newsletterOptIn,
          true,
        );

        if (!participant.emailVerified) {
          setPendingParticipant({ id: participant.id, name: participant.name, role: participant.role, email: participant.email });
          localStorage.setItem(`casksense_level_chosen_${participant.id}`, "true");
          setVerifyMode(true);
          setVerifyCode("");
          setVerifyError("");
        } else {
          localStorage.setItem(`casksense_level_chosen_${participant.id}`, "true");
          setSessionAndSync("log", participant.name, participant.id, participant.role, participant.photoUrl);
          try { localStorage.setItem("casksense_participant_id", participant.id); } catch {}
          window.dispatchEvent(new Event("session-change"));
          handleAuthSuccess();
        }
      } catch (e: unknown) {
        const err = e as { message?: string };
        setError(err.message || "Failed to join");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleVerify = async () => {
    if (!pendingParticipant) return;
    if (!verifyCode.trim()) {
      setVerifyError(t("verify.codeRequired"));
      return;
    }
    setVerifyLoading(true);
    setVerifyError("");
    try {
      const verified = await participantApi.verify(pendingParticipant.id, verifyCode.trim());
      setSessionAndSync("log", verified.name, verified.id, verified.role, verified.photoUrl);
      try { localStorage.setItem("casksense_participant_id", verified.id); } catch {}
      window.dispatchEvent(new Event("session-change"));
      setVerifyMode(false);
      setPendingParticipant(null);
      handleAuthSuccess();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setVerifyError(err.message || t("verify.invalidCode"));
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pendingParticipant) return;
    setResendLoading(true);
    setResendSuccess(false);
    try {
      await participantApi.resendVerification(pendingParticipant.id);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setVerifyError(err.message || "Failed to resend code");
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setVerifyMode(false);
    setPendingParticipant(null);
    setVerifyCode("");
    setVerifyError("");
  };

  const handleForgotPinRequest = async () => {
    if (!resetEmail.trim()) {
      setResetError(t("login.emailRequired"));
      return;
    }
    setResetLoading(true);
    setResetError("");
    try {
      const res = await fetch("/api/participants/forgot-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      const data = await res.json().catch(() => ({ message: "Request failed" }));
      if (!res.ok) {
        throw new Error(data.message || "Failed");
      }
      setResetParticipantId(data.participantId);
      setResetStep("verify");
    } catch (e: unknown) {
      const err = e as { message?: string };
      setResetError(err.message || "Failed to send reset code");
    } finally {
      setResetLoading(false);
    }
  };

  const handleForgotPinVerify = async () => {
    if (!resetCode.trim() || !newPin.trim()) {
      setResetError(t("forgotPin.codeAndPinRequired"));
      return;
    }
    if (newPin.length < 4 || newPin.length > 64) {
      setResetError(t("forgotPin.pinTooShort"));
      return;
    }
    setResetLoading(true);
    setResetError("");
    try {
      const res = await fetch("/api/participants/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: resetParticipantId, code: resetCode.trim(), newPin }),
      });
      const data = await res.json().catch(() => ({ message: "Request failed" }));
      if (!res.ok) {
        throw new Error(data.message || "Failed");
      }
      setResetStep("done");
    } catch (e: unknown) {
      const err = e as { message?: string };
      setResetError(err.message || "Failed to reset PIN");
    } finally {
      setResetLoading(false);
    }
  };

  const handleRequestLoginLink = async () => {
    setMagicLinkError("");
    const trimmed = magicLinkEmail.trim();
    if (!trimmed) {
      setMagicLinkError(t("login.emailRequired"));
      return;
    }
    if (!validateEmail(trimmed)) {
      setMagicLinkError(t("login.invalidEmail"));
      return;
    }
    setMagicLinkLoading(true);
    try {
      await participantApi.requestLoginLink(trimmed);
      setMagicLinkSent(true);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string; adminEmail?: string; participantId?: string };
      if (err.code === "EMAIL_VERIFICATION_EXPIRED" || (err.message && err.message.includes("nicht rechtzeitig bestätigt"))) {
        setMagicLinkMode(false);
        setVerificationBlocked(true);
        setBlockedAdminEmail(err.adminEmail || "");
        setBlockedParticipantId(err.participantId || "");
      } else {
        setMagicLinkError(err.message || "Failed to send login link");
      }
    } finally {
      setMagicLinkLoading(false);
    }
  };

  const handleBackFromMagicLink = () => {
    setMagicLinkMode(false);
    setMagicLinkSent(false);
    setMagicLinkEmail("");
    setMagicLinkError("");
  };

  const handleEnterMagicLinkMode = () => {
    setMagicLinkMode(true);
    setMagicLinkSent(false);
    setMagicLinkError("");
    if (email.trim()) setMagicLinkEmail(email.trim());
  };

  const handleBackFromForgot = () => {
    setForgotPinMode(false);
    setResetStep("request");
    setResetEmail("");
    setResetCode("");
    setNewPin("");
    setShowNewPin(false);
    setResetError("");
    setResetParticipantId("");
  };

  // ===== Verification blocked view =====
  if (verificationBlocked) {
    const handleBlockedResend = async () => {
      if (!blockedParticipantId) return;
      setBlockedResendLoading(true);
      setBlockedResendSuccess(false);
      try {
        await participantApi.resendVerification(blockedParticipantId);
        setBlockedResendSuccess(true);
        setTimeout(() => setBlockedResendSuccess(false), 5000);
      } catch {
        // silently fail
      } finally {
        setBlockedResendLoading(false);
      }
    };

    return (
      <>
        <PanelHeader
          dialogMode={dialogMode}
          icon={<AlertTriangle className="w-6 h-6" />}
          title={t("verify.blockedTitle", "Konto gesperrt")}
          description={t("verify.blockedSubtitle", "E-Mail-Verifizierung nicht abgeschlossen")}
          titleClassName="font-serif text-2xl text-destructive flex items-center gap-2"
        />
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-verification-blocked-message">
            {t("verify.blockedMessage", "Deine E-Mail wurde nicht rechtzeitig bestätigt. Bitte wende dich an den Administrator:")}
          </p>
          <div className="rounded-lg p-3 bg-secondary/30 border border-border">
            <a href={`mailto:${blockedAdminEmail}`} className="text-sm font-semibold text-primary hover:underline" data-testid="link-admin-email">
              {blockedAdminEmail}
            </a>
          </div>
          {blockedParticipantId && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">
                {t("verify.blockedResendHint", "Falls du deinen Verifizierungscode erneut benötigst:")}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBlockedResend}
                disabled={blockedResendLoading}
                className="w-full"
                data-testid="button-blocked-resend"
              >
                <Mail className="w-4 h-4 mr-2" />
                {blockedResendLoading ? t("verify.resending", "Wird gesendet...") : blockedResendSuccess ? t("verify.resent", "Code gesendet!") : t("verify.resend", "Code erneut senden")}
              </Button>
            </div>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => { setVerificationBlocked(false); setBlockedAdminEmail(""); setBlockedParticipantId(""); }}
          className="w-full"
          data-testid="button-back-from-blocked"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("verify.backToLogin", "Zurück zum Login")}
        </Button>
      </>
    );
  }

  // ===== Consent gate =====
  if (consentGate && pendingLoginParticipant) {
    const handleConsentAccept = async () => {
      setLoading(true);
      try {
        sessionStorage.setItem("session_pid", pendingLoginParticipant.id);
        await participantApi.acceptPrivacyConsent(pendingLoginParticipant.id);
        setSessionAndSync("log", pendingLoginParticipant.name, pendingLoginParticipant.id, pendingLoginParticipant.role, pendingLoginParticipant.photoUrl);
        try { localStorage.setItem("casksense_participant_id", pendingLoginParticipant.id); } catch {}
        window.dispatchEvent(new Event("session-change"));
        setConsentGate(false);
        setPendingLoginParticipant(null);
        handleAuthSuccess();
      } catch (e: unknown) {
        const err = e as { message?: string };
        setError(err.message || "Failed to save consent");
      } finally {
        setLoading(false);
      }
    };
    return (
      <>
        <PanelHeader
          dialogMode={dialogMode}
          icon={<Shield className="w-6 h-6" />}
          title={t("legal.privacy.title")}
          description={t("login.privacyConsentRequired")}
          titleClassName="font-serif text-2xl text-primary flex items-center gap-2"
        />
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("legal.privacy.overview.text")}
          </p>
          <div className="flex items-start gap-2">
            <Checkbox
              id="consentGateCheckbox"
              checked={privacyConsent}
              onCheckedChange={(c) => setPrivacyConsent(c === true)}
              data-testid="checkbox-consent-gate"
            />
            <label htmlFor="consentGateCheckbox" className="text-sm text-muted-foreground leading-snug cursor-pointer">
              {t("login.privacyConsentLabel")}{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80">{t("login.privacyConsentLink")}</a>{" "}
              {t("login.andThe")}{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80">{t("login.termsConsentLink")}</a>
            </label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { sessionStorage.removeItem("session_pid"); setConsentGate(false); setPendingLoginParticipant(null); }} className="flex-1" data-testid="button-consent-cancel">
            {t("legal.back")}
          </Button>
          <Button onClick={handleConsentAccept} disabled={!privacyConsent || loading} className="flex-1 font-serif" data-testid="button-consent-accept">
            {loading ? t("login.joining") : t("login.enterReturning")}
          </Button>
        </div>
      </>
    );
  }

  // ===== Verify code mode (after register) =====
  if (verifyMode && pendingParticipant) {
    return (
      <>
        <PanelHeader
          dialogMode={dialogMode}
          icon={<Mail className="w-6 h-6" />}
          title={t("verify.title")}
          description={t("verify.subtitle", { email: pendingParticipant.email })}
          titleClassName="font-serif text-2xl text-primary flex items-center gap-2"
        />
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="font-serif text-sm uppercase tracking-widest text-muted-foreground">{t("verify.codeLabel")}</Label>
            <Input
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder={t("verify.codePlaceholder")}
              className="bg-secondary/20 text-center text-2xl tracking-[0.5em] font-mono"
              maxLength={6}
              inputMode="numeric"
              autoFocus
              data-testid="input-verify-code"
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              autoComplete="one-time-code"
              enterKeyHint="done"
              onFocus={scrollInputIntoView}
            />
            <p className="text-xs text-muted-foreground">{t("verify.codeHint")}</p>
          </div>

          {verifyError && <p className="text-sm text-destructive" data-testid="text-verify-error">{verifyError}</p>}

          <Button
            onClick={handleVerify}
            disabled={verifyLoading || verifyCode.length < 6}
            className="w-full bg-primary text-primary-foreground font-serif tracking-wide"
            data-testid="button-verify"
          >
            {verifyLoading ? t("verify.verifying") : t("verify.confirm")}
          </Button>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleBackToLogin}
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors min-h-[44px]"
              data-testid="button-back-to-login"
            >
              <ArrowLeft className="w-3 h-3" />
              {t("verify.backToLogin")}
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              className="text-xs text-muted-foreground hover:text-primary underline transition-colors disabled:opacity-50 min-h-[44px]"
              data-testid="button-resend-code"
            >
              {resendLoading ? t("verify.resending") : resendSuccess ? t("verify.resent") : t("verify.resend")}
            </button>
          </div>
        </div>
      </>
    );
  }

  // ===== Magic-link sign-in flow =====
  if (magicLinkMode) {
    return (
      <>
        <PanelHeader
          dialogMode={dialogMode}
          icon={magicLinkSent ? <CheckCircle className="w-6 h-6 text-green-500" /> : <Sparkles className="w-6 h-6" />}
          title={magicLinkSent ? t("magicLink.sentTitle", "E-Mail unterwegs") : t("magicLink.title", "Per E-Mail-Link anmelden")}
          description={
            magicLinkSent
              ? t("magicLink.sentDescription", "Falls ein Konto zu dieser E-Mail existiert, haben wir dir gerade einen Login-Link geschickt. Prüfe dein Postfach.")
              : t("magicLink.subtitle", "Wir senden dir einen einmaligen Anmeldelink. Keine PIN nötig.")
          }
          titleClassName="font-serif text-2xl text-primary flex items-center gap-2"
        />
        <div className="space-y-4 mt-4">
          {!magicLinkSent ? (
            <>
              <div className="space-y-2">
                <Label className="font-serif text-sm uppercase tracking-widest text-muted-foreground">{t("login.email")}</Label>
                <Input
                  type="text"
                  inputMode="email"
                  value={magicLinkEmail}
                  onChange={(e) => setMagicLinkEmail(e.target.value)}
                  placeholder={t("login.emailPlaceholder")}
                  className="bg-secondary/20"
                  data-testid="input-magic-link-email"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleRequestLoginLink()}
                  autoComplete="email"
                  enterKeyHint="send"
                  onFocus={scrollInputIntoView}
                />
                <p className="text-xs text-muted-foreground">
                  {t("magicLink.expiryHint", "Der Link ist 15 Minuten gültig und kann nur einmal verwendet werden.")}
                </p>
              </div>

              {magicLinkError && (
                <p className="text-sm text-destructive" data-testid="text-magic-link-error">
                  {magicLinkError}
                </p>
              )}

              <Button
                onClick={handleRequestLoginLink}
                disabled={magicLinkLoading}
                className="w-full bg-primary text-primary-foreground font-serif tracking-wide"
                data-testid="button-send-magic-link"
              >
                <Mail className="w-4 h-4 mr-2" />
                {magicLinkLoading ? t("magicLink.sending", "Wird gesendet…") : t("magicLink.sendLink", "Login-Link senden")}
              </Button>
            </>
          ) : (
            <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2">
              <p className="text-sm text-muted-foreground" data-testid="text-magic-link-sent-body">
                {t("magicLink.sentBody", "Öffne die E-Mail an")} <span className="font-semibold text-foreground">{magicLinkEmail}</span> {t("magicLink.sentBodySuffix", "und klicke auf den Anmelde-Button. Du wirst dann automatisch eingeloggt.")}
              </p>
              <p className="text-xs text-muted-foreground/80">
                {t("magicLink.checkSpam", "Keine E-Mail erhalten? Prüfe auch deinen Spam-Ordner.")}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleBackFromMagicLink}
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors min-h-[44px]"
              data-testid="button-back-from-magic-link"
            >
              <ArrowLeft className="w-3 h-3" />
              {t("magicLink.backToLogin", "Zurück zur PIN-Anmeldung")}
            </button>
            {magicLinkSent && (
              <button
                type="button"
                onClick={() => { setMagicLinkSent(false); }}
                className="text-xs text-muted-foreground hover:text-primary underline transition-colors min-h-[44px]"
                data-testid="button-magic-link-resend"
              >
                {t("magicLink.resend", "Erneut senden")}
              </button>
            )}
          </div>
        </div>
      </>
    );
  }

  // ===== Forgot PIN flow =====
  if (forgotPinMode) {
    return (
      <>
        <PanelHeader
          dialogMode={dialogMode}
          icon={<Mail className="w-6 h-6" />}
          title={resetStep === "done" ? t("forgotPin.backToLogin") : resetStep === "verify" ? t("forgotPin.verifyTitle") : t("forgotPin.title")}
          description={resetStep === "done" ? "" : resetStep === "verify" ? t("forgotPin.verifySubtitle") : t("forgotPin.subtitle")}
          titleClassName="font-serif text-2xl text-primary flex items-center gap-2"
        />
        <div className="space-y-4 mt-4">
          {resetStep === "request" && (
            <>
              <div className="space-y-2">
                <Label className="font-serif text-sm uppercase tracking-widest text-muted-foreground">{t("login.email")}</Label>
                <Input
                  type="text"
                  inputMode="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder={t("login.emailPlaceholder")}
                  className="bg-secondary/20"
                  data-testid="input-reset-email"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleForgotPinRequest()}
                  autoComplete="email"
                  enterKeyHint="send"
                  onFocus={scrollInputIntoView}
                />
              </div>

              {resetError && <p className="text-sm text-destructive" data-testid="text-reset-error">{resetError}</p>}

              <Button
                onClick={handleForgotPinRequest}
                disabled={resetLoading}
                className="w-full bg-primary text-primary-foreground font-serif tracking-wide"
                data-testid="button-send-reset-code"
              >
                {resetLoading ? t("forgotPin.sending") : t("forgotPin.sendCode")}
              </Button>
            </>
          )}

          {resetStep === "verify" && (
            <>
              <div className="space-y-2">
                <Label className="font-serif text-sm uppercase tracking-widest text-muted-foreground">{t("verify.codeLabel")}</Label>
                <Input
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder={t("verify.codePlaceholder")}
                  className="bg-secondary/20 text-center text-2xl tracking-[0.5em] font-mono"
                  maxLength={6}
                  inputMode="numeric"
                  autoFocus
                  data-testid="input-reset-code"
                  autoComplete="one-time-code"
                  enterKeyHint="next"
                  onFocus={scrollInputIntoView}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-serif text-sm uppercase tracking-widest text-muted-foreground">{t("forgotPin.newPin")}</Label>
                <div className="relative">
                  <Input
                    type={showNewPin ? "text" : "password"}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder={t("forgotPin.newPinPlaceholder")}
                    maxLength={64}
                    className="bg-secondary/20 pr-10 password-input"
                    data-testid="input-new-pin"
                    onKeyDown={(e) => e.key === "Enter" && handleForgotPinVerify()}
                    autoComplete="new-password"
                    enterKeyHint="done"
                    onFocus={scrollInputIntoView}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    data-testid="button-toggle-new-pin-visibility"
                    aria-label={showNewPin ? "PIN verbergen" : "PIN anzeigen"}
                    aria-pressed={showNewPin}
                  >
                    {showNewPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {resetError && <p className="text-sm text-destructive" data-testid="text-reset-error">{resetError}</p>}

              <Button
                onClick={handleForgotPinVerify}
                disabled={resetLoading || resetCode.length < 6}
                className="w-full bg-primary text-primary-foreground font-serif tracking-wide"
                data-testid="button-reset-pin"
              >
                {resetLoading ? t("forgotPin.resetting") : t("forgotPin.resetPin")}
              </Button>
            </>
          )}

          {resetStep === "done" && (
            <div className="text-center space-y-4 py-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <p className="text-sm text-muted-foreground" data-testid="text-reset-success">{t("forgotPin.success")}</p>
            </div>
          )}

          <div className="flex items-center justify-start">
            <button
              type="button"
              onClick={handleBackFromForgot}
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors min-h-[44px]"
              data-testid="button-back-from-forgot"
            >
              <ArrowLeft className="w-3 h-3" />
              {t("forgotPin.backToLogin")}
            </button>
          </div>
        </div>
      </>
    );
  }

  // ===== Main signin / register form =====
  const handleOpenOnPage = () => {
    const tab: AuthInitialTab = isReturning ? "signin" : "register";
    if (onOpenOnPage) {
      onOpenOnPage(tab);
    } else {
      navigate(tab === "signin" ? "/login" : "/register");
    }
  };

  return (
    <>
      <PanelHeader
        dialogMode={dialogMode}
        title={t("login.welcome")}
        description={t("login.welcomeSubtitle")}
        titleClassName="font-serif text-2xl text-primary text-center"
      />

      <div className="flex rounded-lg bg-secondary/30 p-1 mt-2" data-testid="auth-tab-switcher">
        <button
          type="button"
          onClick={() => { setIsReturning(true); setError(""); }}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-serif font-medium transition-all ${isReturning ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          data-testid="tab-login"
        >
          {t("login.tabLogin")}
        </button>
        <button
          type="button"
          onClick={() => { setIsReturning(false); setError(""); }}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-serif font-medium transition-all ${!isReturning ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          data-testid="tab-register"
        >
          {t("login.tabRegister")}
        </button>
      </div>

      <div className="space-y-4 mt-4">
        {!isReturning && (
          <div className="space-y-2">
            <Label className="font-serif text-sm uppercase tracking-widest text-muted-foreground">{t("login.name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("login.namePlaceholder")}
              className="bg-secondary/20"
              data-testid="input-name"
              autoComplete="name"
              enterKeyHint="next"
              onFocus={scrollInputIntoView}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label className="font-serif text-sm uppercase tracking-widest text-muted-foreground">{t("login.email")}</Label>
          <Input
            type="text"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("login.emailPlaceholder")}
            className="bg-secondary/20"
            data-testid="input-email"
            autoFocus={isReturning}
            autoComplete="email"
            enterKeyHint="next"
            onFocus={scrollInputIntoView}
          />
        </div>

        {!isReturning && email.trim() && (
          <div className="flex items-start space-x-2">
            <Checkbox
              id="newsletter"
              checked={newsletterOptIn}
              onCheckedChange={(checked) => setNewsletterOptIn(checked === true)}
              data-testid="checkbox-newsletter"
            />
            <div className="grid gap-0.5 leading-none">
              <label
                htmlFor="newsletter"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {t("login.newsletterOptIn")}
              </label>
              <p className="text-xs text-muted-foreground">
                {t("login.newsletterHint")}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label className="font-serif text-sm uppercase tracking-widest text-muted-foreground">{t("login.pin")}</Label>
          <div className="relative">
            <Input
              type={showPin ? "text" : "password"}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder={t("login.pinPlaceholder")}
              maxLength={64}
              className="bg-secondary/20 pr-10 password-input"
              data-testid="input-pin"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoComplete={isReturning ? "current-password" : "new-password"}
              enterKeyHint="done"
              onFocus={scrollInputIntoView}
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
              data-testid="button-toggle-pin-visibility"
              aria-label={showPin ? "PIN verbergen" : "PIN anzeigen"}
              aria-pressed={showPin}
            >
              {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {!isReturning && (
            <p className="text-xs text-muted-foreground">{t("login.pinHint")}</p>
          )}
          {isReturning && (
            <button
              type="button"
              onClick={() => setForgotPinMode(true)}
              className="text-xs text-muted-foreground hover:text-primary underline transition-colors min-h-[44px]"
              data-testid="button-forgot-pin"
            >
              {t("forgotPin.link")}
            </button>
          )}
        </div>

        {!isReturning && (
          <div className="flex items-start space-x-2">
            <Checkbox
              id="privacyConsent"
              checked={privacyConsent}
              onCheckedChange={(checked) => setPrivacyConsent(checked === true)}
              data-testid="checkbox-privacy-consent"
            />
            <div className="grid gap-0.5 leading-none">
              <label
                htmlFor="privacyConsent"
                className="text-xs leading-snug cursor-pointer text-muted-foreground"
              >
                {t("login.privacyConsentLabel")}{" "}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80">{t("login.privacyConsentLink")}</a>{" "}
                {t("login.andThe")}{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80">{t("login.termsConsentLink")}</a>
              </label>
            </div>
          </div>
        )}

        {isReturning && (
          <p className="text-[10px] text-muted-foreground/60 leading-relaxed">{t("login.loginPrivacyNotice")}{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">{t("login.privacyConsentLink")}</a>
          </p>
        )}

        {error && <p className="text-sm text-destructive" data-testid="text-login-error">{error}</p>}

        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-primary text-primary-foreground font-serif tracking-wide"
          data-testid="button-join"
        >
          {loading ? t("login.joining") : (isReturning ? t("login.enterReturning") : t("login.enter"))}
        </Button>

        {isReturning && (
          <>
            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-border/60"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  {t("magicLink.dividerOr", "oder")}
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleEnterMagicLinkMode}
              className="w-full font-serif tracking-wide"
              data-testid="button-magic-link-mode"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {t("magicLink.toggle", "Per E-Mail-Link anmelden")}
            </Button>
          </>
        )}

        {!dialogMode && (
          <div className="text-center pt-1">
            {isReturning ? (
              <Link
                href="/register"
                className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline transition-colors"
                data-testid="link-to-register"
              >
                {t("auth.noAccountYet", "Noch kein Konto? Jetzt registrieren")}
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline transition-colors"
                data-testid="link-to-login"
              >
                {t("auth.alreadyHaveAccount", "Schon ein Konto? Anmelden")}
              </Link>
            )}
          </div>
        )}

        {dialogMode && showOpenOnPageLink && (
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={handleOpenOnPage}
              className="text-xs text-muted-foreground hover:text-primary underline-offset-4 hover:underline inline-flex items-center gap-1 transition-colors"
              data-testid="link-open-on-page"
            >
              <ExternalLink className="w-3 h-3" />
              {t("auth.openOnPage", "Auf eigener Seite öffnen")}
            </button>
          </div>
        )}

        {!isReturning && (
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg p-2.5 border transition-all bg-secondary/20 border-border/30">
                <p className="text-[11px] font-serif font-semibold text-primary">{t("guestAuth.pinOnlyTitle")}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{t("guestAuth.pinOnlyDesc")}</p>
              </div>
              <div className="rounded-lg p-2.5 border transition-all bg-secondary/20 border-border/30">
                <p className="text-[11px] font-serif font-semibold text-primary">{t("guestAuth.emailTitle")}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{t("guestAuth.emailDesc")}</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/70 text-center italic">{t("guestAuth.upgradeHint")}</p>
            <div className="bg-secondary/30 rounded-lg p-3">
              <p className="text-[11px] text-muted-foreground/80 leading-relaxed">{t("guestAuth.hobbyNotice")}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

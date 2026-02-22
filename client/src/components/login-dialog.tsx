import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/lib/store";
import { participantApi } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
}

export function LoginDialog({ open, onClose }: LoginDialogProps) {
  const { t } = useTranslation();
  const { setParticipant } = useAppStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);

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

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async () => {
    setError("");

    if (!email.trim()) {
      setError(t('login.emailRequired'));
      return;
    }
    if (!validateEmail(email.trim())) {
      setError(t('login.invalidEmail'));
      return;
    }
    if (!pin.trim()) {
      setError(t('login.pinRequired'));
      return;
    }

    if (isReturning) {
      setLoading(true);
      try {
        const participant = await participantApi.loginByEmail(email.trim(), pin);
        setParticipant({ id: participant.id, name: participant.name, role: participant.role, canAccessWhiskyDb: participant.canAccessWhiskyDb });
        onClose();
      } catch (e: any) {
        setError(e.message || "Login failed");
      } finally {
        setLoading(false);
      }
    } else {
      if (!name.trim()) {
        setError(t('login.nameRequired'));
        return;
      }

      setLoading(true);
      try {
        const participant = await participantApi.loginOrCreate(
          name.trim(),
          pin,
          email.trim(),
          newsletterOptIn
        );

        if (!participant.emailVerified) {
          setPendingParticipant({ id: participant.id, name: participant.name, role: participant.role, email: participant.email });
          setVerifyMode(true);
          setVerifyCode("");
          setVerifyError("");
        } else {
          setParticipant({ id: participant.id, name: participant.name, role: participant.role, canAccessWhiskyDb: participant.canAccessWhiskyDb });
          onClose();
        }
      } catch (e: any) {
        setError(e.message || "Failed to join");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleVerify = async () => {
    if (!pendingParticipant) return;
    if (!verifyCode.trim()) {
      setVerifyError(t('verify.codeRequired'));
      return;
    }
    setVerifyLoading(true);
    setVerifyError("");
    try {
      const verified = await participantApi.verify(pendingParticipant.id, verifyCode.trim());
      setParticipant({ id: verified.id, name: verified.name, role: verified.role, canAccessWhiskyDb: verified.canAccessWhiskyDb });
      setVerifyMode(false);
      setPendingParticipant(null);
      onClose();
    } catch (e: any) {
      setVerifyError(e.message || t('verify.invalidCode'));
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
    } catch (e: any) {
      setVerifyError(e.message || "Failed to resend code");
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
      setResetError(t('login.emailRequired'));
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
    } catch (e: any) {
      setResetError(e.message || "Failed to send reset code");
    } finally {
      setResetLoading(false);
    }
  };

  const handleForgotPinVerify = async () => {
    if (!resetCode.trim() || !newPin.trim()) {
      setResetError(t('forgotPin.codeAndPinRequired'));
      return;
    }
    if (newPin.length < 4) {
      setResetError(t('forgotPin.pinTooShort'));
      return;
    }
    setResetLoading(true);
    setResetError("");
    try {
      const res = await fetch("/api/participants/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: resetParticipantId, code: resetCode.trim(), newPin: newPin }),
      });
      const data = await res.json().catch(() => ({ message: "Request failed" }));
      if (!res.ok) {
        throw new Error(data.message || "Failed");
      }
      setResetStep("done");
    } catch (e: any) {
      setResetError(e.message || "Failed to reset PIN");
    } finally {
      setResetLoading(false);
    }
  };

  const handleBackFromForgot = () => {
    setForgotPinMode(false);
    setResetStep("request");
    setResetEmail("");
    setResetCode("");
    setNewPin("");
    setResetError("");
    setResetParticipantId("");
  };

  if (verifyMode && pendingParticipant) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-primary flex items-center gap-2">
              <Mail className="w-6 h-6" />
              {t('verify.title')}
            </DialogTitle>
            <DialogDescription>
              {t('verify.subtitle', { email: pendingParticipant.email })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="font-serif text-sm uppercase tracking-widest text-muted-foreground">{t('verify.codeLabel')}</Label>
              <Input
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={t('verify.codePlaceholder')}
                className="bg-secondary/20 text-center text-2xl tracking-[0.5em] font-mono"
                maxLength={6}
                inputMode="numeric"
                autoFocus
                data-testid="input-verify-code"
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              />
              <p className="text-xs text-muted-foreground">{t('verify.codeHint')}</p>
            </div>

            {verifyError && <p className="text-sm text-destructive" data-testid="text-verify-error">{verifyError}</p>}

            <Button
              onClick={handleVerify}
              disabled={verifyLoading || verifyCode.length < 6}
              className="w-full bg-primary text-primary-foreground font-serif tracking-wide"
              data-testid="button-verify"
            >
              {verifyLoading ? t('verify.verifying') : t('verify.confirm')}
            </Button>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                data-testid="button-back-to-login"
              >
                <ArrowLeft className="w-3 h-3" />
                {t('verify.backToLogin')}
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="text-xs text-muted-foreground hover:text-primary underline transition-colors disabled:opacity-50"
                data-testid="button-resend-code"
              >
                {resendLoading ? t('verify.resending') : resendSuccess ? t('verify.resent') : t('verify.resend')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (forgotPinMode) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-primary flex items-center gap-2">
              <Mail className="w-6 h-6" />
              {resetStep === "done" ? t('forgotPin.backToLogin') : resetStep === "verify" ? t('forgotPin.verifyTitle') : t('forgotPin.title')}
            </DialogTitle>
            <DialogDescription>
              {resetStep === "done" ? "" : resetStep === "verify" ? t('forgotPin.verifySubtitle') : t('forgotPin.subtitle')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {resetStep === "request" && (
              <>
                <div className="space-y-2">
                  <Label className="font-serif text-sm uppercase tracking-widest text-muted-foreground">{t('login.email')}</Label>
                  <Input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder={t('login.emailPlaceholder')}
                    className="bg-secondary/20"
                    data-testid="input-reset-email"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleForgotPinRequest()}
                  />
                </div>

                {resetError && <p className="text-sm text-destructive" data-testid="text-reset-error">{resetError}</p>}

                <Button
                  onClick={handleForgotPinRequest}
                  disabled={resetLoading}
                  className="w-full bg-primary text-primary-foreground font-serif tracking-wide"
                  data-testid="button-send-reset-code"
                >
                  {resetLoading ? t('forgotPin.sending') : t('forgotPin.sendCode')}
                </Button>
              </>
            )}

            {resetStep === "verify" && (
              <>
                <div className="space-y-2">
                  <Label className="font-serif text-sm uppercase tracking-widest text-muted-foreground">{t('verify.codeLabel')}</Label>
                  <Input
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder={t('verify.codePlaceholder')}
                    className="bg-secondary/20 text-center text-2xl tracking-[0.5em] font-mono"
                    maxLength={6}
                    inputMode="numeric"
                    autoFocus
                    data-testid="input-reset-code"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-serif text-sm uppercase tracking-widest text-muted-foreground">{t('forgotPin.newPin')}</Label>
                  <Input
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder={t('forgotPin.newPinPlaceholder')}
                    maxLength={6}
                    className="bg-secondary/20"
                    data-testid="input-new-pin"
                    onKeyDown={(e) => e.key === "Enter" && handleForgotPinVerify()}
                  />
                </div>

                {resetError && <p className="text-sm text-destructive" data-testid="text-reset-error">{resetError}</p>}

                <Button
                  onClick={handleForgotPinVerify}
                  disabled={resetLoading || resetCode.length < 6}
                  className="w-full bg-primary text-primary-foreground font-serif tracking-wide"
                  data-testid="button-reset-pin"
                >
                  {resetLoading ? t('forgotPin.resetting') : t('forgotPin.resetPin')}
                </Button>
              </>
            )}

            {resetStep === "done" && (
              <div className="text-center space-y-4 py-4">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                <p className="text-sm text-muted-foreground" data-testid="text-reset-success">{t('forgotPin.success')}</p>
              </div>
            )}

            <div className="flex items-center justify-start">
              <button
                type="button"
                onClick={handleBackFromForgot}
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                data-testid="button-back-from-forgot"
              >
                <ArrowLeft className="w-3 h-3" />
                {t('forgotPin.backToLogin')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-primary text-center">{t('login.welcome')}</DialogTitle>
          <DialogDescription className="text-center">
            {t('login.welcomeSubtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex rounded-lg bg-secondary/30 p-1 mt-2" data-testid="auth-tab-switcher">
          <button
            type="button"
            onClick={() => { setIsReturning(false); setError(""); }}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-serif font-medium transition-all ${!isReturning ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            data-testid="tab-register"
          >
            {t('login.tabRegister')}
          </button>
          <button
            type="button"
            onClick={() => { setIsReturning(true); setError(""); }}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-serif font-medium transition-all ${isReturning ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            data-testid="tab-login"
          >
            {t('login.tabLogin')}
          </button>
        </div>

        <div className="space-y-4 mt-4">
          {!isReturning && (
            <div className="space-y-2">
              <Label className="font-serif text-sm uppercase tracking-widest text-muted-foreground">{t('login.name')}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('login.namePlaceholder')}
                className="bg-secondary/20"
                data-testid="input-name"
                autoFocus
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="font-serif text-sm uppercase tracking-widest text-muted-foreground">{t('login.email')}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login.emailPlaceholder')}
              className="bg-secondary/20"
              data-testid="input-email"
              autoFocus={isReturning}
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
                  {t('login.newsletterOptIn')}
                </label>
                <p className="text-xs text-muted-foreground">
                  {t('login.newsletterHint')}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="font-serif text-sm uppercase tracking-widest text-muted-foreground">{t('login.pin')}</Label>
            <Input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder={t('login.pinPlaceholder')}
              maxLength={6}
              className="bg-secondary/20"
              data-testid="input-pin"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            {!isReturning && (
              <p className="text-xs text-muted-foreground">{t('login.pinHint')}</p>
            )}
            {isReturning && (
              <button
                type="button"
                onClick={() => setForgotPinMode(true)}
                className="text-xs text-muted-foreground hover:text-primary underline transition-colors"
                data-testid="button-forgot-pin"
              >
                {t('forgotPin.link')}
              </button>
            )}
          </div>

          {!isReturning && (
            <p className="text-[10px] text-muted-foreground/60 leading-relaxed">{t('guestAuth.consentNotice')}</p>
          )}

          {error && <p className="text-sm text-destructive" data-testid="text-login-error">{error}</p>}

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-serif tracking-wide"
            data-testid="button-join"
          >
            {loading ? t('login.joining') : (isReturning ? t('login.enterReturning') : t('login.enter'))}
          </Button>

          {!isReturning && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-secondary/20 rounded-lg p-2.5 border border-border/30">
                  <p className="text-[11px] font-serif font-semibold text-primary">{t('guestAuth.pinOnlyTitle')}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{t('guestAuth.pinOnlyDesc')}</p>
                </div>
                <div className="bg-primary/5 rounded-lg p-2.5 border border-primary/20">
                  <p className="text-[11px] font-serif font-semibold text-primary">{t('guestAuth.emailTitle')}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{t('guestAuth.emailDesc')}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/70 text-center italic">{t('guestAuth.upgradeHint')}</p>
              <div className="bg-secondary/30 rounded-lg p-3">
                <p className="text-[11px] text-muted-foreground/80 leading-relaxed">{t('guestAuth.hobbyNotice')}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

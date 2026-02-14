import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/lib/store";
import { participantApi } from "@/lib/api";
import { useTranslation } from "react-i18next";

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

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async () => {
    setError("");

    if (!name.trim()) {
      setError(t('login.nameRequired'));
      return;
    }

    if (!isReturning) {
      if (!email.trim()) {
        setError(t('login.emailRequired'));
        return;
      }
      if (!validateEmail(email.trim())) {
        setError(t('login.invalidEmail'));
        return;
      }
    }

    if (!pin.trim()) {
      setError(t('login.pinRequired'));
      return;
    }

    setLoading(true);
    try {
      const participant = await participantApi.loginOrCreate(
        name.trim(),
        pin,
        isReturning ? undefined : email.trim()
      );
      setParticipant({ id: participant.id, name: participant.name, role: participant.role });
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to join");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-primary">{t('login.title')}</DialogTitle>
          <DialogDescription>
            {isReturning ? t('login.returningSubtitle') : t('login.subtitle')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="font-serif text-sm uppercase tracking-widest text-muted-foreground">{t('login.name')}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('login.namePlaceholder')}
              className="bg-secondary/20"
              data-testid="input-name"
            />
          </div>

          {!isReturning && (
            <div className="space-y-2">
              <Label className="font-serif text-sm uppercase tracking-widest text-muted-foreground">{t('login.email')}</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.emailPlaceholder')}
                className="bg-secondary/20"
                data-testid="input-email"
              />
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
            />
            {!isReturning && (
              <p className="text-xs text-muted-foreground">{t('login.pinHint')}</p>
            )}
          </div>

          {error && <p className="text-sm text-destructive" data-testid="text-login-error">{error}</p>}

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-serif tracking-wide"
            data-testid="button-join"
          >
            {loading ? t('login.joining') : t('login.enter')}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => { setIsReturning(!isReturning); setError(""); }}
              className="text-xs text-muted-foreground hover:text-primary underline transition-colors"
              data-testid="button-toggle-returning"
            >
              {isReturning ? t('login.subtitle') : t('login.returningSubtitle')}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

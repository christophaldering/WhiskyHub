import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { Shield, X } from "lucide-react";
import { useLocation } from "wouter";

export function StorageConsent() {
  const { t } = useTranslation();
  const { storageConsentDismissed, setStorageConsentDismissed } = useAppStore();
  const [, navigate] = useLocation();

  if (storageConsentDismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] p-3 sm:p-4" data-testid="storage-consent-banner">
      <div className="max-w-2xl mx-auto bg-card/95 backdrop-blur-lg border border-border/60 rounded-xl shadow-xl px-4 py-3 flex items-center gap-3">
        <Shield className="w-4 h-4 text-primary shrink-0" />
        <p className="text-xs text-muted-foreground flex-1">
          {t("legal.storageConsent.text")}{" "}
          <button
            onClick={() => navigate("/privacy")}
            className="text-primary hover:underline underline-offset-2 font-medium"
            data-testid="link-storage-consent-privacy"
          >
            {t("legal.storageConsent.learnMore")}
          </button>
        </p>
        <button
          onClick={() => setStorageConsentDismissed(true)}
          className="text-xs font-medium text-primary hover:text-primary/80 px-2 py-1 rounded-md hover:bg-primary/10 transition-colors shrink-0"
          data-testid="button-storage-consent-dismiss"
        >
          {t("legal.storageConsent.dismiss")}
        </button>
        <button
          onClick={() => setStorageConsentDismissed(true)}
          className="text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0"
          data-testid="button-storage-consent-close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

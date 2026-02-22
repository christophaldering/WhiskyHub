import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginDialog } from "@/components/login-dialog";

interface GuestPreviewProps {
  children: React.ReactNode;
  featureTitle: string;
  featureDescription: string;
}

export function GuestPreview({ featureTitle, featureDescription }: GuestPreviewProps) {
  const { t } = useTranslation();
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div className="flex items-center justify-center py-20">
      <LoginDialog open={showLogin} onClose={() => setShowLogin(false)} />
      <div className="bg-card border border-border/60 rounded-2xl shadow-sm px-8 py-10 max-w-sm text-center space-y-4">
        <h3 className="font-serif text-lg font-semibold text-foreground">{featureTitle}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{featureDescription}</p>
        <Button
          onClick={() => setShowLogin(true)}
          className="gap-2"
          data-testid="button-guest-signin"
        >
          <LogIn className="w-4 h-4" />
          {t("common.signInToAccess")}
        </Button>
      </div>
    </div>
  );
}

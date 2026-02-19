import { useTranslation } from "react-i18next";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface GuestPreviewProps {
  children: React.ReactNode;
  featureTitle: string;
  featureDescription: string;
}

export function GuestPreview({ children, featureTitle, featureDescription }: GuestPreviewProps) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  return (
    <div className="relative">
      <div className="pointer-events-none select-none" aria-hidden="true">
        <div className="opacity-50 blur-[1px]">
          {children}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-card/95 backdrop-blur-sm border border-border/60 rounded-2xl shadow-xl px-8 py-8 max-w-sm text-center space-y-4">
          <h3 className="font-serif text-lg font-semibold text-foreground">{featureTitle}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{featureDescription}</p>
          <Button
            onClick={() => navigate("/")}
            className="gap-2"
            data-testid="button-guest-signin"
          >
            <LogIn className="w-4 h-4" />
            {t("common.signInToAccess")}
          </Button>
        </div>
      </div>
    </div>
  );
}

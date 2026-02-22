import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Wine, ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Privacy() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const sections = [
    "overview",
    "dataCollected",
    "purpose",
    "localStorage",
    "aiProcessing",
    "email",
    "thirdParty",
    "retention",
    "rights",
    "deletion",
    "dataExport",
    "children",
    "changes",
    "contact",
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2" data-testid="privacy-logo">
            <Wine className="w-5 h-5 text-primary" />
            <span className="font-serif font-bold text-primary">CaskSense</span>
          </button>
          <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="gap-1.5 text-sm" data-testid="button-back-privacy">
            <ArrowLeft className="w-4 h-4" />
            {t("legal.back")}
          </Button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-3xl sm:text-4xl font-serif font-black text-primary" data-testid="text-privacy-title">
            {t("legal.privacy.title")}
          </h1>
        </div>

        <p className="text-sm text-muted-foreground mb-8" data-testid="text-privacy-updated">
          {t("legal.privacy.lastUpdated")}: {t("legal.privacy.lastUpdatedDate")}
        </p>

        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section} id={section}>
              <h2 className="text-lg font-serif font-bold text-primary mb-2" data-testid={`text-privacy-${section}-title`}>
                {t(`legal.privacy.${section}.title`)}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line" data-testid={`text-privacy-${section}-text`}>
                {t(`legal.privacy.${section}.text`)}
              </p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}

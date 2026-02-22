import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Wine, ArrowLeft, Mail, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Impressum() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2" data-testid="impressum-logo">
            <Wine className="w-5 h-5 text-primary" />
            <span className="font-serif font-bold text-primary">CaskSense</span>
          </button>
          <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="gap-1.5 text-sm" data-testid="button-back-impressum">
            <ArrowLeft className="w-4 h-4" />
            {t("legal.back")}
          </Button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-serif font-black text-primary mb-8" data-testid="text-impressum-title">
          {t("legal.impressum.title")}
        </h1>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-lg font-serif font-bold text-primary mb-2">{t("legal.impressum.responsibleTitle")}</h2>
            <p className="text-foreground leading-relaxed">
              Christoph Aldering<br />
              Jakob-Troost-Straße 8<br />
              46446 Emmerich am Rhein<br />
              Germany
            </p>
          </section>

          <section>
            <h2 className="text-lg font-serif font-bold text-primary mb-2">{t("legal.impressum.contactTitle")}</h2>
            <div className="space-y-2">
              <a href="mailto:christoph.aldering@googlemail.com" className="flex items-center gap-2 text-primary hover:underline" data-testid="link-impressum-email">
                <Mail className="w-4 h-4" />
                christoph.aldering@googlemail.com
              </a>
              <a href="https://www.linkedin.com/in/aldering" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline" data-testid="link-impressum-linkedin">
                <Linkedin className="w-4 h-4" />
                linkedin.com/in/aldering
              </a>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-serif font-bold text-primary mb-2">{t("legal.impressum.disclaimerTitle")}</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">{t("legal.impressum.disclaimerText")}</p>
          </section>

          <section>
            <h2 className="text-lg font-serif font-bold text-primary mb-2">{t("legal.impressum.projectNoteTitle")}</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">{t("legal.impressum.projectNoteText")}</p>
          </section>
        </div>
      </main>
    </div>
  );
}

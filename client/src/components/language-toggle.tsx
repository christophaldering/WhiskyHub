import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function LanguageToggle() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "de" : "en";
    const scrollY = window.scrollY;
    i18n.changeLanguage(newLang).then(() => {
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    });
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={toggleLanguage}
      className="font-mono text-xs tracking-wider border border-border/50 hover:bg-secondary/50"
    >
      <span className={cn(i18n.language === "en" ? "font-bold text-primary" : "text-muted-foreground")}>EN</span>
      <span className="mx-1 text-border">|</span>
      <span className={cn(i18n.language === "de" ? "font-bold text-primary" : "text-muted-foreground")}>DE</span>
    </Button>
  );
}

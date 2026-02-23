import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

const languages = [
  { code: "en", label: "English", flag: "EN" },
  { code: "de", label: "Deutsch", flag: "DE" },
];

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const changeLanguage = (lang: string) => {
    const scrollY = window.scrollY;
    i18n.changeLanguage(lang).then(() => {
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    });
    setOpen(false);
  };

  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="font-mono text-xs tracking-wider border border-border/50 hover:bg-secondary/50 gap-1.5"
          data-testid="button-language-toggle"
        >
          <Globe className="w-3.5 h-3.5" />
          {currentLang.flag}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[160px] p-1">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-1.5 rounded-sm text-sm font-mono cursor-pointer hover:bg-secondary/80 transition-colors",
              i18n.language === lang.code && "font-bold text-primary bg-primary/5"
            )}
            data-testid={`button-lang-${lang.code}`}
          >
            <span className="w-6 text-center text-xs">{lang.flag}</span>
            {lang.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

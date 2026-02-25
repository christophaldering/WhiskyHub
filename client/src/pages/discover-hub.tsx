import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSearch } from "wouter";
import { Compass, Sparkles, BookOpen, FlaskConical } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import Recommendations from "@/pages/recommendations";
import Lexicon from "@/pages/lexicon";
import Research from "@/pages/research";

export default function DiscoverHub() {
  const { t } = useTranslation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const section = params.get("section") || "recommendations";

  const recommendationsRef = useRef<HTMLDivElement>(null);
  const lexiconRef = useRef<HTMLDivElement>(null);
  const researchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refMap: Record<string, React.RefObject<HTMLDivElement | null>> = {
      recommendations: recommendationsRef,
      lexicon: lexiconRef,
      research: researchRef,
    };
    const targetRef = refMap[section];
    if (targetRef?.current) {
      setTimeout(() => {
        targetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [section]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 min-w-0 overflow-x-hidden" data-testid="discover-hub-page">
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Compass className="w-7 h-7 text-primary" />
          <h1
            className="text-2xl md:text-3xl font-serif font-bold text-primary tracking-tight"
            data-testid="text-discover-title"
          >
            {t("discover.title", "Entdecken")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto" data-testid="text-discover-subtitle">
          {t("discover.subtitle", "Empfehlungen, Wissen und Forschung – alles an einem Ort.")}
        </p>
      </div>

      <div ref={recommendationsRef} data-testid="section-recommendations" className="scroll-mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary/70" />
          <h2 className="text-lg font-serif font-semibold text-primary" data-testid="text-section-recommendations">
            {t("recommendations.title", "Empfehlungen")}
          </h2>
        </div>
        <Recommendations />
      </div>

      <Separator className="my-10 opacity-40" />

      <div ref={lexiconRef} data-testid="section-lexicon" className="scroll-mt-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-primary/70" />
          <h2 className="text-lg font-serif font-semibold text-primary" data-testid="text-section-lexicon">
            {t("lexicon.title", "Lexikon")}
          </h2>
        </div>
        <Lexicon />
      </div>

      <Separator className="my-10 opacity-40" />

      <div ref={researchRef} data-testid="section-research" className="scroll-mt-6">
        <div className="flex items-center gap-2 mb-4">
          <FlaskConical className="w-5 h-5 text-primary/70" />
          <h2 className="text-lg font-serif font-semibold text-primary" data-testid="text-section-research">
            {t("research.title", "Forschung")}
          </h2>
        </div>
        <Research />
      </div>
    </div>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Printer, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import type { Whisky } from "@shared/schema";

interface BriefingNotesProps {
  whiskies: Whisky[];
  tastingTitle: string;
}

const peatIndicator = (level: string | null) => {
  if (!level || level === "None") return null;
  const levels: Record<string, number> = { Light: 1, Medium: 2, Heavy: 3 };
  const filled = levels[level] ?? 0;
  return (
    <span className="inline-flex items-center gap-0.5" data-testid="peat-indicator">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`inline-block w-2 h-2 rounded-full ${i <= filled ? "bg-amber-600" : "bg-muted-foreground/20"}`}
        />
      ))}
      <span className="ml-1 text-xs">{level}</span>
    </span>
  );
};

export function BriefingNotes({ whiskies, tastingTitle }: BriefingNotesProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-primary/30 text-primary font-serif" data-testid="button-briefing-notes">
          <FileText className="w-4 h-4 mr-1" /> {t("briefing.title")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible print:shadow-none print:border-none">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-primary">{t("briefing.title")}</DialogTitle>
          <DialogDescription className="text-muted-foreground">{t("briefing.subtitle")} — {tastingTitle}</DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <div className="flex justify-end mb-4 print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="font-serif"
              data-testid="button-briefing-print"
            >
              <Printer className="w-4 h-4 mr-1" /> {t("briefing.print")}
            </Button>
          </div>

          {whiskies.length === 0 ? (
            <p className="text-center text-muted-foreground font-serif py-12" data-testid="text-no-whiskies">
              {t("briefing.noWhiskies")}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3">
              {whiskies.map((w, idx) => (
                <motion.div
                  key={w.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border border-border/60 rounded-lg p-4 bg-card print:break-inside-avoid print:border-gray-300 print:shadow-none"
                  data-testid={`card-briefing-${w.id}`}
                >
                  <h3 className="font-serif font-bold text-lg text-primary mb-1" data-testid={`text-briefing-name-${w.id}`}>
                    {w.name}
                  </h3>

                  {w.distillery && (
                    <p className="text-sm text-muted-foreground font-serif italic mb-2" data-testid={`text-briefing-distillery-${w.id}`}>
                      {w.distillery}
                    </p>
                  )}

                  <div className="space-y-1 text-sm">
                    {(w.region || w.category) && (
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                        {w.region && (
                          <span data-testid={`text-briefing-region-${w.id}`}>
                            <span className="text-muted-foreground text-xs uppercase tracking-wider">{t("briefing.region")}:</span>{" "}
                            {w.region}
                          </span>
                        )}
                        {w.category && (
                          <span data-testid={`text-briefing-category-${w.id}`}>
                            <span className="text-muted-foreground text-xs uppercase tracking-wider">{t("briefing.category")}:</span>{" "}
                            {w.category}
                          </span>
                        )}
                      </div>
                    )}

                    {(w.age || w.abv != null) && (
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                        {w.age && (
                          <span data-testid={`text-briefing-age-${w.id}`}>
                            <span className="text-muted-foreground text-xs uppercase tracking-wider">{t("briefing.age")}:</span>{" "}
                            {w.age}
                          </span>
                        )}
                        {w.abv != null && (
                          <span data-testid={`text-briefing-abv-${w.id}`}>
                            <span className="text-muted-foreground text-xs uppercase tracking-wider">{t("briefing.abv")}:</span>{" "}
                            {w.abv}%
                          </span>
                        )}
                      </div>
                    )}

                    {w.caskType && (
                      <div data-testid={`text-briefing-cask-${w.id}`}>
                        <span className="text-muted-foreground text-xs uppercase tracking-wider">{t("briefing.cask")}:</span>{" "}
                        {w.caskType}
                      </div>
                    )}

                    {w.peatLevel && w.peatLevel !== "None" && (
                      <div data-testid={`text-briefing-peat-${w.id}`}>
                        <span className="text-muted-foreground text-xs uppercase tracking-wider">{t("briefing.peat")}:</span>{" "}
                        {peatIndicator(w.peatLevel)}
                      </div>
                    )}

                    {w.notes && (
                      <div className="mt-2 pt-2 border-t border-border/30" data-testid={`text-briefing-notes-${w.id}`}>
                        <span className="text-muted-foreground text-xs uppercase tracking-wider">{t("briefing.notes")}:</span>
                        <p className="text-sm mt-0.5 whitespace-pre-line">{w.notes}</p>
                      </div>
                    )}

                    {w.whiskybaseId && (
                      <div className="mt-1">
                        <a
                          href={`https://www.whiskybase.com/whiskies/whisky/${w.whiskybaseId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                          data-testid={`link-briefing-whiskybase-${w.id}`}
                        >
                          Whiskybase #{w.whiskybaseId} <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

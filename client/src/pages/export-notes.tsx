import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { exportApi, tastingApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Copy, FileText, Wine } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WhiskyNote {
  whisky: {
    id: string;
    name: string;
    distillery: string | null;
    age: string | null;
    abv: number | null;
    imageUrl: string | null;
  };
  rating: {
    nose: number;
    taste: number;
    finish: number;
    balance: number;
    overall: number;
    notes: string | null;
  };
}

interface NotesData {
  tasting: { id: string; name: string; date: string };
  participant: { id: string; name: string };
  notes: WhiskyNote[];
}

export default function ExportNotes() {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const { toast } = useToast();

  const params = new URLSearchParams(window.location.search);
  const urlTastingId = params.get("tastingId");

  const [selectedTastingId, setSelectedTastingId] = useState<string>(urlTastingId || "");

  const { data: tastings, isLoading: tastingsLoading } = useQuery<any[]>({
    queryKey: ["tastings"],
    queryFn: () => tastingApi.getAll(),
    enabled: !!currentParticipant,
  });

  const { data: notesData, isLoading: notesLoading } = useQuery<NotesData>({
    queryKey: ["participant-notes", selectedTastingId, currentParticipant?.id],
    queryFn: () => exportApi.getParticipantNotes(selectedTastingId, currentParticipant!.id),
    enabled: !!selectedTastingId && !!currentParticipant,
  });

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleCopyText = useCallback(() => {
    if (!notesData?.notes?.length) return;

    const header = `${notesData.tasting.name}\n${notesData.tasting.date}\n${notesData.participant.name}\n${"─".repeat(40)}\n`;

    const lines = notesData.notes.map((item) => {
      const w = item.whisky;
      const r = item.rating;
      const meta = [w.distillery, w.age ? `${w.age}y` : null, w.abv ? `${w.abv}%` : null].filter(Boolean).join(" · ");
      return [
        w.name,
        meta ? `  ${meta}` : null,
        `  ${t("evaluation.nose")}: ${r.nose}  |  ${t("evaluation.taste")}: ${r.taste}  |  ${t("evaluation.finish")}: ${r.finish}  |  ${t("evaluation.balance")}: ${r.balance}  |  ${t("evaluation.overall")}: ${r.overall}`,
        r.notes ? `  ${t("evaluation.notes")}: ${r.notes}` : null,
        "",
      ]
        .filter((l) => l !== null)
        .join("\n");
    });

    const text = header + lines.join("\n");
    navigator.clipboard.writeText(text).then(() => {
      toast({ description: t("exportNotes.copied") });
    });
  }, [notesData, t, toast]);

  if (!currentParticipant) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground font-serif" data-testid="text-export-login-required">
          {t("exportNotes.loginRequired")}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" data-testid="export-notes-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-7 h-7 text-primary" />
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-export-title">
            {t("exportNotes.title")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">{t("exportNotes.subtitle")}</p>

        <div className="mb-8 print:hidden">
          <label className="block text-sm font-medium text-foreground mb-2">{t("exportNotes.selectTasting")}</label>
          {tastingsLoading ? (
            <div className="h-10 w-64 bg-card/50 rounded animate-pulse" />
          ) : (
            <Select value={selectedTastingId} onValueChange={setSelectedTastingId} data-testid="select-tasting">
              <SelectTrigger className="w-full max-w-md" data-testid="select-tasting-trigger">
                <SelectValue placeholder={t("exportNotes.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {tastings?.map((tasting: any) => (
                  <SelectItem key={tasting.id} value={String(tasting.id)} data-testid={`select-tasting-item-${tasting.id}`}>
                    {tasting.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {selectedTastingId && notesLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-card/50 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {notesData && (
          <>
            <div className="flex items-center justify-between mb-6 print:hidden">
              <p className="text-sm text-muted-foreground">
                {t("exportNotes.notesCount", { count: notesData.notes?.length || 0 })}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyText} data-testid="button-copy-text">
                  <Copy className="w-4 h-4 mr-2" />
                  {t("exportNotes.copyText")}
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-print">
                  <Printer className="w-4 h-4 mr-2" />
                  {t("exportNotes.print")}
                </Button>
              </div>
            </div>

            <div className="hidden print:block mb-6 text-center border-b border-border/40 pb-4">
              <h2 className="text-xl font-serif font-bold">{notesData.tasting.name}</h2>
              <p className="text-sm text-muted-foreground">{notesData.tasting.date}</p>
              <p className="text-sm text-muted-foreground">{notesData.participant.name}</p>
            </div>

            {notesData.notes?.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Wine className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="font-serif">{t("exportNotes.empty")}</p>
              </div>
            ) : (
              <div className="space-y-4 print:space-y-6">
                {notesData.notes?.map((item, index) => (
                  <motion.div
                    key={item.whisky.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="bg-card rounded-lg border border-border/40 p-5 print:break-inside-avoid print:border print:border-gray-300"
                    data-testid={`card-whisky-note-${item.whisky.id}`}
                  >
                    <div className="flex gap-4">
                      {item.whisky.imageUrl && (
                        <img
                          src={item.whisky.imageUrl}
                          alt={item.whisky.name}
                          className="w-16 h-20 rounded object-cover flex-shrink-0"
                          data-testid={`img-whisky-${item.whisky.id}`}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-serif font-semibold text-foreground" data-testid={`text-whisky-name-${item.whisky.id}`}>
                          {item.whisky.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-3">
                          {[item.whisky.distillery, item.whisky.age ? `${item.whisky.age}y` : null, item.whisky.abv ? `${item.whisky.abv}% ABV` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>

                        <div className="grid grid-cols-5 gap-2 mb-3">
                          {(["nose", "taste", "finish", "balance", "overall"] as const).map((dim) => (
                            <div key={dim} className="text-center">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t(`evaluation.${dim}`)}</p>
                              <p className="text-lg font-serif font-bold text-primary" data-testid={`text-score-${dim}-${item.whisky.id}`}>
                                {item.rating[dim]?.toFixed?.(1) ?? item.rating[dim]}
                              </p>
                            </div>
                          ))}
                        </div>

                        {item.rating.notes && (
                          <div className="bg-secondary/20 rounded p-3">
                            <p className="text-xs text-muted-foreground mb-1 font-medium">{t("evaluation.notes")}</p>
                            <p className="text-sm text-foreground leading-relaxed" data-testid={`text-notes-${item.whisky.id}`}>
                              {item.rating.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {!selectedTastingId && !tastingsLoading && (
          <div className="text-center py-16 text-muted-foreground">
            <Wine className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-serif">{t("exportNotes.selectPrompt")}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

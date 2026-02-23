import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { exportApi, tastingApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Copy, FileText, Wine, FileDown, ClipboardList, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GuestPreview } from "@/components/guest-preview";

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

  const [selectedTastingId, setSelectedTastingId] = useState<string | undefined>(urlTastingId || undefined);

  const { data: tastings, isLoading: tastingsLoading } = useQuery<any[]>({
    queryKey: ["tastings", currentParticipant?.id],
    queryFn: () => tastingApi.getAll(currentParticipant?.id),
    enabled: !!currentParticipant,
  });

  const { data: notesData, isLoading: notesLoading } = useQuery<NotesData>({
    queryKey: ["participant-notes", selectedTastingId, currentParticipant?.id],
    queryFn: () => exportApi.getParticipantNotes(selectedTastingId!, currentParticipant!.id),
    enabled: !!selectedTastingId && !!currentParticipant,
  });

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const [downloading, setDownloading] = useState(false);

  const handleDownloadWord = useCallback(async () => {
    if (!notesData || !selectedTastingId || !currentParticipant) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/export/notes-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tastingId: selectedTastingId, participantId: currentParticipant.id }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${notesData.tasting.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_notes.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ description: e.message || "Download failed", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  }, [notesData, selectedTastingId, currentParticipant, toast]);

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
      <GuestPreview featureTitle={t("exportNotes.title")} featureDescription={t("guestPreview.exportNotes")}>
        <div className="space-y-4">
          <h1 className="text-2xl font-serif font-bold">{t("exportNotes.title")}</h1>
          <div className="bg-card rounded-xl border p-6 space-y-4">
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">📄</div><div><div className="font-serif font-semibold">Highland Evening Notes</div><div className="text-sm text-muted-foreground">6 whiskies · Jan 15, 2026</div></div></div>
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">📄</div><div><div className="font-serif font-semibold">Islay Exploration Notes</div><div className="text-sm text-muted-foreground">5 whiskies · Dec 8, 2025</div></div></div>
          </div>
        </div>
      </GuestPreview>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 min-w-0 overflow-x-hidden" data-testid="export-notes-page">
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
              <SelectTrigger className="w-full max-w-md bg-card border-2 border-primary/30 hover:border-primary/60 focus:border-primary transition-colors shadow-sm" data-testid="select-tasting-trigger">
                <SelectValue placeholder={t("exportNotes.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[200]">
                {(!tastings || tastings.length === 0) ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">{t("exportNotes.noTastings")}</div>
                ) : (
                  tastings.map((tasting: any) => (
                    <SelectItem key={tasting.id} value={String(tasting.id)} data-testid={`select-tasting-item-${tasting.id}`}>
                      {tasting.name}
                    </SelectItem>
                  ))
                )}
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
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyText} data-testid="button-copy-text">
                  <Copy className="w-4 h-4 mr-2" />
                  {t("exportNotes.copyText")}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadWord} disabled={downloading} data-testid="button-download-word">
                  <FileDown className="w-4 h-4 mr-2" />
                  {t("exportNotes.downloadWord")}
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
              <div className="flex flex-col items-center py-12" data-testid="empty-state-no-notes">
                <div className="bg-card border border-border/40 rounded-xl p-8 max-w-md w-full text-center shadow-sm">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Wine className="w-8 h-8 text-amber-500/60" />
                  </div>
                  <h3 className="text-lg font-serif font-semibold text-foreground mb-2">{t("exportNotes.empty")}</h3>
                  <p className="text-sm text-muted-foreground">{t("exportNotes.emptyHint")}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 print:space-y-6">
                {notesData.notes?.map((item, index) => (
                  <motion.div
                    key={item.whisky.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="bg-card rounded-xl border border-border/40 p-5 shadow-sm hover:shadow-md transition-shadow print:break-inside-avoid print:border print:border-gray-300 print:shadow-none"
                    data-testid={`card-whisky-note-${item.whisky.id}`}
                  >
                    <div className="flex gap-4">
                      {item.whisky.imageUrl && (
                        <div className="w-16 h-24 rounded-lg bg-secondary/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          <img
                            src={item.whisky.imageUrl}
                            alt={item.whisky.name}
                            className="w-full h-full object-contain p-1"
                            data-testid={`img-whisky-${item.whisky.id}`}
                          />
                        </div>
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

                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
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
          <div className="flex flex-col items-center py-12" data-testid="empty-state-select">
            <div className="bg-card border border-border/40 rounded-xl p-8 max-w-md w-full text-center shadow-sm">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <ClipboardList className="w-8 h-8 text-primary/60" />
              </div>
              <h3 className="text-lg font-serif font-semibold text-foreground mb-2">{t("exportNotes.selectPrompt")}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t("exportNotes.selectHint")}</p>
              <div className="flex justify-center">
                <ChevronUp className="w-5 h-5 text-muted-foreground/50 animate-bounce" />
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

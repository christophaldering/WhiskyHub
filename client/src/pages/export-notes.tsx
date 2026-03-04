import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { exportApi, tastingApi } from "@/lib/api";
import { Printer, Copy, FileText, Wine, FileDown, ClipboardList, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GuestPreview } from "@/components/guest-preview";
import { c, cardStyle, inputStyle, sectionHeadingStyle } from "@/lib/theme";

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

const actionBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 500,
  color: c.muted,
  background: c.inputBg,
  border: `1px solid ${c.border}`,
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: "system-ui, sans-serif",
  transition: "background 0.2s",
};

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
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h1 style={{ ...sectionHeadingStyle, color: c.accent }}>{t("exportNotes.title")}</h1>
        </div>
      </GuestPreview>
    );
  }

  return (
    <div data-testid="export-notes-page">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <FileText style={{ width: 24, height: 24, color: c.accent }} />
        <h2 style={{ ...sectionHeadingStyle, color: c.accent, margin: 0 }}>
          {t("exportNotes.title")}
        </h2>
      </div>
      <p style={{ fontSize: 12, color: c.muted, marginBottom: 24, lineHeight: 1.5 }}>{t("exportNotes.subtitle")}</p>

      <div style={{ marginBottom: 24 }} className="print:hidden">
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: c.text, marginBottom: 8 }}>
          {t("exportNotes.selectTasting")}
        </label>
        {tastingsLoading ? (
          <div style={{ height: 40, width: 256, background: c.inputBg, borderRadius: 8 }} />
        ) : (
          <select
            value={selectedTastingId || ""}
            onChange={(e) => setSelectedTastingId(e.target.value || undefined)}
            style={{ ...inputStyle, width: "100%", maxWidth: 400 }}
            data-testid="select-tasting-trigger"
          >
            <option value="">{t("exportNotes.selectPlaceholder")}</option>
            {tastings?.map((tasting: any) => (
              <option key={tasting.id} value={String(tasting.id)} data-testid={`select-tasting-item-${tasting.id}`}>
                {tasting.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedTastingId && notesLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 140, background: c.inputBg, borderRadius: 12 }} />
          ))}
        </div>
      )}

      {notesData && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 20 }} className="print:hidden">
            <p style={{ fontSize: 12, color: c.muted }}>
              {t("exportNotes.notesCount", { count: notesData.notes?.length || 0 })}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <button type="button" onClick={handleCopyText} style={actionBtnStyle} data-testid="button-copy-text" title={t("exportNotes.copyText")}>
                <Copy style={{ width: 14, height: 14 }} />
                <span>{t("exportNotes.copyText")}</span>
              </button>
              <button type="button" onClick={handleDownloadWord} disabled={downloading} style={{ ...actionBtnStyle, opacity: downloading ? 0.5 : 1 }} data-testid="button-download-word" title={t("exportNotes.downloadWord")}>
                <FileDown style={{ width: 14, height: 14 }} />
                <span>{t("exportNotes.downloadWord")}</span>
              </button>
              <button type="button" onClick={handlePrint} style={actionBtnStyle} data-testid="button-print" title={t("exportNotes.print")}>
                <Printer style={{ width: 14, height: 14 }} />
                <span>{t("exportNotes.print")}</span>
              </button>
            </div>
          </div>

          <div className="hidden print:block" style={{ marginBottom: 24, textAlign: "center", borderBottom: `1px solid ${c.border}`, paddingBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{notesData.tasting.name}</h2>
            <p style={{ fontSize: 12, color: c.muted }}>{notesData.tasting.date}</p>
            <p style={{ fontSize: 12, color: c.muted }}>{notesData.participant.name}</p>
          </div>

          {notesData.notes?.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 0" }} data-testid="empty-state-no-notes">
              <div style={{ ...cardStyle, maxWidth: 400, width: "100%", textAlign: "center" }}>
                <div style={{ width: 56, height: 56, margin: "0 auto 16px", borderRadius: "50%", background: `${c.accent}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Wine style={{ width: 28, height: 28, color: `${c.accent}90` }} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, fontFamily: "'Playfair Display', serif", color: c.text, marginBottom: 8 }}>{t("exportNotes.empty")}</h3>
                <p style={{ fontSize: 12, color: c.muted }}>{t("exportNotes.emptyHint")}</p>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {notesData.notes?.map((item) => (
                <div
                  key={item.whisky.id}
                  style={cardStyle}
                  data-testid={`card-whisky-note-${item.whisky.id}`}
                >
                  <div style={{ display: "flex", gap: 16 }}>
                    {item.whisky.imageUrl && (
                      <div style={{ width: 56, height: 80, borderRadius: 8, background: c.inputBg, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <img
                          src={item.whisky.imageUrl}
                          alt={item.whisky.name}
                          style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }}
                          data-testid={`img-whisky-${item.whisky.id}`}
                        />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 600, fontFamily: "'Playfair Display', serif", color: c.text }} data-testid={`text-whisky-name-${item.whisky.id}`}>
                        {item.whisky.name}
                      </h3>
                      <p style={{ fontSize: 11, color: c.muted, marginBottom: 12 }}>
                        {[item.whisky.distillery, item.whisky.age ? `${item.whisky.age}y` : null, item.whisky.abv ? `${item.whisky.abv}% ABV` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 12 }}>
                        {(["nose", "taste", "finish", "balance", "overall"] as const).map((dim) => (
                          <div key={dim} style={{ textAlign: "center" }}>
                            <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: c.muted }}>{t(`evaluation.${dim}`)}</p>
                            <p style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: c.accent }} data-testid={`text-score-${dim}-${item.whisky.id}`}>
                              {item.rating[dim]?.toFixed?.(1) ?? item.rating[dim]}
                            </p>
                          </div>
                        ))}
                      </div>

                      {item.rating.notes && (
                        <div style={{ background: c.inputBg, borderRadius: 8, padding: 12 }}>
                          <p style={{ fontSize: 10, color: c.muted, marginBottom: 4, fontWeight: 500 }}>{t("evaluation.notes")}</p>
                          <p style={{ fontSize: 13, color: c.text, lineHeight: 1.6 }} data-testid={`text-notes-${item.whisky.id}`}>
                            {item.rating.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!selectedTastingId && !tastingsLoading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 0" }} data-testid="empty-state-select">
          <div style={{ ...cardStyle, maxWidth: 400, width: "100%", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, margin: "0 auto 16px", borderRadius: "50%", background: `${c.accent}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ClipboardList style={{ width: 28, height: 28, color: `${c.accent}60` }} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, fontFamily: "'Playfair Display', serif", color: c.text, marginBottom: 8 }}>{t("exportNotes.selectPrompt")}</h3>
            <p style={{ fontSize: 12, color: c.muted, marginBottom: 16 }}>{t("exportNotes.selectHint")}</p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <ChevronUp style={{ width: 20, height: 20, color: `${c.muted}50` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { journalApi, journalBottleApi, textExtractApi, wishlistApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, ArrowLeft, Pencil, Trash2, BookOpen, Wine, Calendar, Camera, X, Loader2, ScanLine, ExternalLink, Type, Send } from "lucide-react";
import { TastingNoteGenerator } from "@/components/tasting-note-generator";
import type { JournalEntry } from "@shared/schema";
import { GuestPreview } from "@/components/guest-preview";

type View = "list" | "form" | "detail";

export default function Journal() {
  const { t } = useTranslation();
  const { currentParticipant, wishlistTransfer, setWishlistTransfer } = useAppStore();
  const [view, setView] = useState<View>("list");
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JournalEntry | null>(null);
  const [fromWishlistId, setFromWishlistId] = useState<string | null>(null);

  useEffect(() => {
    if (wishlistTransfer && currentParticipant) {
      setEditingEntry(null);
      setFromWishlistId(wishlistTransfer.wishlistEntryId);
      setView("form");
    }
  }, [wishlistTransfer, currentParticipant]);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["journal", currentParticipant?.id],
    queryFn: () => journalApi.getAll(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);

  const uploadImage = async (participantId: string, entryId: string, file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    const resp = await fetch(`/api/journal/${participantId}/${entryId}/image`, {
      method: "POST",
      body: formData,
    });
    if (!resp.ok) throw new Error("Image upload failed");
    return resp.json();
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const entry = await journalApi.create(currentParticipant!.id, data);
      if (pendingImage && entry.id) {
        await uploadImage(currentParticipant!.id, entry.id, pendingImage);
      }
      if (fromWishlistId && currentParticipant) {
        try {
          await wishlistApi.delete(currentParticipant.id, fromWishlistId);
        } catch {}
      }
      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal"] });
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      setView("list");
      setEditingEntry(null);
      setPendingImage(null);
      setFromWishlistId(null);
      setWishlistTransfer(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      if (removeExistingImage && !pendingImage) {
        data.imageUrl = null;
      }
      const entry = await journalApi.update(currentParticipant!.id, id, data);
      if (pendingImage) {
        await uploadImage(currentParticipant!.id, id, pendingImage);
      }
      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal"] });
      setView("list");
      setEditingEntry(null);
      setPendingImage(null);
      setRemoveExistingImage(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => journalApi.delete(currentParticipant!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal"] });
      setDeleteTarget(null);
      if (selectedEntry?.id === deleteTarget?.id) {
        setSelectedEntry(null);
        setView("list");
      }
    },
  });

  if (!currentParticipant) {
    return (
      <GuestPreview featureTitle={t("journal.title")} featureDescription={t("guestPreview.journal")}>
        <div className="space-y-4">
          <h1 className="text-2xl font-serif font-bold">{t("journal.title")}</h1>
          <div className="space-y-3">
            {[{name: "Ardbeg Uigeadail", date: "Feb 10, 2026", score: "91"}, {name: "Talisker 18", date: "Jan 28, 2026", score: "88"}, {name: "Glendronach 21", date: "Jan 12, 2026", score: "90"}].map(e => (
              <div key={e.name} className="bg-card rounded-xl border p-4 flex items-center justify-between">
                <div><div className="font-serif font-semibold">{e.name}</div><div className="text-sm text-muted-foreground">{e.date}</div></div>
                <div className="text-lg font-serif font-bold text-primary">{e.score}</div>
              </div>
            ))}
          </div>
        </div>
      </GuestPreview>
    );
  }

  const handleNew = () => {
    setEditingEntry(null);
    setPendingImage(null);
    setRemoveExistingImage(false);
    setView("form");
  };

  const handleEdit = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setPendingImage(null);
    setRemoveExistingImage(false);
    setView("form");
  };

  const handleView = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setView("detail");
  };

  const handleBack = () => {
    setView("list");
    setEditingEntry(null);
    setSelectedEntry(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 min-w-0 overflow-x-hidden" data-testid="journal-page">
      <AnimatePresence mode="wait">
        {view === "list" && (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-journal-title">
                  {t("journal.title")}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">{t("journal.subtitle")}</p>
              </div>
              <Button
                onClick={handleNew}
                className="bg-primary text-primary-foreground font-serif"
                data-testid="button-new-journal-entry"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("journal.newEntry")}
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-card/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-20">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground font-serif" data-testid="text-journal-empty">
                  {t("journal.empty")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...entries].reverse().map((entry: JournalEntry) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border/40 rounded-lg p-5 cursor-pointer hover:border-primary/30 transition-colors group"
                    onClick={() => handleView(entry)}
                    data-testid={`card-journal-entry-${entry.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {entry.imageUrl && (
                        <div className="w-12 h-16 rounded overflow-hidden border border-border/30 bg-secondary/30 flex-shrink-0">
                          <img src={entry.imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif font-semibold text-foreground truncate">
                          {entry.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {entry.whiskyName && (
                            <span className="flex items-center gap-1">
                              <Wine className="w-3 h-3" />
                              {entry.whiskyName}
                            </span>
                          )}
                          {entry.createdAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(entry.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {entry.body && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {entry.body}
                          </p>
                        )}
                      </div>
                      {entry.personalScore != null && (
                        <div className="flex-shrink-0 text-right">
                          <div className="text-xl font-bold text-primary font-serif">
                            {entry.personalScore.toFixed(1)}
                          </div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Score</div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {view === "detail" && selectedEntry && (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <EntryDetail
              entry={selectedEntry}
              onBack={handleBack}
              onEdit={() => handleEdit(selectedEntry)}
              onDelete={() => setDeleteTarget(selectedEntry)}
              t={t}
            />
          </motion.div>
        )}

        {view === "form" && (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <EntryForm
              entry={editingEntry}
              onBack={() => {
                handleBack();
                if (wishlistTransfer) {
                  setFromWishlistId(null);
                  setWishlistTransfer(null);
                }
              }}
              onSave={(data) => {
                if (editingEntry) {
                  updateMutation.mutate({ id: editingEntry.id, data });
                } else {
                  createMutation.mutate(data);
                }
              }}
              isSaving={createMutation.isPending || updateMutation.isPending}
              pendingImage={pendingImage}
              onImageChange={setPendingImage}
              removeExistingImage={removeExistingImage}
              onRemoveExistingImage={setRemoveExistingImage}
              participantId={currentParticipant?.id}
              t={t}
              prefill={wishlistTransfer ? {
                whiskyName: wishlistTransfer.whiskyName,
                distillery: wishlistTransfer.distillery,
                region: wishlistTransfer.region,
                age: wishlistTransfer.age,
                abv: wishlistTransfer.abv,
                caskType: wishlistTransfer.caskType,
              } : undefined}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border" data-testid="dialog-delete-journal">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">{t("journal.deleteEntry")}</AlertDialogTitle>
            <AlertDialogDescription>{t("journal.deleteConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-journal">{t("journal.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-journal"
            >
              {t("journal.deleteEntry")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EntryDetail({
  entry,
  onBack,
  onEdit,
  onDelete,
  t,
}: {
  entry: JournalEntry;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  t: (key: string) => string;
}) {
  const metaItems = [
    entry.distillery && { label: t("journal.distillery"), value: entry.distillery },
    entry.region && { label: t("journal.region"), value: entry.region },
    entry.age && { label: t("journal.age"), value: entry.age },
    entry.abv && { label: t("journal.abv"), value: entry.abv },
    entry.caskType && { label: t("journal.caskType"), value: entry.caskType },
  ].filter(Boolean) as { label: string; value: string }[];

  const tastingNotes = [
    entry.noseNotes && { label: t("journal.noseNotes"), value: entry.noseNotes },
    entry.tasteNotes && { label: t("journal.tasteNotes"), value: entry.tasteNotes },
    entry.finishNotes && { label: t("journal.finishNotes"), value: entry.finishNotes },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div data-testid="journal-entry-detail">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
          data-testid="button-back-to-journal"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("journal.back")}
        </button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit} data-testid="button-edit-journal-entry">
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            {t("journal.editEntry")}
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive" data-testid="button-delete-journal-entry">
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            {t("journal.deleteEntry")}
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border/40 rounded-lg p-6 md:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          {entry.imageUrl && (
            <div className="w-20 h-28 md:w-24 md:h-32 rounded-lg overflow-hidden border border-border/40 bg-secondary/30 flex-shrink-0">
              <img src={entry.imageUrl} alt={entry.whiskyName || entry.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-primary">{entry.title}</h1>
            {entry.whiskyName && (
              <p className="text-lg text-foreground/80 font-serif mt-1">{entry.whiskyName}</p>
            )}
          </div>
          {entry.personalScore != null && (
            <div className="text-right flex-shrink-0">
              <div className="text-3xl font-bold text-primary font-serif">{entry.personalScore.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{t("journal.personalScore")}</div>
            </div>
          )}
        </div>

        {metaItems.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {metaItems.map((item, i) => (
              <div key={i} className="bg-secondary/50 rounded px-3 py-1.5 text-sm">
                <span className="text-muted-foreground">{item.label}: </span>
                <span className="text-foreground font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        )}

        {tastingNotes.length > 0 && (
          <div className="space-y-4 border-t border-border/30 pt-6">
            {tastingNotes.map((note, i) => (
              <div key={i}>
                <h3 className="text-sm font-semibold text-primary/80 uppercase tracking-wider mb-1">
                  {note.label}
                </h3>
                <p className="text-foreground/80 font-serif leading-relaxed">{note.value}</p>
              </div>
            ))}
          </div>
        )}

        {entry.body && (
          <div className="border-t border-border/30 pt-6">
            <h3 className="text-sm font-semibold text-primary/80 uppercase tracking-wider mb-2">
              {t("journal.body")}
            </h3>
            <p className="text-foreground/80 font-serif leading-relaxed whitespace-pre-wrap">{entry.body}</p>
          </div>
        )}

        {(entry.mood || entry.occasion) && (
          <div className="border-t border-border/30 pt-6 flex flex-wrap gap-4 text-sm">
            {entry.mood && (
              <div>
                <span className="text-muted-foreground">{t("journal.mood")}: </span>
                <span className="text-foreground italic">{entry.mood}</span>
              </div>
            )}
            {entry.occasion && (
              <div>
                <span className="text-muted-foreground">{t("journal.occasion")}: </span>
                <span className="text-foreground italic">{entry.occasion}</span>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-border/30 pt-4 text-xs text-muted-foreground flex gap-4">
          {entry.createdAt && (
            <span>{t("journal.created")}: {new Date(entry.createdAt).toLocaleString()}</span>
          )}
          {entry.updatedAt && entry.updatedAt !== entry.createdAt && (
            <span>{t("journal.updated")}: {new Date(entry.updatedAt).toLocaleString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function EntryForm({
  entry,
  onBack,
  onSave,
  isSaving,
  pendingImage,
  onImageChange,
  removeExistingImage,
  onRemoveExistingImage,
  participantId,
  t,
  prefill,
}: {
  entry: JournalEntry | null;
  onBack: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
  pendingImage: File | null;
  onImageChange: (file: File | null) => void;
  removeExistingImage: boolean;
  onRemoveExistingImage: (v: boolean) => void;
  participantId: string | undefined;
  t: (key: string) => string;
  prefill?: {
    whiskyName?: string;
    distillery?: string;
    region?: string;
    age?: string;
    abv?: string;
    caskType?: string;
  };
}) {
  const [form, setForm] = useState({
    title: entry?.title || prefill?.whiskyName || "",
    whiskyName: entry?.whiskyName || prefill?.whiskyName || "",
    distillery: entry?.distillery || prefill?.distillery || "",
    region: entry?.region || prefill?.region || "",
    age: entry?.age || prefill?.age || "",
    abv: entry?.abv || prefill?.abv || "",
    caskType: entry?.caskType || prefill?.caskType || "",
    noseNotes: entry?.noseNotes || "",
    tasteNotes: entry?.tasteNotes || "",
    finishNotes: entry?.finishNotes || "",
    personalScore: entry?.personalScore ?? "",
    mood: entry?.mood || "",
    occasion: entry?.occasion || "",
    body: entry?.body || "",
  });
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState("");
  const [showTextExtract, setShowTextExtract] = useState(false);
  const [extractText, setExtractText] = useState("");
  const [extracting, setExtracting] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = { title: form.title };
    if (form.whiskyName) data.whiskyName = form.whiskyName;
    if (form.distillery) data.distillery = form.distillery;
    if (form.region) data.region = form.region;
    if (form.age) data.age = form.age;
    if (form.abv) data.abv = form.abv;
    if (form.caskType) data.caskType = form.caskType;
    if (form.noseNotes) data.noseNotes = form.noseNotes;
    if (form.tasteNotes) data.tasteNotes = form.tasteNotes;
    if (form.finishNotes) data.finishNotes = form.finishNotes;
    if (form.personalScore !== "") data.personalScore = parseFloat(String(form.personalScore));
    if (form.mood) data.mood = form.mood;
    if (form.occasion) data.occasion = form.occasion;
    if (form.body) data.body = form.body;
    onSave(data);
  };

  return (
    <div data-testid="journal-entry-form">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
          data-testid="button-back-from-form"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("journal.back")}
        </button>
        <h2 className="text-xl font-serif font-bold text-primary">
          {entry ? t("journal.editEntry") : t("journal.newEntry")}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border/40 rounded-lg p-6 md:p-8 space-y-6">
        <div>
          <Label htmlFor="title" className="font-serif text-sm font-semibold">{t("journal.entryTitle")} *</Label>
          <Input
            id="title"
            value={form.title}
            onChange={set("title")}
            placeholder={t("journal.entryTitlePlaceholder")}
            required
            className="mt-1.5 bg-background/50"
            data-testid="input-journal-title"
          />
        </div>

        <div className="border-t border-border/30 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-primary/80 uppercase tracking-wider">Whisky</h3>
            <label
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                scanning
                  ? "bg-primary/20 text-primary"
                  : "bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground"
              }`}
              data-testid="button-scan-bottle"
            >
              {scanning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t("journal.scanning")}
                </>
              ) : (
                <>
                  <ScanLine className="w-3.5 h-3.5" />
                  {t("journal.scanBottle")}
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={scanning}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file || !participantId) return;
                  setScanning(true);
                  setScanError("");
                  setScanResult(null);
                  try {
                    const result = await journalBottleApi.identify(file, participantId);
                    const whiskies = result.whiskies || (result.whiskyName ? [result] : []);
                    if (whiskies.length === 0) {
                      setScanError(t("journal.scanFailed"));
                    } else if (whiskies.length === 1) {
                      const w = whiskies[0];
                      setScanResult(w);
                      setForm(prev => ({
                        ...prev,
                        whiskyName: w.whiskyName || prev.whiskyName,
                        distillery: w.distillery || prev.distillery,
                        region: w.region || prev.region,
                        age: w.age || prev.age,
                        abv: w.abv || prev.abv,
                        caskType: w.caskType || prev.caskType,
                        title: prev.title || w.whiskyName || prev.title,
                      }));
                    } else {
                      setScanResult({ multipleWhiskies: whiskies });
                    }
                    onImageChange(file);
                  } catch (err: any) {
                    setScanError(err.message || "Scan failed");
                  } finally {
                    setScanning(false);
                  }
                }}
              />
            </label>
          </div>

          {scanError && (
            <div className="mb-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {scanError}
            </div>
          )}

          {scanResult && !scanResult.multipleWhiskies && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-lg px-3 py-2 text-xs text-green-700 dark:text-green-400 flex items-center justify-between gap-2"
            >
              <span className="flex items-center gap-1.5">
                <ScanLine className="w-3.5 h-3.5" />
                {t("journal.scanSuccess", { name: scanResult.whiskyName || "Unknown Whisky" })}
              </span>
              {scanResult.whiskybaseUrl && scanResult.whiskybaseUrl.startsWith("http") ? (
                <a
                  href={scanResult.whiskybaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:underline shrink-0"
                >
                  Whiskybase <ExternalLink className="w-3 h-3" />
                </a>
              ) : scanResult.whiskybaseSearch && scanResult.whiskybaseSearch.trim() ? (
                <a
                  href={`https://www.whiskybase.com/search?q=${encodeURIComponent(scanResult.whiskybaseSearch)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:underline shrink-0"
                >
                  {t("journal.searchWhiskybase")} <ExternalLink className="w-3 h-3" />
                </a>
              ) : null}
            </motion.div>
          )}

          {scanResult?.multipleWhiskies && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-lg p-3"
            >
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-1.5">
                <ScanLine className="w-3.5 h-3.5" />
                {t("journal.multipleFound", { count: scanResult.multipleWhiskies.length })}
              </p>
              <div className="space-y-1.5">
                {scanResult.multipleWhiskies.map((w: any, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    data-testid={`button-select-scan-whisky-${idx}`}
                    onClick={() => {
                      setScanResult(w);
                      setForm(prev => ({
                        ...prev,
                        whiskyName: w.whiskyName || prev.whiskyName,
                        distillery: w.distillery || prev.distillery,
                        region: w.region || prev.region,
                        age: w.age || prev.age,
                        abv: w.abv || prev.abv,
                        caskType: w.caskType || prev.caskType,
                        title: prev.title || w.whiskyName || prev.title,
                      }));
                    }}
                    className="w-full text-left px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-blue-100 dark:border-blue-800/50 hover:border-blue-400 dark:hover:border-blue-600 transition-colors text-xs"
                  >
                    <span className="font-medium text-foreground">{w.whiskyName || "Unknown Whisky"}</span>
                    {(w.distillery || w.age || w.region) && (
                      <span className="text-muted-foreground ml-1.5">
                        {[w.distillery, w.age ? `${w.age}y` : null, w.region].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <div className="flex items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => setShowTextExtract(!showTextExtract)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                showTextExtract
                  ? "bg-primary/20 text-primary"
                  : "bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground"
              }`}
              data-testid="button-text-extract-journal"
            >
              <Type className="w-3.5 h-3.5" />
              {t("journal.extractText")}
            </button>
          </div>

          {showTextExtract && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3 bg-secondary/20 border border-border/30 rounded-lg"
            >
              <p className="text-xs text-muted-foreground mb-2">{t("journal.extractHint")}</p>
              <Textarea
                value={extractText}
                onChange={(e) => setExtractText(e.target.value)}
                placeholder={t("journal.textPlaceholder")}
                rows={3}
                className="bg-background/50 text-sm mb-2"
                data-testid="textarea-extract-journal"
              />
              <button
                type="button"
                disabled={extracting || extractText.trim().length < 3}
                onClick={async () => {
                  if (!participantId || extractText.trim().length < 3) return;
                  setExtracting(true);
                  setScanError("");
                  try {
                    const result = await textExtractApi.extract(extractText.trim(), participantId);
                    if (result.whiskyName && result.whiskyName !== "Unknown Whisky") {
                      setScanResult(result);
                      setForm(prev => ({
                        ...prev,
                        whiskyName: result.whiskyName || prev.whiskyName,
                        distillery: result.distillery || prev.distillery,
                        region: result.region || prev.region,
                        age: result.age || prev.age,
                        abv: result.abv || prev.abv,
                        caskType: result.caskType || prev.caskType,
                        title: prev.title || result.whiskyName || prev.title,
                      }));
                      setShowTextExtract(false);
                      setExtractText("");
                    } else {
                      setScanError(t("journal.scanFailed"));
                    }
                  } catch (err: any) {
                    setScanError(err.message || t("journal.scanFailed"));
                  } finally {
                    setExtracting(false);
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  extracting ? "bg-primary/20 text-primary" : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
                data-testid="button-extract-submit-journal"
              >
                {extracting ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("journal.extracting")}</>
                ) : (
                  <><Send className="w-3.5 h-3.5" /> {t("journal.extractButton")}</>
                )}
              </button>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="whiskyName" className="text-sm">{t("journal.whiskyName")}</Label>
              <Input id="whiskyName" value={form.whiskyName} onChange={set("whiskyName")} placeholder={t("journal.whiskyNamePlaceholder")} className="mt-1 bg-background/50" data-testid="input-journal-whisky-name" />
            </div>
            <div>
              <Label htmlFor="distillery" className="text-sm">{t("journal.distillery")}</Label>
              <Input id="distillery" value={form.distillery} onChange={set("distillery")} placeholder={t("journal.distilleryPlaceholder")} className="mt-1 bg-background/50" data-testid="input-journal-distillery" />
            </div>
            <div>
              <Label htmlFor="region" className="text-sm">{t("journal.region")}</Label>
              <Input id="region" value={form.region} onChange={set("region")} placeholder={t("journal.regionPlaceholder")} className="mt-1 bg-background/50" data-testid="input-journal-region" />
            </div>
            <div>
              <Label htmlFor="age" className="text-sm">{t("journal.age")}</Label>
              <Input id="age" value={form.age} onChange={set("age")} placeholder={t("journal.agePlaceholder")} className="mt-1 bg-background/50" data-testid="input-journal-age" />
            </div>
            <div>
              <Label htmlFor="abv" className="text-sm">{t("journal.abv")}</Label>
              <Input id="abv" value={form.abv} onChange={set("abv")} placeholder={t("journal.abvPlaceholder")} className="mt-1 bg-background/50" data-testid="input-journal-abv" />
            </div>
            <div>
              <Label htmlFor="caskType" className="text-sm">{t("journal.caskType")}</Label>
              <Input id="caskType" value={form.caskType} onChange={set("caskType")} placeholder={t("journal.caskTypePlaceholder")} className="mt-1 bg-background/50" data-testid="input-journal-cask-type" />
            </div>
          </div>
        </div>

        <div className="border-t border-border/30 pt-6">
          <h3 className="text-sm font-semibold text-primary/80 uppercase tracking-wider mb-4">
            {t("journal.bottlePhoto")}
          </h3>
          <div className="flex items-start gap-4">
            {(pendingImage || (entry?.imageUrl && !removeExistingImage)) && (
              <div className="relative w-24 h-32 rounded-lg overflow-hidden border border-border/40 bg-secondary/30 flex-shrink-0">
                <img
                  src={pendingImage ? URL.createObjectURL(pendingImage) : entry!.imageUrl!}
                  alt="Bottle"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (pendingImage) {
                      onImageChange(null);
                    } else {
                      onRemoveExistingImage(true);
                    }
                  }}
                  className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80 hover:bg-background transition-colors"
                  data-testid="button-remove-journal-image"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            )}
            <label
              className="flex flex-col items-center justify-center w-24 h-32 rounded-lg border-2 border-dashed border-border/50 hover:border-primary/40 cursor-pointer transition-colors bg-secondary/20"
              data-testid="button-upload-journal-image"
            >
              <Camera className="w-5 h-5 text-muted-foreground mb-1" />
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                {t("journal.addPhoto")}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  onImageChange(file);
                  if (participantId && !form.whiskyName) {
                    setScanning(true);
                    setScanError("");
                    setScanResult(null);
                    try {
                      const result = await journalBottleApi.identify(file, participantId);
                      const whiskies = result.whiskies || (result.whiskyName ? [result] : []);
                      if (whiskies.length === 0) {
                        setScanError(t("journal.scanFailed"));
                      } else if (whiskies.length === 1) {
                        const w = whiskies[0];
                        setScanResult(w);
                        setForm(prev => ({
                          ...prev,
                          whiskyName: w.whiskyName || prev.whiskyName,
                          distillery: w.distillery || prev.distillery,
                          region: w.region || prev.region,
                          age: w.age || prev.age,
                          abv: w.abv || prev.abv,
                          caskType: w.caskType || prev.caskType,
                          title: prev.title || w.whiskyName || prev.title,
                        }));
                      } else {
                        setScanResult({ multipleWhiskies: whiskies });
                      }
                    } catch (err: any) {
                      setScanError(err.message || t("journal.scanFailed"));
                    } finally {
                      setScanning(false);
                    }
                  }
                }}
              />
            </label>
          </div>
        </div>

        <div className="border-t border-border/30 pt-6">
          <h3 className="text-sm font-semibold text-primary/80 uppercase tracking-wider mb-4">
            {t("journal.noseNotes")} / {t("journal.tasteNotes")} / {t("journal.finishNotes")}
          </h3>

          <div className="mb-5 bg-secondary/20 rounded-lg border border-border/30 p-3">
            <TastingNoteGenerator
              currentNotes={[form.noseNotes, form.tasteNotes, form.finishNotes].filter(Boolean).join(" ")}
              onInsertNote={(note: string) => {
                const nosePatterns = [/^On the nose:?\s*/i, /^The aroma presents:?\s*/i, /^Nose:?\s*/i, /^In der Nase:?\s*/i, /^Das Aroma zeigt:?\s*/i, /^Nase:?\s*/i];
                const palatePatterns = [/^On the palate:?\s*/i, /^The taste reveals:?\s*/i, /^Palate:?\s*/i, /^Am Gaumen:?\s*/i, /^Der Geschmack offenbart:?\s*/i, /^Gaumen:?\s*/i];
                const finishPatterns = [/^The finish is:?\s*/i, /^Finish:?\s*/i, /^It finishes with:?\s*/i, /^Der Abgang ist:?\s*/i, /^Abgang:?\s*/i, /^Er endet mit:?\s*/i];

                const sentences = note.split(/(?<=\.)\s+|\n+/).map(s => s.trim()).filter(Boolean);
                let nosePart = "";
                let palatePart = "";
                let finishPart = "";

                for (const s of sentences) {
                  if (nosePatterns.some(p => p.test(s))) {
                    let cleaned = s;
                    for (const p of nosePatterns) cleaned = cleaned.replace(p, "");
                    nosePart = cleaned.replace(/\.$/, "").trim();
                  } else if (palatePatterns.some(p => p.test(s))) {
                    let cleaned = s;
                    for (const p of palatePatterns) cleaned = cleaned.replace(p, "");
                    palatePart = cleaned.replace(/\.$/, "").trim();
                  } else if (finishPatterns.some(p => p.test(s))) {
                    let cleaned = s;
                    for (const p of finishPatterns) cleaned = cleaned.replace(p, "");
                    finishPart = cleaned.replace(/\.$/, "").trim();
                  }
                }

                setForm(prev => ({
                  ...prev,
                  noseNotes: nosePart ? (prev.noseNotes ? `${prev.noseNotes}, ${nosePart}` : nosePart) : prev.noseNotes,
                  tasteNotes: palatePart ? (prev.tasteNotes ? `${prev.tasteNotes}, ${palatePart}` : palatePart) : prev.tasteNotes,
                  finishNotes: finishPart ? (prev.finishNotes ? `${prev.finishNotes}, ${finishPart}` : finishPart) : prev.finishNotes,
                }));
              }}
            />
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="noseNotes" className="text-sm">{t("journal.noseNotes")}</Label>
              <Textarea id="noseNotes" value={form.noseNotes} onChange={set("noseNotes")} placeholder={t("journal.noseNotesPlaceholder")} className="mt-1 bg-background/50 min-h-[80px]" data-testid="input-journal-nose" />
            </div>
            <div>
              <Label htmlFor="tasteNotes" className="text-sm">{t("journal.tasteNotes")}</Label>
              <Textarea id="tasteNotes" value={form.tasteNotes} onChange={set("tasteNotes")} placeholder={t("journal.tasteNotesPlaceholder")} className="mt-1 bg-background/50 min-h-[80px]" data-testid="input-journal-taste" />
            </div>
            <div>
              <Label htmlFor="finishNotes" className="text-sm">{t("journal.finishNotes")}</Label>
              <Textarea id="finishNotes" value={form.finishNotes} onChange={set("finishNotes")} placeholder={t("journal.finishNotesPlaceholder")} className="mt-1 bg-background/50 min-h-[80px]" data-testid="input-journal-finish" />
            </div>
          </div>
        </div>

        <div className="border-t border-border/30 pt-6">
          <div>
            <Label htmlFor="personalScore" className="text-sm font-semibold">{t("journal.personalScore")} (0–100)</Label>
            <Input
              id="personalScore"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={form.personalScore}
              onChange={set("personalScore")}
              className="mt-1 bg-background/50 w-32"
              data-testid="input-journal-score"
            />
          </div>
        </div>

        <div className="border-t border-border/30 pt-6">
          <h3 className="text-sm font-semibold text-primary/80 uppercase tracking-wider mb-4">{t("journal.body")}</h3>
          <Textarea
            value={form.body}
            onChange={set("body")}
            placeholder={t("journal.bodyPlaceholder")}
            className="bg-background/50 min-h-[120px]"
            data-testid="input-journal-body"
          />
        </div>

        <div className="border-t border-border/30 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="mood" className="text-sm">{t("journal.mood")}</Label>
            <Input id="mood" value={form.mood} onChange={set("mood")} placeholder={t("journal.moodPlaceholder")} className="mt-1 bg-background/50" data-testid="input-journal-mood" />
          </div>
          <div>
            <Label htmlFor="occasion" className="text-sm">{t("journal.occasion")}</Label>
            <Input id="occasion" value={form.occasion} onChange={set("occasion")} placeholder={t("journal.occasionPlaceholder")} className="mt-1 bg-background/50" data-testid="input-journal-occasion" />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <Button
            type="submit"
            disabled={!form.title.trim() || isSaving}
            className="bg-primary text-primary-foreground font-serif"
            data-testid="button-save-journal-entry"
          >
            {t("journal.save")}
          </Button>
          <Button type="button" variant="outline" onClick={onBack} data-testid="button-cancel-journal">
            {t("journal.cancel")}
          </Button>
        </div>
      </form>
    </div>
  );
}

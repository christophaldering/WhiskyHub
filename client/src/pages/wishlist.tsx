import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { wishlistApi } from "@/lib/api";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, ArrowLeft, Pencil, Trash2, Star, Wine, Calendar, Flame, Sparkles, Clock, Camera, Loader2, ScanLine } from "lucide-react";
import { wishlistScanApi } from "@/lib/api";
import type { WishlistEntry } from "@shared/schema";

type View = "list" | "form";

const PRIORITY_CONFIG = {
  high: { label: "priorityHigh", icon: Flame, color: "text-red-400 bg-red-500/10 border-red-500/20" },
  medium: { label: "priorityMedium", icon: Sparkles, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  low: { label: "priorityLow", icon: Clock, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
};

export default function Wishlist() {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const [view, setView] = useState<View>("list");
  const [editingEntry, setEditingEntry] = useState<WishlistEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WishlistEntry | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["wishlist", currentParticipant?.id],
    queryFn: () => wishlistApi.getAll(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => wishlistApi.create(currentParticipant!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      setView("list");
      setEditingEntry(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      wishlistApi.update(currentParticipant!.id, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      setView("list");
      setEditingEntry(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => wishlistApi.delete(currentParticipant!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      setDeleteTarget(null);
    },
  });

  if (!currentParticipant) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground font-serif" data-testid="text-wishlist-login-required">
          {t("wishlist.loginRequired")}
        </p>
      </div>
    );
  }

  const handleNew = () => {
    setEditingEntry(null);
    setView("form");
  };

  const handleEdit = (entry: WishlistEntry) => {
    setEditingEntry(entry);
    setView("form");
  };

  const handleBack = () => {
    setView("list");
    setEditingEntry(null);
  };

  const sortedEntries = [...entries].sort((a: WishlistEntry, b: WishlistEntry) => {
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const pa = priorityOrder[a.priority || "medium"] ?? 1;
    const pb = priorityOrder[b.priority || "medium"] ?? 1;
    if (pa !== pb) return pa - pb;
    return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" data-testid="wishlist-page">
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
                <h1 className="text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-wishlist-title">
                  {t("wishlist.title")}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {entries.length > 0
                    ? t("wishlist.total", { count: entries.length })
                    : t("wishlist.subtitle")}
                </p>
              </div>
              <Button
                onClick={handleNew}
                className="bg-primary text-primary-foreground font-serif"
                data-testid="button-add-wishlist"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("wishlist.addWhisky")}
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-card/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-20">
                <Star className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground font-serif" data-testid="text-wishlist-empty">
                  {t("wishlist.empty")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedEntries.map((entry: WishlistEntry) => {
                  const prio = PRIORITY_CONFIG[entry.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
                  const PrioIcon = prio.icon;
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-card border border-border/40 rounded-lg p-5 hover:border-primary/30 transition-colors group"
                      data-testid={`card-wishlist-entry-${entry.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-serif font-semibold text-foreground truncate">
                              {entry.whiskyName}
                            </h3>
                            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium uppercase tracking-wider ${prio.color}`}>
                              <PrioIcon className="w-3 h-3" />
                              {t(`wishlist.${prio.label}`)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            {entry.distillery && (
                              <span className="flex items-center gap-1">
                                <Wine className="w-3 h-3" />
                                {entry.distillery}
                              </span>
                            )}
                            {entry.region && <span>{entry.region}</span>}
                            {entry.age && <span>{entry.age}y</span>}
                            {entry.abv && <span>{entry.abv}</span>}
                            {entry.caskType && <span>{entry.caskType}</span>}
                          </div>
                          {entry.notes && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {entry.notes}
                            </p>
                          )}
                          {entry.source && (
                            <p className="text-xs text-muted-foreground/70 mt-1 italic">
                              {entry.source}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(entry)}
                            data-testid={`button-edit-wishlist-${entry.id}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(entry)}
                            data-testid={`button-delete-wishlist-${entry.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
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
            <WishlistForm
              entry={editingEntry}
              onBack={handleBack}
              onSave={(data) => {
                if (editingEntry) {
                  updateMutation.mutate({ id: editingEntry.id, data });
                } else {
                  createMutation.mutate(data);
                }
              }}
              isSaving={createMutation.isPending || updateMutation.isPending}
              participantId={currentParticipant?.id}
              t={t}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border" data-testid="dialog-delete-wishlist">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">{t("wishlist.deleteEntry")}</AlertDialogTitle>
            <AlertDialogDescription>{t("wishlist.deleteConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-wishlist">{t("wishlist.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-wishlist"
            >
              {t("wishlist.deleteEntry")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function WishlistForm({
  entry,
  onBack,
  onSave,
  isSaving,
  participantId,
  t,
}: {
  entry: WishlistEntry | null;
  onBack: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
  participantId?: string;
  t: any;
}) {
  const [whiskyName, setWhiskyName] = useState(entry?.whiskyName || "");
  const [distillery, setDistillery] = useState(entry?.distillery || "");
  const [region, setRegion] = useState(entry?.region || "");
  const [age, setAge] = useState(entry?.age || "");
  const [abv, setAbv] = useState(entry?.abv || "");
  const [caskType, setCaskType] = useState(entry?.caskType || "");
  const [notes, setNotes] = useState(entry?.notes || "");
  const [priority, setPriority] = useState(entry?.priority || "medium");
  const [source, setSource] = useState(entry?.source || "");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whiskyName.trim()) return;
    onSave({
      whiskyName: whiskyName.trim(),
      distillery: distillery.trim() || null,
      region: region.trim() || null,
      age: age.trim() || null,
      abv: abv.trim() || null,
      caskType: caskType.trim() || null,
      notes: notes.trim() || null,
      priority,
      source: source.trim() || null,
    });
  };

  return (
    <div>
      <Button
        variant="ghost"
        className="mb-6 font-serif"
        onClick={onBack}
        data-testid="button-back-wishlist"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t("wishlist.back")}
      </Button>

      <h2 className="text-xl font-serif font-bold text-primary mb-6" data-testid="text-wishlist-form-title">
        {entry ? t("wishlist.editEntry") : t("wishlist.addWhisky")}
      </h2>

      <div className="mb-6 p-4 bg-secondary/20 border border-border/30 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">{t("wishlist.scanHint")}</p>
        </div>
        <label
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all ${
            scanning
              ? "bg-primary/20 text-primary"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
          data-testid="button-scan-wishlist"
        >
          {scanning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("wishlist.scanning")}
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" />
              {t("wishlist.scanPhoto")}
            </>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            disabled={scanning}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file || !participantId) return;
              setScanning(true);
              setScanError("");
              try {
                const result = await wishlistScanApi.identify(file, participantId);
                if (result.whiskyName && result.whiskyName !== "Unknown Whisky") {
                  setWhiskyName(result.whiskyName);
                  if (result.distillery) setDistillery(result.distillery);
                  if (result.region) setRegion(result.region);
                  if (result.age) setAge(result.age);
                  if (result.abv) setAbv(result.abv);
                  if (result.caskType) setCaskType(result.caskType);
                  if (result.notes && !notes) setNotes(result.notes);
                  if (result.source && !source) setSource(result.source);
                } else {
                  setScanError(t("wishlist.scanFailed"));
                }
              } catch (err: any) {
                setScanError(err.message || t("wishlist.scanFailed"));
              } finally {
                setScanning(false);
              }
            }}
          />
        </label>
        {scanError && (
          <div className="mt-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {scanError}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" data-testid="form-wishlist">
        <div>
          <Label className="font-serif text-sm">{t("wishlist.whiskyName")} *</Label>
          <Input
            value={whiskyName}
            onChange={(e) => setWhiskyName(e.target.value)}
            placeholder={t("wishlist.whiskyNamePlaceholder")}
            className="mt-1 bg-secondary/30"
            required
            data-testid="input-wishlist-name"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="font-serif text-sm">{t("wishlist.distillery")}</Label>
            <Input
              value={distillery}
              onChange={(e) => setDistillery(e.target.value)}
              placeholder={t("wishlist.distilleryPlaceholder")}
              className="mt-1 bg-secondary/30"
              data-testid="input-wishlist-distillery"
            />
          </div>
          <div>
            <Label className="font-serif text-sm">{t("wishlist.region")}</Label>
            <Input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder={t("wishlist.regionPlaceholder")}
              className="mt-1 bg-secondary/30"
              data-testid="input-wishlist-region"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className="font-serif text-sm">{t("wishlist.age")}</Label>
            <Input
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder={t("wishlist.agePlaceholder")}
              className="mt-1 bg-secondary/30"
              data-testid="input-wishlist-age"
            />
          </div>
          <div>
            <Label className="font-serif text-sm">{t("wishlist.abv")}</Label>
            <Input
              value={abv}
              onChange={(e) => setAbv(e.target.value)}
              placeholder={t("wishlist.abvPlaceholder")}
              className="mt-1 bg-secondary/30"
              data-testid="input-wishlist-abv"
            />
          </div>
          <div>
            <Label className="font-serif text-sm">{t("wishlist.caskType")}</Label>
            <Input
              value={caskType}
              onChange={(e) => setCaskType(e.target.value)}
              placeholder={t("wishlist.caskTypePlaceholder")}
              className="mt-1 bg-secondary/30"
              data-testid="input-wishlist-cask"
            />
          </div>
        </div>

        <div>
          <Label className="font-serif text-sm">{t("wishlist.priority")}</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="mt-1 bg-secondary/30" data-testid="select-wishlist-priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">
                <span className="flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                  {t("wishlist.priorityHigh")}
                </span>
              </SelectItem>
              <SelectItem value="medium">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  {t("wishlist.priorityMedium")}
                </span>
              </SelectItem>
              <SelectItem value="low">
                <span className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  {t("wishlist.priorityLow")}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="font-serif text-sm">{t("wishlist.source")}</Label>
          <Input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder={t("wishlist.sourcePlaceholder")}
            className="mt-1 bg-secondary/30"
            data-testid="input-wishlist-source"
          />
        </div>

        <div>
          <Label className="font-serif text-sm">{t("wishlist.notes")}</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("wishlist.notesPlaceholder")}
            rows={3}
            className="mt-1 bg-secondary/30"
            data-testid="input-wishlist-notes"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={isSaving || !whiskyName.trim()}
            className="bg-primary text-primary-foreground font-serif"
            data-testid="button-save-wishlist"
          >
            {t("wishlist.save")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="font-serif"
            data-testid="button-cancel-wishlist"
          >
            {t("wishlist.cancel")}
          </Button>
        </div>
      </form>
    </div>
  );
}

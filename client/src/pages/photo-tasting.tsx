import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useState, useCallback } from "react";
import { Camera, Upload, Loader2, Check, AlertTriangle, X, Wine, Plus, Trash2, Edit2, CheckCircle2, Database, ArrowRight, ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { tastingApi, photoTastingApi } from "@/lib/api";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

type IdentifiedWhisky = {
  name: string;
  distillery?: string | null;
  region?: string | null;
  country?: string | null;
  age?: string | null;
  abv?: number | null;
  type?: string | null;
  category?: string | null;
  caskInfluence?: string | null;
  peatLevel?: string | null;
  notes?: string | null;
  confidence?: string;
  dbMatch?: boolean;
  benchmarkMatch?: boolean;
  whiskybaseSearch?: string | null;
  whiskybaseUrl?: string | null;
  fileName?: string;
  selected: boolean;
  editing: boolean;
};

export default function PhotoTasting() {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: allTastings = [] } = useQuery({
    queryKey: ["tastings"],
    queryFn: () => tastingApi.getAll(),
    enabled: !!currentParticipant,
  });

  const isHost = currentParticipant && allTastings.some((t: any) => t.hostId === currentParticipant.id);
  const isAdmin = currentParticipant?.role === "admin";
  const hasAccess = isHost || isAdmin;

  const [step, setStep] = useState<"upload" | "review" | "details" | "done">("upload");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [whiskies, setWhiskies] = useState<IdentifiedWhisky[]>([]);
  const [creating, setCreating] = useState(false);

  const [tastingTitle, setTastingTitle] = useState("");
  const [tastingDate, setTastingDate] = useState(new Date().toISOString().split("T")[0]);
  const [tastingLocation, setTastingLocation] = useState("");

  const handlePhotosSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setPhotos(prev => [...prev, ...files]);
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setPreviews(prev => [...prev, ...newPreviews]);
  }, []);

  const removePhoto = useCallback((index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (photos.length === 0 || !currentParticipant) return;
    setAnalyzing(true);
    setError("");
    try {
      const result = await photoTastingApi.identify(photos, currentParticipant.id);
      const identified = (result.whiskies || []).map((w: any) => ({
        ...w,
        selected: true,
        editing: false,
      }));
      setWhiskies(identified);
      if (identified.length === 0) {
        setError(t("photoTasting.noResults"));
      } else {
        setStep("review");
      }
    } catch (err: any) {
      setError(err.message || t("photoTasting.analysisFailed"));
    } finally {
      setAnalyzing(false);
    }
  }, [photos, currentParticipant, t]);

  const toggleWhisky = (idx: number) => {
    setWhiskies(prev => prev.map((w, i) => i === idx ? { ...w, selected: !w.selected } : w));
  };

  const toggleEdit = (idx: number) => {
    setWhiskies(prev => prev.map((w, i) => i === idx ? { ...w, editing: !w.editing } : w));
  };

  const updateWhisky = (idx: number, field: string, value: string) => {
    setWhiskies(prev => prev.map((w, i) => {
      if (i !== idx) return w;
      if (field === "abv") return { ...w, abv: value ? parseFloat(value) : null };
      return { ...w, [field]: value || null };
    }));
  };

  const removeWhisky = (idx: number) => {
    setWhiskies(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCreateTasting = useCallback(async () => {
    if (!currentParticipant) return;
    const selected = whiskies.filter(w => w.selected);
    if (selected.length === 0) return;
    if (!tastingTitle.trim()) {
      setError(t("photoTasting.titleRequired"));
      return;
    }
    setCreating(true);
    setError("");
    try {
      const result = await photoTastingApi.createTasting({
        participantId: currentParticipant.id,
        title: tastingTitle,
        date: tastingDate,
        location: tastingLocation,
        whiskies: selected.map(w => ({
          name: w.name,
          distillery: w.distillery,
          age: w.age,
          abv: w.abv,
          type: w.type,
          country: w.country,
          category: w.category,
          region: w.region,
          caskInfluence: w.caskInfluence,
          peatLevel: w.peatLevel,
          notes: w.notes,
        })),
      });
      toast({
        title: t("photoTasting.created"),
        description: t("photoTasting.createdDesc", { count: selected.length }),
      });
      setStep("done");
      setTimeout(() => navigate(`/tasting/${result.tasting.id}`), 1500);
    } catch (err: any) {
      setError(err.message || "Failed to create tasting");
    } finally {
      setCreating(false);
    }
  }, [currentParticipant, whiskies, tastingTitle, tastingDate, tastingLocation, t, toast, navigate]);

  if (!currentParticipant) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-muted-foreground">{t("photoTasting.loginRequired")}</p>
      </div>
    );
  }
  if (!hasAccess) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-muted-foreground">{t("photoTasting.accessDenied")}</p>
      </div>
    );
  }

  const selectedCount = whiskies.filter(w => w.selected).length;

  const confidenceIcon = (c?: string) => {
    if (c === "high") return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (c === "medium") return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    return <AlertTriangle className="w-4 h-4 text-red-500" />;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 min-w-0 overflow-x-hidden">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-2xl sm:text-4xl font-serif font-black text-primary tracking-tight" data-testid="text-photo-tasting-title">
          {t("photoTasting.title")}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">{t("photoTasting.subtitle")}</p>
        <div className="w-12 h-1 bg-primary/50 mt-3" />
      </motion.div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {["upload", "review", "details"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <ArrowRight className="w-4 h-4 text-muted-foreground/50" />}
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              step === s ? "bg-primary text-primary-foreground" :
              (["upload", "review", "details"].indexOf(step) > i ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground")
            }`}>
              {["upload", "review", "details"].indexOf(step) > i ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
              <span>{t(`photoTasting.step.${s}`)}</span>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive text-sm">
          {error}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {step === "upload" && (
          <motion.div key="upload" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
            <div className="bg-card border border-border/50 rounded-xl p-6 space-y-5">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-full shrink-0">
                  <Camera className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-2 flex-1">
                  <h2 className="text-xl font-serif font-bold text-primary">{t("photoTasting.uploadTitle")}</h2>
                  <p className="text-sm text-muted-foreground">{t("photoTasting.uploadDesc")}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {previews.map((preview, idx) => (
                  <div key={idx} className="relative aspect-[3/4] rounded-lg overflow-hidden border border-border/50 group">
                    <img src={preview} alt={photos[idx]?.name} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      data-testid={`remove-photo-${idx}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                      <span className="text-[10px] text-white truncate block">{photos[idx]?.name}</span>
                    </div>
                  </div>
                ))}

                <label
                  className="aspect-[3/4] rounded-lg border-2 border-dashed border-primary/30 hover:border-primary/60 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-primary/5"
                  data-testid="add-photos-button"
                >
                  <Plus className="w-8 h-8 text-primary/50" />
                  <span className="text-xs text-primary/60 font-medium">{t("photoTasting.addPhotos")}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotosSelected}
                    data-testid="photo-input"
                  />
                </label>
              </div>

              {photos.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("photoTasting.photosSelected", { count: photos.length })}
                  </span>
                  <Button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="gap-2"
                    data-testid="button-analyze"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t("photoTasting.identifying")}
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        {t("photoTasting.identifyBottles")}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {step === "review" && (
          <motion.div key="review" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-serif font-bold text-primary">
                {t("photoTasting.identifiedWhiskies")} ({whiskies.length})
              </h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setStep("upload")} data-testid="button-back-upload">
                  {t("photoTasting.backToPhotos")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setStep("details")}
                  disabled={selectedCount === 0}
                  className="gap-1"
                  data-testid="button-next-details"
                >
                  {t("photoTasting.next")} ({selectedCount})
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {whiskies.map((w, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`bg-card border rounded-xl p-4 transition-all ${
                  w.selected ? "border-primary/30" : "border-border/30 opacity-50"
                }`}
                data-testid={`whisky-card-${idx}`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleWhisky(idx)}
                    className={`mt-1 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      w.selected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"
                    }`}
                    data-testid={`toggle-whisky-${idx}`}
                  >
                    {w.selected && <Check className="w-3 h-3" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{w.name}</span>
                      {confidenceIcon(w.confidence)}
                      {w.dbMatch && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium flex items-center gap-1">
                          <Database className="w-3 h-3" />
                          {t("photoTasting.dbMatch")}
                        </span>
                      )}
                      {w.benchmarkMatch && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
                          {t("photoTasting.benchmarkMatch")}
                        </span>
                      )}
                      {!w.dbMatch && !w.benchmarkMatch && (
                        w.whiskybaseUrl ? (
                          <a
                            href={w.whiskybaseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium inline-flex items-center gap-1 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Whiskybase <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : w.whiskybaseSearch ? (
                          <a
                            href={`https://www.whiskybase.com/search?q=${encodeURIComponent(w.whiskybaseSearch)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium inline-flex items-center gap-1 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Search className="w-2.5 h-2.5" />
                            {t("photoTasting.searchWhiskybase")}
                          </a>
                        ) : null
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      {w.distillery && <span>{w.distillery}</span>}
                      {w.region && <span>{w.region}</span>}
                      {w.country && <span>{w.country}</span>}
                      {w.age && <span>{w.age} yo</span>}
                      {w.abv && <span>{w.abv}%</span>}
                      {w.category && <span>{w.category}</span>}
                      {w.caskInfluence && <span>{w.caskInfluence}</span>}
                      {w.peatLevel && <span>Peat: {w.peatLevel}</span>}
                    </div>
                    {w.notes && <p className="text-xs text-muted-foreground/70 mt-1 italic">{w.notes}</p>}

                    {w.editing && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-3 grid grid-cols-2 gap-2"
                      >
                        {[
                          { key: "name", label: t("photoTasting.field.name") },
                          { key: "distillery", label: t("photoTasting.field.distillery") },
                          { key: "region", label: t("photoTasting.field.region") },
                          { key: "country", label: t("photoTasting.field.country") },
                          { key: "age", label: t("photoTasting.field.age") },
                          { key: "abv", label: t("photoTasting.field.abv") },
                          { key: "category", label: t("photoTasting.field.category") },
                          { key: "caskInfluence", label: t("photoTasting.field.cask") },
                          { key: "peatLevel", label: t("photoTasting.field.peat") },
                          { key: "type", label: t("photoTasting.field.type") },
                        ].map(({ key, label }) => (
                          <div key={key}>
                            <Label className="text-[10px] text-muted-foreground">{label}</Label>
                            <Input
                              value={(w as any)[key] ?? ""}
                              onChange={e => updateWhisky(idx, key, e.target.value)}
                              className="h-7 text-xs"
                              data-testid={`edit-${key}-${idx}`}
                            />
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => toggleEdit(idx)}
                      className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                      data-testid={`edit-whisky-${idx}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeWhisky(idx)}
                      className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                      data-testid={`delete-whisky-${idx}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {step === "details" && (
          <motion.div key="details" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
            <div className="bg-card border border-border/50 rounded-xl p-6 space-y-5">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-full shrink-0">
                  <Wine className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-1 flex-1">
                  <h2 className="text-xl font-serif font-bold text-primary">{t("photoTasting.tastingDetails")}</h2>
                  <p className="text-sm text-muted-foreground">{t("photoTasting.tastingDetailsDesc")}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>{t("photoTasting.field.tastingTitle")} *</Label>
                  <Input
                    value={tastingTitle}
                    onChange={e => setTastingTitle(e.target.value)}
                    placeholder={t("photoTasting.titlePlaceholder")}
                    data-testid="input-tasting-title"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("photoTasting.field.date")}</Label>
                    <Input
                      type="date"
                      value={tastingDate}
                      onChange={e => setTastingDate(e.target.value)}
                      data-testid="input-tasting-date"
                    />
                  </div>
                  <div>
                    <Label>{t("photoTasting.field.location")}</Label>
                    <Input
                      value={tastingLocation}
                      onChange={e => setTastingLocation(e.target.value)}
                      placeholder={t("photoTasting.locationPlaceholder")}
                      data-testid="input-tasting-location"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border/30 pt-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                  {t("photoTasting.lineup")} ({selectedCount})
                </h3>
                <div className="space-y-1.5">
                  {whiskies.filter(w => w.selected).map((w, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm py-1">
                      <Wine className="w-4 h-4 text-primary/60 shrink-0" />
                      <span className="font-medium">{w.name}</span>
                      {w.distillery && <span className="text-muted-foreground">({w.distillery})</span>}
                      {w.age && <span className="text-muted-foreground">{w.age}yo</span>}
                      {w.abv && <span className="text-muted-foreground">{w.abv}%</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={() => setStep("review")} data-testid="button-back-review">
                  {t("photoTasting.back")}
                </Button>
                <Button
                  onClick={handleCreateTasting}
                  disabled={creating || !tastingTitle.trim()}
                  className="gap-2"
                  data-testid="button-create-tasting"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("photoTasting.creating")}
                    </>
                  ) : (
                    <>
                      <Wine className="w-4 h-4" />
                      {t("photoTasting.createTasting")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {step === "done" && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-4">
            <div className="inline-flex p-4 bg-green-100 dark:bg-green-900/30 rounded-full">
              <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-primary">{t("photoTasting.created")}</h2>
            <p className="text-muted-foreground">{t("photoTasting.redirecting")}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

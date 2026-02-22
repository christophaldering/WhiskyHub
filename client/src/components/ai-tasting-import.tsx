import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAppStore } from "@/lib/store";
import { tastingApi, participantApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload, FileSpreadsheet, Image, MessageSquare, Sparkles, Loader2,
  Check, X, Trash2, Edit3, ChevronDown, ChevronUp, Wine, ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ImportedWhisky {
  name: string;
  distillery: string | null;
  bottler: string | null;
  age: string | null;
  abv: number | null;
  category: string | null;
  country: string | null;
  region: string | null;
  caskInfluence: string | null;
  vintage: string | null;
  whiskybaseId: string | null;
  wbScore: number | null;
  price: number | null;
  peatLevel: string | null;
  ppm: number | null;
  hostNotes: string | null;
  hostSummary: string | null;
  sortOrder: number;
}

interface ImportResult {
  whiskies: ImportedWhisky[];
  tastingMeta: {
    title?: string;
    date?: string;
    dateISO?: string;
    dateDisplay?: string;
    location?: string;
    participants?: string[];
  };
  source: "excel" | "ai";
}

export function AiTastingImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { currentParticipant, setParticipant } = useAppStore();

  const [step, setStep] = useState<"upload" | "preview" | "creating">("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [pastedText, setPastedText] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [editingWhiskies, setEditingWhiskies] = useState<ImportedWhisky[]>([]);
  const [tastingTitle, setTastingTitle] = useState("");
  const [tastingDate, setTastingDate] = useState("");
  const [tastingLocation, setTastingLocation] = useState("");
  const [blindMode, setBlindMode] = useState(true);
  const [expandedWhisky, setExpandedWhisky] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestPin, setGuestPin] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasUnsavedData = files.length > 0 || pastedText.trim().length > 0 || editingWhiskies.length > 0 || tastingTitle.trim().length > 0;
  useUnsavedChanges(hasUnsavedData && step !== "creating");

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const hostId = currentParticipant?.id || "guest-analyze";
      return tastingApi.aiImport(files, pastedText, hostId);
    },
    onSuccess: (data: ImportResult) => {
      setResult(data);
      setEditingWhiskies(data.whiskies.map((w, i) => ({ ...w, sortOrder: i })));
      setTastingTitle(data.tastingMeta.title || "");
      setTastingDate(data.tastingMeta.dateISO || data.tastingMeta.date || new Date().toISOString().split("T")[0]);
      setTastingLocation(data.tastingMeta.location || "");
      setStep("preview");
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      let hostId = currentParticipant?.id;
      if (!hostId) {
        if (!guestName.trim()) throw new Error("Please enter your name");
        const participant = await participantApi.loginOrCreate(guestName.trim(), guestPin || undefined);
        setParticipant(participant);
        hostId = participant.id;
      }
      return tastingApi.createFromImport({
        hostId,
        title: tastingTitle.trim() || "Imported Tasting",
        date: tastingDate || new Date().toISOString().split("T")[0],
        location: tastingLocation.trim() || "Online",
        blindMode,
        whiskies: editingWhiskies,
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["tastings"] });
      onOpenChange(false);
      resetState();
      navigate(`/tasting/${data.tasting.id}`);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const resetState = useCallback(() => {
    setStep("upload");
    setFiles([]);
    setPastedText("");
    setResult(null);
    setEditingWhiskies([]);
    setTastingTitle("");
    setTastingDate("");
    setTastingLocation("");
    setBlindMode(true);
    setExpandedWhisky(null);
    setError(null);
    setGuestName("");
    setGuestPin("");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...dropped]);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateWhisky = (index: number, field: string, value: any) => {
    setEditingWhiskies(prev => prev.map((w, i) => i === index ? { ...w, [field]: value } : w));
  };

  const removeWhisky = (index: number) => {
    setEditingWhiskies(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <Image className="w-4 h-4 text-blue-500" />;
    if (file.name.match(/\.(xlsx|xls|csv)$/i)) return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
    return <Upload className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {t("aiImport.title")}
          </DialogTitle>
          <DialogDescription className="font-serif text-sm">
            {t("aiImport.description")}
          </DialogDescription>
          <p className="text-[10px] text-muted-foreground/50 mt-1" data-testid="text-ai-notice-import">{t("legal.aiNotice")}</p>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border/50 hover:border-primary/50 rounded-lg p-8 text-center cursor-pointer transition-colors bg-secondary/20 hover:bg-secondary/40"
                data-testid="dropzone-import"
              >
                <Upload className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="font-serif text-sm text-muted-foreground mb-1">{t("aiImport.dropzoneTitle")}</p>
                <p className="text-xs text-muted-foreground/60">{t("aiImport.dropzoneHint")}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".xlsx,.xls,.csv,.pdf,.txt,.jpg,.jpeg,.png,.webp,.gif"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-import-files"
                />
              </div>

              {files.length > 0 && (
                <div className="space-y-1">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 bg-secondary/30 rounded-md text-sm">
                      {getFileIcon(file)}
                      <span className="flex-1 truncate font-mono text-xs">{file.name}</span>
                      <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                      <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="text-muted-foreground hover:text-destructive">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">{t("aiImport.pasteLabel")}</Label>
                </div>
                <Textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={t("aiImport.pastePlaceholder")}
                  className="min-h-[100px] font-mono text-xs"
                  data-testid="textarea-import-text"
                />
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isPending || (files.length === 0 && !pastedText.trim())}
                className="w-full font-serif"
                data-testid="button-analyze-import"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("aiImport.analyzing")}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t("aiImport.analyze")}
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {step === "preview" && (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-md">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-sm font-serif text-green-700">
                  {t("aiImport.found", { count: editingWhiskies.length })}
                  {result?.source === "excel" && ` (Excel)`}
                  {result?.source === "ai" && ` (AI)`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">{t("aiImport.tastingTitle")}</Label>
                  <Input
                    value={tastingTitle}
                    onChange={(e) => setTastingTitle(e.target.value)}
                    placeholder="Whisky Tasting"
                    data-testid="input-import-title"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">{t("aiImport.tastingDate")}</Label>
                  <Input
                    type="date"
                    value={tastingDate}
                    onChange={(e) => setTastingDate(e.target.value)}
                    data-testid="input-import-date"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">{t("aiImport.location")}</Label>
                  <Input
                    value={tastingLocation}
                    onChange={(e) => setTastingLocation(e.target.value)}
                    placeholder="Online"
                    data-testid="input-import-location"
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">{t("aiImport.blindMode")}</Label>
                  <Switch checked={blindMode} onCheckedChange={setBlindMode} data-testid="switch-import-blind" />
                </div>
              </div>

              <div className="border-t border-border/30 pt-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3 flex items-center gap-2">
                  <Wine className="w-3.5 h-3.5" />
                  {t("aiImport.whiskies")} ({editingWhiskies.length})
                </p>
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                  {editingWhiskies.map((w, idx) => (
                    <div key={idx} className="border border-border/30 rounded-lg bg-card" data-testid={`card-import-whisky-${idx}`}>
                      <div
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-secondary/20"
                        onClick={() => setExpandedWhisky(expandedWhisky === idx ? null : idx)}
                      >
                        <span className="text-xs font-mono text-muted-foreground w-5">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-serif font-bold text-sm truncate">{w.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {[w.distillery, w.bottler, w.age ? `${w.age}y` : null, w.abv ? `${w.abv}%` : null].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        {w.wbScore && (
                          <span className="text-xs font-mono font-bold text-primary">{w.wbScore}</span>
                        )}
                        {w.price && (
                          <span className="text-xs font-mono text-muted-foreground">€{w.price}</span>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); removeWhisky(idx); }} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {expandedWhisky === idx ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                      </div>

                      <AnimatePresence>
                        {expandedWhisky === idx && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3 space-y-2 border-t border-border/20 pt-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-0.5">
                                  <Label className="text-[10px] text-muted-foreground">Name</Label>
                                  <Input className="h-7 text-xs" value={w.name} onChange={(e) => updateWhisky(idx, "name", e.target.value)} />
                                </div>
                                <div className="space-y-0.5">
                                  <Label className="text-[10px] text-muted-foreground">Distillery</Label>
                                  <Input className="h-7 text-xs" value={w.distillery || ""} onChange={(e) => updateWhisky(idx, "distillery", e.target.value || null)} />
                                </div>
                                <div className="space-y-0.5">
                                  <Label className="text-[10px] text-muted-foreground">{t("whisky.bottler")}</Label>
                                  <Input className="h-7 text-xs" value={w.bottler || ""} onChange={(e) => updateWhisky(idx, "bottler", e.target.value || null)} />
                                </div>
                                <div className="space-y-0.5">
                                  <Label className="text-[10px] text-muted-foreground">Age</Label>
                                  <Input className="h-7 text-xs" value={w.age || ""} onChange={(e) => updateWhisky(idx, "age", e.target.value || null)} />
                                </div>
                                <div className="space-y-0.5">
                                  <Label className="text-[10px] text-muted-foreground">ABV %</Label>
                                  <Input className="h-7 text-xs" type="number" step="0.1" value={w.abv ?? ""} onChange={(e) => updateWhisky(idx, "abv", e.target.value ? parseFloat(e.target.value) : null)} />
                                </div>
                                <div className="space-y-0.5">
                                  <Label className="text-[10px] text-muted-foreground">Category</Label>
                                  <Input className="h-7 text-xs" value={w.category || ""} onChange={(e) => updateWhisky(idx, "category", e.target.value || null)} />
                                </div>
                                <div className="space-y-0.5">
                                  <Label className="text-[10px] text-muted-foreground">Country</Label>
                                  <Input className="h-7 text-xs" value={w.country || ""} onChange={(e) => updateWhisky(idx, "country", e.target.value || null)} />
                                </div>
                                <div className="space-y-0.5">
                                  <Label className="text-[10px] text-muted-foreground">Region</Label>
                                  <Input className="h-7 text-xs" value={w.region || ""} onChange={(e) => updateWhisky(idx, "region", e.target.value || null)} />
                                </div>
                                <div className="space-y-0.5">
                                  <Label className="text-[10px] text-muted-foreground">Cask</Label>
                                  <Input className="h-7 text-xs" value={w.caskInfluence || ""} onChange={(e) => updateWhisky(idx, "caskInfluence", e.target.value || null)} />
                                </div>
                                <div className="space-y-0.5">
                                  <Label className="text-[10px] text-muted-foreground">{t("whisky.vintage")}</Label>
                                  <Input className="h-7 text-xs" value={w.vintage || ""} onChange={(e) => updateWhisky(idx, "vintage", e.target.value || null)} />
                                </div>
                                <div className="space-y-0.5">
                                  <Label className="text-[10px] text-muted-foreground">{t("whisky.price")}</Label>
                                  <Input className="h-7 text-xs" type="number" step="0.01" value={w.price ?? ""} onChange={(e) => updateWhisky(idx, "price", e.target.value ? parseFloat(e.target.value) : null)} />
                                </div>
                                <div className="space-y-0.5">
                                  <Label className="text-[10px] text-muted-foreground">WB Score</Label>
                                  <Input className="h-7 text-xs" type="number" step="0.1" value={w.wbScore ?? ""} onChange={(e) => updateWhisky(idx, "wbScore", e.target.value ? parseFloat(e.target.value) : null)} />
                                </div>
                              </div>
                              {w.whiskybaseId && (
                                <div className="flex items-center gap-2">
                                  <Label className="text-[10px] text-muted-foreground">Whiskybase</Label>
                                  <a href={`https://www.whiskybase.com/whiskies/whisky/${w.whiskybaseId}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                                    #{w.whiskybaseId} <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              )}
                              {w.hostSummary && (
                                <div className="space-y-0.5">
                                  <Label className="text-[10px] text-muted-foreground">{t("whisky.hostSummary")}</Label>
                                  <Textarea className="text-xs min-h-[60px]" value={w.hostSummary} onChange={(e) => updateWhisky(idx, "hostSummary", e.target.value || null)} />
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>

              {!currentParticipant && (
                <div className="p-4 bg-secondary/50 border border-border/50 rounded-lg space-y-3">
                  <p className="text-sm font-semibold text-foreground">{t("aiImport.guestIdentify")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">{t("aiImport.guestName")}</Label>
                      <Input
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder={t("aiImport.guestNamePlaceholder")}
                        className="mt-1"
                        data-testid="input-guest-name"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t("aiImport.guestPin")}</Label>
                      <Input
                        value={guestPin}
                        onChange={(e) => setGuestPin(e.target.value)}
                        placeholder={t("aiImport.guestPinPlaceholder")}
                        type="password"
                        className="mt-1"
                        data-testid="input-guest-pin"
                      />
                    </div>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground/60 leading-relaxed">{t('guestAuth.consentNotice')}</p>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setStep("upload"); setResult(null); }} className="flex-1 font-serif" data-testid="button-import-back">
                  {t("aiImport.back")}
                </Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || editingWhiskies.length === 0 || (!currentParticipant && !guestName.trim())}
                  className="flex-1 font-serif"
                  data-testid="button-import-create"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("aiImport.creating")}
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {t("aiImport.createTasting")}
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

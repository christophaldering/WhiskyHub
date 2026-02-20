import { useParams, useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import { EvaluationForm } from "@/components/evaluation-form";
import { RevealView } from "@/components/reveal-view";
import { FocusedTasting } from "@/components/focused-tasting";
import { GuidedTasting } from "@/components/guided-tasting";
import { SessionControl } from "@/components/session-control";
import { LoginDialog } from "@/components/login-dialog";
import { ImportFlightDialog } from "@/components/import-flight-dialog";
import { CurationWizard } from "@/components/curation-wizard";
import { FlightBoard } from "@/components/flight-board";
import { PdfExportDialog } from "@/components/pdf-export-dialog";
import { BriefingNotes } from "@/components/briefing-notes";
import { AttendeeRoster } from "@/components/attendee-roster";
import { InvitePanel } from "@/components/invite-panel";
import DiscussionPanel from "@/components/discussion-panel";
import ReflectionPanel from "@/components/reflection-panel";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, Camera, X, ImageIcon, ExternalLink, Pencil, Trash2, LayoutList, Copy, Settings, Eye, EyeOff, UserCog, User, Shield, Mail, MoreHorizontal, Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { tastingApi, whiskyApi, participantApi } from "@/lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Whisky, Tasting } from "@shared/schema";

function QuickImageUpload({ whisky, tastingId, size = "lg" }: { whisky: Whisky; tastingId: string; size?: "md" | "lg" }) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const dim = size === "lg" ? "w-40 h-40" : "w-20 h-20";
  const iconSize = size === "lg" ? "w-8 h-8" : "w-5 h-5";

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      toast({ title: t("whisky.photoInvalidType"), variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: t("whisky.photoTooLarge"), variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      await whiskyApi.uploadImage(whisky.id, file);
      queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
      toast({ title: t("whisky.photoUploaded") });
    } catch {
      toast({ title: t("whisky.photoUploadError"), variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="relative group/img mx-auto">
      <WhiskyThumbnail whisky={whisky} size={size} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
        data-testid={`input-quick-upload-${whisky.id}`}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className={cn(
          dim,
          "absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer"
        )}
        data-testid={`button-quick-upload-${whisky.id}`}
      >
        {uploading ? (
          <Loader2 className={cn(iconSize, "text-white animate-spin")} />
        ) : (
          <Camera className={cn(iconSize, "text-white")} />
        )}
      </button>
    </div>
  );
}

function WhiskyThumbnail({ whisky, size = "sm" }: { whisky: Whisky; size?: "sm" | "md" | "lg" }) {
  const [imgError, setImgError] = useState(false);
  const dim = size === "lg" ? "w-40 h-40" : size === "md" ? "w-20 h-20" : "w-10 h-10";
  const iconSize = size === "lg" ? "w-12 h-12" : size === "md" ? "w-8 h-8" : "w-4 h-4";

  if (whisky.imageUrl && !imgError) {
    return (
      <img
        src={whisky.imageUrl}
        alt={whisky.name}
        className={cn(dim, "object-cover rounded-full border border-border/50")}
        onError={() => setImgError(true)}
        data-testid={`img-whisky-${whisky.id}`}
      />
    );
  }

  return (
    <div className={cn(dim, "rounded-full bg-secondary/30 border border-secondary flex items-center justify-center")}>
      <ImageIcon className={cn(iconSize, "text-muted-foreground/40")} />
    </div>
  );
}

function AddWhiskyDialog({ tastingId }: { tastingId: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: "", distillery: "", age: "", abv: "", country: "",
    notes: "", category: "Single Malt", region: "", abvBand: "", ageBand: "",
    caskInfluence: "", peatLevel: "None", ppm: "", whiskybaseId: "", wbScore: "",
    bottler: "", vintage: "", price: "", hostSummary: "",
  });

  const createWhisky = useMutation({
    mutationFn: async (data: any) => {
      const whisky = await whiskyApi.create(data);
      if (imageFile) {
        await whiskyApi.uploadImage(whisky.id, imageFile);
      }
      return whisky;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
      setOpen(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setForm({ name: "", distillery: "", age: "", abv: "", country: "", notes: "", category: "Single Malt", region: "", abvBand: "", ageBand: "", caskInfluence: "", peatLevel: "None", ppm: "", whiskybaseId: "", wbScore: "", bottler: "", vintage: "", price: "", hostSummary: "" });
    setImageFile(null);
    setImagePreview(null);
    setImageError("");
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError("");

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setImageError(t("whisky.photoInvalidType"));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setImageError(t("whisky.photoTooLarge"));
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    createWhisky.mutate({
      tastingId,
      name: form.name.trim(),
      distillery: form.distillery.trim() || null,
      age: form.age.trim() || null,
      abv: form.abv ? parseFloat(form.abv) : null,
      type: form.category || null,
      country: form.country || null,
      notes: form.notes.trim() || null,
      sortOrder: 0,
      category: form.category || null,
      region: form.region.trim() || null,
      abvBand: form.abvBand || null,
      ageBand: form.ageBand || null,
      caskInfluence: form.caskInfluence.trim() || null,
      peatLevel: form.peatLevel || null,
      ppm: form.ppm ? parseFloat(form.ppm) : null,
      whiskybaseId: form.whiskybaseId.trim() || null,
      wbScore: form.wbScore ? parseFloat(form.wbScore) : null,
      bottler: form.bottler.trim() || null,
      vintage: form.vintage.trim() || null,
      price: form.price ? parseFloat(form.price) : null,
      hostSummary: form.hostSummary.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-primary/30 text-primary font-serif" data-testid="button-add-whisky">
          <Plus className="w-4 h-4 mr-1" /> {t("whisky.addExpression")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-primary">{t("whisky.addExpression")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">{t("whisky.bottlePhoto")}</Label>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg border border-border/50" />
                  <button
                    onClick={() => { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                    data-testid="button-remove-preview"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-lg bg-secondary/20 border border-dashed border-border flex items-center justify-center">
                  <Camera className="w-6 h-6 text-muted-foreground/40" />
                </div>
              )}
              <div className="flex-1 space-y-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  data-testid="input-whisky-image"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs"
                  data-testid="button-upload-photo"
                >
                  <Camera className="w-3 h-3 mr-1" />
                  {imagePreview ? t("whisky.changePhoto") : t("whisky.uploadPhoto")}
                </Button>
                <p className="text-xs text-muted-foreground">{t("whisky.photoHint")}</p>
                {imageError && <p className="text-xs text-destructive">{imageError}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">{t("whisky.whiskybaseId")}</Label>
            <div className="flex gap-2">
              <Input value={form.whiskybaseId} onChange={(e) => setForm(p => ({ ...p, whiskybaseId: e.target.value }))} placeholder="12345" className="flex-1" data-testid="input-whisky-wbid" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs flex-shrink-0"
                onClick={() => {
                  if (form.whiskybaseId.trim()) {
                    window.open(`https://www.whiskybase.com/whiskies/whisky/${form.whiskybaseId.trim()}`, "_blank");
                  } else {
                    const parts = [form.name, form.distillery, form.age, form.abv ? `${form.abv}%` : ""].filter(Boolean);
                    window.open(`https://www.whiskybase.com/search?q=${encodeURIComponent(parts.join(" "))}`, "_blank");
                  }
                }}
                data-testid="button-search-whiskybase"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                {form.whiskybaseId.trim() ? t("whisky.viewWhiskybase") : t("whisky.findWhiskybase")}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Name *</Label>
              <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Uigeadail" data-testid="input-whisky-name" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Distillery</Label>
              <Input value={form.distillery} onChange={(e) => setForm(p => ({ ...p, distillery: e.target.value }))} placeholder="Ardbeg" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">{t("whisky.bottler")}</Label>
              <Input value={form.bottler} onChange={(e) => setForm(p => ({ ...p, bottler: e.target.value }))} placeholder="OA / Signatory / G&M..." data-testid="input-whisky-bottler" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">{t("whisky.vintage")}</Label>
              <Input value={form.vintage} onChange={(e) => setForm(p => ({ ...p, vintage: e.target.value }))} placeholder="2010 - 2025" data-testid="input-whisky-vintage" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Age</Label>
              <Input value={form.age} onChange={(e) => setForm(p => ({ ...p, age: e.target.value }))} placeholder="NAS or 18" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">ABV %</Label>
              <Input type="number" value={form.abv} onChange={(e) => setForm(p => ({ ...p, abv: e.target.value }))} placeholder="46.0" step="0.1" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Country</Label>
              <Select value={form.country} onValueChange={(v) => setForm(p => ({ ...p, country: v }))}>
                <SelectTrigger data-testid="select-whisky-country"><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Scotland">Scotland</SelectItem>
                  <SelectItem value="Ireland">Ireland</SelectItem>
                  <SelectItem value="Japan">Japan</SelectItem>
                  <SelectItem value="USA">USA</SelectItem>
                  <SelectItem value="Canada">Canada</SelectItem>
                  <SelectItem value="India">India</SelectItem>
                  <SelectItem value="Taiwan">Taiwan</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger data-testid="select-whisky-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single Malt">Single Malt</SelectItem>
                  <SelectItem value="Blended Malt">Blended Malt</SelectItem>
                  <SelectItem value="Blended">Blended</SelectItem>
                  <SelectItem value="Grain">Grain</SelectItem>
                  <SelectItem value="Bourbon">Bourbon</SelectItem>
                  <SelectItem value="Rye">Rye</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">{t("whisky.price")}</Label>
              <Input type="number" value={form.price} onChange={(e) => setForm(p => ({ ...p, price: e.target.value }))} placeholder="80.00" step="0.01" data-testid="input-whisky-price" />
            </div>
          </div>
          <div className="border-t border-border/30 pt-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-bold">Taxonomy</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Region</Label>
                <Input value={form.region} onChange={(e) => setForm(p => ({ ...p, region: e.target.value }))} placeholder="Islay, Speyside..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Cask Influence</Label>
                <Input value={form.caskInfluence} onChange={(e) => setForm(p => ({ ...p, caskInfluence: e.target.value }))} placeholder="Sherry, Bourbon..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Peat Level</Label>
                <Select value={form.peatLevel} onValueChange={(v) => setForm(p => ({ ...p, peatLevel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="Light">Light</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Heavy">Heavy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Age Band</Label>
                <Select value={form.ageBand} onValueChange={(v) => setForm(p => ({ ...p, ageBand: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NAS">NAS</SelectItem>
                    <SelectItem value="Young (3-9)">Young (3-9)</SelectItem>
                    <SelectItem value="Classic (10-17)">Classic (10-17)</SelectItem>
                    <SelectItem value="Mature (18-25)">Mature (18-25)</SelectItem>
                    <SelectItem value="Old (25+)">Old (25+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("whisky.ppm")}</Label>
                <Input type="number" value={form.ppm} onChange={(e) => setForm(p => ({ ...p, ppm: e.target.value }))} placeholder="55" step="1" data-testid="input-whisky-ppm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("whisky.wbScore")}</Label>
                <Input type="number" min={0} max={100} step={0.1} value={form.wbScore} onChange={(e) => setForm(p => ({ ...p, wbScore: e.target.value }))} placeholder="87.5" className="w-full" data-testid="input-whisky-wbscore" />
              </div>
            </div>
          </div>
          <div className="border-t border-border/30 pt-4">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">{t("whisky.hostSummary")}</Label>
              <textarea
                value={form.hostSummary}
                onChange={(e) => setForm(p => ({ ...p, hostSummary: e.target.value }))}
                placeholder={t("whisky.hostSummaryPlaceholder")}
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="input-whisky-host-summary"
              />
              <p className="text-xs text-muted-foreground">{t("whisky.hostSummaryHint")}</p>
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={createWhisky.isPending || !form.name.trim()} className="w-full bg-primary text-primary-foreground font-serif" data-testid="button-submit-whisky">
            {createWhisky.isPending ? "Adding..." : t("whisky.addToFlight")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditWhiskyDialog({ whisky, tastingId, isHost, tastingStatus }: { whisky: Whisky; tastingId: string; isHost: boolean; tastingStatus: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: "", distillery: "", age: "", abv: "", country: "",
    notes: "", category: "Single Malt", region: "", abvBand: "", ageBand: "",
    caskInfluence: "", peatLevel: "None", ppm: "", whiskybaseId: "", wbScore: "",
    hostNotes: "", bottler: "", vintage: "", price: "", hostSummary: "",
  });

  const canEdit = isHost && (tastingStatus === "draft" || tastingStatus === "open");

  const populateForm = () => {
    setForm({
      name: whisky.name || "",
      distillery: whisky.distillery || "",
      age: whisky.age || "",
      abv: whisky.abv != null ? String(whisky.abv) : "",
      country: (whisky as any).country || "",
      notes: whisky.notes || "",
      category: whisky.category || whisky.type || "Single Malt",
      region: whisky.region || "",
      abvBand: whisky.abvBand || "",
      ageBand: whisky.ageBand || "",
      caskInfluence: whisky.caskInfluence || "",
      peatLevel: whisky.peatLevel || "None",
      ppm: whisky.ppm != null ? String(whisky.ppm) : "",
      whiskybaseId: whisky.whiskybaseId || "",
      wbScore: whisky.wbScore != null ? String(whisky.wbScore) : "",
      hostNotes: whisky.hostNotes || "",
      bottler: whisky.bottler || "",
      vintage: whisky.vintage || "",
      price: whisky.price != null ? String(whisky.price) : "",
      hostSummary: whisky.hostSummary || "",
    });
    setImageFile(null);
    setImagePreview(null);
    setImageError("");
    setRemoveExistingImage(false);
  };

  const updateWhisky = useMutation({
    mutationFn: async (data: any) => {
      const updated = await whiskyApi.update(whisky.id, data);
      if (removeExistingImage && !imageFile) {
        await whiskyApi.deleteImage(whisky.id);
      }
      if (imageFile) {
        await whiskyApi.uploadImage(whisky.id, imageFile);
      }
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
      setOpen(false);
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError("");
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setImageError(t("whisky.photoInvalidType"));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setImageError(t("whisky.photoTooLarge"));
      return;
    }
    setImageFile(file);
    setRemoveExistingImage(false);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    updateWhisky.mutate({
      name: form.name.trim(),
      distillery: form.distillery.trim() || null,
      age: form.age.trim() || null,
      abv: form.abv ? parseFloat(form.abv) : null,
      type: form.category || null,
      country: form.country || null,
      notes: form.notes.trim() || null,
      category: form.category || null,
      region: form.region.trim() || null,
      abvBand: form.abvBand || null,
      ageBand: form.ageBand || null,
      caskInfluence: form.caskInfluence.trim() || null,
      peatLevel: form.peatLevel || null,
      ppm: form.ppm ? parseFloat(form.ppm) : null,
      whiskybaseId: form.whiskybaseId.trim() || null,
      wbScore: form.wbScore ? parseFloat(form.wbScore) : null,
      hostNotes: form.hostNotes.trim() || null,
      bottler: form.bottler.trim() || null,
      vintage: form.vintage.trim() || null,
      price: form.price ? parseFloat(form.price) : null,
      hostSummary: form.hostSummary.trim() || null,
    });
  };

  if (!canEdit) return null;

  const currentImageUrl = removeExistingImage ? null : (imagePreview || whisky.imageUrl);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (v) populateForm(); setOpen(v); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" data-testid="button-edit-whisky">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-primary">{t("whisky.editExpression")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">{t("whisky.bottlePhoto")}</Label>
            <div className="flex items-center gap-4">
              {currentImageUrl ? (
                <div className="relative">
                  <img src={currentImageUrl} alt="Preview" className="w-20 h-20 object-cover rounded-lg border border-border/50" />
                  <button
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                      setRemoveExistingImage(true);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                    data-testid="button-remove-edit-preview"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-lg bg-secondary/20 border border-dashed border-border flex items-center justify-center">
                  <Camera className="w-6 h-6 text-muted-foreground/40" />
                </div>
              )}
              <div className="flex-1 space-y-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  data-testid="input-edit-whisky-image"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs"
                  data-testid="button-edit-upload-photo"
                >
                  <Camera className="w-3 h-3 mr-1" />
                  {currentImageUrl ? t("whisky.replacePhoto") : t("whisky.uploadPhoto")}
                </Button>
                <p className="text-xs text-muted-foreground">{t("whisky.photoHint")}</p>
                {imageError && <p className="text-xs text-destructive">{imageError}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">{t("whisky.whiskybaseId")}</Label>
            <div className="flex gap-2">
              <Input value={form.whiskybaseId} onChange={(e) => setForm(p => ({ ...p, whiskybaseId: e.target.value }))} placeholder="12345" className="flex-1" data-testid="input-edit-whisky-wbid" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs flex-shrink-0"
                onClick={() => {
                  if (form.whiskybaseId.trim()) {
                    window.open(`https://www.whiskybase.com/whiskies/whisky/${form.whiskybaseId.trim()}`, "_blank");
                  } else {
                    const parts = [form.name, form.distillery, form.age, form.abv ? `${form.abv}%` : ""].filter(Boolean);
                    window.open(`https://www.whiskybase.com/search?q=${encodeURIComponent(parts.join(" "))}`, "_blank");
                  }
                }}
                data-testid="button-edit-search-whiskybase"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                {form.whiskybaseId.trim() ? t("whisky.viewWhiskybase") : t("whisky.findWhiskybase")}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Name *</Label>
              <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} data-testid="input-edit-whisky-name" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Distillery</Label>
              <Input value={form.distillery} onChange={(e) => setForm(p => ({ ...p, distillery: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">{t("whisky.bottler")}</Label>
              <Input value={form.bottler} onChange={(e) => setForm(p => ({ ...p, bottler: e.target.value }))} placeholder="OA / Signatory / G&M..." data-testid="input-edit-whisky-bottler" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">{t("whisky.vintage")}</Label>
              <Input value={form.vintage} onChange={(e) => setForm(p => ({ ...p, vintage: e.target.value }))} placeholder="2010 - 2025" data-testid="input-edit-whisky-vintage" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Age</Label>
              <Input value={form.age} onChange={(e) => setForm(p => ({ ...p, age: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">ABV %</Label>
              <Input type="number" value={form.abv} onChange={(e) => setForm(p => ({ ...p, abv: e.target.value }))} step="0.1" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Country</Label>
              <Select value={form.country} onValueChange={(v) => setForm(p => ({ ...p, country: v }))}>
                <SelectTrigger data-testid="select-edit-whisky-country"><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Scotland">Scotland</SelectItem>
                  <SelectItem value="Ireland">Ireland</SelectItem>
                  <SelectItem value="Japan">Japan</SelectItem>
                  <SelectItem value="USA">USA</SelectItem>
                  <SelectItem value="Canada">Canada</SelectItem>
                  <SelectItem value="India">India</SelectItem>
                  <SelectItem value="Taiwan">Taiwan</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger data-testid="select-edit-whisky-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single Malt">Single Malt</SelectItem>
                  <SelectItem value="Blended Malt">Blended Malt</SelectItem>
                  <SelectItem value="Blended">Blended</SelectItem>
                  <SelectItem value="Grain">Grain</SelectItem>
                  <SelectItem value="Bourbon">Bourbon</SelectItem>
                  <SelectItem value="Rye">Rye</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">{t("whisky.price")}</Label>
              <Input type="number" value={form.price} onChange={(e) => setForm(p => ({ ...p, price: e.target.value }))} placeholder="80.00" step="0.01" data-testid="input-edit-whisky-price" />
            </div>
          </div>
          <div className="border-t border-border/30 pt-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-bold">Taxonomy</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Region</Label>
                <Input value={form.region} onChange={(e) => setForm(p => ({ ...p, region: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Cask Influence</Label>
                <Input value={form.caskInfluence} onChange={(e) => setForm(p => ({ ...p, caskInfluence: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Peat Level</Label>
                <Select value={form.peatLevel} onValueChange={(v) => setForm(p => ({ ...p, peatLevel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="Light">Light</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Heavy">Heavy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Age Band</Label>
                <Select value={form.ageBand} onValueChange={(v) => setForm(p => ({ ...p, ageBand: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NAS">NAS</SelectItem>
                    <SelectItem value="Young (3-9)">Young (3-9)</SelectItem>
                    <SelectItem value="Classic (10-17)">Classic (10-17)</SelectItem>
                    <SelectItem value="Mature (18-25)">Mature (18-25)</SelectItem>
                    <SelectItem value="Old (25+)">Old (25+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("whisky.ppm")}</Label>
                <Input type="number" value={form.ppm} onChange={(e) => setForm(p => ({ ...p, ppm: e.target.value }))} placeholder="55" step="1" data-testid="input-edit-whisky-ppm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("whisky.wbScore")}</Label>
                <Input type="number" min={0} max={100} step={0.1} value={form.wbScore} onChange={(e) => setForm(p => ({ ...p, wbScore: e.target.value }))} placeholder="87.5" className="w-full" data-testid="input-edit-whisky-wbscore" />
              </div>
            </div>
          </div>
          <div className="border-t border-border/30 pt-4">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">{t("focus.hostNotes")}</Label>
              <textarea
                value={form.hostNotes}
                onChange={(e) => setForm(p => ({ ...p, hostNotes: e.target.value }))}
                placeholder={t("focus.hostNotesPlaceholder")}
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="input-edit-whisky-host-notes"
              />
              <p className="text-xs text-muted-foreground">{t("focus.hostNotesHint")}</p>
            </div>
          </div>
          <div className="border-t border-border/30 pt-4">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">{t("whisky.hostSummary")}</Label>
              <textarea
                value={form.hostSummary}
                onChange={(e) => setForm(p => ({ ...p, hostSummary: e.target.value }))}
                placeholder={t("whisky.hostSummaryPlaceholder")}
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="input-edit-whisky-host-summary"
              />
              <p className="text-xs text-muted-foreground">{t("whisky.hostSummaryHint")}</p>
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={updateWhisky.isPending || !form.name.trim()} className="w-full bg-primary text-primary-foreground font-serif" data-testid="button-save-whisky">
            {updateWhisky.isPending ? t("whisky.saving") : t("whisky.saveChanges")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditTastingDialog({ tasting }: { tasting: Tasting }) {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", location: "" });
  const [coverUploading, setCoverUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open && tasting) {
      setForm({ title: tasting.title, date: tasting.date, location: tasting.location });
      setSaved(false);
    }
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [open, tasting]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => tastingApi.updateDetails(tasting.id, currentParticipant!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasting", tasting.id] });
      queryClient.invalidateQueries({ queryKey: ["tastings"] });
      setSaved(true);
    },
  });

  const triggerAutoSave = (newForm: typeof form) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaved(false);
    saveTimeoutRef.current = setTimeout(() => {
      if (newForm.title.trim() && currentParticipant) {
        updateMutation.mutate(newForm);
      }
    }, 1500);
  };

  const handleFormChange = (field: string, value: string) => {
    const newForm = { ...form, [field]: value };
    setForm(newForm);
    triggerAutoSave(newForm);
  };

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen && form.title.trim() && currentParticipant) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      const hasChanges = form.title !== tasting.title || form.date !== tasting.date || form.location !== tasting.location;
      if (hasChanges && !saved) {
        updateMutation.mutate(form);
      }
    }
    setOpen(isOpen);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentParticipant) return;
    setCoverUploading(true);
    try {
      await tastingApi.uploadCoverImage(tasting.id, file, currentParticipant.id);
      queryClient.invalidateQueries({ queryKey: ["tasting", tasting.id] });
    } catch (err) {
      console.error("Cover upload failed:", err);
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const handleCoverRemove = async () => {
    if (!currentParticipant) return;
    setCoverUploading(true);
    try {
      await tastingApi.deleteCoverImage(tasting.id, currentParticipant.id);
      queryClient.invalidateQueries({ queryKey: ["tasting", tasting.id] });
    } catch (err) {
      console.error("Cover remove failed:", err);
    } finally {
      setCoverUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-primary/30 text-primary font-serif" data-testid="button-edit-tasting">
          <Settings className="w-4 h-4 mr-1" /> {t("session.actions.editDetails")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-primary">{t("session.actions.editDetailsTitle")}</DialogTitle>
          <DialogDescription className="flex items-center gap-1 text-xs">
            {updateMutation.isPending ? (
              <span className="text-muted-foreground">{t("session.actions.autoSaving")}</span>
            ) : saved ? (
              <span className="text-green-600">{t("session.actions.autoSaved")}</span>
            ) : (
              <span className="text-muted-foreground">{t("session.actions.autoSaveHint")}</span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">{t("session.actions.editTitle")}</Label>
            <Input value={form.title} onChange={(e) => handleFormChange("title", e.target.value)} className="bg-secondary/20" data-testid="input-edit-title" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">{t("session.actions.editDate")}</Label>
            <Input type="date" value={form.date} onChange={(e) => handleFormChange("date", e.target.value)} className="bg-secondary/20" data-testid="input-edit-date" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">{t("session.actions.editLocation")}</Label>
            <Input value={form.location} onChange={(e) => handleFormChange("location", e.target.value)} className="bg-secondary/20" data-testid="input-edit-location" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">{t("session.coverImage.label")}</Label>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverUpload}
              data-testid="input-cover-image"
            />
            {tasting.coverImageUrl ? (
              <div className="relative mt-2 rounded-lg overflow-hidden">
                <img src={tasting.coverImageUrl} alt="Cover" className="w-full h-32 object-cover rounded-lg" />
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 px-2 text-xs"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={coverUploading}
                    data-testid="button-change-cover"
                  >
                    <Camera className="w-3 h-3 mr-1" />
                    {t("session.coverImage.change")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-7 px-2 text-xs"
                    onClick={handleCoverRemove}
                    disabled={coverUploading}
                    data-testid="button-remove-cover"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full mt-2 border-dashed border-2 h-20"
                onClick={() => coverInputRef.current?.click()}
                disabled={coverUploading}
                data-testid="button-upload-cover"
              >
                <div className="flex flex-col items-center gap-1">
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {coverUploading ? "..." : t("session.coverImage.upload")}
                  </span>
                </div>
              </Button>
            )}
          </div>
          <Button
            onClick={() => {
              if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
              if (form.title.trim() && currentParticipant) {
                updateMutation.mutate(form);
              }
              handleDialogClose(false);
            }}
            className="w-full bg-primary text-primary-foreground font-serif"
            data-testid="button-save-tasting-details"
          >
            {updateMutation.isPending ? "..." : t("session.actions.editDone")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteTastingButton({ tasting }: { tasting: Tasting }) {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();

  const deleteMut = useMutation({
    mutationFn: () => tastingApi.updateStatus(tasting.id, "deleted", undefined, currentParticipant!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tastings"] });
      navigate("/sessions");
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-destructive/30 text-destructive font-serif hover:bg-destructive/10" data-testid="button-delete-tasting">
          <Trash2 className="w-4 h-4 mr-1" /> {t("session.actions.deleteSession")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-serif">{t("session.actions.deleteConfirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("session.actions.deleteConfirmMessage")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("session.actions.deleteCancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={() => deleteMut.mutate()} disabled={deleteMut.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete-tasting">
            {deleteMut.isPending ? "..." : t("session.actions.deleteConfirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DuplicateTastingButton({ tasting }: { tasting: Tasting }) {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();

  const duplicateMutation = useMutation({
    mutationFn: () => tastingApi.duplicate(tasting.id, currentParticipant!.id),
    onSuccess: (newTasting: any) => {
      queryClient.invalidateQueries({ queryKey: ["tastings"] });
      navigate(`/tasting/${newTasting.id}`);
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-primary/30 text-primary font-serif" data-testid="button-duplicate-tasting">
          <Copy className="w-4 h-4 mr-1" /> {t("session.actions.duplicateTasting")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-serif">{t("session.actions.duplicateConfirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("session.actions.duplicateConfirmMessage")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("session.actions.deleteCancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={() => duplicateMutation.mutate()} disabled={duplicateMutation.isPending} data-testid="button-confirm-duplicate">
            {duplicateMutation.isPending ? "..." : t("session.actions.duplicateConfirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function TransferHostDialog({ tasting }: { tasting: Tasting }) {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");

  const { data: participants = [] } = useQuery({
    queryKey: ["tasting-participants", tasting.id],
    queryFn: () => tastingApi.getParticipants(tasting.id),
    enabled: open,
  });

  const transferMutation = useMutation({
    mutationFn: () => tastingApi.transferHost(tasting.id, currentParticipant!.id, selectedId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasting", tasting.id] });
      setOpen(false);
      setSelectedId("");
    },
  });

  const otherParticipants = participants.filter((p: any) => p.participantId !== currentParticipant?.id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-primary/30 text-primary font-serif" data-testid="button-transfer-host">
          <UserCog className="w-4 h-4 mr-1" /> {t("session.transferHost.button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-primary">{t("session.transferHost.title")}</DialogTitle>
          <DialogDescription>{t("session.transferHost.description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {otherParticipants.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-participants">{t("session.transferHost.noParticipants")}</p>
          ) : (
            <div className="space-y-2">
              <Label className="font-serif text-sm uppercase tracking-widest text-muted-foreground">{t("session.transferHost.selectLabel")}</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger data-testid="select-new-host">
                  <SelectValue placeholder={t("session.transferHost.selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {otherParticipants.map((p: any) => (
                    <SelectItem key={p.participantId} value={p.participantId} data-testid={`option-host-${p.participantId}`}>
                      {p.participant?.name || p.participantId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button
            onClick={() => transferMutation.mutate()}
            disabled={!selectedId || transferMutation.isPending}
            className="w-full bg-primary text-primary-foreground font-serif"
            data-testid="button-confirm-transfer"
          >
            {transferMutation.isPending ? "..." : t("session.transferHost.confirm")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TastingRoom() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { currentParticipant, setParticipant } = useAppStore();
  const [showLogin, setShowLogin] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState("");
  const [showSecureAccount, setShowSecureAccount] = useState(false);
  const [secureEmail, setSecureEmail] = useState("");
  const [securePin, setSecurePin] = useState("");
  const [secureLoading, setSecureLoading] = useState(false);
  const [secureError, setSecureError] = useState("");
  const [secureDismissed, setSecureDismissed] = useState(false);

  const handleGuestJoin = async () => {
    if (!guestName.trim()) return;
    setGuestLoading(true);
    setGuestError("");
    try {
      const guest = await participantApi.guestJoin(guestName.trim());
      setParticipant({ id: guest.id, name: guest.name, role: guest.role, canAccessWhiskyDb: guest.canAccessWhiskyDb });
      if (guest.guest && !guest.pin) {
        setShowSecureAccount(true);
      }
    } catch (e: any) {
      if (e.message?.includes("already taken")) {
        setGuestError(t("home.nameTaken"));
      } else {
        setGuestError(e.message || t("home.joinFailed"));
      }
    } finally {
      setGuestLoading(false);
    }
  };

  const handleSecureAccount = async () => {
    if (!securePin.trim() || securePin.length < 4) {
      setSecureError(t("guestSecure.pinTooShort"));
      return;
    }
    if (secureEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(secureEmail.trim())) {
      setSecureError(t("login.invalidEmail"));
      return;
    }
    setSecureLoading(true);
    setSecureError("");
    try {
      const res = await fetch(`/api/participants/${currentParticipant!.id}/secure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: securePin, email: secureEmail.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: "Failed" }));
        throw new Error(data.message);
      }
      setShowSecureAccount(false);
      setSecureDismissed(true);
    } catch (e: any) {
      setSecureError(e.message || "Failed");
    } finally {
      setSecureLoading(false);
    }
  };

  const { data: tasting, isLoading: tastingLoading } = useQuery({
    queryKey: ["tasting", id],
    queryFn: () => tastingApi.get(id!),
    enabled: !!id,
    refetchInterval: 3000,
  });

  const { data: whiskyList = [], isLoading: whiskiesLoading } = useQuery({
    queryKey: ["whiskies", id],
    queryFn: () => whiskyApi.getForTasting(id!),
    enabled: !!id,
  });

  const [activeWhiskyId, setActiveWhiskyId] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<"tasting" | "board">("tasting");
  const [focusMode, setFocusMode] = useState(false);
  const [guidedActive, setGuidedActive] = useState(false);
  const [guidedExited, setGuidedExited] = useState(false);

  const reorderMutation = useMutation({
    mutationFn: (order: { id: string; sortOrder: number }[]) => whiskyApi.reorder(id!, order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (whiskyId: string) => whiskyApi.delete(whiskyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", id] });
    },
  });

  const revealPhotoMutation = useMutation({
    mutationFn: ({ whiskyId, revealed }: { whiskyId: string; revealed: boolean }) => whiskyApi.revealPhoto(whiskyId, revealed, currentParticipant.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", id] });
    },
  });

  const revealAllPhotosMutation = useMutation({
    mutationFn: (revealed: boolean) => tastingApi.revealAllPhotos(id!, revealed, currentParticipant.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", id] });
    },
  });

  const toggleCoverRevealMutation = useMutation({
    mutationFn: (revealed: boolean) => tastingApi.toggleCoverImageReveal(id!, currentParticipant.id, revealed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasting", id] });
    },
  });

  const handleMoveWhisky = (whiskyId: string, direction: "up" | "down") => {
    const idx = whiskyList.findIndex((w: Whisky) => w.id === whiskyId);
    if (idx < 0) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= whiskyList.length) return;

    const newOrder = whiskyList.map((w: Whisky, i: number) => {
      if (i === idx) return { id: w.id, sortOrder: newIdx };
      if (i === newIdx) return { id: w.id, sortOrder: idx };
      return { id: w.id, sortOrder: i };
    });
    reorderMutation.mutate(newOrder);
  };

  const handleDeleteWhisky = (whiskyId: string) => {
    if (activeWhiskyId === whiskyId) {
      const idx = whiskyList.findIndex((w: Whisky) => w.id === whiskyId);
      const next = whiskyList[idx + 1] || whiskyList[idx - 1];
      setActiveWhiskyId(next?.id || null);
    }
    deleteMutation.mutate(whiskyId);
  };

  if (!currentParticipant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 px-4">
        <LoginDialog open={showLogin} onClose={() => setShowLogin(false)} />
        <Card className="max-w-sm w-full border-border/50 shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="font-serif text-2xl text-primary flex items-center justify-center gap-2">
              <User className="w-6 h-6" />
              {t("home.quickJoinTitle")}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {t("home.quickJoinDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="font-serif text-sm uppercase tracking-widest text-muted-foreground">{t("login.name")}</Label>
              <Input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder={t("home.namePlaceholder")}
                className="bg-secondary/20"
                autoFocus
                data-testid="input-guest-name"
                onKeyDown={(e) => e.key === "Enter" && handleGuestJoin()}
              />
            </div>
            {guestError && <p className="text-sm text-destructive" data-testid="text-guest-error">{guestError}</p>}
            <Button
              onClick={handleGuestJoin}
              disabled={guestLoading || !guestName.trim()}
              className="w-full bg-primary text-primary-foreground font-serif tracking-wide"
              data-testid="button-guest-join"
            >
              {guestLoading ? t("home.joining") : t("home.joinNow")}
            </Button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowLogin(true)}
                className="text-xs text-muted-foreground hover:text-primary underline transition-colors"
                data-testid="button-switch-to-signin"
              >
                {t("home.haveAccount")}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tastingLoading || whiskiesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground font-serif italic">Loading session...</p>
      </div>
    );
  }

  if (!tasting) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground font-serif">Session not found.</p>
      </div>
    );
  }

  const activeWhisky = whiskyList.find((w: Whisky) => w.id === activeWhiskyId) || whiskyList[0];
  const isHost = tasting.hostId === currentParticipant.id;
  const showAnalytics = tasting.status === "reveal" || tasting.status === "archived";

  const isBlind = tasting.blindMode && (tasting.status === "open" || tasting.status === "closed");
  const revealIndex = tasting.revealIndex ?? 0;
  const revealStep = tasting.revealStep ?? 0;

  const getBlindState = (whiskyIdx: number, whisky?: Whisky) => {
    if (!isBlind) return { showName: true, showMeta: true, showImage: true };
    if (isHost) return { showName: true, showMeta: true, showImage: true };
    if (whiskyIdx < revealIndex) return { showName: true, showMeta: true, showImage: true };
    const photoRevealed = whisky?.photoRevealed ?? false;
    if (whiskyIdx === revealIndex) return {
      showName: revealStep >= 1,
      showMeta: revealStep >= 2,
      showImage: revealStep >= 3 || photoRevealed,
    };
    return { showName: false, showMeta: false, showImage: photoRevealed };
  };

  const isGuidedMode = tasting?.guidedMode && (tasting.status === "open" || tasting.status === "draft");

  if ((guidedActive || (isGuidedMode && !guidedExited)) && tasting && whiskyList.length > 0 && tasting.status === "open") {
    return (
      <GuidedTasting
        tasting={tasting}
        whiskies={whiskyList}
        onExit={() => { setGuidedActive(false); setGuidedExited(true); }}
      />
    );
  }

  if (focusMode && tasting && whiskyList.length > 0) {
    return (
      <FocusedTasting
        tasting={tasting}
        whiskies={whiskyList}
        onExit={() => setFocusMode(false)}
      />
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto overflow-x-hidden">
      <LoginDialog open={showLogin} onClose={() => setShowLogin(false)} />

      <Dialog open={showSecureAccount} onOpenChange={(v) => { if (!v) { setShowSecureAccount(false); setSecureDismissed(true); } }}>
        <DialogContent className="sm:max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-primary flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {t("guestSecure.title")}
            </DialogTitle>
            <DialogDescription>
              {t("guestSecure.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="font-serif text-sm uppercase tracking-widest text-muted-foreground">{t("login.pin")}</Label>
              <Input
                type="password"
                value={securePin}
                onChange={(e) => setSecurePin(e.target.value)}
                placeholder={t("login.pinPlaceholder")}
                maxLength={6}
                className="bg-secondary/20"
                data-testid="input-secure-pin"
              />
              <p className="text-xs text-muted-foreground">{t("guestSecure.pinHint")}</p>
            </div>
            <div className="space-y-2">
              <Label className="font-serif text-sm uppercase tracking-widest text-muted-foreground">
                {t("login.email")} <span className="normal-case tracking-normal text-muted-foreground/60">({t("guestSecure.optional")})</span>
              </Label>
              <Input
                type="email"
                value={secureEmail}
                onChange={(e) => setSecureEmail(e.target.value)}
                placeholder={t("login.emailPlaceholder")}
                className="bg-secondary/20"
                data-testid="input-secure-email"
              />
              <p className="text-xs text-muted-foreground">{t("guestSecure.emailHint")}</p>
            </div>
            {secureError && <p className="text-sm text-destructive" data-testid="text-secure-error">{secureError}</p>}
            <Button
              onClick={handleSecureAccount}
              disabled={secureLoading || !securePin.trim()}
              className="w-full bg-primary text-primary-foreground font-serif tracking-wide"
              data-testid="button-secure-account"
            >
              {secureLoading ? "..." : t("guestSecure.confirm")}
            </Button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => { setShowSecureAccount(false); setSecureDismissed(true); }}
                className="text-xs text-muted-foreground hover:text-primary underline transition-colors"
                data-testid="button-skip-secure"
              >
                {t("guestSecure.skip")}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <header className="mb-8 border-b border-border/50 pb-6">
        {tasting.coverImageUrl && (() => {
          const coverHidden = isBlind && !tasting.coverImageRevealed;
          if (coverHidden) {
            return (
              <div className="relative w-full h-40 sm:h-56 rounded-xl overflow-hidden mb-4">
                <div className="w-full h-full bg-secondary/50 flex flex-col items-center justify-center gap-2" data-testid="cover-hidden-placeholder">
                  <EyeOff className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground font-serif">{t("session.coverImage.hiddenBlind")}</p>
                  {isHost && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => toggleCoverRevealMutation.mutate(true)}
                      disabled={toggleCoverRevealMutation.isPending}
                      data-testid="button-reveal-cover"
                    >
                      <Eye className="w-4 h-4 mr-1" /> {t("session.coverImage.reveal")}
                    </Button>
                  )}
                </div>
              </div>
            );
          }
          return (
            <div className="relative w-full h-40 sm:h-56 rounded-xl overflow-hidden mb-4">
              <img
                src={tasting.coverImageUrl}
                alt={tasting.title}
                className="w-full h-full object-cover"
                data-testid="img-tasting-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
              {isHost && isBlind && tasting.coverImageRevealed && (
                <div className="absolute top-2 right-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 px-2 text-xs"
                    onClick={() => toggleCoverRevealMutation.mutate(false)}
                    disabled={toggleCoverRevealMutation.isPending}
                    data-testid="button-hide-cover"
                  >
                    <EyeOff className="w-3 h-3 mr-1" /> {t("session.coverImage.hide")}
                  </Button>
                </div>
              )}
            </div>
          );
        })()}
        <div className="flex flex-col gap-4">
          <div className="min-w-0 w-full">
            <h1 className="text-2xl sm:text-4xl font-serif font-black text-primary tracking-tight break-words">{tasting.title}</h1>
            <div className="flex items-center gap-2 text-muted-foreground font-serif italic mt-2 text-base sm:text-lg flex-wrap">
              <span>{tasting.location}</span>
              <span>•</span>
              <span>{new Date(tasting.date).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2 min-w-0 w-full md:w-auto">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {isHost && (tasting.status === "draft" || tasting.status === "open") && <EditTastingDialog tasting={tasting} />}
              <PdfExportDialog tasting={tasting} whiskies={whiskyList} />
              {(() => {
                const hasSecondary = isHost || true;
                if (!hasSecondary) return null;
                return (
                  <div className="relative group">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-primary/30 text-primary font-serif"
                      onClick={(e) => {
                        const el = e.currentTarget.nextElementSibling as HTMLElement;
                        if (el) el.classList.toggle("hidden");
                      }}
                      data-testid="button-more-actions"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                    <div className="hidden absolute right-0 top-full mt-1 z-50 bg-card border rounded-lg shadow-lg p-2 min-w-[200px] space-y-1">
                      <div className="flex flex-col gap-1">
                        <DuplicateTastingButton tasting={tasting} />
                        {isHost && <BriefingNotes whiskies={whiskyList} tastingTitle={tasting.title} />}
                        {isHost && <TransferHostDialog tasting={tasting} />}
                        {isHost && tasting.status !== "deleted" && <DeleteTastingButton tasting={tasting} />}
                      </div>
                    </div>
                  </div>
                );
              })()}
              <span className="text-xs font-mono bg-secondary px-2 py-1 rounded text-muted-foreground">Code: {tasting.code}</span>
              <div className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm font-medium border border-border/50">
                {t(`session.status.${tasting.status}`)}
              </div>
            </div>
            <div className="flex items-center gap-1 mt-1">
              {tasting.status === "open" && whiskyList.length > 0 && tasting.guidedMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setGuidedActive(true); setGuidedExited(false); }}
                  className="font-serif text-xs border-primary/30 text-primary mr-2"
                  data-testid="button-guided-mode"
                >
                  <Navigation className="w-3.5 h-3.5 mr-1" />
                  {t("guided.enterGuided")}
                </Button>
              )}
              {tasting.status === "open" && whiskyList.length > 0 && !tasting.guidedMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFocusMode(true)}
                  className="font-serif text-xs border-primary/30 text-primary mr-2"
                  data-testid="button-focus-mode"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  {t("focus.enterFocus")}
                </Button>
              )}
              <Button
                variant={viewTab === "tasting" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewTab("tasting")}
                className={cn("font-serif text-xs", viewTab === "tasting" ? "bg-primary text-primary-foreground" : "")}
                data-testid="tab-tasting"
              >
                {t("nav.tastingRoom")}
              </Button>
              <Button
                variant={viewTab === "board" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewTab("board")}
                className={cn("font-serif text-xs", viewTab === "board" ? "bg-primary text-primary-foreground" : "")}
                data-testid="tab-flight-board"
              >
                <LayoutList className="w-3.5 h-3.5 mr-1" />
                {t("flightBoard.title")}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {viewTab === "board" && (
        <FlightBoard tasting={tasting} whiskies={whiskyList} isHost={isHost} />
      )}

      {viewTab === "tasting" && <>
      {/* Flight Navigation */}
      <div className="space-y-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex overflow-x-auto gap-3 flex-1 no-scrollbar items-center">
            {whiskyList.map((w: Whisky, idx: number) => {
              const blind = getBlindState(idx, w);
              return (
                <button
                  key={w.id}
                  onClick={() => setActiveWhiskyId(w.id)}
                  className={cn(
                    "flex flex-col items-center justify-center min-w-[60px] h-[60px] rounded-full border transition-all duration-500 relative overflow-hidden",
                    (activeWhisky?.id === w.id)
                      ? "border-primary scale-110 shadow-lg z-10 ring-2 ring-primary"
                      : "bg-background border-border hover:border-primary/50 text-muted-foreground"
                  )}
                  data-testid={`button-whisky-${w.id}`}
                >
                  {blind.showImage && w.imageUrl ? (
                    <img src={w.imageUrl} alt={blind.showName ? w.name : `#${idx + 1}`} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <span className="font-serif font-bold text-lg">{idx + 1}</span>
                  )}
                </button>
              );
            })}
          </div>
          {isHost && (tasting.status === "draft" || tasting.status === "open") && (
            <div className="flex gap-2">
              <AddWhiskyDialog tastingId={tasting.id} />
              <ImportFlightDialog tastingId={tasting.id} />
              <CurationWizard tastingId={tasting.id} />
            </div>
          )}
        </div>

        {isHost && (tasting.status === "draft" || tasting.status === "open") && whiskyList.length > 0 && activeWhisky && (
          <div className="flex items-center gap-2 px-1 flex-wrap">
            <span className="text-xs text-muted-foreground font-serif mr-1 truncate max-w-[120px] sm:max-w-none">{activeWhisky.name}</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={whiskyList[0]?.id === activeWhisky.id || reorderMutation.isPending}
              onClick={() => handleMoveWhisky(activeWhisky.id, "up")}
              data-testid="button-move-up"
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={whiskyList[whiskyList.length - 1]?.id === activeWhisky.id || reorderMutation.isPending}
              onClick={() => handleMoveWhisky(activeWhisky.id, "down")}
              data-testid="button-move-down"
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
            <span className="text-[10px] text-muted-foreground/60 italic ml-1">{t("whisky.reorderHint")}</span>
            <div className="flex-1" />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                  data-testid="button-delete-whisky"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  <span className="text-xs">{t("whisky.deleteExpression")}</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-serif text-primary">{t("whisky.deleteConfirmTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("whisky.deleteConfirm")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="font-serif">{t("import.back")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDeleteWhisky(activeWhisky.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-serif"
                    data-testid="button-confirm-delete"
                  >
                    {deleteMutation.isPending ? t("whisky.deleting") : t("whisky.deleteExpression")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {whiskyList.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
          <p className="text-2xl font-serif text-muted-foreground">{t("whisky.noExpressions")}</p>
          {isHost && (
            <p className="text-sm text-muted-foreground">Use "{t("whisky.addExpression")}" above to add whiskies to this flight.</p>
          )}
        </div>
      ) : activeWhisky ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12">
          <div className="lg:col-span-8">
            {(() => {
              const activeIdx = whiskyList.findIndex((w: Whisky) => w.id === activeWhisky.id);
              const blind = getBlindState(activeIdx, activeWhisky);
              return (
                <div className="flex items-center gap-4 mb-6 p-4 bg-card border border-border/50 rounded-lg lg:hidden" data-testid="inline-whisky-header">
                  <div className="flex-shrink-0">
                    {isHost && (tasting.status === "draft" || tasting.status === "open") ? (
                      <QuickImageUpload whisky={activeWhisky} tastingId={tasting.id} size="md" />
                    ) : blind.showImage ? (
                      <WhiskyThumbnail whisky={activeWhisky} size="md" />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-secondary/30 border border-secondary flex items-center justify-center">
                        <span className="font-serif font-bold text-2xl text-muted-foreground">{activeIdx + 1}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif text-xl font-bold text-primary truncate">
                      {blind.showName ? activeWhisky.name : `${t("blind.expressionLabel")} ${activeIdx + 1}`}
                    </h3>
                    {blind.showName && activeWhisky.distillery && (
                      <p className="text-sm text-muted-foreground font-serif italic truncate">{activeWhisky.distillery}</p>
                    )}
                    {blind.showMeta && (
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {activeWhisky.age && <span className="text-xs font-mono text-muted-foreground">{activeWhisky.age === "NAS" || activeWhisky.age === "n.a.s." ? "NAS" : `${activeWhisky.age}y`}</span>}
                        {activeWhisky.abv != null && <span className="text-xs font-mono text-muted-foreground">{activeWhisky.abv}%</span>}
                        {activeWhisky.region && <span className="text-xs text-muted-foreground/70">{activeWhisky.region}</span>}
                      </div>
                    )}
                    {!blind.showName && isBlind && (
                      <p className="text-xs text-muted-foreground font-serif italic">{t("blind.hidden")}</p>
                    )}
                  </div>
                </div>
              );
            })()}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeWhisky.id}-${tasting.status}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                {showAnalytics ? (
                  <RevealView whisky={activeWhisky} tasting={tasting} />
                ) : (
                  <EvaluationForm whisky={activeWhisky} tasting={tasting} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="hidden lg:block lg:col-span-4 space-y-8">
            <div className="sticky top-8 space-y-8">
              {(() => {
                const activeIdx = whiskyList.findIndex((w: Whisky) => w.id === activeWhisky.id);
                const blind = getBlindState(activeIdx, activeWhisky);
                return (
                  <div className="bg-card border border-border/50 shadow-sm p-8 text-center relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50"></div>
                    <div className="mx-auto mb-6">
                      {isHost && (tasting.status === "draft" || tasting.status === "open") ? (
                        <QuickImageUpload whisky={activeWhisky} tastingId={tasting.id} size="lg" />
                      ) : blind.showImage ? (
                        <WhiskyThumbnail whisky={activeWhisky} size="lg" />
                      ) : (
                        <div className="w-40 h-40 rounded-full bg-secondary/30 border border-secondary flex items-center justify-center mx-auto">
                          <span className="font-serif font-bold text-4xl text-muted-foreground">{activeIdx + 1}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="font-serif text-3xl font-bold text-primary">
                        {blind.showName ? activeWhisky.name : `${t("blind.expressionLabel")} ${activeIdx + 1}`}
                      </h3>
                      {!isBlind && <EditWhiskyDialog whisky={activeWhisky} tastingId={tasting.id} isHost={isHost} tastingStatus={tasting.status} />}
                    </div>
                    {blind.showName && (
                      <p className="text-muted-foreground font-serif italic mb-6 text-lg">{activeWhisky.distillery || "Unknown"}</p>
                    )}
                    {!blind.showName && isBlind && (
                      <p className="text-muted-foreground font-serif italic mb-6 text-sm">{t("blind.hidden")}</p>
                    )}
                    {blind.showMeta && (
                      <div className="grid grid-cols-2 gap-4 text-left mt-8 pt-8 border-t border-border/30">
                        <div>
                          <span className="text-xs uppercase tracking-widest text-muted-foreground block mb-1">ABV</span>
                          <span className="font-mono text-lg font-medium">{activeWhisky.abv ? `${activeWhisky.abv}%` : "\u2014"}</span>
                        </div>
                        <div>
                          <span className="text-xs uppercase tracking-widest text-muted-foreground block mb-1">Age</span>
                          <span className="font-mono text-lg font-medium">{activeWhisky.age || "NAS"}</span>
                        </div>
                        {activeWhisky.ppm != null && (
                          <div>
                            <span className="text-xs uppercase tracking-widest text-muted-foreground block mb-1">PPM</span>
                            <span className="font-mono text-lg font-medium">{activeWhisky.ppm}</span>
                          </div>
                        )}
                        {activeWhisky.bottler && (
                          <div>
                            <span className="text-xs uppercase tracking-widest text-muted-foreground block mb-1">{t("whisky.bottler")}</span>
                            <span className="font-mono text-lg font-medium">{activeWhisky.bottler}</span>
                          </div>
                        )}
                        {activeWhisky.vintage && (
                          <div>
                            <span className="text-xs uppercase tracking-widest text-muted-foreground block mb-1">{t("whisky.vintage")}</span>
                            <span className="font-mono text-lg font-medium">{activeWhisky.vintage}</span>
                          </div>
                        )}
                        {activeWhisky.price != null && (
                          <div>
                            <span className="text-xs uppercase tracking-widest text-muted-foreground block mb-1">{t("whisky.price")}</span>
                            <span className="font-mono text-lg font-medium">{activeWhisky.price.toFixed(2)}</span>
                          </div>
                        )}
                        {activeWhisky.wbScore != null && (
                          <div>
                            <span className="text-xs uppercase tracking-widest text-muted-foreground block mb-1">WB Score</span>
                            <span className="font-mono text-lg font-medium text-primary" data-testid="text-wb-score">{activeWhisky.wbScore.toFixed(1)}</span>
                          </div>
                        )}
                        {activeWhisky.whiskybaseId && (
                          <div>
                            <span className="text-xs uppercase tracking-widest text-muted-foreground block mb-1">Whiskybase</span>
                            <a
                              href={`https://www.whiskybase.com/whiskies/whisky/${activeWhisky.whiskybaseId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
                              data-testid="link-whiskybase"
                            >
                              #{activeWhisky.whiskybaseId} <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                    {blind.showMeta && activeWhisky.hostSummary && (
                      <div className="mt-6 pt-4 border-t border-border/30">
                        <span className="text-xs uppercase tracking-widest text-muted-foreground block mb-2">{t("whisky.hostSummary")}</span>
                        <p className="text-sm font-serif italic text-foreground/80 whitespace-pre-wrap" data-testid="text-host-summary">{activeWhisky.hostSummary}</p>
                      </div>
                    )}
                    {isHost && isBlind && activeWhisky.imageUrl && (
                      <div className="mt-6 pt-4 border-t border-border/30 space-y-2">
                        <Button
                          variant={activeWhisky.photoRevealed ? "secondary" : "outline"}
                          size="sm"
                          className="w-full font-serif"
                          onClick={() => revealPhotoMutation.mutate({ whiskyId: activeWhisky.id, revealed: !activeWhisky.photoRevealed })}
                          disabled={revealPhotoMutation.isPending}
                          data-testid="button-reveal-photo"
                        >
                          {activeWhisky.photoRevealed ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                          {activeWhisky.photoRevealed ? t("blind.hidePhoto") : t("blind.revealPhoto")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full font-serif text-xs text-muted-foreground"
                          onClick={() => revealAllPhotosMutation.mutate(!whiskyList.every((w: Whisky) => w.photoRevealed))}
                          disabled={revealAllPhotosMutation.isPending}
                          data-testid="button-reveal-all-photos"
                        >
                          <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                          {whiskyList.every((w: Whisky) => w.photoRevealed) ? t("blind.hideAllPhotos") : t("blind.revealAllPhotos")}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex justify-between gap-4">
                <Button
                  variant="ghost"
                  onClick={() => { const idx = whiskyList.findIndex((w: Whisky) => w.id === activeWhisky.id); if (idx > 0) setActiveWhiskyId(whiskyList[idx-1].id); }}
                  disabled={whiskyList[0]?.id === activeWhisky.id}
                  className="flex-1 border border-border/50 hover:bg-secondary"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" /> Prev
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => { const idx = whiskyList.findIndex((w: Whisky) => w.id === activeWhisky.id); if (idx < whiskyList.length - 1) setActiveWhiskyId(whiskyList[idx+1].id); }}
                  disabled={whiskyList[whiskyList.length-1]?.id === activeWhisky.id}
                  className="flex-1 border border-border/50 hover:bg-secondary"
                >
                  Next <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      </>}

      {tasting.status === "open" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <DiscussionPanel tasting={tasting} />
          <ReflectionPanel tasting={tasting} />
        </div>
      )}

      <AttendeeRoster tastingId={tasting.id} hostId={tasting.hostId} />

      {isHost && <SessionControl tasting={tasting} totalWhiskies={whiskyList.length} />}
      {isHost && (tasting.status === "draft" || tasting.status === "open") && (
        <InvitePanel tastingId={tasting.id} />
      )}
    </div>
  );
}

import { useParams, useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import { FocusedTasting } from "@/components/focused-tasting";
import { OverviewRating } from "@/components/overview-rating";
import { GuidedTasting } from "@/components/guided-tasting";
import { RevealPresenter } from "@/components/reveal-presenter";
import { SessionControl } from "@/components/session-control";
import { LoginDialog } from "@/components/login-dialog";
import { ImportFlightDialog } from "@/components/import-flight-dialog";
import { CurationWizard } from "@/components/curation-wizard";
import { FlightBoard } from "@/components/flight-board";
import { PdfExportDialog } from "@/components/pdf-export-dialog";
import { PrintableTastingSheets } from "@/components/printable-tasting-sheets";
import { BriefingNotes } from "@/components/briefing-notes";
import { AttendeeRoster } from "@/components/attendee-roster";
import { InvitePanel } from "@/components/invite-panel";
import DiscussionPanel from "@/components/discussion-panel";
import ReflectionPanel from "@/components/reflection-panel";
import TastingPhotos from "@/components/tasting-photos";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, Camera, X, ImageIcon, ExternalLink, Pencil, Trash2, LayoutList, Copy, Settings, Eye, EyeOff, UserCog, User, Shield, Mail, MoreHorizontal, Navigation, Loader2, Monitor, Video, Upload, Printer, ScreenShare, Glasses, Rows3, Clock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription } from "@/components/ui/responsive-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { tastingApi, whiskyApi, participantApi } from "@/lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useInputFocused } from "@/hooks/use-input-focused";
import type { Whisky, Tasting } from "@shared/schema";

function EditableTastingTitle({ tasting, isHost }: { tasting: Tasting; isHost: boolean }) {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(tasting.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTitle(tasting.title); }, [tasting.title]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const renameMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      const res = await fetch(`/api/tastings/${tasting.id}/title`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, hostId: currentParticipant?.id }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tastings/${tasting.id}`] });
      queryClient.invalidateQueries({ queryKey: ["tastings"] });
      setEditing(false);
      toast({ title: t("session.titleUpdated") });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === tasting.title) { setEditing(false); setTitle(tasting.title); return; }
    renameMutation.mutate(trimmed);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setEditing(false); setTitle(tasting.title); } }}
          className="text-2xl sm:text-4xl font-serif font-black text-primary tracking-tight h-auto py-1 px-2"
          data-testid="input-tasting-title"
        />
        <Button size="icon" variant="ghost" onClick={handleSave} disabled={renameMutation.isPending} data-testid="button-save-title">
          <Check className="w-5 h-5 text-green-600" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setTitle(tasting.title); }} data-testid="button-cancel-title">
          <X className="w-5 h-5 text-muted-foreground" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      <h1 className="text-2xl sm:text-4xl font-serif font-black text-primary tracking-tight break-words">{tasting.title}</h1>
      {isHost && (
        <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary" data-testid="button-edit-title">
          <Pencil className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function TastingTimestamps({ tasting }: { tasting: Tasting }) {
  const { t } = useTranslation();
  const fmt = (d: Date | string | null | undefined) => {
    if (!d) return null;
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) + ", " + date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  const items = [
    { label: t("session.timestamps.created"), value: fmt(tasting.createdAt) },
    { label: t("session.timestamps.opened"), value: fmt((tasting as any).openedAt) },
    { label: t("session.timestamps.closed"), value: fmt((tasting as any).closedAt) },
    { label: t("session.timestamps.revealed"), value: fmt((tasting as any).revealedAt) },
    { label: t("session.timestamps.archived"), value: fmt((tasting as any).archivedAt) },
  ].filter(i => i.value);

  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-3 mt-2 flex-wrap text-[11px] text-muted-foreground/70">
      <Clock className="w-3 h-3 shrink-0" />
      {items.map((item, i) => (
        <span key={i}>
          {item.label}: {item.value}
          {i < items.length - 1 && <span className="ml-3">•</span>}
        </span>
      ))}
    </div>
  );
}

function QuickImageUpload({ whisky, tastingId, size = "lg" }: { whisky: Whisky; tastingId: string; size?: "md" | "lg" }) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const dim = size === "lg" ? "w-40 h-40" : "w-20 h-20";
  const iconSize = size === "lg" ? "w-8 h-8" : "w-5 h-5";

  useEffect(() => {
    if (whisky.imageUrl && localPreview) {
      URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
    }
  }, [whisky.imageUrl, localPreview]);

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
    if (localPreview) URL.revokeObjectURL(localPreview);
    const previewUrl = URL.createObjectURL(file);
    setLocalPreview(previewUrl);
    setUploading(true);
    try {
      const updated = await whiskyApi.uploadImage(whisky.id, file);
      queryClient.setQueryData(["whiskies", tastingId], (old: Whisky[] | undefined) => {
        if (!old) return old;
        return old.map((w: Whisky) => w.id === whisky.id ? { ...w, imageUrl: updated.imageUrl } : w);
      });
      queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
      toast({ title: t("whisky.photoUploaded") });
    } catch {
      if (localPreview) URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
      toast({ title: t("whisky.photoUploadError"), variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const displayWhisky = localPreview ? { ...whisky, imageUrl: localPreview } : whisky;

  return (
    <div className="relative group/img mx-auto">
      <WhiskyThumbnail whisky={displayWhisky} size={size} />
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
    <ResponsiveDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }} trigger={
        <Button variant="outline" size="sm" className="border-primary/30 text-primary font-serif" data-testid="button-add-whisky">
          <Plus className="w-4 h-4 mr-1" /> {t("whisky.addExpression")}
        </Button>
      }>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="font-serif text-2xl text-primary">{t("whisky.addExpression")}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
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
      </ResponsiveDialogContent>
    </ResponsiveDialog>
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
    <ResponsiveDialog open={open} onOpenChange={(v) => { if (v) populateForm(); setOpen(v); }} trigger={
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" data-testid="button-edit-whisky">
          <Pencil className="w-4 h-4" />
        </Button>
      }>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="font-serif text-2xl text-primary">{t("whisky.editExpression")}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
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
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function EditTastingDialog({ tasting }: { tasting: Tasting }) {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", location: "", videoLink: "", blindMode: false });
  const [coverUploading, setCoverUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open && tasting) {
      setForm({ title: tasting.title, date: tasting.date, location: tasting.location, videoLink: tasting.videoLink || "", blindMode: tasting.blindMode ?? false });
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
      const hasChanges = form.title !== tasting.title || form.date !== tasting.date || form.location !== tasting.location || form.videoLink !== (tasting.videoLink || "") || form.blindMode !== (tasting.blindMode ?? false);
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
    <ResponsiveDialog open={open} onOpenChange={handleDialogClose} trigger={
        <Button variant="outline" size="sm" className="border-primary/30 text-primary font-serif" data-testid="button-edit-tasting">
          <Settings className="w-4 h-4 mr-1" /> {t("session.actions.editDetails")}
        </Button>
      }>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="font-serif text-2xl text-primary">{t("session.actions.editDetailsTitle")}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="flex items-center gap-1 text-xs">
            {updateMutation.isPending ? (
              <span className="text-muted-foreground">{t("session.actions.autoSaving")}</span>
            ) : saved ? (
              <span className="text-green-600">{t("session.actions.autoSaved")}</span>
            ) : (
              <span className="text-muted-foreground">{t("session.actions.autoSaveHint")}</span>
            )}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
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
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">{t("session.videoLink", "Video Link")}</Label>
            <Input value={form.videoLink} onChange={(e) => handleFormChange("videoLink", e.target.value)} placeholder="https://zoom.us/j/..." className="bg-secondary/20" data-testid="input-edit-video-link" />
            <p className="text-xs text-muted-foreground mt-1">{t("session.videoLinkHint", "Zoom, Teams, Google Meet etc.")}</p>
          </div>
          {(tasting.status === "draft" || tasting.status === "open") && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/30">
              <div className="flex items-center gap-2">
                <Glasses className="w-4 h-4 text-muted-foreground" />
                <div>
                  <Label className="text-xs font-medium">{t("sessionSettings.blindMode")}</Label>
                  <p className="text-[10px] text-muted-foreground leading-tight">{t("sessionSettings.blindModeDesc")}</p>
                </div>
              </div>
              <Switch
                checked={form.blindMode}
                onCheckedChange={(v) => {
                  const newForm = { ...form, blindMode: v };
                  setForm(newForm);
                  triggerAutoSave(newForm);
                }}
                data-testid="switch-edit-blind-mode"
              />
            </div>
          )}
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
      </ResponsiveDialogContent>
    </ResponsiveDialog>
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
    <ResponsiveDialog open={open} onOpenChange={setOpen} trigger={
        <Button variant="outline" size="sm" className="border-primary/30 text-primary font-serif" data-testid="button-transfer-host">
          <UserCog className="w-4 h-4 mr-1" /> {t("session.transferHost.button")}
        </Button>
      }>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="font-serif text-xl text-primary">{t("session.transferHost.title")}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{t("session.transferHost.description")}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
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
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function MoreActionsMenu({ tasting, whiskyList, isHost }: { tasting: Tasting; whiskyList: Whisky[]; isHost: boolean }) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const content = (
    <div className="flex flex-col gap-1">
      <PrintableTastingSheets tasting={tasting} whiskies={whiskyList} />
      <DuplicateTastingButton tasting={tasting} />
      {isHost && <BriefingNotes whiskies={whiskyList} tastingTitle={tasting.title} />}
      {isHost && <TransferHostDialog tasting={tasting} />}
      {isHost && tasting.status !== "deleted" && <DeleteTastingButton tasting={tasting} />}
    </div>
  );

  if (isMobile) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          className="border-primary/30 text-primary font-serif"
          onClick={() => setOpen(true)}
          data-testid="button-more-actions"
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle className="font-serif text-primary">{t("session.actions.moreActions", "Weitere Aktionen")}</DrawerTitle>
              <DrawerDescription className="sr-only">{t("session.actions.moreActions", "Weitere Aktionen")}</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6">
              {content}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

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
        {content}
      </div>
    </div>
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

  const inputFocused = useInputFocused();

  const { data: tasting, isLoading: tastingLoading } = useQuery({
    queryKey: ["tasting", id],
    queryFn: () => tastingApi.get(id!),
    enabled: !!id,
    refetchInterval: inputFocused ? false : 3000,
  });

  const { data: whiskyList = [], isLoading: whiskiesLoading } = useQuery({
    queryKey: ["whiskies", id],
    queryFn: () => whiskyApi.getForTasting(id!),
    enabled: !!id,
    refetchInterval: inputFocused ? false : 5000,
  });

  const { data: activePresence = [] } = useQuery({
    queryKey: ["presence", id],
    queryFn: () => tastingApi.getPresence(id!),
    enabled: !!id && !!currentParticipant,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (!id || !currentParticipant) return;
    tastingApi.heartbeat(id, currentParticipant.id).catch(() => {});
    const interval = setInterval(() => {
      tastingApi.heartbeat(id, currentParticipant.id).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [id, currentParticipant]);

  const [focusMode, setFocusMode] = useState(false);
  const [overviewMode, setOverviewMode] = useState(false);
  const [guidedActive, setGuidedActive] = useState(false);
  const [guidedExited, setGuidedExited] = useState(false);
  const [presenterActive, setPresenterActive] = useState(false);
  const [presenterExited, setPresenterExited] = useState(false);

  useEffect(() => {
    const handler = () => {
      setFocusMode(false);
      setOverviewMode(false);
      setGuidedActive(false);
      setPresenterActive(false);
    };
    window.addEventListener("casksense:exitFocusMode", handler);
    return () => window.removeEventListener("casksense:exitFocusMode", handler);
  }, []);


  const toggleCoverRevealMutation = useMutation({
    mutationFn: (revealed: boolean) => tastingApi.toggleCoverImageReveal(id!, currentParticipant.id, revealed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasting", id] });
    },
  });

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

  const isHost = tasting.hostId === currentParticipant.id;

  const isBlind = tasting.blindMode && (tasting.status === "draft" || tasting.status === "open" || tasting.status === "closed");
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

  if (overviewMode && tasting && whiskyList.length > 0) {
    return (
      <OverviewRating
        tasting={tasting}
        whiskies={whiskyList}
        onExit={() => setOverviewMode(false)}
        getBlindState={getBlindState}
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

  const isRevealPhase = tasting.status === "reveal";
  const shouldAutoPresenter = isRevealPhase && isHost && !presenterExited;

  if ((presenterActive || shouldAutoPresenter) && tasting && whiskyList.length > 0 && isRevealPhase) {
    return (
      <RevealPresenter
        tasting={tasting}
        whiskies={whiskyList}
        onExit={() => { setPresenterActive(false); setPresenterExited(true); }}
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
            <EditableTastingTitle tasting={tasting} isHost={isHost} />
            <div className="flex items-center gap-2 text-muted-foreground font-serif italic mt-2 text-base sm:text-lg flex-wrap">
              <span>{tasting.location}</span>
              <span>•</span>
              <span>{new Date(tasting.date).toLocaleDateString()}</span>
              {tasting.videoLink && (
                <>
                  <span>•</span>
                  <a href={tasting.videoLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline not-italic text-sm" data-testid="link-video-call">
                    <Video className="w-4 h-4" />
                    {t("session.joinVideoCall", "Join Video Call")}
                  </a>
                </>
              )}
            </div>
            {activePresence.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1" data-testid="presence-indicator">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {activePresence.length} {t("session.presence.online", "online")}
                </span>
              </div>
            )}
            <TastingTimestamps tasting={tasting} />
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2 min-w-0 w-full md:w-auto">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {isHost && (tasting.status === "draft" || tasting.status === "open") && <EditTastingDialog tasting={tasting} />}
              {isHost && (tasting.status === "draft" || tasting.status === "open") && <InvitePanel tastingId={tasting.id} />}
              <PdfExportDialog tasting={tasting} whiskies={whiskyList} />
              <MoreActionsMenu tasting={tasting} whiskyList={whiskyList} isHost={isHost} />
              <span className="text-xs font-mono bg-secondary px-2 py-1 rounded text-muted-foreground">Code: {tasting.code}</span>
              <div className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm font-medium border border-border/50">
                {t(`session.status.${tasting.status}`)}
              </div>
            </div>
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {isRevealPhase && (isHost ? presenterExited : true) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setPresenterActive(true); setPresenterExited(false); }}
                  className="font-serif text-xs border-primary/30 text-primary mr-1"
                  data-testid="button-presenter-mode"
                >
                  <Monitor className="w-3.5 h-3.5 mr-1" />
                  {t("presenter.enterPresenter")}
                </Button>
              )}
              {tasting.status === "open" && whiskyList.length > 0 && tasting.guidedMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setGuidedActive(true); setGuidedExited(false); }}
                  className="font-serif text-xs border-primary/30 text-primary mr-1"
                  data-testid="button-guided-mode"
                >
                  <Navigation className="w-3.5 h-3.5 mr-1" />
                  {t("guided.enterGuided")}
                </Button>
              )}
              <div className="flex items-center bg-secondary/50 rounded-lg p-0.5 border border-border/30">
                <div className="font-serif text-xs rounded-md h-7 px-3 flex items-center bg-primary text-primary-foreground shadow-sm">
                  <LayoutList className="w-3.5 h-3.5 mr-1" />
                  {t("flightBoard.title")}
                </div>
                {tasting.status === "open" && whiskyList.length > 0 && !tasting.guidedMode && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setOverviewMode(true)}
                      className="font-serif text-xs rounded-md h-7 text-primary font-semibold hover:bg-primary/10"
                      data-testid="button-overview-mode"
                    >
                      <Rows3 className="w-3.5 h-3.5 mr-1" />
                      {t("overview.enterOverview", "Alle bewerten")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFocusMode(true)}
                      className="font-serif text-xs rounded-md h-7 text-primary font-semibold hover:bg-primary/10"
                      data-testid="button-focus-mode"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      {t("focus.enterFocus")}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <FlightBoard tasting={tasting} whiskies={whiskyList} isHost={isHost} getBlindState={getBlindState} />


      {tasting.status === "open" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <DiscussionPanel tasting={tasting} />
          <ReflectionPanel tasting={tasting} />
        </div>
      )}

      {(tasting.status === "open" || tasting.status === "reveal" || tasting.status === "closed") && (
        <TastingPhotos tastingId={tasting.id} isHost={isHost} whiskies={whiskyList} />
      )}

      <AttendeeRoster tastingId={tasting.id} hostId={tasting.hostId} />

      {isHost && <SessionControl tasting={tasting} totalWhiskies={whiskyList.length} />}

      {tasting.status === "open" && whiskyList.length > 0 && !tasting.guidedMode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn("fixed right-6 z-40", isHost ? "bottom-[7.5rem] md:bottom-24" : "bottom-20 md:bottom-8")}
          data-testid="floating-am-glas-cta"
        >
          <Button
            size="lg"
            onClick={() => setFocusMode(true)}
            className="rounded-full shadow-lg font-serif text-sm gap-2 px-6 h-12 bg-primary hover:bg-primary/90"
            data-testid="button-floating-am-glas"
          >
            <Eye className="w-4 h-4" />
            {t("focus.enterFocus")}
          </Button>
        </motion.div>
      )}
    </div>
  );
}

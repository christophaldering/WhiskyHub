import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { profileApi, participantApi, participantUpdateApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Camera, X, User, KeyRound, Mail, Trash2, AlertTriangle, Layers, Target, FileText, Sparkles, Eye, EyeOff, Bot } from "lucide-react";
import { GuestPreview } from "@/components/guest-preview";
import type { UIMode } from "@/lib/store";
import { cn } from "@/lib/utils";

const REGIONS = [
  "Speyside", "Highlands", "Islay", "Lowlands", "Campbeltown",
  "Islands", "Ireland", "Japan", "USA", "Taiwan", "Other",
];

const PEAT_LEVELS = ["None", "Light", "Medium", "Heavy"];
const CASK_TYPES = ["Bourbon", "Sherry", "Port", "Wine", "Rum", "Other"];

export default function Profile() {
  const { t } = useTranslation();
  const { currentParticipant, setParticipant, uiMode, setUIMode } = useAppStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [favoriteWhisky, setFavoriteWhisky] = useState("");
  const [goToDram, setGoToDram] = useState("");
  const [preferredRegions, setPreferredRegions] = useState<string[]>([]);
  const [preferredPeatLevel, setPreferredPeatLevel] = useState("");
  const [preferredCaskInfluence, setPreferredCaskInfluence] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", currentParticipant?.id],
    queryFn: () => profileApi.get(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const { data: participant, isLoading: participantLoading } = useQuery({
    queryKey: ["participant", currentParticipant?.id],
    queryFn: () => participantApi.get(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const { data: insightData } = useQuery({
    queryKey: ["insights", currentParticipant?.id],
    queryFn: async () => {
      const res = await fetch(`/api/participants/${currentParticipant!.id}/insights`, { headers: { "x-participant-id": currentParticipant!.id } });
      if (!res.ok) return { insight: null };
      return res.json();
    },
    enabled: !!currentParticipant,
    staleTime: 300_000,
  });

  useEffect(() => {
    if (profile) {
      setBio(profile.bio || "");
      setFavoriteWhisky(profile.favoriteWhisky || "");
      setGoToDram(profile.goToDram || "");
      setPreferredRegions(profile.preferredRegions || []);
      setPreferredPeatLevel(profile.preferredPeatLevel || "");
      setPreferredCaskInfluence(profile.preferredCaskInfluence || "");
      setOpenaiApiKey(profile.openaiApiKey || "");
    }
  }, [profile]);

  useEffect(() => {
    if (participant) {
      setDisplayName(participant.name || "");
      setEmail(participant.email || "");
      setNewsletterOptIn(participant.newsletterOptIn || false);
    }
  }, [participant]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!currentParticipant) return;

      if (removePhoto && !photoFile) {
        await profileApi.deletePhoto(currentParticipant.id);
      }
      if (photoFile) {
        await profileApi.uploadPhoto(currentParticipant.id, photoFile);
      }

      await profileApi.update(currentParticipant.id, {
        bio,
        favoriteWhisky,
        goToDram,
        preferredRegions,
        preferredPeatLevel,
        preferredCaskInfluence,
        openaiApiKey: openaiApiKey.trim() || null,
      });

      const participantUpdates: any = {};
      if (displayName.trim() && displayName !== participant?.name) {
        participantUpdates.name = displayName.trim();
      }
      if (email !== (participant?.email || "")) {
        participantUpdates.email = email;
      }
      if (newsletterOptIn !== (participant?.newsletterOptIn || false)) {
        participantUpdates.newsletterOptIn = newsletterOptIn;
      }

      if (newPin) {
        if (newPin.length < 4) {
          throw new Error("PIN must be at least 4 characters");
        }
        if (newPin !== confirmPin) {
          throw new Error(t("profile.pinMismatch"));
        }
        if (!currentPin) {
          throw new Error(t("profile.currentPinRequired"));
        }
        participantUpdates.currentPin = currentPin;
        participantUpdates.pin = newPin;
      }

      if (Object.keys(participantUpdates).length > 0) {
        const updated = await participantUpdateApi.update(currentParticipant.id, participantUpdates);
        if (updated.name !== currentParticipant.name) {
          setParticipant({ ...currentParticipant, name: updated.name });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", currentParticipant?.id] });
      queryClient.invalidateQueries({ queryKey: ["participant", currentParticipant?.id] });
      setPhotoFile(null);
      setPhotoPreview(null);
      setRemovePhoto(false);
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      toast({ title: t("profile.saved") });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const [deleteStep, setDeleteStep] = useState(0);
  const [deletePin, setDeletePin] = useState("");
  const [deletePinError, setDeletePinError] = useState("");

  const deleteMutation = useMutation({
    mutationFn: async (pin: string) => {
      if (!currentParticipant) return;
      const res = await fetch(`/api/participants/${currentParticipant.id}/anonymize`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-participant-id": currentParticipant.id },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Request failed" }));
        if (res.status === 403) {
          throw new Error("INVALID_PIN");
        }
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("profile.deleteAccountSuccess") });
      setParticipant(null);
      navigate("/");
    },
    onError: (error: Error) => {
      if (error.message === "INVALID_PIN") {
        setDeletePinError(t("account.closeAccountPinWrong"));
      } else {
        toast({ title: error.message, variant: "destructive" });
      }
    },
  });

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      toast({ title: t("common.uploadInvalidType"), variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: t("common.uploadTooLarge"), variant: "destructive" });
      return;
    }
    setPhotoFile(file);
    setRemovePhoto(false);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setRemovePhoto(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleRegion = (region: string) => {
    setPreferredRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
  };

  const currentPhotoUrl = removePhoto ? null : (photoPreview || profile?.photoUrl);

  if (!currentParticipant) {
    return (
      <GuestPreview featureTitle={t("profile.title")} featureDescription={t("guestPreview.profile")}>
        <div className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-serif text-primary">JD</div>
            <div><h2 className="text-xl font-serif font-semibold">Jane Doe</h2><p className="text-sm text-muted-foreground">Whisky Explorer · Member since 2024</p></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[{label: "Tastings", value: "24"}, {label: "Whiskies", value: "87"}, {label: "Avg Rating", value: "8.2"}, {label: "Badges", value: "12"}].map(s => (
              <div key={s.label} className="bg-card rounded-xl border p-4 text-center"><div className="text-2xl font-serif font-bold text-primary">{s.value}</div><div className="text-xs text-muted-foreground mt-1">{s.label}</div></div>
            ))}
          </div>
          <div className="bg-card rounded-xl border p-6"><h3 className="font-serif font-semibold mb-2">Favorite Regions</h3><div className="flex gap-2 flex-wrap">{["Islay","Speyside","Highland","Campbeltown"].map(r => <span key={r} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">{r}</span>)}</div></div>
        </div>
      </GuestPreview>
    );
  }

  if (profileLoading || participantLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto py-10 px-4 space-y-6 min-w-0 overflow-x-hidden">
      <Card className="w-full border-border/50 bg-card shadow-sm">
        <CardHeader>
          <h1 className="font-serif text-xl sm:text-3xl text-primary tracking-tight" data-testid="text-profile-title">
            {t("profile.title")}
          </h1>
        </CardHeader>

        <CardContent className="space-y-8">
          {insightData?.insight && (
            <div
              className="rounded-lg border px-4 py-3 flex items-start gap-3"
              style={{ borderColor: "#d4a256", background: "rgba(212,162,86,0.06)" }}
              data-testid="card-taste-insight"
            >
              <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#d4a256" }} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#d4a256" }}>
                  Taste Insight
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {insightData.insight.message}
                </p>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              {t("profile.photo")}
            </Label>
            <div className="flex items-center gap-4">
              <div
                className="relative cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-avatar-upload"
              >
                <Avatar className="w-24 h-24 border-2 border-primary/20">
                  {currentPhotoUrl ? (
                    <AvatarImage src={currentPhotoUrl} alt={currentParticipant.name} />
                  ) : null}
                  <AvatarFallback className="bg-secondary/30 text-primary text-2xl font-serif">
                    {currentParticipant.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handlePhotoSelect}
                className="hidden"
                data-testid="input-profile-photo"
              />
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-serif"
                  data-testid="button-upload-photo"
                >
                  <Camera className="w-3 h-3 mr-1" />
                  {currentPhotoUrl ? t("profile.changePhoto") : t("profile.uploadPhoto")}
                </Button>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{t("common.uploadHint")}</p>
                {currentPhotoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemovePhoto}
                    className="text-xs text-destructive"
                    data-testid="button-remove-photo"
                  >
                    <X className="w-3 h-3 mr-1" />
                    {t("profile.removePhoto")}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-border/30 pt-6">
            <h2 className="font-serif text-lg text-primary mb-4 flex items-center gap-2">
              <User className="w-4 h-4" />
              {t("profile.accountDetails")}
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  {t("profile.name")}
                </Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("profile.namePlaceholder")}
                  className="bg-secondary/20"
                  data-testid="input-display-name"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  {t("profile.email")}
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setConfirmEmail(""); }}
                  placeholder={t("profile.emailPlaceholder")}
                  className="bg-secondary/20"
                  data-testid="input-email"
                />
              </div>

              {email !== (participant?.email || "") && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                    Confirm Email
                  </Label>
                  <Input
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder="Repeat new email"
                    className={cn("bg-secondary/20", confirmEmail && confirmEmail !== email && "border-destructive")}
                    data-testid="input-confirm-email"
                  />
                  {confirmEmail && confirmEmail !== email && (
                    <p className="text-xs text-destructive">Emails don't match</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border/30 pt-6">
            <h2 className="font-serif text-lg text-primary mb-4 flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              {t("profile.newPin")}
            </h2>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  {t("profile.currentPin")}
                </Label>
                <Input
                  type="password"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  placeholder={t("profile.currentPinPlaceholder")}
                  maxLength={6}
                  className="bg-secondary/20"
                  data-testid="input-current-pin"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  {t("profile.newPin")}
                </Label>
                <Input
                  type="password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder={t("profile.newPinPlaceholder")}
                  maxLength={6}
                  className="bg-secondary/20"
                  data-testid="input-new-pin"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  {t("profile.confirmPin")}
                </Label>
                <Input
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder={t("profile.confirmPinPlaceholder")}
                  maxLength={6}
                  className="bg-secondary/20"
                  data-testid="input-confirm-pin"
                />
              </div>
            </div>
            {newPin && confirmPin && newPin !== confirmPin && (
              <p className="text-xs text-destructive mt-2" data-testid="text-pin-mismatch">
                {t("profile.pinMismatch")}
              </p>
            )}
          </div>

          <div className="border-t border-border/30 pt-6">
            <h2 className="font-serif text-lg text-primary mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {t("profile.newsletterLabel")}
            </h2>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="newsletter-profile"
                checked={newsletterOptIn}
                onCheckedChange={(checked) => setNewsletterOptIn(checked === true)}
                data-testid="checkbox-newsletter-profile"
              />
              <div className="grid gap-0.5 leading-none">
                <label
                  htmlFor="newsletter-profile"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  {t("profile.newsletterOptIn")}
                </label>
                <p className="text-xs text-muted-foreground">
                  {t("profile.newsletterHint")}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-border/30 pt-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("profile.bio")}
              </Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 400))}
                placeholder={t("profile.bioPlaceholder")}
                className="bg-secondary/20 min-h-[100px] resize-none"
                maxLength={400}
                data-testid="input-bio"
              />
              <p className="text-xs text-muted-foreground text-right" data-testid="text-bio-counter">
                {bio.length}/400
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("profile.favoriteWhisky")}
              </Label>
              <Input
                value={favoriteWhisky}
                onChange={(e) => setFavoriteWhisky(e.target.value)}
                placeholder={t("profile.favoritePlaceholder")}
                className="bg-secondary/20"
                data-testid="input-favorite-whisky"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("profile.goToDram")}
              </Label>
              <Input
                value={goToDram}
                onChange={(e) => setGoToDram(e.target.value)}
                placeholder={t("profile.goToDramPlaceholder")}
                className="bg-secondary/20"
                data-testid="input-go-to-dram"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("profile.preferredRegions")}
              </Label>
              <div className="flex flex-wrap gap-2" data-testid="select-regions">
                {REGIONS.map((region) => (
                  <Badge
                    key={region}
                    variant={preferredRegions.includes(region) ? "default" : "outline"}
                    className="cursor-pointer select-none transition-all"
                    onClick={() => toggleRegion(region)}
                    data-testid={`badge-region-${region.toLowerCase()}`}
                  >
                    {region}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("profile.preferredPeatLevel")}
              </Label>
              <Select value={preferredPeatLevel} onValueChange={setPreferredPeatLevel}>
                <SelectTrigger className="bg-secondary/20" data-testid="select-peat-level">
                  <SelectValue placeholder={t("profile.selectPeat")} />
                </SelectTrigger>
                <SelectContent>
                  {PEAT_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("profile.preferredCaskInfluence")}
              </Label>
              <Select value={preferredCaskInfluence} onValueChange={setPreferredCaskInfluence}>
                <SelectTrigger className="bg-secondary/20" data-testid="select-cask-influence">
                  <SelectValue placeholder={t("profile.selectCask")} />
                </SelectTrigger>
                <SelectContent>
                  {CASK_TYPES.map((cask) => (
                    <SelectItem key={cask} value={cask}>{cask}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t border-border/30 pt-6">
            <h2 className="font-serif text-lg text-primary mb-2 flex items-center gap-2">
              <Bot className="w-4 h-4" />
              AI Settings
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Add your own OpenAI API key to enable AI features like whisky identification, tasting notes, and more. Your key is stored securely and only used for your requests.
            </p>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                OpenAI API Key
              </Label>
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="bg-secondary/20 pr-10 font-mono text-sm"
                  data-testid="input-openai-key"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-toggle-key-visibility"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {openaiApiKey && (
                <button
                  type="button"
                  onClick={() => setOpenaiApiKey("")}
                  className="text-xs text-destructive hover:underline"
                  data-testid="button-clear-api-key"
                >
                  Remove API key
                </button>
              )}
              <p className="text-[10px] text-muted-foreground">
                Get your key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">platform.openai.com</a>. Costs are billed directly to your OpenAI account.
              </p>
            </div>
          </div>

          <div className="border-t border-border/30 pt-6">
            <h2 className="font-serif text-lg text-primary mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              {t("profile.tastingInterfaceMode")}
            </h2>
            <p className="text-xs text-muted-foreground mb-4">{t("profile.tastingInterfaceModeDesc")}</p>
            <div className="grid grid-cols-3 gap-3" data-testid="ui-mode-selector">
              {([
                { key: "flow" as UIMode, icon: Layers, label: t("profile.uiModeFlow"), desc: t("profile.uiModeFlowDesc"), isDefault: true },
                { key: "focus" as UIMode, icon: Target, label: t("profile.uiModeFocus"), desc: t("profile.uiModeFocusDesc"), isDefault: false },
                { key: "journal" as UIMode, icon: FileText, label: t("profile.uiModeJournal"), desc: t("profile.uiModeJournalDesc"), isDefault: false },
              ]).map(m => {
                const Icon = m.icon;
                const selected = uiMode === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => setUIMode(m.key)}
                    className={cn(
                      "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center",
                      selected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/30 bg-card/50 hover:border-primary/30"
                    )}
                    data-testid={`button-ui-mode-${m.key}`}
                  >
                    {m.isDefault && (
                      <span className="absolute -top-2 right-2 text-[8px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                        {t("profile.uiModeDefault")}
                      </span>
                    )}
                    <Icon className={cn("w-6 h-6", selected ? "text-primary" : "text-muted-foreground")} />
                    <span className={cn("text-sm font-serif font-bold", selected ? "text-primary" : "text-foreground")}>{m.label}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">{m.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || (newPin !== "" && newPin !== confirmPin) || (email !== (participant?.email || "") && email !== confirmEmail)}
            className="w-full bg-primary text-primary-foreground font-serif tracking-wide"
            data-testid="button-save-profile"
          >
            {saveMutation.isPending ? t("profile.saving") : t("profile.save")}
          </Button>
        </CardContent>
      </Card>

      <Card className="w-full border-destructive/30 bg-card shadow-sm">
        <CardHeader>
          <h2 className="font-serif text-lg text-destructive flex items-center gap-2" data-testid="text-danger-zone">
            <Trash2 className="w-4 h-4" />
            {t("profile.dangerZone")}
          </h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {t("profile.deleteAccountDesc")}
          </p>
          <AlertDialog open={deleteStep === 1} onOpenChange={(open) => { if (!open) setDeleteStep(0); }}>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="font-serif"
                onClick={() => setDeleteStep(1)}
                data-testid="button-delete-account"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t("profile.deleteAccount")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("account.closeAccountConfirm")}</AlertDialogTitle>
                <AlertDialogDescription>{t("account.closeAccountWarning")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteStep(0)} data-testid="button-delete-account-cancel">
                  {t("profile.deleteAccountCancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => { setDeleteStep(2); setDeletePin(""); setDeletePinError(""); }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="button-delete-account-step1"
                >
                  {t("account.closeAccountContinue")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog open={deleteStep === 2} onOpenChange={(open) => { if (!open) { setDeleteStep(0); setDeletePin(""); setDeletePinError(""); } }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("account.closeAccountPinTitle")}</AlertDialogTitle>
                <AlertDialogDescription>{t("account.closeAccountPinDesc")}</AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-2">
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder={t("account.closeAccountPinPlaceholder")}
                  value={deletePin}
                  onChange={(e) => { setDeletePin(e.target.value.replace(/\D/g, "").slice(0, 4)); setDeletePinError(""); }}
                  className={deletePinError ? "border-destructive" : ""}
                  data-testid="input-delete-pin"
                />
                {deletePinError && (
                  <p className="text-xs text-destructive mt-1.5" data-testid="text-delete-pin-error">{deletePinError}</p>
                )}
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => { setDeleteStep(0); setDeletePin(""); setDeletePinError(""); }} data-testid="button-delete-account-cancel-step2">
                  {t("account.cancel")}
                </AlertDialogCancel>
                <Button
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(deletePin)}
                  disabled={deleteMutation.isPending || deletePin.length !== 4}
                  data-testid="button-delete-account-confirm"
                >
                  {deleteMutation.isPending ? "..." : t("account.closeAccountButton")}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

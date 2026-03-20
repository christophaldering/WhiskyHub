import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SkeletonList } from "@/labs/components/LabsSkeleton";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import { useAppStore } from "@/lib/store";
import { signOut, updateSessionPhotoUrl } from "@/lib/session";
import { profileApi, participantApi, participantUpdateApi, tastingApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { useLabsBack } from "@/labs/LabsLayout";
import { downloadBlob } from "@/lib/download";
import { useRatingScale } from "@/labs/hooks/useRatingScale";
import ScaleBadge from "@/labs/components/ScaleBadge";
import {
  ChevronLeft, User, Settings, Shield, Sparkles, Trash2, LogOut,
  Loader2, Eye, EyeOff, Camera, ExternalLink,
} from "lucide-react";

const REGIONS = ["Speyside", "Highlands", "Islay", "Lowlands", "Campbeltown", "Islands", "Ireland", "Japan", "USA", "Taiwan", "Other"];
const PEAT_LEVELS = ["None", "Light", "Medium", "Heavy"];
const CASK_TYPES = ["Bourbon", "Sherry", "Port", "Wine", "Rum", "Other"];

export default function LabsTasteSettings() {
  const { t, i18n } = useTranslation();
  const { currentParticipant, setParticipant } = useAppStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const goBack = useLabsBack("/labs/taste");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
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
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [friendNotificationsEnabled, setFriendNotificationsEnabled] = useState(true);
  const [preferredRatingScale, setPreferredRatingScale] = useState<number | null>(null);
  const activeScale = useRatingScale();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletePin, setDeletePin] = useState("");
  const [deletePinError, setDeletePinError] = useState("");

  const pid = currentParticipant?.id;

  const { data: appSettings } = useQuery({
    queryKey: ["app-settings-public"],
    queryFn: () => fetch("/api/app-settings/public").then(r => r.json()),
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", pid],
    queryFn: () => profileApi.get(pid!),
    enabled: !!pid,
  });

  const { data: participant, isLoading: participantLoading } = useQuery({
    queryKey: ["participant", pid],
    queryFn: () => participantApi.get(pid!),
    enabled: !!pid,
  });

  useEffect(() => {
    if (profile) {
      setBio(profile.bio || ""); setFavoriteWhisky(profile.favoriteWhisky || ""); setGoToDram(profile.goToDram || "");
      setPreferredRegions(profile.preferredRegions || []); setPreferredPeatLevel(profile.preferredPeatLevel || "");
      setPreferredCaskInfluence(profile.preferredCaskInfluence || ""); setOpenaiApiKey(profile.openaiApiKey || "");
      setFriendNotificationsEnabled(profile.friendNotificationsEnabled !== false);
    }
  }, [profile]);

  useEffect(() => {
    if (participant) { setDisplayName(participant.name || ""); setEmail(participant.email || ""); setNewsletterOptIn(participant.newsletterOptIn || false); setPreferredRatingScale(participant.preferredRatingScale ?? null); }
  }, [participant]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!currentParticipant) return;
      if (removePhoto && !photoFile) {
        await profileApi.deletePhoto(currentParticipant.id);
        updateSessionPhotoUrl(null);
      }
      if (photoFile) {
        const photoResult = await profileApi.uploadPhoto(currentParticipant.id, photoFile);
        if (photoResult?.photoUrl) updateSessionPhotoUrl(photoResult.photoUrl);
      }
      await profileApi.update(currentParticipant.id, { bio, favoriteWhisky, goToDram, preferredRegions, preferredPeatLevel, preferredCaskInfluence, openaiApiKey: openaiApiKey.trim() || null, friendNotificationsEnabled });
      const participantUpdates: any = {};
      if (displayName.trim() && displayName !== participant?.name) participantUpdates.name = displayName.trim();
      if (email !== (participant?.email || "")) participantUpdates.email = email;
      if (newsletterOptIn !== (participant?.newsletterOptIn || false)) participantUpdates.newsletterOptIn = newsletterOptIn;
      if (preferredRatingScale !== (participant?.preferredRatingScale ?? null)) participantUpdates.preferredRatingScale = preferredRatingScale;
      if (newPin) {
        if (newPin.length < 4) throw new Error("PIN must be at least 4 characters");
        if (newPin !== confirmPin) throw new Error("PINs don't match");
        if (!currentPin) throw new Error("Current PIN required");
        participantUpdates.currentPin = currentPin; participantUpdates.pin = newPin;
      }
      if (Object.keys(participantUpdates).length > 0) {
        const updated = await participantUpdateApi.update(currentParticipant.id, participantUpdates);
        if (updated.name !== currentParticipant.name) {
          const freshState = useAppStore.getState().currentParticipant;
          setParticipant({ ...(freshState || currentParticipant), name: updated.name });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", pid] }); queryClient.invalidateQueries({ queryKey: ["participant", pid] });
      setPhotoFile(null); setPhotoPreview(null); setRemovePhoto(false); setCurrentPin(""); setNewPin(""); setConfirmPin("");
      toast({ title: "Settings saved" });
    },
    onError: (error: Error) => { toast({ title: error.message, variant: "destructive" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (pin: string) => {
      if (!currentParticipant) return;
      const res = await fetch(`/api/participants/${currentParticipant.id}/anonymize`, { method: "DELETE", headers: { "Content-Type": "application/json", "x-participant-id": currentParticipant.id }, body: JSON.stringify({ pin }) });
      if (!res.ok) { if (res.status === 403) throw new Error("INVALID_PIN"); const err = await res.json().catch(() => ({ message: "Request failed" })); throw new Error(err.message); }
      return res.json();
    },
    onSuccess: async () => { toast({ title: "Account deleted" }); await signOut(); navigate("/labs"); },
    onError: (error: Error) => { if (error.message === "INVALID_PIN") setDeletePinError("Incorrect PIN"); else toast({ title: error.message, variant: "destructive" }); },
  });

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) { toast({ title: "Invalid file type", variant: "destructive" }); return; }
    if (file.size > 2 * 1024 * 1024) { toast({ title: "File too large (max 2 MB)", variant: "destructive" }); return; }
    setPhotoFile(file); setRemovePhoto(false);
    const reader = new FileReader(); reader.onload = (ev) => setPhotoPreview(ev.target?.result as string); reader.readAsDataURL(file);
  };

  const toggleRegion = (region: string) => setPreferredRegions(prev => prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region]);

  const currentPhotoUrl = removePhoto ? null : (photoPreview || profile?.photoUrl);
  const emailChanged = email !== (participant?.email || "");
  const canSave = !(saveMutation.isPending || (newPin !== "" && newPin !== confirmPin) || (emailChanged && email !== confirmEmail));

  if (!currentParticipant) {
    return (
      <div className="px-5 py-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={goBack} className="labs-btn-ghost flex items-center gap-1 -ml-2" style={{ color: "var(--labs-text-muted)" }} data-testid="button-labs-back-taste"><ChevronLeft className="w-4 h-4" /> Taste</button>
          <h1 className="labs-h2" style={{ color: "var(--labs-text)" }}>Settings</h1>
        </div>
        <AuthGateMessage
          icon={<Settings className="w-10 h-10" style={{ color: "var(--labs-text-muted)" }} />}
          message="Sign in to access settings"
          className="labs-empty"
          compact
        />
      </div>
    );
  }

  if (profileLoading || participantLoading) {
    return <div style={{ padding: 16 }}><SkeletonList count={3} /></div>;
  }

  const inputStyle: React.CSSProperties = { width: "100%", background: "var(--labs-surface)", border: "1px solid var(--labs-border)", borderRadius: 10, color: "var(--labs-text)", padding: "12px 16px", fontSize: 14, outline: "none", boxSizing: "border-box" };
  const selectStyle: React.CSSProperties = { ...inputStyle, appearance: "none", WebkitAppearance: "none", cursor: "pointer", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238a7e6d' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 32 };

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto flex flex-col gap-6" data-testid="labs-taste-settings">
      <div className="flex items-center gap-3">
        <button onClick={goBack} className="labs-btn-ghost flex items-center gap-1 -ml-2" style={{ color: "var(--labs-text-muted)" }} data-testid="button-labs-back-taste"><ChevronLeft className="w-4 h-4" /> Taste</button>
        <div>
          <h1 className="labs-h2" style={{ color: "var(--labs-text)" }} data-testid="labs-settings-title">Settings & Profile</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--labs-text-muted)" }}>Manage your account, preferences & taste defaults</p>
        </div>
      </div>

      <div className="labs-card p-5">
        <SectionHeading icon={Shield} label="Account" />
        <div className="flex flex-col gap-3.5 mt-3">
          <Field label="Email"><input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setConfirmEmail(""); }} placeholder="your@email.com" style={inputStyle} data-testid="input-labs-email" /></Field>
          {emailChanged && (
            <Field label="Confirm Email">
              <input type="email" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} placeholder="Repeat new email" style={{ ...inputStyle, borderColor: confirmEmail && confirmEmail !== email ? "var(--labs-danger)" : undefined }} data-testid="input-labs-confirm-email" />
              {confirmEmail && confirmEmail !== email && <p className="text-xs mt-1" style={{ color: "var(--labs-danger)" }}>Emails don't match</p>}
            </Field>
          )}
          <div style={{ borderTop: "1px solid var(--labs-border)", paddingTop: 14 }}>
            <p className="text-sm font-semibold mb-2.5" style={{ color: "var(--labs-text)" }}>Change PIN</p>
            <div className="flex flex-col gap-2.5">
              <Field label="Current PIN"><input type="password" value={currentPin} onChange={(e) => setCurrentPin(e.target.value)} maxLength={6} style={{ ...inputStyle, letterSpacing: 3 }} data-testid="input-labs-current-pin" /></Field>
              <Field label="New PIN"><input type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)} maxLength={6} style={{ ...inputStyle, letterSpacing: 3 }} data-testid="input-labs-new-pin" /></Field>
              <Field label="Confirm PIN"><input type="password" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} maxLength={6} style={{ ...inputStyle, letterSpacing: 3 }} data-testid="input-labs-confirm-pin" /></Field>
            </div>
            {newPin && confirmPin && newPin !== confirmPin && <p className="text-xs mt-2" style={{ color: "var(--labs-danger)" }} data-testid="text-labs-pin-mismatch">PINs don't match</p>}
          </div>
        </div>
      </div>

      <div className="labs-card p-5">
        <SectionHeading icon={User} label="Profile" />
        <div className="flex flex-col gap-3.5 mt-3">
          <Field label="Display Name"><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" style={inputStyle} data-testid="input-labs-display-name" /></Field>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "var(--labs-text-muted)" }}>Photo</label>
            <div className="flex items-center gap-4">
              <div onClick={() => fileInputRef.current?.click()}
                style={{ width: 72, height: 72, borderRadius: "50%", background: currentPhotoUrl ? `url(${currentPhotoUrl}) center/cover` : "var(--labs-accent-muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "2px solid var(--labs-border)", flexShrink: 0, fontSize: 24, color: "var(--labs-accent)" }}
                data-testid="button-labs-avatar-upload">
                {!currentPhotoUrl && currentParticipant.name.charAt(0).toUpperCase()}
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handlePhotoSelect} style={{ display: "none" }} data-testid="input-labs-profile-photo" />
              <div className="flex flex-col gap-1.5">
                <button onClick={() => fileInputRef.current?.click()} className="text-sm" style={{ color: "var(--labs-accent)", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }} data-testid="button-labs-upload-photo">
                  {currentPhotoUrl ? "Change Photo" : "Upload Photo"}
                </button>
                <span className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>JPG, PNG, WebP - max 2 MB</span>
                <span className="text-[11px]" style={{ color: "var(--labs-text-muted)", opacity: 0.75 }} data-testid="text-photo-rights-hint">{t("labs.settings.photoRightsHint", "Please only upload your own photos or license-free images.")}</span>
                {currentPhotoUrl && (
                  <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); setRemovePhoto(true); }} className="text-xs" style={{ color: "var(--labs-danger)", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }} data-testid="button-labs-remove-photo">Remove Photo</button>
                )}
              </div>
            </div>
          </div>
          <Field label="Bio"><textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 400))} placeholder="Tell others about yourself..." maxLength={400} style={{ ...inputStyle, minHeight: 80, resize: "none", lineHeight: 1.5 }} data-testid="input-labs-bio" /><p className="text-[11px] text-right mt-0.5" style={{ color: "var(--labs-text-muted)" }}>{bio.length}/400</p></Field>
          <Field label="Favorite Whisky"><input value={favoriteWhisky} onChange={(e) => setFavoriteWhisky(e.target.value)} placeholder="e.g. Lagavulin 16" style={inputStyle} data-testid="input-labs-favorite-whisky" /></Field>
          <Field label="Go-to Dram"><input value={goToDram} onChange={(e) => setGoToDram(e.target.value)} placeholder="Your everyday whisky" style={inputStyle} data-testid="input-labs-go-to-dram" /></Field>
        </div>
      </div>

      <div className="labs-card p-5">
        <SectionHeading icon={Settings} label="Preferences" />
        <div className="flex flex-col gap-4 mt-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: "var(--labs-text-muted)" }}>Language</label>
            <div className="flex gap-2">
              {(["de", "en"] as const).map(lng => {
                const active = i18n.language === lng;
                return (
                  <button key={lng} onClick={() => { i18n.changeLanguage(lng); localStorage.setItem("i18nextLng", lng); if (pid) participantApi.setLanguage(pid, lng).catch(() => {}); toast({ title: "Language updated", duration: 1500 }); }}
                    style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: active ? "2px solid var(--labs-accent)" : "1px solid var(--labs-border)", background: active ? "var(--labs-accent-muted)" : "transparent", color: active ? "var(--labs-accent)" : "var(--labs-text)", fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer" }}
                    data-testid={`button-labs-language-${lng}`}>{lng === "de" ? "Deutsch" : "English"}</button>
                );
              })}
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--labs-border)", paddingTop: 14 }}>
            <div className="flex items-center gap-2 mb-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--labs-text-muted)" }}>{t("m2.taste.settings.ratingScale", "Rating Scale")}</label>
              <ScaleBadge max={activeScale.max} />
            </div>
            <p className="text-[11px] mb-2" style={{ color: "var(--labs-text-muted)", opacity: 0.75 }}>{t("m2.taste.settings.ratingScaleHint", "Your default scale for solo tastings. Host-defined scales override this.")}</p>
            <div className="flex gap-2" data-testid="select-rating-scale">
              {([null, 5, 10, 20, 100] as const).map(s => {
                const active = preferredRatingScale === s;
                const label = s === null ? t("m2.taste.settings.scaleDefault", "Auto") : `1–${s}`;
                return (
                  <button key={String(s)} onClick={() => setPreferredRatingScale(s)}
                    style={{ flex: 1, padding: "10px 4px", borderRadius: 10, border: active ? "2px solid var(--labs-accent)" : "1px solid var(--labs-border)", background: active ? "var(--labs-accent-muted)" : "transparent", color: active ? "var(--labs-accent)" : "var(--labs-text)", fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer", fontFamily: "inherit" }}
                    data-testid={`button-scale-${s ?? "auto"}`}>{label}</button>
                );
              })}
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--labs-border)", paddingTop: 14 }}>
            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: "var(--labs-text-muted)" }}>Preferred Regions</label>
            <div className="flex flex-wrap gap-2" data-testid="select-labs-regions">
              {REGIONS.map(region => {
                const active = preferredRegions.includes(region);
                return (
                  <span key={region} onClick={() => toggleRegion(region)}
                    style={{ display: "inline-block", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer", border: `1px solid ${active ? "var(--labs-accent)" : "var(--labs-border)"}`, background: active ? "var(--labs-accent-muted)" : "transparent", color: active ? "var(--labs-accent)" : "var(--labs-text-muted)", userSelect: "none" }}
                    data-testid={`badge-labs-region-${region.toLowerCase()}`}>{region}</span>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            <Field label="Preferred Peat Level">
              <select value={preferredPeatLevel} onChange={(e) => setPreferredPeatLevel(e.target.value)} style={selectStyle} data-testid="select-labs-peat-level">
                <option value="">Select peat level</option>
                {PEAT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Preferred Cask Type">
              <select value={preferredCaskInfluence} onChange={(e) => setPreferredCaskInfluence(e.target.value)} style={selectStyle} data-testid="select-labs-cask-influence">
                <option value="">Select cask type</option>
                {CASK_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>

          <div style={{ borderTop: "1px solid var(--labs-border)", paddingTop: 14 }}>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" checked={newsletterOptIn} onChange={(e) => setNewsletterOptIn(e.target.checked)} style={{ marginTop: 2, accentColor: "var(--labs-accent)" }} data-testid="checkbox-labs-newsletter" />
              <div>
                <div className="text-sm" style={{ color: "var(--labs-text)" }}>Receive Newsletter</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--labs-text-muted)" }}>Occasional updates about CaskSense features</div>
              </div>
            </label>
          </div>

          {appSettings?.friend_online_notifications !== "false" && (
            <div style={{ borderTop: "1px solid var(--labs-border)", paddingTop: 14 }}>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={friendNotificationsEnabled} onChange={(e) => setFriendNotificationsEnabled(e.target.checked)} style={{ marginTop: 2, accentColor: "var(--labs-accent)" }} data-testid="checkbox-labs-friend-notifications" />
                <div>
                  <div className="text-sm" style={{ color: "var(--labs-text)" }}>Friend Online Notifications</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--labs-text-muted)" }}>Get notified when friends come online</div>
                </div>
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="labs-card p-5">
        <SectionHeading icon={Sparkles} label="AI & Integrations" />
        <div className="mt-3">
          <Field label="OpenAI API Key">
            <div className="relative">
              <input type={showApiKey ? "text" : "password"} value={openaiApiKey} onChange={(e) => setOpenaiApiKey(e.target.value)} placeholder="sk-..." style={{ ...inputStyle, fontFamily: "monospace", fontSize: 13, paddingRight: 40 }} data-testid="input-labs-openai-key" autoComplete="off" />
              <button type="button" onClick={() => setShowApiKey(!showApiKey)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--labs-text-muted)", cursor: "pointer", padding: 4 }} data-testid="button-labs-toggle-key-visibility">
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {openaiApiKey && (
              <button onClick={() => setOpenaiApiKey("")} className="text-xs mt-1.5" style={{ color: "var(--labs-danger)", background: "none", border: "none", cursor: "pointer", padding: 0 }} data-testid="button-labs-clear-api-key">Remove API key</button>
            )}
            <p className="text-[11px] mt-1.5" style={{ color: "var(--labs-text-muted)" }}>
              Get your key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" style={{ color: "var(--labs-accent)", textDecoration: "none" }}>platform.openai.com</a>
            </p>
          </Field>
        </div>
      </div>

      <button onClick={() => saveMutation.mutate()} disabled={!canSave} className="labs-btn-primary w-full" style={{ padding: 12, fontSize: 15, opacity: canSave ? 1 : 0.5, cursor: canSave ? "pointer" : "not-allowed" }} data-testid="button-labs-save-settings">
        {saveMutation.isPending ? "Saving..." : "Save"}
      </button>

      <div className="labs-card p-5">
        <SectionHeading icon={Trash2} label="Data & Privacy" />
        <div className="flex flex-col gap-4 mt-3">
          <div>
            <button onClick={() => navigate("/labs/taste/downloads")} className="labs-btn-secondary w-full flex items-center justify-center gap-2" data-testid="button-labs-goto-downloads">
              <ExternalLink className="w-3.5 h-3.5" /> Go to Downloads & Export
            </button>
          </div>
          <div style={{ borderTop: "1px solid var(--labs-border)", paddingTop: 14 }}>
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--labs-danger)" }}>Delete Account</p>
            <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)" }}>Permanently delete your account and all data</p>
            {!deleteConfirm ? (
              <button onClick={() => setDeleteConfirm(true)} style={{ padding: "10px 20px", fontSize: 14, fontWeight: 600, background: "transparent", color: "var(--labs-danger)", border: "1px solid var(--labs-danger)", borderRadius: 10, cursor: "pointer", opacity: 0.8 }} data-testid="button-labs-delete-account">Delete Account</button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs" style={{ color: "var(--labs-danger)" }}>Enter your PIN to confirm:</p>
                <input type="password" value={deletePin} onChange={(e) => { setDeletePin(e.target.value); setDeletePinError(""); }} maxLength={6} style={{ ...inputStyle, letterSpacing: 3, maxWidth: 200, borderColor: deletePinError ? "var(--labs-danger)" : undefined }} data-testid="input-labs-delete-pin" />
                {deletePinError && <p className="text-xs" style={{ color: "var(--labs-danger)" }}>{deletePinError}</p>}
                <div className="flex gap-2">
                  <button onClick={() => { setDeleteConfirm(false); setDeletePin(""); setDeletePinError(""); }} className="labs-btn-secondary" style={{ padding: "8px 16px", fontSize: 13 }}>Cancel</button>
                  <button onClick={() => deleteMutation.mutate(deletePin)} disabled={!deletePin || deleteMutation.isPending} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "var(--labs-bg)", background: "var(--labs-danger)", border: "none", borderRadius: 8, cursor: "pointer", opacity: !deletePin ? 0.5 : 1 }} data-testid="button-labs-confirm-delete-account">
                    {deleteMutation.isPending ? "..." : "Confirm Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <button onClick={async () => { await signOut(); navigate("/labs"); }} style={{ padding: "10px 20px", fontSize: 14, fontWeight: 500, background: "transparent", color: "var(--labs-text-muted)", border: "1px solid var(--labs-border)", borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }} data-testid="button-labs-sign-out">
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </div>
  );
}

function SectionHeading({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
      <h2 className="labs-h3" style={{ color: "var(--labs-accent)" }}>{label}</h2>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "var(--labs-text-muted)" }}>{label}</label>
      {children}
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { profileApi, participantApi, participantUpdateApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import Module2Shell from "@/components/m2/Module2Shell";
import M2BackButton from "@/components/m2/M2BackButton";
import { v, alpha, getTheme, setTheme, type ThemeName } from "@/lib/themeVars";

const REGIONS = [
  "Speyside", "Highlands", "Islay", "Lowlands", "Campbeltown",
  "Islands", "Ireland", "Japan", "USA", "Taiwan", "Other",
];
const PEAT_LEVELS = ["None", "Light", "Medium", "Heavy"];
const CASK_TYPES = ["Bourbon", "Sherry", "Port", "Wine", "Rum", "Other"];

const cardStyle: React.CSSProperties = {
  background: v.card,
  borderRadius: 14,
  border: `1px solid ${v.border}`,
  padding: "20px 16px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: v.inputBg,
  border: `1px solid ${v.inputBorder}`,
  borderRadius: 12,
  color: v.text,
  padding: "12px 16px",
  fontSize: 15,
  fontFamily: "system-ui, sans-serif",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: v.muted,
  marginBottom: 6,
  display: "block",
};

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 700,
  color: v.accent,
  marginBottom: 4,
  fontFamily: "'Playfair Display', Georgia, serif",
};

const sectionDescStyle: React.CSSProperties = {
  fontSize: 13,
  color: v.textSecondary,
  marginBottom: 16,
  lineHeight: 1.4,
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none" as const,
  WebkitAppearance: "none" as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  paddingRight: 32,
  cursor: "pointer",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 100,
  resize: "none" as const,
  lineHeight: 1.5,
};

const btnPrimary: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  fontSize: 15,
  fontWeight: 600,
  background: v.accent,
  color: v.bg,
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontFamily: "system-ui, sans-serif",
  transition: "opacity 0.2s",
};

const btnDanger: React.CSSProperties = {
  padding: "10px 20px",
  fontSize: 14,
  fontWeight: 600,
  background: "transparent",
  color: v.error,
  border: `1px solid ${alpha(v.error, "40")}`,
  borderRadius: 10,
  cursor: "pointer",
  fontFamily: "system-ui, sans-serif",
};

const badgeBase: React.CSSProperties = {
  display: "inline-block",
  padding: "4px 12px",
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  transition: "all 0.15s",
  border: `1px solid ${v.border}`,
  userSelect: "none",
};

export default function M2TasteSettings() {
  const { t, i18n } = useTranslation();
  const { currentParticipant, setParticipant } = useAppStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
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
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletePin, setDeletePin] = useState("");
  const [deletePinError, setDeletePinError] = useState("");

  const pid = currentParticipant?.id;

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
        if (newPin.length < 4) throw new Error("PIN must be at least 4 characters");
        if (newPin !== confirmPin) throw new Error(t("profile.pinMismatch"));
        if (!currentPin) throw new Error(t("profile.currentPinRequired"));
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
      queryClient.invalidateQueries({ queryKey: ["profile", pid] });
      queryClient.invalidateQueries({ queryKey: ["participant", pid] });
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

  const deleteMutation = useMutation({
    mutationFn: async (pin: string) => {
      if (!currentParticipant) return;
      const res = await fetch(`/api/participants/${currentParticipant.id}/anonymize`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-participant-id": currentParticipant.id },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        if (res.status === 403) throw new Error("INVALID_PIN");
        const err = await res.json().catch(() => ({ message: "Request failed" }));
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("profile.deleteAccountSuccess") });
      setParticipant(null);
      navigate("/m2/tastings");
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

  const toggleRegion = (region: string) => {
    setPreferredRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
  };

  const currentPhotoUrl = removePhoto ? null : (photoPreview || profile?.photoUrl);
  const emailChanged = email !== (participant?.email || "");
  const canSave = !(saveMutation.isPending || (newPin !== "" && newPin !== confirmPin) || (emailChanged && email !== confirmEmail));

  if (!currentParticipant) {
    return (
      <div style={{ ...cardStyle, textAlign: "center", padding: 40, margin: 16 }}>
        <p style={{ color: v.muted, fontSize: 14 }} data-testid="text-settings-signin-prompt">
          {t("m2.settings.signInRequired", "Please sign in to access settings.")}
        </p>
      </div>
    );
  }

  if (profileLoading || participantLoading) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <p style={{ color: v.muted, fontSize: 14 }}>{t("common.loading", "Loading…")}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px", maxWidth: 600, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
      <M2BackButton />
      <div style={{ marginBottom: 8 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: v.text,
            textAlign: "center",
            fontFamily: "'Playfair Display', Georgia, serif",
            margin: 0,
          }}
          data-testid="text-m2-settings-title"
        >
          {t("m2.settings.title", "Settings & Profile")}
        </h1>
        <p style={{ fontSize: 13, color: v.muted, marginTop: 4, textAlign: "center" }}>
          {t("m2.settings.subtitle", "Manage your account, preferences & taste defaults")}
        </p>
      </div>

      <div style={cardStyle}>
        <div style={sectionHeadingStyle} data-testid="text-m2-section-account">
          {t("profile.sectionAccount", "Account")}
        </div>
        <p style={sectionDescStyle}>{t("profile.sectionAccountDesc", "Email and PIN management")}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>{t("profile.email", "Email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setConfirmEmail(""); }}
              placeholder={t("profile.emailPlaceholder", "your@email.com")}
              style={inputStyle}
              data-testid="input-m2-email"
            />
          </div>
          {emailChanged && (
            <div>
              <label style={labelStyle}>{t("m2.settings.confirmEmail", "Confirm Email")}</label>
              <input
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={t("m2.settings.confirmEmailPlaceholder", "Repeat new email")}
                style={{ ...inputStyle, borderColor: confirmEmail && confirmEmail !== email ? v.error : v.inputBorder }}
                data-testid="input-m2-confirm-email"
              />
              {confirmEmail && confirmEmail !== email && (
                <p style={{ fontSize: 12, color: v.error, marginTop: 4 }}>{t("m2.settings.emailMismatch", "Emails don't match")}</p>
              )}
            </div>
          )}

          <div style={{ borderTop: `1px solid ${v.border}`, paddingTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: v.text, marginBottom: 10 }}>{t("profile.newPin", "Change PIN")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={labelStyle}>{t("profile.currentPin", "Current PIN")}</label>
                <input
                  type="password"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  placeholder={t("profile.currentPinPlaceholder", "Current PIN")}
                  maxLength={6}
                  style={{ ...inputStyle, letterSpacing: 3 }}
                  data-testid="input-m2-current-pin"
                />
              </div>
              <div>
                <label style={labelStyle}>{t("profile.newPin", "New PIN")}</label>
                <input
                  type="password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder={t("profile.newPinPlaceholder", "New PIN")}
                  maxLength={6}
                  style={{ ...inputStyle, letterSpacing: 3 }}
                  data-testid="input-m2-new-pin"
                />
              </div>
              <div>
                <label style={labelStyle}>{t("profile.confirmPin", "Confirm PIN")}</label>
                <input
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder={t("profile.confirmPinPlaceholder", "Confirm PIN")}
                  maxLength={6}
                  style={{ ...inputStyle, letterSpacing: 3 }}
                  data-testid="input-m2-confirm-pin"
                />
              </div>
            </div>
            {newPin && confirmPin && newPin !== confirmPin && (
              <p style={{ fontSize: 12, color: v.error, marginTop: 8 }} data-testid="text-m2-pin-mismatch">
                {t("profile.pinMismatch", "PINs don't match")}
              </p>
            )}
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={sectionHeadingStyle} data-testid="text-m2-section-profile">
          {t("profile.sectionProfile", "Profile")}
        </div>
        <p style={sectionDescStyle}>{t("profile.sectionProfileDesc", "Personal info and photo")}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>{t("profile.name", "Display Name")}</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("profile.namePlaceholder", "Your name")}
              style={inputStyle}
              data-testid="input-m2-display-name"
            />
          </div>

          <div>
            <label style={labelStyle}>{t("profile.photo", "Photo")}</label>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: currentPhotoUrl ? `url(${currentPhotoUrl}) center/cover` : alpha(v.accent, "20"),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  border: `2px solid ${v.border}`,
                  flexShrink: 0,
                  fontSize: 24,
                  fontFamily: "'Playfair Display', serif",
                  color: v.accent,
                }}
                data-testid="button-m2-avatar-upload"
              >
                {!currentPhotoUrl && currentParticipant.name.charAt(0).toUpperCase()}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handlePhotoSelect}
                style={{ display: "none" }}
                data-testid="input-m2-profile-photo"
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{ fontSize: 13, color: v.accent, background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}
                  data-testid="button-m2-upload-photo"
                >
                  {currentPhotoUrl ? t("profile.changePhoto", "Change Photo") : t("profile.uploadPhoto", "Upload Photo")}
                </button>
                <span style={{ fontSize: 10, color: v.mutedLight }}>{t("common.uploadHint", "JPG, PNG, WebP – max 2 MB")}</span>
                {currentPhotoUrl && (
                  <button
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); setRemovePhoto(true); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    style={{ fontSize: 12, color: v.error, background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}
                    data-testid="button-m2-remove-photo"
                  >
                    {t("profile.removePhoto", "Remove Photo")}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label style={labelStyle}>{t("profile.bio", "Bio")}</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 400))}
              placeholder={t("profile.bioPlaceholder", "Tell others about yourself…")}
              maxLength={400}
              style={textareaStyle}
              data-testid="input-m2-bio"
            />
            <p style={{ fontSize: 11, color: v.muted, textAlign: "right", marginTop: 2 }} data-testid="text-m2-bio-counter">{bio.length}/400</p>
          </div>

          <div>
            <label style={labelStyle}>{t("profile.favoriteWhisky", "Favorite Whisky")}</label>
            <input
              value={favoriteWhisky}
              onChange={(e) => setFavoriteWhisky(e.target.value)}
              placeholder={t("profile.favoritePlaceholder", "e.g. Lagavulin 16")}
              style={inputStyle}
              data-testid="input-m2-favorite-whisky"
            />
          </div>

          <div>
            <label style={labelStyle}>{t("profile.goToDram", "Go-to Dram")}</label>
            <input
              value={goToDram}
              onChange={(e) => setGoToDram(e.target.value)}
              placeholder={t("profile.goToDramPlaceholder", "Your everyday whisky")}
              style={inputStyle}
              data-testid="input-m2-go-to-dram"
            />
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={sectionHeadingStyle} data-testid="text-m2-section-preferences">
          {t("profile.sectionPreferences", "Preferences")}
        </div>
        <p style={sectionDescStyle}>{t("profile.sectionPreferencesDesc", "Language, theme & taste preferences")}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label style={labelStyle}>{t("profile.language", "Language")}</label>
            <p style={{ fontSize: 12, color: v.muted, marginBottom: 8 }}>{t("profile.languageDesc", "Choose your preferred language.")}</p>
            <div style={{ display: "flex", gap: 8 }}>
              {(["de", "en"] as const).map((lng) => {
                const active = i18n.language === lng;
                const label = lng === "de" ? "Deutsch" : "English";
                return (
                  <button
                    key={lng}
                    onClick={() => {
                      i18n.changeLanguage(lng);
                      localStorage.setItem("i18nextLng", lng);
                      toast({ title: t("profile.languageUpdated", "Language updated"), duration: 1500 });
                    }}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: active ? `2px solid ${v.accent}` : `1px solid ${v.border}`,
                      background: active ? alpha(v.accent, "15") : v.card,
                      color: active ? v.accent : v.text,
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      cursor: "pointer",
                      fontFamily: "system-ui, sans-serif",
                      transition: "all 0.2s",
                    }}
                    data-testid={`button-m2-language-${lng}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={labelStyle}>{t("profile.theme", "Theme")}</label>
            <p style={{ fontSize: 12, color: v.muted, marginBottom: 8 }}>{t("profile.themeDesc", "Choose your preferred appearance.")}</p>
            <div style={{ display: "flex", gap: 8 }}>
              {(["dark-warm", "light-warm"] as ThemeName[]).map((th) => {
                const active = getTheme() === th;
                const label = th === "dark-warm" ? "Dark Warm" : "Light Warm";
                return (
                  <button
                    key={th}
                    onClick={() => {
                      setTheme(th);
                      toast({ title: t("profile.themeUpdated", "Theme updated"), duration: 1500 });
                    }}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: active ? `2px solid ${v.accent}` : `1px solid ${v.border}`,
                      background: active ? alpha(v.accent, "15") : v.card,
                      color: active ? v.accent : v.text,
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      cursor: "pointer",
                      fontFamily: "system-ui, sans-serif",
                      transition: "all 0.2s",
                    }}
                    data-testid={`button-m2-theme-${th}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${v.border}`, paddingTop: 14 }}>
            <label style={labelStyle}>{t("profile.preferredRegions", "Preferred Regions")}</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }} data-testid="select-m2-regions">
              {REGIONS.map((region) => {
                const active = preferredRegions.includes(region);
                return (
                  <span
                    key={region}
                    onClick={() => toggleRegion(region)}
                    style={{
                      ...badgeBase,
                      background: active ? alpha(v.accent, "20") : "transparent",
                      color: active ? v.accent : v.muted,
                      borderColor: active ? v.accent : v.border,
                    }}
                    data-testid={`badge-m2-region-${region.toLowerCase()}`}
                  >
                    {region}
                  </span>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>{t("profile.preferredPeatLevel", "Preferred Peat Level")}</label>
              <select
                value={preferredPeatLevel}
                onChange={(e) => setPreferredPeatLevel(e.target.value)}
                style={selectStyle}
                data-testid="select-m2-peat-level"
              >
                <option value="">{t("profile.selectPeat", "Select peat level")}</option>
                {PEAT_LEVELS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t("profile.preferredCaskInfluence", "Preferred Cask Type")}</label>
              <select
                value={preferredCaskInfluence}
                onChange={(e) => setPreferredCaskInfluence(e.target.value)}
                style={selectStyle}
                data-testid="select-m2-cask-influence"
              >
                <option value="">{t("profile.selectCask", "Select cask type")}</option>
                {CASK_TYPES.map((cask) => (
                  <option key={cask} value={cask}>{cask}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${v.border}`, paddingTop: 14 }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={newsletterOptIn}
                onChange={(e) => setNewsletterOptIn(e.target.checked)}
                style={{ marginTop: 2, accentColor: v.accent }}
                data-testid="checkbox-m2-newsletter"
              />
              <div>
                <div style={{ fontSize: 14, color: v.text }}>{t("profile.newsletterOptIn", "Receive Newsletter")}</div>
                <div style={{ fontSize: 12, color: v.muted, marginTop: 2 }}>{t("profile.newsletterHint", "Occasional updates about CaskSense features")}</div>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={sectionHeadingStyle} data-testid="text-m2-section-ai">
          {t("profile.sectionAI", "AI & Integrations")}
        </div>
        <p style={sectionDescStyle}>{t("profile.sectionAIDesc", "Configure your personal AI settings")}</p>

        <div>
          <label style={labelStyle}>OpenAI API Key</label>
          <div style={{ position: "relative" }}>
            <input
              type={showApiKey ? "text" : "password"}
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
              placeholder="sk-..."
              style={{ ...inputStyle, fontFamily: "monospace", fontSize: 13, paddingRight: 40 }}
              data-testid="input-m2-openai-key"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: v.muted,
                cursor: "pointer",
                fontSize: 13,
                padding: 4,
              }}
              data-testid="button-m2-toggle-key-visibility"
            >
              {showApiKey ? t("common.hide", "Hide") : t("common.show", "Show")}
            </button>
          </div>
          {openaiApiKey && (
            <button
              onClick={() => setOpenaiApiKey("")}
              style={{ fontSize: 12, color: v.error, background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 6 }}
              data-testid="button-m2-clear-api-key"
            >
              {t("m2.settings.removeApiKey", "Remove API key")}
            </button>
          )}
          <p style={{ fontSize: 10, color: v.mutedLight, marginTop: 6 }}>
            {t("m2.settings.apiKeyHint", "Get your key at")}{" "}
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" style={{ color: v.accent, textDecoration: "none" }}>
              platform.openai.com
            </a>
          </p>
        </div>
      </div>

      <button
        onClick={() => saveMutation.mutate()}
        disabled={!canSave}
        style={{ ...btnPrimary, opacity: canSave ? 1 : 0.5, cursor: canSave ? "pointer" : "not-allowed" }}
        data-testid="button-m2-save-settings"
      >
        {saveMutation.isPending ? t("profile.saving", "Saving…") : t("profile.save", "Save")}
      </button>

      <div style={cardStyle}>
        <div style={sectionHeadingStyle} data-testid="text-m2-section-data">
          {t("profile.sectionData", "Data & Privacy")}
        </div>
        <p style={sectionDescStyle}>{t("profile.sectionDataDesc", "Export or delete your data")}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <button
              onClick={() => navigate("/m2/taste/downloads")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "12px 16px",
                borderRadius: 10,
                border: `1px solid ${v.border}`,
                background: v.elevated,
                color: v.text,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "system-ui, sans-serif",
                transition: "background 0.2s",
                textAlign: "left",
              }}
              data-testid="button-m2-export-data"
            >
              <span style={{ fontSize: 18 }}>📦</span>
              <div>
                <div>{t("profile.exportDataLink", "Downloads & Export")}</div>
                <div style={{ fontSize: 12, color: v.muted, fontWeight: 400, marginTop: 2 }}>{t("profile.exportDataDesc", "Export your journal, collection & tasting data")}</div>
              </div>
            </button>
          </div>

          <div style={{ borderTop: `1px solid ${alpha(v.error, "30")}`, paddingTop: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: v.error, marginBottom: 8, fontFamily: "'Playfair Display', Georgia, serif" }}>
              {t("profile.dangerZone", "Danger Zone")}
            </div>
            <p style={{ fontSize: 13, color: v.muted, marginBottom: 12 }}>
              {t("profile.deleteAccountDesc", "Permanently delete your account and all associated data.")}
            </p>
            {!deleteConfirm ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                style={btnDanger}
                data-testid="button-m2-delete-account"
              >
                {t("profile.deleteAccount", "Delete Account")}
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ fontSize: 13, color: v.error, margin: 0 }}>{t("account.closeAccountWarning", "This action cannot be undone.")}</p>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder={t("account.closeAccountPinPlaceholder", "Enter your PIN")}
                  value={deletePin}
                  onChange={(e) => { setDeletePin(e.target.value.replace(/\D/g, "").slice(0, 4)); setDeletePinError(""); }}
                  style={{ ...inputStyle, borderColor: deletePinError ? v.error : v.inputBorder }}
                  data-testid="input-m2-delete-pin"
                />
                {deletePinError && (
                  <p style={{ fontSize: 12, color: v.error, margin: 0 }} data-testid="text-m2-delete-pin-error">{deletePinError}</p>
                )}
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => { setDeleteConfirm(false); setDeletePin(""); setDeletePinError(""); }}
                    style={{ ...btnDanger, flex: 1, color: v.muted, borderColor: v.border }}
                    data-testid="button-m2-delete-cancel"
                  >
                    {t("account.cancel", "Cancel")}
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(deletePin)}
                    disabled={deleteMutation.isPending || deletePin.length !== 4}
                    style={{
                      ...btnDanger,
                      flex: 1,
                      background: v.error,
                      color: "#fff",
                      borderColor: v.error,
                      opacity: deletePin.length === 4 ? 1 : 0.5,
                    }}
                    data-testid="button-m2-delete-confirm"
                  >
                    {t("profile.deleteAccount", "Delete Account")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

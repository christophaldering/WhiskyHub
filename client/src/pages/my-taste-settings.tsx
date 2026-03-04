import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { profileApi, participantApi, participantUpdateApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import SimpleShell from "@/components/simple/simple-shell";
import { c, cardStyle, inputStyle } from "@/lib/theme";

const REGIONS = [
  "Speyside", "Highlands", "Islay", "Lowlands", "Campbeltown",
  "Islands", "Ireland", "Japan", "USA", "Taiwan", "Other",
];
const PEAT_LEVELS = ["None", "Light", "Medium", "Heavy"];
const CASK_TYPES = ["Bourbon", "Sherry", "Port", "Wine", "Rum", "Other"];

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: c.muted,
  marginBottom: 6,
  display: "block",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: c.text,
  marginBottom: 12,
  fontFamily: "'Playfair Display', Georgia, serif",
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
  background: c.accent,
  color: c.bg,
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
  color: c.error,
  border: `1px solid ${c.error}40`,
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
  border: `1px solid ${c.border}`,
  userSelect: "none",
};

export default function MyTasteSettings() {
  const { t } = useTranslation();
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
      <SimpleShell>
        <div style={{ ...cardStyle, textAlign: "center", padding: 40 }}>
          <p style={{ color: c.muted, fontSize: 14 }}>Please sign in to access settings.</p>
        </div>
      </SimpleShell>
    );
  }

  if (profileLoading || participantLoading) {
    return (
      <SimpleShell>
        <div style={{ textAlign: "center", padding: 60 }}>
          <p style={{ color: c.muted, fontSize: 14 }}>Loading…</p>
        </div>
      </SimpleShell>
    );
  }

  return (
    <SimpleShell>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ marginBottom: 8 }}>
          <h1 style={{ ...pageTitleStyle, textAlign: "center" }} data-testid="text-settings-title">
            Settings & Profile
          </h1>
          <p style={{ fontSize: 13, color: c.muted, marginTop: 4, textAlign: "center" }}>
            {t("profile.title")}
          </p>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitle}>Photo</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: currentPhotoUrl ? `url(${currentPhotoUrl}) center/cover` : `${c.accent}20`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                border: `2px solid ${c.border}`,
                flexShrink: 0,
                fontSize: 24,
                fontFamily: "'Playfair Display', serif",
                color: c.accent,
              }}
              data-testid="button-avatar-upload"
            >
              {!currentPhotoUrl && currentParticipant.name.charAt(0).toUpperCase()}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handlePhotoSelect}
              style={{ display: "none" }}
              data-testid="input-profile-photo"
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ fontSize: 13, color: c.accent, background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}
                data-testid="button-upload-photo"
              >
                {currentPhotoUrl ? t("profile.changePhoto") : t("profile.uploadPhoto")}
              </button>
              <span style={{ fontSize: 10, color: c.mutedLight }}>{t("common.uploadHint")}</span>
              {currentPhotoUrl && (
                <button
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); setRemovePhoto(true); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  style={{ fontSize: 12, color: c.error, background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}
                  data-testid="button-remove-photo"
                >
                  {t("profile.removePhoto")}
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitle}>{t("profile.accountDetails")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>{t("profile.name")}</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("profile.namePlaceholder")}
                style={inputStyle}
                data-testid="input-display-name"
              />
            </div>
            <div>
              <label style={labelStyle}>{t("profile.email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setConfirmEmail(""); }}
                placeholder={t("profile.emailPlaceholder")}
                style={inputStyle}
                data-testid="input-email"
              />
            </div>
            {emailChanged && (
              <div>
                <label style={labelStyle}>Confirm Email</label>
                <input
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder="Repeat new email"
                  style={{ ...inputStyle, borderColor: confirmEmail && confirmEmail !== email ? c.error : c.inputBorder }}
                  data-testid="input-confirm-email"
                />
                {confirmEmail && confirmEmail !== email && (
                  <p style={{ fontSize: 12, color: c.error, marginTop: 4 }}>Emails don't match</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitle}>{t("profile.newPin")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>{t("profile.currentPin")}</label>
              <input
                type="password"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder={t("profile.currentPinPlaceholder")}
                maxLength={6}
                style={{ ...inputStyle, letterSpacing: 3 }}
                data-testid="input-current-pin"
              />
            </div>
            <div>
              <label style={labelStyle}>{t("profile.newPin")}</label>
              <input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder={t("profile.newPinPlaceholder")}
                maxLength={6}
                style={{ ...inputStyle, letterSpacing: 3 }}
                data-testid="input-new-pin"
              />
            </div>
            <div>
              <label style={labelStyle}>{t("profile.confirmPin")}</label>
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder={t("profile.confirmPinPlaceholder")}
                maxLength={6}
                style={{ ...inputStyle, letterSpacing: 3 }}
                data-testid="input-confirm-pin"
              />
            </div>
          </div>
          {newPin && confirmPin && newPin !== confirmPin && (
            <p style={{ fontSize: 12, color: c.error, marginTop: 8 }} data-testid="text-pin-mismatch">
              {t("profile.pinMismatch")}
            </p>
          )}
        </div>

        <div style={cardStyle}>
          <div style={sectionTitle}>{t("profile.newsletterLabel")}</div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={newsletterOptIn}
              onChange={(e) => setNewsletterOptIn(e.target.checked)}
              style={{ marginTop: 2, accentColor: c.accent }}
              data-testid="checkbox-newsletter-profile"
            />
            <div>
              <div style={{ fontSize: 14, color: c.text }}>{t("profile.newsletterOptIn")}</div>
              <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>{t("profile.newsletterHint")}</div>
            </div>
          </label>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitle}>About You</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>{t("profile.bio")}</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 400))}
                placeholder={t("profile.bioPlaceholder")}
                maxLength={400}
                style={textareaStyle}
                data-testid="input-bio"
              />
              <p style={{ fontSize: 11, color: c.muted, textAlign: "right", marginTop: 2 }} data-testid="text-bio-counter">{bio.length}/400</p>
            </div>
            <div>
              <label style={labelStyle}>{t("profile.favoriteWhisky")}</label>
              <input
                value={favoriteWhisky}
                onChange={(e) => setFavoriteWhisky(e.target.value)}
                placeholder={t("profile.favoritePlaceholder")}
                style={inputStyle}
                data-testid="input-favorite-whisky"
              />
            </div>
            <div>
              <label style={labelStyle}>{t("profile.goToDram")}</label>
              <input
                value={goToDram}
                onChange={(e) => setGoToDram(e.target.value)}
                placeholder={t("profile.goToDramPlaceholder")}
                style={inputStyle}
                data-testid="input-go-to-dram"
              />
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitle}>{t("profile.preferredRegions")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }} data-testid="select-regions">
            {REGIONS.map((region) => {
              const active = preferredRegions.includes(region);
              return (
                <span
                  key={region}
                  onClick={() => toggleRegion(region)}
                  style={{
                    ...badgeBase,
                    background: active ? `${c.accent}20` : "transparent",
                    color: active ? c.accent : c.muted,
                    borderColor: active ? c.accent : c.border,
                  }}
                  data-testid={`badge-region-${region.toLowerCase()}`}
                >
                  {region}
                </span>
              );
            })}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>{t("profile.preferredPeatLevel")}</label>
              <select
                value={preferredPeatLevel}
                onChange={(e) => setPreferredPeatLevel(e.target.value)}
                style={selectStyle}
                data-testid="select-peat-level"
              >
                <option value="">{t("profile.selectPeat")}</option>
                {PEAT_LEVELS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t("profile.preferredCaskInfluence")}</label>
              <select
                value={preferredCaskInfluence}
                onChange={(e) => setPreferredCaskInfluence(e.target.value)}
                style={selectStyle}
                data-testid="select-cask-influence"
              >
                <option value="">{t("profile.selectCask")}</option>
                {CASK_TYPES.map((cask) => (
                  <option key={cask} value={cask}>{cask}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitle}>AI Settings</div>
          <p style={{ fontSize: 12, color: c.muted, marginBottom: 12 }}>
            Add your own OpenAI API key to enable AI features like whisky identification, tasting notes, and more.
          </p>
          <div>
            <label style={labelStyle}>OpenAI API Key</label>
            <div style={{ position: "relative" }}>
              <input
                type={showApiKey ? "text" : "password"}
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                placeholder="sk-..."
                style={{ ...inputStyle, fontFamily: "monospace", fontSize: 13, paddingRight: 40 }}
                data-testid="input-openai-key"
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
                  color: c.muted,
                  cursor: "pointer",
                  fontSize: 13,
                  padding: 4,
                }}
                data-testid="button-toggle-key-visibility"
              >
                {showApiKey ? "Hide" : "Show"}
              </button>
            </div>
            {openaiApiKey && (
              <button
                onClick={() => setOpenaiApiKey("")}
                style={{ fontSize: 12, color: c.error, background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 6 }}
                data-testid="button-clear-api-key"
              >
                Remove API key
              </button>
            )}
            <p style={{ fontSize: 10, color: c.mutedLight, marginTop: 6 }}>
              Get your key at{" "}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" style={{ color: c.accent, textDecoration: "none" }}>
                platform.openai.com
              </a>
              . Costs are billed directly to your OpenAI account.
            </p>
          </div>
        </div>

        <button
          onClick={() => saveMutation.mutate()}
          disabled={!canSave}
          style={{ ...btnPrimary, opacity: canSave ? 1 : 0.5, cursor: canSave ? "pointer" : "not-allowed" }}
          data-testid="button-save-profile"
        >
          {saveMutation.isPending ? t("profile.saving") : t("profile.save")}
        </button>

        <div style={{ ...cardStyle, borderColor: `${c.error}30` }}>
          <div style={{ ...sectionTitle, color: c.error }}>{t("profile.dangerZone")}</div>
          <p style={{ fontSize: 13, color: c.muted, marginBottom: 12 }}>
            {t("profile.deleteAccountDesc")}
          </p>
          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              style={btnDanger}
              data-testid="button-delete-account"
            >
              {t("profile.deleteAccount")}
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: 13, color: c.error, margin: 0 }}>{t("account.closeAccountWarning")}</p>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder={t("account.closeAccountPinPlaceholder")}
                value={deletePin}
                onChange={(e) => { setDeletePin(e.target.value.replace(/\D/g, "").slice(0, 4)); setDeletePinError(""); }}
                style={{ ...inputStyle, borderColor: deletePinError ? c.error : c.inputBorder }}
                data-testid="input-delete-pin"
              />
              {deletePinError && (
                <p style={{ fontSize: 12, color: c.error, margin: 0 }} data-testid="text-delete-pin-error">{deletePinError}</p>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => { setDeleteConfirm(false); setDeletePin(""); setDeletePinError(""); }}
                  style={{ ...btnDanger, flex: 1, color: c.muted, borderColor: c.border }}
                  data-testid="button-delete-account-cancel"
                >
                  {t("account.cancel")}
                </button>
                <button
                  onClick={() => deleteMutation.mutate(deletePin)}
                  disabled={deleteMutation.isPending || deletePin.length !== 4}
                  style={{
                    ...btnDanger,
                    flex: 1,
                    background: c.error,
                    color: "#fff",
                    borderColor: c.error,
                    opacity: deletePin.length === 4 ? 1 : 0.5,
                  }}
                  data-testid="button-delete-account-confirm"
                >
                  {t("profile.deleteAccount")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SimpleShell>
  );
}
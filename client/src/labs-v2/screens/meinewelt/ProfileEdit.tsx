import { useState, useEffect, useRef } from "react";
import type { ThemeTokens } from "../../tokens";
import type { Translations } from "../../i18n";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";
import { useV2Lang } from "../../LabsV2Layout";
import SubScreenHeader from "./SubScreenHeader";

interface Props {
  th: ThemeTokens;
  t: Translations;
  participantId: string;
  onBack: () => void;
}

export default function ProfileEdit({ th, t, participantId, onBack }: Props) {
  const { lang, toggle: toggleLang } = useV2Lang();
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/participants/${participantId}`, {
          headers: { "x-participant-id": participantId },
        });
        if (res.ok) {
          const d = await res.json();
          setName(d.name || "");
          setPhotoUrl(d.photoUrl || d.avatarUrl || null);
        }
      } catch { /* ignore */ }
    })();
  }, [participantId]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/participants/${participantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-participant-id": participantId },
        body: JSON.stringify({ name }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handlePhotoUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch(`/api/participants/${participantId}/photo`, {
        method: "POST",
        headers: { "x-participant-id": participantId },
        body: formData,
      });
      if (res.ok) {
        const d = await res.json();
        setPhotoUrl(d.photoUrl || d.url || URL.createObjectURL(file));
      }
    } catch { /* ignore */ }
    setUploading(false);
  };

  return (
    <div className="v2-fade-up" style={{ padding: `${SP.lg}px ${SP.md}px` }}>
      <SubScreenHeader th={th} title={t.mwProfileEdit} onBack={onBack} />

      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", marginBottom: SP.xl,
      }}>
        <div
          style={{
            width: 80, height: 80, borderRadius: RADIUS.full,
            background: photoUrl ? `url(${photoUrl}) center/cover` : th.bgCard,
            border: `2px solid ${th.gold}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: SP.md,
            overflow: "hidden",
          }}
          data-testid="mw-profile-avatar"
        >
          {!photoUrl && <span style={{ fontSize: 32 }}>{"\ud83d\udc64"}</span>}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => { if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]); }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          data-testid="mw-profile-upload-btn"
          style={{
            padding: `${SP.sm}px ${SP.md}px`,
            fontSize: 13,
            fontFamily: FONT.body,
            background: th.bgCard,
            color: th.gold,
            border: `1px solid ${th.border}`,
            borderRadius: RADIUS.full,
            cursor: "pointer",
          }}
        >
          {uploading ? "..." : t.mwPhotoUpload}
        </button>
      </div>

      <div style={{ marginBottom: SP.lg }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: th.muted, display: "block", marginBottom: SP.xs, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {t.mwNameLabel}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          data-testid="mw-profile-name"
          style={{
            width: "100%",
            padding: `${SP.sm}px ${SP.md}px`,
            fontSize: 16,
            fontFamily: FONT.body,
            background: th.inputBg,
            color: th.text,
            border: `1px solid ${th.border}`,
            borderRadius: RADIUS.lg,
            boxSizing: "border-box",
            outline: "none",
          }}
        />
      </div>

      <div style={{ marginBottom: SP.xl }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: th.muted, display: "block", marginBottom: SP.sm, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {t.mwLanguage}
        </label>
        <div style={{ display: "flex", gap: SP.xs }}>
          {(["de", "en"] as const).map((l) => (
            <button
              key={l}
              onClick={() => { if (lang !== l) toggleLang(); }}
              data-testid={`mw-profile-lang-${l}`}
              style={{
                flex: 1,
                minHeight: TOUCH_MIN,
                fontSize: 14,
                fontWeight: lang === l ? 600 : 400,
                fontFamily: FONT.body,
                background: lang === l ? th.bgCard : "transparent",
                color: lang === l ? th.gold : th.muted,
                border: `1px solid ${lang === l ? th.gold : th.border}`,
                borderRadius: RADIUS.lg,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {l === "de" ? "Deutsch" : "English"}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        data-testid="mw-profile-save"
        style={{
          width: "100%",
          minHeight: TOUCH_MIN,
          fontSize: 16,
          fontWeight: 600,
          fontFamily: FONT.body,
          background: saved ? th.green : `linear-gradient(135deg, ${th.gold}, ${th.amber})`,
          color: "#fff",
          border: "none",
          borderRadius: RADIUS.lg,
          cursor: saving ? "wait" : "pointer",
          transition: "all 0.3s",
        }}
      >
        {saved ? t.mwSaved : saving ? "..." : t.mwSaveProfile}
      </button>
    </div>
  );
}

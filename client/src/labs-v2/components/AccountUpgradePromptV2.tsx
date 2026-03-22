import { useState, useEffect } from "react";
import type { ThemeTokens } from "../tokens";
import type { Translations } from "../i18n";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../tokens";
import { Mail, Eye, EyeOff } from "../icons";

interface Props {
  th: ThemeTokens;
  t: Translations;
  participantId: string;
}

export default function AccountUpgradePromptV2({ th, t, participantId }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [hasEmail, setHasEmail] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [emailSaved, setEmailSaved] = useState(false);

  useEffect(() => {
    if (!participantId) return;
    try {
      if (localStorage.getItem(`upgrade_dismissed_${participantId}`) === "1") {
        setDismissed(true);
        return;
      }
    } catch {}
    setDismissed(false);
  }, [participantId]);

  useEffect(() => {
    if (!participantId || dismissed) return;
    fetch(`/api/participants/${participantId}`, {
      headers: { "x-participant-id": participantId },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.email) {
          setHasEmail(true);
        } else {
          setHasEmail(false);
        }
      })
      .catch(() => setHasEmail(true));
  }, [participantId, dismissed]);

  if (!participantId || dismissed || done || hasEmail === null || hasEmail) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || password.length < 4) return;
    setSaving(true);
    setError("");
    try {
      if (!emailSaved) {
        const emailRes = await fetch(`/api/participants/${participantId}/email`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-participant-id": participantId },
          body: JSON.stringify({ email: email.trim() }),
        });
        if (!emailRes.ok) {
          const err = await emailRes.json().catch(() => ({}));
          throw new Error(err.message || t.upgradeEmailErr);
        }
        setEmailSaved(true);
      }
      const pinRes = await fetch(`/api/participants/${participantId}/pin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-participant-id": participantId },
        body: JSON.stringify({ newPin: password }),
      });
      if (!pinRes.ok) {
        const err = await pinRes.json().catch(() => ({}));
        throw new Error(err.message || t.upgradePasswordErr);
      }
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDismiss = () => {
    try { localStorage.setItem(`upgrade_dismissed_${participantId}`, "1"); } catch {}
    setDismissed(true);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: th.inputBg,
    border: `1px solid ${th.border}`,
    borderRadius: RADIUS.sm,
    color: th.text,
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: FONT.body,
  };

  return (
    <div
      style={{
        width: "100%",
        marginTop: SP.lg,
        padding: SP.md,
        background: th.phases.overall.dim,
        border: `1px solid ${th.phases.overall.glow}`,
        borderRadius: RADIUS.lg,
      }}
      data-testid="v2-upgrade-prompt"
    >
      <div style={{ display: "flex", alignItems: "center", gap: SP.sm, marginBottom: SP.xs }}>
        <Mail color={th.phases.overall.accent} size={18} />
        <span
          style={{
            fontFamily: FONT.display,
            fontSize: 15,
            fontWeight: 600,
            color: th.text,
          }}
        >
          {t.upgradeKeepSafe}
        </span>
      </div>
      <p
        style={{
          fontFamily: FONT.body,
          fontSize: 13,
          color: th.muted,
          margin: `0 0 ${SP.md}px`,
        }}
      >
        {t.upgradeDesc}
      </p>
      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: SP.sm }}>
        <input
          type="email"
          placeholder={t.upgradeEmailPH}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
          autoComplete="email"
          disabled={emailSaved}
          data-testid="input-v2-upgrade-email"
        />
        <div style={{ position: "relative" }}>
          <input
            type={showPw ? "text" : "password"}
            placeholder={t.upgradePasswordPH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ ...inputStyle, paddingRight: 36, letterSpacing: showPw ? 0 : 3 }}
            autoComplete="new-password"
            data-testid="input-v2-upgrade-password"
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: th.muted,
              cursor: "pointer",
              padding: 2,
            }}
            tabIndex={-1}
          >
            {showPw ? <EyeOff color={th.muted} size={16} /> : <Eye color={th.muted} size={16} />}
          </button>
        </div>
        <button
          type="submit"
          disabled={saving || !email.trim() || password.length < 4}
          style={{
            padding: `${SP.sm + 2}px`,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: FONT.body,
            background: th.phases.overall.accent,
            color: "#0e0b05",
            border: "none",
            borderRadius: RADIUS.sm,
            cursor: saving ? "wait" : "pointer",
            opacity: !email.trim() || password.length < 4 ? 0.5 : 1,
            minHeight: TOUCH_MIN,
          }}
          data-testid="button-v2-upgrade-save"
        >
          {saving ? t.upgradeSaving : t.upgradeSave}
        </button>
        {error && (
          <p style={{ fontFamily: FONT.body, fontSize: 12, color: th.amber, margin: 0, textAlign: "center" }}>
            {error}
          </p>
        )}
      </form>
      <button
        onClick={handleDismiss}
        style={{
          marginTop: SP.sm,
          width: "100%",
          padding: SP.sm,
          fontSize: 13,
          fontFamily: FONT.body,
          color: th.muted,
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
        data-testid="button-v2-upgrade-dismiss"
      >
        {t.upgradeMaybeLater}
      </button>
    </div>
  );
}

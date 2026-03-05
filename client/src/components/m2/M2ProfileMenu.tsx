import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { v } from "@/lib/themeVars";
import { getSession, signIn, signOut } from "@/lib/session";
import { X, LogOut, User, Globe } from "lucide-react";
import i18n from "@/lib/i18n";

interface M2ProfileMenuProps {
  open: boolean;
  onClose: () => void;
}

export default function M2ProfileMenu({ open, onClose }: M2ProfileMenuProps) {
  const { t } = useTranslation();
  const [session, setSession] = useState(getSession());
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setSession(getSession());
  }, [open]);

  if (!open) return null;

  const handleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      await signIn(email, pin);
      setSession(getSession());
      setEmail("");
      setPin("");
    } catch (e: any) {
      setError(e.message || t("m2.profile.loginFailed", "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    signOut();
    setSession(getSession());
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === "de" ? "en" : "de";
    i18n.changeLanguage(newLang);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 200,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      data-testid="m2-profile-overlay"
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: v.card,
          borderRadius: "16px 16px 0 0",
          padding: "20px 16px max(20px, env(safe-area-inset-bottom))",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
        data-testid="m2-profile-menu"
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: v.text, margin: 0 }}>
            {t("m2.profile", "Profile")}
          </h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: v.muted, padding: 4 }}
            data-testid="m2-profile-close"
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {session.signedIn ? (
          <>
            <div style={{ background: v.elevated, borderRadius: 12, padding: "16px", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <User style={{ width: 32, height: 32, color: v.accent }} />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: v.text }}>{session.name || "—"}</div>
                  <div style={{ fontSize: 12, color: v.muted }}>{session.email || ""}</div>
                </div>
              </div>
            </div>

            <button
              onClick={toggleLanguage}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 16px",
                background: v.elevated,
                border: `1px solid ${v.border}`,
                borderRadius: 12,
                cursor: "pointer",
                color: v.text,
                fontSize: 14,
                fontWeight: 500,
                fontFamily: "system-ui, sans-serif",
                marginBottom: 8,
              }}
              data-testid="m2-profile-language"
            >
              <Globe style={{ width: 18, height: 18, color: v.accent }} />
              <span style={{ flex: 1, textAlign: "left" }}>
                {i18n.language === "de" ? "Switch to English" : "Zu Deutsch wechseln"}
              </span>
              <span style={{ fontSize: 12, color: v.muted, fontWeight: 600 }}>
                {i18n.language.toUpperCase()}
              </span>
            </button>

            <button
              onClick={() => { handleSignOut(); onClose(); }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 16px",
                background: "transparent",
                border: `1px solid ${v.border}`,
                borderRadius: 12,
                cursor: "pointer",
                color: v.danger,
                fontSize: 14,
                fontWeight: 500,
                fontFamily: "system-ui, sans-serif",
              }}
              data-testid="m2-profile-signout"
            >
              <LogOut style={{ width: 18, height: 18 }} />
              {t("m2.profile.signOut", "Sign Out")}
            </button>
          </>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("m2.profile.emailPlaceholder", "Email")}
                style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1px solid ${v.border}`, background: v.elevated, color: v.text, fontSize: 15, fontFamily: "system-ui, sans-serif", outline: "none", boxSizing: "border-box" }}
                data-testid="m2-profile-email"
              />
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder={t("m2.profile.passwordPlaceholder", "Password")}
                onKeyDown={(e) => { if (e.key === "Enter") handleSignIn(); }}
                style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1px solid ${v.border}`, background: v.elevated, color: v.text, fontSize: 15, fontFamily: "system-ui, sans-serif", outline: "none", boxSizing: "border-box" }}
                data-testid="m2-profile-password"
              />
              {error && <div style={{ fontSize: 13, color: v.danger }}>{error}</div>}
              <button
                onClick={handleSignIn}
                disabled={loading || !email || !pin}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: 12,
                  border: "none",
                  background: (!email || !pin) ? v.muted : v.accent,
                  color: v.bg,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: loading ? "wait" : "pointer",
                  fontFamily: "system-ui, sans-serif",
                  opacity: loading ? 0.6 : 1,
                }}
                data-testid="m2-profile-signin"
              >
                {loading ? t("m2.profile.signingIn", "Signing in...") : t("m2.profile.signIn", "Sign In")}
              </button>
            </div>

            <button
              onClick={toggleLanguage}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 16px",
                background: "transparent",
                border: `1px solid ${v.border}`,
                borderRadius: 12,
                cursor: "pointer",
                color: v.text,
                fontSize: 14,
                fontWeight: 500,
                fontFamily: "system-ui, sans-serif",
                marginTop: 12,
              }}
              data-testid="m2-profile-language"
            >
              <Globe style={{ width: 18, height: 18, color: v.accent }} />
              <span style={{ flex: 1, textAlign: "left" }}>
                {i18n.language === "de" ? "Switch to English" : "Zu Deutsch wechseln"}
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

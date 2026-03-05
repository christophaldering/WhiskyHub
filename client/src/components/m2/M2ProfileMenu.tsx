import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { v } from "@/lib/themeVars";
import { getSession, signIn, signOut } from "@/lib/session";
import { X, LogOut, User, Globe, Settings, Palette, Download, ArrowLeftRight } from "lucide-react";
import i18n from "@/lib/i18n";

interface M2ProfileMenuProps {
  open: boolean;
  onClose: () => void;
}

export default function M2ProfileMenu({ open, onClose }: M2ProfileMenuProps) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [session, setSession] = useState(getSession());
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const refreshSession = useCallback(() => {
    setSession(getSession());
  }, []);

  useEffect(() => {
    if (open) refreshSession();
  }, [open, refreshSession]);

  useEffect(() => {
    window.addEventListener("session-change", refreshSession);
    return () => window.removeEventListener("session-change", refreshSession);
  }, [refreshSession]);

  if (!open) return null;

  const handleSignIn = async () => {
    if (!email.trim() || !pin.trim()) return;
    setError("");
    setLoading(true);
    try {
      const result = await signIn({
        pin: pin.trim(),
        email: email.trim(),
        mode: "log",
        remember: true,
      });
      if (!result.ok) {
        const msg = result.error || "";
        if (result.retryAfter && result.retryAfter > 0) {
          const mins = Math.floor(result.retryAfter / 60);
          const secs = result.retryAfter % 60;
          setError(t("m2.profile.tooManyAttempts", `Too many attempts. Try again in ${mins}:${String(secs).padStart(2, "0")}`, { time: `${mins}:${String(secs).padStart(2, "0")}` }));
        } else if (msg.includes("Invalid p") || msg.includes("Invalid P")) {
          setError(t("m2.profile.wrongPassword", "Wrong password"));
        } else if (msg.includes("No account")) {
          setError(t("m2.profile.noAccount", "No account found with this email"));
        } else {
          setError(msg || t("m2.profile.loginFailed", "Login failed"));
        }
        setLoading(false);
        return;
      }
      setEmail("");
      setPin("");
      setError("");
      refreshSession();
      onClose();
    } catch (e: any) {
      setError(e.message || t("m2.profile.loginFailed", "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    try { localStorage.removeItem("casksense_participant_id"); } catch {}
    refreshSession();
    onClose();
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === "de" ? "en" : "de";
    i18n.changeLanguage(newLang);
  };

  const participantEmail = (() => {
    try {
      return localStorage.getItem("casksense_participant_email") || "";
    } catch { return ""; }
  })();

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
          padding: "20px 16px calc(80px + env(safe-area-inset-bottom, 0px))",
          maxHeight: "85vh",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
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
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ background: v.elevated, borderRadius: 12, padding: "16px", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <User style={{ width: 32, height: 32, color: v.accent }} />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: v.text }} data-testid="m2-profile-display-name">
                    {session.name || "—"}
                  </div>
                  {participantEmail && (
                    <div style={{ fontSize: 12, color: v.muted }}>{participantEmail}</div>
                  )}
                </div>
              </div>
            </div>

            <MenuButton
              icon={<Settings style={{ width: 18, height: 18, color: v.accent }} />}
              label={t("m2.profile.settings", "Settings")}
              onClick={() => { onClose(); navigate("/m2/taste/profile"); }}
              testId="m2-profile-settings"
            />
            <MenuButton
              icon={<Palette style={{ width: 18, height: 18, color: v.accent }} />}
              label={t("m2.profile.theme", "Theme")}
              onClick={toggleLanguage}
              suffix={<span style={{ fontSize: 12, color: v.muted, fontWeight: 600 }}>{i18n.language.toUpperCase()}</span>}
              testId="m2-profile-language"
            />
            <MenuButton
              icon={<Download style={{ width: 18, height: 18, color: v.accent }} />}
              label={t("m2.profile.dataExport", "Data & Export")}
              onClick={() => { onClose(); navigate("/m2/taste/drams"); }}
              testId="m2-profile-data"
            />
            <MenuButton
              icon={<ArrowLeftRight style={{ width: 18, height: 18, color: v.accent }} />}
              label={t("m2.profile.switchClassic", "Switch to Classic UI")}
              onClick={() => { onClose(); window.location.href = "/tasting"; }}
              testId="m2-profile-classic"
            />

            <div style={{ height: 8 }} />

            <button
              onClick={handleSignOut}
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
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder={t("m2.profile.emailPlaceholder", "Email")}
                autoComplete="email"
                style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1px solid ${error ? v.danger : v.border}`, background: v.elevated, color: v.text, fontSize: 15, fontFamily: "system-ui, sans-serif", outline: "none", boxSizing: "border-box" }}
                data-testid="m2-profile-email"
              />
              <input
                type="password"
                value={pin}
                onChange={(e) => { setPin(e.target.value); setError(""); }}
                placeholder={t("m2.profile.passwordPlaceholder", "Password")}
                autoComplete="current-password"
                onKeyDown={(e) => { if (e.key === "Enter" && email.trim() && pin.trim() && !loading) handleSignIn(); }}
                style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1px solid ${error ? v.danger : v.border}`, background: v.elevated, color: v.text, fontSize: 15, fontFamily: "system-ui, sans-serif", outline: "none", boxSizing: "border-box" }}
                data-testid="m2-profile-password"
              />
              {error && (
                <div style={{ fontSize: 13, color: v.danger, padding: "4px 2px" }} data-testid="m2-profile-error">
                  {error}
                </div>
              )}
              <button
                onClick={handleSignIn}
                disabled={loading || !email.trim() || !pin.trim()}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: 12,
                  border: "none",
                  background: (!email.trim() || !pin.trim()) ? v.muted : v.accent,
                  color: v.bg,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: loading || !email.trim() || !pin.trim() ? "not-allowed" : "pointer",
                  fontFamily: "system-ui, sans-serif",
                  opacity: loading ? 0.6 : 1,
                  transition: "opacity 0.15s, background 0.15s",
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

            <div style={{ height: 24 }} />
          </>
        )}
      </div>
    </div>
  );
}

function MenuButton({ icon, label, onClick, suffix, testId }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  suffix?: React.ReactNode;
  testId: string;
}) {
  return (
    <button
      onClick={onClick}
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
      }}
      data-testid={testId}
    >
      {icon}
      <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
      {suffix}
    </button>
  );
}

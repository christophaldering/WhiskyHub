import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { v } from "@/lib/themeVars";
import { getTheme, setTheme, type ThemeName } from "@/lib/themeVars";
import { getSession, signIn, signOut, setSessionPid } from "@/lib/session";
import { participantApi } from "@/lib/api";
import {
  X, LogOut, User, Globe, Settings, Palette, Download,
  ArrowLeftRight, UserPlus, KeyRound, Mail, Eye, EyeOff,
  Shield, ChevronLeft, Sun, Moon, CheckCircle2, Info, HandHeart,
} from "lucide-react";
import i18n from "@/lib/i18n";

type MenuView = "main" | "forgot-pin" | "reset-pin" | "verify-email" | "guest";

interface M2ProfileMenuProps {
  open: boolean;
  onClose: () => void;
}

const labsV: typeof v = {
  bg: "var(--labs-bg)",
  card: "var(--labs-surface)",
  elevated: "var(--labs-surface-elevated)",
  text: "var(--labs-text)",
  textSecondary: "var(--labs-text-secondary)",
  muted: "var(--labs-text-muted)",
  mutedLight: "var(--labs-text-muted)",
  accent: "var(--labs-accent)",
  accentDim: "var(--labs-accent-muted)",
  accentInk: "var(--labs-on-accent)",
  border: "var(--labs-border)",
  success: "var(--labs-success)",
  danger: "var(--labs-danger)",
  error: "var(--labs-danger)",
  inputBg: "var(--labs-surface-elevated)",
  inputBorder: "var(--labs-border)",
  inputText: "var(--labs-text)",
  placeholder: "var(--labs-text-muted)",
  gold: "var(--labs-accent)",
  silver: "var(--labs-text-muted)",
  bronze: "var(--labs-accent)",
  high: "var(--labs-success)",
  medium: "var(--labs-accent)",
  low: "var(--labs-danger)",
  tagline: "var(--labs-text-secondary)",
  subtleBorder: "var(--labs-border-subtle)",
  subtleText: "var(--labs-text-muted)",
  sessionSigned: "var(--labs-success)",
  sessionUnsigned: "var(--labs-text-muted)",
  shadow: "0 2px 12px rgba(0,0,0,0.15)",
  divider: "var(--labs-border-subtle)",
  sliderTrack: "var(--labs-border)",
  sliderThumb: "var(--labs-accent)",
  deltaPositive: "var(--labs-success)",
  deltaNegative: "var(--labs-danger)",
  tableRowHover: "var(--labs-surface-hover)",
  pillBg: "var(--labs-accent-muted)",
  pillText: "var(--labs-accent)",
  focusRing: "var(--labs-accent)",
};

export default function M2ProfileMenu({ open, onClose }: M2ProfileMenuProps) {
  const { t } = useTranslation();
  const [location, navigate] = useLocation();
  const [session, setSession] = useState(getSession());
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setErrorRaw] = useState("");
  const setError = useCallback((v: unknown) => {
    setErrorRaw(typeof v === "string" ? v : v != null ? String(v) : "");
  }, []);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<MenuView>("main");
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(getTheme());

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPin, setRegPin] = useState("");
  const [regPinConfirm, setRegPinConfirm] = useState("");
  const [regShowPin, setRegShowPin] = useState(false);
  const [signInShowPin, setSignInShowPin] = useState(false);
  const [resetShowPin, setResetShowPin] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [regConsent, setRegConsent] = useState(false);
  const [regVerifyMode, setRegVerifyMode] = useState(false);
  const [regPendingParticipant, setRegPendingParticipant] = useState<{ id: string; name: string; email?: string } | null>(null);
  const [regVerifyCode, setRegVerifyCode] = useState("");
  const [regVerifyError, setRegVerifyError] = useState("");
  const [regVerifyLoading, setRegVerifyLoading] = useState(false);
  const [regResendLoading, setRegResendLoading] = useState(false);
  const [regResendSuccess, setRegResendSuccess] = useState(false);

  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPid, setForgotPid] = useState("");

  const [resetCode, setResetCode] = useState("");
  const [resetNewPin, setResetNewPin] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  const [verifyCode, setVerifyCode] = useState("");
  const [verifySuccess, setVerifySuccess] = useState(false);

  const [guestName, setGuestName] = useState("");
  const [guestPin, setGuestPin] = useState("");
  const [m2GuestConsent, setM2GuestConsent] = useState(false);

  const [labsTheme, setLabsThemeState] = useState<"dark" | "light">(() => {
    try { return ((localStorage.getItem("cs_labs_theme") || localStorage.getItem("v2_theme")) as "dark" | "light") || "dark"; } catch { return "dark"; }
  });

  const refreshSession = useCallback(() => {
    setSession(getSession());
  }, []);

  useEffect(() => {
    if (open) {
      refreshSession();
      setView("main");
      setError("");
      setRegSuccess(false);
      setRegConsent(false);
      setRegVerifyMode(false);
      setRegPendingParticipant(null);
      setRegVerifyCode("");
      setRegVerifyError("");
      setResetSuccess(false);
      setVerifySuccess(false);
    }
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
    refreshSession();
    onClose();
  };

  const handleLang = (lang: 'de' | 'en') => {
    i18n.changeLanguage(lang);
    localStorage.setItem('casksense-language', lang);
  };

  const toggleLanguage = () => {
    handleLang(i18n.language === "de" ? "en" : "de");
  };

  const toggleTheme = () => {
    const newTheme: ThemeName = currentTheme === "dark-warm" ? "light-warm" : "dark-warm";
    setTheme(newTheme);
    setCurrentTheme(newTheme);
  };

  const toggleLabsTheme = () => {
    const next = labsTheme === "dark" ? "light" : "dark";
    setLabsThemeState(next);
    try { localStorage.setItem("cs_labs_theme", next); localStorage.setItem("v2_theme", next); } catch {}
    window.dispatchEvent(new CustomEvent("labs-theme-changed"));
    const shell = document.querySelector(".labs-shell");
    if (shell) {
      if (next === "light") shell.classList.add("labs-light");
      else shell.classList.remove("labs-light");
    }
  };

  const isLabs = location.startsWith("/labs");
  const tv = isLabs ? labsV : v;

  const handleRegister = async () => {
    if (!regName.trim() || !regEmail.trim() || !regPin.trim()) {
      setError(t("m2.register.allFieldsRequired", "All fields are required"));
      return;
    }
    if (regPin !== regPinConfirm) {
      setError(t("m2.register.pinMismatch", "Passwords do not match"));
      return;
    }
    if (regPin.length < 4) {
      setError(t("m2.register.pinTooShort", "Password must be at least 4 characters"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      setError(t("m2.register.invalidEmail", "Please enter a valid email"));
      return;
    }
    if (!regConsent) {
      setError(t("login.privacyConsentRequired", "Please accept the privacy policy"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      const participant = await participantApi.loginOrCreate(regName.trim(), regPin.trim(), regEmail.trim(), undefined, regConsent);
      if (!participant.emailVerified) {
        setRegPendingParticipant({ id: participant.id, name: participant.name, email: participant.email });
        setRegVerifyMode(true);
        setRegVerifyCode("");
        setRegVerifyError("");
      } else {
        const result = await signIn({
          pin: regPin.trim(),
          email: regEmail.trim(),
          mode: "log",
          remember: true,
        });
        if (result.ok) {
          refreshSession();
          setRegSuccess(true);
          setTimeout(() => onClose(), 1500);
        } else {
          setError(result.error || t("m2.profile.loginFailed", "Login failed"));
        }
      }
    } catch (e: any) {
      setError(e.message || t("m2.register.failed", "Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleRegVerify = async () => {
    if (!regPendingParticipant) return;
    if (!regVerifyCode.trim()) {
      setRegVerifyError(t("verify.codeRequired", "Please enter the verification code"));
      return;
    }
    setRegVerifyLoading(true);
    setRegVerifyError("");
    try {
      await participantApi.verify(regPendingParticipant.id, regVerifyCode.trim());
      const result = await signIn({
        pin: regPin.trim(),
        email: regEmail.trim(),
        mode: "log",
        remember: true,
      });
      if (result.ok) {
        refreshSession();
        setRegVerifyMode(false);
        setRegPendingParticipant(null);
        setRegSuccess(true);
        setTimeout(() => onClose(), 1500);
      } else {
        setRegVerifyError(result.error || t("m2.profile.loginFailed", "Login failed"));
      }
    } catch (e: any) {
      setRegVerifyError(e.message || t("verify.invalidCode", "Invalid verification code"));
    } finally {
      setRegVerifyLoading(false);
    }
  };

  const handleRegResend = async () => {
    if (!regPendingParticipant) return;
    setRegResendLoading(true);
    setRegResendSuccess(false);
    try {
      await participantApi.resendVerification(regPendingParticipant.id);
      setRegResendSuccess(true);
      setTimeout(() => setRegResendSuccess(false), 3000);
    } catch (e: any) {
      setRegVerifyError(e.message || t("verify.resendFailed", "Failed to resend code"));
    } finally {
      setRegResendLoading(false);
    }
  };

  const handleForgotPin = async () => {
    if (!forgotEmail.trim()) {
      setError(t("m2.forgotPin.emailRequired", "Email is required"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/participants/forgot-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || t("m2.forgotPin.failed", "Request failed"));
        setLoading(false);
        return;
      }
      setForgotPid(data.participantId);
      setView("reset-pin");
    } catch (e: any) {
      setError(e.message || t("m2.forgotPin.failed", "Request failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async () => {
    if (!resetCode.trim() || !resetNewPin.trim()) {
      setError(t("m2.resetPin.allFieldsRequired", "All fields are required"));
      return;
    }
    if (resetNewPin.length < 4) {
      setError(t("m2.resetPin.pinTooShort", "Password must be at least 4 characters"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/participants/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: forgotPid, code: resetCode.trim(), newPin: resetNewPin.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || t("m2.resetPin.failed", "Reset failed"));
        setLoading(false);
        return;
      }
      setResetSuccess(true);
      setTimeout(() => { setView("main"); setResetSuccess(false); }, 2000);
    } catch (e: any) {
      setError(e.message || t("m2.resetPin.failed", "Reset failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!verifyCode.trim()) return;
    const pid = session.pid;
    if (!pid) return;
    setError("");
    setLoading(true);
    try {
      await participantApi.verify(pid, verifyCode.trim());
      setVerifySuccess(true);
      setTimeout(() => { setView("main"); }, 1500);
    } catch (e: any) {
      setError(e.message || t("m2.verify.failed", "Verification failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const pid = session.pid;
    if (!pid) return;
    setLoading(true);
    try {
      await participantApi.resendVerification(pid);
      setError("");
    } catch (e: any) {
      setError(e.message || t("m2.profile.resendFailed", "Failed to resend"));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestJoin = async () => {
    if (!guestName.trim() || !guestPin.trim() || !m2GuestConsent) {
      setError(t("m2.guest.allFieldsRequired", "Name and tasting code are required"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await participantApi.guestJoin(guestName.trim(), guestPin.trim(), m2GuestConsent);
      if (res?.id) {
        setSessionPid(res.id);
        try {
          sessionStorage.setItem("session_signed_in", "1");
          sessionStorage.setItem("session_mode", "tasting");
          sessionStorage.setItem("session_name", guestName.trim());
          sessionStorage.setItem("session_role", "");
          localStorage.setItem("casksense_participant_id", res.id);
        } catch {}
        try {
          const { useAppStore } = await import("@/lib/store");
          useAppStore.getState().setParticipant({ id: res.id, name: guestName.trim() });
        } catch {}
        window.dispatchEvent(new Event("session-change"));
        refreshSession();
        onClose();
      }
    } catch (e: any) {
      setError(e.message || t("m2.guest.failed", "Could not join as guest"));
    } finally {
      setLoading(false);
    }
  };

  const participantEmail = (() => {
    try {
      return localStorage.getItem("casksense_participant_email") || "";
    } catch { return ""; }
  })();

  const renderBackButton = (label: string) => (
    <button
      onClick={() => { setView("main"); setError(""); }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        background: "none",
        border: "none",
        cursor: "pointer",
        color: tv.accent,
        fontSize: 14,
        fontWeight: 500,
        padding: 0,
        marginBottom: 12,
        fontFamily: "system-ui, sans-serif",
      }}
      data-testid="m2-profile-back"
    >
      <ChevronLeft style={{ width: 16, height: 16 }} />
      {label}
    </button>
  );

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: "100%",
    padding: "12px",
    borderRadius: 10,
    border: `1px solid ${hasError ? tv.danger : tv.border}`,
    background: tv.elevated,
    color: tv.text,
    fontSize: 15,
    fontFamily: "system-ui, sans-serif",
    outline: "none",
    boxSizing: "border-box",
  });

  const primaryBtnStyle = (disabled?: boolean): React.CSSProperties => ({
    width: "100%",
    padding: "14px",
    borderRadius: 12,
    border: "none",
    background: disabled ? tv.muted : tv.accent,
    color: tv.bg,
    fontWeight: 700,
    fontSize: 15,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "system-ui, sans-serif",
    opacity: loading ? 0.6 : 1,
    transition: "opacity 0.15s, background 0.15s",
  });

  const renderForgotPinView = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {renderBackButton(t("m2.forgotPin.back", "Back to Sign In"))}
      <h3 style={{ fontSize: 16, fontWeight: 700, color: tv.text, margin: "0 0 4px" }}>
        {t("m2.forgotPin.title", "Reset Password")}
      </h3>
      <p style={{ fontSize: 13, color: tv.muted, margin: "0 0 4px" }}>
        {t("m2.forgotPin.description", "Enter your email and we'll send you a verification code.")}
      </p>
      <input
        type="email"
        value={forgotEmail}
        onChange={(e) => { setForgotEmail(e.target.value); setError(""); }}
        placeholder={t("m2.forgotPin.emailPlaceholder", "Your email")}
        autoComplete="email"
        style={inputStyle(!!error)}
        data-testid="m2-forgot-email"
      />
      {error && (
        <div style={{ fontSize: 13, color: tv.danger, padding: "4px 2px" }} data-testid="m2-forgot-error">
          {error}
        </div>
      )}
      <button
        onClick={handleForgotPin}
        disabled={loading || !forgotEmail.trim()}
        style={primaryBtnStyle(!forgotEmail.trim())}
        data-testid="m2-forgot-submit"
      >
        {loading ? t("m2.forgotPin.sending", "Sending...") : t("m2.forgotPin.send", "Send Reset Code")}
      </button>
    </div>
  );

  const renderResetPinView = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {renderBackButton(t("m2.resetPin.back", "Back"))}
      <h3 style={{ fontSize: 16, fontWeight: 700, color: tv.text, margin: "0 0 4px" }}>
        {t("m2.resetPin.title", "Enter Reset Code")}
      </h3>
      {resetSuccess ? (
        <div style={{ textAlign: "center", padding: 20 }}>
          <CheckCircle2 style={{ width: 48, height: 48, color: tv.success, margin: "0 auto 12px" }} />
          <div style={{ fontSize: 15, color: tv.text, fontWeight: 600 }}>
            {t("m2.resetPin.success", "Password reset successfully! You can now sign in.")}
          </div>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 13, color: tv.muted, margin: "0 0 4px" }}>
            {t("m2.resetPin.description", "Check your email for the 6-digit code.")}
          </p>
          <input
            type="text"
            value={resetCode}
            onChange={(e) => { setResetCode(e.target.value); setError(""); }}
            placeholder={t("m2.resetPin.codePlaceholder", "6-digit code")}
            maxLength={6}
            style={inputStyle(!!error)}
            data-testid="m2-reset-code"
          />
          <div style={{ position: "relative" }}>
            <input
              type={resetShowPin ? "text" : "password"}
              value={resetNewPin}
              onChange={(e) => { setResetNewPin(e.target.value); setError(""); }}
              placeholder={t("m2.resetPin.newPinPlaceholder", "New password (min 4 chars)")}
              autoComplete="new-password"
              style={inputStyle(!!error)}
              data-testid="m2-reset-new-pin"
            />
            <button
              type="button"
              onClick={() => setResetShowPin(!resetShowPin)}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: tv.muted, padding: 0 }}
              data-testid="m2-reset-toggle-password"
            >
              {resetShowPin ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
            </button>
          </div>
          {error && (
            <div style={{ fontSize: 13, color: tv.danger, padding: "4px 2px" }} data-testid="m2-reset-error">
              {error}
            </div>
          )}
          <button
            onClick={handleResetPin}
            disabled={loading || !resetCode.trim() || !resetNewPin.trim()}
            style={primaryBtnStyle(!resetCode.trim() || !resetNewPin.trim())}
            data-testid="m2-reset-submit"
          >
            {loading ? t("m2.resetPin.resetting", "Resetting...") : t("m2.resetPin.reset", "Reset Password")}
          </button>
        </>
      )}
    </div>
  );

  const renderVerifyEmailView = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {renderBackButton(t("m2.verify.back", "Back"))}
      <h3 style={{ fontSize: 16, fontWeight: 700, color: tv.text, margin: "0 0 4px" }}>
        {t("m2.verify.title", "Verify Email")}
      </h3>
      {verifySuccess ? (
        <div style={{ textAlign: "center", padding: 20 }}>
          <CheckCircle2 style={{ width: 48, height: 48, color: tv.success, margin: "0 auto 12px" }} />
          <div style={{ fontSize: 15, color: tv.text, fontWeight: 600 }}>
            {t("m2.verify.success", "Email verified successfully!")}
          </div>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 13, color: tv.muted, margin: "0 0 4px" }}>
            {t("m2.verify.description", "Enter the 6-digit code sent to your email.")}
          </p>
          <input
            type="text"
            value={verifyCode}
            onChange={(e) => { setVerifyCode(e.target.value); setError(""); }}
            placeholder={t("m2.verify.codePlaceholder", "6-digit code")}
            maxLength={6}
            style={inputStyle(!!error)}
            data-testid="m2-verify-code"
          />
          {error && (
            <div style={{ fontSize: 13, color: tv.danger, padding: "4px 2px" }} data-testid="m2-verify-error">
              {error}
            </div>
          )}
          <button
            onClick={handleVerifyEmail}
            disabled={loading || !verifyCode.trim()}
            style={primaryBtnStyle(!verifyCode.trim())}
            data-testid="m2-verify-submit"
          >
            {loading ? t("m2.verify.verifying", "Verifying...") : t("m2.verify.verify", "Verify")}
          </button>
          <button
            onClick={handleResendVerification}
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 10,
              border: `1px solid ${tv.border}`,
              background: "transparent",
              color: tv.accent,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "system-ui, sans-serif",
            }}
            data-testid="m2-verify-resend"
          >
            {t("m2.verify.resend", "Resend Code")}
          </button>
        </>
      )}
    </div>
  );

  const renderGuestView = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {renderBackButton(t("m2.guest.back", "Back to Sign In"))}
      <h3 style={{ fontSize: 16, fontWeight: 700, color: tv.text, margin: "0 0 4px" }}>
        {t("m2.guest.title", "Joyn as Guest")}
      </h3>
      <p style={{ fontSize: 13, color: tv.muted, margin: "0 0 4px" }}>
        {t("m2.guest.description", "Enter your name and the tasting code to join without an account.")}
      </p>
      <input
        type="text"
        value={guestName}
        onChange={(e) => { setGuestName(e.target.value); setError(""); }}
        placeholder={t("m2.guest.namePlaceholder", "Your Name")}
        style={inputStyle(!!error)}
        data-testid="m2-guest-name"
      />
      <input
        type="text"
        value={guestPin}
        onChange={(e) => { setGuestPin(e.target.value); setError(""); }}
        placeholder={t("m2.guest.codePlaceholder", "Tasting Code")}
        style={inputStyle(!!error)}
        data-testid="m2-guest-code"
      />
      {error && (
        <div style={{ fontSize: 13, color: tv.danger, padding: "4px 2px" }} data-testid="m2-guest-error">
          {error}
        </div>
      )}
      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", margin: "4px 0" }}>
        <input
          type="checkbox"
          checked={m2GuestConsent}
          onChange={(e) => setM2GuestConsent(e.target.checked)}
          style={{ marginTop: 3 }}
          data-testid="m2-guest-consent"
        />
        <span style={{ fontSize: 11, color: tv.muted, lineHeight: 1.4 }}>
          {String(t('login.privacyConsentLabel'))}{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: tv.accent, textDecoration: "underline" }}>{String(t('login.privacyConsentLink'))}</a>{" "}
          {String(t('login.andThe'))}{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: tv.accent, textDecoration: "underline" }}>{String(t('login.termsConsentLink'))}</a>
        </span>
      </label>
      <button
        onClick={handleGuestJoin}
        disabled={loading || !guestName.trim() || !guestPin.trim() || !m2GuestConsent}
        style={primaryBtnStyle(!guestName.trim() || !guestPin.trim() || !m2GuestConsent)}
        data-testid="m2-guest-submit"
      >
        {loading ? t("m2.guest.joining", "Joining...") : t("m2.guest.join", "Joyn Tasting")}
      </button>
    </div>
  );

  const renderSignedInView = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ background: tv.elevated, borderRadius: 12, padding: "16px", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {session.photoUrl ? (
            <img
              src={session.photoUrl}
              alt={session.name ?? ''}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '0.5px solid var(--labs-border)',
              }}
              data-testid="m2-profile-avatar-img"
            />
          ) : (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--labs-surface)',
                border: '0.5px solid var(--labs-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--labs-text-secondary)',
                fontFamily: "'DM Sans', sans-serif",
              }}
              data-testid="m2-profile-avatar-initials"
            >
              {(session.name ?? 'G').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: tv.text }} data-testid="m2-profile-display-name">
              {typeof session.name === "string" ? session.name : "—"}
            </div>
            {participantEmail && (
              <div style={{ fontSize: 12, color: tv.muted }}>{participantEmail}</div>
            )}
          </div>
        </div>
      </div>


      <div style={{ height: 1, background: tv.border, margin: "8px 0" }} />

      <MenuButton theme={tv}
        icon={<Settings style={{ width: 18, height: 18, color: tv.accent }} />}
        label={t("m2.profile.settings", "Settings")}
        onClick={() => { onClose(); navigate(isLabs ? "/labs/taste/settings" : "/m2/taste/settings"); }}
        testId="m2-profile-settings"
      />
      {isLabs ? (
        <MenuButton theme={tv}
          icon={labsTheme === "dark"
            ? <Sun style={{ width: 18, height: 18, color: tv.accent }} />
            : <Moon style={{ width: 18, height: 18, color: tv.accent }} />}
          label={t("m2.profile.theme", "Theme")}
          onClick={toggleLabsTheme}
          suffix={
            <span style={{ fontSize: 12, color: tv.muted, fontWeight: 600 }}>
              {labsTheme === "dark"
                ? t("m2.profile.themeLight", "Light")
                : t("m2.profile.themeDark", "Dark")}
            </span>
          }
          testId="m2-profile-theme"
        />
      ) : (
        <MenuButton theme={tv}
          icon={currentTheme === "dark-warm"
            ? <Sun style={{ width: 18, height: 18, color: tv.accent }} />
            : <Moon style={{ width: 18, height: 18, color: tv.accent }} />}
          label={t("m2.profile.theme", "Theme")}
          onClick={toggleTheme}
          suffix={
            <span style={{ fontSize: 12, color: tv.muted, fontWeight: 600 }}>
              {currentTheme === "dark-warm"
                ? t("m2.profile.themeLight", "Light")
                : t("m2.profile.themeDark", "Dark")}
            </span>
          }
          testId="m2-profile-theme"
        />
      )}
      <MenuButton theme={tv}
        icon={<Globe style={{ width: 18, height: 18, color: tv.accent }} />}
        label={t("m2.profile.language", "Language")}
        onClick={toggleLanguage}
        suffix={<span style={{ fontSize: 12, color: tv.muted, fontWeight: 600 }}>{i18n.language.toUpperCase()}</span>}
        testId="m2-profile-language"
      />
      <MenuButton theme={tv}
        icon={<Mail style={{ width: 18, height: 18, color: tv.accent }} />}
        label={t("m2.profile.verifyEmail", "Verify Email")}
        onClick={() => { setView("verify-email"); setError(""); }}
        testId="m2-profile-verify-email"
      />
      <MenuButton theme={tv}
        icon={<Download style={{ width: 18, height: 18, color: tv.accent }} />}
        label={t("m2.profile.dataExport", "Data & Export")}
        onClick={() => { onClose(); navigate(isLabs ? "/labs/taste/downloads" : "/m2/taste/downloads"); }}
        testId="m2-profile-data"
      />
      {session.role === "admin" && (
        <>
          <MenuButton theme={tv}
            icon={<Shield style={{ width: 18, height: 18, color: tv.accent }} />}
            label={t("m2.profile.admin", "Admin")}
            onClick={() => { onClose(); navigate(isLabs ? "/labs/admin" : "/m2/admin"); }}
            testId="m2-profile-admin"
          />
          {!isLabs && (
            <MenuButton theme={tv}
              icon={<ArrowLeftRight style={{ width: 18, height: 18, color: tv.accent }} />}
              label={t("m2.profile.switchClassic", "Switch to Classic UI")}
              onClick={() => { onClose(); window.location.href = "/tasting"; }}
              testId="m2-profile-classic"
            />
          )}
        </>
      )}

      <div style={{ height: 1, background: tv.border, margin: "8px 0" }} />

      <MenuButton theme={tv}
        icon={<Info style={{ width: 18, height: 18, color: tv.accent }} />}
        label={t("m2.profile.about", "About CaskSense")}
        onClick={() => { onClose(); navigate(isLabs ? "/labs/about" : "/m2/discover/about"); }}
        testId="m2-profile-about"
      />
      <MenuButton theme={tv}
        icon={<HandHeart style={{ width: 18, height: 18, color: tv.accent }} />}
        label={t("m2.profile.support", "Support Us")}
        onClick={() => { onClose(); navigate(isLabs ? "/labs/donate" : "/m2/discover/donate"); }}
        testId="m2-profile-support"
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
          border: `1px solid ${tv.border}`,
          borderRadius: 12,
          cursor: "pointer",
          color: tv.danger,
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
  );

  const [signedOutTab, setSignedOutTab] = useState<"signin" | "register">("signin");

  const renderSignedOutView = () => (
    <>
      <div style={{ display: "flex", borderRadius: 10, overflow: "hidden", border: `1px solid ${tv.border}`, marginBottom: 14 }}>
        <button
          onClick={() => { setSignedOutTab("signin"); setError(""); }}
          style={{
            flex: 1,
            padding: "10px 0",
            border: "none",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "system-ui, sans-serif",
            background: signedOutTab === "signin" ? tv.accent : "transparent",
            color: signedOutTab === "signin" ? tv.accentInk : tv.textSecondary,
            transition: "all 0.2s",
          }}
          data-testid="m2-profile-tab-signin"
        >
          <KeyRound style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6 }} />
          {t("m2.profile.signIn", "Sign In")}
        </button>
        <button
          onClick={() => { setSignedOutTab("register"); setError(""); }}
          style={{
            flex: 1,
            padding: "10px 0",
            border: "none",
            borderLeft: `1px solid ${tv.border}`,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "system-ui, sans-serif",
            background: signedOutTab === "register" ? tv.accent : "transparent",
            color: signedOutTab === "register" ? tv.accentInk : tv.textSecondary,
            transition: "all 0.2s",
          }}
          data-testid="m2-profile-tab-register"
        >
          <UserPlus style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6 }} />
          {t("m2.profile.createAccount", "Register")}
        </button>
      </div>

      {signedOutTab === "signin" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            placeholder={t("m2.profile.emailPlaceholder", "Email")}
            autoComplete="email"
            style={inputStyle(!!error)}
            data-testid="m2-profile-email"
          />
          <div style={{ position: "relative" }}>
            <input
              type={signInShowPin ? "text" : "password"}
              value={pin}
              onChange={(e) => { setPin(e.target.value); setError(""); }}
              placeholder={t("m2.profile.passwordPlaceholder", "Password")}
              autoComplete="current-password"
              onKeyDown={(e) => { if (e.key === "Enter" && email.trim() && pin.trim() && !loading) handleSignIn(); }}
              style={inputStyle(!!error)}
              data-testid="m2-profile-password"
            />
            <button
              type="button"
              onClick={() => setSignInShowPin(!signInShowPin)}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: tv.muted, padding: 0 }}
              data-testid="m2-signin-toggle-password"
            >
              {signInShowPin ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
            </button>
          </div>
          {error && (
            <div style={{ fontSize: 13, color: tv.danger, padding: "4px 2px" }} data-testid="m2-profile-error">
              {error}
            </div>
          )}
          <button
            onClick={handleSignIn}
            disabled={loading || !email.trim() || !pin.trim()}
            style={primaryBtnStyle(!email.trim() || !pin.trim())}
            data-testid="m2-profile-signin"
          >
            {loading ? t("m2.profile.signingIn", "Signing in...") : t("m2.profile.signIn", "Sign In")}
          </button>

          <button
            onClick={() => { setView("forgot-pin"); setError(""); }}
            style={{
              background: "none",
              border: "none",
              color: tv.accent,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              padding: "4px 0",
              textAlign: "right",
              fontFamily: "system-ui, sans-serif",
            }}
            data-testid="m2-profile-forgot-pin"
          >
            {t("m2.profile.forgotPassword", "Forgot Password?")}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {regSuccess ? (
            <div style={{ textAlign: "center", padding: 20 }}>
              <CheckCircle2 style={{ width: 48, height: 48, color: tv.success, margin: "0 auto 12px" }} />
              <div style={{ fontSize: 15, color: tv.text, fontWeight: 600 }}>
                {t("m2.register.success", "Account created successfully!")}
              </div>
            </div>
          ) : regVerifyMode && regPendingParticipant ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "8px 0" }}>
              <div style={{ textAlign: "center" }}>
                <Mail style={{ width: 36, height: 36, color: tv.accent, margin: "0 auto 8px" }} />
                <div style={{ fontSize: 15, color: tv.text, fontWeight: 600, marginBottom: 4 }}>
                  {t("verify.title", "Verify your email")}
                </div>
                <div style={{ fontSize: 12, color: tv.muted, lineHeight: 1.4 }}>
                  {t("verify.subtitle", { email: regPendingParticipant.email })}
                </div>
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={regVerifyCode}
                onChange={(e) => setRegVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder={t("verify.codePlaceholder", "000000")}
                maxLength={6}
                autoFocus
                style={{ ...inputStyle(!!regVerifyError), textAlign: "center", fontSize: 22, letterSpacing: "0.5em", fontFamily: "monospace" }}
                data-testid="m2-register-verify-code"
                onKeyDown={(e) => e.key === "Enter" && handleRegVerify()}
              />
              <div style={{ fontSize: 11, color: tv.muted }}>{t("verify.codeHint", "Enter the 6-digit code from your email")}</div>
              {regVerifyError && (
                <div style={{ fontSize: 13, color: tv.danger, padding: "4px 2px" }} data-testid="m2-register-verify-error">
                  {regVerifyError}
                </div>
              )}
              <button
                onClick={handleRegVerify}
                disabled={regVerifyLoading || regVerifyCode.length < 6}
                style={primaryBtnStyle(regVerifyCode.length < 6)}
                data-testid="m2-register-verify-submit"
              >
                {regVerifyLoading ? t("verify.verifying", "Verifying...") : t("verify.confirm", "Verify")}
              </button>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => { setRegVerifyMode(false); setRegPendingParticipant(null); setRegVerifyError(""); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: tv.muted, fontSize: 12, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}
                  data-testid="m2-register-verify-back"
                >
                  <ChevronLeft style={{ width: 14, height: 14 }} />
                  {t("verify.backToLogin", "Back")}
                </button>
                <button
                  type="button"
                  onClick={handleRegResend}
                  disabled={regResendLoading}
                  style={{ background: "none", border: "none", cursor: "pointer", color: regResendSuccess ? tv.success : tv.muted, fontSize: 12, fontFamily: "inherit", textDecoration: "underline", opacity: regResendLoading ? 0.5 : 1 }}
                  data-testid="m2-register-verify-resend"
                >
                  {regResendSuccess ? t("verify.resendSuccess", "Code sent!") : regResendLoading ? t("verify.resending", "Sending...") : t("verify.resend", "Resend code")}
                </button>
              </div>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={regName}
                onChange={(e) => { setRegName(e.target.value); setError(""); }}
                placeholder={t("m2.register.namePlaceholder", "Display Name")}
                autoComplete="name"
                style={inputStyle(!!error)}
                data-testid="m2-register-name"
              />
              <input
                type="email"
                value={regEmail}
                onChange={(e) => { setRegEmail(e.target.value); setError(""); }}
                placeholder={t("m2.register.emailPlaceholder", "Email")}
                autoComplete="email"
                style={inputStyle(!!error)}
                data-testid="m2-register-email"
              />
              <div style={{ position: "relative" }}>
                <input
                  type={regShowPin ? "text" : "password"}
                  value={regPin}
                  onChange={(e) => { setRegPin(e.target.value); setError(""); }}
                  placeholder={t("m2.register.passwordPlaceholder", "Password (min 4 chars)")}
                  autoComplete="new-password"
                  style={inputStyle(!!error)}
                  data-testid="m2-register-password"
                />
                <button
                  type="button"
                  onClick={() => setRegShowPin(!regShowPin)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: tv.muted, padding: 0 }}
                  data-testid="m2-register-toggle-password"
                >
                  {regShowPin ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
                </button>
              </div>
              <input
                type={regShowPin ? "text" : "password"}
                value={regPinConfirm}
                onChange={(e) => { setRegPinConfirm(e.target.value); setError(""); }}
                placeholder={t("m2.register.confirmPasswordPlaceholder", "Confirm Password")}
                autoComplete="new-password"
                style={inputStyle(!!error)}
                data-testid="m2-register-confirm-password"
              />
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", margin: "4px 0" }}>
                <input
                  type="checkbox"
                  checked={regConsent}
                  onChange={(e) => setRegConsent(e.target.checked)}
                  style={{ marginTop: 3 }}
                  data-testid="m2-register-consent"
                />
                <span style={{ fontSize: 11, color: tv.muted, lineHeight: 1.4 }}>
                  {String(t('login.privacyConsentLabel'))}{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: tv.accent, textDecoration: "underline" }}>{String(t('login.privacyConsentLink'))}</a>{" "}
                  {String(t('login.andThe'))}{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: tv.accent, textDecoration: "underline" }}>{String(t('login.termsConsentLink'))}</a>
                </span>
              </label>
              {error && (
                <div style={{ fontSize: 13, color: tv.danger, padding: "4px 2px" }} data-testid="m2-register-error">
                  {error}
                </div>
              )}
              <button
                onClick={handleRegister}
                disabled={loading || !regConsent}
                style={primaryBtnStyle(!regName.trim() || !regEmail.trim() || !regPin.trim() || !regConsent)}
                data-testid="m2-register-submit"
              >
                {loading ? t("m2.register.creating", "Creating...") : t("m2.register.create", "Create Account")}
              </button>
            </>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          onClick={() => { setView("guest"); setError(""); }}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "14px 16px",
            background: tv.elevated,
            border: `1px solid ${tv.border}`,
            borderRadius: 12,
            cursor: "pointer",
            color: tv.textSecondary,
            fontSize: 13,
            fontWeight: 500,
            fontFamily: "system-ui, sans-serif",
          }}
          data-testid="m2-profile-guest-mode"
        >
          <Shield style={{ width: 16, height: 16, color: tv.muted }} />
          {t("m2.profile.guestMode", "Guest")}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button
          onClick={isLabs ? toggleLabsTheme : toggleTheme}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "14px 16px",
            background: "transparent",
            border: `1px solid ${tv.border}`,
            borderRadius: 12,
            cursor: "pointer",
            color: tv.text,
            fontSize: 14,
            fontWeight: 500,
            fontFamily: "system-ui, sans-serif",
          }}
          data-testid="m2-profile-theme"
        >
          {isLabs ? (
            <>
              {labsTheme === "dark"
                ? <Sun style={{ width: 16, height: 16, color: tv.accent }} />
                : <Moon style={{ width: 16, height: 16, color: tv.accent }} />}
              {labsTheme === "dark"
                ? t("m2.profile.themeLight", "Light")
                : t("m2.profile.themeDark", "Dark")}
            </>
          ) : (
            <>
              {currentTheme === "dark-warm"
                ? <Sun style={{ width: 16, height: 16, color: tv.accent }} />
                : <Moon style={{ width: 16, height: 16, color: tv.accent }} />}
              {currentTheme === "dark-warm"
                ? t("m2.profile.themeLight", "Light")
                : t("m2.profile.themeDark", "Dark")}
            </>
          )}
        </button>
        <button
          onClick={toggleLanguage}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "14px 16px",
            background: "transparent",
            border: `1px solid ${tv.border}`,
            borderRadius: 12,
            cursor: "pointer",
            color: tv.text,
            fontSize: 14,
            fontWeight: 500,
            fontFamily: "system-ui, sans-serif",
          }}
          data-testid="m2-profile-language"
        >
          <Globe style={{ width: 16, height: 16, color: tv.accent }} />
          {i18n.language === "de" ? "English" : "Deutsch"}
        </button>
      </div>

      <div style={{ height: 24 }} />
    </>
  );

  const renderContent = () => {
    switch (view) {
      case "forgot-pin": return renderForgotPinView();
      case "reset-pin": return renderResetPinView();
      case "verify-email": return renderVerifyEmailView();
      case "guest": return renderGuestView();
      default:
        return session.signedIn ? renderSignedInView() : renderSignedOutView();
    }
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
          background: tv.card,
          borderRadius: "16px 16px 0 0",
          padding: "20px 16px calc(80px + env(safe-area-inset-bottom, 0px))",
          maxHeight: "85vh",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
        data-testid="m2-profile-menu"
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: tv.text, margin: 0 }}>
            {view === "main"
              ? t("m2.profile.label", "Profile")
              : view === "forgot-pin"
              ? t("m2.forgotPin.title", "Reset Password")
              : view === "reset-pin"
              ? t("m2.resetPin.title", "Enter Reset Code")
              : view === "verify-email"
              ? t("m2.verify.title", "Verify Email")
              : t("m2.guest.title", "Joyn as Guest")}
          </h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: tv.muted, padding: 4 }}
            data-testid="m2-profile-close"
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {renderContent()}
      </div>
    </div>
  );
}

function MenuButton({ icon, label, onClick, suffix, testId, theme }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  suffix?: React.ReactNode;
  testId: string;
  theme?: typeof v;
}) {
  const t = theme || v;
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "14px 16px",
        background: t.elevated,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        cursor: "pointer",
        color: t.text,
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

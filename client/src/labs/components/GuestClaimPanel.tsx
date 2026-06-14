import { useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { participantApi } from "@/lib/api";
import { trackEvent } from "@/lib/funnelTracker";

// Eigenstaendiges, selbst-gegatetes Konto-Claim-Panel.
// tone="story": dunkles Story-Editorial-Theme (EB Garamond/Inter, Amber).
// tone="app":   App-Theme (var(--labs-*), Playfair/Cormorant, labs-Klassen) — z.B. Abschluss-Screen.
// Rendert NUR fuer echte Gaeste (experienceLevel "guest", ohne E-Mail).

type Tone = "story" | "app";
type Props = { participantId: string; tastingId: string; tone?: Tone };

export default function GuestClaimPanel({ participantId, tastingId, tone = "story" }: Props) {
  const { t } = useTranslation();

  const { data: me } = useQuery<{ id: string; email?: string | null; experienceLevel?: string | null }>({
    queryKey: ["story-claim-me", participantId],
    queryFn: () => participantApi.get(participantId),
    enabled: !!participantId,
    retry: false,
  });
  const isGuest = !!me && me.experienceLevel === "guest" && !me.email;

  const [claimStep, setClaimStep] = useState<"idle" | "code" | "done">("idle");
  const [claimEmail, setClaimEmail] = useState("");
  const [claimPin, setClaimPin] = useState("");
  const [claimCode, setClaimCode] = useState("");
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimError, setClaimError] = useState("");

  const handleClaim = async () => {
    if (claimBusy) return;
    setClaimError("");
    if (!claimEmail.trim() || claimPin.trim().length < 4) {
      setClaimError(t("eveningRecap.claimMissing", "Bitte E-Mail und eine PIN (mind. 4 Zeichen) ausfüllen."));
      return;
    }
    setClaimBusy(true);
    try {
      await participantApi.claim(participantId, claimEmail.trim(), claimPin.trim());
      trackEvent("guest_claim", { page: `/tasting-story/${tastingId}` });
      setClaimStep("code");
    } catch (e: unknown) {
      setClaimError((e as Error)?.message || t("eveningRecap.claimFailed", "Das hat nicht geklappt. Bitte versuche es erneut."));
    } finally {
      setClaimBusy(false);
    }
  };

  const handleVerifyCode = async () => {
    if (claimBusy) return;
    setClaimError("");
    if (claimCode.trim().length !== 6) {
      setClaimError(t("eveningRecap.codeInvalid", "Der Code hat 6 Ziffern."));
      return;
    }
    setClaimBusy(true);
    try {
      await participantApi.verify(participantId, claimCode.trim());
      setClaimStep("done");
    } catch (e: unknown) {
      setClaimError((e as Error)?.message || t("eveningRecap.codeFailed", "Code ungültig oder abgelaufen."));
    } finally {
      setClaimBusy(false);
    }
  };

  if (!isGuest) return null;

  const isApp = tone === "app";
  const tp = isApp ? "complete" : "story";

  // Theme-abhaengige Werte
  const accent = isApp ? "var(--labs-accent)" : "#C9A961";
  const textMain = isApp ? "var(--labs-text)" : "#F5EDE0";
  const textSecondary = isApp ? "var(--labs-text-secondary)" : "#F5EDE0";
  const textMuted = isApp ? "var(--labs-text-muted)" : "rgba(245,239,227,0.65)";
  const danger = isApp ? "var(--labs-danger, #e8a3a3)" : "#E06060";
  const fontDisplay = isApp ? "'Playfair Display', Georgia, serif" : "'EB Garamond', serif";
  const fontSerif = isApp ? "'Cormorant Garamond', Georgia, serif" : "'EB Garamond', serif";
  const fontBody = isApp ? "inherit" : "'Inter', sans-serif";

  const storyInput: CSSProperties = { background: "rgba(245,239,227,0.06)", border: "1px solid rgba(245,239,227,0.25)", borderRadius: 10, padding: "12px 14px", color: "#F5EDE0", fontFamily: "'Inter', sans-serif", fontSize: 15, minHeight: 44, outline: "none", width: "100%", boxSizing: "border-box" };
  const storyBtn: CSSProperties = { background: "#C9A961", color: "#1a1714", border: "none", borderRadius: 9999, padding: "12px 20px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, minHeight: 44, cursor: "pointer" };

  const inputCls = isApp ? "labs-input" : undefined;
  const inputStyle: CSSProperties = isApp ? { minHeight: 44, width: "100%", boxSizing: "border-box" } : storyInput;
  const btnCls = isApp ? "labs-btn-primary" : undefined;
  const btnStyle = (busy: boolean): CSSProperties => isApp ? { minHeight: 44, opacity: busy ? 0.6 : 1 } : { ...storyBtn, opacity: busy ? 0.6 : 1 };
  const resendStyle: CSSProperties = isApp
    ? { marginTop: 8, fontSize: 12 }
    : { marginTop: 14, background: "none", border: "none", color: textMuted, fontFamily: fontBody, fontSize: 12, textDecoration: "underline", cursor: "pointer" };

  const outerStyle: CSSProperties = isApp
    ? { marginTop: 18, paddingTop: 16, borderTop: "1px dashed var(--labs-border-subtle)", textAlign: "left" }
    : { maxWidth: 520, margin: "0 auto", padding: "8px 24px 80px", textAlign: "center" };
  const innerStyle: CSSProperties = isApp ? {} : { borderTop: "1px solid rgba(245,239,227,0.15)", paddingTop: 44 };

  return (
    <div data-testid={`${tp}-guest-claim`} style={outerStyle}>
      <div style={innerStyle}>
        {claimStep === "idle" && (
          <>
            <div style={{ fontFamily: fontBody, fontSize: 10, letterSpacing: isApp ? "0.18em" : "0.3em", textTransform: "uppercase", color: accent, fontWeight: isApp ? 600 : 400, marginBottom: isApp ? 6 : 14 }}>
              {t("eveningRecap.claimEyebrow", "Nimm deine Bewertungen mit")}
            </div>
            <div style={{ fontFamily: isApp ? fontSerif : fontDisplay, fontStyle: "italic", fontSize: isApp ? 15 : 22, color: isApp ? textSecondary : textMain, lineHeight: 1.4, margin: isApp ? "6px 0 12px" : "0 0 24px" }}>
              {t("eveningRecap.claimText", "Mit E-Mail und PIN wird dieser Abend der Anfang deiner eigenen Sammlung.")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: isApp ? 8 : 10, maxWidth: isApp ? 360 : 340, margin: isApp ? undefined : "0 auto" }}>
              <input className={inputCls} type="email" autoComplete="email" placeholder={t("eveningRecap.claimEmail", "Deine E-Mail")} value={claimEmail} onChange={(e) => setClaimEmail(e.target.value)} style={inputStyle} data-testid={`${tp}-claim-email`} />
              <input className={inputCls} type="password" autoComplete="new-password" placeholder={t("eveningRecap.claimPin", "Wähle eine PIN (mind. 4 Zeichen)")} value={claimPin} onChange={(e) => setClaimPin(e.target.value)} style={inputStyle} data-testid={`${tp}-claim-pin`} />
              <button className={btnCls} type="button" disabled={claimBusy} onClick={handleClaim} style={btnStyle(claimBusy)} data-testid={`${tp}-claim-submit`}>
                {claimBusy ? t("eveningRecap.claimBusy", "Einen Moment …") : t("eveningRecap.claimCta", "Konto erstellen")}
              </button>
            </div>
          </>
        )}
        {claimStep === "code" && (
          <>
            <div style={{ fontFamily: isApp ? fontSerif : fontDisplay, fontStyle: "italic", fontSize: isApp ? 15 : 20, color: isApp ? textSecondary : textMain, lineHeight: 1.4, marginBottom: isApp ? 10 : 20, maxWidth: isApp ? undefined : 380, marginLeft: isApp ? undefined : "auto", marginRight: isApp ? undefined : "auto" }}>
              {t("eveningRecap.codeText", "Wir haben dir einen 6-stelligen Code geschickt. Gib ihn hier ein — dann gehört der Abend dir.")}
            </div>
            <div style={{ display: "flex", gap: isApp ? 8 : 10, maxWidth: isApp ? 360 : 340, margin: isApp ? undefined : "0 auto" }}>
              <input className={inputCls} inputMode="numeric" maxLength={6} placeholder={t("eveningRecap.codeLabel", "Code")} value={claimCode} onChange={(e) => setClaimCode(e.target.value.replace(/[^0-9]/g, ""))} style={{ ...inputStyle, flex: 1, letterSpacing: "0.2em", textAlign: "center" }} data-testid={`${tp}-claim-code`} />
              <button className={btnCls} type="button" disabled={claimBusy} onClick={handleVerifyCode} style={btnStyle(claimBusy)} data-testid={`${tp}-claim-verify`}>
                {t("eveningRecap.codeCta", "Bestätigen")}
              </button>
            </div>
            <button className={isApp ? "labs-btn-ghost" : undefined} type="button" onClick={() => { participantApi.resendVerification(participantId).catch(() => {}); }} style={resendStyle} data-testid={`${tp}-claim-resend`}>
              {t("eveningRecap.codeResend", "Code erneut senden")}
            </button>
          </>
        )}
        {claimStep === "done" && (
          <div data-testid={`${tp}-claim-done`}>
            <div style={{ fontFamily: fontDisplay, fontSize: isApp ? 17 : 26, color: textMain, marginBottom: isApp ? 4 : 8 }}>
              {t("eveningRecap.doneTitle", "Dein Abend gehört jetzt dir.")}
            </div>
            <div style={{ fontFamily: fontSerif, fontStyle: "italic", fontSize: isApp ? 14 : 17, color: isApp ? textSecondary : textMuted }}>
              {t("eveningRecap.doneText", "Melde dich künftig mit E-Mail und PIN an — deine Bewertungen warten auf dich.")}
            </div>
          </div>
        )}
        {claimError && (
          <div style={{ marginTop: isApp ? 8 : 14, fontSize: 13, color: danger, fontFamily: fontBody }} data-testid={`${tp}-claim-error`}>
            {claimError}
          </div>
        )}
      </div>
    </div>
  );
}

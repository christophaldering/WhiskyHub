import { useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { participantApi } from "@/lib/api";
import { trackEvent } from "@/lib/funnelTracker";

// Eigenstaendiges, selbst-gegatetes Konto-Claim-Panel fuer die (dunkle) Story-View.
// Logik 1:1 wie in RecapCard; rendert nur fuer echte Gaeste (experienceLevel "guest", ohne E-Mail).

const AMBER = "#C9A961";
const CREAM = "#F5EDE0";
const CREAM_MUTED = "rgba(245,239,227,0.65)";
const FONT_DISPLAY = "'EB Garamond', serif";
const FONT_BODY = "'Inter', sans-serif";

type Props = { participantId: string; tastingId: string };

export default function GuestClaimPanel({ participantId, tastingId }: Props) {
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

  const inputStyle: CSSProperties = {
    background: "rgba(245,239,227,0.06)",
    border: "1px solid rgba(245,239,227,0.25)",
    borderRadius: 10,
    padding: "12px 14px",
    color: CREAM,
    fontFamily: FONT_BODY,
    fontSize: 15,
    minHeight: 44,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };
  const btnStyle: CSSProperties = {
    background: AMBER,
    color: "#1a1714",
    border: "none",
    borderRadius: 9999,
    padding: "12px 20px",
    fontFamily: FONT_BODY,
    fontWeight: 600,
    fontSize: 14,
    minHeight: 44,
    cursor: "pointer",
  };

  return (
    <div data-testid="story-guest-claim" style={{ maxWidth: 520, margin: "0 auto", padding: "8px 24px 80px", textAlign: "center" }}>
      <div style={{ borderTop: "1px solid rgba(245,239,227,0.15)", paddingTop: 44 }}>
        {claimStep === "idle" && (
          <>
            <div style={{ fontFamily: FONT_BODY, fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: AMBER, marginBottom: 14 }}>
              {t("eveningRecap.claimEyebrow", "Nimm deine Bewertungen mit")}
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 22, color: CREAM, lineHeight: 1.4, marginBottom: 24 }}>
              {t("eveningRecap.claimText", "Mit E-Mail und PIN wird dieser Abend der Anfang deiner eigenen Sammlung.")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 340, margin: "0 auto" }}>
              <input type="email" autoComplete="email" placeholder={t("eveningRecap.claimEmail", "Deine E-Mail")} value={claimEmail} onChange={(e) => setClaimEmail(e.target.value)} style={inputStyle} data-testid="story-claim-email" />
              <input type="password" autoComplete="new-password" placeholder={t("eveningRecap.claimPin", "Wähle eine PIN (mind. 4 Zeichen)")} value={claimPin} onChange={(e) => setClaimPin(e.target.value)} style={inputStyle} data-testid="story-claim-pin" />
              <button type="button" disabled={claimBusy} onClick={handleClaim} style={{ ...btnStyle, opacity: claimBusy ? 0.6 : 1 }} data-testid="story-claim-submit">
                {claimBusy ? t("eveningRecap.claimBusy", "Einen Moment …") : t("eveningRecap.claimCta", "Konto erstellen")}
              </button>
            </div>
          </>
        )}
        {claimStep === "code" && (
          <>
            <div style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 20, color: CREAM, lineHeight: 1.4, marginBottom: 20, maxWidth: 380, marginLeft: "auto", marginRight: "auto" }}>
              {t("eveningRecap.codeText", "Wir haben dir einen 6-stelligen Code geschickt. Gib ihn hier ein — dann gehört der Abend dir.")}
            </div>
            <div style={{ display: "flex", gap: 10, maxWidth: 340, margin: "0 auto" }}>
              <input inputMode="numeric" maxLength={6} placeholder={t("eveningRecap.codeLabel", "Code")} value={claimCode} onChange={(e) => setClaimCode(e.target.value.replace(/[^0-9]/g, ""))} style={{ ...inputStyle, flex: 1, letterSpacing: "0.2em", textAlign: "center" }} data-testid="story-claim-code" />
              <button type="button" disabled={claimBusy} onClick={handleVerifyCode} style={{ ...btnStyle, opacity: claimBusy ? 0.6 : 1 }} data-testid="story-claim-verify">
                {t("eveningRecap.codeCta", "Bestätigen")}
              </button>
            </div>
            <button type="button" onClick={() => { participantApi.resendVerification(participantId).catch(() => {}); }} style={{ marginTop: 14, background: "none", border: "none", color: CREAM_MUTED, fontFamily: FONT_BODY, fontSize: 12, textDecoration: "underline", cursor: "pointer" }} data-testid="story-claim-resend">
              {t("eveningRecap.codeResend", "Code erneut senden")}
            </button>
          </>
        )}
        {claimStep === "done" && (
          <div data-testid="story-claim-done">
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: CREAM, marginBottom: 8 }}>
              {t("eveningRecap.doneTitle", "Dein Abend gehört jetzt dir.")}
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 17, color: CREAM_MUTED }}>
              {t("eveningRecap.doneText", "Melde dich künftig mit E-Mail und PIN an — deine Bewertungen warten auf dich.")}
            </div>
          </div>
        )}
        {claimError && (
          <div style={{ marginTop: 14, fontSize: 13, color: "#E06060", fontFamily: FONT_BODY }} data-testid="story-claim-error">
            {claimError}
          </div>
        )}
      </div>
    </div>
  );
}

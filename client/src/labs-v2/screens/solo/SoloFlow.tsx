import { useState, useCallback, useEffect } from "react";
import type { ThemeTokens } from "../../tokens";
import type { Translations } from "../../i18n";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";
import { Spinner } from "../../icons";
import type { RatingData } from "../../types/rating";
import { RatingFlow } from "../rating/RatingFlow";
import SoloCaptureScreen, { type CapturedWhisky } from "./SoloCaptureScreen";
import SoloWhiskyForm from "./SoloWhiskyForm";
import SoloDoneScreen from "./SoloDoneScreen";

type Step = "capture" | "form" | "rating" | "done";

interface Props {
  th: ThemeTokens;
  t: Translations;
  onBack: () => void;
}

interface JournalBody {
  title: string;
  whiskyName: string;
  distillery: string;
  region: string;
  caskType: string;
  age: string;
  abv: string;
  personalScore: number;
  noseNotes: string;
  tasteNotes: string;
  finishNotes: string;
  notes: string;
  source: string;
}

function getExistingParticipantId(): string | null {
  try {
    return sessionStorage.getItem("session_pid")
      || localStorage.getItem("casksense_participant_id")
      || null;
  } catch {
    return null;
  }
}

async function ensureParticipantId(): Promise<string> {
  const existing = getExistingParticipantId();
  if (existing) return existing;

  const res = await fetch("/api/participants/guest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Solo Taster", pin: "0000", privacyConsent: true }),
  });

  if (res.ok) {
    const data = await res.json();
    const pid = data.id || data.participantId || "";
    if (pid) {
      try {
        sessionStorage.setItem("session_pid", pid);
      } catch { /* ignore */ }
      return pid;
    }
  }

  throw new Error("Could not create participant");
}

export default function SoloFlow({ th, t, onBack }: Props) {
  const [step, setStep] = useState<Step>("capture");
  const [whisky, setWhisky] = useState<CapturedWhisky | null>(null);
  const [ratingResult, setRatingResult] = useState<RatingData | null>(null);
  const [participantId, setParticipantId] = useState<string>("");
  const [participantError, setParticipantError] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const initParticipant = useCallback(() => {
    setParticipantError(false);
    ensureParticipantId()
      .then(setParticipantId)
      .catch(() => setParticipantError(true));
  }, []);

  useEffect(() => {
    initParticipant();
  }, [initParticipant]);

  const handleCaptured = useCallback((w: CapturedWhisky) => {
    setWhisky(w);
    setStep("form");
  }, []);

  const handleManual = useCallback(() => {
    setWhisky(null);
    setStep("form");
  }, []);

  const handleBarcode = useCallback((barcode: string) => {
    setWhisky({ name: barcode, distillery: "", region: "", cask: "", age: "", abv: "", fromAI: false, barcodeValue: barcode });
    setStep("form");
  }, []);

  const handleSkip = useCallback(() => {
    setWhisky({ name: "", distillery: "", region: "", cask: "", age: "", abv: "", fromAI: false });
    setStep("rating");
  }, []);

  const handleFormSubmit = useCallback((w: CapturedWhisky) => {
    setWhisky(w);
    setStep("rating");
  }, []);

  const handleRatingDone = useCallback(async (data: RatingData) => {
    setRatingResult(data);
    setSaveError(false);

    const whiskyName = whisky?.name || t.ratingDram;
    const body: JournalBody = {
      title: whiskyName,
      whiskyName,
      distillery: whisky?.distillery || "",
      region: whisky?.region || "",
      caskType: whisky?.cask || "",
      age: whisky?.age || "",
      abv: whisky?.abv || "",
      personalScore: data.scores.overall,
      noseNotes: [
        data.notes.nose,
        ...(data.tags.nose || []),
      ].filter(Boolean).join(", "),
      tasteNotes: [
        data.notes.palate,
        ...(data.tags.palate || []),
      ].filter(Boolean).join(", "),
      finishNotes: [
        data.notes.finish,
        ...(data.tags.finish || []),
      ].filter(Boolean).join(", "),
      notes: data.notes.overall || "",
      source: "solo",
    };

    try {
      const res = await fetch(`/api/journal/${participantId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-participant-id": participantId,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        setSaveError(true);
        return;
      }

      setStep("done");
    } catch {
      setSaveError(true);
    }
  }, [whisky, participantId, t.ratingDram]);

  const handleRetrySave = useCallback(() => {
    if (ratingResult) {
      handleRatingDone(ratingResult);
    }
  }, [ratingResult, handleRatingDone]);

  const handleAnother = useCallback(() => {
    setWhisky(null);
    setRatingResult(null);
    setSaveError(false);
    setStep("capture");
  }, []);

  if (participantError) {
    return (
      <div className="v2-fade-up" style={{
        padding: `${SP.xl}px ${SP.md}px`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 300,
        gap: SP.lg,
      }}>
        <p style={{ fontFamily: FONT.body, fontSize: 15, color: th.text, textAlign: "center" }} data-testid="solo-participant-error">
          {t.soloParticipantError}
        </p>
        <button
          onClick={initParticipant}
          data-testid="solo-participant-retry-btn"
          style={{
            padding: `${SP.sm}px ${SP.lg}px`,
            minHeight: TOUCH_MIN,
            borderRadius: RADIUS.full,
            border: `1px solid ${th.border}`,
            background: th.bgCard,
            color: th.text,
            fontFamily: FONT.body,
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          {t.soloIdentifyRetry}
        </button>
      </div>
    );
  }

  if (!participantId) {
    return (
      <div style={{
        padding: `${SP.xl}px ${SP.md}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 200,
      }}>
        <Spinner color={th.muted} size={32} />
      </div>
    );
  }

  if (step === "capture") {
    return (
      <SoloCaptureScreen
        th={th}
        t={t}
        participantId={participantId}
        onManual={handleManual}
        onCaptured={handleCaptured}
        onBarcode={handleBarcode}
        onSkip={handleSkip}
        onBack={onBack}
      />
    );
  }

  if (step === "form") {
    return (
      <SoloWhiskyForm
        th={th}
        t={t}
        initial={whisky || undefined}
        fromAI={whisky?.fromAI}
        onSubmit={handleFormSubmit}
        onBack={() => setStep("capture")}
      />
    );
  }

  if (step === "rating") {
    return (
      <div>
        <RatingFlow
          th={th}
          t={t}
          whisky={{
            name: whisky?.name || "",
            region: whisky?.region || "",
            cask: whisky?.cask || "",
            blind: false,
          }}
          tastingId="solo"
          dramIdx={1}
          total={1}
          tastingStatus="open"
          participantId={participantId}
          onDone={handleRatingDone}
          onBack={() => setStep("form")}
        />
        {saveError && (
          <div style={{
            position: "fixed",
            bottom: 80,
            left: 16,
            right: 16,
            padding: "12px 16px",
            borderRadius: 12,
            background: "rgba(196,122,58,0.15)",
            border: "1px solid rgba(196,122,58,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 100,
          }} data-testid="solo-save-error">
            <span style={{ fontSize: 14, color: th.text }}>{t.ratingError}</span>
            <button
              onClick={handleRetrySave}
              data-testid="solo-save-retry-btn"
              style={{
                padding: "6px 14px",
                borderRadius: 9999,
                border: `1px solid ${th.amber}`,
                background: "none",
                color: th.amber,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {t.soloSaveRetry}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (step === "done" && ratingResult) {
    return (
      <SoloDoneScreen
        th={th}
        t={t}
        whiskyName={whisky?.name || t.ratingDram}
        score={ratingResult.scores.overall}
        participantId={participantId}
        onAnother={handleAnother}
        onHub={onBack}
      />
    );
  }

  return null;
}

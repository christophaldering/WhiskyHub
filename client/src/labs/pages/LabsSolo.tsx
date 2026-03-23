import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useBackNavigation } from "@/labs/hooks/useBackNavigation";
import { useAppStore } from "@/lib/store";
import { Loader2 } from "lucide-react";
import SoloCaptureScreen, { type CapturedWhisky } from "./solo/SoloCaptureScreen";
import SoloWhiskyForm from "./solo/SoloWhiskyForm";
import SoloDoneScreen from "./solo/SoloDoneScreen";
import RatingFlowV2 from "@/labs/components/rating/RatingFlowV2";
import type { RatingData } from "@/labs/components/rating/types";

type Step = "capture" | "form" | "rating" | "done";

function getExistingParticipantId(storeParticipantId: string | null): string | null {
  try {
    return sessionStorage.getItem("session_pid")
      || localStorage.getItem("casksense_participant_id")
      || storeParticipantId
      || null;
  } catch {
    return storeParticipantId || null;
  }
}

function isUserAuthenticated(): boolean {
  try {
    if (sessionStorage.getItem("session_signed_in") === "1") return true;
  } catch {}
  try {
    const storeUser = useAppStore.getState().currentParticipant;
    if (storeUser?.id) return true;
  } catch {}
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getStoreParticipantId(): string | null {
  try {
    return useAppStore.getState().currentParticipant?.id || null;
  } catch {
    return null;
  }
}

async function ensureParticipantId(): Promise<string> {
  const existing = getExistingParticipantId(getStoreParticipantId());
  if (existing) return existing;

  if (isUserAuthenticated()) {
    for (let attempt = 0; attempt < 3; attempt++) {
      await delay(500);
      const retried = getExistingParticipantId(getStoreParticipantId());
      if (retried) return retried;
    }
    throw new Error("Authenticated user but participant ID unavailable");
  }

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
      } catch {}
      return pid;
    }
  }

  throw new Error("Could not create participant");
}

export default function LabsSolo() {
  const { t } = useTranslation();
  const goBack = useBackNavigation("/labs/tastings");

  const [step, setStep] = useState<Step>("capture");
  const [whisky, setWhisky] = useState<CapturedWhisky | null>(null);
  const [ratingResult, setRatingResult] = useState<RatingData | null>(null);
  const [participantId, setParticipantId] = useState<string>("");
  const [participantError, setParticipantError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [initToken, setInitToken] = useState(0);

  const initParticipant = useCallback(() => {
    const token = Date.now();
    setInitToken(token);
    setParticipantError(false);
    ensureParticipantId()
      .then((pid) => {
        setInitToken((current) => {
          if (current === token) {
            setParticipantId(pid);
          }
          return current;
        });
      })
      .catch(() => {
        setInitToken((current) => {
          if (current === token) {
            setParticipantError(true);
          }
          return current;
        });
      });
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

  const handleCollectionSelect = useCallback((w: CapturedWhisky) => {
    setWhisky(w);
    setStep("rating");
  }, []);

  const handleFormSubmit = useCallback((w: CapturedWhisky) => {
    setWhisky(w);
    setStep("rating");
  }, []);

  const handleRatingDone = useCallback(async (data: RatingData) => {
    setRatingResult(data);
    setSaveError(false);

    const whiskyName = whisky?.name || t("v2.ratingDram", "Dram");
    const body = {
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
  }, [whisky, participantId, t]);

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

  let content: React.ReactNode = null;

  if (participantError) {
    content = (
      <div className="labs-fade-in" style={{ padding: "var(--labs-space-xl) var(--labs-space-md)" }}>
        <div className="labs-card" style={{
          padding: "var(--labs-space-xl)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--labs-space-lg)",
        }}>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--labs-text)", textAlign: "center", margin: 0 }} data-testid="solo-participant-error">
            {t("v2.solo.participantError", "Could not create session. Please try again.")}
          </p>
          <button
            onClick={initParticipant}
            data-testid="solo-participant-retry-btn"
            className="labs-btn-secondary"
            style={{ minWidth: 140 }}
          >
            {t("v2.solo.identifyRetry", "Try again")}
          </button>
        </div>
      </div>
    );
  } else if (!participantId) {
    content = (
      <div className="labs-fade-in" style={{
        padding: "var(--labs-space-xl) var(--labs-space-md)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 200,
      }}>
        <Loader2 size={32} style={{ color: "var(--labs-text-muted)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  } else if (step === "capture") {
    content = (
      <SoloCaptureScreen
        participantId={participantId}
        isAuthenticated={isUserAuthenticated()}
        onManual={handleManual}
        onCaptured={handleCaptured}
        onBarcode={handleBarcode}
        onCollectionSelect={handleCollectionSelect}
        onBack={goBack}
      />
    );
  } else if (step === "form") {
    content = (
      <SoloWhiskyForm
        initial={whisky || undefined}
        fromAI={whisky?.fromAI}
        onSubmit={handleFormSubmit}
        onBack={() => setStep("capture")}
      />
    );
  } else if (step === "rating") {
    content = (
      <div style={{ minHeight: "60vh" }}>
        <RatingFlowV2
          whisky={{
            name: whisky?.name || "",
            region: whisky?.region || "",
            cask: whisky?.cask || "",
            blind: false,
          }}
          onDone={handleRatingDone}
          onBack={() => setStep("form")}
        />
        {saveError && (
          <div className="labs-card" style={{
            position: "fixed",
            bottom: 80,
            left: 16,
            right: 16,
            padding: "12px 16px",
            background: "var(--labs-phase-finish-dim)",
            borderColor: "var(--labs-phase-finish)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 100,
          }} data-testid="solo-save-error">
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--labs-text)" }}>
              {t("v2.ratingError", "Error saving")}
            </span>
            <button
              onClick={handleRetrySave}
              data-testid="solo-save-retry-btn"
              className="labs-btn-ghost"
              style={{ color: "var(--labs-phase-finish)", fontSize: 13 }}
            >
              {t("v2.solo.saveRetry", "Retry save")}
            </button>
          </div>
        )}
      </div>
    );
  } else if (step === "done" && ratingResult) {
    content = (
      <SoloDoneScreen
        whiskyName={whisky?.name || t("v2.ratingDram", "Dram")}
        score={ratingResult.scores.overall}
        onAnother={handleAnother}
        onHub={goBack}
      />
    );
  }

  return (
    <div className="labs-solo-container">
      {content}
    </div>
  );
}

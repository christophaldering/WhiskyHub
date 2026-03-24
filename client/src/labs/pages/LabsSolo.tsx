import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useBackNavigation } from "@/labs/hooks/useBackNavigation";
import { useAppStore } from "@/lib/store";
import { queryClient } from "@/lib/queryClient";
import { Loader2, Check } from "lucide-react";
import { tryAutoResume, getSession } from "@/lib/session";
import SoloCaptureScreen, { type CapturedWhisky } from "./solo/SoloCaptureScreen";
import SoloWhiskyForm from "./solo/SoloWhiskyForm";
import SoloDoneScreen from "./solo/SoloDoneScreen";
import RatingFlowV2 from "@/labs/components/rating/RatingFlowV2";
import type { RatingFlowDraftState } from "@/labs/components/rating/RatingFlowV2";
import type { RatingData } from "@/labs/components/rating/types";
import ResumeRatingBanner from "@/labs/components/ResumeRatingBanner";
import { saveSoloDraft, loadSoloDraft, clearSoloDraft, hasDraftData } from "@/lib/draftStorage";

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
  const session = getSession();
  if (session.signedIn) return true;
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

  await tryAutoResume();

  const session = getSession();
  if (session.pid) return session.pid;

  const afterResume = getExistingParticipantId(getStoreParticipantId());
  if (afterResume) return afterResume;

  if (session.signedIn) {
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
  const [fromCollection, setFromCollection] = useState(false);
  const [addToCollection, setAddToCollection] = useState(true);
  const [draftSavedFlash, setDraftSavedFlash] = useState(false);
  const draftFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [resumeDraft, setResumeDraft] = useState(() => loadSoloDraft());
  const [ratingMode, setRatingMode] = useState<"guided" | "compact" | "quick" | null>(null);
  const [ratingPhaseIndex, setRatingPhaseIndex] = useState(0);
  const [ratingInitialData, setRatingInitialData] = useState<RatingData | undefined>(undefined);

  const hasUnsavedRef = useRef(false);

  const showDraftFlash = useCallback(() => {
    setDraftSavedFlash(true);
    if (draftFlashTimer.current) clearTimeout(draftFlashTimer.current);
    draftFlashTimer.current = setTimeout(() => setDraftSavedFlash(false), 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (draftFlashTimer.current) clearTimeout(draftFlashTimer.current);
    };
  }, []);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  useEffect(() => {
    hasUnsavedRef.current = step === "form" || step === "rating";
  }, [step]);

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

  const handleResumeDraft = useCallback(() => {
    if (!resumeDraft) return;
    setWhisky(resumeDraft.whisky);
    setFromCollection(resumeDraft.fromCollection);
    setRatingMode(resumeDraft.ratingMode);
    setRatingPhaseIndex(resumeDraft.ratingPhaseIndex);
    if (resumeDraft.ratingData?.scores) {
      setRatingInitialData(resumeDraft.ratingData as RatingData);
    }
    setStep(resumeDraft.step);
    setResumeDraft(null);
  }, [resumeDraft]);

  const handleDiscardDraft = useCallback(() => {
    clearSoloDraft();
    setResumeDraft(null);
  }, []);

  const handleRatingChange = useCallback((draft: RatingFlowDraftState) => {
    setRatingMode(draft.mode);
    setRatingPhaseIndex(draft.phaseIndex);
    saveSoloDraft({
      step: "rating",
      whisky,
      ratingMode: draft.mode,
      ratingPhaseIndex: draft.phaseIndex,
      ratingData: draft.data,
      fromCollection,
    });
    showDraftFlash();
  }, [whisky, fromCollection, showDraftFlash]);

  const handleCaptured = useCallback((w: CapturedWhisky) => {
    setWhisky(w);
    setFromCollection(false);
    setAddToCollection(true);
    setStep("form");
    saveSoloDraft({ step: "form", whisky: w, ratingMode: null, ratingPhaseIndex: 0, ratingData: {}, fromCollection: false });
    showDraftFlash();
  }, [showDraftFlash]);

  const handleManual = useCallback(() => {
    setWhisky(null);
    setFromCollection(false);
    setAddToCollection(true);
    setStep("form");
    saveSoloDraft({ step: "form", whisky: null, ratingMode: null, ratingPhaseIndex: 0, ratingData: {}, fromCollection: false });
    showDraftFlash();
  }, [showDraftFlash]);

  const handleBarcode = useCallback((barcode: string) => {
    const w: CapturedWhisky = { name: barcode, distillery: "", region: "", cask: "", age: "", abv: "", fromAI: false, barcodeValue: barcode };
    setWhisky(w);
    setFromCollection(false);
    setAddToCollection(true);
    setStep("form");
    saveSoloDraft({ step: "form", whisky: w, ratingMode: null, ratingPhaseIndex: 0, ratingData: {}, fromCollection: false });
    showDraftFlash();
  }, [showDraftFlash]);

  const handleCollectionSelect = useCallback((w: CapturedWhisky) => {
    setWhisky(w);
    setFromCollection(true);
    setStep("rating");
    saveSoloDraft({ step: "rating", whisky: w, ratingMode: null, ratingPhaseIndex: 0, ratingData: {}, fromCollection: true });
    showDraftFlash();
  }, [showDraftFlash]);

  const handleFormSubmit = useCallback((w: CapturedWhisky) => {
    setWhisky(w);
    setStep("rating");
    saveSoloDraft({ step: "rating", whisky: w, ratingMode: null, ratingPhaseIndex: 0, ratingData: {}, fromCollection });
    showDraftFlash();
  }, [fromCollection, showDraftFlash]);

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

      clearSoloDraft();
      hasUnsavedRef.current = false;
      queryClient.invalidateQueries({ queryKey: ["journal"] });
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

  const saveToCollectionIfNeeded = useCallback(() => {
    if (addToCollection && !fromCollection && isUserAuthenticated() && whisky?.name && participantId) {
      fetch(`/api/collection/${participantId}/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-participant-id": participantId,
        },
        body: JSON.stringify({
          name: whisky.name,
          distillery: whisky.distillery || "",
          statedAge: whisky.age || "",
          abv: whisky.abv || "",
          caskType: whisky.cask || "",
          status: "open",
        }),
      }).catch(() => {});
    }
  }, [addToCollection, fromCollection, whisky, participantId]);

  const handleAnother = useCallback(() => {
    saveToCollectionIfNeeded();
    setWhisky(null);
    setRatingResult(null);
    setSaveError(false);
    setFromCollection(false);
    setAddToCollection(true);
    setRatingMode(null);
    setRatingPhaseIndex(0);
    setRatingInitialData(undefined);
    setStep("capture");
  }, [saveToCollectionIfNeeded]);

  const handleHub = useCallback(() => {
    saveToCollectionIfNeeded();
    goBack();
  }, [saveToCollectionIfNeeded, goBack]);

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
      <>
        {resumeDraft && (
          <div style={{ padding: "0 var(--labs-space-md)" }}>
            <ResumeRatingBanner
              whiskyName={resumeDraft.whisky?.name || ""}
              step={resumeDraft.ratingPhaseIndex}
              onResume={handleResumeDraft}
              onDiscard={handleDiscardDraft}
            />
          </div>
        )}
        <SoloCaptureScreen
          participantId={participantId}
          isAuthenticated={isUserAuthenticated()}
          onManual={handleManual}
          onCaptured={handleCaptured}
          onBarcode={handleBarcode}
          onCollectionSelect={handleCollectionSelect}
          onBack={goBack}
        />
      </>
    );
  } else if (step === "form") {
    content = (
      <SoloWhiskyForm
        initial={whisky || undefined}
        fromAI={whisky?.fromAI}
        onSubmit={handleFormSubmit}
        onBack={() => { setStep("capture"); clearSoloDraft(); }}
        onChange={(w) => {
          setWhisky(prev => ({ ...prev, ...w } as CapturedWhisky));
          saveSoloDraft({
            step: "form",
            whisky: { ...whisky, ...w } as CapturedWhisky,
            ratingMode: null,
            ratingPhaseIndex: 0,
            ratingData: {},
            fromCollection: false,
          });
        }}
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
          initialData={ratingInitialData}
          initialMode={ratingMode}
          initialPhaseIndex={ratingPhaseIndex}
          onDone={handleRatingDone}
          onBack={() => { setStep("form"); clearSoloDraft(); }}
          onChange={handleRatingChange}
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
    const authenticated = isUserAuthenticated();
    content = (
      <SoloDoneScreen
        whiskyName={whisky?.name || t("v2.ratingDram", "Dram")}
        score={ratingResult.scores.overall}
        onAnother={handleAnother}
        onHub={handleHub}
        showAddToCollection={authenticated && !fromCollection}
        addToCollection={addToCollection}
        onToggleAddToCollection={setAddToCollection}
      />
    );
  }

  return (
    <div className="labs-solo-container" style={{ position: "relative" }}>
      {content}
      {draftSavedFlash && (
        <div
          data-testid="draft-saved-indicator"
          style={{
            position: "fixed",
            top: 60,
            right: 16,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 20,
            background: "rgba(34,197,94,0.12)",
            border: "1px solid rgba(34,197,94,0.25)",
            color: "var(--labs-success, #22c55e)",
            fontSize: 12,
            fontWeight: 600,
            zIndex: 50,
            animation: "labsFadeIn 200ms ease both",
            pointerEvents: "none",
          }}
        >
          <Check style={{ width: 14, height: 14 }} />
          {t("v2.draftSaved", "Draft saved")}
        </div>
      )}
    </div>
  );
}

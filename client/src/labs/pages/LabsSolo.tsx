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
import { saveSoloDraft, saveSoloDraftImmediate, loadSoloDraft, clearSoloDraft, hasDraftData } from "@/lib/draftStorage";

type Step = "capture" | "form" | "rating" | "quickFollowUp" | "done";

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
  const [isDraftSave, setIsDraftSave] = useState(false);
  const [showBackDialog, setShowBackDialog] = useState(false);
  const [quickFollowUpData, setQuickFollowUpData] = useState<RatingData | null>(null);
  const [draftEntryId, setDraftEntryId] = useState<string | null>(null);
  const [draftSaving, setDraftSaving] = useState(false);

  const [soloImageFile, setSoloImageFile] = useState<File | null>(null);
  const [resumeDraft, setResumeDraft] = useState(() => loadSoloDraft());
  const [ratingMode, setRatingMode] = useState<"guided" | "compact" | "quick" | null>(null);
  const [ratingPhaseIndex, setRatingPhaseIndex] = useState(0);
  const [ratingInitialData, setRatingInitialData] = useState<RatingData | undefined>(undefined);

  const hasUnsavedRef = useRef(false);
  const latestRatingDataRef = useRef<Partial<RatingData>>({});

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

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("cs_retaste_context");
      if (!raw) return;
      sessionStorage.removeItem("cs_retaste_context");
      const data = JSON.parse(raw);
      const mapped: CapturedWhisky = {
        name: String(data.name ?? data.whiskyName ?? ""),
        distillery: String(data.distillery ?? ""),
        country: String(data.country ?? ""),
        region: String(data.region ?? ""),
        age: String(data.age ?? ""),
        abv: String(data.abv ?? ""),
        cask: String(data.caskType ?? data.cask ?? ""),
        fromAI: false,
      };
      setWhisky(mapped);
      setStep("form");
    } catch {
    }
  }, []);

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
    if (resumeDraft.serverDraftId) {
      setDraftEntryId(resumeDraft.serverDraftId);
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
    latestRatingDataRef.current = draft.data;
    saveSoloDraft({
      step: "rating",
      whisky,
      ratingMode: draft.mode,
      ratingPhaseIndex: draft.phaseIndex,
      ratingData: draft.data,
      fromCollection,
      serverDraftId: draftEntryId,
    });
    showDraftFlash();
  }, [whisky, fromCollection, showDraftFlash, draftEntryId]);

  const handleCaptured = useCallback((w: CapturedWhisky, imageFile?: File | null) => {
    setWhisky(w);
    setFromCollection(false);
    setAddToCollection(true);
    setSoloImageFile(imageFile || null);
    setDraftEntryId(null);
    setStep("form");
    saveSoloDraft({ step: "form", whisky: w, ratingMode: null, ratingPhaseIndex: 0, ratingData: {}, fromCollection: false, serverDraftId: null });
    showDraftFlash();
  }, [showDraftFlash]);

  const handleManual = useCallback(() => {
    setWhisky(null);
    setFromCollection(false);
    setAddToCollection(true);
    setSoloImageFile(null);
    setDraftEntryId(null);
    setStep("form");
    saveSoloDraft({ step: "form", whisky: null, ratingMode: null, ratingPhaseIndex: 0, ratingData: {}, fromCollection: false, serverDraftId: null });
    showDraftFlash();
  }, [showDraftFlash]);

  const handleBarcode = useCallback((barcode: string) => {
    const w: CapturedWhisky = { name: barcode, distillery: "", country: "", region: "", cask: "", age: "", abv: "", fromAI: false, barcodeValue: barcode };
    setWhisky(w);
    setFromCollection(false);
    setAddToCollection(true);
    setSoloImageFile(null);
    setDraftEntryId(null);
    setStep("form");
    saveSoloDraft({ step: "form", whisky: w, ratingMode: null, ratingPhaseIndex: 0, ratingData: {}, fromCollection: false, serverDraftId: null });
    showDraftFlash();
  }, [showDraftFlash]);

  const handleCollectionSelect = useCallback((w: CapturedWhisky) => {
    setWhisky(w);
    setFromCollection(true);
    setDraftEntryId(null);
    setStep("rating");
    saveSoloDraft({ step: "rating", whisky: w, ratingMode: null, ratingPhaseIndex: 0, ratingData: {}, fromCollection: true, serverDraftId: null });
    showDraftFlash();
  }, [showDraftFlash]);

  const handleFormSubmit = useCallback((w: CapturedWhisky, imageFile?: File | null) => {
    setWhisky(w);
    setSoloImageFile(imageFile ?? null);
    setStep("rating");
    saveSoloDraft({ step: "rating", whisky: w, ratingMode: null, ratingPhaseIndex: 0, ratingData: {}, fromCollection });
    showDraftFlash();
  }, [fromCollection, showDraftFlash]);

  const buildJournalBody = useCallback((data: RatingData, status: "final" | "draft", omitDimensionScores = false) => {
    const whiskyName = whisky?.name || t("v2.ratingDram", "Dram");
    return {
      title: whiskyName,
      name: whiskyName,
      distillery: whisky?.distillery || "",
      country: whisky?.country || "",
      region: whisky?.region || "",
      caskType: whisky?.cask || "",
      age: whisky?.age || "",
      abv: whisky?.abv || "",
      personalScore: data.scores.overall,
      ...(omitDimensionScores ? {} : {
        noseScore: data.scores.nose,
        tasteScore: data.scores.palate,
        finishScore: data.scores.finish,
      }),
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
      status,
    };
  }, [whisky, t]);

  const handleRatingDone = useCallback(async (data: RatingData) => {
    setRatingResult(data);
    setSaveError(false);
    setIsDraftSave(false);

    const status = data.overallExplicit ? "final" : "draft";
    const body = buildJournalBody(data, status);

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

      if (soloImageFile) {
        try {
          const entry = await res.json();
          if (entry?.id) {
            const imgFormData = new FormData();
            imgFormData.append("image", soloImageFile);
            await fetch(`/api/journal/${participantId}/${entry.id}/image`, { method: "POST", body: imgFormData });
          }
        } catch {}
        setSoloImageFile(null);
      }

      clearSoloDraft();
      hasUnsavedRef.current = false;
      queryClient.invalidateQueries({ queryKey: ["journal"] });
      setStep("done");
    } catch {
      setSaveError(true);
    }
  }, [whisky, participantId, t, soloImageFile, buildJournalBody]);

  const handleSaveAsDraft = useCallback(async (data: RatingData): Promise<boolean> => {
    setRatingResult(data);
    setSaveError(false);
    setIsDraftSave(true);
    setDraftSaving(true);

    const body = buildJournalBody(data, "draft");

    try {
      let res: Response;
      if (draftEntryId) {
        res = await fetch(`/api/journal/${participantId}/${draftEntryId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-participant-id": participantId,
          },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`/api/journal/${participantId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-participant-id": participantId,
          },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        setSaveError(true);
        setDraftSaving(false);
        return false;
      }

      try {
        const entry = await res.json();
        const newDraftId = entry?.id || draftEntryId;
        if (entry?.id && !draftEntryId) {
          setDraftEntryId(entry.id);
        }

        if (soloImageFile && entry?.id) {
          try {
            const imgFormData = new FormData();
            imgFormData.append("image", soloImageFile);
            await fetch(`/api/journal/${participantId}/${entry.id}/image`, { method: "POST", body: imgFormData });
          } catch {}
          setSoloImageFile(null);
        }

        saveSoloDraftImmediate({
          step: "rating",
          whisky,
          ratingMode,
          ratingPhaseIndex,
          ratingData: data,
          fromCollection,
          serverDraftId: newDraftId || null,
        });
      } catch {}

      queryClient.invalidateQueries({ queryKey: ["journal"] });
      showDraftFlash();
      setDraftSaving(false);
      return true;
    } catch {
      setSaveError(true);
      setDraftSaving(false);
      return false;
    }
  }, [whisky, participantId, t, soloImageFile, buildJournalBody, draftEntryId, showDraftFlash, ratingMode, ratingPhaseIndex, fromCollection]);

  const handleQuickRatingDone = useCallback((data: RatingData) => {
    if (ratingMode === "quick") {
      setQuickFollowUpData(data);
      setStep("quickFollowUp");
    } else {
      handleRatingDone(data);
    }
  }, [handleRatingDone, ratingMode]);

  const handleQuickFollowUpFinish = useCallback(async () => {
    if (!quickFollowUpData) return;
    setRatingResult(quickFollowUpData);
    setSaveError(false);
    setIsDraftSave(true);

    const body = buildJournalBody(quickFollowUpData, "draft", true);

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

      if (soloImageFile) {
        try {
          const entry = await res.json();
          if (entry?.id) {
            const imgFormData = new FormData();
            imgFormData.append("image", soloImageFile);
            await fetch(`/api/journal/${participantId}/${entry.id}/image`, { method: "POST", body: imgFormData });
          }
        } catch {}
        setSoloImageFile(null);
      }

      clearSoloDraft();
      hasUnsavedRef.current = false;
      queryClient.invalidateQueries({ queryKey: ["journal"] });
      setStep("done");
    } catch {
      setSaveError(true);
    }
  }, [quickFollowUpData, participantId, buildJournalBody, soloImageFile]);

  const handleQuickFollowUpDeepen = useCallback(() => {
    if (quickFollowUpData) {
      setRatingInitialData({
        scores: { ...quickFollowUpData.scores },
        tags: { nose: [], palate: [], finish: [], overall: [] },
        notes: { ...quickFollowUpData.notes },
      });
      setRatingMode(null);
      setRatingPhaseIndex(0);
      setStep("rating");
      setQuickFollowUpData(null);
    }
  }, [quickFollowUpData]);

  const handleQuickFollowUpDraft = useCallback(async () => {
    if (quickFollowUpData) {
      const success = await handleSaveAsDraft(quickFollowUpData);
      if (success) {
        clearSoloDraft();
        hasUnsavedRef.current = false;
        setStep("done");
      }
    }
  }, [quickFollowUpData, handleSaveAsDraft]);

  const handleRetrySave = useCallback(() => {
    if (ratingResult) {
      if (isDraftSave) {
        handleSaveAsDraft(ratingResult);
      } else {
        handleRatingDone(ratingResult);
      }
    }
  }, [ratingResult, handleRatingDone, handleSaveAsDraft, isDraftSave]);

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
          country: whisky.country || "",
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
    setIsDraftSave(false);
    setQuickFollowUpData(null);
    setDraftEntryId(null);
    setDraftSaving(false);
    setStep("capture");
  }, [saveToCollectionIfNeeded]);

  const handleHub = useCallback(() => {
    saveToCollectionIfNeeded();
    goBack();
  }, [saveToCollectionIfNeeded, goBack]);

  const handleRatingBack = useCallback(() => {
    const currentData = latestRatingDataRef.current;
    if (hasDraftData(currentData)) {
      setShowBackDialog(true);
    } else {
      setStep("form");
      clearSoloDraft();
      setDraftEntryId(null);
    }
  }, []);

  const handleBackDialogSaveDraft = useCallback(() => {
    setShowBackDialog(false);
    const currentData = latestRatingDataRef.current;
    const baseScores = ratingInitialData?.scores ?? { nose: 75, palate: 75, finish: 75, overall: 75 };
    const baseTags = ratingInitialData?.tags ?? { nose: [], palate: [], finish: [], overall: [] };
    const baseNotes = ratingInitialData?.notes ?? { nose: "", palate: "", finish: "", overall: "" };
    const fullData: RatingData = {
      scores: currentData.scores ? { ...baseScores, ...currentData.scores } : baseScores,
      tags: currentData.tags ? { ...baseTags, ...currentData.tags } : baseTags,
      notes: currentData.notes ? { ...baseNotes, ...currentData.notes } : baseNotes,
    };
    handleSaveAsDraft(fullData);
  }, [handleSaveAsDraft, ratingInitialData]);

  const handleBackDialogDiscard = useCallback(() => {
    setShowBackDialog(false);
    clearSoloDraft();
    latestRatingDataRef.current = {};
    setStep("form");
  }, []);

  const handleBackDialogCancel = useCallback(() => {
    setShowBackDialog(false);
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
        initialImageFile={soloImageFile}
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
          onDone={handleQuickRatingDone}
          onBack={handleRatingBack}
          onChange={handleRatingChange}
          onSaveAsDraft={handleSaveAsDraft}
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
  } else if (step === "quickFollowUp") {
    content = (
      <div className="labs-fade-in" style={{
        padding: "var(--labs-space-xl) var(--labs-space-md)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--labs-space-lg)",
      }}>
        <div className="labs-card" style={{
          width: "100%",
          padding: "var(--labs-space-xl)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--labs-space-md)",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: "rgba(200,134,26,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <span style={{ fontSize: 28 }}>&#129346;</span>
          </div>

          <h2 className="labs-h2" style={{ margin: 0, textAlign: "center", fontSize: 18 }} data-testid="quick-followup-title">
            {t("v2.solo.quickFollowUpTitle", "Einzelbewertungen ergänzen?")}
          </h2>

          <p style={{
            fontFamily: "var(--font-ui)",
            fontSize: 14,
            color: "var(--labs-text-muted)",
            margin: 0,
            textAlign: "center",
            lineHeight: 1.5,
          }} data-testid="quick-followup-hint">
            {t("v2.solo.quickFollowUpHint", "Du hast nur den Overall-Score vergeben. Möchtest du Nose, Palate und Finish noch einzeln bewerten?")}
          </p>

          {quickFollowUpData && (
            <div style={{
              fontSize: 36,
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              color: quickFollowUpData.scores.overall >= 90 ? "var(--labs-success)" : quickFollowUpData.scores.overall >= 80 ? "var(--labs-gold)" : "var(--labs-accent)",
              lineHeight: 1,
            }} data-testid="quick-followup-score">
              {quickFollowUpData.scores.overall}
            </div>
          )}
        </div>

        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--labs-space-sm)" }}>
          <button
            onClick={handleQuickFollowUpDeepen}
            data-testid="quick-followup-deepen-btn"
            className="labs-btn-primary"
            style={{ width: "100%", minHeight: 44 }}
          >
            {t("v2.solo.quickFollowUpDeepen", "Jetzt ergänzen")}
          </button>

          <button
            onClick={handleQuickFollowUpFinish}
            data-testid="quick-followup-finish-btn"
            className="labs-btn-secondary"
            style={{ width: "100%", minHeight: 44 }}
          >
            {t("v2.solo.quickFollowUpFinish", "Fertig")}
          </button>

          <button
            onClick={handleQuickFollowUpDraft}
            data-testid="quick-followup-draft-btn"
            style={{
              width: "100%",
              minHeight: 40,
              background: "transparent",
              border: "1px solid var(--labs-border)",
              borderRadius: 10,
              color: "var(--labs-text-muted)",
              fontSize: 13,
              fontFamily: "var(--font-ui)",
              cursor: "pointer",
            }}
          >
            {t("v2.solo.quickFollowUpDraft", "Später (als Entwurf)")}
          </button>
        </div>
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
        showAddToCollection={authenticated && !fromCollection && !isDraftSave}
        addToCollection={addToCollection}
        onToggleAddToCollection={setAddToCollection}
        isDraft={isDraftSave}
      />
    );
  }

  return (
    <div className="labs-page" style={{ position: "relative" }}>
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

      {showBackDialog && (
        <div
          data-testid="back-confirm-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={handleBackDialogCancel}
        >
          <div
            data-testid="back-confirm-dialog"
            className="labs-card"
            style={{
              width: "100%",
              maxWidth: 360,
              padding: "var(--labs-space-xl)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--labs-space-md)",
              animation: "labsFadeIn 200ms ease both",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              fontWeight: 600,
              color: "var(--labs-text)",
              margin: 0,
              textAlign: "center",
            }}>
              {t("v2.solo.backDialogTitle", "Fortschritt als Entwurf speichern?")}
            </h3>

            <p style={{
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              color: "var(--labs-text-muted)",
              margin: 0,
              textAlign: "center",
              lineHeight: 1.5,
            }}>
              {t("v2.solo.backDialogHint", "Du hast bereits Bewertungsdaten eingegeben. Was möchtest du tun?")}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-sm)" }}>
              <button
                onClick={handleBackDialogSaveDraft}
                data-testid="back-confirm-save-draft"
                className="labs-btn-primary"
                style={{ width: "100%", minHeight: 44 }}
              >
                {t("v2.solo.backDialogSave", "Als Entwurf speichern")}
              </button>

              <button
                onClick={handleBackDialogDiscard}
                data-testid="back-confirm-discard"
                style={{
                  width: "100%",
                  minHeight: 44,
                  background: "transparent",
                  border: "1px solid var(--labs-danger, #ef4444)",
                  borderRadius: 10,
                  color: "var(--labs-danger, #ef4444)",
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: "var(--font-ui)",
                  cursor: "pointer",
                }}
              >
                {t("v2.solo.backDialogDiscard", "Verwerfen")}
              </button>

              <button
                onClick={handleBackDialogCancel}
                data-testid="back-confirm-cancel"
                className="labs-btn-secondary"
                style={{ width: "100%", minHeight: 44 }}
              >
                {t("v2.solo.backDialogCancel", "Weiter bewerten")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

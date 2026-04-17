import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { ArrowLeft, Camera, ChevronRight, Loader2, AlertTriangle, Layers, Plus, Wine, Check, X, Save } from "lucide-react";
import { useSession, getSession } from "@/lib/session";
import { queryClient } from "@/lib/queryClient";
import type { JournalEntry } from "@shared/schema";

interface CapturedDraft {
  id: string;
  name: string;
  distillery: string;
  imageUrl: string | null;
  quickScore: number;
  note: string;
}

type Phase = "capture" | "identifying" | "review" | "saving";

function getSessionTag(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `fair-mode-${yyyy}-${mm}-${dd}`;
}

export default function LabsFairMode() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const session = useSession();
  const fileRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("capture");
  const [drafts, setDrafts] = useState<CapturedDraft[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [saveError, setSaveError] = useState<string>("");
  const [sessionTag] = useState<string>(() => getSessionTag());

  const participantId = session.pid || "";

  useEffect(() => {
    if (!session.signedIn && !participantId) {
      navigate("/labs/taste/drams");
    }
  }, [session.signedIn, participantId, navigate]);

  const handleCaptureClick = useCallback(() => {
    setErrorMsg("");
    fileRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file || !participantId) return;

    setPhase("identifying");
    setErrorMsg("");

    try {
      const form = new FormData();
      form.append("photo", file);
      form.append("participantId", participantId);

      const idRes = await fetch("/api/journal/identify-bottle", { method: "POST", body: form });
      let name = "";
      let distillery = "";
      if (idRes.ok) {
        const data = await idRes.json();
        const bottle = Array.isArray(data.whiskies) ? data.whiskies[0] : null;
        if (bottle) {
          name = String(bottle.whiskyName || bottle.matchedExisting || "");
          distillery = String(bottle.distillery || "");
        }
      } else {
        console.warn("[fair-mode] identify-bottle failed:", idRes.status);
      }

      if (!name) {
        name = t("fairMode.unnamedDram", "Unnamed dram");
      }

      const tastingContext = JSON.stringify({ sessionTag });
      const createRes = await fetch(`/api/journal/${participantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-participant-id": participantId },
        body: JSON.stringify({
          title: name,
          name,
          distillery,
          source: "solo",
          status: "draft",
          tastingContext,
        }),
      });

      if (!createRes.ok) {
        const errBody = await createRes.json().catch(() => ({}));
        throw new Error(errBody.message || `Create failed (${createRes.status})`);
      }

      const entry: JournalEntry = await createRes.json();

      let imageUrl: string | null = entry.imageUrl ?? null;
      try {
        const imgForm = new FormData();
        imgForm.append("image", file);
        const imgRes = await fetch(`/api/journal/${participantId}/${entry.id}/image`, {
          method: "POST",
          headers: { "x-participant-id": participantId },
          body: imgForm,
        });
        if (imgRes.ok) {
          const imgData = await imgRes.json().catch(() => null);
          if (imgData?.imageUrl) imageUrl = imgData.imageUrl;
        }
      } catch (imgErr) {
        console.warn("[fair-mode] image upload failed", imgErr);
      }

      setDrafts((prev) => [
        ...prev,
        {
          id: entry.id,
          name: entry.name || name,
          distillery: entry.distillery || distillery,
          imageUrl,
          quickScore: 80,
          note: "",
        },
      ]);
      setPhase("capture");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("fairMode.captureError", "Capture failed");
      setErrorMsg(message);
      setPhase("capture");
    }
  }, [participantId, sessionTag, t]);

  const handleRemoveDraft = useCallback((id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const handleScoreChange = useCallback((id: string, score: number) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, quickScore: score } : d)));
  }, []);

  const handleNoteChange = useCallback((id: string, note: string) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, note } : d)));
  }, []);

  const handleGoToReview = useCallback(() => {
    setSaveError("");
    setPhase("review");
  }, []);

  const handleSaveAll = useCallback(async () => {
    if (!participantId || drafts.length === 0) return;
    setPhase("saving");
    setSaveError("");

    const results = await Promise.allSettled(
      drafts.map((d) =>
        fetch(`/api/journal/${participantId}/${d.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-participant-id": participantId },
          body: JSON.stringify({
            personalScore: d.quickScore,
            notes: d.note || "",
            status: "draft",
          }),
        }).then((res) => {
          if (!res.ok) throw new Error(`Save failed (${res.status})`);
          return res;
        }),
      ),
    );

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      console.error("[fair-mode] save failures:", failed);
      setSaveError(
        t("fairMode.saveError", "Some drams could not be saved. Please try again."),
      );
      setPhase("review");
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["journal"] });
    navigate("/labs/taste/drams?filter=drafts");
  }, [drafts, participantId, navigate, t]);

  if (phase === "review" || phase === "saving") {
    return (
      <div className="labs-page" style={{ paddingBottom: 32 }} data-testid="labs-fair-mode-review">
        <div style={{ padding: "0 20px" }}>
          <button
            onClick={() => setPhase("capture")}
            className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-3"
            style={{ color: "var(--labs-text-muted)", fontSize: 13 }}
            data-testid="button-fair-mode-back-capture"
          >
            <ArrowLeft className="w-4 h-4" /> {t("common.back", "Back")}
          </button>
          <h1
            className="labs-serif"
            style={{ fontSize: 24, fontWeight: 700, color: "var(--labs-text)", margin: "0 0 6px" }}
            data-testid="labs-fair-mode-review-title"
          >
            {t("fairMode.reviewTitle", "Quick-rate your drams")}
          </h1>
          <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: "0 0 16px" }}>
            {t("fairMode.reviewSubtitle", "Drag the slider for an overall score. You can refine later.")}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {drafts.map((d) => (
              <div
                key={d.id}
                className="labs-card"
                style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}
                data-testid={`card-fair-mode-review-${d.id}`}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {d.imageUrl ? (
                    <img
                      src={d.imageUrl}
                      alt=""
                      style={{
                        width: 48, height: 48, borderRadius: 10, objectFit: "cover",
                        border: "1px solid var(--labs-border)", flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      style={{
                        width: 48, height: 48, borderRadius: 10,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: "var(--labs-surface-elevated)", color: "var(--labs-accent)",
                        border: "1px solid var(--labs-border)", flexShrink: 0,
                      }}
                    >
                      <Wine className="w-5 h-5" />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="text-sm"
                      style={{ color: "var(--labs-text)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                      data-testid={`text-fair-mode-name-${d.id}`}
                    >
                      {d.name}
                    </div>
                    {d.distillery && (
                      <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>{d.distillery}</div>
                    )}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-ui)", fontSize: 18, fontWeight: 700,
                      color: "var(--labs-accent)", minWidth: 36, textAlign: "right",
                    }}
                    data-testid={`text-fair-mode-score-${d.id}`}
                  >
                    {d.quickScore}
                  </div>
                </div>
                <input
                  type="range"
                  min={60}
                  max={100}
                  step={1}
                  value={d.quickScore}
                  onChange={(e) => handleScoreChange(d.id, parseInt(e.target.value, 10))}
                  data-testid={`input-fair-mode-score-${d.id}`}
                  style={{ width: "100%", accentColor: "var(--labs-accent)" }}
                />
                <textarea
                  value={d.note}
                  onChange={(e) => handleNoteChange(d.id, e.target.value)}
                  placeholder={t("fairMode.notePlaceholder", "Quick note (optional)")}
                  className="labs-input"
                  rows={2}
                  data-testid={`input-fair-mode-note-${d.id}`}
                  style={{ resize: "vertical", fontSize: 13 }}
                />
              </div>
            ))}
          </div>

          {saveError && (
            <p
              data-testid="text-fair-mode-save-error"
              style={{ marginTop: 12, color: "var(--labs-danger)", fontSize: 13 }}
            >
              {saveError}
            </p>
          )}

          <button
            onClick={handleSaveAll}
            disabled={phase === "saving" || drafts.length === 0}
            className="labs-btn-primary flex items-center justify-center gap-2"
            style={{ width: "100%", minHeight: 46, marginTop: 18 }}
            data-testid="button-fair-mode-save-all"
          >
            {phase === "saving" ? (
              <>
                <Loader2 className="w-4 h-4" style={{ animation: "spin 1s linear infinite" }} />
                {t("common.loading", "Saving...")}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {t("fairMode.saveAll", "Save all")}
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="labs-page" style={{ paddingBottom: 32 }} data-testid="labs-fair-mode-capture">
      <div style={{ padding: "0 20px" }}>
        <button
          onClick={() => navigate("/labs/taste/drams")}
          className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-3"
          style={{ color: "var(--labs-text-muted)", fontSize: 13 }}
          data-testid="button-fair-mode-exit"
        >
          <ArrowLeft className="w-4 h-4" /> {t("common.back", "Back")}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Layers className="w-6 h-6" style={{ color: "var(--labs-accent)" }} />
          <h1
            className="labs-serif"
            style={{ fontSize: 24, fontWeight: 700, color: "var(--labs-text)", margin: 0 }}
            data-testid="labs-fair-mode-title"
          >
            {t("fairMode.title", "Fair Mode")}
          </h1>
        </div>
        <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: "0 0 6px" }}>
          {t("fairMode.desc", "Quickly capture multiple drams. Rate them all at the end.")}
        </p>
        <p
          style={{ fontSize: 11, color: "var(--labs-text-muted)", margin: "0 0 18px", opacity: 0.7 }}
          data-testid="text-fair-mode-session-tag"
        >
          {t("fairMode.sessionTag", "Session")}: {sessionTag}
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          style={{ display: "none" }}
          data-testid="input-fair-mode-photo"
        />

        <div className="labs-card" style={{ padding: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <button
            onClick={handleCaptureClick}
            disabled={phase === "identifying"}
            data-testid="button-fair-mode-capture"
            style={{
              width: "100%", minHeight: 120, borderRadius: 14,
              background: "var(--labs-surface-elevated)",
              border: "2px dashed var(--labs-accent)", color: "var(--labs-accent)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
              cursor: phase === "identifying" ? "wait" : "pointer",
              opacity: phase === "identifying" ? 0.6 : 1,
            }}
          >
            {phase === "identifying" ? (
              <>
                <Loader2 className="w-8 h-8" style={{ animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  {t("fairMode.identifying", "Identifying...")}
                </span>
              </>
            ) : (
              <>
                <Camera className="w-10 h-10" />
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  {drafts.length === 0
                    ? t("fairMode.capture", "Capture dram")
                    : t("fairMode.next", "Next dram")}
                </span>
              </>
            )}
          </button>

          {errorMsg && (
            <div
              data-testid="text-fair-mode-error"
              style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--labs-danger)", fontSize: 13 }}
            >
              <AlertTriangle className="w-4 h-4" /> {errorMsg}
            </div>
          )}
        </div>

        {drafts.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 13, color: "var(--labs-text-muted)", marginBottom: 8 }}>
              {t("fairMode.captured", "Captured")} ({drafts.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {drafts.map((d) => (
                <div
                  key={d.id}
                  className="labs-card"
                  style={{ padding: 10, display: "flex", alignItems: "center", gap: 10 }}
                  data-testid={`card-fair-mode-captured-${d.id}`}
                >
                  {d.imageUrl ? (
                    <img
                      src={d.imageUrl}
                      alt=""
                      style={{
                        width: 40, height: 40, borderRadius: 8, objectFit: "cover",
                        border: "1px solid var(--labs-border)", flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      style={{
                        width: 40, height: 40, borderRadius: 8,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: "var(--labs-surface-elevated)", color: "var(--labs-accent)",
                        border: "1px solid var(--labs-border)", flexShrink: 0,
                      }}
                    >
                      <Wine className="w-4 h-4" />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="text-sm"
                      style={{ color: "var(--labs-text)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      {d.name}
                    </div>
                    {d.distillery && (
                      <div style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{d.distillery}</div>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 10, fontWeight: 600, letterSpacing: "0.05em",
                      padding: "2px 8px", borderRadius: 999,
                      background: "var(--labs-surface-elevated)",
                      color: "var(--labs-text-muted)",
                      border: "1px solid var(--labs-border)",
                      textTransform: "uppercase",
                    }}
                  >
                    {t("drams.draft", "Draft")}
                  </span>
                  <button
                    onClick={() => handleRemoveDraft(d.id)}
                    aria-label={t("common.close", "Close")}
                    data-testid={`button-fair-mode-remove-${d.id}`}
                    className="labs-btn-ghost"
                    style={{ padding: 4, color: "var(--labs-text-muted)" }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleGoToReview}
              className="labs-btn-primary flex items-center justify-center gap-2"
              style={{ width: "100%", minHeight: 46, marginTop: 16 }}
              data-testid="button-fair-mode-done"
            >
              <Check className="w-4 h-4" />
              {t("fairMode.done", "Finish — rate drams")}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

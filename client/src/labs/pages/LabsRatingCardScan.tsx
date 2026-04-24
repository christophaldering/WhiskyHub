import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Upload, X, Check, AlertTriangle, Loader2, ChevronLeft, Save } from "lucide-react";

interface ExtractedWhisky {
  position: number | null;
  whiskyLabel: string;
  nose: number | null;
  taste: number | null;
  finish: number | null;
  overall: number | null;
  notes: string;
  matchedEntryId: string | null;
  matchedDistillery: string | null;
  matchedName: string | null;
}

interface ScanResult {
  whiskies: ExtractedWhisky[];
  detectedScale: string;
  confidence: string;
  cardNotes: string;
  tastingId: string;
}

interface Props {
  tastingId: string;
  participantId: string;
  onClose: () => void;
  onSaved: () => void;
}

type Step = "upload" | "scanning" | "review" | "saving" | "done" | "error";

export default function LabsRatingCardScan({ tastingId, participantId, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [editableWhiskies, setEditableWhiskies] = useState<ExtractedWhisky[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  const handleFile = useCallback(async (file: File) => {
    setStep("scanning");
    setErrorMessage("");

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`/api/historical/tastings/${tastingId}/scan-rating-card`, {
        method: "POST",
        headers: { "x-participant-id": participantId },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Error ${res.status}`);
      }

      const data: ScanResult = await res.json();
      setScanResult(data);
      setEditableWhiskies(data.whiskies.map(w => ({ ...w })));
      setStep("review");
    } catch (e: any) {
      setErrorMessage(e.message || "Scan failed");
      setStep("error");
    }
  }, [tastingId, participantId]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const updateWhisky = useCallback((index: number, field: keyof ExtractedWhisky, value: any) => {
    setEditableWhiskies(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const removeWhisky = useCallback((index: number) => {
    setEditableWhiskies(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = useCallback(async () => {
    const toSave = editableWhiskies.filter(w => w.matchedEntryId);
    if (toSave.length === 0) return;

    setStep("saving");
    try {
      const ratings = toSave.map(w => ({
        entryId: w.matchedEntryId,
        nose: w.nose,
        taste: w.taste,
        finish: w.finish,
        overall: w.overall,
        notes: w.notes,
      }));

      const res = await fetch("/api/historical/entries/personal-ratings/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-participant-id": participantId,
        },
        body: JSON.stringify({ ratings }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Save failed");
      }

      const result = await res.json();
      setSavedCount(result.saved || 0);
      setStep("done");
    } catch (e: any) {
      setErrorMessage(e.message || "Save failed");
      setStep("error");
    }
  }, [editableWhiskies, participantId]);

  if (step === "upload") {
    return (
      <div className="labs-fade-in" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <button onClick={onClose} className="labs-btn-ghost" style={{ padding: 4 }} data-testid="button-scan-close">
            <ChevronLeft size={20} style={{ color: "var(--labs-text-muted)" }} />
          </button>
          <h2 className="labs-serif" style={{ fontSize: 20, fontWeight: 700, color: "var(--labs-text)", margin: 0 }}>
            {t("m2.ratingCard.title", "Scan Rating Card")}
          </h2>
        </div>

        <div className="labs-card" style={{ padding: 24, textAlign: "center" }}>
          <Camera size={40} style={{ color: "var(--labs-accent)", margin: "0 auto 16px", display: "block" }} strokeWidth={1.5} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)", marginBottom: 8 }}>
            {t("m2.ratingCard.uploadTitle", "Photograph your rating card")}
          </p>
          <p style={{ fontSize: 13, color: "var(--labs-text-muted)", marginBottom: 24, lineHeight: 1.5 }}>
            {t("m2.ratingCard.uploadDesc", "Take a photo or upload an image of your handwritten rating card. AI will extract the scores and notes.")}
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="labs-btn-primary"
              style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 140 }}
              data-testid="button-scan-camera"
            >
              <Camera size={16} />
              {t("m2.ratingCard.takePhoto", "Take Photo")}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="labs-btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 140 }}
              data-testid="button-scan-upload"
            >
              <Upload size={16} />
              {t("m2.ratingCard.uploadFile", "Upload Image")}
            </button>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            style={{ display: "none" }}
            data-testid="input-scan-camera"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            onChange={handleFileSelect}
            style={{ display: "none" }}
            data-testid="input-scan-file"
          />
        </div>
      </div>
    );
  }

  if (step === "scanning") {
    return (
      <div className="labs-fade-in" style={{ padding: 16, textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <button onClick={onClose} className="labs-btn-ghost" style={{ padding: 4 }} data-testid="button-scan-close">
            <ChevronLeft size={20} style={{ color: "var(--labs-text-muted)" }} />
          </button>
          <h2 className="labs-serif" style={{ fontSize: 20, fontWeight: 700, color: "var(--labs-text)", margin: 0 }}>
            {t("m2.ratingCard.scanning", "Scanning...")}
          </h2>
        </div>

        {previewUrl && (
          <div className="labs-card" style={{ padding: 8, marginBottom: 16 }}>
            <img
              src={previewUrl}
              alt="Rating card"
              style={{ width: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 8 }}
              data-testid="img-scan-preview"
            />
          </div>
        )}

        <div className="labs-card" style={{ padding: 32 }}>
          <Loader2 size={32} style={{ color: "var(--labs-accent)", animation: "spin 1s linear infinite", margin: "0 auto 16px", display: "block" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)", marginBottom: 4 }}>
            {t("m2.ratingCard.analyzing", "Analyzing your rating card...")}
          </p>
          <p style={{ fontSize: 13, color: "var(--labs-text-muted)" }}>
            {t("m2.ratingCard.analyzingDesc", "AI is reading your handwritten scores. This may take a moment.")}
          </p>
        </div>
      </div>
    );
  }

  if (step === "review" && scanResult) {
    const matchedCount = editableWhiskies.filter(w => w.matchedEntryId).length;
    const unmatchedCount = editableWhiskies.length - matchedCount;

    return (
      <div className="labs-fade-in" style={{ padding: 16, paddingBottom: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <button onClick={() => setStep("upload")} className="labs-btn-ghost" style={{ padding: 4 }} data-testid="button-scan-back">
            <ChevronLeft size={20} style={{ color: "var(--labs-text-muted)" }} />
          </button>
          <h2 className="labs-serif" style={{ fontSize: 20, fontWeight: 700, color: "var(--labs-text)", margin: 0, flex: 1 }}>
            {t("m2.ratingCard.reviewTitle", "Review Extracted Ratings")}
          </h2>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <span className="labs-card" style={{ padding: "6px 12px", fontSize: 12, color: "var(--labs-text-muted)" }} data-testid="text-scan-confidence">
            {t("m2.ratingCard.confidence", "Confidence")}: <strong style={{ color: scanResult.confidence === "high" ? "var(--labs-success)" : scanResult.confidence === "medium" ? "var(--labs-accent)" : "var(--labs-danger)" }}>
              {scanResult.confidence}
            </strong>
          </span>
          <span className="labs-card" style={{ padding: "6px 12px", fontSize: 12, color: "var(--labs-text-muted)" }} data-testid="text-scan-scale">
            {t("m2.ratingCard.scale", "Scale")}: {scanResult.detectedScale}
          </span>
          {unmatchedCount > 0 && (
            <span className="labs-card" style={{ padding: "6px 12px", fontSize: 12, color: "var(--labs-danger)" }} data-testid="text-scan-unmatched">
              <AlertTriangle size={11} style={{ marginRight: 4 }} />
              {unmatchedCount} {t("m2.ratingCard.unmatched", "unmatched")}
            </span>
          )}
        </div>

        {scanResult.cardNotes && (
          <div className="labs-card" style={{ padding: 12, marginBottom: 16, fontSize: 13, color: "var(--labs-text-muted)", fontStyle: "italic" }} data-testid="text-card-notes">
            {scanResult.cardNotes}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {editableWhiskies.map((w, idx) => (
            <div
              key={idx}
              className="labs-card"
              style={{
                padding: 16,
                borderColor: !w.matchedEntryId ? "var(--labs-danger)" : undefined,
                opacity: !w.matchedEntryId ? 0.7 : 1,
              }}
              data-testid={`review-card-${idx}`}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    {w.position && (
                      <span style={{
                        fontSize: 12, fontWeight: 700, color: "var(--labs-accent)",
                        background: "var(--labs-accent-muted)", padding: "2px 8px", borderRadius: 10,
                      }}>
                        #{w.position}
                      </span>
                    )}
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>
                      {w.matchedDistillery && w.matchedName
                        ? `${w.matchedDistillery} — ${w.matchedName}`
                        : w.whiskyLabel || t("m2.ratingCard.unknownWhisky", "Unknown Whisky")}
                    </span>
                  </div>
                  {!w.matchedEntryId && (
                    <div style={{ fontSize: 12, color: "var(--labs-danger)", display: "flex", alignItems: "center", gap: 4 }}>
                      <AlertTriangle size={11} />
                      {t("m2.ratingCard.notMatched", "Could not match to lineup — will not be saved")}
                    </div>
                  )}
                  {w.matchedEntryId && w.whiskyLabel && (
                    <div style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>
                      {t("m2.ratingCard.cardLabel", "Card")}: {w.whiskyLabel}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeWhisky(idx)}
                  className="labs-btn-ghost"
                  style={{ padding: 4, flexShrink: 0 }}
                  data-testid={`button-remove-${idx}`}
                >
                  <X size={16} style={{ color: "var(--labs-text-muted)" }} />
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                {(["nose", "taste", "finish", "overall"] as const).map(field => (
                  <div key={field}>
                    <label style={{ fontSize: 11, color: "var(--labs-text-muted)", textTransform: "capitalize", display: "block", marginBottom: 3 }}>
                      {t(`m2.ratingCard.${field}`, field.charAt(0).toUpperCase() + field.slice(1))}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={w[field] ?? ""}
                      onChange={e => updateWhisky(idx, field, e.target.value === "" ? null : Number(e.target.value))}
                      className="labs-input"
                      style={{ padding: "6px 8px", fontSize: 14, textAlign: "center" }}
                      data-testid={`input-${field}-${idx}`}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label style={{ fontSize: 11, color: "var(--labs-text-muted)", display: "block", marginBottom: 3 }}>
                  {t("m2.ratingCard.notes", "Notes")}
                </label>
                <input
                  type="text"
                  value={w.notes}
                  onChange={e => updateWhisky(idx, "notes", e.target.value)}
                  className="labs-input"
                  style={{ padding: "6px 10px", fontSize: 13 }}
                  placeholder={t("m2.ratingCard.notesPlaceholder", "Personal notes...")}
                  data-testid={`input-notes-${idx}`}
                />
              </div>
            </div>
          ))}
        </div>

        {editableWhiskies.length === 0 && (
          <div className="labs-card" style={{ padding: 32, textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "var(--labs-text-muted)" }}>
              {t("m2.ratingCard.noEntries", "No ratings extracted. Try a clearer photo.")}
            </p>
          </div>
        )}

        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          padding: "12px 16px", background: "var(--labs-surface)",
          borderTop: "1px solid var(--labs-border)",
          display: "flex", gap: 12, justifyContent: "center",
          zIndex: 50,
        }}>
          <button
            onClick={onClose}
            className="labs-btn-secondary"
            style={{ flex: 1, maxWidth: 160 }}
            data-testid="button-review-cancel"
          >
            {t("common.cancel", "Cancel")}
          </button>
          <button
            onClick={handleSave}
            className="labs-btn-primary"
            style={{
              flex: 1, maxWidth: 200,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
            disabled={matchedCount === 0}
            data-testid="button-review-save"
          >
            <Save size={16} />
            {t("m2.ratingCard.saveRatings", "Save {{count}} Ratings", { count: matchedCount })}
          </button>
        </div>
      </div>
    );
  }

  if (step === "saving") {
    return (
      <div className="labs-fade-in" style={{ padding: 16, textAlign: "center" }}>
        <div className="labs-card" style={{ padding: 48 }}>
          <Loader2 size={32} style={{ color: "var(--labs-accent)", animation: "spin 1s linear infinite", margin: "0 auto 16px", display: "block" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)" }}>
            {t("m2.ratingCard.saving", "Saving your ratings...")}
          </p>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="labs-fade-in" style={{ padding: 16, textAlign: "center" }}>
        <div className="labs-card" style={{ padding: 48 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "var(--labs-success)", display: "flex",
            alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <Check size={28} style={{ color: "#fff" }} />
          </div>
          <p style={{ fontSize: 18, fontWeight: 700, color: "var(--labs-text)", marginBottom: 8 }}>
            {t("m2.ratingCard.doneTitle", "Ratings Saved!")}
          </p>
          <p style={{ fontSize: 14, color: "var(--labs-text-muted)", marginBottom: 24 }}>
            {t("m2.ratingCard.doneDesc", "{{count}} personal ratings have been saved.", { count: savedCount })}
          </p>
          <button
            onClick={() => { onSaved(); onClose(); }}
            className="labs-btn-primary"
            style={{ minWidth: 140 }}
            data-testid="button-done-close"
          >
            {t("common.done", "Done")}
          </button>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="labs-fade-in" style={{ padding: 16, textAlign: "center" }}>
        <div className="labs-card" style={{ padding: 48 }}>
          <AlertTriangle size={40} style={{ color: "var(--labs-danger)", margin: "0 auto 16px", display: "block" }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: "var(--labs-text)", marginBottom: 8 }}>
            {t("m2.ratingCard.errorTitle", "Something went wrong")}
          </p>
          <p style={{ fontSize: 13, color: "var(--labs-text-muted)", marginBottom: 20 }}>
            {errorMessage}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={onClose} className="labs-btn-secondary" data-testid="button-error-close">
              {t("common.close", "Close")}
            </button>
            <button
              onClick={() => { setStep("upload"); setErrorMessage(""); }}
              className="labs-btn-primary"
              data-testid="button-error-retry"
            >
              {t("common.retry", "Try Again")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

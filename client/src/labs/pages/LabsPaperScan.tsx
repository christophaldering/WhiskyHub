import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useSearch, useLocation } from "wouter";
import { tastingApi, paperScanApi, participantApi } from "@/lib/api";
import { stripGuestSuffix } from "@/lib/utils";
import {
  Camera, Upload, Loader2, CheckCircle, AlertCircle, Trash2, Wine, User, ChevronLeft, FileText
} from "lucide-react";

type ScanStep = "select-participant" | "confirm" | "capture" | "scanning" | "review" | "success";

export default function LabsPaperScan() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/labs/tastings/:id/scan");
  const search = useSearch();
  const tastingId = params?.id || "";
  const urlParams = new URLSearchParams(search);
  const urlParticipantId = urlParams.get("participant") || "";

  const [selectedParticipantId, setSelectedParticipantId] = useState(urlParticipantId);
  const participantId = selectedParticipantId;

  const [step, setStep] = useState<ScanStep>(urlParticipantId ? "confirm" : "select-participant");
  const [photos, setPhotos] = useState<File[]>([]);
  const [scanResult, setScanResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: tasting, isLoading: tastingLoading } = useQuery({
    queryKey: ["tasting", tastingId],
    queryFn: () => tastingApi.get(tastingId),
    enabled: !!tastingId,
  });

  const { data: participants } = useQuery({
    queryKey: ["tasting-participants", tastingId],
    queryFn: () => tastingApi.getParticipants(tastingId),
    enabled: !!tastingId,
  });

  const { data: participant, isLoading: participantLoading } = useQuery({
    queryKey: ["participant", participantId],
    queryFn: () => participantApi.get(participantId),
    enabled: !!participantId,
  });

  const isLoading = tastingLoading || participantLoading;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setPhotos((prev) => [...prev, ...files]);
      setError("");
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleScan = async () => {
    if (photos.length === 0) {
      setError(t("m2.paperScan.noPhotos", "Please take or select a photo of your sheet."));
      return;
    }
    setScanLoading(true);
    setError("");
    setStep("scanning");
    try {
      const result = await paperScanApi.scanSheet(tastingId, photos, participantId || undefined);
      setScanResult(result);
      setStep("review");
    } catch (err: any) {
      setError(err.message || t("m2.paperScan.scanFailed", "Failed to scan sheet. Please try again."));
      setStep("capture");
    }
    setScanLoading(false);
  };

  const handleConfirmScores = async () => {
    if (!scanResult) return;
    const pid = scanResult.participantId || participantId;
    if (!pid) {
      setError(t("m2.paperScan.noParticipant", "Participant could not be identified."));
      return;
    }
    setConfirmLoading(true);
    setError("");
    try {
      await paperScanApi.confirmScores(tastingId, pid, scanResult.scores);
      setStep("success");
    } catch (err: any) {
      setError(err.message || t("m2.paperScan.confirmFailed", "Failed to save scores. Please try again."));
    }
    setConfirmLoading(false);
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--labs-text-muted)",
      }}>
        <Loader2 style={{ width: 24, height: 24, animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!tasting) {
    return (
      <div style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        color: "var(--labs-text)",
      }}>
        <AlertCircle style={{ width: 40, height: 40, color: "var(--labs-danger)", marginBottom: 12 }} />
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }} data-testid="text-scan-not-found">
          {t("m2.paperScan.tastingNotFound", "Tasting not found")}
        </h2>
        <p style={{ fontSize: 14, color: "var(--labs-text-muted)", textAlign: "center" }}>
          {t("m2.paperScan.checkQR", "Please check the QR code on your sheet and try again.")}
        </p>
      </div>
    );
  }

  return (
    <div className="labs-fade-in" style={{
      minHeight: "100dvh",
      padding: "24px 16px",
      maxWidth: 480,
      margin: "0 auto",
    }} data-testid="labs-paper-scan-page">
      <button
        onClick={() => navigate(tastingId ? `/labs/tastings/${tastingId}` : "/labs/tastings")}
        className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4"
        style={{ color: "var(--labs-text-muted)" }}
        data-testid="labs-paper-scan-back"
      >
        <ChevronLeft className="w-4 h-4" />
        {tasting?.title || "Tasting"}
      </button>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: "var(--labs-accent-muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 12px",
        }}>
          <Wine style={{ width: 24, height: 24, color: "var(--labs-accent)" }} />
        </div>
        <h1 className="labs-serif" style={{
          fontSize: 22,
          fontWeight: 700,
          color: "var(--labs-accent)",
          margin: "0 0 4px",
        }} data-testid="text-scan-title">
          CaskSense
        </h1>
        <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: 0 }}>
          {t("m2.paperScan.subtitle", "Paper Sheet Scanner")}
        </p>
      </div>

      {step === "select-participant" && participants && (
        <div data-testid="scan-step-select-participant">
          <div className="labs-card" style={{ padding: 16, marginBottom: 12 }}>
            <div className="labs-section-label">{t("m2.paperScan.tasting", "Tasting")}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--labs-text)", marginBottom: 4 }}>
              {tasting.title}
            </div>
          </div>
          <div className="labs-card" style={{ padding: 16, marginBottom: 12 }}>
            <div className="labs-section-label" style={{ marginBottom: 12 }}>Select Participant</div>
            <p style={{ fontSize: 13, color: "var(--labs-text-secondary)", margin: "0 0 12px" }}>
              Whose paper sheet are you scanning?
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(participants || []).map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedParticipantId(p.id);
                    setStep("confirm");
                  }}
                  className="labs-card-interactive"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    background: "var(--labs-surface-elevated)",
                    border: "1px solid var(--labs-border)",
                    borderRadius: "var(--labs-radius-sm)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textAlign: "left",
                    width: "100%",
                  }}
                  data-testid={`button-select-participant-${p.id}`}
                >
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "var(--labs-accent-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <User style={{ width: 14, height: 14, color: "var(--labs-accent)" }} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--labs-text)" }}>
                    {stripGuestSuffix((p.name || "Anonymous") as string)}
                  </span>
                </button>
              ))}
            </div>
            {(!participants || participants.length === 0) && (
              <p className="labs-empty" style={{ padding: "24px 0", fontSize: 13 }}>
                No participants found for this tasting.
              </p>
            )}
          </div>
        </div>
      )}

      {step === "confirm" && (
        <div data-testid="scan-step-confirm">
          <div className="labs-card" style={{ padding: 16, marginBottom: 12 }}>
            <div className="labs-section-label">{t("m2.paperScan.tasting", "Tasting")}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--labs-text)", marginBottom: 4 }} data-testid="text-scan-tasting-name">
              {tasting.title}
            </div>
            {tasting.date && (
              <div style={{ fontSize: 13, color: "var(--labs-text-secondary)" }}>
                {tasting.date} {tasting.location ? `· ${tasting.location}` : ""}
              </div>
            )}
          </div>

          {participant && (
            <div className="labs-card" style={{ padding: 16, marginBottom: 12 }}>
              <div className="labs-section-label">{t("m2.paperScan.participant", "Participant")}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--labs-text)" }} data-testid="text-scan-participant-name">
                {stripGuestSuffix(participant.name as string)}
              </div>
            </div>
          )}

          <p style={{ fontSize: 13, color: "var(--labs-text-secondary)", textAlign: "center", margin: "16px 0" }}>
            {t("m2.paperScan.instructions", "Photograph your filled-in tasting sheet. Our AI will extract your scores and notes.")}
          </p>

          <button
            onClick={() => setStep("capture")}
            className="labs-btn-primary"
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            data-testid="button-scan-start"
          >
            <Camera style={{ width: 18, height: 18 }} />
            {t("m2.paperScan.startScan", "Scan My Sheet")}
          </button>
        </div>
      )}

      {(step === "capture" || step === "scanning") && (
        <div data-testid="scan-step-capture">
          <div className="labs-card" style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--labs-text)", marginBottom: 12 }}>
              {t("m2.paperScan.takePhoto", "Upload Photo or PDF")}
            </div>
            <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: "0 0 16px" }}>
              {t("m2.paperScan.photoTip", "Take a photo of your sheet or upload a PDF with tasting notes and scores.")}
            </p>

            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf,application/pdf"
              multiple
              onChange={handleFileSelect}
              style={{ display: "none" }}
              data-testid="input-scan-file"
            />

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button
                onClick={() => fileRef.current?.click()}
                className="labs-btn-secondary"
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                data-testid="button-scan-camera"
              >
                <Camera style={{ width: 16, height: 16 }} />
                {t("m2.paperScan.addPhoto", "Photo")}
              </button>
              <button
                onClick={() => {
                  const pdfInput = document.createElement("input");
                  pdfInput.type = "file";
                  pdfInput.accept = ".pdf,application/pdf";
                  pdfInput.multiple = true;
                  pdfInput.onchange = (e: any) => {
                    const files = Array.from(e.target.files || []) as File[];
                    if (files.length > 0) {
                      setPhotos((prev) => [...prev, ...files]);
                      setError("");
                    }
                  };
                  pdfInput.click();
                }}
                className="labs-btn-secondary"
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                data-testid="button-scan-pdf"
              >
                <FileText style={{ width: 16, height: 16 }} />
                PDF
              </button>
            </div>

            {photos.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                {photos.map((photo, idx) => {
                  const isPdf = photo.type === "application/pdf" || photo.name.toLowerCase().endsWith(".pdf");
                  return (
                    <div
                      key={idx}
                      style={{
                        position: "relative",
                        width: isPdf ? "auto" : 80,
                        minWidth: isPdf ? 120 : undefined,
                        height: 80,
                        borderRadius: "var(--labs-radius-sm)",
                        overflow: "hidden",
                        border: "1px solid var(--labs-border)",
                        background: isPdf ? "var(--labs-surface-alt)" : undefined,
                      }}
                      data-testid={`scan-photo-preview-${idx}`}
                    >
                      {isPdf ? (
                        <div style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          height: "100%",
                          padding: "8px 12px",
                          gap: 4,
                        }}>
                          <FileText style={{ width: 24, height: 24, color: "var(--labs-accent)" }} />
                          <span style={{
                            fontSize: 11,
                            color: "var(--labs-text-muted)",
                            maxWidth: 100,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}>
                            {photo.name}
                          </span>
                        </div>
                      ) : (
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`Sheet ${idx + 1}`}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      )}
                      <button
                        onClick={() => removePhoto(idx)}
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          border: "none",
                          background: "rgba(0,0,0,0.6)",
                          color: "var(--labs-on-accent)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          padding: 0,
                        }}
                        data-testid={`button-remove-photo-${idx}`}
                      >
                        <Trash2 style={{ width: 12, height: 12 }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={handleScan}
              disabled={scanLoading || photos.length === 0}
              className="labs-btn-primary"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: photos.length === 0 ? 0.5 : scanLoading ? 0.6 : 1,
              }}
              data-testid="button-scan-analyze"
            >
              {scanLoading ? (
                <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} />
              ) : (
                <Upload style={{ width: 18, height: 18 }} />
              )}
              {scanLoading
                ? t("m2.paperScan.analyzing", "Analyzing...")
                : t("m2.paperScan.analyzeSheet", "Analyze Sheet")}
            </button>
          </div>

          {error && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: 12,
              borderRadius: "var(--labs-radius-sm)",
              background: "var(--labs-danger-muted)",
              border: "1px solid var(--labs-danger)",
              marginBottom: 12,
            }} data-testid="text-scan-error">
              <AlertCircle style={{ width: 16, height: 16, color: "var(--labs-danger)", flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "var(--labs-danger)" }}>{error}</span>
            </div>
          )}
        </div>
      )}

      {step === "review" && scanResult && (
        <div data-testid="scan-step-review">
          <div className="labs-card" style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--labs-text)", marginBottom: 4 }}>
              {t("m2.paperScan.reviewTitle", "Review Your Scores")}
            </div>
            <p style={{ fontSize: 12, color: "var(--labs-text-muted)", margin: "0 0 16px" }}>
              {t("m2.paperScan.reviewDesc", "Please check the extracted scores below. You can correct any values before confirming.")}
            </p>

            {scanResult.participantName && (
              <div style={{ fontSize: 13, color: "var(--labs-text-secondary)", marginBottom: 12 }}>
                {t("m2.paperScan.detectedAs", "Detected as")}: <strong style={{ color: "var(--labs-text)" }}>{stripGuestSuffix(scanResult.participantName as string)}</strong>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(scanResult.scores || []).map((score: any, idx: number) => (
                <div
                  key={idx}
                  className="labs-card-elevated"
                  style={{
                    background: "var(--labs-surface-elevated)",
                    borderRadius: "var(--labs-radius-sm)",
                    padding: 12,
                    border: "1px solid var(--labs-border)",
                  }}
                  data-testid={`scan-review-card-${idx}`}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--labs-accent)", marginBottom: 8 }}>
                    {score.whiskyName || `Whisky #${(score.whiskyIndex ?? idx) + 1}`}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {["nose", "taste", "finish", "balance", "overall"].map((dim) => (
                      <div key={dim} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <label style={{ fontSize: 11, color: "var(--labs-text-muted)", width: 48, textTransform: "capitalize" }}>
                          {t(`m2.paperScan.${dim}`, dim)}
                        </label>
                        <input
                          type="number"
                          value={score[dim] ?? ""}
                          onChange={(e) => {
                            const updated = [...scanResult.scores];
                            updated[idx] = { ...updated[idx], [dim]: e.target.value === "" ? null : Number(e.target.value) };
                            setScanResult({ ...scanResult, scores: updated });
                          }}
                          className="labs-input"
                          style={{
                            width: 60,
                            padding: "6px 8px",
                            fontSize: 13,
                            textAlign: "center",
                          }}
                          data-testid={`input-review-${dim}-${idx}`}
                        />
                      </div>
                    ))}
                  </div>
                  {score.notes && (
                    <div style={{ marginTop: 8 }}>
                      <label style={{ fontSize: 11, color: "var(--labs-text-muted)", display: "block", marginBottom: 4 }}>
                        {t("m2.paperScan.notes", "Notes")}
                      </label>
                      <textarea
                        value={score.notes || ""}
                        onChange={(e) => {
                          const updated = [...scanResult.scores];
                          updated[idx] = { ...updated[idx], notes: e.target.value };
                          setScanResult({ ...scanResult, scores: updated });
                        }}
                        className="labs-input"
                        style={{ minHeight: 48, resize: "vertical", fontSize: 12 }}
                        data-testid={`input-review-notes-${idx}`}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: 12,
              borderRadius: "var(--labs-radius-sm)",
              background: "var(--labs-danger-muted)",
              border: "1px solid var(--labs-danger)",
              marginBottom: 12,
            }} data-testid="text-review-error">
              <AlertCircle style={{ width: 16, height: 16, color: "var(--labs-danger)", flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "var(--labs-danger)" }}>{error}</span>
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                setScanResult(null);
                setPhotos([]);
                setError("");
                setStep("capture");
              }}
              className="labs-btn-secondary"
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              data-testid="button-review-retake"
            >
              <Camera style={{ width: 16, height: 16 }} />
              {t("m2.paperScan.retake", "Retake")}
            </button>
            <button
              onClick={handleConfirmScores}
              disabled={confirmLoading}
              className="labs-btn-primary"
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                opacity: confirmLoading ? 0.6 : 1,
              }}
              data-testid="button-review-confirm"
            >
              {confirmLoading ? (
                <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
              ) : (
                <CheckCircle style={{ width: 16, height: 16 }} />
              )}
              {t("m2.paperScan.confirmSave", "Confirm & Save")}
            </button>
          </div>
        </div>
      )}

      {step === "success" && (
        <div style={{ textAlign: "center", padding: "40px 0" }} data-testid="scan-step-success">
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            background: "var(--labs-success-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <CheckCircle style={{ width: 32, height: 32, color: "var(--labs-success)" }} />
          </div>
          <h2 className="labs-serif" style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--labs-text)",
            margin: "0 0 8px",
          }} data-testid="text-scan-success-title">
            {t("m2.paperScan.successTitle", "Scores Saved!")}
          </h2>
          <p style={{ fontSize: 14, color: "var(--labs-text-secondary)", margin: "0 0 24px" }}>
            {t("m2.paperScan.successDesc", "Your tasting scores have been successfully imported. Thank you for participating!")}
          </p>
          <button
            onClick={() => {
              setStep("confirm");
              setPhotos([]);
              setScanResult(null);
              setError("");
            }}
            className="labs-btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 24px" }}
            data-testid="button-scan-another"
          >
            <Camera style={{ width: 16, height: 16 }} />
            {t("m2.paperScan.scanAnother", "Scan Another Sheet")}
          </button>
        </div>
      )}
    </div>
  );
}
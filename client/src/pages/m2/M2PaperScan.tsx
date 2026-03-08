import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useSearch } from "wouter";
import { v } from "@/lib/themeVars";
import { tastingApi, paperScanApi, participantApi } from "@/lib/api";
import {
  Camera, Upload, Loader2, CheckCircle, AlertCircle, Trash2, Wine
} from "lucide-react";

type ScanStep = "confirm" | "capture" | "scanning" | "review" | "success";

export default function M2PaperScan() {
  const { t } = useTranslation();
  const [, params] = useRoute("/m2/tastings/:id/scan");
  const search = useSearch();
  const tastingId = params?.id || "";
  const urlParams = new URLSearchParams(search);
  const participantId = urlParams.get("participant") || "";

  const [step, setStep] = useState<ScanStep>("confirm");
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

  const cardStyle: React.CSSProperties = {
    background: v.card,
    border: `1px solid ${v.border}`,
    borderRadius: 14,
    padding: "16px",
    marginBottom: 12,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: `1px solid ${v.inputBorder}`,
    background: v.inputBg,
    color: v.inputText,
    fontSize: 14,
    fontFamily: "system-ui, sans-serif",
    outline: "none",
  };

  const btnStyle: React.CSSProperties = {
    width: "100%",
    padding: "14px",
    borderRadius: 12,
    border: "none",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    fontFamily: "system-ui, sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: "100dvh",
        background: v.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: v.muted,
      }}>
        <Loader2 style={{ width: 24, height: 24, animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!tasting) {
    return (
      <div style={{
        minHeight: "100dvh",
        background: v.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        color: v.text,
      }}>
        <AlertCircle style={{ width: 40, height: 40, color: v.danger, marginBottom: 12 }} />
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }} data-testid="text-scan-not-found">
          {t("m2.paperScan.tastingNotFound", "Tasting not found")}
        </h2>
        <p style={{ fontSize: 14, color: v.muted, textAlign: "center" }}>
          {t("m2.paperScan.checkQR", "Please check the QR code on your sheet and try again.")}
        </p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100dvh",
      background: v.bg,
      padding: "24px 16px",
      maxWidth: 480,
      margin: "0 auto",
    }} data-testid="m2-paper-scan-page">
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: `color-mix(in srgb, ${v.accent} 15%, transparent)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 12px",
        }}>
          <Wine style={{ width: 24, height: 24, color: v.accent }} />
        </div>
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 22,
          fontWeight: 700,
          color: v.accent,
          margin: "0 0 4px",
        }} data-testid="text-scan-title">
          CaskSense
        </h1>
        <p style={{ fontSize: 13, color: v.muted, margin: 0 }}>
          {t("m2.paperScan.subtitle", "Paper Sheet Scanner")}
        </p>
      </div>

      {step === "confirm" && (
        <div data-testid="scan-step-confirm">
          <div style={cardStyle}>
            <div style={{ fontSize: 12, color: v.muted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 8 }}>
              {t("m2.paperScan.tasting", "Tasting")}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: v.text, marginBottom: 4 }} data-testid="text-scan-tasting-name">
              {tasting.title}
            </div>
            {tasting.date && (
              <div style={{ fontSize: 13, color: v.textSecondary }}>
                {tasting.date} {tasting.location ? `· ${tasting.location}` : ""}
              </div>
            )}
          </div>

          {participant && (
            <div style={cardStyle}>
              <div style={{ fontSize: 12, color: v.muted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 8 }}>
                {t("m2.paperScan.participant", "Participant")}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: v.text }} data-testid="text-scan-participant-name">
                {participant.name}
              </div>
            </div>
          )}

          <p style={{ fontSize: 13, color: v.textSecondary, textAlign: "center", margin: "16px 0" }}>
            {t("m2.paperScan.instructions", "Photograph your filled-in tasting sheet. Our AI will extract your scores and notes.")}
          </p>

          <button
            onClick={() => setStep("capture")}
            style={{
              ...btnStyle,
              background: v.accent,
              color: v.bg,
            }}
            data-testid="button-scan-start"
          >
            <Camera style={{ width: 18, height: 18 }} />
            {t("m2.paperScan.startScan", "Scan My Sheet")}
          </button>
        </div>
      )}

      {(step === "capture" || step === "scanning") && (
        <div data-testid="scan-step-capture">
          <div style={cardStyle}>
            <div style={{ fontSize: 14, fontWeight: 700, color: v.text, marginBottom: 12 }}>
              {t("m2.paperScan.takePhoto", "Photograph Your Sheet")}
            </div>
            <p style={{ fontSize: 13, color: v.muted, margin: "0 0 16px" }}>
              {t("m2.paperScan.photoTip", "Place your sheet on a flat surface with good lighting. Make sure all scores and notes are visible.")}
            </p>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handleFileSelect}
              style={{ display: "none" }}
              data-testid="input-scan-file"
            />

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  ...btnStyle,
                  flex: 1,
                  padding: "12px",
                  fontSize: 13,
                  background: v.elevated,
                  color: v.accent,
                  border: `1px solid ${v.border}`,
                }}
                data-testid="button-scan-camera"
              >
                <Camera style={{ width: 16, height: 16 }} />
                {t("m2.paperScan.addPhoto", "Add Photo")}
              </button>
            </div>

            {photos.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                {photos.map((photo, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: "relative",
                      width: 80,
                      height: 80,
                      borderRadius: 8,
                      overflow: "hidden",
                      border: `1px solid ${v.border}`,
                    }}
                    data-testid={`scan-photo-preview-${idx}`}
                  >
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Sheet ${idx + 1}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
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
                        color: "#fff",
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
                ))}
              </div>
            )}

            <button
              onClick={handleScan}
              disabled={scanLoading || photos.length === 0}
              style={{
                ...btnStyle,
                background: photos.length === 0 ? v.border : v.accent,
                color: photos.length === 0 ? v.muted : v.bg,
                opacity: scanLoading ? 0.6 : 1,
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
              padding: "12px",
              borderRadius: 10,
              background: `color-mix(in srgb, ${v.danger} 12%, transparent)`,
              border: `1px solid color-mix(in srgb, ${v.danger} 30%, transparent)`,
              marginBottom: 12,
            }} data-testid="text-scan-error">
              <AlertCircle style={{ width: 16, height: 16, color: v.danger, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: v.danger }}>{error}</span>
            </div>
          )}
        </div>
      )}

      {step === "review" && scanResult && (
        <div data-testid="scan-step-review">
          <div style={cardStyle}>
            <div style={{ fontSize: 14, fontWeight: 700, color: v.text, marginBottom: 4 }}>
              {t("m2.paperScan.reviewTitle", "Review Your Scores")}
            </div>
            <p style={{ fontSize: 12, color: v.muted, margin: "0 0 16px" }}>
              {t("m2.paperScan.reviewDesc", "Please check the extracted scores below. You can correct any values before confirming.")}
            </p>

            {scanResult.participantName && (
              <div style={{ fontSize: 13, color: v.textSecondary, marginBottom: 12 }}>
                {t("m2.paperScan.detectedAs", "Detected as")}: <strong style={{ color: v.text }}>{scanResult.participantName}</strong>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(scanResult.scores || []).map((score: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    background: v.elevated,
                    borderRadius: 10,
                    padding: "12px",
                    border: `1px solid ${v.border}`,
                  }}
                  data-testid={`scan-review-card-${idx}`}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: v.accent, marginBottom: 8 }}>
                    {score.whiskyName || `Whisky #${(score.whiskyIndex ?? idx) + 1}`}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {["nose", "taste", "finish", "balance", "overall"].map((dim) => (
                      <div key={dim} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <label style={{ fontSize: 11, color: v.muted, width: 48, textTransform: "capitalize" }}>
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
                          style={{
                            ...inputStyle,
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
                      <label style={{ fontSize: 11, color: v.muted, display: "block", marginBottom: 4 }}>
                        {t("m2.paperScan.notes", "Notes")}
                      </label>
                      <textarea
                        value={score.notes || ""}
                        onChange={(e) => {
                          const updated = [...scanResult.scores];
                          updated[idx] = { ...updated[idx], notes: e.target.value };
                          setScanResult({ ...scanResult, scores: updated });
                        }}
                        style={{
                          ...inputStyle,
                          minHeight: 48,
                          resize: "vertical",
                          fontSize: 12,
                        }}
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
              padding: "12px",
              borderRadius: 10,
              background: `color-mix(in srgb, ${v.danger} 12%, transparent)`,
              border: `1px solid color-mix(in srgb, ${v.danger} 30%, transparent)`,
              marginBottom: 12,
            }} data-testid="text-review-error">
              <AlertCircle style={{ width: 16, height: 16, color: v.danger, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: v.danger }}>{error}</span>
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
              style={{
                ...btnStyle,
                flex: 1,
                background: v.elevated,
                color: v.text,
                border: `1px solid ${v.border}`,
              }}
              data-testid="button-review-retake"
            >
              <Camera style={{ width: 16, height: 16 }} />
              {t("m2.paperScan.retake", "Retake")}
            </button>
            <button
              onClick={handleConfirmScores}
              disabled={confirmLoading}
              style={{
                ...btnStyle,
                flex: 1,
                background: v.accent,
                color: v.bg,
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
            background: `color-mix(in srgb, ${v.success} 15%, transparent)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <CheckCircle style={{ width: 32, height: 32, color: v.success }} />
          </div>
          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 20,
            fontWeight: 700,
            color: v.text,
            margin: "0 0 8px",
          }} data-testid="text-scan-success-title">
            {t("m2.paperScan.successTitle", "Scores Saved!")}
          </h2>
          <p style={{ fontSize: 14, color: v.textSecondary, margin: "0 0 24px" }}>
            {t("m2.paperScan.successDesc", "Your tasting scores have been successfully imported. Thank you for participating!")}
          </p>
          <button
            onClick={() => {
              setStep("confirm");
              setPhotos([]);
              setScanResult(null);
              setError("");
            }}
            style={{
              ...btnStyle,
              width: "auto",
              display: "inline-flex",
              padding: "12px 24px",
              background: v.elevated,
              color: v.accent,
              border: `1px solid ${v.border}`,
            }}
            data-testid="button-scan-another"
          >
            <Camera style={{ width: 16, height: 16 }} />
            {t("m2.paperScan.scanAnother", "Scan Another Sheet")}
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
